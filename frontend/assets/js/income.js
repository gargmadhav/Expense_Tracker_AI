/* Income Management Controller */

const IncomePage = {
  state: {
    incomeList: [],
    deletingId: null
  },

  async init() {
    this.bindForm();
    await this.loadIncome();
  },

  async loadIncome() {
    this.renderSkeletons();
    try {
      this.state.incomeList = await API.getIncome();
      this.renderTable();
      this.renderTotalSummary();
    } catch (e) {
      console.error(e);
      Utils.showToast('Error loading income history', 'danger');
    }
  },

  renderSkeletons() {
    const tbody = document.getElementById('incomeTableBody');
    if (tbody) {
      tbody.innerHTML = Array(3).fill(`
        <tr>
          <td><div class="skeleton" style="height: 20px; width: 140px;"></div></td>
          <td><div class="skeleton" style="height: 20px; width: 90px;"></div></td>
          <td><div class="skeleton" style="height: 20px; width: 80px;"></div></td>
          <td><div class="skeleton" style="height: 20px; width: 100px;"></div></td>
          <td><div class="skeleton" style="height: 20px; width: 50px;"></div></td>
        </tr>
      `).join('');
    }
  },

  renderTotalSummary() {
    const total = this.state.incomeList.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
    const currency = Utils.storage.get('user_profile', {}).currency || 'USD';
    const totalEl = document.getElementById('incomeTotalVal');
    if (totalEl) totalEl.textContent = Utils.formatCurrency(total, currency);
  },

  renderTable() {
    const tbody = document.getElementById('incomeTableBody');
    if (!tbody) return;

    if (this.state.incomeList.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            <i class="fa-solid fa-money-bill-wave empty-state-icon"></i>
            <div class="empty-state-title">No Income Records</div>
            <div class="empty-state-text">Add your salary, freelance earnings, or investment returns here.</div>
          </td>
        </tr>
      `;
      return;
    }

    const currency = Utils.storage.get('user_profile', {}).currency || 'USD';

    tbody.innerHTML = this.state.incomeList.map(item => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div class="card-icon-box card-icon-success" style="width: 36px; height: 36px; font-size: 0.95rem;">
              <i class="fa-solid ${Utils.getCategoryIcon(item.category)}"></i>
            </div>
            <div>
              <div style="font-weight: 600;">${item.source}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${item.description || ''}</div>
            </div>
          </div>
        </td>
        <td><span class="category-badge">${item.category}</span></td>
        <td>${Utils.formatDate(item.date)}</td>
        <td style="font-weight: 700; color: var(--success);">
          +${Utils.formatCurrency(item.amount, currency)}
        </td>
        <td>
          <button class="btn btn-outline btn-sm btn-icon" onclick="IncomePage.openDeleteModal('${item.id}')" title="Delete Income" style="color: var(--danger);">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `).join('');
  },

  bindForm() {
    const form = document.getElementById('incomeForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const source = document.getElementById('incSource').value;
        const amount = document.getElementById('incAmount').value;
        const category = document.getElementById('incCategory').value;
        const date = document.getElementById('incDate').value;
        const description = document.getElementById('incDescription').value;

        if (!source || !amount || !category || !date) {
          Utils.showToast('Please fill in required fields.', 'warning');
          return;
        }

        await API.createIncome({ source, amount, category, date, description });
        Utils.showToast('Income entry created successfully!', 'success');

        this.closeModal('incomeModal');
        await this.loadIncome();
      });
    }

    const confirmDeleteBtn = document.getElementById('confirmDeleteIncomeBtn');
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', async () => {
        if (this.state.deletingId) {
          await API.deleteIncome(this.state.deletingId);
          Utils.showToast('Income entry removed.', 'info');
          this.closeModal('deleteIncomeModal');
          await this.loadIncome();
        }
      });
    }
  },

  openAddModal() {
    document.getElementById('incomeForm').reset();
    document.getElementById('incDate').value = new Date().toISOString().split('T')[0];
    this.showModal('incomeModal');
  },

  openDeleteModal(id) {
    this.state.deletingId = id;
    this.showModal('deleteIncomeModal');
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
  if (window.location.pathname.includes('income.html')) {
    IncomePage.init();
  }
});
