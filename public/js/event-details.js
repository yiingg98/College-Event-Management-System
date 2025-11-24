/**
 * UNI Events - Event Details Page Script
 * 
 * Handles displaying detailed information about a specific event
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
 * Gets the event ID from the URL query parameters
 * @returns {string|null} The event ID or null if not found
 */
function getEventId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

// ============================================================================
// EVENT DETAILS
// ============================================================================

/**
 * Loads event details from the server
 */
async function loadEventDetails() {
  const eventId = getEventId();
  if (!eventId) {
    document.getElementById('event-details-content').innerHTML = 
      '<div class="error-state">Event ID not found</div>';
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/events/${eventId}`);
    if (!response.ok) throw new Error('Failed to load event');
    
    const event = await response.json();
    
    // Process event data to ensure proper formatting
    const processedEvent = {
      ...event,
      // Handle time field - check multiple possible field names
      time: event.time || event.eventTime || event.EVENT_TIME || 'TBD',
      // Safely convert description to string
      description: (() => {
        if (!event.description) return '';
        if (typeof event.description === 'string') return event.description;
        if (typeof event.description === 'object' && event.description !== null) {
          const str = event.description.toString ? event.description.toString() : '';
          return str === '[object Object]' ? '' : str;
        }
        return String(event.description);
      })(),
      // Safely convert details to string
      details: (() => {
        if (!event.details) return '';
        if (typeof event.details === 'string') return event.details;
        if (typeof event.details === 'object' && event.details !== null) {
          const str = event.details.toString ? event.details.toString() : '';
          return str === '[object Object]' ? '' : str;
        }
        return String(event.details);
      })(),
      // Ensure date fields exist
      month: event.month || 'Jan',
      day: event.day || '1',
      year: event.year || new Date().getFullYear().toString()
    };
    
    renderEventDetails(processedEvent);
  } catch (error) {
    console.error('Error loading event:', error);
    document.getElementById('event-details-content').innerHTML = 
      '<div class="error-state">Failed to load event details. Please try again later.</div>';
  }
}

/**
 * Renders event details to the DOM
 * @param {object} event - The event object to render
 */
function renderEventDetails(event) {
  const content = document.getElementById('event-details-content');
  
  content.innerHTML = `
    <div class="event-details__hero">
      <div class="event-details__image">
        <img src="${event.image || 'assets/images/hero-event.png'}" alt="${event.title}">
      </div>
      <div class="event-details__info">
        <div>
          <p class="eyebrow">${event.category}</p>
          <h1>${event.title}</h1>
          <p class="lead">${event.subtitle}</p>
        </div>
        
        <div class="event-details__date-time">
          <div class="date-time-item">
            <span style="color: rgba(255,255,255,0.7);">Date</span>
            <strong>${event.month} ${event.day}, ${event.year}</strong>
          </div>
          <div class="date-time-item">
            <span style="color: rgba(255,255,255,0.7);">Time</span>
            <strong>${event.time || 'TBD'}</strong>
          </div>
        </div>

        <div>
          <p><strong>Location:</strong> ${event.location}</p>
          <p><strong>Venue:</strong> ${event.venue}</p>
          <p><strong>Organizer:</strong> ${event.organizer}</p>
        </div>

        <div class="event-details__actions">
          ${(event.status || 'upcoming').toLowerCase() === 'past' ? 
            '<span class="btn btn-outline" style="opacity: 0.6; cursor: not-allowed;">Event Ended</span>' : 
            `<button class="btn btn-primary" id="book-event-btn" data-event-id="${event.id}" data-event-title="${event.title}" data-event-free="${event.isFree !== false}" data-event-price="${event.price || 0}">Register for Event</button>`
          }
          <a href="events.html" class="btn btn-outline">Back to Events</a>
        </div>
      </div>
    </div>

    <div class="event-details__content">
      <div class="event-details__section">
        <h3>About This Event</h3>
        <p>${event.description || 'No description available.'}</p>
      </div>

      <div class="event-details__section">
        <h3>Event Details</h3>
        <pre style="white-space: pre-wrap; font-family: inherit; color: rgba(255,255,255,0.8);">${event.details || 'No additional details available.'}</pre>
      </div>

      <div class="event-details__section">
        <h3>Event Information</h3>
        <div style="display: grid; gap: 1rem;">
          <div><strong>Price:</strong> ${event.isFree ? 'FREE' : `Rs. ${event.price}`}</div>
          <div><strong>Capacity:</strong> ${event.capacity} attendees</div>
          <div><strong>Registered:</strong> ${event.registered || 0} people</div>
          <div><strong>Status:</strong> <span style="text-transform: capitalize;">${event.status}</span></div>
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// AUTHENTICATION STATE
// ============================================================================

/**
 * Checks authentication state and updates UI
 */
function checkAuthState() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const userData = localStorage.getItem('user');
  const loginBtn = document.getElementById('login-btn');
  const profileDropdown = document.getElementById('profile-dropdown');

  if (isLoggedIn && userData) {
    try {
      const user = JSON.parse(userData);
      if (loginBtn) loginBtn.style.display = 'none';
      if (profileDropdown) {
        profileDropdown.classList.remove('hidden');
        profileDropdown.style.display = 'flex';
      }
      const profileName = document.getElementById('profile-name');
      const profileInitials = document.getElementById('profile-initials');
      if (profileName) profileName.textContent = user.name;
      if (profileInitials) {
        const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        profileInitials.textContent = initials;
      }
    } catch (e) {
      console.error('Error parsing user data:', e);
    }
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  loadEventDetails();
  
  // Set up booking button if event is not past
  setTimeout(() => {
    const bookBtn = document.getElementById('book-event-btn');
    if (bookBtn) {
      bookBtn.addEventListener('click', () => {
        const eventId = bookBtn.dataset.eventId;
        const eventTitle = bookBtn.dataset.eventTitle;
        const isFree = bookBtn.dataset.eventFree === 'true';
        const eventPrice = parseFloat(bookBtn.dataset.eventPrice) || 0;
        
        // Use the openBookingModal function from script.js
        if (typeof window.openBookingModal === 'function') {
          window.openBookingModal(eventId, eventTitle, isFree, eventPrice);
        } else {
          console.error('Booking modal function not available');
          alert('Booking functionality is not available. Please refresh the page.');
        }
      });
    }
  }, 500);
  
  checkAuthState();
});
