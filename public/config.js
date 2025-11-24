/**
 * UNI Events - Configuration
 * 
 * This file contains configuration that can be overridden via environment variables
 * For Netlify deployment, set API_BASE_URL in Netlify dashboard
 */

// API Base URL configuration
// Priority:
// 1. window.API_BASE_URL (set via Netlify environment variable or script tag)
// 2. localStorage.getItem('API_BASE_URL') (for manual override)
// 3. Default based on current hostname

(function() {
  'use strict';
  
  // Get API URL from various sources
  function getApiBaseUrl() {
    // Check Netlify environment variable (injected at build time)
    if (typeof window !== 'undefined' && window.API_BASE_URL) {
      return window.API_BASE_URL;
    }
    
    // Check localStorage (for manual override)
    const stored = localStorage.getItem('API_BASE_URL');
    if (stored) {
      return stored;
    }
    
    // Check if we're on Netlify
    const hostname = window.location.hostname;
    if (hostname.includes('netlify.app') || hostname.includes('netlify.com')) {
      // For Netlify, check if API_BASE_URL was set in HTML
      if (typeof window.API_BASE_URL !== 'undefined' && window.API_BASE_URL && !window.API_BASE_URL.includes('your-backend') && !window.API_BASE_URL.includes('your-api')) {
        return window.API_BASE_URL;
      }
      
      // Try to get from localStorage (user can set it manually in browser console)
      const manualUrl = localStorage.getItem('MANUAL_API_URL');
      if (manualUrl) {
        console.log('📝 Using manually set API URL from localStorage');
        return manualUrl;
      }
      
      // Show helpful error
      console.error('⚠️ API_BASE_URL not configured for Netlify!');
      console.error('📋 To fix this:');
      console.error('   1. Set API_BASE_URL in Netlify dashboard (Site settings > Environment variables)');
      console.error('   2. OR update the script tag in index.html with your backend URL');
      console.error('   3. OR run in browser console: localStorage.setItem("MANUAL_API_URL", "https://your-backend-url.com")');
      console.error('');
      console.error('Current placeholder:', 'https://your-backend.railway.app');
      return 'https://your-backend.railway.app'; // Placeholder - MUST be updated
    }
    
    // Local development defaults
    const origin = window.location.origin;
    const port = window.location.port;
    
    if (port && (port.startsWith('55') || port === '5500' || port === '5501' || port === '5502')) {
      return 'http://localhost:4400';
    }
    if (origin.includes('5500') || origin.includes('127.0.0.1:5500') || origin === 'file://' || !origin) {
      return 'http://localhost:4400';
    }
    if (port === '4400') {
      return origin;
    }
    
    return 'http://localhost:4400';
  }
  
  // Set global API_BASE
  window.API_BASE = getApiBaseUrl();
  console.log('🌐 API Base URL:', window.API_BASE);
})();

