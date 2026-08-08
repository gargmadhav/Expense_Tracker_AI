from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.routers.deps import get_current_user
from app.schemas.ai import AIChatRequest, AIChatResponse, AIInsightsResponse
from app.services.ai import AIService

router = APIRouter(prefix="/ai", tags=["AI Engine & LLM"])


@router.post(
    "/chat",
    response_model=AIChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Query Groq LLM AI Financial Assistant"
)
def chat_with_ai(
    chat_in: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Pass user prompt & real-time financial database context to Groq LLM model."""
    return AIService.generate_chat_response(
        db=db,
        user_id=current_user.id,
        user_prompt=chat_in.message
    )


@router.get(
    "/insights",
    response_model=AIInsightsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get AI Financial Insights & Health Analysis"
)
def get_ai_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve Groq LLM generated financial executive summary, health score, and recommendations."""
    return AIService.generate_financial_insights(
        db=db,
        user_id=current_user.id
    )
