import json
import logging
from datetime import datetime, date
from typing import Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, extract

from app.core.config import settings
from app.models.expense import Expense
from app.models.income import Income
from app.models.budget import Budget
from app.schemas.ai import AIChatResponse, AIInsightsResponse, AIRecommendation, AIAlert

logger = logging.getLogger("app")


class AIService:
    """Service handling real Generative AI responses using Groq LLM API with strict domain guardrails."""

    @staticmethod
    def get_user_financial_context(db: Session, user_id: int) -> Dict[str, Any]:
        """Extract user's real-time financial metrics from SQL database."""
        today = date.today()
        current_month = today.month
        current_year = today.year

        # Lifetime Total Income across all months
        lifetime_income = db.query(func.coalesce(func.sum(Income.amount), 0.0)).filter(
            Income.user_id == user_id
        ).scalar() or 0.0

        # Lifetime Total Expense across all months
        lifetime_expense = db.query(func.coalesce(func.sum(Expense.amount), 0.0)).filter(
            Expense.user_id == user_id
        ).scalar() or 0.0

        # Total Income for current month
        monthly_income = db.query(func.coalesce(func.sum(Income.amount), 0.0)).filter(
            Income.user_id == user_id,
            extract('month', Income.transaction_date) == current_month,
            extract('year', Income.transaction_date) == current_year
        ).scalar() or 0.0

        # Total Expense for current month (Fixed bug: Expense.transaction_date filter)
        monthly_expense = db.query(func.coalesce(func.sum(Expense.amount), 0.0)).filter(
            Expense.user_id == user_id,
            extract('month', Expense.transaction_date) == current_month,
            extract('year', Expense.transaction_date) == current_year
        ).scalar() or 0.0

        net_balance = lifetime_income - lifetime_expense

        # Category Breakdown for current month
        category_rows = db.query(
            Expense.category,
            func.sum(Expense.amount).label("cat_total")
        ).filter(
            Expense.user_id == user_id,
            extract('month', Expense.transaction_date) == current_month,
            extract('year', Expense.transaction_date) == current_year
        ).group_by(Expense.category).all()

        category_breakdown = {row.category: float(row.cat_total) for row in category_rows}

        # Budgets Status
        budgets = db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.month == current_month,
            Budget.year == current_year
        ).all()

        budget_status = []
        for b in budgets:
            spent = category_breakdown.get(b.category, 0.0)
            pct = round((spent / b.monthly_limit) * 100, 1) if b.monthly_limit > 0 else 0.0
            budget_status.append({
                "category": b.category,
                "monthly_limit": b.monthly_limit,
                "spent": spent,
                "usage_percentage": pct,
                "is_exceeded": spent > b.monthly_limit
            })

        # Recent Expense Transactions
        recent_expenses = db.query(Expense).filter(Expense.user_id == user_id)\
            .order_by(Expense.transaction_date.desc(), Expense.id.desc()).limit(5).all()
        recent_exp_txs = [{"title": e.title, "category": e.category, "amount": round(e.amount, 2), "date": str(e.transaction_date)} for e in recent_expenses]

        # Recent Income Transactions (Added for full Chatbot AI awareness)
        recent_income = db.query(Income).filter(Income.user_id == user_id)\
            .order_by(Income.transaction_date.desc(), Income.id.desc()).limit(5).all()
        recent_inc_txs = [{"source": i.source, "amount": round(i.amount, 2), "date": str(i.transaction_date)} for i in recent_income]

        return {
            "period": f"{today.strftime('%B')} {current_year}",
            "total_income": round(monthly_income, 2),
            "total_expense": round(monthly_expense, 2),
            "current_month_income": round(monthly_income, 2),
            "current_month_expense": round(monthly_expense, 2),
            "total_lifetime_income": round(lifetime_income, 2),
            "total_lifetime_expense": round(lifetime_expense, 2),
            "net_balance": round(net_balance, 2),
            "category_breakdown": category_breakdown,
            "budgets": budget_status,
            "recent_expenses": recent_exp_txs,
            "recent_income_sources": recent_inc_txs
        }

    @classmethod
    def generate_chat_response(cls, db: Session, user_id: int, user_prompt: str) -> AIChatResponse:
        """Query Groq LLM with domain guardrails: answers financial topics & politely declines off-topic queries."""
        financial_context = cls.get_user_financial_context(db, user_id)
        now_str = datetime.now().strftime("%I:%M %p")
        prompt_lower = user_prompt.strip().lower()

        system_prompt = (
            "You are Smart Expense AI, an expert AI Financial Advisor specialized exclusively in personal finance, "
            "expense tracking, income analysis, budget management, savings goals, and financial planning.\n\n"
            "Below is the user's real live database financial context for the current month:\n"
            f"```json\n{json.dumps(financial_context, indent=2)}\n```\n\n"
            "STRICT DOMAIN GUARDRAILS:\n"
            "1. RELEVANT TOPICS: Greetings, personal finance, spending habits, category expenses, income sources, budget caps, savings advice, financial goals, and Smart Expense Tracker app usage.\n"
            "   -> Provide concise, encouraging, direct, and actionable answers using the user's database context when applicable.\n"
            "2. IRRELEVANT / OFF-TOPIC TOPICS: Any question completely unrelated to finance, money, budgets, expenses, or app usage (e.g., sports, history, weather, cooking, entertainment, general coding, politics, trivia, science).\n"
            "   -> Politely decline with an apology message:\n"
            "   'I apologize, but as your Personal Finance AI Assistant, I am specialized only in helping you manage your expenses, income, budgets, savings goals, and financial planning. Please ask me a question related to your finances!'"
        )

        if settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip():
            try:
                from groq import Groq
                client = Groq(api_key=settings.GROQ_API_KEY.strip())

                completion = client.chat.completions.create(
                    model=settings.GROQ_MODEL,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.5,
                    max_tokens=400
                )
                ai_text = completion.choices[0].message.content.strip()
                logger.info(f"Groq LLM response generated successfully for user {user_id}")
                return AIChatResponse(response=ai_text, timestamp=now_str)
            except Exception as e:
                logger.error(f"Groq API Error: {e}")

        # Domain Guardrail Intent Classification (Fallback)
        financial_keywords = [
            'hello', 'hi', 'hey', 'greetings', 'finance', 'financial', 'spend', 'spent', 'spending',
            'expense', 'expenses', 'income', 'balance', 'budget', 'budgets', 'save', 'savings',
            'money', 'cost', 'pay', 'transaction', 'food', 'groceries', 'dining', 'rent', 'utilities',
            'salary', 'report', 'analytics', 'category', 'cap', 'limit'
        ]

        is_relevant = any(kw in prompt_lower for kw in financial_keywords)

        if not is_relevant:
            apology_reply = (
                "I apologize, but as your Personal Finance AI Assistant, I am specialized only in helping you "
                "manage your expenses, income, budgets, savings goals, and financial planning. "
                "Please ask me a question related to your finances!"
            )
            return AIChatResponse(response=apology_reply, timestamp=now_str)

        # Relevant Query Responses
        if any(g in prompt_lower for g in ['hello', 'hi', 'hey', 'greetings']):
            reply = (
                f"Hello! I am your Smart Expense AI Advisor. Based on your current records for {financial_context['period']}, "
                f"your current month income is ${financial_context['current_month_income']:.2f} (lifetime income: ${financial_context['total_lifetime_income']:.2f}) "
                f"and your net balance is ${financial_context['net_balance']:.2f}. How can I assist your financial planning today?"
            )
        elif 'income' in prompt_lower or 'salary' in prompt_lower or 'earnings' in prompt_lower:
            inc_sources = ", ".join([f"{s['source']}: ${s['amount']:.2f}" for s in financial_context.get('recent_income_sources', [])])
            sources_str = f" Recent entries: {inc_sources}." if inc_sources else ""
            reply = (
                f"Your total lifetime income recorded is ${financial_context['total_lifetime_income']:.2f}, with ${financial_context['current_month_income']:.2f} "
                f"recorded for {financial_context['period']}.{sources_str}"
            )
        elif 'food' in prompt_lower or 'grocer' in prompt_lower or 'dining' in prompt_lower:
            food_spent = (
                financial_context['category_breakdown'].get('Groceries', 0.0) +
                financial_context['category_breakdown'].get('Food & Dining', 0.0)
            )
            reply = f"You have spent ${food_spent:.2f} on Food & Groceries for {financial_context['period']} out of your ${financial_context['current_month_income']:.2f} monthly income."
        elif 'budget' in prompt_lower:
            exceeded = [b['category'] for b in financial_context['budgets'] if b['is_exceeded']]
            if exceeded:
                reply = f"Alert: You have exceeded budget limits in: {', '.join(exceeded)}. Consider adjusting spending in these areas."
            else:
                reply = f"All your category budget limits are currently on track for {financial_context['period']}!"
        elif 'save' in prompt_lower or 'saving' in prompt_lower or 'tip' in prompt_lower:
            reply = (
                f"To increase your savings from your current net balance of ${financial_context['net_balance']:.2f}:\n"
                "1. Consolidate grocery and dining out orders.\n"
                "2. Review unused recurring digital subscriptions.\n"
                "3. Allocate 20% of your income into high-yield savings."
            )
        else:
            reply = (
                f"I have analyzed your financial records for {financial_context['period']}. Your current month income is "
                f"${financial_context['current_month_income']:.2f} (lifetime total: ${financial_context['total_lifetime_income']:.2f}), "
                f"monthly expenses are ${financial_context['current_month_expense']:.2f}, and net balance is ${financial_context['net_balance']:.2f}. "
                "Ask me anything about your income, categories, budgets, or savings targets!"
            )

        return AIChatResponse(response=reply, timestamp=now_str)

    @classmethod
    def generate_financial_insights(cls, db: Session, user_id: int) -> AIInsightsResponse:
        """Generate structured financial health score, AI recommendations, and alerts using Groq LLM."""
        context = cls.get_user_financial_context(db, user_id)
        balance = context["net_balance"]
        income = context["total_income"]
        expense = context["total_expense"]

        # Health score heuristic calculation
        health_score = 85
        if balance < 0:
            health_score = 40
        elif income > 0 and (expense / income) > 0.8:
            health_score = 65
        elif income > 0 and (expense / income) <= 0.5:
            health_score = 92

        alerts = []
        for b in context["budgets"]:
            if b["is_exceeded"]:
                alerts.append(AIAlert(
                    title=f"Exceeded Budget: {b['category']}",
                    message=f"You have spent ${b['spent']:.2f} of your ${b['monthly_limit']:.2f} cap ({b['usage_percentage']}% used)."
                ))
            elif b["usage_percentage"] >= 85:
                alerts.append(AIAlert(
                    title=f"Warning: {b['category']} Near Limit",
                    message=f"You have reached {b['usage_percentage']}% of your allocated ${b['monthly_limit']:.2f} budget limit."
                ))

        system_prompt = (
            "You are an expert AI Financial Advisor. Based on the user's financial context:\n"
            f"```json\n{json.dumps(context, indent=2)}\n```\n"
            "Generate a JSON object with two fields:\n"
            "1. 'summary': A 2-sentence executive financial summary of their spending & savings velocity.\n"
            "2. 'recommendations': An array of 2 actionable objects: `[{\"title\": \"...\", \"impact\": \"High|Medium\", \"description\": \"...\"}]`.\n"
            "Return raw JSON only, no markdown formatting."
        )

        if settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip():
            try:
                from groq import Groq
                client = Groq(api_key=settings.GROQ_API_KEY.strip())

                completion = client.chat.completions.create(
                    model=settings.GROQ_MODEL,
                    messages=[{"role": "system", "content": system_prompt}],
                    temperature=0.5,
                    max_tokens=350,
                    response_format={"type": "json_object"}
                )
                raw_json = completion.choices[0].message.content.strip()
                data = json.loads(raw_json)

                recs = [AIRecommendation(**r) for r in data.get("recommendations", [])]
                summary = data.get("summary", f"Your net balance for {context['period']} is ${balance:.2f}.")

                return AIInsightsResponse(
                    financialSummary=summary,
                    healthScore=health_score,
                    recommendations=recs,
                    alerts=alerts
                )
            except Exception as e:
                logger.error(f"Groq Insights API Error: {e}")

        # Fallback structured response
        summary = (
            f"Your current net balance is ${balance:.2f} for {context['period']}. "
            f"Your spending velocity is {'optimal' if health_score >= 75 else 'elevated'}."
        )
        default_recs = [
            AIRecommendation(
                title="Optimize Top Category Spending",
                impact="High",
                description="Review dining and entertainment transactions to increase monthly net savings headroom."
            ),
            AIRecommendation(
                title="Set Category Monthly Ceilings",
                impact="Medium",
                description="Establish strict budget allocations on variable spending to maintain financial health."
            )
        ]

        return AIInsightsResponse(
            financialSummary=summary,
            healthScore=health_score,
            recommendations=default_recs,
            alerts=alerts
        )
