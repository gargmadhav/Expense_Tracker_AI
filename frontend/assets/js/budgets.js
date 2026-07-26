/* Budget Management Controller */

const BudgetsPage = {
  state: {
    budgets: [],
    editingBudgetId: null
  },

  async init() {
    this.bindForm();
    await this.loadBudgets();
  },

  async loadBudgets() {
    try {
      this.state.budgets = await API.getBudgets();
      this.renderBudgetsList();
      this.renderOverallSummary();
    } catch (e) {
      console.error(e);
      Utils.showToast('Failed to load budgets', 'danger');
    }
  },

  renderOverallSummary() {
    const totalAllocated = this.state.budgets.reduce((acc, b) => acc + parseFloat(b.allocated), 0);
    const totalSpent = this.state.budgets.reduce((acc, b) => acc + parseFloat(b.spent), 0);
    const remaining = totalAllocated - totalSpent;
    const currency = Utils.storage.get('user_profile', {}).currency || 'USD';

    const allocatedEl = document.getElementById('totalBudgetAllocated');
    const spentEl = document.getElementById('totalBudgetSpent');
    const remainingEl = document.getElementById('totalBudgetRemaining');

    if (allocatedEl) allocatedEl.textContent = Utils.formatCurrency(totalAllocated, currency);
    if (spentEl) spentEl.textContent = Utils.formatCurrency(totalSpent, currency);
    if (remainingEl) remainingEl.textContent = Utils.formatCurrency(remaining > 0 ? remaining : 0, currency);
  },

  renderBudgetsList() {
    const container = document.getElementById('categoryBudgetsGrid');
    if (!container) return;

    const currency = Utils.storage.get('user_profile', {}).currency || 'USD';

    container.innerHTML = this.state.budgets.map(b => {
      const percentage = Math.min(Math.round((b.spent / b.allocated) * 100), 100);
      const remaining = b.allocated - b.spent;
      
      let progressClass = 'progress-bar-success';
      let statusBadge = `<span class="status-badge status-completed">On Track</span>`;

      if (percentage >= 90) {
        progressClass = 'progress-bar-danger';
        statusBadge = `<span class="status-badge status-failed">Exceeded / Near Limit</span>`;
      } else if (percentage >= 75) {
        progressClass = 'progress-bar-warning';
        statusBadge = `<span class="status-badge status-pending">Warning (75%+)</span>`;
      }

      return `
        <div class="card">
          <div class="card-header">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="card-icon-box card-icon-primary" style="width: 40px; height: 40px;">
                <i class="fa-solid ${Utils.getCategoryIcon(b.category)}"></i>
              </div>
              <div>
                <h4 style="font-size: 1.05rem;">${b.category}</h4>
                <div style="font-size: 0.8rem; color: var(--text-muted);">Monthly Cap</div>
              </div>
            </div>
            ${statusBadge}
          </div>

          <div style="margin: 1rem 0;">
            <div style="display: flex; justify-content: space-between; font-size: 0.9rem; font-weight: 700; margin-bottom: 0.5rem;">
              <span>${Utils.formatCurrency(b.spent, currency)} spent</span>
              <span>${Utils.formatCurrency(b.allocated, currency)} allocated</span>
            </div>
            <div class="progress-bar-container" style="height: 10px;">
              <div class="progress-bar-fill ${progressClass}" style="width: ${percentage}%;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted); margin-top: 0.35rem;">
              <span>${percentage}% Used</span>
              <span>${remaining >= 0 ? Utils.formatCurrency(remaining, currency) + ' left' : 'Over budget'}</span>
            </div>
          </div>

          <div style="border-top: 1px solid var(--border-color); padding-top: 0.85rem; display: flex; justify-content: flex-end;">
            <button class="btn btn-outline btn-sm" onclick="BudgetsPage.openEditModal('${b.id}', '${b.category}', ${b.allocated})">
              <i class="fa-solid fa-sliders"></i> Adjust Budget
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  bindForm() {
    const form = document.getElementById('editBudgetForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = document.getElementById('bgtAllocatedInput').value;
        if (!amount || amount <= 0) {
          Utils.showToast('Please enter a valid amount.', 'warning');
          return;
        }

        await API.updateBudget(this.state.editingBudgetId, amount);
        Utils.showToast('Budget allocation updated!', 'success');
        this.closeModal('editBudgetModal');
        await this.loadBudgets();
      });
    }
  },

  openEditModal(id, category, currentAmount) {
    this.state.editingBudgetId = id;
    document.getElementById('bgtCategoryName').textContent = category;
    document.getElementById('bgtAllocatedInput').value = currentAmount;
    this.showModal('editBudgetModal');
  },

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('budgets.html')) {
    BudgetsPage.init();
  }
});
