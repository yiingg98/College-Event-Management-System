/**
 * UNI Events - Admin Panel Script
 * 
 * Handles admin authentication, user management, and event management
 * 
 * @version 1.0.0
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

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
  const port = window.location.port;
  const hostname = window.location.hostname;
  
  // If hosted on Netlify
  if (hostname.includes('netlify.app') || hostname.includes('netlify.com')) {
    return 'https://your-backend.railway.app'; // Placeholder - MUST be updated
  }
  
  // If using Live Server (port 5500, 5501, 5502, etc.) or file protocol
  if (port && (port.startsWith('55') || port === '5500' || port === '5501' || port === '5502')) {
    return 'http://localhost:4400';
  }
  if (origin.includes('5500') || origin.includes('127.0.0.1:5500') || origin === 'file://' || !origin) {
    return 'http://localhost:4400';
  }
  // If already on the server port, use same origin
  if (port === '4400') {
    return origin;
  }
  // Default to server port
  return 'http://localhost:4400';
};

const API_BASE = resolveApiBase();

// ============================================================================
// ADMIN AUTHENTICATION
// ============================================================================

/**
 * Checks if admin is logged in and updates UI accordingly
 * @param {boolean} skipAutoLogin - If true, always show login form (for initial page load)
 * @returns {boolean} True if admin is logged in, false otherwise
 */
function checkAdminAuth(skipAutoLogin = false) {
  const adminHeaderActions = document.getElementById('admin-header-actions');
  
  // On initial page load, always show login form
  if (skipAutoLogin) {
    document.getElementById('admin-dashboard').style.display = 'none';
    document.getElementById('admin-login').style.display = 'block';
    // Hide header actions (Admin name and Logout button) on login page
    if (adminHeaderActions) {
      adminHeaderActions.style.display = 'none';
    }
    return false;
  }
  
  const adminData = localStorage.getItem('admin');
  const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn') === 'true';
  const loginTimestamp = localStorage.getItem('adminLoginTimestamp');
  
  // Check if session is still valid (within last 8 hours)
  const SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
  const now = Date.now();
  const sessionValid = loginTimestamp && (now - parseInt(loginTimestamp)) < SESSION_DURATION;
  
  if (isAdminLoggedIn && adminData && sessionValid) {
    const admin = JSON.parse(adminData);
    document.getElementById('admin-name').textContent = admin.name;
    document.getElementById('admin-dashboard').style.display = 'block';
    document.getElementById('admin-login').style.display = 'none';
    // Show header actions when logged in
    if (adminHeaderActions) {
      adminHeaderActions.style.display = 'flex';
    }
    loadUsers();
    loadEvents();
    loadEventRequests();
    loadContactRequests();
    return true;
  } else {
    // Clear invalid or expired session
    if (!sessionValid) {
      localStorage.removeItem('admin');
      localStorage.removeItem('isAdminLoggedIn');
      localStorage.removeItem('adminLoginTimestamp');
    }
    document.getElementById('admin-dashboard').style.display = 'none';
    document.getElementById('admin-login').style.display = 'block';
    // Hide header actions on login page
    if (adminHeaderActions) {
      adminHeaderActions.style.display = 'none';
    }
    return false;
  }
}

/**
 * Handles admin login form submission
 */
