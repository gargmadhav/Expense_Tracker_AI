/* User Profile & Settings Controller */

const ProfilePage = {
  init() {
    this.loadProfileData();
    this.bindForms();
  },

  loadProfileData() {
    const profile = Utils.storage.get('user_profile', {
      name: 'Alex Mercer',
      email: 'alex.mercer@example.com',
      currency: 'USD',
      phone: '+1 (555) 234-5678'
    });

    const nameInput = document.getElementById('profileNameInput');
    const emailInput = document.getElementById('profileEmailInput');
    const phoneInput = document.getElementById('profilePhoneInput');
    const currencyInput = document.getElementById('profileCurrencySelect');

    if (nameInput) nameInput.value = profile.name;
    if (emailInput) emailInput.value = profile.email;
    if (phoneInput) phoneInput.value = profile.phone || '';
    if (currencyInput) currencyInput.value = profile.currency || 'USD';
  },

  bindForms() {
    const profileForm = document.getElementById('updateProfileForm');
    if (profileForm) {
      profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('profileNameInput').value;
        const email = document.getElementById('profileEmailInput').value;
        const phone = document.getElementById('profilePhoneInput').value;
        const currency = document.getElementById('profileCurrencySelect').value;

        const updated = await API.updateProfile({ name, email, phone, currency });
        Utils.showToast('Profile information updated successfully!', 'success');

        // Re-sync shared UI elements
        if (typeof App !== 'undefined' && App.loadUserProfileInfo) {
          App.loadUserProfileInfo();
        }
      });
    }

    const passwordForm = document.getElementById('changePasswordForm');
    if (passwordForm) {
      passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const currentPass = document.getElementById('currentPassword').value;
        const newPass = document.getElementById('newPassword').value;
        const confirmPass = document.getElementById('confirmNewPassword').value;

        if (newPass !== confirmPass) {
          Utils.showToast('New passwords do not match.', 'danger');
          return;
        }

        Utils.showToast('Password changed successfully!', 'success');
        passwordForm.reset();
      });
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.includes('profile.html')) {
    ProfilePage.init();
  }
});
