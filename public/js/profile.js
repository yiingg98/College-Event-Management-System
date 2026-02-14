/**
 * UNI Events - Profile Page Script
 * 
 * Handles user profile display and event requests
 * 
 * @version 1.0.0
 */

/**
 * Update header navigation based on login state
 */
function updateHeaderAuth() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const loginBtn = document.getElementById('login-btn');
  const profileDropdown = document.getElementById('profile-dropdown');
  const profileName = document.getElementById('profile-name');
  const profileInitials = document.getElementById('profile-initials');
  const logoutBtn = document.getElementById('logout-btn');

  if (isLoggedIn && user.name) {
    // Hide login button, show profile dropdown
    if (loginBtn) loginBtn.classList.add('hidden');
    if (profileDropdown) profileDropdown.classList.remove('hidden');

    // Set profile info
    if (profileName) profileName.textContent = user.name;
    if (profileInitials) {
      const initials = user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      profileInitials.textContent = initials;
    }

    // Setup logout functionality
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');
        window.location.href = 'index.html';
      });
    }

    // Setup dropdown toggle
    const profileTrigger = document.getElementById('profile-trigger');
    const profileMenu = document.getElementById('profile-menu');

    if (profileTrigger && profileMenu) {
      profileTrigger.addEventListener('click', () => {
        profileMenu.classList.toggle('active');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!profileDropdown.contains(e.target)) {
          profileMenu.classList.remove('active');
        }
      });
    }
  } else {
    // Show login button, hide profile dropdown
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (profileDropdown) profileDropdown.classList.add('hidden');
  }
}

// Run on page load
document.addEventListener('DOMContentLoaded', updateHeaderAuth);