document.getElementById('admin-login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const payload = Object.fromEntries(formData.entries());
  const alert = document.querySelector('[data-admin-alert]');

  try {
    alert.textContent = 'Logging in...';
    alert.dataset.state = 'info';

    const response = await fetch(`${API_BASE}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type') || '';
    let result;
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response received. First 300 chars:', text.substring(0, 300));
      throw new Error(`Server error: Received HTML instead of JSON. Status: ${response.status}. Please check: 1) Server is running on port 4400, 2) API endpoint exists, 3) No CORS issues.`);
    }
    
    result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Login failed');
    }

    localStorage.setItem('admin', JSON.stringify(result.admin));
    localStorage.setItem('isAdminLoggedIn', 'true');
    localStorage.setItem('adminLoginTimestamp', Date.now().toString());
    
    alert.textContent = 'Login successful!';
    alert.dataset.state = 'success';
    
    setTimeout(() => {
      checkAdminAuth(); // This will show the header actions and dashboard
    }, 500);
  } catch (error) {
    alert.textContent = error.message;
    alert.dataset.state = 'error';
  }
});

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * Loads all users from the server and renders them
 */
async function loadUsers() {
  try {
    const response = await fetch(`${API_BASE}/api/admin/users`);
    if (!response.ok) throw new Error('Failed to load users');
    
    const users = await response.json();
    renderUsers(users);
    updateStats(users);
    return users;
  } catch (error) {
    console.error('Error loading users:', error);
    const tbody = document.getElementById('users-table-body');
    if (tbody) {
      tbody.innerHTML = 
        '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: #ff8a8a;">Failed to load users</td></tr>';
    }
    throw error;
  }
}

/**
 * Renders users in the admin table
 * @param {Array} users - Array of user objects
 */
function renderUsers(users) {
  const tbody = document.getElementById('users-table-body');
  
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No users found</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(user => `
    <tr>
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>
        <span class="${user.verified ? 'profile-info-value--verified' : 'profile-info-value--unverified'}">
          ${user.verified ? 'Verified' : 'Pending'}
        </span>
      </td>
      <td>${new Date(user.createdAt).toLocaleDateString()}</td>
      <td>
        <div class="user-actions">
          <button class="btn-icon" onclick="viewUser('${user.id}')" title="View Details">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 10C11.3807 10 12.5 8.88071 12.5 7.5C12.5 6.11929 11.3807 5 10 5C8.61929 5 7.5 6.11929 7.5 7.5C7.5 8.88071 8.61929 10 10 10Z" fill="currentColor"/>
              <path d="M10 11.25C7.92893 11.25 6.25 12.9289 6.25 15V16.25H13.75V15C13.75 12.9289 12.0711 11.25 10 11.25Z" fill="currentColor"/>
            </svg>
          </button>
          ${!user.verified ? `
            <button class="btn-icon" onclick="verifyUser('${user.id}', true)" title="Verify User" style="color: #84f5c4;">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M16.667 5L7.5 14.167L3.333 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          ` : `
            <button class="btn-icon" onclick="verifyUser('${user.id}', false)" title="Unverify User" style="color: #ffda60;">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          `}
        </div>
      </td>
    </tr>
  `).join('');
}

/**
 * Updates the statistics cards with user counts
 * @param {Array} users - Array of user objects
 */
function updateStats(users) {
  const total = users.length;
  const verified = users.filter(u => u.verified === true || u.verified === 1 || u.VERIFIED === 1).length;
  const pending = total - verified;

  document.getElementById('stat-total-users').textContent = total;
  document.getElementById('stat-verified-users').textContent = verified;
  document.getElementById('stat-pending-users').textContent = pending;
  
  // Update event and request stats
  updateEventStats();
  updateRequestStats();
}

/**
 * Updates event statistics
 */
async function updateEventStats() {
  try {
    const response = await fetch(`${API_BASE}/api/events`);
    if (response.ok) {
      const events = await response.json();
      const totalEvents = events.length;
      const ongoingEvents = events.filter(e => (e.status || e.STATUS || '').toLowerCase() === 'ongoing').length;
      
      const totalEl = document.getElementById('stat-total-events');
      const ongoingEl = document.getElementById('stat-ongoing-events');
      if (totalEl) totalEl.textContent = totalEvents;
      if (ongoingEl) ongoingEl.textContent = ongoingEvents;
    }
  } catch (error) {
    console.error('Error updating event stats:', error);
  }
}

/**
 * Updates request statistics
 */
async function updateRequestStats() {
  try {
    const response = await fetch(`${API_BASE}/api/admin/event-requests`);
    if (response.ok) {
      const requests = await response.json();
      const pendingRequests = requests.filter(r => (r.status || r.STATUS || '').toLowerCase() === 'pending').length;
      
      const pendingEl = document.getElementById('stat-pending-requests');
      if (pendingEl) pendingEl.textContent = pendingRequests;
    }
  } catch (error) {
    console.error('Error updating request stats:', error);
  }
}

/**
 * Views detailed information about a specific user
 * @param {string} userId - The user ID to view
 */
async function viewUser(userId) {
  try {
    const response = await fetch(`${API_BASE}/api/admin/users/${userId}`);
    if (!response.ok) throw new Error('Failed to load user');
    
    const user = await response.json();
    
    // Check if file exists
    const hasFile = !!(user.hasStudentIdFile || user.studentIdFileName);
    
    const modalBody = document.getElementById('user-modal-body');
    modalBody.innerHTML = `
      <div class="user-detail-item">
        <div class="user-detail-label">Name</div>
        <div class="user-detail-value">${user.name}</div>
      </div>
      <div class="user-detail-item">
        <div class="user-detail-label">Email</div>
        <div class="user-detail-value">${user.email}</div>
      </div>
      <div class="user-detail-item">
        <div class="user-detail-label">Verification Status</div>
        <div class="user-detail-value">
          <span class="${user.verified ? 'profile-info-value--verified' : 'profile-info-value--unverified'}">
            ${user.verified ? 'Verified' : 'Pending Verification'}
          </span>
        </div>
      </div>
      <div class="user-detail-item">
        <div class="user-detail-label">Registered</div>
        <div class="user-detail-value">${new Date(user.createdAt).toLocaleString()}</div>
      </div>
      ${hasFile ? `
        <div class="user-detail-item">
          <div class="user-detail-label">Student ID Document</div>
          <div class="user-detail-value">
            <a href="${API_BASE}/api/user/${user.id}/student-id" target="_blank" class="btn btn-primary btn-sm" style="display: inline-block; margin-top: 0.5rem;">
              View Document
            </a>
            ${user.studentIdFileMimeType && user.studentIdFileMimeType.startsWith('image/') ? `
              <img src="${API_BASE}/api/user/${user.id}/student-id" alt="Student ID" class="user-id-preview" style="max-width: 100%; margin-top: 1rem; border-radius: 8px;">
            ` : ''}
          </div>
        </div>
      ` : '<div class="user-detail-item"><div class="user-detail-label">Student ID Document</div><div class="user-detail-value" style="color: rgba(255,255,255,0.6);">No file uploaded</div></div>'}
      <div class="user-detail-item">
        <div class="user-detail-label">Actions</div>
        <div class="user-detail-value">
          <div style="display: flex; gap: 1rem; margin-top: 1rem;">
            ${!user.verified ? `
              <button class="btn btn-primary" onclick="verifyUser('${user.id}', true); closeUserModal();">
                Verify User
              </button>
            ` : `
              <button class="btn btn-outline" onclick="verifyUser('${user.id}', false); closeUserModal();">
                Unverify User
              </button>
            `}
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('user-modal').style.display = 'flex';
  } catch (error) {
    console.error('Error loading user:', error);
    alert('Failed to load user details');
  }
}

/**
 * Closes the user detail modal and refreshes user list
 */
function closeUserModal() {
  const modal = document.getElementById('user-modal');
  if (modal) {
    modal.style.display = 'none';
    // Reload users to ensure fresh data when modal is reopened
    loadUsers();
  }
}

/**
 * Verifies or unverifies a user
 * @param {string} userId - The user ID to verify/unverify
 * @param {boolean} verified - True to verify, false to unverify
 */
async function verifyUser(userId, verified) {
  try {
    // Show loading state
    const tbody = document.getElementById('users-table-body');
    const originalContent = tbody.innerHTML;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">Updating...</td></tr>';

    const response = await fetch(`${API_BASE}/api/admin/users/${userId}/verify`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verified })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to update user' }));
      throw new Error(errorData.error || 'Failed to update user');
    }

    const result = await response.json();
    
    // Close modal if open
    const userModal = document.getElementById('user-modal');
    if (userModal) {
      userModal.style.display = 'none';
    }
    
    // Reload users and wait for it to complete
    await loadUsers();
    
    // Show success message briefly
    const successMsg = document.createElement('div');
    successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #84f5c4; color: #000; padding: 1rem 1.5rem; border-radius: 8px; z-index: 10000; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
    successMsg.textContent = result.message || `User ${verified ? 'verified' : 'unverified'} successfully`;
    document.body.appendChild(successMsg);
    
    setTimeout(() => {
      successMsg.remove();
    }, 3000);
  } catch (error) {
    console.error('Error verifying user:', error);
    const errorMsg = document.createElement('div');
    errorMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #ff8a8a; color: #fff; padding: 1rem 1.5rem; border-radius: 8px; z-index: 10000; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
    errorMsg.textContent = error.message || 'Failed to update user verification status';
    document.body.appendChild(errorMsg);
    
    setTimeout(() => {
      errorMsg.remove();
    }, 3000);
    
    // Reload users to restore state
    loadUsers();
  }
}

