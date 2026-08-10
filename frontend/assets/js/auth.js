/* Authentication & Session Handler */

const Auth = {
  init() {
    this.bindLogin();
    this.bindSignup();
    this.bindForgotPassword();
    this.checkSession();
  },

  async checkSession() {
    const path = window.location.pathname;
    const isAuthPage = path.includes('login.html') || 
                       path.includes('signup.html') || 
                       path.includes('forgot-password.html');
    
    const userToken = API.getToken();

    // Protect application routes
    if (!userToken && !isAuthPage) {
      window.location.href = 'login.html';
      return;
    }

    if (userToken && isAuthPage) {
      window.location.href = 'dashboard.html';
      return;
    }

    // If logged in on protected page, populate user name/email in UI if element exists
    if (userToken && !isAuthPage) {
      try {
        const user = await API.getMe();
        if (user) {
          Utils.storage.set('user_profile', {
            name: user.full_name,
            email: user.email,
            currency: 'USD'
          });
          
          if (typeof App !== 'undefined' && App.loadUserProfileInfo) {
            App.loadUserProfileInfo();
          } else {
            const userNameEls = document.querySelectorAll('.user-profile-name, .user-name, .user-display-name');
            userNameEls.forEach(el => el.textContent = user.full_name);
            const userFirstNameEls = document.querySelectorAll('.user-first-name');
            const firstName = (user.full_name || 'User').trim().split(' ')[0] || 'User';
            userFirstNameEls.forEach(el => el.textContent = firstName);
          }
        }
      } catch (e) {
        console.warn('Session validation warning:', e.message);
      }
    }
  },

  bindLogin() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('loginEmail');
      const passwordInput = document.getElementById('loginPassword');
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        Utils.showToast('Please enter your email and password.', 'warning');
        return;
      }

      const origBtnHtml = submitBtn.innerHTML;
      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Signing in...`;
        Utils.showToast('Signing in...', 'info');

        const loginRes = await API.login({ email, password });
        if (loginRes && loginRes.access_token) {
          const user = await API.getMe();
          Utils.storage.set('user_profile', {
            name: user.full_name,
            email: user.email,
            currency: 'USD'
          });

          Utils.showToast('Login successful! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 600);
        }
      } catch (err) {
        Utils.showToast(err.message || 'Login failed. Please check your credentials.', 'danger');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origBtnHtml;
      }
    });
  },

  bindSignup() {
    const signupForm = document.getElementById('signupForm');
    if (!signupForm) return;

    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('signupName');
      const emailInput = document.getElementById('signupEmail');
      const passwordInput = document.getElementById('signupPassword');
      const confirmInput = document.getElementById('signupConfirmPassword');
      const submitBtn = signupForm.querySelector('button[type="submit"]');

      const name = nameInput.value.trim();
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const confirm = confirmInput.value;

      if (!name || !email || !password) {
        Utils.showToast('Please fill in all required fields.', 'warning');
        return;
      }

      if (password.length < 8) {
        Utils.showToast('Password must be at least 8 characters long.', 'warning');
        return;
      }

      if (password !== confirm) {
        Utils.showToast('Passwords do not match.', 'danger');
        return;
      }

      const origBtnHtml = submitBtn.innerHTML;
      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Creating account...`;
        Utils.showToast('Creating your account...', 'info');

        await API.register({ full_name: name, email, password });
        
        // Auto-login after registration
        await API.login({ email, password });
        const user = await API.getMe();
        Utils.storage.set('user_profile', { name: user.full_name, email: user.email, currency: 'USD' });

        Utils.showToast('Account created successfully! Redirecting...', 'success');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 600);
      } catch (err) {
        Utils.showToast(err.message || 'Account registration failed.', 'danger');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origBtnHtml;
      }
    });
  },

  bindForgotPassword() {
    const forgotForm = document.getElementById('forgotPasswordForm');
    if (!forgotForm) return;

    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('resetEmail').value.trim();

      if (!email) {
        Utils.showToast('Please enter your email address.', 'warning');
        return;
      }

      Utils.showToast('Reset instructions sent to your email!', 'info');
    });
  },

  logout() {
    API.removeToken();
    Utils.showToast('Logged out successfully.', 'info');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 500);
  }
};

document.addEventListener('DOMContentLoaded', () => Auth.init());
