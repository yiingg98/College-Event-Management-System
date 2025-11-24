/**
 * UNI Events - Events Page Script
 * 
 * Handles event listing, filtering, and display on the events page
 * 
 * @version 1.0.0
 */

// Wrap in IIFE to avoid global scope conflicts
(function() {
  'use strict';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * API Base URL
 * Note: script.js is loaded after this file and defines API_BASE globally
 * We'll use window.API_BASE if available, otherwise define our own
 */
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
  // Set it on window for other scripts
  window.API_BASE = base;
  return base;
})();

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let allEvents = [];
let filteredEvents = [];

// ============================================================================
// EVENT LOADING & RENDERING
// ============================================================================

/**
 * Loads events from the API
 */
async function loadEvents() {
  try {
    console.log('Loading events from:', `${API_BASE}/api/events`);
    const response = await fetch(`${API_BASE}/api/events`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      console.error('Events data is not an array:', data);
      allEvents = [];
      filteredEvents = [];
      renderEvents();
      return;
    }
    
    allEvents = data;
    filteredEvents = data;
    console.log(`Loaded ${allEvents.length} events`);
    renderEvents();
  } catch (error) {
    console.error('Error loading events:', error);
    const grid = document.getElementById('events-grid');
    if (grid) {
      grid.innerHTML = '<div class="error-state" style="color: #ff8a8a; padding: 2rem; text-align: center;">Failed to load events. Please check your connection and try again.</div>';
    }
    allEvents = [];
    filteredEvents = [];
  }
}

/**
 * Renders events to the DOM
 */
function renderEvents() {
  const grid = document.getElementById('events-grid');
  
  if (!grid) {
    console.error('Events grid element not found');
    return;
  }
  
  if (!filteredEvents || filteredEvents.length === 0) {
    grid.innerHTML = '<div class="empty-state">No events found matching your filters.</div>';
    return;
  }

  grid.innerHTML = filteredEvents.map(event => {
    // Set up booking buttons after rendering
    setTimeout(() => setupBookingButtons(), 100);
    // Ensure all required fields exist with fallbacks
    const eventId = event.id || '';
    const eventTitle = event.title || 'Untitled Event';
    const eventSubtitle = event.subtitle || '';
    // Safely convert description to string, handling objects
    let eventDescription = '';
    if (event.description) {
      if (typeof event.description === 'string') {
        eventDescription = event.description;
      } else if (typeof event.description === 'object' && event.description !== null) {
        eventDescription = event.description.toString ? event.description.toString() : '';
        if (eventDescription === '[object Object]') {
          eventDescription = '';
        }
      }
    }
    const eventLocation = event.location || 'Location TBD';
    // Check multiple possible field names for time
    const eventTime = event.time || event.eventTime || event.EVENT_TIME || 'TBD';
    const eventMonth = event.month || 'Jan';
    const eventDay = event.day || '1';
    const eventCategory = event.category || 'General';
    const eventImage = event.image || 'assets/images/hero-event.png';
    const isFree = event.isFree !== false;
    const eventPrice = event.price || 0;
    const registered = event.registered || 0;
    const eventStatus = (event.status || 'upcoming').toLowerCase();
    
    return `
    <article class="event-card-large">
      <div class="event-card-large__image">
        <img src="${eventImage}" alt="${eventTitle}" loading="lazy" onerror="this.src='assets/images/hero-event.png'">
        <div class="event-card-large__badge">${eventCategory}</div>
      </div>
      <div class="event-card-large__body">
        <div class="event-card-large__date">
          <span class="month">${eventMonth}</span>
          <strong class="day">${eventDay}</strong>
        </div>
        <div class="event-card-large__content">
          <h3><a href="event-details.html?id=${eventId}">${eventTitle}</a></h3>
          <p class="event-card-large__subtitle">${eventSubtitle}</p>
          <p class="event-card-large__description">${eventDescription}</p>
          <div class="event-card-large__meta">
            <div class="meta-item">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 8C9.10457 8 10 7.10457 10 6C10 4.89543 9.10457 4 8 4C6.89543 4 6 4.89543 6 6C6 7.10457 6.89543 8 8 8Z" fill="currentColor"/>
                <path d="M8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0ZM8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8C14 11.3137 11.3137 14 8 14Z" fill="currentColor"/>
              </svg>
              <span>${eventLocation}</span>
            </div>
            <div class="meta-item">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0ZM8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8C14 11.3137 11.3137 14 8 14Z" fill="currentColor"/>
                <path d="M8 4V8L11 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <span>${eventTime}</span>
            </div>
            <div class="meta-item">
              <span class="price-badge">${isFree ? 'FREE' : `Rs. ${eventPrice}`}</span>
            </div>
          </div>
          <div class="event-card-large__footer">
            <span class="registered-count">${registered} registered</span>
            <div style="display: flex; gap: 0.5rem;">
              <a href="event-details.html?id=${eventId}" class="btn btn-outline btn-sm">View Details</a>
              ${(event.status || 'upcoming').toLowerCase() === 'past' ? 
                '<span class="btn btn-outline btn-sm" style="opacity: 0.6; cursor: not-allowed;">Event Ended</span>' : 
                `<button class="btn btn-primary btn-sm event-card-large__book-btn" data-event-id="${eventId}" data-event-title="${eventTitle}" data-event-free="${isFree}" data-event-price="${eventPrice}">Book Now</button>`
              }
            </div>
          </div>
        </div>
      </div>
    </article>
    `;
  }).join('');
  
  // Set up booking buttons after rendering
  setTimeout(() => setupBookingButtons(), 100);
}