// Wrap in IIFE to avoid global scope conflicts
(function () {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  const API_BASE = (() => {
    if (typeof window.API_BASE !== 'undefined') {
      return window.API_BASE;
    }

    // Fallback: define our own if not set yet
    const getApiBase = () => {
      const origin = window.location.origin;
      const port = window.location.port;
      if (port && (port.startsWith('55') || port === '5500' || port === '5501' || port === '5502')) {
        return 'http://localhost:4400';
      } else if (origin.includes('5500') || origin.includes('127.0.0.1:5500')) {
        return 'http://localhost:4400';
      } else {
        return origin || 'http://localhost:4400';
      }
    };

    const base = getApiBase();
    window.API_BASE = base;
    return base;
  })();

  // ============================================================================
  // AUTHENTICATION CHECK
  // ============================================================================

  /**
   * Checks if user is logged in, redirects to login if not
   */
  function checkAuthentication() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userData = localStorage.getItem('user');

    if (!isLoggedIn || !userData) {
      // Redirect to login page
      window.location.href = 'auth.html?redirect=profile.html';
      return null;
    }

    try {
      return JSON.parse(userData);
    } catch (e) {
      console.error('Error parsing user data:', e);
      window.location.href = 'auth.html';
      return null;
    }
  }

  // ============================================================================
  // PROFILE DISPLAY
  // ============================================================================

  /**
   * Loads and displays user profile information
   */
  async function loadUserProfile() {
    const user = checkAuthentication();
    if (!user) return;

    // Update profile header
    const profileInitials = document.getElementById('profile-page-initials');
    const profileName = document.getElementById('profile-page-name');
    const profileEmail = document.getElementById('profile-page-email');
    const profileStatus = document.getElementById('profile-page-status');
    const profileJoinedDate = document.getElementById('profile-joined-date');
    const profileStatusValue = document.getElementById('profile-status-value');

    if (profileInitials) {
      const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      profileInitials.textContent = initials;
    }

    if (profileName) profileName.textContent = user.name;
    if (profileEmail) profileEmail.textContent = user.email;

    // Update status
    const isVerified = user.verified === true;
    if (profileStatus) {
      const statusBadge = profileStatus.querySelector('#status-badge');
      if (statusBadge) {
        if (isVerified) {
          statusBadge.textContent = 'Verified';
          statusBadge.className = 'status-badge status-badge--verified';
        } else {
          statusBadge.textContent = 'Pending Verification';
          statusBadge.className = 'status-badge status-badge--pending';
        }
      }
    }

    if (profileStatusValue) {
      profileStatusValue.textContent = isVerified ? 'Verified' : 'Pending Verification';
    }

    // Update joined date
    if (profileJoinedDate && user.createdAt) {
      const createdDate = new Date(user.createdAt);
      profileJoinedDate.textContent = createdDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    // Fetch fresh user data from server
    try {
      const response = await fetch(`${API_BASE}/api/user/${user.id}`);
      if (response.ok) {
        const freshUser = await response.json();
        localStorage.setItem('user', JSON.stringify(freshUser));
        // Update UI with fresh data
        if (freshUser.verified !== user.verified) {
          loadUserProfile(); // Reload to update status
        }
      }
    } catch (error) {
      console.error('Failed to fetch fresh user data:', error);
    }
  }

  // ============================================================================
  // EVENT REQUESTS
  // ============================================================================

  /**
   * Loads user's event requests
   */
  async function loadEventRequests() {
    const user = checkAuthentication();
    if (!user) return;

    const container = document.getElementById('event-requests-container');
    if (!container) return;

    try {
      container.innerHTML = '<div class="loading-state">Loading your event requests...</div>';

      // Fetch user's event requests
      // Build query parameters
      const params = new URLSearchParams();
      if (user.id) {
        params.append('userId', user.id);
      }
      if (user.email) {
        params.append('email', user.email);
      }

      const response = await fetch(`${API_BASE}/api/user/event-requests?${params.toString()}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to load event requests: ${response.status}`);
      }

      const requests = await response.json();

      if (!requests || requests.length === 0) {
        container.innerHTML = `
        <div class="empty-state">
          <p>You haven't requested any events yet.</p>
          <a href="events.html" class="btn btn-primary" style="margin-top: 1rem;">Request Your First Event</a>
        </div>
      `;
        return;
      }

      // Render event requests
      container.innerHTML = requests.map(request => {
        const statusClass = (request.status || request.STATUS || 'pending').toLowerCase() === 'approved' ? 'status-badge--verified' :
          (request.status || request.STATUS || 'pending').toLowerCase() === 'rejected' ? 'status-badge--rejected' :
            'status-badge--pending';
        const statusText = (request.status || request.STATUS || 'pending').toLowerCase() === 'approved' ? 'Approved' :
          (request.status || request.STATUS || 'pending').toLowerCase() === 'rejected' ? 'Rejected' :
            'Pending Review';

        // Safely convert description to string
        let descriptionStr = '';
        if (request.description) {
          if (typeof request.description === 'string') {
            descriptionStr = request.description;
          } else if (typeof request.description === 'object' && request.description !== null) {
            descriptionStr = request.description.toString ? request.description.toString() : '';
            if (descriptionStr === '[object Object]') {
              descriptionStr = '';
            }
          }
        }
        if (!descriptionStr) {
          descriptionStr = 'No description provided.';
        }

        // Handle date and time - check multiple field names
        let eventDate = '';
        let eventTime = '';

        // Check request_date or requestDate
        const requestDateValue = request.requestDate || request.request_date || request.REQUEST_DATE || request.date;
        if (requestDateValue) {
          try {
            const dateObj = requestDateValue instanceof Date ? requestDateValue : new Date(requestDateValue);
            if (!isNaN(dateObj.getTime())) {
              eventDate = dateObj.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });
            }
          } catch (e) {
            console.warn('Error parsing request date:', e);
          }
        }

        // Check request_time or requestTime
        eventTime = request.requestTime || request.request_time || request.REQUEST_TIME || request.time || 'TBD';

        // Format date/time display
        const dateTimeDisplay = eventDate && eventTime && eventTime !== 'TBD'
          ? `${eventDate} at ${eventTime}`
          : eventDate
            ? eventDate
            : eventTime && eventTime !== 'TBD'
              ? `Time: ${eventTime}`
              : 'Date & time TBD';

        const requestDate = new Date(request.createdAt || request.CREATED_AT || new Date());
        const formattedDate = requestDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });

        return `
        <div class="event-request-card">
          <div class="event-request-header">
            <div>
              <h3>${request.title || request.TITLE || 'Untitled Request'}</h3>
              ${(request.subtitle || request.SUBTITLE) ? `<p class="event-request-subtitle">${request.subtitle || request.SUBTITLE}</p>` : ''}
            </div>
            <span class="status-badge ${statusClass}">${statusText}</span>
          </div>
          <div class="event-request-body">
            <p class="event-request-description">${descriptionStr}</p>
            <div class="event-request-meta">
              <div class="meta-item">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0ZM8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8C14 11.3137 11.3137 14 8 14Z" fill="currentColor"/>
                  <path d="M8 4V8L11 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span>${dateTimeDisplay}</span>
              </div>
              <div class="meta-item">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 8C9.10457 8 10 7.10457 10 6C10 4.89543 9.10457 4 8 4C6.89543 4 6 4.89543 6 6C6 7.10457 6.89543 8 8 8Z" fill="currentColor"/>
                  <path d="M8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0ZM8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8C14 11.3137 11.3137 14 8 14Z" fill="currentColor"/>
                </svg>
                <span>${request.location || request.LOCATION || 'Location TBD'}</span>
              </div>
              <div class="meta-item">
                <span>Category: ${request.category || request.CATEGORY || 'General'}</span>
              </div>
            </div>
            <div class="event-request-footer">
              <span class="event-request-date">Requested on ${formattedDate}</span>
              ${(request.status || request.STATUS || '').toLowerCase() === 'approved' && (request.eventId || request.event_id || request.EVENT_ID) ?
            `<a href="event-details.html?id=${request.eventId || request.event_id || request.EVENT_ID}" class="btn btn-primary btn-sm">View Event</a>` :
            ''
          }
            </div>
          </div>
        </div>
      `;
      }).join('');
    } catch (error) {
      console.error('Error loading event requests:', error);
      container.innerHTML = `
      <div class="error-state">
        <p>Failed to load your event requests. Please try again later.</p>
      </div>
    `;
    }
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    loadUserProfile();
    loadEventRequests();

    // Check auth state for header (function from script.js)
    if (typeof checkAuthState === 'function') {
      checkAuthState();
    } else {
      // Fallback if script.js hasn't loaded yet
      setTimeout(() => {
        if (typeof checkAuthState === 'function') {
          checkAuthState();
        }
      }, 100);
    }
  });

})(); // End IIFE

