/* Expense Management Controller */

const ExpensesPage = {
  state: {
    expenses: [],
    filteredExpenses: [],
    searchQuery: '',
    categoryFilter: 'All',
    sortBy: 'date-new',
    currentPage: 1,
    itemsPerPage: 5,
    editingId: null,
    deletingId: null
  },

  async init() {
    this.bindSearchAndFilters();
    this.bindModals();
    this.checkUrlParams();
    await this.loadExpenses();
  },

  checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const search = params.get('search');
    if (search) {
      this.state.searchQuery = search;
      const searchInput = document.getElementById('expenseSearchInput');
      if (searchInput) searchInput.value = search;
    }
  },

  async loadExpenses() {
    this.renderSkeletons();
    try {
      const result = await API.getExpenses();
      this.state.expenses = result.expenses;
      this.applyFilters();
    } catch (e) {
      console.error(e);
      Utils.showToast('Failed to load expenses list.', 'danger');
    }
  },

  renderSkeletons() {
    const tableBody = document.getElementById('expensesTableBody');
    if (tableBody) {
      tableBody.innerHTML = Array(5).fill(`
        <tr>
          <td><div class="skeleton" style="height: 20px; width: 140px;"></div></td>
          <td><div class="skeleton" style="height: 20px; width: 90px;"></div></td>
          <td><div class="skeleton" style="height: 20px; width: 80px;"></div></td>
          <td><div class="skeleton" style="height: 20px; width: 100px;"></div></td>
          <td><div class="skeleton" style="height: 20px; width: 70px;"></div></td>
          <td><div class="skeleton" style="height: 20px; width: 60px;"></div></td>
        </tr>
      `).join('');
    }
  },

  applyFilters() {
    let result = [...this.state.expenses];

    // Search query filter
    if (this.state.searchQuery) {
      const q = this.state.searchQuery.toLowerCase();
      result = result.filter(exp => 
        exp.title.toLowerCase().includes(q) || 
        exp.category.toLowerCase().includes(q) ||
        (exp.paymentMethod && exp.paymentMethod.toLowerCase().includes(q))
      );
    }

    // Category Filter
    if (this.state.categoryFilter !== 'All') {
      result = result.filter(exp => exp.category === this.state.categoryFilter);
    }

    // Sorting
    result.sort((a, b) => {
      if (this.state.sortBy === 'amount-high') return b.amount - a.amount;
      if (this.state.sortBy === 'amount-low') return a.amount - b.amount;
      if (this.state.sortBy === 'date-new') return new Date(b.date) - new Date(a.date);
      if (this.state.sortBy === 'date-old') return new Date(a.date) - new Date(b.date);
      return 0;
    });

    this.state.filteredExpenses = result;
    this.renderTable();
    this.renderPagination();
  },

  renderTable() {
    const tableBody = document.getElementById('expensesTableBody');
    if (!tableBody) return;

    if (this.state.filteredExpenses.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            <i class="fa-solid fa-folder-open empty-state-icon"></i>
            <div class="empty-state-title">No Expenses Found</div>
            <div class="empty-state-text">Try adjusting your filters or search terms, or add a new expense.</div>
            <button class="btn btn-primary btn-sm" onclick="ExpensesPage.openAddModal()">
              <i class="fa-solid fa-plus"></i> Add New Expense
            </button>
          </td>
        </tr>
      `;
      return;
    }

    const startIndex = (this.state.currentPage - 1) * this.state.itemsPerPage;
    const paginatedItems = this.state.filteredExpenses.slice(startIndex, startIndex + this.state.itemsPerPage);
    const currency = Utils.storage.get('user_profile', {}).currency || 'USD';

    tableBody.innerHTML = paginatedItems.map(item => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div class="card-icon-box card-icon-primary" style="width: 36px; height: 36px; font-size: 0.95rem;">
              <i class="fa-solid ${Utils.getCategoryIcon(item.category)}"></i>
            </div>
            <div>
              <div style="font-weight: 600;">${item.title}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${item.paymentMethod || 'Debit Card'}</div>
            </div>
          </div>
        </td>
        <td><span class="category-badge">${item.category}</span></td>
        <td>${Utils.formatDate(item.date)}</td>
        <td style="font-weight: 700; color: var(--danger);">
          -${Utils.formatCurrency(item.amount, currency)}
        </td>
        <td><span class="status-badge status-completed">${item.status || 'completed'}</span></td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-outline btn-sm btn-icon" onclick="ExpensesPage.openEditModal('${item.id}')" title="Edit Expense">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn btn-outline btn-sm btn-icon" onclick="ExpensesPage.openDeleteModal('${item.id}')" title="Delete Expense" style="color: var(--danger);">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  renderPagination() {
    const container = document.getElementById('expensePagination');
    if (!container) return;

    const totalPages = Math.ceil(this.state.filteredExpenses.length / this.state.itemsPerPage) || 1;
    let buttons = '';

    for (let i = 1; i <= totalPages; i++) {
      buttons += `<button class="page-btn ${i === this.state.currentPage ? 'active' : ''}" onclick="ExpensesPage.goToPage(${i})">${i}</button>`;
    }

    container.innerHTML = `
      <div style="font-size: 0.85rem; color: var(--text-muted);">
        Showing ${Math.min((this.state.currentPage - 1) * this.state.itemsPerPage + 1, this.state.filteredExpenses.length)} to ${Math.min(this.state.currentPage * this.state.itemsPerPage, this.state.filteredExpenses.length)} of ${this.state.filteredExpenses.length} expenses
      </div>
      <div class="pagination-pages">
        <button class="page-btn" ${this.state.currentPage === 1 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''} onclick="ExpensesPage.goToPage(${this.state.currentPage - 1})">
          <i class="fa-solid fa-chevron-left"></i>
        </button>
        ${buttons}
        <button class="page-btn" ${this.state.currentPage === totalPages ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''} onclick="ExpensesPage.goToPage(${this.state.currentPage + 1})">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    `;
  },

  goToPage(page) {
    const totalPages = Math.ceil(this.state.filteredExpenses.length / this.state.itemsPerPage);
    if (page >= 1 && page <= totalPages) {
      this.state.currentPage = page;
      this.renderTable();
      this.renderPagination();
    }
  },

  bindSearchAndFilters() {
    const searchInput = document.getElementById('expenseSearchInput');
    const categorySelect = document.getElementById('expenseCategoryFilter');
    const sortSelect = document.getElementById('expenseSortSelect');

    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce((e) => {
        this.state.searchQuery = e.target.value;
        this.state.currentPage = 1;
        this.applyFilters();
      }, 300));
    }

    if (categorySelect) {
      categorySelect.addEventListener('change', (e) => {
        this.state.categoryFilter = e.target.value;
        this.state.currentPage = 1;
        this.applyFilters();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.state.sortBy = e.target.value;
        this.applyFilters();
      });
    }
  },

  bindModals() {
    const form = document.getElementById('expenseForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('expTitle').value;
        const amount = document.getElementById('expAmount').value;
        const category = document.getElementById('expCategory').value;
        const date = document.getElementById('expDate').value;
        const paymentMethod = document.getElementById('expPaymentMethod').value;

        if (!title || !amount || !category || !date) {
          Utils.showToast('Please fill in all required fields.', 'warning');
          return;
        }

        const data = { title, amount: parseFloat(amount), category, date, paymentMethod };

        if (this.state.editingId) {
          await API.updateExpense(this.state.editingId, data);
          Utils.showToast('Expense updated successfully!', 'success');
        } else {
          await API.createExpense(data);
          Utils.showToast('Expense added successfully!', 'success');
        }

        this.closeModal('expenseModal');
        await this.loadExpenses();
      });
    }

    const confirmDeleteBtn = document.getElementById('confirmDeleteExpenseBtn');
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', async () => {
        if (this.state.deletingId) {
          await API.deleteExpense(this.state.deletingId);
          Utils.showToast('Expense deleted.', 'info');
          this.closeModal('deleteModal');
          await this.loadExpenses();
        }
      });
    }
  },

  openAddModal() {
    this.state.editingId = null;
    document.getElementById('expenseModalTitle').textContent = 'Add New Expense';
    document.getElementById('expenseForm').reset();
    document.getElementById('expDate').value = new Date().toISOString().split('T')[0];
    this.showModal('expenseModal');
  },

  openEditModal(id) {
    const item = this.state.expenses.find(e => e.id === id);
    if (!item) return;

    this.state.editingId = id;
    document.getElementById('expenseModalTitle').textContent = 'Edit Expense';
    document.getElementById('expTitle').value = item.title;
    document.getElementById('expAmount').value = item.amount;
    document.getElementById('expCategory').value = item.category;
    document.getElementById('expDate').value = item.date;
    document.getElementById('expPaymentMethod').value = item.paymentMethod || 'Credit Card';

    this.showModal('expenseModal');
  },

  openDeleteModal(id) {
    this.state.deletingId = id;
    this.showModal('deleteModal');
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
  if (window.location.pathname.includes('expenses.html')) {
    ExpensesPage.init();
  }
});
