# Netlify Setup - API Configuration

Your site is live at: **https://unieventss.netlify.app/**

## ⚠️ Current Issue: API URL Not Configured

The frontend is trying to connect to: `https://your-backend.railway.app` (placeholder)

## ✅ Quick Fix Options

### Option 1: Set Environment Variable in Netlify (Recommended)

1. Go to your Netlify dashboard: https://app.netlify.com/
2. Select your site: **unieventss**
3. Go to **Site settings** → **Environment variables**
4. Click **Add a variable**
5. Set:
   - **Key**: `API_BASE_URL`
   - **Value**: Your backend URL (e.g., `https://your-backend.railway.app`)
6. Click **Save**
7. Go to **Deploys** tab → Click **Trigger deploy** → **Clear cache and deploy site**

### Option 2: Update HTML Files Directly

Edit these files in your repository:
- `public/index.html`
- `public/auth.html`
- `public/events.html`
- `public/event-details.html`
- `public/profile.html`
- `public/admin.html`
- `public/contact.html`
- `public/blog.html`
- `public/about.html`

Find this line in each file:
```html
window.API_BASE_URL = window.API_BASE_URL || 'https://your-backend.railway.app';
```

Replace `https://your-backend.railway.app` with your actual backend URL.

Then commit and push:
```bash
git add public/*.html
git commit -m "Update API URL"
git push origin main
```

### Option 3: Temporary Browser Fix (For Testing)

Open browser console on your Netlify site and run:
```javascript
localStorage.setItem('MANUAL_API_URL', 'https://your-backend-url.com');
location.reload();
```

## 🔍 Find Your Backend URL

If your backend is deployed on:
- **Railway**: Check your Railway dashboard → Service → Settings → Domains
- **Render**: Check your Render dashboard → Service → Settings → Custom Domain
- **Heroku**: Check your Heroku dashboard → Settings → Domains

The URL should look like:
- `https://your-app-name.railway.app`
- `https://your-app-name.onrender.com`
- `https://your-app-name.herokuapp.com`

## ✅ After Configuration

1. Open your site: https://unieventss.netlify.app/
2. Open browser console (F12)
3. Check for: `🌐 API Base URL: https://your-actual-backend-url.com`
4. Try logging in or loading events
5. If you see CORS errors, make sure your backend CORS is configured (already fixed in server.js)

