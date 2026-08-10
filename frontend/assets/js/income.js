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
          <td><div class="skeleton" style="height: 20px; width: 50px;"></div></td>
        </tr>
      `).join('');
    }
  },

  renderTotalSummary() {
    const total = (this.state.incomeList || []).reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);
    const currency = Utils.storage.get('user_profile', {}).currency || 'USD';
    const totalEl = document.getElementById('incomeTotalVal');
    if (totalEl) totalEl.textContent = Utils.formatCurrency(total, currency);
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

    const currency = Utils.storage.get('user_profile', {}).currency || 'USD';

    tbody.innerHTML = this.state.incomeList.map(item => `
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
          +${Utils.formatCurrency(item.amount, currency)}
        </td>
        <td>
          <button class="btn btn-outline btn-sm btn-icon" onclick="IncomePage.openDeleteModal(${item.id})" title="Delete Income" style="color: var(--danger);">
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
        const source = document.getElementById('incSource').value.trim();
        const amount = document.getElementById('incAmount').value;
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

          await API.createIncome({
            source,
            amount: parseFloat(amount),
            transaction_date: dateVal,
            description
          });

          Utils.showToast('Income entry created successfully!', 'success');
          this.closeModal('incomeModal');
          await this.loadIncome();
        } catch (err) {
          Utils.showToast(err.message || 'Failed to create income entry.', 'danger');
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