// ============================================================================
// FILTERING
// ============================================================================

/**
 * Filters events based on category, status, and search query
 */
function filterEvents() {
  const category = document.getElementById('category-filter').value;
  const status = document.getElementById('status-filter').value;
  const search = document.getElementById('search-input').value.toLowerCase();

  filteredEvents = allEvents.filter(event => {
    const matchCategory = !category || event.category === category;
    const matchStatus = !status || event.status === status;
    const matchSearch = !search || 
      (event.title || '').toString().toLowerCase().includes(search) ||
      (event.description || '').toString().toLowerCase().includes(search) ||
      (event.location || '').toString().toLowerCase().includes(search);
    
    return matchCategory && matchStatus && matchSearch;
  });

  renderEvents();
}

// ============================================================================
// REQUEST EVENT MODAL
// ============================================================================

// Request event modal elements (will be initialized after DOM loads)
let requestEventModal = null;
let requestEventBtn = null;
let requestEventClose = null;
let requestEventOverlay = null;
let requestEventForm = null;

/**
 * Initializes request event modal elements
 */
function initializeRequestEventElements() {
  requestEventModal = document.getElementById('request-event-modal');
  requestEventBtn = document.getElementById('request-event-btn');
  requestEventClose = document.getElementById('request-event-modal-close');
  requestEventOverlay = document.getElementById('request-event-modal-overlay');
  requestEventForm = document.getElementById('request-event-form');
}

function openRequestEventModal() {
  if (requestEventModal) {
    requestEventModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  } else {
    console.error('Request event modal not found');
  }
}

function closeRequestEventModal() {
  if (requestEventModal) {
    requestEventModal.style.display = 'none';
    document.body.style.overflow = '';
    if (requestEventForm) {
      requestEventForm.reset();
    }
  }
}

/**
 * Sets up request event modal functionality
 */
