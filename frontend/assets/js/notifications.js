/* Notifications Page Controller */

const NotificationsPage = {
  state: {
    notifications: [],
    currentFilter: 'all'
  },

  async init() {
    this.bindFilters();
    await this.loadNotifications();
  },

  async loadNotifications() {
    try {
      this.state.notifications = await API.getNotifications();
      this.renderList();
    } catch (e) {
      console.error(e);
      Utils.showToast(e.message || 'Failed to load notifications', 'danger');
    }
  },

  renderList() {
    const container = document.getElementById('notificationsFeedList');
    if (!container) return;

    let items = [...this.state.notifications];
    if (this.state.currentFilter !== 'all') {
      items = items.filter(n => n.type === this.state.currentFilter);
    }

    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-bell-slash empty-state-icon"></i>
          <div class="empty-state-title">No Notifications</div>
          <div class="empty-state-text">You are all caught up! No recent notifications found.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map(n => `
      <div class="card" style="margin-bottom: 1rem; ${!n.read ? 'border-left: 4px solid var(--primary);' : ''}">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;">
          <div style="display: flex; align-items: flex-start; gap: 1rem;">
            <div class="card-icon-box card-icon-${n.type === 'warning' ? 'warning' : n.type === 'success' ? 'success' : 'info'}">
              <i class="fa-solid ${n.type === 'warning' ? 'fa-triangle-exclamation' : n.type === 'success' ? 'fa-circle-check' : 'fa-circle-info'}"></i>
            </div>
            <div>
              <h4 style="font-size: 1rem; font-weight: 700;">${n.title}</h4>
              <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0.25rem 0;">${n.message}</p>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${n.time}</div>
            </div>
          </div>
          ${!n.read ? `
            <button class="btn btn-outline btn-sm" onclick="NotificationsPage.markAsRead(${n.id})">
              Mark Read
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');
  },

  bindFilters() {
    const tabs = document.querySelectorAll('.notif-filter-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.state.currentFilter = tab.dataset.filter;
        this.renderList();
      });
    });
  },

  async markAsRead(id) {
    try {
      await API.markNotificationRead(id);
      Utils.showToast('Notification marked as read', 'info');
      await this.loadNotifications();
    } catch (e) {
      Utils.showToast(e.message || 'Failed to update notification', 'danger');
    }
  },

  async markAllAsRead() {
    try {
      await API.markAllNotificationsRead();
      Utils.showToast('All notifications marked as read', 'success');
      await this.loadNotifications();
    } catch (e) {
      Utils.showToast(e.message || 'Failed to update notifications', 'danger');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('notifications.html')) {
    NotificationsPage.init();
  }
});
