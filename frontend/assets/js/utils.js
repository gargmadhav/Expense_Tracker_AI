/* Utility Helpers and Utility Functions */

const Utils = {
  // Format numbers to currency format (e.g. $1,250.00 or ₹1,250.00)
  formatCurrency: (amount, currencyCode = 'USD') => {
    const symbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹', CAD: 'CA$' };
    const symbol = symbols[currencyCode] || '$';
    const num = parseFloat(amount || 0);
    return symbol + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  // Format dates nicely
  formatDate: (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  // Get fontawesome icon based on category name
  getCategoryIcon: (category) => {
    const icons = {
      'Housing': 'fa-house',
      'Rent': 'fa-building',
      'Food & Dining': 'fa-utensils',
      'Groceries': 'fa-cart-shopping',
      'Transportation': 'fa-car',
      'Utilities': 'fa-bolt',
      'Entertainment': 'fa-film',
      'Shopping': 'fa-bag-shopping',
      'Healthcare': 'fa-heart-pulse',
      'Salary': 'fa-briefcase',
      'Freelance': 'fa-laptop-code',
      'Investments': 'fa-chart-line',
      'Subscriptions': 'fa-credit-card',
      'Travel': 'fa-plane',
      'Education': 'fa-graduation-cap'
    };
    return icons[category] || 'fa-receipt';
  },

  // Get color code based on category
  getCategoryColor: (category) => {
    const colors = {
      'Housing': '#6366f1',
      'Food & Dining': '#ec4899',
      'Groceries': '#10b981',
      'Transportation': '#f59e0b',
      'Utilities': '#3b82f6',
      'Entertainment': '#8b5cf6',
      'Shopping': '#ef4444',
      'Healthcare': '#14b8a6',
      'Salary': '#10b981',
      'Freelance': '#6366f1',
      'Investments': '#3b82f6'
    };
    return colors[category] || '#64748b';
  },

  // Display toast message
  showToast: (message, type = 'info') => {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? 'fa-circle-check' :
                 type === 'danger' ? 'fa-circle-xmark' :
                 type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info';

    toast.innerHTML = `
      <i class="fa-solid ${icon}" style="font-size: 1.25rem;"></i>
      <span style="font-size: 0.9rem; font-weight: 500;">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  // Simple debounce function for input handlers
  debounce: (func, delay = 300) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, args), delay);
    };
  },

  // Reset all frontend data completely
  resetAllData: () => {
    localStorage.clear();
    Utils.showToast('All frontend data has been reset!', 'info');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 500);
  },

  // Safe localStorage helper
  storage: {
    get: (key, defaultValue = null) => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (e) {
        console.error('Error reading localStorage', e);
        return defaultValue;
      }
    },
    set: (key, value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error('Error setting localStorage', e);
      }
    },
    remove: (key) => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error('Error removing localStorage key', e);
      }
    }
  }
};