// ============================================================================
// EVENT MANAGEMENT
// ============================================================================

/**
 * Loads all events from the server and renders them
 */
async function loadEvents() {
  try {
    const response = await fetch(`${API_BASE}/api/events`);
    if (!response.ok) throw new Error('Failed to load events');
    
    const events = await response.json();
    renderEvents(events);
    updateEventStats(); // Update stats when events are loaded
    return events;
  } catch (error) {
    console.error('Error loading events:', error);
    const tbody = document.getElementById('events-table-body');
    if (tbody) {
      tbody.innerHTML = 
        '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: #ff8a8a;">Failed to load events</td></tr>';
    }
    throw error;
  }
}

/**
 * Renders events in the admin table
 * @param {Array} events - Array of event objects
 */
function renderEvents(events) {
  const tbody = document.getElementById('events-table-body');
  
  if (events.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No events found</td></tr>';
    return;
  }

  tbody.innerHTML = events.map(event => {
    const isFree = event.isFree !== false;
    const status = (event.status || event.STATUS || 'upcoming').toLowerCase();
    const statusClass = status === 'upcoming' ? 'profile-info-value--verified' : 
                       status === 'ongoing' ? 'profile-info-value--verified' : 
                       status === 'past' ? 'profile-info-value--unverified' : 
                       'profile-info-value--unverified';
    const statusDisplay = status.charAt(0).toUpperCase() + status.slice(1);
    
    return `
      <tr>
        <td><strong>${event.title}</strong><br><small style="color: rgba(255,255,255,0.6);">${event.subtitle}</small></td>
        <td>
          <span class="${isFree ? 'profile-info-value--verified' : 'profile-info-value--unverified'}">
            ${isFree ? 'Free' : 'Paid'}
          </span>
        </td>
        <td>${isFree ? 'Rs. 0' : `Rs. ${event.price || 'N/A'}`}</td>
        <td>
          <span class="${statusClass}">
            ${statusDisplay}
          </span>
        </td>
        <td>
          <div class="user-actions">
            <button class="btn-icon" onclick="editEvent('${event.id}', ${isFree}, ${event.price || 0}, '${status}')" title="Edit Event">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M11 3H4C3.46957 3 2.96086 3.21071 2.58579 3.58579C2.21071 3.96086 2 4.46957 2 5V16C2 16.5304 2.21071 17.0391 2.58579 17.4142C2.96086 17.7893 3.46957 18 4 18H15C15.5304 18 16.0391 17.7893 16.4142 17.4142C16.7893 17.0391 17 16.5304 17 16V9M17 3L12 8M17 3H13M17 3V7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="btn-icon" onclick="openDeleteEventModal('${event.id}', '${(event.title || '').replace(/'/g, "\\'")}')" title="Delete Event" style="color: #ff8a8a;">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 5H5H17M15 5V16C15 16.5304 14.7893 17.0391 14.4142 17.4142C14.0391 17.7893 13.5304 18 13 18H7C6.46957 18 5.96086 17.7893 5.58579 17.4142C5.21071 17.0391 5 16.5304 5 16V5M7 5V3C7 2.46957 7.21071 1.96086 7.58579 1.58579C7.96086 1.21071 8.46957 1 9 1H11C11.5304 1 12.0391 1.21071 12.4142 1.58579C12.7893 1.96086 13 2.46957 13 3V5M8 9V14M12 9V14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Opens the edit event modal
 * @param {string} eventId - The event ID to edit
 * @param {boolean} isFree - Whether the event is currently free
 * @param {number} price - The current event price
 */
/**
 * Opens the delete event confirmation modal
 * @param {string} eventId - The event ID to delete
 * @param {string} eventTitle - The event title to display
 */
function openDeleteEventModal(eventId, eventTitle) {
  const modal = document.getElementById('delete-event-modal');
  const eventNameDisplay = document.getElementById('delete-event-name');
  
  if (!modal) {
    console.error('Delete event modal not found');
    return;
  }
  
  modal.dataset.eventId = eventId;
  if (eventNameDisplay) {
    eventNameDisplay.textContent = `"${eventTitle}"`;
  }
  
  modal.style.display = 'flex';
}

/**
 * Deletes an event
 * @param {string} eventId - The event ID to delete
 */
async function deleteEvent(eventId) {
  try {
    const response = await fetch(`${API_BASE}/api/admin/events/${eventId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to delete event' }));
      throw new Error(errorData.error || 'Failed to delete event');
    }

    const result = await response.json();
    
    // Close modal
    const modal = document.getElementById('delete-event-modal');
    if (modal) modal.style.display = 'none';
    
    // Reload events
    await loadEvents();
    
    // Show success message
    const successMsg = document.createElement('div');
    successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #84f5c4; color: #000; padding: 1rem 1.5rem; border-radius: 8px; z-index: 10000; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
    successMsg.textContent = result.message || 'Event deleted successfully';
    document.body.appendChild(successMsg);
    
    setTimeout(() => {
      successMsg.remove();
    }, 3000);
  } catch (error) {
    console.error('Error deleting event:', error);
    const errorMsg = document.createElement('div');
    errorMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #ff8a8a; color: #fff; padding: 1rem 1.5rem; border-radius: 8px; z-index: 10000; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
    errorMsg.textContent = error.message || 'Failed to delete event';
    document.body.appendChild(errorMsg);
    
    setTimeout(() => {
      errorMsg.remove();
    }, 3000);
  }
}

function editEvent(eventId, isFree, price, status) {
  const modal = document.getElementById('edit-event-modal');
  const form = document.getElementById('edit-event-form');
  const priceField = document.getElementById('edit-price-field');
  const priceInput = document.getElementById('edit-price');
  const statusSelect = document.getElementById('edit-status');
  
  // Store event ID
  form.dataset.eventId = eventId;
  
  // Set initial values
  if (isFree) {
    document.getElementById('edit-is-free-true').checked = true;
    priceField.style.display = 'none';
    priceInput.required = false;
  } else {
    document.getElementById('edit-is-free-false').checked = true;
    priceField.style.display = 'block';
    priceInput.required = true;
  }
  priceInput.value = price || 0;
  
  // Set status
  if (statusSelect && status) {
    statusSelect.value = status;
  } else if (statusSelect) {
    statusSelect.value = 'upcoming'; // Default
  }
  
  // Show/hide price field based on event type
  const freeRadios = form.querySelectorAll('input[name="isFree"]');
  freeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'false') {
        priceField.style.display = 'block';
        priceInput.required = true;
      } else {
        priceField.style.display = 'none';
        priceInput.required = false;
        priceInput.value = '0';
      }
    });
  });
  
  modal.style.display = 'flex';
}

