/* Budget Management Controller */

const BudgetsPage = {
  state: {
    budgets: [],
    editingBudgetId: null,
    editingCategory: null
  },

  async init() {
    this.bindForms();
    await this.loadBudgets();
  },

  async loadBudgets() {
    this.renderSkeletons();
    try {
      // Fetch user's budgets and dashboard data for accurate spent amounts
      const budgetsRes = await API.getBudgets();
      let budgetStatuses = [];

      try {
        const dashData = await API.getDashboardData();
        if (dashData && dashData.budget_status) {
          budgetStatuses = dashData.budget_status;
        }
      } catch (err) {
        console.warn('Dashboard budget status warning:', err.message);
      }

      const statusMap = {};
      budgetStatuses.forEach(bs => {
        statusMap[bs.category] = bs.spent || 0;
      });

      const budgetList = Array.isArray(budgetsRes) ? budgetsRes : [];

      this.state.budgets = budgetList.map(b => ({
        id: b.id,
        category: b.category,
        allocated: parseFloat(b.monthly_limit || b.allocated || 0),
        spent: statusMap[b.category] !== undefined ? parseFloat(statusMap[b.category]) : 0,
        month: b.month,
        year: b.year
      }));

      this.renderBudgetsList();
      this.renderOverallSummary();
    } catch (e) {
      console.error('Error loading budgets:', e);
      Utils.showToast(e.message || 'Failed to load budgets', 'danger');
      this.renderEmptyState();
    }
  },

  renderSkeletons() {
    const container = document.getElementById('categoryBudgetsGrid');
    if (container) {
      container.innerHTML = Array(3).fill(`
        <div class="card">
          <div class="card-header">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="skeleton" style="width: 40px; height: 40px; border-radius: 8px;"></div>
              <div>
                <div class="skeleton" style="height: 18px; width: 100px; margin-bottom: 4px;"></div>
                <div class="skeleton" style="height: 12px; width: 60px;"></div>
              </div>
            </div>
          </div>
          <div style="margin: 1rem 0;">
            <div class="skeleton" style="height: 14px; width: 100%; margin-bottom: 8px;"></div>
            <div class="skeleton" style="height: 10px; width: 100%; border-radius: 5px;"></div>
          </div>
        </div>
      `).join('');
    }

    const allocatedEl = document.getElementById('totalBudgetAllocated');
    const spentEl = document.getElementById('totalBudgetSpent');
    const remainingEl = document.getElementById('totalBudgetRemaining');

    if (allocatedEl) allocatedEl.innerHTML = `<div class="skeleton" style="height: 28px; width: 90px;"></div>`;
    if (spentEl) spentEl.innerHTML = `<div class="skeleton" style="height: 28px; width: 90px;"></div>`;
    if (remainingEl) remainingEl.innerHTML = `<div class="skeleton" style="height: 28px; width: 90px;"></div>`;
  },

  renderOverallSummary() {
    const totalAllocated = this.state.budgets.reduce((acc, b) => acc + (b.allocated || 0), 0);
    const totalSpent = this.state.budgets.reduce((acc, b) => acc + (b.spent || 0), 0);
    const remaining = totalAllocated - totalSpent;
    const currency = Utils.storage.get('user_profile', {}).currency || 'USD';

    const allocatedEl = document.getElementById('totalBudgetAllocated');
    const spentEl = document.getElementById('totalBudgetSpent');
    const remainingEl = document.getElementById('totalBudgetRemaining');

    if (allocatedEl) allocatedEl.textContent = Utils.formatCurrency(totalAllocated, currency);
    if (spentEl) spentEl.textContent = Utils.formatCurrency(totalSpent, currency);
    if (remainingEl) remainingEl.textContent = Utils.formatCurrency(remaining > 0 ? remaining : 0, currency);
  },

  renderEmptyState() {
    const container = document.getElementById('categoryBudgetsGrid');
    if (container) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1;" class="empty-state">
          <i class="fa-solid fa-wallet empty-state-icon"></i>
          <div class="empty-state-title">No Category Budgets Configured</div>
          <div class="empty-state-text">Create monthly spending limits to track and manage your finances.</div>
          <button class="btn btn-primary btn-sm" onclick="BudgetsPage.openAddModal()">
            <i class="fa-solid fa-plus"></i> Add New Budget
          </button>
        </div>
      `;
    }
  },

  renderBudgetsList() {
    const container = document.getElementById('categoryBudgetsGrid');
    if (!container) return;

    if (!this.state.budgets || this.state.budgets.length === 0) {
      this.renderEmptyState();
      return;
    }

    const currency = Utils.storage.get('user_profile', {}).currency || 'USD';

    container.innerHTML = this.state.budgets.map(b => {
      const allocated = b.allocated || 1;
      const percentage = Math.min(Math.round((b.spent / allocated) * 100), 100);
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

      const escapedCategory = String(b.category).replace(/'/g, "\\'");

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

          <div style="border-top: 1px solid var(--border-color); padding-top: 0.85rem; display: flex; justify-content: space-between; align-items: center;">
            <button class="btn btn-outline btn-sm" style="color: var(--danger); border-color: transparent;" onclick="BudgetsPage.deleteBudget(${b.id})" title="Delete Budget">
              <i class="fa-solid fa-trash-can"></i>
            </button>
            <button class="btn btn-outline btn-sm" onclick="BudgetsPage.openEditModal(${b.id}, '${escapedCategory}', ${b.allocated})">
              <i class="fa-solid fa-sliders"></i> Adjust Budget
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  bindForms() {
    // Add Budget Form
    const addForm = document.getElementById('addBudgetForm');
    if (addForm) {
      addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const category = document.getElementById('addBgtCategory').value;
        const amount = document.getElementById('addBgtAllocated').value;
        const submitBtn = addForm.querySelector('button[type="submit"]');

        if (!category || !amount || parseFloat(amount) <= 0) {
          Utils.showToast('Please enter a valid category and amount.', 'warning');
          return;
        }

        const origHtml = submitBtn.innerHTML;
        try {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

          try {
            await API.createBudget({ category, monthly_limit: parseFloat(amount) });
            Utils.showToast('Budget allocation created!', 'success');
          } catch (err) {
            // If budget already exists for category, find existing budget and update limit
            if (err.message && err.message.toLowerCase().includes('already exists')) {
              const existing = this.state.budgets.find(b => b.category === category);
              if (existing) {
                await API.updateBudget(existing.id, { monthly_limit: parseFloat(amount) });
                Utils.showToast(`Updated existing ${category} budget!`, 'success');
              } else {
                throw err;
              }
            } else {
              throw err;
            }
          }

          this.closeModal('addBudgetModal');
          await this.loadBudgets();
        } catch (err) {
          Utils.showToast(err.message || 'Failed to save budget.', 'danger');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origHtml;
        }
      });
    }

    // Edit Budget Form
    const editForm = document.getElementById('editBudgetForm');
    if (editForm) {
      editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = document.getElementById('bgtAllocatedInput').value;
        const submitBtn = editForm.querySelector('button[type="submit"]');

        if (!amount || parseFloat(amount) <= 0) {
          Utils.showToast('Please enter a valid amount.', 'warning');
          return;
        }

        const origHtml = submitBtn.innerHTML;
        try {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Updating...`;

          if (this.state.editingBudgetId) {
            await API.updateBudget(this.state.editingBudgetId, { monthly_limit: parseFloat(amount) });
          } else if (this.state.editingCategory) {
            await API.createBudget({ category: this.state.editingCategory, monthly_limit: parseFloat(amount) });
          }
          
          Utils.showToast('Budget allocation updated!', 'success');
          this.closeModal('editBudgetModal');
          await this.loadBudgets();
        } catch (err) {
          Utils.showToast(err.message || 'Failed to update budget.', 'danger');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origHtml;
        }
      });
    }
  },

  openAddModal() {
    const form = document.getElementById('addBudgetForm');
    if (form) form.reset();
    this.showModal('addBudgetModal');
  },

  openEditModal(id, category, currentAmount) {
    this.state.editingBudgetId = id;
    this.state.editingCategory = category;
    
    const catNameEl = document.getElementById('bgtCategoryName');
    const allocInput = document.getElementById('bgtAllocatedInput');
    
    if (catNameEl) catNameEl.textContent = category;
    if (allocInput) allocInput.value = currentAmount || 0;
    
    this.showModal('editBudgetModal');
  },

  async deleteBudget(id) {
    if (confirm('Are you sure you want to delete this category budget?')) {
      try {
        await API.deleteBudget(id);
        Utils.showToast('Budget entry removed.', 'info');
        await this.loadBudgets();
      } catch (err) {
        Utils.showToast(err.message || 'Failed to delete budget.', 'danger');
      }
    }
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
  if (window.location.pathname.includes('budgets')) {
    BudgetsPage.init();
  }
});
