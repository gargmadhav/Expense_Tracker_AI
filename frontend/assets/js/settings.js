/* System & Application Settings Controller */

const SettingsPage = {
  init() {
    this.loadSettings();
    this.bindSettings();
  },

  loadSettings() {
    const savedTheme = Utils.storage.get('app_theme', 'light');
    const themeRadio = document.querySelector(`input[name="themeOption"][value="${savedTheme}"]`);
    if (themeRadio) themeRadio.checked = true;
  },

  bindSettings() {
    const themeRadios = document.querySelectorAll('input[name="themeOption"]');
    themeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const theme = e.target.value;
        document.documentElement.setAttribute('data-theme', theme);
        Utils.storage.set('app_theme', theme);
        Utils.showToast(`Theme updated to ${theme} mode`, 'success');
      });
    });

    const settingsForm = document.getElementById('appSettingsForm');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        Utils.showToast('Application preferences saved!', 'success');
      });
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('settings.html')) {
    SettingsPage.init();
  }
});