function setupRequestEventModal() {
  // Initialize elements first
  initializeRequestEventElements();
  
  // Check if elements exist
  if (!requestEventModal || !requestEventBtn) {
    console.warn('Request event modal elements not found');
    return;
  }

  // Event listeners for modal
  if (requestEventBtn) {
    requestEventBtn.addEventListener('click', openRequestEventModal);
  }

  if (requestEventClose) {
    requestEventClose.addEventListener('click', closeRequestEventModal);
  }

  if (requestEventOverlay) {
    requestEventOverlay.addEventListener('click', closeRequestEventModal);
  }

  // Form submission
  if (requestEventForm) {
    requestEventForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alert = document.querySelector('[data-request-alert]');
      
      if (!alert) {
        console.error('Alert element not found for request form');
        return;
      }
      
      const formData = new FormData(requestEventForm);
      const data = Object.fromEntries(formData.entries());

      // Add userId if user is logged in
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      if (isLoggedIn) {
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            data.userId = user.id;
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
      }

      try {
        alert.textContent = 'Submitting request...';
        alert.dataset.state = 'info';
        alert.style.display = 'block';

        const response = await fetch(`${API_BASE}/api/events/request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to submit request');
        }

        alert.textContent = '✅ Event requested successfully you will be emailed soon.';
        alert.dataset.state = 'success';
        
        // Reset form
        requestEventForm.reset();
        
        // Close modal after 2 seconds
        setTimeout(() => {
          closeRequestEventModal();
        }, 2000);
      } catch (error) {
        console.error('Request event error:', error);
        alert.textContent = `❌ ${error.message || 'Failed to submit request. Please try again.'}`;
        alert.dataset.state = 'error';
        alert.style.display = 'block';
      }
    });
  }
}

// ============================================================================
// AUTHENTICATION STATE (for events page)
// ============================================================================

// Note: checkAuthState is defined in script.js, which is also loaded on this page
// We'll use that function instead of defining a duplicate

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  loadEvents();
  setupRequestEventModal();

  // Set up filter event listeners
  const categoryFilter = document.getElementById('category-filter');
  const statusFilter = document.getElementById('status-filter');
  const searchInput = document.getElementById('search-input');
  
  if (categoryFilter) {
    categoryFilter.addEventListener('change', filterEvents);
  }
  if (statusFilter) {
    statusFilter.addEventListener('change', filterEvents);
  }
  if (searchInput) {
    searchInput.addEventListener('input', filterEvents);
  }

  // Check auth state for profile (function is defined in script.js)
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
  
  // Initialize booking functionality
  // Wait for script.js to load and initialize booking elements
  if (typeof window.initializeBookingElements === 'function') {
    window.initializeBookingElements();
  } else {
    // If script.js hasn't loaded yet, wait for it
    const checkBookingInit = setInterval(() => {
      if (typeof window.initializeBookingElements === 'function') {
        window.initializeBookingElements();
        clearInterval(checkBookingInit);
      }
    }, 100);
    
    // Stop checking after 5 seconds
    setTimeout(() => clearInterval(checkBookingInit), 5000);
  }
  
  // Set up booking button listeners after events are rendered
  setTimeout(() => {
    setupBookingButtons();
  }, 500);
});

/**
 * Sets up event listeners for booking buttons on event cards
 */
function setupBookingButtons() {
  const bookButtons = document.querySelectorAll('.event-card-large__book-btn');
  bookButtons.forEach(button => {
    // Remove any existing listeners to avoid duplicates
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    newButton.addEventListener('click', () => {
      const eventId = newButton.dataset.eventId;
      const eventTitle = newButton.dataset.eventTitle;
      const isFree = newButton.dataset.eventFree === 'true';
      const eventPrice = parseFloat(newButton.dataset.eventPrice) || 0;
      
      // Use the openBookingModal function from script.js
      if (typeof window.openBookingModal === 'function') {
        window.openBookingModal(eventId, eventTitle, isFree, eventPrice);
      } else {
        console.error('Booking modal function not available. Make sure script.js is loaded.');
        alert('Booking functionality is not available. Please refresh the page.');
      }
    });
  });
}

})(); // End IIFE