// ============================================================================
// MODAL HANDLERS
// ============================================================================

// Close user modal handlers
document.getElementById('close-user-modal')?.addEventListener('click', closeUserModal);
document.getElementById('user-modal')?.addEventListener('click', (e) => {
  if (e.target.id === 'user-modal') {
    closeUserModal();
  }
});

// ============================================================================
// LOGOUT
// ============================================================================

/**
 * Handles admin logout
 */
document.getElementById('logout-admin-btn')?.addEventListener('click', () => {
  localStorage.removeItem('admin');
  localStorage.removeItem('isAdminLoggedIn');
  localStorage.removeItem('adminLoginTimestamp');
  checkAdminAuth();
});

// ============================================================================
// INITIALIZATION
// ============================================================================

// ============================================================================
// EVENT REQUESTS MANAGEMENT
// ============================================================================

/**
 * Loads all event requests from the server and renders them
 */
async function loadEventRequests() {
  try {
    const response = await fetch(`${API_BASE}/api/admin/event-requests`);
    if (!response.ok) throw new Error('Failed to load event requests');
    
    const requests = await response.json();
    renderEventRequests(requests);
    updateRequestStats(); // Update stats when requests are loaded
    return requests;
  } catch (error) {
    console.error('Error loading event requests:', error);
    const tbody = document.getElementById('event-requests-table-body');
    if (tbody) {
      tbody.innerHTML = 
        '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #ff8a8a;">Failed to load event requests</td></tr>';
    }
    throw error;
  }
}

/**
 * Loads contact requests from the server
 */
async function loadContactRequests() {
  try {
    const response = await fetch(`${API_BASE}/api/admin/contact-requests`);
    if (!response.ok) throw new Error('Failed to load contact requests');
    
    const requests = await response.json();
    
    
    renderContactRequests(requests);
    return requests;
  } catch (error) {
    console.error('Error loading contact requests:', error);
    const tbody = document.getElementById('contact-requests-table-body');
    if (tbody) {
      tbody.innerHTML = 
        '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #ff8a8a;">Failed to load contact requests</td></tr>';
    }
    throw error;
  }
}

/**
 * Renders contact requests to the table
 */
