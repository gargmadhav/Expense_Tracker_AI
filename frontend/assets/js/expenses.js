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
    this.bindCurrencyListeners();
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
      const result = await API.getExpenses(this.state.categoryFilter);
      this.state.expenses = result.expenses || [];
      this.applyFilters();
    } catch (e) {
      console.error(e);
      Utils.showToast(e.message || 'Failed to load expenses list.', 'danger');
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

  bindSearchAndFilters() {
    const searchInput = document.getElementById('expenseSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce((e) => {
        this.state.searchQuery = e.target.value.trim();
        this.state.currentPage = 1;
        this.applyFilters();
      }, 300));
    }

    const categorySelect = document.getElementById('expenseCategoryFilter');
    if (categorySelect) {
      categorySelect.addEventListener('change', async (e) => {
        this.state.categoryFilter = e.target.value;
        this.state.currentPage = 1;
        await this.loadExpenses();
      });
    }

    const sortSelect = document.getElementById('expenseSortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.state.sortBy = e.target.value;
        this.applyFilters();
      });
    }
  },

  bindCurrencyListeners() {
    const amtInput = document.getElementById('expAmount');
    const curSelect = document.getElementById('expCurrency');

    if (amtInput && curSelect) {
      const handler = Utils.debounce(() => this.updateLiveRatePreview(), 250);
      amtInput.addEventListener('input', handler);
      curSelect.addEventListener('change', () => this.updateLiveRatePreview());
    }
  },

  async updateLiveRatePreview() {
    const amtInput = document.getElementById('expAmount');
    const curSelect = document.getElementById('expCurrency');
    const previewEl = document.getElementById('expCurrencyPreview');
    if (!amtInput || !curSelect || !previewEl) return;

    const val = parseFloat(amtInput.value);
    const cur = curSelect.value || 'USD';

    if (!val || val <= 0) {
      previewEl.textContent = '';
      return;
    }

    if (cur === 'USD') {
      previewEl.textContent = `${Utils.formatCurrency(val, 'USD')} USD`;
      return;
    }

    try {
      previewEl.textContent = 'Fetching live market rate...';
      const data = await API.convertCurrency(val, cur);
      previewEl.textContent = `${Utils.formatCurrency(val, cur)} ≈ ${Utils.formatCurrency(data.usd_amount, 'USD')} USD (${data.rate_display})`;
    } catch (e) {
      previewEl.textContent = '';
    }
  },

  applyFilters() {
    let result = [...this.state.expenses];

    // Search query filter
    if (this.state.searchQuery) {
      const q = this.state.searchQuery.toLowerCase();
      result = result.filter(exp => 
        (exp.title && exp.title.toLowerCase().includes(q)) || 
        (exp.category && exp.category.toLowerCase().includes(q)) ||
        (exp.description && exp.description.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      const dateA = new Date(a.transaction_date || a.date);
      const dateB = new Date(b.transaction_date || b.date);
      if (this.state.sortBy === 'amount-high') return b.amount - a.amount;
      if (this.state.sortBy === 'amount-low') return a.amount - b.amount;
      if (this.state.sortBy === 'date-new') return dateB - dateA;
      if (this.state.sortBy === 'date-old') return dateA - dateB;
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

    tableBody.innerHTML = paginatedItems.map(item => {
      const isForeign = item.currency && item.currency !== 'USD' && item.original_amount;
      return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div class="card-icon-box card-icon-primary" style="width: 36px; height: 36px; font-size: 0.95rem;">
              <i class="fa-solid ${Utils.getCategoryIcon(item.category)}"></i>
            </div>
            <div>
              <div style="font-weight: 600;">${item.title}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${item.description || 'Completed'}</div>
            </div>
          </div>
        </td>
        <td><span class="category-badge">${item.category}</span></td>
        <td>${Utils.formatDate(item.transaction_date || item.date)}</td>
        <td style="font-weight: 700; color: var(--danger);">
          -${Utils.formatCurrency(item.amount, 'USD')}
          ${isForeign ? `<div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 500;">(${Utils.formatCurrency(item.original_amount, item.currency)})</div>` : ''}
        </td>
        <td><span class="status-badge status-completed">completed</span></td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-outline btn-sm btn-icon" onclick="ExpensesPage.openEditModal(${item.id})" title="Edit Expense">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn btn-outline btn-sm btn-icon" onclick="ExpensesPage.openDeleteModal(${item.id})" title="Delete Expense" style="color: var(--danger);">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
    }).join('');
  },

  renderPagination() {
    const container = document.getElementById('expensePagination');
    if (!container) return;

    const totalPages = Math.ceil(this.state.filteredExpenses.length / this.state.itemsPerPage);
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let html = `
      <button class="pagination-item" ${this.state.currentPage === 1 ? 'disabled' : ''} onclick="ExpensesPage.goToPage(${this.state.currentPage - 1})">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
    `;

    for (let i = 1; i <= totalPages; i++) {
      html += `
        <button class="pagination-item ${i === this.state.currentPage ? 'active' : ''}" onclick="ExpensesPage.goToPage(${i})">
          ${i}
        </button>
      `;
    }

    html += `
      <button class="pagination-item" ${this.state.currentPage === totalPages ? 'disabled' : ''} onclick="ExpensesPage.goToPage(${this.state.currentPage + 1})">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    `;

    container.innerHTML = html;
  },

  goToPage(page) {
    this.state.currentPage = page;
    this.renderTable();
    this.renderPagination();
  },

  bindModals() {
    const form = document.getElementById('expenseForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('expTitle').value.trim();
        const amount = document.getElementById('expAmount').value;
        const currency = document.getElementById('expCurrency') ? document.getElementById('expCurrency').value : 'INR';
        const category = document.getElementById('expCategory').value;
        const dateVal = document.getElementById('expDate').value;
        const submitBtn = form.querySelector('button[type="submit"]');

        if (!title || !amount || !category || !dateVal) {
          Utils.showToast('Please fill in all required fields.', 'warning');
          return;
        }

        const origBtnHtml = submitBtn.innerHTML;
        try {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

          const payload = {
            title,
            amount: parseFloat(amount),
            currency,
            category,
            transaction_date: dateVal
          };

          if (this.state.editingId) {
            await API.updateExpense(this.state.editingId, payload);
            Utils.showToast('Expense updated successfully!', 'success');
          } else {
            await API.createExpense(payload);
            Utils.showToast('Expense added successfully!', 'success');
          }

          this.closeModal('expenseModal');
          await this.loadExpenses();
        } catch (err) {
          Utils.showToast(err.message || 'Error saving expense entry.', 'danger');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origBtnHtml;
        }
      });
    }

    const confirmDeleteBtn = document.getElementById('confirmDeleteExpenseBtn');
    if (confirmDeleteBtn) {
      confirmDeleteBtn.onclick = async () => {
        if (this.state.deletingId) {
          const targetId = this.state.deletingId;
          try {
            confirmDeleteBtn.disabled = true;
            await API.deleteExpense(targetId);
            Utils.showToast('Expense record deleted.', 'info');
            this.state.deletingId = null;
            this.closeModal('deleteModal');
            await this.loadExpenses();
          } catch (err) {
            Utils.showToast(err.message || 'Failed to delete expense.', 'danger');
          } finally {
            confirmDeleteBtn.disabled = false;
          }
        }
      };
    }
  },

  async handleOcrUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const initialEl = document.getElementById('expOcrInitialState');
    const scanningEl = document.getElementById('expOcrScanningState');

    try {
      if (initialEl) initialEl.style.display = 'none';
      if (scanningEl) scanningEl.style.display = 'flex';
      Utils.showToast('Scanning receipt image with Tesseract OCR...', 'info');

      const result = await API.scanReceipt(file);

      if (result.title) {
        document.getElementById('expTitle').value = result.title;
      }
      if (result.amount !== null && result.amount !== undefined) {
        document.getElementById('expAmount').value = result.amount;
      }
      if (result.currency) {
        const curSelect = document.getElementById('expCurrency');
        if (curSelect) {
          curSelect.value = result.currency.toUpperCase();
        }
      }
      if (result.transaction_date) {
        document.getElementById('expDate').value = result.transaction_date;
      }
      if (result.category) {
        const catSelect = document.getElementById('expCategory');
        if (catSelect) {
          const matchingOption = Array.from(catSelect.options).find(opt => opt.value.toLowerCase() === result.category.toLowerCase());
          if (matchingOption) {
            catSelect.value = matchingOption.value;
          }
        }
      }

      this.updateLiveRatePreview();
      Utils.showToast(result.message || 'Receipt scanned successfully! Review details before saving.', 'success');
    } catch (e) {
      console.error('OCR Upload error:', e);
      Utils.showToast(e.message || 'Failed to scan receipt. Please enter details manually.', 'danger');
    } finally {
      if (initialEl) initialEl.style.display = 'flex';
      if (scanningEl) scanningEl.style.display = 'none';
      event.target.value = '';
    }
  },

  openAddModal() {
    this.state.editingId = null;
    document.getElementById('expenseModalTitle').textContent = 'Add New Expense';
    document.getElementById('expenseForm').reset();
    document.getElementById('expCurrency').value = 'INR';
    document.getElementById('expDate').value = new Date().toISOString().split('T')[0];
    const previewEl = document.getElementById('expCurrencyPreview');
    if (previewEl) previewEl.textContent = '';
    this.showModal('expenseModal');
  },

  openEditModal(id) {
    const expense = this.state.expenses.find(item => item.id == id);
    if (!expense) return;

    this.state.editingId = id;
    document.getElementById('expenseModalTitle').textContent = 'Edit Expense';
    document.getElementById('expTitle').value = expense.title;
    
    if (expense.currency && expense.original_amount) {
      document.getElementById('expCurrency').value = expense.currency;
      document.getElementById('expAmount').value = expense.original_amount;
    } else {
      document.getElementById('expCurrency').value = expense.currency || 'USD';
      document.getElementById('expAmount').value = expense.amount;
    }

    document.getElementById('expCategory').value = expense.category;
    document.getElementById('expDate').value = expense.transaction_date || expense.date;

    this.updateLiveRatePreview();
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
