/**
 * UNI Events - Authentication Script
 * 
 * Handles user registration and login functionality
 * 
 * @version 1.0.0
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const registerAlert = document.querySelector('[data-register-alert]');
const loginAlert = document.querySelector('[data-login-alert]');

// ============================================================================
// PASSWORD TOGGLE FUNCTIONALITY
// ============================================================================

/**
 * Initializes password visibility toggle for password inputs
 */
function initializePasswordToggle() {
  // Register form password toggle
  const registerPasswordInput = document.getElementById('register-password');
  const registerPasswordToggle = document.getElementById('register-password-toggle');
  const registerPasswordWrapper = registerPasswordInput?.closest('.password-input-wrapper');

  if (registerPasswordToggle && registerPasswordInput && registerPasswordWrapper) {
    // Toggle password visibility
    registerPasswordToggle.addEventListener('click', () => {
      const isPassword = registerPasswordInput.type === 'password';
      if (isPassword) {
        // Show password
        registerPasswordInput.type = 'text';
        registerPasswordWrapper.classList.add('show-password');
        registerPasswordToggle.setAttribute('aria-label', 'Hide password');
      } else {
        // Hide password
        registerPasswordInput.type = 'password';
        registerPasswordWrapper.classList.remove('show-password');
        registerPasswordToggle.setAttribute('aria-label', 'Show password');
      }
    });

    // Show/hide toggle button based on input value
    registerPasswordInput.addEventListener('input', () => {
      if (registerPasswordInput.value.length > 0) {
        registerPasswordWrapper.classList.add('has-value');
      } else {
        registerPasswordWrapper.classList.remove('has-value');
      }
    });

    // Also check on focus/blur
    registerPasswordInput.addEventListener('focus', () => {
      if (registerPasswordInput.value.length > 0) {
        registerPasswordWrapper.classList.add('has-value');
      }
    });
  }

  // Login form password toggle
  const loginPasswordInput = document.getElementById('login-password');
  const loginPasswordToggle = document.getElementById('login-password-toggle');
  const loginPasswordWrapper = loginPasswordInput?.closest('.password-input-wrapper');

  if (loginPasswordToggle && loginPasswordInput && loginPasswordWrapper) {
    // Toggle password visibility
    loginPasswordToggle.addEventListener('click', () => {
      const isPassword = loginPasswordInput.type === 'password';
      if (isPassword) {
        // Show password
        loginPasswordInput.type = 'text';
        loginPasswordWrapper.classList.add('show-password');
        loginPasswordToggle.setAttribute('aria-label', 'Hide password');
      } else {
        // Hide password
        loginPasswordInput.type = 'password';
        loginPasswordWrapper.classList.remove('show-password');
        loginPasswordToggle.setAttribute('aria-label', 'Show password');
      }
    });

    // Show/hide toggle button based on input value
    loginPasswordInput.addEventListener('input', () => {
      if (loginPasswordInput.value.length > 0) {
        loginPasswordWrapper.classList.add('has-value');
      } else {
        loginPasswordWrapper.classList.remove('has-value');
      }
    });

    // Also check on focus/blur
    loginPasswordInput.addEventListener('focus', () => {
      if (loginPasswordInput.value.length > 0) {
        loginPasswordWrapper.classList.add('has-value');
      }
    });
  }
}

// Initialize password toggles when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePasswordToggle);
} else {
  initializePasswordToggle();
}

/**
 * Resolves the API base URL based on the current environment
 */
const resolveApiBase = () => {
  // Use window.API_BASE if already set by config.js
  if (typeof window.API_BASE !== 'undefined' && window.API_BASE) {
    return window.API_BASE;
  }
  
  // Check for window.API_BASE_URL (set in HTML or Netlify)
  if (typeof window.API_BASE_URL !== 'undefined' && window.API_BASE_URL) {
    return window.API_BASE_URL;
  }
  
  const origin = window.location.origin;
  const hostname = window.location.hostname;
  
  // If hosted on Netlify
  if (hostname.includes('netlify.app') || hostname.includes('netlify.com')) {
    console.warn('⚠️ API_BASE_URL not set for Netlify. Please set it in Netlify environment variables');
    return 'https://your-backend.railway.app'; // Placeholder - MUST be updated
  }
  
  if (origin.includes('5500') || origin.includes('127.0.0.1:5500')) {
    return 'http://localhost:4400';
  }
  return origin || 'http://localhost:4400';
};

const API_BASE = resolveApiBase();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Makes a POST request with JSON payload
 * @param {string} url - The API endpoint URL
 * @param {object} payload - The data to send
 * @returns {Promise<object>} The response data
 */
const postJSON = async (url, payload) => {
  const response = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
};

/**
 * Sets an alert message with the specified type
 * @param {HTMLElement} element - The alert element
 * @param {string} message - The message to display
 * @param {string} type - The alert type (info, success, error)
 */
const setAlert = (element, message, type = 'info') => {
  if (!element) return;
  element.textContent = message;
  element.dataset.state = type;
};

// ============================================================================
// REGISTRATION
// ============================================================================

/**
 * Handles user registration form submission
 */
registerForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(registerForm);
  
  // Check file size (max 5MB)
  const fileInput = registerForm.querySelector('input[type="file"]');
  if (fileInput.files[0]) {
    const fileSize = fileInput.files[0].size / 1024 / 1024; // Convert to MB
    if (fileSize > 5) {
      setAlert(registerAlert, 'File size must be less than 5MB', 'error');
      return;
    }
  }

  try {
    setAlert(registerAlert, 'Creating your account...', 'info');
    
    // Send as FormData for file upload
    const response = await fetch(`${API_BASE}/api/register`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Registration failed');
    }
    
    setAlert(registerAlert, result.message || 'Registration successful! Your account is pending verification.', 'success');
    registerForm.reset();
  } catch (error) {
    setAlert(registerAlert, error.message, 'error');
  }
});

// ============================================================================
// LOGIN
// ============================================================================

/**
 * Handles user login form submission
 */
loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    setAlert(loginAlert, 'Verifying your credentials...', 'info');
    const result = await postJSON('/api/login', payload);
    
    // Store user data in localStorage
    localStorage.setItem('user', JSON.stringify(result.user));
    localStorage.setItem('isLoggedIn', 'true');
    
    setAlert(loginAlert, `Welcome back, ${result.user.name}!`, 'success');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1200);
  } catch (error) {
    setAlert(loginAlert, error.message, 'error');
  }
});
