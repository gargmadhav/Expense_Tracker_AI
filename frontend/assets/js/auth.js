/* Authentication & Session Handler */

const Auth = {
  init() {
    this.bindLogin();
    this.bindSignup();
    this.bindForgotPassword();
    this.checkSession();
  },

  checkSession() {
    const isAuthPage = window.location.pathname.includes('login.html') || 
                       window.location.pathname.includes('signup.html') || 
                       window.location.pathname.includes('forgot-password.html');
    
    const userToken = Utils.storage.get('auth_token');

    // Protect application routes
    if (!userToken && !isAuthPage) {
      window.location.href = 'login.html';
    } else if (userToken && isAuthPage) {
      window.location.href = 'dashboard.html';
    }
  },

  bindLogin() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;

      if (!email || !password) {
        Utils.showToast('Please enter your email and password.', 'warning');
        return;
      }

      // Simulate Authentication API call
      Utils.showToast('Signing in...', 'info');
      await API._delay(500);

      Utils.storage.set('auth_token', 'mock_jwt_token_xyz123');
      Utils.storage.set('user_profile', {
        name: 'Alex Mercer',
        email: email,
        currency: 'USD'
      });

      Utils.showToast('Login successful! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 800);
    });
  },

  bindSignup() {
    const signupForm = document.getElementById('signupForm');
    if (!signupForm) return;

    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signupName').value;
      const email = document.getElementById('signupEmail').value;
      const password = document.getElementById('signupPassword').value;
      const confirm = document.getElementById('signupConfirmPassword').value;

      if (password !== confirm) {
        Utils.showToast('Passwords do not match.', 'danger');
        return;
      }

      Utils.showToast('Creating your account...', 'info');
      await API._delay(600);

      Utils.storage.set('auth_token', 'mock_jwt_token_xyz123');
      Utils.storage.set('user_profile', { name, email, currency: 'USD' });

      Utils.showToast('Account created successfully!', 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 800);
    });
  },

  bindForgotPassword() {
    const forgotForm = document.getElementById('forgotPasswordForm');
    if (!forgotForm) return;

    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('resetEmail').value;

      if (!email) {
        Utils.showToast('Please enter your email address.', 'warning');
        return;
      }

      Utils.showToast('Sending password reset instructions...', 'info');
      await API._delay(600);

      Utils.showToast('Reset instructions sent to your email!', 'success');
    });
  },

  logout() {
    Utils.storage.remove('auth_token');
    Utils.showToast('Logged out successfully.', 'info');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 500);
  }
};

document.addEventListener('DOMContentLoaded', () => Auth.init());
