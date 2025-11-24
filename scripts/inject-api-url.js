/**
 * Netlify Build Script - Inject API URL
 * 
 * This script replaces the placeholder API URL in HTML files with the actual backend URL
 * from Netlify environment variables.
 */

const fs = require('fs');
const path = require('path');

const API_BASE_URL = process.env.API_BASE_URL || process.env.NETLIFY_API_BASE_URL || 'https://your-backend.railway.app';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

console.log('🔧 Injecting API URL:', API_BASE_URL);

// HTML files to update
const htmlFiles = [
  'index.html',
  'auth.html',
  'events.html',
  'event-details.html',
  'profile.html',
  'admin.html',
  'contact.html',
  'blog.html',
  'about.html'
];

htmlFiles.forEach(file => {
  const filePath = path.join(PUBLIC_DIR, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace placeholder API URL in script tags
  content = content.replace(
    /window\.API_BASE_URL\s*=\s*window\.API_BASE_URL\s*\|\|\s*['"]([^'"]+)['"]/g,
    `window.API_BASE_URL = '${API_BASE_URL}'`
  );
  
  // Also replace in config.js if it exists
  if (content.includes('your-backend.railway.app') || content.includes('your-api.railway.app')) {
    content = content.replace(
      /https:\/\/your-(backend|api)\.railway\.app/g,
      API_BASE_URL
    );
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Updated: ${file}`);
});

console.log('✨ API URL injection complete!');

