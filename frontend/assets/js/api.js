/* API Service Layer - Smart Expense Tracker AI */

let defaultHost = (typeof window !== 'undefined' && window.location && window.location.hostname)
  ? window.location.hostname
  : 'localhost';

let envUrl = (typeof window !== 'undefined' && window.ENV_API_BASE_URL)
  ? window.ENV_API_BASE_URL
  : `http://${defaultHost}:8000`;

// Strip trailing slash or /api/v1 if present to normalize base URL
envUrl = envUrl.replace(/\/+$/, '').replace(/\/api\/v1$/, '');
const API_BASE_URL = envUrl;

const API = {
  // Utility for JWT Token Management
  getToken() {
    return localStorage.getItem('access_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('access_token', token);
    }
  },

  removeToken() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_profile');
  },

  // Central HTTP Request Wrapper
  async request(endpoint, options = {}) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_BASE_URL}${cleanEndpoint}`;
    
    const headers = { ...options.headers };
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);

      // Handle 401 Unauthorized (Expired or invalid token)
      if (response.status === 401) {
        this.removeToken();
        const isAuthPage = window.location.pathname.includes('login.html') || 
                           window.location.pathname.includes('signup.html') || 
                           window.location.pathname.includes('forgot-password.html');
        if (!isAuthPage) {
          window.location.href = 'login.html';
        }
      }

      // Parse response body safely (HTTP 204 and 205 have no response body)
      let data = null;
      if (response.status !== 204 && response.status !== 205) {
        const text = await response.text();
        if (text && text.trim().length > 0) {
          try {
            data = JSON.parse(text);
          } catch (e) {
            console.warn('Failed to parse response body as JSON:', e);
          }
        }
      }

      if (!response.ok) {
        let errorMessage = 'An error occurred while processing your request.';
        if (data) {
          if (data.detail) {
            errorMessage = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
          } else if (data.error && data.error.message) {
            errorMessage = data.error.message;
          }
        }
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      console.error(`API Error on [${options.method || 'GET'}] ${endpoint}:`, error.message);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Failed to connect to backend server. Please ensure FastAPI backend is running on port 8000.');
      }
      throw error;
    }
  },

  /* ------------------- AUTHENTICATION APIS ------------------- */
  async register(userData) {
    return await this.request('/auth/register', {
      method: 'POST',
      body: {
        full_name: userData.full_name || userData.name,
        email: userData.email,
        password: userData.password
      }
    });
  },

  async login(credentials) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: {
        email: credentials.email,
        password: credentials.password
      }
    });

    if (data && data.access_token) {
      this.setToken(data.access_token);
    }
    return data;
  },

  async getMe() {
    return await this.request('/auth/me', { method: 'GET' });
  },

  async updateProfile(profileData) {
    const current = (typeof Utils !== 'undefined' && Utils.storage.get('user_profile')) || {};
    const updated = {
      ...current,
      name: profileData.name || current.name,
      email: profileData.email || current.email,
      phone: profileData.phone || current.phone,
      currency: profileData.currency || current.currency || 'USD'
    };
    if (typeof Utils !== 'undefined') {
      Utils.storage.set('user_profile', updated);
    }
    return updated;
  },

  /* ------------------- DASHBOARD APIS ------------------- */
  async getDashboardData(month = null, year = null) {
    let query = '';
    const params = [];
    if (month) params.push(`month=${month}`);
    if (year) params.push(`year=${year}`);
    if (params.length > 0) query = `?${params.join('&')}`;

    return await this.request(`/dashboard${query}`, { method: 'GET' });
  },

  /* ------------------- EXCHANGE RATES APIS ------------------- */
  async getSupportedCurrencies() {
    return await this.request('/exchange-rates/supported', { method: 'GET' });
  },

  async convertCurrency(amount, fromCurrency) {
    return await this.request(`/exchange-rates/convert?amount=${encodeURIComponent(amount)}&from_currency=${encodeURIComponent(fromCurrency)}`, { method: 'GET' });
  },

  /* ------------------- EXPENSES APIS ------------------- */
  async getExpenses(category = null) {
    let query = '';
    if (category && category !== 'All') {
      query = `?category=${encodeURIComponent(category)}`;
    }
    const expenses = await this.request(`/expenses${query}`, { method: 'GET' });
    return { expenses: expenses || [], total: expenses ? expenses.length : 0 };
  },

  async createExpense(expenseData) {
    return await this.request('/expenses', {
      method: 'POST',
      body: {
        title: expenseData.title,
        category: expenseData.category,
        amount: parseFloat(expenseData.amount),
        currency: expenseData.currency || 'INR',
        description: expenseData.description || null,
        transaction_date: expenseData.transaction_date || expenseData.date || new Date().toISOString().split('T')[0]
      }
    });
  },

  async updateExpense(id, expenseData) {
    return await this.request(`/expenses/${id}`, {
      method: 'PUT',
      body: {
        title: expenseData.title,
        category: expenseData.category,
        amount: expenseData.amount ? parseFloat(expenseData.amount) : undefined,
        currency: expenseData.currency,
        description: expenseData.description,
        transaction_date: expenseData.transaction_date || expenseData.date
      }
    });
  },

  async deleteExpense(id) {
    return await this.request(`/expenses/${id}`, { method: 'DELETE' });
  },

  /* ------------------- INCOME APIS ------------------- */
  async getIncome(source = null) {
    let query = '';
    if (source) query = `?source=${encodeURIComponent(source)}`;
    return await this.request(`/income${query}`, { method: 'GET' });
  },

  async createIncome(incomeData) {
    return await this.request('/income', {
      method: 'POST',
      body: {
        source: incomeData.source,
        amount: parseFloat(incomeData.amount),
        currency: incomeData.currency || 'INR',
        description: incomeData.description || null,
        transaction_date: incomeData.transaction_date || incomeData.date || new Date().toISOString().split('T')[0]
      }
    });
  },

  async updateIncome(id, incomeData) {
    return await this.request(`/income/${id}`, {
      method: 'PUT',
      body: {
        source: incomeData.source,
        amount: incomeData.amount ? parseFloat(incomeData.amount) : undefined,
        currency: incomeData.currency,
        description: incomeData.description,
        transaction_date: incomeData.transaction_date || incomeData.date
      }
    });
  },

  async deleteIncome(id) {
    return await this.request(`/income/${id}`, { method: 'DELETE' });
  },

  /* ------------------- BUDGETS APIS ------------------- */
  async getBudgets(month = null, year = null) {
    let query = '';
    const params = [];
    if (month) params.push(`month=${month}`);
    if (year) params.push(`year=${year}`);
    if (params.length > 0) query = `?${params.join('&')}`;

    return await this.request(`/budgets${query}`, { method: 'GET' });
  },

  async createBudget(budgetData) {
    const today = new Date();
    return await this.request('/budgets', {
      method: 'POST',
      body: {
        category: budgetData.category,
        monthly_limit: parseFloat(budgetData.monthly_limit || budgetData.allocated),
        month: parseInt(budgetData.month || (today.getMonth() + 1)),
        year: parseInt(budgetData.year || today.getFullYear())
      }
    });
  },

  async updateBudget(id, budgetData) {
    const updateBody = {};
    if (budgetData.monthly_limit !== undefined || budgetData.allocated !== undefined) {
      updateBody.monthly_limit = parseFloat(budgetData.monthly_limit || budgetData.allocated);
    }
    if (budgetData.category) updateBody.category = budgetData.category;
    if (budgetData.month) updateBody.month = parseInt(budgetData.month);
    if (budgetData.year) updateBody.year = parseInt(budgetData.year);

    return await this.request(`/budgets/${id}`, {
      method: 'PUT',
      body: updateBody
    });
  },

  async deleteBudget(id) {
    return await this.request(`/budgets/${id}`, { method: 'DELETE' });
  },

  /* ------------------- ANALYTICS APIS ------------------- */
  async getAnalyticsMonthly(year = null) {
    let query = year ? `?year=${year}` : '';
    return await this.request(`/analytics/monthly${query}`, { method: 'GET' });
  },

  async getAnalyticsCategories(month = null, year = null) {
    const params = [];
    if (month) params.push(`month=${month}`);
    if (year) params.push(`year=${year}`);
    let query = params.length > 0 ? `?${params.join('&')}` : '';
    return await this.request(`/analytics/categories${query}`, { method: 'GET' });
  },

  async getAnalyticsTrends(limit = 6) {
    return await this.request(`/analytics/trends?limit=${limit}`, { method: 'GET' });
  },

  async getAnalytics() {
    const [monthlyRes, categoriesRes, trendsRes] = await Promise.all([
      this.getAnalyticsMonthly(),
      this.getAnalyticsCategories(),
      this.getAnalyticsTrends(6)
    ]);

    const monthlySpendingTrends = (trendsRes.trends || []).map(t => ({
      month: t.period.split(' ')[0],
      income: t.income,
      expense: t.expense
    }));

    const categoryBreakdown = {};
    (categoriesRes.categories || []).forEach(c => {
      categoryBreakdown[c.category] = c.total_amount;
    });

    const savingsGrowth = (monthlyRes.monthly_data || []).slice(0, 6).map(m => ({
      month: m.month_name,
      amount: m.net_savings
    }));

    return {
      monthlySpendingTrends,
      categoryBreakdown,
      savingsGrowth
    };
  },

  /* ------------------- NOTIFICATIONS APIS ------------------- */
  async getNotifications(isRead = null) {
    let query = isRead !== null ? `?is_read=${isRead}` : '';
    const res = await this.request(`/notifications${query}`, { method: 'GET' });
    return (res || []).map(n => ({
      id: n.id,
      title: n.type ? n.type.replace('_', ' ').toUpperCase() : 'NOTIFICATION',
      message: n.message,
      type: n.type.includes('exceeded') || n.type.includes('warning') ? 'warning' : 'info',
      read: n.is_read,
      time: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));
  },

  async markNotificationRead(id) {
    return await this.request(`/notifications/${id}/read`, { method: 'PUT' });
  },

  async markAllNotificationsRead() {
    return await this.request('/notifications/read-all', { method: 'PUT' });
  },

  /* ------------------- GROQ AI LLM ENGINE APIS ------------------- */
  async getAIInsights() {
    return await this.request('/ai/insights', { method: 'GET' });
  },

  async sendChatMessage(messageText) {
    return await this.request('/ai/chat', {
      method: 'POST',
      body: { message: messageText }
    });
  },

  /* ------------------- OCR BILL & RECEIPT SCANNER APIS ------------------- */
  async scanReceipt(file) {
    const formData = new FormData();
    formData.append('file', file);

    return await this.request('/ocr/scan-receipt', {
      method: 'POST',
      body: formData
    });
  }
};

// Export for module or global window object
if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}
if (typeof window !== 'undefined') {
  window.API = API;
}
