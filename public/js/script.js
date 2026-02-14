/**
 * UNI Events - Main Frontend Script
 * 
 * Handles event display, user authentication, profile management, and booking functionality
 * 
 * @version 1.0.0
 */

// Wrap in IIFE to avoid global scope conflicts
(function () {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  /**
   * Resolves the API base URL based on the current environment
   * Handles Live Server, file protocol, Netlify, and direct server access
   * 
   * Priority:
   * 1. window.API_BASE (set by config.js or Netlify environment variable)
   * 2. window.API_BASE_URL (set in HTML or Netlify)
   * 3. Auto-detect based on hostname
   */
  if (typeof resolveApiBase === 'undefined') {
    window.resolveApiBase = () => {
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

      // If hosted on Netlify (netlify.app or netlify.com domain)
      if (hostname.includes('netlify.app') || hostname.includes('netlify.com')) {
        // This should be set via config.js or Netlify environment variable
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
  }

  // Use existing API_BASE if available, otherwise resolve it
  // Always use window.API_BASE to avoid conflicts with other scripts
  if (typeof window.API_BASE === 'undefined') {
    window.API_BASE = window.resolveApiBase();
  }
  // Reference the global API_BASE (don't declare a new variable)
  const API_BASE = window.API_BASE;

  // ============================================================================
  // MAIN APPLICATION INITIALIZATION
  // ============================================================================

  /**
   * Main application initialization function
   * Loads events, sets up event handlers, and initializes all features
   */
  const initializeApp = async () => {
    // Initialize all modules
    await initializeEvents();
    await loadOngoingEvent();
    initializeHomepageSearch();
    initializeSubscribeForm();
    initializeAuth();
    initializeBooking();
    initializeQuickCards();
    initializeFooterSubscribe();
    initializeReviews();

  };

  // ============================================================================
  // EVENTS MANAGEMENT
  // ============================================================================

  let upcomingEvents = [];

  /**
   * Loads events from the server and maps them to the expected format
   */
  async function loadEventsFromServer() {
    try {
      const response = await fetch(`${API_BASE}/api/events`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const allEvents = await response.json();

      if (!Array.isArray(allEvents)) {
        console.error('Events data is not an array:', allEvents);
        upcomingEvents = [];
        return;
      }

      // Map server events to match the expected format
      upcomingEvents = allEvents.map(event => {
        // Build categories array - use CATEGORY field from database
        let categories = [];

        // Get category from database (single field, not array)
        const dbCategory = event.category || event.CATEGORY;
        if (dbCategory && dbCategory.trim()) {
          categories = [dbCategory.trim()];
        } else {
          categories = ['General'];
        }

        // Parse date if month/day not provided
        let month = event.month;
        let day = event.day;
        if (!month || !day) {
          try {
            const eventDate = event.date ? new Date(event.date) : new Date(event.createdAt);
            if (!isNaN(eventDate.getTime())) {
              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              month = month || months[eventDate.getMonth()];
              day = day || eventDate.getDate().toString();
            }
          } catch (e) {
            console.warn('Error parsing date for event:', event.id, e);
          }
        }

        // Safely convert details/description to string
        let detailsStr = '';
        if (event.details) {
          if (typeof event.details === 'string') {
            detailsStr = event.details;
          } else if (typeof event.details === 'object' && event.details !== null) {
            // If it's an object, try to extract meaningful content
            detailsStr = event.details.toString ? event.details.toString() : '';
            // If toString returns [object Object], use empty string
            if (detailsStr === '[object Object]') {
              detailsStr = '';
            }
          }
        }
        if (!detailsStr && event.description) {
          if (typeof event.description === 'string') {
            detailsStr = event.description;
          } else if (typeof event.description === 'object' && event.description !== null) {
            detailsStr = event.description.toString ? event.description.toString() : '';
            if (detailsStr === '[object Object]') {
              detailsStr = '';
            }
          }
        }

        return {
          id: event.id,
          title: event.title || 'Untitled Event',
          subtitle: event.subtitle || event.organizer || '',
          details: detailsStr,
          month: month || 'Jan',
          day: day || '1',
          location: event.location || '',
          category: event.category || event.CATEGORY || '',
          categories: categories,
          isFree: event.isFree !== false,
          price: event.price || 0,
          image: event.image || 'assets/images/hero-event.png',
          createdAt: event.createdAt || event.CREATED_AT || new Date(),
          registered: event.registered || event.REGISTERED || 0,
          status: (event.status || event.STATUS || 'upcoming').toLowerCase()
        };
      });

    } catch (error) {
      console.error('Error loading events:', error);
      upcomingEvents = [];
      // Show error message to user if element exists
      const listEl = document.querySelector('[data-upcoming-list]');
      if (listEl) {
        listEl.innerHTML = '<p class="empty-state" style="color: #ff8a8a;">Failed to load events. Please refresh the page.</p>';
      }
    }
  }

  /**
   * Renders events to the DOM based on the selected filter
   * @param {string} filter - The filter category to apply
   */
  function renderEvents(filter = 'latest') {
    const listEl = document.querySelector('[data-upcoming-list]');
    if (!listEl) {
      // This is expected on pages that don't have the event list (like events.html)
      // Only log warning if we're on index.html
      if (document.querySelector('#upcoming')) {
        console.warn('Event list element not found on index page');
      }
      return;
    }

    listEl.innerHTML = '';

    // If no events loaded, show message
    if (!upcomingEvents || upcomingEvents.length === 0) {
      listEl.innerHTML = '<p class="empty-state">No events available. Please check back later.</p>';
      return;
    }

    let filtered = upcomingEvents.filter(event => {
      // Handle special filters (these show all events, just sorted differently)
      if (filter === 'latest') {
        // Latest: show all events, sorted by creation date (newest first)
        return true;
      } else if (filter === 'popular') {
        // Popular: show events with most registrations
        return true;
      } else if (filter === 'weekdays') {
        // Weekdays: show all events (default view)
        return true;
      } else {
        // Other category filters (Music, Conference, etc.)
        // Ensure categories is an array
        if (!event || !event.categories || (Array.isArray(event.categories) && event.categories.length === 0)) {
          // If no categories, don't show for specific category filters
          return false;
        }

        const categories = Array.isArray(event.categories)
          ? event.categories
          : [event.categories];

        // Check if any category matches (case-insensitive)
        return categories.some(cat =>
          cat && cat.toString().toLowerCase() === filter.toLowerCase()
        );
      }
    });

    // Apply sorting for special filters
    if (filter === 'latest') {
      // Sort by creation date (newest first)
      filtered = filtered.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA; // Newest first
      });
    } else if (filter === 'popular') {
      // Sort by registered count (most popular first)
      filtered = filtered.sort((a, b) => {
        const regA = a.registered || a.REGISTERED || 0;
        const regB = b.registered || b.REGISTERED || 0;
        return regB - regA; // Most registered first
      });
    }

    if (!filtered.length) {
      listEl.innerHTML = '<p class="empty-state">No events match this filter (yet!).</p>';
      return;
    }

    filtered.forEach(event => {
      const card = document.createElement('article');
      card.className = 'event-card';
      card.style.cursor = 'pointer';
      card.dataset.eventId = event.id || '';
      const isFree = event.isFree !== false;

      // Safely convert details to string
      let detailsStr = '';
      if (event.details) {
        if (typeof event.details === 'string') {
          detailsStr = event.details;
        } else if (typeof event.details === 'object' && event.details !== null) {
          detailsStr = event.details.toString ? event.details.toString() : '';
          if (detailsStr === '[object Object]') {
            detailsStr = '';
          }
        } else {
          detailsStr = String(event.details);
          if (detailsStr === '[object Object]') {
            detailsStr = '';
          }
        }
      }
      // If no details, try description
      if (!detailsStr && event.description) {
        if (typeof event.description === 'string') {
          detailsStr = event.description;
        } else if (typeof event.description === 'object' && event.description !== null) {
          detailsStr = event.description.toString ? event.description.toString() : '';
          if (detailsStr === '[object Object]') {
            detailsStr = '';
          }
        } else {
          detailsStr = String(event.description);
          if (detailsStr === '[object Object]') {
            detailsStr = '';
          }
        }
      }

      card.innerHTML = `
      <div class="event-card__image-wrapper">
        <img class="event-card__image" src="${event.image || 'assets/images/hero-event.png'}" alt="${event.title}" loading="lazy">
      </div>
      <div class="event-card__body">
        <div class="event-card__header">
          <div>
            <h3>${event.title}</h3>
            <p class="event-card__subtitle">${event.subtitle || ''}</p>
          </div>
          <button class="event-card__save" type="button" aria-pressed="false" title="Save event">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 21L12 16L5 21V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H17C17.5304 3 18.0391 3.21071 18.4142 3.58579C18.7893 3.96086 19 4.46957 19 5V21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <p class="event-card__tags">${detailsStr.replace(/\n/g, '<br>')}</p>
        <div class="event-card__meta">
          <div class="event-card__date">
            <span class="event-card__month">${event.month}</span>
            <strong class="event-card__day">${event.day}</strong>
          </div>
          <div class="event-card__info">
            <p class="event-card__location">${event.location}</p>
            ${isFree ? '<div class="event-card__badge event-card__badge--small"><span>FREE</span></div>' : `<div class="event-card__price">Rs. ${event.price || 'N/A'}</div>`}
          </div>
        </div>
        ${(event.status || 'upcoming').toLowerCase() === 'past' ?
          '<span class="btn btn-outline btn-sm" style="opacity: 0.6; cursor: not-allowed;">Event Ended</span>' :
          `<button class="btn btn-primary btn-sm event-card__book-btn" data-event-id="${event.id || ''}" data-event-title="${event.title}" data-event-free="${isFree}" data-event-price="${event.price || 0}">Book Now</button>`
        }
      </div>
    `;
      listEl.appendChild(card);
    });

    // Attach event listeners to save buttons
    listEl.querySelectorAll('.event-card__save').forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card click
        const isActive = button.classList.toggle('is-active');
        button.setAttribute('aria-pressed', String(isActive));
      });
    });

    // Attach event listeners to book buttons
    listEl.querySelectorAll('.event-card__book-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card click
        const eventId = button.dataset.eventId;
        const eventTitle = button.dataset.eventTitle;
        const isFree = button.dataset.eventFree === 'true';
        const eventPrice = parseFloat(button.dataset.eventPrice) || 0;
        openBookingModal(eventId, eventTitle, isFree, eventPrice);
      });
    });

    // Make entire cards clickable to view event details
    listEl.querySelectorAll('.event-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Only navigate if the click wasn't on a button or interactive element
        const clickedElement = e.target;
        const isButton = clickedElement.closest('button') || clickedElement.closest('a');

        if (!isButton) {
          const eventId = card.dataset.eventId;
          if (eventId) {
            window.location.href = `event-details.html?id=${eventId}`;
          }
        }
      });
    });
  }

  /**
   * Loads and displays an ongoing event in the hero section
   */
  async function loadOngoingEvent() {
    try {
      const response = await fetch(`${API_BASE}/api/events?status=ongoing`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const ongoingEvents = await response.json();

      if (!Array.isArray(ongoingEvents) || ongoingEvents.length === 0) {
        // No ongoing events - show default or hide card
        const heroCard = document.getElementById('hero-event-card');
        if (heroCard) {
          const titleEl = document.getElementById('hero-event-title');
          const subtitleEl = document.getElementById('hero-event-subtitle');
          const hostEl = document.getElementById('hero-event-host');
          const learnMoreBtn = document.getElementById('hero-learn-more-btn');

          if (titleEl) titleEl.textContent = 'No ongoing events at the moment';
          if (subtitleEl) subtitleEl.textContent = 'Check back soon!';
          if (hostEl) hostEl.textContent = '';
          if (learnMoreBtn) {
            learnMoreBtn.style.display = 'none';
          }
        }
        return;
      }

      // Get the first ongoing event
      const event = ongoingEvents[0];

      // Update hero card with event data
      const heroCard = document.getElementById('hero-event-card');
      if (heroCard) {
        const imageEl = document.getElementById('hero-event-image');
        const titleEl = document.getElementById('hero-event-title');
        const subtitleEl = document.getElementById('hero-event-subtitle');
        const hostEl = document.getElementById('hero-event-host');
        const learnMoreBtn = document.getElementById('hero-learn-more-btn');

        if (imageEl) {
          imageEl.src = event.image || 'assets/images/hero-event.png';
          imageEl.alt = event.title || 'Event image';
        }

        if (titleEl) titleEl.textContent = event.title || 'Untitled Event';
        if (subtitleEl) subtitleEl.textContent = event.location || event.venue || event.organizer || 'Event';
        if (hostEl) hostEl.textContent = event.organizer || 'Organizer';

        // Make Learn More button navigate to event details
        if (learnMoreBtn && event.id) {
          learnMoreBtn.style.display = 'block';
          learnMoreBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = `event-details.html?id=${event.id}`;
          };
        }

        // Store event ID on card for potential future use
        heroCard.dataset.eventId = event.id || '';
      }
    } catch (error) {
      console.error('Error loading ongoing event:', error);
      // On error, show default message
      const titleEl = document.getElementById('hero-event-title');
      if (titleEl) {
        titleEl.textContent = 'Discover amazing events';
      }
    }
  }

  /**
   * Initializes the events module
   * Sets up event loading, rendering, and filter tabs
   */
  async function initializeEvents() {
    await loadEventsFromServer();

    const listEl = document.querySelector('[data-upcoming-list]');
    const tabButtons = document.querySelectorAll('.tab');

    // Set up filter tabs
    tabButtons.forEach(button => {
      button.addEventListener('click', async () => {
        tabButtons.forEach(btn => btn.classList.remove('is-active'));
        button.classList.add('is-active');

        // Reload all events from server when filter tab is clicked
        // This ensures filters work with the full event list, not just search results
        await loadEventsFromServer();
        renderEvents(button.dataset.filter);
      });
    });

    // Initial render
    renderEvents('latest');
  }

  // ============================================================================
  // SUBSCRIBE FORM
  // ============================================================================

  /**
   * Initializes the email subscription form
   */
  function initializeSubscribeForm() {
    const subscribeForm = document.getElementById('subscribe-form');
    const subscribeMessage = document.querySelector('.subscribe__message');

    if (!subscribeForm || !subscribeMessage) return;

    subscribeForm.addEventListener('submit', event => {
      event.preventDefault();
      const emailField = subscribeForm.querySelector('input[type="email"]');
      if (!emailField) return;

      const emailValue = emailField.value.trim();
      if (!/^[\w.\-]+@([\w\-]+\.)+[\w\-]{2,}$/i.test(emailValue)) {
        subscribeMessage.textContent = 'Please enter a valid university email.';
        subscribeMessage.style.color = '#ffd460';
        return;
      }

      subscribeMessage.textContent = `Thanks, ${emailValue}! Check your inbox for upcoming events.`;
      subscribeMessage.style.color = '#84f5c4';
      emailField.value = '';
    });
  }

  // ============================================================================
  // AUTHENTICATION & PROFILE MANAGEMENT
  // ============================================================================

  /**
   * Checks authentication state and updates UI accordingly
   * Fetches fresh user data from server to get updated verification status
   */
  const checkAuthState = async () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userData = localStorage.getItem('user');
    const loginBtn = document.getElementById('login-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    const profileName = document.getElementById('profile-name');
    const profileInitials = document.getElementById('profile-initials');

    if (isLoggedIn && userData) {
      try {
        let user = JSON.parse(userData);

        // Fetch fresh user data from server to get updated verification status
        try {
          const response = await fetch(`${API_BASE}/api/user/${user.id}`);
          if (response.ok) {
            const freshUser = await response.json();
            localStorage.setItem('user', JSON.stringify(freshUser));
            user = freshUser;
          }
        } catch (error) {
          console.error('Failed to fetch fresh user data:', error);
          // Continue with cached data if fetch fails
        }

        // Show profile dropdown, hide login button
        if (loginBtn) {
          loginBtn.classList.add('hidden');
          loginBtn.style.display = 'none';
          loginBtn.style.visibility = 'hidden';
        }
        if (profileDropdown) {
          profileDropdown.classList.remove('hidden');
          profileDropdown.style.display = 'flex';
          profileDropdown.style.visibility = 'visible';
        }

        // Update profile info
        if (profileName) profileName.textContent = user.name;
        if (profileInitials) {
          const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
          profileInitials.textContent = initials;
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        // If error, show login button
        if (loginBtn) {
          loginBtn.style.display = 'block';
          loginBtn.classList.remove('hidden');
        }
        if (profileDropdown) {
          profileDropdown.style.display = 'none';
          profileDropdown.classList.add('hidden');
        }
      }
    } else {
      // Show login button, hide profile dropdown
      if (loginBtn) {
        loginBtn.classList.remove('hidden');
        loginBtn.style.display = '';
        loginBtn.style.visibility = '';
      }
      if (profileDropdown) {
        profileDropdown.classList.add('hidden');
        profileDropdown.style.display = 'none';
        profileDropdown.style.visibility = 'hidden';
      }
    }
  };

  /**
   * Opens the profile modal and displays user information
   * Fetches fresh data from server to show updated verification status
   */
  const openProfileModal = async () => {
    const userData = localStorage.getItem('user');
    if (!userData) return;

    let user = JSON.parse(userData);
    const profileModal = document.getElementById('profile-modal');
    const profileModalInitials = document.getElementById('profile-modal-initials');
    const profileModalName = document.getElementById('profile-modal-name');
    const profileModalEmail = document.getElementById('profile-modal-email');
    const profileJoinedDate = document.getElementById('profile-joined-date');
    const verifiedBadge = document.getElementById('verified-badge');
    const unverifiedBadge = document.getElementById('unverified-badge');
    const accountStatus = document.getElementById('account-status-value');

    // Show loading state
    if (profileModalName) profileModalName.textContent = 'Loading...';
    if (profileModal) profileModal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    // Fetch fresh user data from server
    try {
      const response = await fetch(`${API_BASE}/api/user/${user.id}`);
      if (response.ok) {
        const freshUser = await response.json();
        localStorage.setItem('user', JSON.stringify(freshUser));
        user = freshUser;
      } else {
        console.error('Failed to fetch user data. Status:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch fresh user data:', error);
      // Continue with cached data if fetch fails
    }

    // Update UI with user data
    if (profileModalInitials) {
      const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      profileModalInitials.textContent = initials;
    }
    if (profileModalName) profileModalName.textContent = user.name;
    if (profileModalEmail) profileModalEmail.textContent = user.email;
    if (profileJoinedDate) {
      const createdDate = user.createdAt ? new Date(user.createdAt) : new Date();
      profileJoinedDate.textContent = createdDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    // Show verified/unverified badge based on user status
    const isVerified = user.verified === true;
    if (verifiedBadge) {
      verifiedBadge.style.display = isVerified ? 'inline-flex' : 'none';
    }
    if (unverifiedBadge) {
      unverifiedBadge.style.display = isVerified ? 'none' : 'inline-flex';
    }
    if (accountStatus) {
      accountStatus.textContent = isVerified ? 'Verified' : 'Pending Verification';
      accountStatus.className = isVerified
        ? 'profile-info-value profile-info-value--verified'
        : 'profile-info-value profile-info-value--unverified';
    }
  };

  /**
   * Closes the profile modal
   */
  const closeProfileModal = () => {
    const profileModal = document.getElementById('profile-modal');
    if (profileModal) profileModal.style.display = 'none';
    document.body.style.overflow = '';
  };

  /**
   * Initializes authentication and profile management features
   */
  function initializeAuth() {
    // Check auth state on load and at intervals
    checkAuthState();
    setTimeout(() => checkAuthState(), 100);
    setTimeout(() => checkAuthState(), 500);
    setTimeout(() => checkAuthState(), 1000);

    // Check on storage events (for multi-tab support)
    window.addEventListener('storage', () => {
      checkAuthState();
    });

    // Check when page becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        checkAuthState();
      }
    });

    // Profile dropdown toggle
    const profileTrigger = document.getElementById('profile-trigger');
    const profileMenu = document.getElementById('profile-menu');

    if (profileTrigger && profileMenu) {
      profileTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        profileMenu.classList.toggle('is-open');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!profileTrigger.contains(e.target) && !profileMenu.contains(e.target)) {
          profileMenu.classList.remove('is-open');
        }
      });
    }

    // Profile modal handlers
    const viewProfileBtn = document.getElementById('view-profile-btn');
    const profileModalClose = document.getElementById('profile-modal-close');
    const profileModalOverlay = document.getElementById('profile-modal-overlay');
    const refreshProfileBtn = document.getElementById('refresh-profile-btn');

    if (viewProfileBtn) {
      viewProfileBtn.addEventListener('click', (e) => {
        // Check if the link points to profile.html - if so, allow normal navigation
        const href = viewProfileBtn.getAttribute('href');
        if (href && (href.includes('profile.html') || href === 'profile.html')) {
          // Allow normal navigation to profile page
          if (profileMenu) profileMenu.classList.remove('is-open');
          return; // Don't prevent default, let the link work normally
        }

        // Otherwise, open the modal (for backward compatibility with #profile links)
        e.preventDefault();
        if (profileMenu) profileMenu.classList.remove('is-open');
        openProfileModal();
      });
    }

    if (profileModalClose) {
      profileModalClose.addEventListener('click', closeProfileModal);
    }

    if (profileModalOverlay) {
      profileModalOverlay.addEventListener('click', closeProfileModal);
    }

    if (refreshProfileBtn) {
      refreshProfileBtn.addEventListener('click', () => {
        openProfileModal();
      });
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');
        if (profileMenu) profileMenu.classList.remove('is-open');
        checkAuthState();
        window.location.href = 'index.html';
      });
    }
  }

  // ============================================================================
  // BOOKING SYSTEM
  // ============================================================================

  // Booking modal elements (will be initialized after DOM loads)
  let bookingModal = null;
  let bookingModalClose = null;
  let bookingModalOverlay = null;
  let volunteerCheckbox = null;
  let volunteerFields = null;
  let paymentSection = null;
  let bookingForm = null;
  let cancelBookingBtn = null;

  let currentEventData = null;

  /**
   * Initializes booking modal elements
   */
  function initializeBookingElements() {
    bookingModal = document.getElementById('booking-modal');
    bookingModalClose = document.getElementById('booking-modal-close');
    bookingModalOverlay = document.getElementById('booking-modal-overlay');
    volunteerCheckbox = document.getElementById('volunteer-checkbox');
    volunteerFields = document.getElementById('volunteer-fields');
    paymentSection = document.getElementById('payment-section');
    bookingForm = document.getElementById('booking-form');
    cancelBookingBtn = document.getElementById('cancel-booking-btn');
  }

  // Make functions available globally for events.js
  window.initializeBookingElements = initializeBookingElements;
  window.openBookingModal = openBookingModal;

  /**
 * Opens the booking modal with event details
 * @param {string} eventId - The event ID
 * @param {string} eventTitle - The event title
 * @param {boolean} isFree - Whether the event is free
 * @param {number} eventPrice - The event price
 */
  function openBookingModal(eventId, eventTitle, isFree, eventPrice) {
    // If booking modal doesn't exist (we're on events.html or event-details.html),
    // redirect to homepage with booking intent
    if (!bookingModal || !bookingForm) {
      // Store booking intent in sessionStorage
      sessionStorage.setItem('bookingIntent', JSON.stringify({
        eventId,
        eventTitle,
        isFree,
        eventPrice
      }));

      // Redirect to homepage where the booking modal exists
      window.location.href = `index.html#book-${eventId}`;
      return;
    }

    // Check if event is past - prevent booking
    fetch(`${API_BASE}/api/events/${eventId}`)
      .then(res => res.json())
      .then(event => {
        const status = (event.status || event.STATUS || 'upcoming').toLowerCase();
        if (status === 'past') {
          alert('This event has already ended. You cannot book past events.');
          return;
        }
        // Continue with booking if not past
        proceedWithBooking(eventId, eventTitle, isFree, eventPrice);
      })
      .catch(err => {
        console.error('Error checking event status:', err);
        // If we can't check, allow booking (fail open)
        proceedWithBooking(eventId, eventTitle, isFree, eventPrice);
      });
  }

  function proceedWithBooking(eventId, eventTitle, isFree, eventPrice) {
    if (!bookingModal || !bookingForm) {
      console.error('Booking modal elements not initialized');
      return;
    }

    currentEventData = { eventId, eventTitle, isFree, eventPrice };

    // Update modal title and price
    const modalTitle = document.getElementById('booking-modal-title');
    const modalPrice = document.getElementById('booking-modal-price');
    if (modalTitle) modalTitle.textContent = `Book: ${eventTitle}`;
    if (modalPrice) {
      if (isFree) {
        modalPrice.textContent = 'This is a FREE event';
        modalPrice.style.color = '#84f5c4';
      } else {
        modalPrice.textContent = `Price: Rs. ${eventPrice}`;
        modalPrice.style.color = '#fff';
      }
    }

    // Reset form and clear alerts
    bookingForm.reset();
    const alert = document.querySelector('[data-booking-alert]');
    if (alert) {
      alert.textContent = '';
      alert.dataset.state = '';
      alert.style.display = 'none';
    }

    if (volunteerFields) {
      volunteerFields.style.display = 'none';
      // Remove required from volunteer fields when hidden
      const volunteerInputs = volunteerFields.querySelectorAll('input[type="text"], select, textarea');
      volunteerInputs.forEach(input => {
        input.required = false;
      });
    }

    if (paymentSection) {
      paymentSection.style.display = 'none';
      const paymentInputs = paymentSection.querySelectorAll('input[type="radio"][name="paymentMethod"]');
      paymentInputs.forEach(input => {
        input.required = false;
      });
    }

    if (volunteerCheckbox) {
      volunteerCheckbox.checked = false;
    }

    // Show payment section if paid event (and not volunteer)
    if (!isFree && paymentSection) {
      paymentSection.style.display = 'block';
      const paymentInputs = paymentSection.querySelectorAll('input[type="radio"][name="paymentMethod"]');
      paymentInputs.forEach(input => {
        input.required = true;
      });
    }

    bookingModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  /**
   * Closes the booking modal and resets the form
   */
  function closeBookingModal() {
    if (bookingModal) {
      bookingModal.style.display = 'none';
      document.body.style.overflow = '';
    }
    if (bookingForm) {
      bookingForm.reset();
    }
    if (volunteerFields) {
      volunteerFields.style.display = 'none';
    }
    if (paymentSection) {
      paymentSection.style.display = 'none';
    }
    currentEventData = null;
  }

  /**
   * Handles volunteer checkbox toggle
   * Shows/hides volunteer fields and payment section accordingly
   */
  function setupVolunteerToggle() {
    if (!volunteerCheckbox || !volunteerFields || !paymentSection) return;

    volunteerCheckbox.addEventListener('change', (e) => {
      const volunteerInputs = volunteerFields.querySelectorAll('input[type="text"], select, textarea');

      if (e.target.checked) {
        volunteerFields.style.display = 'block';
        volunteerInputs.forEach(input => {
          input.required = true;
        });
        paymentSection.style.display = 'none';
        const paymentInputs = paymentSection.querySelectorAll('input[type="radio"][name="paymentMethod"]');
        paymentInputs.forEach(input => {
          input.required = false;
        });
      } else {
        volunteerFields.style.display = 'none';
        volunteerInputs.forEach(input => {
          input.required = false;
        });
        if (!currentEventData?.isFree) {
          paymentSection.style.display = 'block';
          const paymentInputs = paymentSection.querySelectorAll('input[type="radio"][name="paymentMethod"]');
          paymentInputs.forEach(input => {
            input.required = true;
          });
        }
      }
    });
  }

  /**
   * Handles booking form submission
   * Validates form data and submits booking to server
   */
  function setupBookingForm() {
    if (!bookingForm) return;

    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alert = document.querySelector('[data-booking-alert]');
      if (!alert) {
        console.error('Alert element not found!');
        return;
      }

      // Clear previous messages
      alert.textContent = '';
      alert.dataset.state = '';
      alert.style.display = 'none';

      if (!currentEventData) {
        alert.textContent = '❌ Event data is missing. Please try again.';
        alert.dataset.state = 'error';
        alert.style.display = 'block';
        return;
      }

      const formData = new FormData(bookingForm);
      const bookingData = {
        eventId: currentEventData.eventId,
        eventTitle: currentEventData.eventTitle,
        isVolunteer: formData.get('isVolunteer') === 'on',
        semester: formData.get('semester'),
        batch: formData.get('batch'),
        faculty: formData.get('faculty'),
        reason: formData.get('reason'),
        paymentMethod: formData.get('paymentMethod')
      };

      try {
        // Remove required from hidden volunteer fields before validation
        const volunteerInputs = volunteerFields.querySelectorAll('input[type="text"], select, textarea');
        if (!bookingData.isVolunteer) {
          volunteerInputs.forEach(input => {
            input.required = false;
          });
        }

        // Validate volunteer fields if volunteer is selected
        if (bookingData.isVolunteer) {
          if (!bookingData.semester || !bookingData.batch || !bookingData.faculty || !bookingData.reason) {
            throw new Error('Please fill in all volunteer fields');
          }
        }

        // Validate payment method for paid events
        if (!currentEventData.isFree && !bookingData.isVolunteer && !bookingData.paymentMethod) {
          throw new Error('Please select a payment method for paid events');
        }

        // Show processing message
        alert.style.display = 'block';
        alert.textContent = '⏳ Processing booking...';
        alert.dataset.state = 'info';
        alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Check if user is logged in
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        if (!isLoggedIn) {
          throw new Error('Please login to book events');
        }

        // Double-check event status before booking
        const eventResponse = await fetch(`${API_BASE}/api/events/${currentEventData.eventId}`);
        if (eventResponse.ok) {
          const event = await eventResponse.json();
          const status = (event.status || event.STATUS || 'upcoming').toLowerCase();
          if (status === 'past') {
            throw new Error('This event has already ended. You cannot book past events.');
          }
        }

        const userData = JSON.parse(localStorage.getItem('user'));
        bookingData.userId = userData.id;
        bookingData.userName = userData.name;
        bookingData.userEmail = userData.email;

        // Submit booking to server
        const response = await fetch(`${API_BASE}/api/events/book`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookingData)
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Booking failed');
        }

        // Show success message based on booking type
        alert.style.display = 'block';
        if (bookingData.isVolunteer) {
          alert.textContent = '✅ Volunteer application submitted successfully! We will review your application and get back to you soon.';
          alert.dataset.state = 'success';
        } else if (currentEventData.isFree) {
          alert.textContent = '✅ Booking confirmed! You will receive a confirmation email shortly.';
          alert.dataset.state = 'success';
        } else {
          const paymentMethodNames = {
            'esewa': 'eSewa',
            'khalti': 'Khalti',
            'bank': 'Bank Transfer'
          };
          const paymentMethodName = paymentMethodNames[bookingData.paymentMethod] || bookingData.paymentMethod;
          alert.textContent = `✅ Booking created! Please complete payment via ${paymentMethodName}. Payment instructions will be sent to your email.`;
          alert.dataset.state = 'success';
        }

        alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Disable form during success display
        bookingForm.querySelectorAll('input, select, textarea, button').forEach(el => {
          el.disabled = true;
        });

        // Show success for 3 seconds before closing
        setTimeout(() => {
          closeBookingModal();
          location.reload();
        }, 3000);
      } catch (error) {
        console.error('Booking error:', error);
        alert.style.display = 'block';
        alert.textContent = `❌ ${error.message || 'Booking failed. Please try again.'}`;
        alert.dataset.state = 'error';
        alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Re-enable form on error
        bookingForm.querySelectorAll('input, select, textarea, button').forEach(el => {
          el.disabled = false;
        });
      }
    });
  }

  /**
   * Initializes the booking system
   * Sets up modal handlers, form submission, and volunteer toggle
   */
  function initializeBooking() {
    // Initialize booking elements first
    initializeBookingElements();

    // Check if elements exist before setting up handlers
    if (!bookingModal || !bookingForm) {
      return;
    }

    setupVolunteerToggle();
    setupBookingForm();

    // Modal close handlers
    if (bookingModalClose) {
      bookingModalClose.addEventListener('click', closeBookingModal);
    }

    if (bookingModalOverlay) {
      bookingModalOverlay.addEventListener('click', closeBookingModal);
    }

    if (cancelBookingBtn) {
      cancelBookingBtn.addEventListener('click', closeBookingModal);
    }

    // Check if user came from another page with booking intent
    const bookingIntent = sessionStorage.getItem('bookingIntent');
    if (bookingIntent) {
      try {
        const { eventId, eventTitle, isFree, eventPrice } = JSON.parse(bookingIntent);
        sessionStorage.removeItem('bookingIntent');

        // Wait a moment for page to fully load, then open modal
        setTimeout(() => {
          openBookingModal(eventId, eventTitle, isFree, eventPrice);
        }, 500);
      } catch (e) {
        console.error('Error processing booking intent:', e);
        sessionStorage.removeItem('bookingIntent');
      }
    }
  }

  // ============================================================================
  // APPLICATION STARTUP
  // ============================================================================

  // Initialize app when DOM is ready
  // ============================================================================
  // HOMEPAGE SEARCH FUNCTIONALITY
  // ============================================================================

  let homepageSearchFilters = {
    date: '',
    category: '',
    event: ''
  };

  /**
   * Updates the date filter display
   */
  window.updateDateFilter = function (value) {
    homepageSearchFilters.date = value;
    checkSearchFilters();
  };

  /**
   * Updates the category filter display
   */
  window.updateCategoryFilter = function (value) {
    homepageSearchFilters.category = value;
    checkSearchFilters();
  };

  /**
   * Updates the event filter display
   */
  window.updateEventFilter = function (value) {
    homepageSearchFilters.event = value;
    checkSearchFilters();
  };

  /**
   * Checks if any filters are active and shows/hides reset button
   */
  function checkSearchFilters() {
    const resetBtn = document.getElementById('homepage-reset-btn');
    const hasFilters = homepageSearchFilters.date || homepageSearchFilters.category || homepageSearchFilters.event;
    if (resetBtn) {
      resetBtn.style.display = hasFilters ? 'inline-block' : 'none';
    }
  }

  /**
   * Performs search based on homepage filters
   */
  window.performHomepageSearch = async function () {
    try {
      // Build search query
      const params = new URLSearchParams();
      if (homepageSearchFilters.event) {
        params.append('search', homepageSearchFilters.event);
      }
      if (homepageSearchFilters.category) {
        params.append('category', homepageSearchFilters.category);
      }

      // Fetch filtered events
      const response = await fetch(`${API_BASE}/api/events?${params.toString()}`);
      if (!response.ok) throw new Error('Search failed');

      let results = await response.json();

      // Filter by month if specified (client-side filtering for better accuracy)
      if (homepageSearchFilters.date) {
        results = results.filter(e => {
          // Check multiple possible month fields
          const eventMonth = (e.month || e.MONTH || '').toString().trim();
          // Also check event_date if month is not directly available
          if (!eventMonth && e.eventDate) {
            try {
              const eventDate = new Date(e.eventDate);
              if (!isNaN(eventDate.getTime())) {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const monthFromDate = months[eventDate.getMonth()];
                return monthFromDate.toLowerCase() === homepageSearchFilters.date.toLowerCase();
              }
            } catch (err) {
              console.warn('Error parsing event date:', err);
            }
          }
          return eventMonth.toLowerCase() === homepageSearchFilters.date.toLowerCase();
        });
      }

      // Display results - scroll to events section and filter
      if (results.length > 0) {
        // Update the upcoming events list with search results
        upcomingEvents = results.map(event => {
          // Map to expected format (similar to loadEventsFromServer)
          let categories = [];
          if (event.tags && Array.isArray(event.tags)) {
            categories = event.tags;
          } else if (event.categories && Array.isArray(event.categories)) {
            categories = event.categories;
          } else {
            categories = ['weekdays'];
          }

          let month = event.month;
          let day = event.day;
          if (!month || !day) {
            try {
              const eventDate = event.date ? new Date(event.date) : new Date(event.createdAt);
              if (!isNaN(eventDate.getTime())) {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                month = month || months[eventDate.getMonth()];
                day = day || eventDate.getDate().toString();
              }
            } catch (e) {
              console.warn('Error parsing date:', e);
            }
          }

          let detailsStr = '';
          if (event.details) {
            if (typeof event.details === 'string') {
              detailsStr = event.details;
            } else if (typeof event.details === 'object' && event.details !== null) {
              detailsStr = event.details.toString ? event.details.toString() : '';
              if (detailsStr === '[object Object]') {
                detailsStr = '';
              }
            }
          }
          if (!detailsStr && event.description) {
            if (typeof event.description === 'string') {
              detailsStr = event.description;
            } else if (typeof event.description === 'object' && event.description !== null) {
              detailsStr = event.description.toString ? event.description.toString() : '';
              if (detailsStr === '[object Object]') {
                detailsStr = '';
              }
            }
          }

          return {
            id: event.id,
            title: event.title || 'Untitled Event',
            subtitle: event.subtitle || event.organizer || '',
            details: detailsStr,
            month: month || 'Jan',
            day: day || '1',
            location: event.location || '',
            categories: categories,
            isFree: event.isFree !== false,
            price: event.price || 0,
            image: event.image || 'assets/images/hero-event.png',
            createdAt: event.createdAt || event.CREATED_AT || new Date(),
            registered: event.registered || event.REGISTERED || 0,
            status: (event.status || event.STATUS || 'upcoming').toLowerCase()
          };
        });

        // Render with 'latest' filter to show all
        renderEvents('latest');

        // Scroll to events section
        document.getElementById('upcoming')?.scrollIntoView({ behavior: 'smooth' });

        // Show success message
        showSearchMessage(`Found ${results.length} event${results.length !== 1 ? 's' : ''}`, 'success');
      } else {
        showSearchMessage('No events found matching your search criteria', 'error');
      }
    } catch (error) {
      console.error('Search error:', error);
      showSearchMessage('Search failed. Please try again.', 'error');
    }
  };

  /**
   * Resets homepage search filters
   */
  window.resetHomepageSearch = function () {
    homepageSearchFilters = { date: '', category: '', event: '' };

    const dateSelect = document.getElementById('date-filter-select');
    const categorySelect = document.getElementById('category-filter-select');
    const eventInput = document.getElementById('event-filter-input');

    if (dateSelect) {
      dateSelect.value = '';
      updateDateFilter('');
    }
    if (categorySelect) {
      categorySelect.value = '';
      updateCategoryFilter('');
    }
    if (eventInput) {
      eventInput.value = '';
      updateEventFilter('');
    }

    // Reload all events
    loadEventsFromServer().then(() => {
      renderEvents('latest');
      showSearchMessage('Search reset', 'info');
    });
  };

  /**
   * Shows search result message
   */
  function showSearchMessage(message, type = 'info') {
    // Remove existing message
    const existing = document.getElementById('search-message');
    if (existing) existing.remove();

    const msg = document.createElement('div');
    msg.id = 'search-message';
    msg.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    background: ${type === 'success' ? '#84f5c4' : type === 'error' ? '#ff8a8a' : 'rgba(255,255,255,0.1)'};
    color: ${type === 'success' || type === 'error' ? '#0a075f' : '#fff'};
    font-weight: 600;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease;
  `;
    msg.textContent = message;
    document.body.appendChild(msg);

    setTimeout(() => {
      msg.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => msg.remove(), 300);
    }, 3000);
  }

  /**
   * Initializes homepage search functionality
   */
  function initializeHomepageSearch() {
    // Filters are now directly clickable - no special initialization needed
    // The select and input elements are properly visible and functional
  }


  /**
 * Initializes quick cards (Music, Conference, etc.) to filter events by category
 */
  function initializeQuickCards() {
    const quickCards = document.querySelectorAll('.quick-card');

    console.log('🔧 Initializing quick cards, found:', quickCards.length);

    if (quickCards.length === 0) {
      return;
    }

    quickCards.forEach((card) => {
      card.style.cursor = 'pointer';

      // Remove any existing listeners by cloning
      const newCard = card.cloneNode(true);
      card.parentNode.replaceChild(newCard, card);

      newCard.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const cardText = newCard.querySelector('p')?.textContent || '';
        console.log('📌 Quick card clicked:', cardText);

        // Map card text to database category
        // Map card text to database category
        let category = '';
        if (cardText.toLowerCase().includes('music') || cardText.toLowerCase().includes('cultural')) {
          category = 'Cultural';
        } else if (cardText.toLowerCase().includes('conference')) {
          category = 'Conference';
        } else if (cardText.toLowerCase().includes('celebration')) {
          category = 'Cultural';
        } else if (cardText.toLowerCase().includes('workshop')) {
          category = 'Workshop';
        } else if (cardText.toLowerCase().includes('games') || cardText.toLowerCase().includes('sport')) {
          category = 'Sports';
        }

        console.log('🎯 Target category:', category);

        if (category) {
          console.log('📥 Loading events from server...');

          // Reload ALL events from server first
          await loadEventsFromServer();

          console.log('📦 Total events loaded:', upcomingEvents.length);
          console.log('📦 All events:', upcomingEvents.map(e => ({
            title: e.title,
            category: e.category || e.CATEGORY,
            categories: e.categories
          })));

          // Filter by the selected category
          const filteredEvents = upcomingEvents.filter(event => {
            const eventCategory = event.category || event.CATEGORY || '';
            const matches = eventCategory === category;
            console.log(`  ➜ ${event.title}: category="${eventCategory}" matches "${category}"? ${matches}`);
            return matches;
          });

          console.log('✅ Filtered events count:', filteredEvents.length);

          if (filteredEvents.length > 0) {
            upcomingEvents = filteredEvents;
            renderEvents('latest');

            setTimeout(() => {
              const eventsSection = document.getElementById('upcoming');
              if (eventsSection) {
                eventsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }, 100);

            if (typeof showSearchMessage === 'function') {
              showSearchMessage(`Found ${filteredEvents.length} ${category} event${filteredEvents.length !== 1 ? 's' : ''}`, 'success');
            }
          } else {
            console.warn('❌ No events found for category:', category);
            if (typeof showSearchMessage === 'function') {
              showSearchMessage(`No ${category} events found`, 'error');
            }
          }
        }
      });

      // Add hover effect
      newCard.addEventListener('mouseenter', () => {
        newCard.style.transform = 'translateY(-4px)';
        newCard.style.transition = 'transform 0.2s ease';
      });
      newCard.addEventListener('mouseleave', () => {
        newCard.style.transform = 'translateY(0)';
      });
    });
  }

  /**
   * Initializes footer subscribe button
   */
  function initializeFooterSubscribe() {
    const footerSubscribeBtn = document.querySelector('.site-footer button[type="button"]');
    const subscribeForm = document.getElementById('subscribe-form');
    const subscribeInput = subscribeForm?.querySelector('input[type="email"]');



    if (footerSubscribeBtn) {
      // Remove existing listener
      const newBtn = footerSubscribeBtn.cloneNode(true);
      footerSubscribeBtn.parentNode.replaceChild(newBtn, footerSubscribeBtn);

      newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Footer subscribe button clicked');
        // Scroll to subscribe section
        const subscribeSection = document.getElementById('contact');
        if (subscribeSection) {
          subscribeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Focus on email input after scroll
          setTimeout(() => {
            const input = document.querySelector('#subscribe-form input[type="email"]');
            if (input) {
              input.focus();
            }
          }, 500);
        }
      });
    } else {
      console.warn('Footer subscribe button not found');
    }
  }

  /**
   * Initializes reviews section functionality
   */
  function initializeReviews() {

    // Load reviews from server
    loadReviews();

    // Add Yours button - open review modal
    const addReviewBtn = document.querySelector('.review-card--ghost button');
    if (addReviewBtn) {
      // Remove existing listener
      const newBtn = addReviewBtn.cloneNode(true);
      addReviewBtn.parentNode.replaceChild(newBtn, addReviewBtn);

      newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Add review button clicked');
        openReviewModal();
      });
    } else {
      console.warn('Add review button not found');
    }

    // See All link - scroll to contact section
    const seeAllReviewsLink = document.querySelector('.reviews .btn-ghost[href="#contact"]');
    if (seeAllReviewsLink) {
      seeAllReviewsLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('See All reviews link clicked');
        const contactSection = document.getElementById('contact');
        if (contactSection) {
          contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    } else {
      console.warn('See All reviews link not found');
    }

    // Initialize review modal
    initializeReviewModal();
  }

  /**
   * Loads reviews from server and displays them
   */
  async function loadReviews() {
    try {
      const response = await fetch(`${API_BASE}/api/reviews?limit=3`);
      if (!response.ok) throw new Error('Failed to load reviews');

      const reviews = await response.json();
      const reviewsGrid = document.querySelector('.reviews__grid');

      if (!reviewsGrid) return;

      // Keep the "Add Yours" card
      const addYoursCard = reviewsGrid.querySelector('.review-card--ghost');

      // Clear existing review cards (but keep Add Yours)
      const existingCards = reviewsGrid.querySelectorAll('.review-card:not(.review-card--ghost)');
      existingCards.forEach(card => card.remove());

      // Add new review cards
      reviews.forEach((review, index) => {
        if (index >= 3) return; // Only show first 3

        const reviewCard = document.createElement('article');
        reviewCard.className = 'review-card';

        const reviewDate = new Date(review.createdAt || review.CREATED_AT || new Date());
        const formattedDate = reviewDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        // Generate stars based on rating
        const rating = review.rating || review.RATING || 5;
        const stars = '⭐'.repeat(rating);

        reviewCard.innerHTML = `
        <img class="review-card__avatar" src="assets/images/avatar-review.png" alt="${review.userName || review.USER_NAME || 'User'}">
        <div class="review-card__head">
          <div>
            <h3>${review.userName || review.USER_NAME || 'Anonymous'}</h3>
            <p>${formattedDate}</p>
          </div>
          <div style="font-size: 1.2rem;">${stars}</div>
        </div>
        <p>${review.reviewComment || review.REVIEW_COMMENT || review.comment || review.COMMENT || 'Great experience!'}</p>
      `;

        // Insert before Add Yours card
        if (addYoursCard) {
          reviewsGrid.insertBefore(reviewCard, addYoursCard);
        } else {
          reviewsGrid.appendChild(reviewCard);
        }
      });

    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  }

  /**
   * Opens the review submission modal
   */
  function openReviewModal() {
    const reviewModal = document.getElementById('review-modal');
    const reviewForm = document.getElementById('review-form');
    const reviewName = document.getElementById('review-name');

    if (!reviewModal) return;

    // Pre-fill name if user is logged in
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (reviewName && user.name) {
          reviewName.value = user.name;
        }
      } catch (e) {
        console.warn('Error parsing user data:', e);
      }
    }

    // Reset form
    if (reviewForm) {
      reviewForm.reset();
      if (reviewName && !reviewName.value) {
        reviewName.value = '';
      }
    }

    // Reset rating stars
    const stars = document.querySelectorAll('.rating-star');
    stars.forEach(star => {
      star.style.color = 'rgba(255,255,255,0.3)';
    });
    const ratingInput = document.getElementById('review-rating');
    if (ratingInput) ratingInput.value = '';

    reviewModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Focus on name input
    if (reviewName) {
      setTimeout(() => reviewName.focus(), 100);
    }
  }

  /**
   * Closes the review modal
   */
  function closeReviewModal() {
    const reviewModal = document.getElementById('review-modal');
    const reviewForm = document.getElementById('review-form');

    if (reviewModal) {
      reviewModal.style.display = 'none';
      document.body.style.overflow = '';
    }

    if (reviewForm) {
      reviewForm.reset();
    }

    // Reset rating stars
    const stars = document.querySelectorAll('.rating-star');
    stars.forEach(star => {
      star.style.color = 'rgba(255,255,255,0.3)';
    });
    const ratingInput = document.getElementById('review-rating');
    if (ratingInput) ratingInput.value = '';
  }

  /**
   * Initializes review modal functionality
   */
  function initializeReviewModal() {
    const reviewModal = document.getElementById('review-modal');
    const reviewForm = document.getElementById('review-form');
    const reviewModalClose = document.getElementById('review-modal-close');
    const reviewModalOverlay = document.getElementById('review-modal-overlay');
    const cancelReviewBtn = document.getElementById('cancel-review-btn');
    const ratingStars = document.querySelectorAll('.rating-star');
    const ratingInput = document.getElementById('review-rating');

    // Rating stars interaction
    if (ratingStars.length > 0 && ratingInput) {
      ratingStars.forEach((star, index) => {
        star.addEventListener('click', () => {
          const rating = index + 1;
          ratingInput.value = rating;

          // Update star colors
          ratingStars.forEach((s, i) => {
            s.style.color = i < rating ? '#ffd460' : 'rgba(255,255,255,0.3)';
          });
        });

        star.addEventListener('mouseenter', () => {
          const rating = index + 1;
          ratingStars.forEach((s, i) => {
            s.style.color = i < rating ? '#ffd460' : 'rgba(255,255,255,0.3)';
          });
        });
      });

      // Reset on mouse leave if no rating selected
      const ratingContainer = document.querySelector('.rating-input');
      if (ratingContainer) {
        ratingContainer.addEventListener('mouseleave', () => {
          if (!ratingInput.value) {
            ratingStars.forEach(star => {
              star.style.color = 'rgba(255,255,255,0.3)';
            });
          } else {
            const rating = parseInt(ratingInput.value);
            ratingStars.forEach((s, i) => {
              s.style.color = i < rating ? '#ffd460' : 'rgba(255,255,255,0.3)';
            });
          }
        });
      }
    }

    // Close handlers
    if (reviewModalClose) {
      reviewModalClose.addEventListener('click', closeReviewModal);
    }

    if (reviewModalOverlay) {
      reviewModalOverlay.addEventListener('click', closeReviewModal);
    }

    if (cancelReviewBtn) {
      cancelReviewBtn.addEventListener('click', closeReviewModal);
    }

    // Form submission
    if (reviewForm) {
      reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const alert = document.querySelector('[data-review-alert]');
        const submitBtn = reviewForm.querySelector('button[type="submit"]');

        if (!ratingInput || !ratingInput.value) {
          if (alert) {
            alert.textContent = 'Please select a rating';
            alert.style.color = '#ff8a8a';
            alert.style.display = 'block';
          }
          return;
        }

        const formData = {
          userName: document.getElementById('review-name').value,
          rating: parseInt(ratingInput.value),
          comment: document.getElementById('review-comment').value || null
        };

        // Get user info if logged in
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            formData.userId = user.id;
            formData.userEmail = user.email;
          } catch (e) {
            console.warn('Error parsing user data:', e);
          }
        }

        // Disable submit button
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Submitting...';
        }

        if (alert) {
          alert.textContent = '';
          alert.style.display = 'none';
        }

        try {
          const response = await fetch(`${API_BASE}/api/reviews`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to submit review');
          }

          const newReview = await response.json();

          if (alert) {
            alert.textContent = '✅ Review submitted successfully!';
            alert.style.color = '#84f5c4';
            alert.style.display = 'block';
          }

          // Close modal after delay
          setTimeout(() => {
            closeReviewModal();
            // Reload reviews
            loadReviews();
          }, 1500);

        } catch (error) {
          console.error('Error submitting review:', error);
          if (alert) {
            alert.textContent = `❌ ${error.message || 'Failed to submit review. Please try again.'}`;
            alert.style.color = '#ff8a8a';
            alert.style.display = 'block';
          }

          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Review';
          }
        }
      });
    }

  }

  // Load past events preview for homepage
  async function loadPastEventsPreview() {
    const previewGrid = document.getElementById('past-events-preview');
    if (!previewGrid) return; // Not on homepage

    try {
      const response = await fetch(`${API_BASE}/api/events?status=past`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const pastEvents = await response.json();

      if (!Array.isArray(pastEvents) || pastEvents.length === 0) {
        previewGrid.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.7); padding: 2rem;">No past events yet. Check back later!</p>';
        return;
      }

      // Show only first 3 past events
      const previewEvents = pastEvents.slice(0, 3);

      previewGrid.innerHTML = previewEvents.map(event => {
        const eventImage = event.image || 'assets/images/hero-event.png';
        const eventTitle = event.title || 'Untitled Event';
        let eventDescription = '';
        if (event.description) {
          if (typeof event.description === 'string') {
            eventDescription = event.description.substring(0, 100);
          } else if (typeof event.description === 'object' && event.description !== null) {
            const descStr = event.description.toString ? event.description.toString() : '';
            eventDescription = descStr.substring(0, 100);
          }
        }
        if (!eventDescription) {
          eventDescription = 'No description available.';
        }
        const eventDate = event.month && event.day ? `${event.month} ${event.day}` : 'Date TBD';
        const organizer = event.organizer || 'Organizer';

        return `
        <article class="blog-card">
          <img src="${eventImage}" alt="${eventTitle}" loading="lazy" onerror="this.src='assets/images/hero-event.png'">
          <div class="blog-card__body">
            <h3><a href="event-details.html?id=${event.id}" style="color: inherit; text-decoration: none;">${eventTitle}</a></h3>
            <p>${eventDescription}${eventDescription.length >= 100 ? '...' : ''}</p>
            <p class="blog-card__meta">${eventDate} · ${organizer}</p>
          </div>
        </article>
      `;
      }).join('');

      // Add "View All" card if there are more than 3 events
      if (pastEvents.length > 3) {
        const viewAllCard = document.createElement('article');
        viewAllCard.className = 'blog-card';
        viewAllCard.style.cssText = 'display: flex; align-items: center; justify-content: center; min-height: 300px; border: 2px dashed rgba(255,255,255,0.3);';
        viewAllCard.innerHTML = `
        <div style="text-align: center;">
          <h3 style="margin-bottom: 1rem;">View All Past Events</h3>
          <a href="blog.html" class="btn btn-primary">Go to Blog</a>
        </div>
      `;
        previewGrid.appendChild(viewAllCard);
      }
    } catch (error) {
      console.error('Error loading past events preview:', error);
      previewGrid.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.7); padding: 2rem;">Failed to load past events. <a href="blog.html" style="color: #84f5c4;">View blog page</a></p>';
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      try {
        await initializeApp();
        loadPastEventsPreview();
      } catch (error) {
        console.error('❌ Error initializing homepage:', error);
      }
    });
  } else {
    // DOM is already loaded
    (async () => {
      try {
        await initializeApp();
        loadPastEventsPreview();
      } catch (error) {
        console.error('❌ Error initializing homepage:', error);
      }
    })();
  }

})(); // End IIFE
