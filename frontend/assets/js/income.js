/* Income Management Controller */

const IncomePage = {
  state: {
    incomeList: [],
    editingId: null,
    deletingId: null
  },

  async init() {
    this.bindForm();
    this.bindCurrencyListeners();
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
      Utils.showToast(e.message || 'Error loading income history', 'danger');
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
          <td><div class="skeleton" style="height: 20px; width: 60px;"></div></td>
        </tr>
      `).join('');
    }
  },

  renderTotalSummary() {
    const total = (this.state.incomeList || []).reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
    const totalEl = document.getElementById('incomeTotalVal');
    if (totalEl) totalEl.textContent = Utils.formatCurrency(total, 'USD');
  },

  bindCurrencyListeners() {
    const amtInput = document.getElementById('incAmount');
    const curSelect = document.getElementById('incCurrency');

    if (amtInput && curSelect) {
      const handler = Utils.debounce(() => this.updateLiveRatePreview(), 250);
      amtInput.addEventListener('input', handler);
      curSelect.addEventListener('change', () => this.updateLiveRatePreview());
    }
  },

  async updateLiveRatePreview() {
    const amtInput = document.getElementById('incAmount');
    const curSelect = document.getElementById('incCurrency');
    const previewEl = document.getElementById('incCurrencyPreview');
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

  renderTable() {
    const tbody = document.getElementById('incomeTableBody');
    if (!tbody) return;

    if (!this.state.incomeList || this.state.incomeList.length === 0) {
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

    tbody.innerHTML = this.state.incomeList.map(item => {
      const isForeign = item.currency && item.currency !== 'USD' && item.original_amount;
      return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div class="card-icon-box card-icon-success" style="width: 36px; height: 36px; font-size: 0.95rem;">
              <i class="fa-solid ${Utils.getCategoryIcon(item.source)}"></i>
            </div>
            <div>
              <div style="font-weight: 600;">${item.source}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${item.description || ''}</div>
            </div>
          </div>
        </td>
        <td><span class="category-badge">${item.source}</span></td>
        <td>${Utils.formatDate(item.transaction_date || item.date)}</td>
        <td style="font-weight: 700; color: var(--success);">
          +${Utils.formatCurrency(item.amount, 'USD')}
          ${isForeign ? `<div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 500;">(${Utils.formatCurrency(item.original_amount, item.currency)})</div>` : ''}
        </td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-outline btn-sm btn-icon" onclick="IncomePage.openEditModal(${item.id})" title="Edit Income">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn btn-outline btn-sm btn-icon" onclick="IncomePage.openDeleteModal(${item.id})" title="Delete Income" style="color: var(--danger);">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
    }).join('');
  },

  bindForm() {
    const form = document.getElementById('incomeForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const source = document.getElementById('incSource').value.trim();
        const amount = document.getElementById('incAmount').value;
        const currency = document.getElementById('incCurrency') ? document.getElementById('incCurrency').value : 'INR';
        const dateVal = document.getElementById('incDate').value;
        const descriptionEl = document.getElementById('incDescription');
        const description = descriptionEl ? descriptionEl.value.trim() : '';
        const submitBtn = form.querySelector('button[type="submit"]');

        if (!source || !amount || !dateVal) {
          Utils.showToast('Please fill in required fields.', 'warning');
          return;
        }

        const origBtnHtml = submitBtn.innerHTML;
        try {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

          const payload = {
            source,
            amount: parseFloat(amount),
            currency,
            transaction_date: dateVal,
            description
          };

          if (this.state.editingId) {
            await API.updateIncome(this.state.editingId, payload);
            Utils.showToast('Income entry updated successfully!', 'success');
          } else {
            await API.createIncome(payload);
            Utils.showToast('Income entry created successfully!', 'success');
          }

          this.closeModal('incomeModal');
          await this.loadIncome();
        } catch (err) {
          Utils.showToast(err.message || 'Failed to save income entry.', 'danger');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origBtnHtml;
        }
      });
    }

    const confirmDeleteBtn = document.getElementById('confirmDeleteIncomeBtn');
    if (confirmDeleteBtn) {
      confirmDeleteBtn.onclick = async () => {
        if (this.state.deletingId) {
          const targetId = this.state.deletingId;
          try {
            confirmDeleteBtn.disabled = true;
            await API.deleteIncome(targetId);
            Utils.showToast('Income entry removed.', 'info');
            this.state.deletingId = null;
            this.closeModal('deleteIncomeModal');
            await this.loadIncome();
          } catch (err) {
            Utils.showToast(err.message || 'Failed to delete income.', 'danger');
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

    const initialEl = document.getElementById('incOcrInitialState');
    const scanningEl = document.getElementById('incOcrScanningState');

    try {
      if (initialEl) initialEl.style.display = 'none';
      if (scanningEl) scanningEl.style.display = 'flex';
      Utils.showToast('Scanning income document with Tesseract OCR...', 'info');

      const result = await API.scanReceipt(file);

      if (result.title) {
        document.getElementById('incSource').value = result.title;
      }
      if (result.amount !== null && result.amount !== undefined) {
        document.getElementById('incAmount').value = result.amount;
      }
      if (result.currency) {
        const curSelect = document.getElementById('incCurrency');
        if (curSelect) {
          curSelect.value = result.currency.toUpperCase();
        }
      }
      if (result.transaction_date) {
        document.getElementById('incDate').value = result.transaction_date;
      }
      if (result.category) {
        const catSelect = document.getElementById('incCategory');
        if (catSelect) {
          const matchingOption = Array.from(catSelect.options).find(opt => opt.value.toLowerCase() === result.category.toLowerCase());
          if (matchingOption) {
            catSelect.value = matchingOption.value;
          }
        }
      }

      this.updateLiveRatePreview();
      Utils.showToast(result.message || 'Document scanned successfully! Review details before saving.', 'success');
    } catch (e) {
      console.error('OCR Upload error:', e);
      Utils.showToast(e.message || 'Failed to scan document. Please enter details manually.', 'danger');
    } finally {
      if (initialEl) initialEl.style.display = 'flex';
      if (scanningEl) scanningEl.style.display = 'none';
      event.target.value = '';
    }
  },

  openAddModal() {
    this.state.editingId = null;
    const titleEl = document.getElementById('incomeModalTitle');
    if (titleEl) titleEl.textContent = 'Record Income Entry';
    document.getElementById('incomeForm').reset();
    document.getElementById('incCurrency').value = 'INR';
    document.getElementById('incDate').value = new Date().toISOString().split('T')[0];
    const previewEl = document.getElementById('incCurrencyPreview');
    if (previewEl) previewEl.textContent = '';
    this.showModal('incomeModal');
  },

  openEditModal(id) {
    const item = this.state.incomeList.find(inc => inc.id == id);
    if (!item) return;

    this.state.editingId = id;
    const titleEl = document.getElementById('incomeModalTitle');
    if (titleEl) titleEl.textContent = 'Edit Income Entry';

    document.getElementById('incSource').value = item.source;

    if (item.currency && item.original_amount) {
      document.getElementById('incCurrency').value = item.currency;
      document.getElementById('incAmount').value = item.original_amount;
    } else {
      document.getElementById('incCurrency').value = item.currency || 'USD';
      document.getElementById('incAmount').value = item.amount;
    }

    const catSelect = document.getElementById('incCategory');
    if (catSelect) {
      const opt = Array.from(catSelect.options).find(o => o.value.toLowerCase() === (item.source || '').toLowerCase());
      if (opt) catSelect.value = opt.value;
    }

    document.getElementById('incDate').value = item.transaction_date || item.date || new Date().toISOString().split('T')[0];
    if (document.getElementById('incDescription')) {
      document.getElementById('incDescription').value = item.description || '';
    }

    this.updateLiveRatePreview();
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
