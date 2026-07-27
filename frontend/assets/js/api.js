/* API Service Layer & Mock Data Engine */

// API Endpoint Configuration (Configured via .env)
const API_BASE_URL = (typeof window !== 'undefined' && window.ENV_API_BASE_URL) 
  ? window.ENV_API_BASE_URL 
  : 'http://localhost:8000/api/v1';

// Seed Data Initializers - Cleaned Initial State
const initialExpenses = [];
const initialIncome = [];
const initialBudgets = [
  { id: 'bgt_1', category: 'Housing', allocated: 1500, spent: 0 },
  { id: 'bgt_2', category: 'Groceries', allocated: 500, spent: 0 },
  { id: 'bgt_3', category: 'Food & Dining', allocated: 300, spent: 0 },
  { id: 'bgt_4', category: 'Transportation', allocated: 200, spent: 0 },
  { id: 'bgt_5', category: 'Entertainment', allocated: 150, spent: 0 },
  { id: 'bgt_6', category: 'Shopping', allocated: 250, spent: 0 }
];

const initialNotifications = [];

// Helper to reset and sync storage with clean initial states
const initializeCleanStorage = () => {
  Utils.storage.set('expenses', []);
  Utils.storage.set('income', []);
  Utils.storage.set('budgets', initialBudgets);
  Utils.storage.set('notifications', []);
};

// Check and purge legacy dummy data if found in browser storage
const existingExp = Utils.storage.get('expenses', []);
if (!Utils.storage.get('expenses_cleaned_v12') || (Array.isArray(existingExp) && existingExp.some(e => e.id === 'exp_1' || e.title === 'Monthly Apartment Rent'))) {
  localStorage.clear();
  initializeCleanStorage();
  Utils.storage.set('expenses_cleaned_v12', true);
}