function renderContactRequests(requests) {
  const tbody = document.getElementById('contact-requests-table-body');
  
  if (requests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No contact requests yet</td></tr>';
    return;
  }
  
  tbody.innerHTML = requests.map(request => {
    const status = (request.status || request.STATUS || 'new').toLowerCase();
    const statusClass = status === 'new' ? 'status-new' : status === 'read' ? 'status-read' : status === 'replied' ? 'status-approved' : 'status-rejected';
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    
    const createdAt = request.createdAt || request.CREATED_AT || new Date();
    const date = new Date(createdAt);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Safely convert message to string
    let message = '';
    if (request.message || request.MESSAGE) {
      const msgValue = request.message || request.MESSAGE;
      if (typeof msgValue === 'string') {
        message = msgValue;
      } else if (typeof msgValue === 'object' && msgValue !== null) {
        message = msgValue.toString ? msgValue.toString() : String(msgValue);
        if (message === '[object Object]') {
          message = '';
        }
      } else {
        message = String(msgValue);
        if (message === '[object Object]') {
          message = '';
        }
      }
    }
    const messagePreview = message.length > 100 ? message.substring(0, 100) + '...' : message;
    
    return `
      <tr>
        <td>${request.name || request.NAME || 'N/A'}</td>
        <td>${request.email || request.EMAIL || 'N/A'}</td>
        <td>${request.subject || request.SUBJECT || 'No subject'}</td>
        <td title="${message.replace(/"/g, '&quot;')}">${messagePreview}</td>
        <td>${formattedDate}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>
          <button class="btn-icon" onclick="viewContactRequest('${request.id || request.ID}')" title="View Details">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 3C5.23858 3 3 5.23858 3 8C3 10.7614 5.23858 13 8 13C10.7614 13 13 10.7614 13 8C13 5.23858 10.7614 3 8 3ZM8 11.5C6.067 11.5 4.5 9.933 4.5 8C4.5 6.067 6.067 4.5 8 4.5C9.933 4.5 11.5 6.067 11.5 8C11.5 9.933 9.933 11.5 8 11.5Z" fill="currentColor"/>
              <path d="M8 6C7.44772 6 7 6.44772 7 7C7 7.55228 7.44772 8 8 8C8.55228 8 9 7.55228 9 7C9 6.44772 8.55228 6 8 6Z" fill="currentColor"/>
            </svg>
          </button>
          ${status === 'new' ? `
            <button class="btn-icon" onclick="markContactRequestAsRead('${request.id || request.ID}')" title="Mark as Read">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Views a contact request in a modal
 */
window.viewContactRequest = async function(requestId) {
  try {
    const requests = await loadContactRequests();
    const request = requests.find(r => (r.id || r.ID) === requestId);
    if (!request) {
      alert('Contact request not found');
      return;
    }
    
    // Safely convert message to string
    let message = '';
    if (request.message || request.MESSAGE) {
      const msgValue = request.message || request.MESSAGE;
      if (typeof msgValue === 'string') {
        message = msgValue;
      } else if (typeof msgValue === 'object' && msgValue !== null) {
        message = msgValue.toString ? msgValue.toString() : String(msgValue);
        if (message === '[object Object]') {
          message = '';
        }
      } else {
        message = String(msgValue);
        if (message === '[object Object]') {
          message = '';
        }
      }
    }
    
    // Populate modal
    document.getElementById('contact-request-name').textContent = request.name || request.NAME || 'N/A';
    document.getElementById('contact-request-email').textContent = request.email || request.EMAIL || 'N/A';
    document.getElementById('contact-request-subject').textContent = request.subject || request.SUBJECT || 'No subject';
    document.getElementById('contact-request-message').textContent = message || 'No message';
    
    const createdAt = request.createdAt || request.CREATED_AT || new Date();
    const date = new Date(createdAt);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    document.getElementById('contact-request-date').textContent = formattedDate;
    
    const status = (request.status || request.STATUS || 'new').toLowerCase();
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    document.getElementById('contact-request-status').textContent = statusText;
    
    // Show modal
    document.getElementById('contact-request-modal').style.display = 'flex';
    
    // Mark as read if it's new
    if (status === 'new') {
      await markContactRequestAsRead(requestId);
    }
  } catch (error) {
    console.error('Error viewing contact request:', error);
    alert('Failed to load contact request details');
  }
};

/**
 * Marks a contact request as read
 */
window.markContactRequestAsRead = async function(requestId) {
  try {
    const response = await fetch(`${API_BASE}/api/admin/contact-requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'read' })
    });
    
    if (!response.ok) throw new Error('Failed to update contact request');
    
    await loadContactRequests();
  } catch (error) {
    console.error('Error updating contact request:', error);
    alert('Failed to update contact request status');
  }
};

/**
 * Renders event requests in the admin table
 * @param {Array} requests - Array of event request objects
 */
function renderEventRequests(requests) {
  const tbody = document.getElementById('event-requests-table-body');
  
  if (requests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No event requests found</td></tr>';
    return;
  }

  tbody.innerHTML = requests.map(request => {
    // Handle both camelCase (normalized) and UPPERCASE (Oracle) column names
    const title = request.title || request.TITLE || 'Untitled Event';
    const subtitle = request.subtitle || request.SUBTITLE || '';
    const organizer = request.organizer || request.ORGANIZER || 'Unknown';
    const requesterEmail = request.requesterEmail || request.REQUESTER_EMAIL || request.requester_email || 'Unknown';
    const requestDate = request.requestDate || request.REQUEST_DATE || request.request_date || request.date || request.DATE;
    const status = (request.status || request.STATUS || 'pending').toLowerCase();
    
    const statusClass = status === 'approved' ? 'profile-info-value--verified' : 
                       status === 'rejected' ? 'profile-info-value--unverified' : 
                       'profile-info-value--unverified';
    
    // Format date safely
    let dateDisplay = 'Invalid Date';
    if (requestDate) {
      try {
        const date = new Date(requestDate);
        if (!isNaN(date.getTime())) {
          dateDisplay = date.toLocaleDateString();
        }
      } catch (e) {
        // Keep default "Invalid Date"
      }
    }
    
    return `
      <tr>
        <td><strong>${title}</strong><br><small style="color: rgba(255,255,255,0.6);">${subtitle}</small></td>
        <td>${organizer}</td>
        <td>${requesterEmail}</td>
        <td>${dateDisplay}</td>
        <td>
          <span class="${statusClass}">
            ${status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </td>
        <td>
          <div class="user-actions">
            ${status === 'pending' ? `
              <button class="btn-icon" onclick="openApproveModal('${request.id || request.ID}')" title="Approve" style="color: #84f5c4;">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M16.667 5L7.5 14.167L3.333 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              <button class="btn-icon" onclick="openRejectModal('${request.id || request.ID}')" title="Reject" style="color: #ff8a8a;">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
            ` : ''}
            <button class="btn-icon" onclick="viewEventRequest('${request.id || request.ID}')" title="View Details">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 10C11.3807 10 12.5 8.88071 12.5 7.5C12.5 6.11929 11.3807 5 10 5C8.61929 5 7.5 6.11929 7.5 7.5C7.5 8.88071 8.61929 10 10 10Z" fill="currentColor"/>
                <path d="M10 11.25C7.92893 11.25 6.25 12.9289 6.25 15V16.25H13.75V15C13.75 12.9289 12.0711 11.25 10 11.25Z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Views detailed information about an event request
 * @param {string} requestId - The request ID to view
 */
async function viewEventRequest(requestId) {
  try {
    const response = await fetch(`${API_BASE}/api/admin/event-requests`);
    if (!response.ok) throw new Error('Failed to load event requests');
    
    const requests = await response.json();
    // Handle both id and ID (normalized and Oracle formats)
    const request = requests.find(r => (r.id || r.ID) === requestId);
    
    if (!request) {
      alert('Event request not found');
      return;
    }
    
    // Show request details in a modal (similar to user modal)
    const modal = document.createElement('div');
    modal.className = 'user-modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="user-modal__content">
        <div class="user-modal__header">
          <h2>Event Request Details</h2>
          <button class="btn-icon" onclick="this.closest('.user-modal').remove()" type="button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="user-detail-item">
          <div class="user-detail-label">Title</div>
          <div class="user-detail-value">${request.title || request.TITLE || 'N/A'}</div>
        </div>
        <div class="user-detail-item">
          <div class="user-detail-label">Subtitle</div>
          <div class="user-detail-value">${request.subtitle || request.SUBTITLE || 'N/A'}</div>
        </div>
        <div class="user-detail-item">
          <div class="user-detail-label">Description</div>
          <div class="user-detail-value">${request.description || request.DESCRIPTION || 'N/A'}</div>
        </div>
        <div class="user-detail-item">
          <div class="user-detail-label">Category</div>
          <div class="user-detail-value">${request.category || request.CATEGORY || 'N/A'}</div>
        </div>
        <div class="user-detail-item">
          <div class="user-detail-label">Date & Time</div>
          <div class="user-detail-value">${(() => {
            const date = request.requestDate || request.REQUEST_DATE || request.date || request.DATE;
            const time = request.requestTime || request.REQUEST_TIME || request.time || request.TIME;
            try {
              const dateObj = new Date(date);
              return !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString() + (time ? ` at ${time}` : '') : 'Invalid Date';
            } catch (e) {
              return 'Invalid Date';
            }
          })()}</div>
        </div>
        <div class="user-detail-item">
          <div class="user-detail-label">Location</div>
          <div class="user-detail-value">${request.location || request.LOCATION || 'N/A'}${(request.venue || request.VENUE) ? ` - ${request.venue || request.VENUE}` : ''}</div>
        </div>
        <div class="user-detail-item">
          <div class="user-detail-label">Organizer</div>
          <div class="user-detail-value">${request.organizer || request.ORGANIZER || 'N/A'}</div>
        </div>
        <div class="user-detail-item">
          <div class="user-detail-label">Requester Email</div>
          <div class="user-detail-value">${request.requesterEmail || request.REQUESTER_EMAIL || request.requester_email || 'N/A'}</div>
        </div>
        ${(request.notes || request.NOTES) ? `
          <div class="user-detail-item">
            <div class="user-detail-label">Additional Notes</div>
            <div class="user-detail-value">${request.notes || request.NOTES}</div>
          </div>
        ` : ''}
        <div class="user-detail-item">
          <div class="user-detail-label">Status</div>
          <div class="user-detail-value">
            <span class="${request.status === 'approved' ? 'profile-info-value--verified' : request.status === 'rejected' ? 'profile-info-value--unverified' : 'profile-info-value--unverified'}">
              ${request.status ? (request.status.charAt(0).toUpperCase() + request.status.slice(1)) : 'Pending'}
            </span>
          </div>
        </div>
        ${(request.status || request.STATUS || 'pending').toLowerCase() === 'pending' ? `
          <div class="user-detail-item">
            <div class="user-detail-label">Actions</div>
            <div class="user-detail-value">
              <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                <button class="btn btn-primary" onclick="openApproveModal('${request.id || request.ID}'); this.closest('.user-modal').remove();">
                  Approve & Create Event
                </button>
                <button class="btn btn-outline" onclick="openRejectModal('${request.id || request.ID}'); this.closest('.user-modal').remove();">
                  Reject
                </button>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
    document.body.appendChild(modal);
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  } catch (error) {
    console.error('Error loading event request:', error);
    alert('Failed to load event request details');
  }
}

/**
 * Opens the approval modal for an event request
 * @param {string} requestId - The request ID to approve
 */
function openApproveModal(requestId) {
  const modal = document.getElementById('approve-event-modal');
  const form = document.getElementById('approve-event-form');
  const priceField = document.getElementById('price-field');
  const priceInput = document.getElementById('event-price');
  const imageInput = document.getElementById('event-image');
  const imagePreview = document.getElementById('image-preview');
  const previewImg = document.getElementById('preview-img');
  
  // Store request ID in form data
  form.dataset.requestId = requestId;
  
  if (!modal || !form) {
    console.error('Approve modal or form not found');
    return;
  }
  
  // Reset form
  form.reset();
  if (imagePreview) imagePreview.style.display = 'none';
  if (priceField) priceField.style.display = 'none';
  if (priceInput) priceInput.required = false;
  
  // Show/hide price field based on event type
  const freeRadios = form.querySelectorAll('input[name="isFree"]');
  freeRadios.forEach(radio => {
    // Remove old listeners to prevent duplicates
    const newRadio = radio.cloneNode(true);
    radio.parentNode.replaceChild(newRadio, radio);
    
    newRadio.addEventListener('change', () => {
      if (newRadio.value === 'false') {
        if (priceField) priceField.style.display = 'block';
        if (priceInput) priceInput.required = true;
      } else {
        if (priceField) priceField.style.display = 'none';
        if (priceInput) {
          priceInput.required = false;
          priceInput.value = '';
        }
      }
    });
  });
  
  // Image preview - remove old listener and add new one
  if (imageInput) {
    // Remove old listeners
    const newInput = imageInput.cloneNode(true);
    imageInput.parentNode.replaceChild(newInput, imageInput);
    
    newInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      
      if (file) {
        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert('File size must be less than 5MB');
          e.target.value = '';
          if (imagePreview) imagePreview.style.display = 'none';
          return;
        }
        
        // Validate file type
        if (!file.type.match(/^image\/(jpeg|jpg|png)$/i)) {
          alert('Please upload a JPEG or PNG image');
          e.target.value = '';
          if (imagePreview) imagePreview.style.display = 'none';
          return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
          if (previewImg) previewImg.src = e.target.result;
          if (imagePreview) imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      } else {
        if (imagePreview) imagePreview.style.display = 'none';
      }
    });
  }
  
  modal.style.display = 'flex';
}

/**
 * Approves an event request and creates an event
 * @param {string} requestId - The request ID to approve
 */
// Track if approval is in progress to prevent duplicate submissions
let isApproving = false;

async function approveEventRequest(requestId) {
  const form = document.getElementById('approve-event-form');
  const alert = document.querySelector('[data-approve-alert]');
  const modal = document.getElementById('approve-event-modal');
  const submitBtn = form?.querySelector('button[type="submit"]');
  
  if (!form) {
    console.error('Approve form not found');
    return;
  }
  
  if (!requestId) {
    console.error('Request ID is missing');
    if (alert) {
      alert.textContent = '❌ Error: Request ID is missing';
      alert.dataset.state = 'error';
      alert.style.display = 'block';
    }
    return;
  }
  
  // Prevent duplicate submissions
  if (isApproving) {
    return;
  }
  
  try {
    isApproving = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing...';
    }
    if (alert) {
      alert.textContent = 'Processing approval...';
      alert.dataset.state = 'info';
      alert.style.display = 'block';
    }
    
    const formData = new FormData(form);
    const isFree = formData.get('isFree') === 'true';
    const price = isFree ? 0 : parseFloat(formData.get('price')) || 0;
    const capacity = parseInt(formData.get('capacity')) || 0;
    const tags = formData.get('tags') || '';
    
    // Get image file from the file input directly
    const imageInput = document.getElementById('event-image');
    const imageFile = imageInput?.files?.[0];
    
    
    if (!imageFile) {
      throw new Error('Please upload an event image');
    }
    
    if (imageFile.size === 0) {
      throw new Error('The selected image file is empty. Please choose a different image.');
    }
    
    // Validate file size (5MB)
    if (imageFile.size > 5 * 1024 * 1024) {
      throw new Error('Image file size must be less than 5MB');
    }
    
    // Validate file type
    if (!imageFile.type.match(/^image\/(jpeg|jpg|png)$/i)) {
      throw new Error('Please upload a JPEG or PNG image file');
    }
    
    if (!isFree && (!price || price <= 0)) {
      throw new Error('Please enter a valid price for paid events');
    }
    
    if (!capacity || capacity <= 0) {
      throw new Error('Please enter a valid capacity');
    }
    
    // Create FormData for file upload
    const uploadData = new FormData();
    uploadData.append('isFree', isFree ? 'true' : 'false'); // Ensure it's a string
    uploadData.append('price', price.toString());
    uploadData.append('capacity', capacity.toString());
    uploadData.append('tags', tags);
    uploadData.append('image', imageFile);

    const response = await fetch(`${API_BASE}/api/admin/event-requests/${requestId}/approve`, {
      method: 'POST',
      body: uploadData
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        const text = await response.text();
        console.error('Response text:', text);
        errorData = { error: `Server error: ${response.status} ${response.statusText}` };
      }
      throw new Error(errorData.error || 'Failed to approve request');
    }

    const result = await response.json();
    
    if (alert) {
      alert.textContent = '✅ Event approved and created successfully!';
      alert.dataset.state = 'success';
    }
    
    // Close modal after 1.5 seconds
    setTimeout(() => {
      if (modal) modal.style.display = 'none';
      if (form) form.reset();
      const preview = document.getElementById('image-preview');
      if (preview) preview.style.display = 'none';
      isApproving = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Approve & Create Event';
      }
    }, 1500);
    
    // Reload event requests and events
    await Promise.all([loadEventRequests(), loadEvents()]);
    
    // Show success message
    const successMsg = document.createElement('div');
    successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #84f5c4; color: #000; padding: 1rem 1.5rem; border-radius: 8px; z-index: 10000; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
    successMsg.textContent = result.message || 'Event request approved and event created';
    document.body.appendChild(successMsg);
    
    setTimeout(() => {
      successMsg.remove();
    }, 3000);
  } catch (error) {
    console.error('Error approving event request:', error);
    isApproving = false;
    
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Approve & Create Event';
    }
    
    if (alert) {
      alert.textContent = `❌ ${error.message || 'Failed to approve event request'}`;
      alert.dataset.state = 'error';
      alert.style.display = 'block';
    }
    
    const errorMsg = document.createElement('div');
    errorMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #ff8a8a; color: #fff; padding: 1rem 1.5rem; border-radius: 8px; z-index: 10000; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
    errorMsg.textContent = error.message || 'Failed to approve event request';
    document.body.appendChild(errorMsg);
    
    setTimeout(() => {
      errorMsg.remove();
    }, 5000);
  }
}

/**
 * Rejects an event request
 * @param {string} requestId - The request ID to reject
 */
function openRejectModal(requestId) {
  const modal = document.getElementById('reject-confirm-modal');
  modal.dataset.requestId = requestId;
  modal.style.display = 'flex';
}

async function confirmRejectRequest() {
  const modal = document.getElementById('reject-confirm-modal');
  const requestId = modal.dataset.requestId;
  
  if (!requestId) return;
  
  modal.style.display = 'none';
  
  try {
    const response = await fetch(`${API_BASE}/api/admin/event-requests/${requestId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to reject request' }));
      throw new Error(errorData.error || 'Failed to reject request');
    }

    await loadEventRequests();
    
    // Show success message
    const successMsg = document.createElement('div');
    successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #84f5c4; color: #000; padding: 1rem 1.5rem; border-radius: 8px; z-index: 10000; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
    successMsg.textContent = 'Event request rejected';
    document.body.appendChild(successMsg);
    
    setTimeout(() => {
      successMsg.remove();
    }, 3000);
  } catch (error) {
    console.error('Error rejecting event request:', error);
    const errorMsg = document.createElement('div');
    errorMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #ff8a8a; color: #fff; padding: 1rem 1.5rem; border-radius: 8px; z-index: 10000; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
    errorMsg.textContent = error.message || 'Failed to reject event request';
    document.body.appendChild(errorMsg);
    
    setTimeout(() => {
      errorMsg.remove();
    }, 3000);
  }
}

// Keep old function name for backward compatibility
async function rejectEventRequest(requestId) {
  openRejectModal(requestId);
}

// ============================================================================
// ADD EVENT FUNCTIONALITY
// ============================================================================

/**
 * Opens the add event modal
 */
function openAddEventModal() {
  const modal = document.getElementById('add-event-modal');
  const form = document.getElementById('add-event-form');
  const priceField = document.getElementById('add-price-field');
  const imageInput = document.getElementById('add-event-image');
  const imagePreview = document.getElementById('add-image-preview');
  const previewImg = document.getElementById('add-preview-img');
  
  // Reset form
  form.reset();
  if (imagePreview) imagePreview.style.display = 'none';
  if (priceField) priceField.style.display = 'none';
  const priceInput = document.getElementById('add-price');
  if (priceInput) priceInput.required = false;
  
  // Show/hide price field based on event type
  const freeRadios = form.querySelectorAll('input[name="isFree"]');
  freeRadios.forEach(radio => {
    // Remove old listeners to prevent duplicates
    const newRadio = radio.cloneNode(true);
    radio.parentNode.replaceChild(newRadio, radio);
    
    newRadio.addEventListener('change', () => {
      if (newRadio.value === 'false') {
        if (priceField) priceField.style.display = 'block';
        if (priceInput) priceInput.required = true;
      } else {
        if (priceField) priceField.style.display = 'none';
        if (priceInput) {
          priceInput.required = false;
          priceInput.value = '';
        }
      }
    });
  });
  
  // Image preview - remove old listener and add new one
  if (imageInput) {
    // Remove old listeners
    const newInput = imageInput.cloneNode(true);
    imageInput.parentNode.replaceChild(newInput, imageInput);
    
    newInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert('File size must be less than 5MB');
          e.target.value = '';
          if (imagePreview) imagePreview.style.display = 'none';
          return;
        }
        
        // Validate file type
        if (!file.type.match('image/(jpeg|jpg|png)')) {
          alert('Please upload a JPEG or PNG image');
          e.target.value = '';
          if (imagePreview) imagePreview.style.display = 'none';
          return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
          if (previewImg) previewImg.src = e.target.result;
          if (imagePreview) imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
      } else {
        if (imagePreview) imagePreview.style.display = 'none';
      }
    });
  }
  
  modal.style.display = 'flex';
}

/**
 * Closes the add event modal
 */
function closeAddEventModal() {
  const modal = document.getElementById('add-event-modal');
  const form = document.getElementById('add-event-form');
  const imagePreview = document.getElementById('add-image-preview');
  const alert = document.querySelector('[data-add-event-alert]');
  
  if (modal) modal.style.display = 'none';
  if (form) form.reset();
  if (imagePreview) imagePreview.style.display = 'none';
  if (alert) {
    alert.textContent = '';
    alert.dataset.state = '';
    alert.style.display = 'none';
  }
}

// Add event button handler
document.getElementById('add-event-btn')?.addEventListener('click', openAddEventModal);

// Close and cancel handlers for add event modal
document.getElementById('close-add-event-modal')?.addEventListener('click', (e) => {
  e.stopPropagation();
  closeAddEventModal();
});
document.getElementById('cancel-add-event-btn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  closeAddEventModal();
});

// Make closeAddEventModal available globally for onclick handlers
window.closeAddEventModal = closeAddEventModal;

// Initialize admin panel when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // On initial page load, always show login form (skip auto-login)
  checkAdminAuth(true);
  
  // Approval modal event listeners
  const approveModal = document.getElementById('approve-event-modal');
  const approveForm = document.getElementById('approve-event-form');
  const closeApproveBtn = document.getElementById('close-approve-modal');
  const cancelApproveBtn = document.getElementById('cancel-approve-btn');
  
  if (closeApproveBtn) {
    closeApproveBtn.addEventListener('click', () => {
      if (approveModal) approveModal.style.display = 'none';
      if (approveForm) approveForm.reset();
      const preview = document.getElementById('image-preview');
      if (preview) preview.style.display = 'none';
    });
  }
  
  if (cancelApproveBtn) {
    cancelApproveBtn.addEventListener('click', () => {
      if (approveModal) approveModal.style.display = 'none';
      if (approveForm) approveForm.reset();
      const preview = document.getElementById('image-preview');
      if (preview) preview.style.display = 'none';
    });
  }
  
  if (approveModal) {
    approveModal.addEventListener('click', (e) => {
      if (e.target === approveModal) {
        approveModal.style.display = 'none';
        if (approveForm) approveForm.reset();
        const preview = document.getElementById('image-preview');
        if (preview) preview.style.display = 'none';
      }
    });
  }
  
  if (approveForm) {
    // Remove any existing listeners to prevent duplicates
    const newForm = approveForm.cloneNode(true);
    approveForm.parentNode.replaceChild(newForm, approveForm);
    
    // Get the new form reference
    const formToUse = document.getElementById('approve-event-form');
    
    formToUse.addEventListener('submit', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const requestId = formToUse.dataset.requestId;
      
      if (requestId) {
        await approveEventRequest(requestId);
      } else {
        console.error('No request ID found in form');
        const alert = document.querySelector('[data-approve-alert]');
        if (alert) {
          alert.textContent = '❌ Error: Request ID is missing';
          alert.dataset.state = 'error';
          alert.style.display = 'block';
        }
      }
    });
  }
  
  // Edit Event Modal event listeners
  const editEventModal = document.getElementById('edit-event-modal');
  const editEventForm = document.getElementById('edit-event-form');
  const closeEditEventBtn = document.getElementById('close-edit-event-modal');
  const cancelEditEventBtn = document.getElementById('cancel-edit-event-btn');
  
  if (closeEditEventBtn) {
    closeEditEventBtn.addEventListener('click', () => {
      if (editEventModal) editEventModal.style.display = 'none';
      if (editEventForm) editEventForm.reset();
    });
  }
  
  if (cancelEditEventBtn) {
    cancelEditEventBtn.addEventListener('click', () => {
      if (editEventModal) editEventModal.style.display = 'none';
      if (editEventForm) editEventForm.reset();
    });
  }
  
  if (editEventModal) {
    editEventModal.addEventListener('click', (e) => {
      if (e.target === editEventModal) {
        editEventModal.style.display = 'none';
        if (editEventForm) editEventForm.reset();
      }
    });
  }
  
  if (editEventForm) {
    editEventForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const eventId = editEventForm.dataset.eventId;
      if (!eventId) return;
      
      const alert = document.querySelector('[data-edit-event-alert]');
      const submitBtn = e.target.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      
      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        if (alert) {
          alert.textContent = 'Saving changes...';
          alert.dataset.state = 'info';
          alert.style.display = 'block';
        }
        
        const isFree = document.getElementById('edit-is-free-true').checked;
        const price = isFree ? 0 : parseFloat(document.getElementById('edit-price').value) || 0;
        const status = document.getElementById('edit-status').value || 'upcoming';
        
        const response = await fetch(`${API_BASE}/api/admin/events/${eventId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isFree, price, status })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to update event' }));
          throw new Error(errorData.error || 'Failed to update event');
        }
        
        const result = await response.json();
        
        if (alert) {
          alert.textContent = '✅ Event updated successfully!';
          alert.dataset.state = 'success';
        }
        
        setTimeout(() => {
          editEventModal.style.display = 'none';
          editEventForm.reset();
        }, 1500);
        
        await loadEvents();
        
        const successMsg = document.createElement('div');
        successMsg.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #84f5c4; color: #000; padding: 1rem 1.5rem; border-radius: 8px; z-index: 10000; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
        successMsg.textContent = result.message || 'Event updated successfully';
        document.body.appendChild(successMsg);
        
        setTimeout(() => {
          successMsg.remove();
        }, 3000);
      } catch (error) {
        console.error(error);
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        
        if (alert) {
          alert.textContent = `❌ ${error.message || 'Failed to update event'}`;
          alert.dataset.state = 'error';
          alert.style.display = 'block';
        }
      }
    });
  }
  
  // Delete Event Modal event listeners
  const deleteEventModal = document.getElementById('delete-event-modal');
  const closeDeleteEventBtn = document.getElementById('close-delete-event-modal');
  const cancelDeleteEventBtn = document.getElementById('cancel-delete-event-btn');
  const confirmDeleteEventBtn = document.getElementById('confirm-delete-event-btn');
  
  if (closeDeleteEventBtn) {
    closeDeleteEventBtn.addEventListener('click', () => {
      if (deleteEventModal) deleteEventModal.style.display = 'none';
    });
  }
  
  if (cancelDeleteEventBtn) {
    cancelDeleteEventBtn.addEventListener('click', () => {
      if (deleteEventModal) deleteEventModal.style.display = 'none';
    });
  }
  
  if (confirmDeleteEventBtn) {
    confirmDeleteEventBtn.addEventListener('click', async () => {
      const eventId = deleteEventModal?.dataset?.eventId;
      if (eventId) {
        await deleteEvent(eventId);
      }
    });
  }
  
  if (deleteEventModal) {
    deleteEventModal.addEventListener('click', (e) => {
      if (e.target === deleteEventModal) {
        deleteEventModal.style.display = 'none';
      }
    });
  }

  // Contact Request Modal event listeners
  const contactRequestModal = document.getElementById('contact-request-modal');
  const closeContactRequestModalBtn = document.getElementById('close-contact-request-modal');
  const closeContactRequestModalBtn2 = document.getElementById('close-contact-request-modal-btn');
  
  function closeContactRequestModal() {
    if (contactRequestModal) {
      contactRequestModal.style.display = 'none';
    }
  }
  
  if (closeContactRequestModalBtn) {
    closeContactRequestModalBtn.addEventListener('click', closeContactRequestModal);
  }
  if (closeContactRequestModalBtn2) {
    closeContactRequestModalBtn2.addEventListener('click', closeContactRequestModal);
  }
  if (contactRequestModal) {
    contactRequestModal.addEventListener('click', (e) => {
      if (e.target === contactRequestModal) {
        closeContactRequestModal();
      }
    });
  }
});
