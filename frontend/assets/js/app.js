/* App Main Layout & Shared Controllers */

const App = {
  init() {
    this.initTheme();
    this.bindSidebarToggle();
    this.bindUserDropdown();
    this.bindGlobalSearch();
    this.loadUserProfileInfo();
    this.highlightActiveNavItem();
  },

  // Initialize theme from localStorage
  initTheme() {
    const savedTheme = Utils.storage.get('app_theme', 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
      themeToggleBtn.innerHTML = savedTheme === 'dark' 
        ? '<i class="fa-solid fa-sun"></i>' 
        : '<i class="fa-solid fa-moon"></i>';
      
      themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        Utils.storage.set('app_theme', newTheme);
        themeToggleBtn.innerHTML = newTheme === 'dark' 
          ? '<i class="fa-solid fa-sun"></i>' 
          : '<i class="fa-solid fa-moon"></i>';
        Utils.showToast(`Switched to ${newTheme} mode`, 'info');
      });
    }
  },

  // Sidebar toggle for mobile drawer
  bindSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const overlay = document.getElementById('sidebarOverlay');

    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
      });
    }

    if (overlay) {
      overlay.addEventListener('click', () => {
        if (sidebar) sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    }
  },

  // Topbar User Menu Dropdown Toggle
  bindUserDropdown() {
    const trigger = document.getElementById('userMenuTrigger');
    const menu = document.getElementById('userDropdownMenu');

    if (trigger && menu) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('show');
      });

      document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && !trigger.contains(e.target)) {
          menu.classList.remove('show');
        }
      });
    }
  },

  // Header Global Search Filter (Directs or filters)
  bindGlobalSearch() {
    const searchInput = document.getElementById('globalSearchInput');
    if (!searchInput) return;

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          window.location.href = `expenses.html?search=${encodeURIComponent(query)}`;
        }
      }
    });
  },

  // Populate User Avatar and Profile text in top header & sidebar
  loadUserProfileInfo() {
    const profile = Utils.storage.get('user_profile', { name: 'Alex Mercer', email: 'alex.mercer@example.com' });
    const userNameElements = document.querySelectorAll('.user-display-name');
    const userRoleElements = document.querySelectorAll('.user-display-role');
    const userAvatarElements = document.querySelectorAll('.user-display-avatar');

    userNameElements.forEach(el => el.textContent = profile.name);
    userRoleElements.forEach(el => el.textContent = profile.email);
    userAvatarElements.forEach(el => {
      const initials = profile.name.split(' ').map(n => n[0]).join('').toUpperCase();
      el.textContent = initials || 'AM';
    });
  },

  // Highlight current active navigation page
  highlightActiveNavItem() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
      const href = item.getAttribute('href');
      if (href && (href === currentPath || (currentPath === 'index.html' && href === 'dashboard.html'))) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