const API = {
  // Utility for simulated API latency
  _delay: (ms = 300) => new Promise(resolve => setTimeout(resolve, ms)),

  /* ------------------- DASHBOARD DATA ------------------- */
  async getDashboardData() {
    /* Backend Fetch Integration Template:
    try {
      const res = await fetch(`${API_BASE_URL}/dashboard`);
      return await res.json();
    } catch (e) { ... }
    */
    await this._delay();
    const expenses = Utils.storage.get('expenses', []);
    const income = Utils.storage.get('income', []);
    const budgets = Utils.storage.get('budgets', []);

    const totalIncome = income.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
    const totalExpense = expenses.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
    const totalSavings = totalIncome - totalExpense;
    const totalAllocatedBudget = budgets.reduce((acc, curr) => acc + parseFloat(curr.allocated), 0);
    const remainingBudget = totalAllocatedBudget - totalExpense;

    return {
      totalIncome,
      totalExpense,
      totalSavings,
      remainingBudget: remainingBudget > 0 ? remainingBudget : 0,
      recentTransactions: expenses.slice(0, 5),
      budgetOverview: budgets
    };
  },

  /* ------------------- EXPENSES API ------------------- */
  async getExpenses(params = {}) {
    await this._delay();
    let data = Utils.storage.get('expenses', []);
    
    if (params.search) {
      const query = params.search.toLowerCase();
      data = data.filter(item => item.title.toLowerCase().includes(query) || item.category.toLowerCase().includes(query));
    }
    if (params.category && params.category !== 'All') {
      data = data.filter(item => item.category === params.category);
    }
    if (params.sort) {
      data.sort((a, b) => {
        if (params.sort === 'amount-high') return b.amount - a.amount;
        if (params.sort === 'amount-low') return a.amount - b.amount;
        if (params.sort === 'date-new') return new Date(b.date) - new Date(a.date);
        if (params.sort === 'date-old') return new Date(a.date) - new Date(b.date);
        return 0;
      });
    } else {
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    return { expenses: data, total: data.length };
  },

  async createExpense(expenseData) {
    await this._delay();
    const expenses = Utils.storage.get('expenses', []);
    const newExpense = {
      id: 'exp_' + Date.now(),
      ...expenseData,
      amount: parseFloat(expenseData.amount),
      status: expenseData.status || 'completed'
    };
    expenses.unshift(newExpense);
    Utils.storage.set('expenses', expenses);
    return newExpense;
  },

  async updateExpense(id, expenseData) {
    await this._delay();
    let expenses = Utils.storage.get('expenses', []);
    expenses = expenses.map(item => item.id === id ? { ...item, ...expenseData, amount: parseFloat(expenseData.amount) } : item);
    Utils.storage.set('expenses', expenses);
    return { success: true };
  },

  async deleteExpense(id) {
    await this._delay();
    let expenses = Utils.storage.get('expenses', []);
    expenses = expenses.filter(item => item.id !== id);
    Utils.storage.set('expenses', expenses);
    return { success: true };
  },

  /* ------------------- INCOME API ------------------- */
  async getIncome() {
    await this._delay();
    return Utils.storage.get('income', []);
  },

  async createIncome(incomeData) {
    await this._delay();
    const income = Utils.storage.get('income', []);
    const newInc = {
      id: 'inc_' + Date.now(),
      ...incomeData,
      amount: parseFloat(incomeData.amount)
    };
    income.unshift(newInc);
    Utils.storage.set('income', income);
    return newInc;
  },

  async deleteIncome(id) {
    await this._delay();
    let income = Utils.storage.get('income', []);
    income = income.filter(item => item.id !== id);
    Utils.storage.set('income', income);
    return { success: true };
  },

  /* ------------------- BUDGETS API ------------------- */
  async getBudgets() {
    await this._delay();
    const budgets = Utils.storage.get('budgets', initialBudgets);
    const expenses = Utils.storage.get('expenses', []);
    
    return budgets.map(b => {
      const spent = expenses
        .filter(exp => exp.category === b.category)
        .reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
      return { ...b, spent };
    });
  },

  async updateBudget(id, allocatedAmount) {
    await this._delay();
    let budgets = Utils.storage.get('budgets', []);
    budgets = budgets.map(item => item.id === id ? { ...item, allocated: parseFloat(allocatedAmount) } : item);
    Utils.storage.set('budgets', budgets);
    return { success: true };
  },

  /* ------------------- ANALYTICS API ------------------- */
  async getAnalytics(timeframe = 'monthly') {
    await this._delay();
    const expenses = Utils.storage.get('expenses', []);
    
    // Aggregate expenses by category
    const categoryTotals = {};
    expenses.forEach(exp => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });

    return {
      monthlySpendingTrends: [
        { month: 'Jan', income: 5800, expense: 2100 },
        { month: 'Feb', income: 5800, expense: 1950 },
        { month: 'Mar', income: 6200, expense: 2400 },
        { month: 'Apr', income: 5900, expense: 2050 },
        { month: 'May', income: 6500, expense: 2300 },
        { month: 'Jun', income: 6600, expense: 2150 },
        { month: 'Jul', income: 6635, expense: 2256.68 }
      ],
      categoryBreakdown: categoryTotals,
      savingsGrowth: [
        { month: 'Mar', balance: 14500 },
        { month: 'Apr', balance: 18350 },
        { month: 'May', balance: 22550 },
        { month: 'Jun', balance: 27000 },
        { month: 'Jul', balance: 31378 }
      ]
    };
  },

  /* ------------------- AI INSIGHTS API ------------------- */
  async getAIInsights() {
    await this._delay();
    const expenses = Utils.storage.get('expenses', []);
    const income = Utils.storage.get('income', []);
    const totalExp = expenses.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
    const totalInc = income.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

    const healthScore = totalInc > 0 ? Math.max(0, Math.min(Math.round(((totalInc - totalExp) / totalInc) * 100), 100)) : 100;

    let summaryText = "Add your income and expenses to start generating personalized AI financial insights.";
    if (expenses.length > 0 || income.length > 0) {
      summaryText = `Total recorded income is ${Utils.formatCurrency(totalInc)} against ${Utils.formatCurrency(totalExp)} in expenses. Net savings stand at ${Utils.formatCurrency(totalInc - totalExp)}.`;
    }

    const recs = [];
    if (expenses.length > 0) {
      recs.push({ title: "Track Category Budgets", description: "Review category spending regularly to maximize monthly savings.", impact: "Medium" });
    } else {
      recs.push({ title: "Record First Expense", description: "Click '+ Add New Expense' on the Expenses page to track outgoing cash flows.", impact: "High" });
    }

    return {
      healthScore: healthScore,
      financialSummary: summaryText,
      recommendations: recs,
      alerts: expenses.length === 0 ? [{ title: "No Transactions Recorded", level: "info", message: "Your transaction history is currently clean and empty." }] : []
    };
  },

  /* ------------------- AI CHAT ASSISTANT API ------------------- */
  async sendChatMessage(message) {
    await this._delay(600);
    const msg = message.toLowerCase();
    const expenses = Utils.storage.get('expenses', []);
    const income = Utils.storage.get('income', []);
    const totalExp = expenses.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
    const totalInc = income.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
    const currency = Utils.storage.get('user_profile', {}).currency || 'USD';

    let reply = "I am your Smart Expense Tracker AI assistant. How can I help analyze your budget or financial health today?";

    if (msg.includes('spend') || msg.includes('expense')) {
      reply = expenses.length > 0 
        ? `You have recorded **${expenses.length}** expense transactions totaling **${Utils.formatCurrency(totalExp, currency)}**.`
        : `You currently have **$0.00** in recorded expenses. Try adding an expense using the **+ Add New Expense** button!`;
    } else if (msg.includes('save') || msg.includes('savings')) {
      reply = `Your current net savings stand at **${Utils.formatCurrency(totalInc - totalExp, currency)}**.`;
    } else if (msg.includes('budget') || msg.includes('limit')) {
      reply = `You have 6 category budgets set up. Add expenses to track live progress percentage bars!`;
    }

    return { response: reply, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
  },

  /* ------------------- NOTIFICATIONS API ------------------- */
  async getNotifications() {
    await this._delay();
    return Utils.storage.get('notifications', []);
  },

  /* ------------------- PROFILE & USER API ------------------- */
  async updateProfile(profileData) {
    await this._delay();
    const currentUser = Utils.storage.get('user_profile', {
      name: 'Alex Mercer',
      email: 'alex.mercer@example.com',
      currency: 'USD',
      phone: '+1 (555) 234-5678'
    });
    const updated = { ...currentUser, ...profileData };
    Utils.storage.set('user_profile', updated);
    return updated;
  }
};
