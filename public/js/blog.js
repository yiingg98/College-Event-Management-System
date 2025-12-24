/**
 * UNI Events - Blog Page Script
 * 
 * Handles loading and displaying past events on the blog page
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
 */
const API_BASE = (() => {
  if (typeof window.API_BASE !== 'undefined') {
    return window.API_BASE;
  }
  
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
// STATE MANAGEMENT
// ============================================================================

let allPastEvents = [];
let filteredEvents = [];

// ============================================================================
// EVENT LOADING
// ============================================================================

/**
 * Loads all past events from the server
 */
async function loadPastEvents() {
  try {
    const response = await fetch(`${API_BASE}/api/events?status=past`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const events = await response.json();
    
    if (!Array.isArray(events)) {
      console.error('Events data is not an array:', events);
      allPastEvents = [];
      return;
    }
    
    // Process events and ensure they have required fields
    allPastEvents = events.map(event => {
      // Safely convert description to string
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
      
      // Parse date
      let month = event.month;
      let day = event.day;
      let year = event.year;
      if (!month || !day) {
        try {
          const eventDate = event.date ? new Date(event.date) : 
                          event.eventDate ? new Date(event.eventDate) : 
                          event.createdAt ? new Date(event.createdAt) : new Date();
          if (!isNaN(eventDate.getTime())) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            month = month || months[eventDate.getMonth()];
            day = day || eventDate.getDate().toString();
            year = year || eventDate.getFullYear().toString();
          }
        } catch (e) {
          console.warn('Error parsing date for event:', event.id, e);
        }
      }
      
      return {
        id: event.id,
        title: event.title || 'Untitled Event',
        subtitle: event.subtitle || '',
        description: eventDescription,
        month: month || 'Jan',
        day: day || '1',
        year: year || new Date().getFullYear().toString(),
        location: event.location || 'Location TBD',
        time: event.time || event.eventTime || 'TBD',
        category: event.category || 'General',
        image: event.image || 'assets/images/hero-event.png',
        isFree: event.isFree !== false,
        price: event.price || 0,
        registered: event.registered || 0,
        status: (event.status || 'past').toLowerCase()
      };
    });
    
    // Sort by date (most recent first)
    allPastEvents.sort((a, b) => {
      const dateA = new Date(`${a.month} ${a.day}, ${a.year}`);
      const dateB = new Date(`${b.month} ${b.day}, ${b.year}`);
      return dateB - dateA;
    });
    
    filteredEvents = [...allPastEvents];
    renderEvents();
    
  } catch (error) {
    console.error('Error loading past events:', error);
    allPastEvents = [];
    filteredEvents = [];
    const grid = document.getElementById('blog-events-grid');
    if (grid) {
      grid.innerHTML = '<div class="empty-state" style="color: #ff8a8a;">Failed to load past events. Please refresh the page.</div>';
    }
  }
}

// ============================================================================
// EVENT RENDERING
// ============================================================================

/**
 * Renders past events to the grid
 */
function renderEvents() {
  const grid = document.getElementById('blog-events-grid');
  
  if (!grid) {
    console.error('Blog events grid element not found');
    return;
  }
  
  if (!filteredEvents || filteredEvents.length === 0) {
    grid.innerHTML = '<div class="empty-state">No past events found.</div>';
    return;
  }

  grid.innerHTML = filteredEvents.map(event => {
    const eventId = event.id || '';
    const eventTitle = event.title || 'Untitled Event';
    const eventSubtitle = event.subtitle || '';
    const eventDescription = event.description || '';
    const eventLocation = event.location || 'Location TBD';
    const eventTime = event.time || 'TBD';
    const eventMonth = event.month || 'Jan';
    const eventDay = event.day || '1';
    const eventYear = event.year || new Date().getFullYear().toString();
    const eventCategory = event.category || 'General';
    const eventImage = event.image || 'assets/images/hero-event.png';
    const isFree = event.isFree !== false;
    const eventPrice = event.price || 0;
    const registered = event.registered || 0;
    
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
            <span class="registered-count">${registered} attended</span>
            <a href="event-details.html?id=${eventId}" class="btn btn-outline btn-sm">View Details</a>
          </div>
        </div>
      </div>
    </article>
    `;
  }).join('');
}

// ============================================================================
// FILTERING
// ============================================================================

/**
 * Filters past events based on search query
 */
function filterEvents() {
  const search = document.getElementById('search-input').value.toLowerCase();

  filteredEvents = allPastEvents.filter(event => {
    const matchSearch = !search || 
      (event.title || '').toString().toLowerCase().includes(search) ||
      (event.description || '').toString().toLowerCase().includes(search) ||
      (event.location || '').toString().toLowerCase().includes(search);
    
    return matchSearch;
  });

  renderEvents();
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  loadPastEvents();
  
  // Set up search filter
  const searchInput = document.getElementById('search-input');
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
});

})(); // End IIFE

