/* Dashboard Page Controller */

const Dashboard = {
  async init() {
    this.renderSkeletons();
    try {
      const data = await API.getDashboardData();
      this.renderMetrics(data);
      this.renderRecentTransactions(data.recentTransactions);
      this.renderBudgetProgress(data.budgetOverview);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      Utils.showToast('Error loading dashboard data', 'danger');
    }
  },

  renderSkeletons() {
    const cardValues = document.querySelectorAll('.card-value');
    cardValues.forEach(el => {
      el.innerHTML = `<div class="skeleton" style="height: 32px; width: 120px;"></div>`;
    });

    const tableBody = document.getElementById('recentTransactionsBody');
    if (tableBody) {
      tableBody.innerHTML = Array(5).fill(`
        <tr>
          <td><div class="skeleton" style="height: 20px; width: 140px;"></div></td>
          <td><div class="skeleton" style="height: 20px; width: 90px;"></div></td>
          <td><div class="skeleton" style="height: 20px; width: 80px;"></div></td>
          <td><div class="skeleton" style="height: 20px; width: 70px;"></div></td>
        </tr>
      `).join('');
    }
  },

  renderMetrics(data) {
    const currency = Utils.storage.get('user_profile', {}).currency || 'USD';

    document.getElementById('totalIncomeVal').textContent = Utils.formatCurrency(data.totalIncome, currency);
    document.getElementById('totalExpenseVal').textContent = Utils.formatCurrency(data.totalExpense, currency);
    document.getElementById('totalSavingsVal').textContent = Utils.formatCurrency(data.totalSavings, currency);
    document.getElementById('remainingBudgetVal').textContent = Utils.formatCurrency(data.remainingBudget, currency);
  },

  renderRecentTransactions(transactions) {
    const tableBody = document.getElementById('recentTransactionsBody');
    if (!tableBody) return;

    if (!transactions || transactions.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">
            <i class="fa-solid fa-receipt empty-state-icon"></i>
            <div class="empty-state-title">No Recent Transactions</div>
            <div class="empty-state-text">Start recording your expenses to see recent activity here.</div>
          </td>
        </tr>
      `;
      return;
    }

    const currency = Utils.storage.get('user_profile', {}).currency || 'USD';

    tableBody.innerHTML = transactions.map(item => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div class="card-icon-box card-icon-primary" style="width: 34px; height: 34px; font-size: 0.9rem;">
              <i class="fa-solid ${Utils.getCategoryIcon(item.category)}"></i>
            </div>
            <span style="font-weight: 600;">${item.title}</span>
          </div>
        </td>
        <td><span class="category-badge">${item.category}</span></td>
        <td>${Utils.formatDate(item.date)}</td>
        <td style="font-weight: 700; color: var(--danger); text-align: right;">
          -${Utils.formatCurrency(item.amount, currency)}
        </td>
      </tr>
    `).join('');
  },

  renderBudgetProgress(budgets) {
    const container = document.getElementById('dashboardBudgetList');
    if (!container) return;

    const currency = Utils.storage.get('user_profile', {}).currency || 'USD';

    container.innerHTML = budgets.map(b => {
      const percentage = Math.min(Math.round((b.spent / b.allocated) * 100), 100);
      const colorClass = percentage > 90 ? 'progress-bar-danger' : percentage > 75 ? 'progress-bar-warning' : 'progress-bar-success';

      return `
        <div style="margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">
            <span>${b.category}</span>
            <span>${Utils.formatCurrency(b.spent, currency)} / ${Utils.formatCurrency(b.allocated, currency)} (${percentage}%)</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill ${colorClass}" style="width: ${percentage}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('dashboard.html') || window.location.pathname.endsWith('/')) {
    Dashboard.init();
  }
});
