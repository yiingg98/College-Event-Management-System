# Netlify Deployment Guide

Complete guide for deploying UNI Events frontend on Netlify with Oracle Database backend.

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Netlify    │  ─────> │   Backend    │  ─────> │   Oracle    │
│  (Frontend)  │         │  (Railway/   │         │  Database   │
│              │         │   Render)    │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
```

- **Frontend**: Hosted on Netlify (static files from `public/` folder)
- **Backend API**: Hosted separately (Railway, Render, Heroku, or VPS)
- **Database**: Oracle Database (cloud or local, accessible by backend)

## Step 1: Deploy Backend API

First, deploy your backend API to a Node.js hosting platform:

### Option A: Railway (Recommended)

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy Backend**
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect Node.js

3. **Configure Environment Variables**
   - Go to Variables tab
   - Add:
     ```
     DB_USER=your_username
     DB_PASSWORD=your_password
     DB_CONNECTION_STRING=your_connection_string
     PORT=4400
     NODE_ENV=production
     ```

4. **Initialize Database**
   - After deployment, open Railway CLI or web terminal
   - Run: `npm run init-db`

5. **Get Backend URL**
   - Railway provides a URL like: `https://your-app.railway.app`
   - Copy this URL - you'll need it for Netlify

### Option B: Render

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create Web Service**
   - New → Web Service
   - Connect GitHub repo
   - Settings:
     - **Build Command:** (leave empty)
     - **Start Command:** `npm start`
     - **Environment:** Node

3. **Add Environment Variables**
   - Same as Railway above

4. **Deploy and Initialize**
   - Render auto-deploys on push
   - Run `npm run init-db` via Render shell

## Step 2: Deploy Frontend to Netlify

### Method 1: Netlify Dashboard (Recommended)

1. **Create Netlify Account**
   - Go to [netlify.com](https://netlify.com)
   - Sign up with GitHub

2. **Add New Site**
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repository

3. **Configure Build Settings**
   - **Base directory:** (leave empty)
   - **Build command:** (leave empty - no build needed)
   - **Publish directory:** `public`

4. **Set Environment Variables**
   - Go to Site settings → Environment variables
   - Add:
     ```
     API_BASE_URL = https://your-backend.railway.app
     ```
     (Replace with your actual backend URL)

5. **Deploy**
   - Click "Deploy site"
   - Netlify will deploy your frontend

### Method 2: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Initialize (in project root)
netlify init

# Deploy
netlify deploy --prod
```

## Step 3: Configure Frontend for Backend API

The frontend needs to know where your backend API is hosted.

### Option A: Environment Variable (Recommended)

1. **In Netlify Dashboard:**
   - Go to Site settings → Environment variables
   - Add: `API_BASE_URL = https://your-backend.railway.app`

2. **Update index.html:**
   Add this script tag in `<head>` section (before other scripts):

```html
<script>
  // Set API base URL from Netlify environment variable
  window.API_BASE_URL = 'https://your-backend.railway.app';
</script>
```

### Option B: Update config.js

Edit `public/config.js` and update the default API URL for Netlify:

```javascript
if (hostname.includes('netlify.app') || hostname.includes('netlify.com')) {
  return 'https://your-backend.railway.app'; // Your actual backend URL
}
```

## Step 4: Update CORS in Backend

Your backend needs to allow requests from your Netlify domain.

Edit `server/server.js` and update CORS:

```javascript
app.use(cors({
  origin: [
    'https://your-site.netlify.app',
    'https://your-custom-domain.com',
    'http://localhost:5500', // For local development
    'http://localhost:4400'
  ],
  credentials: true
}));
```

Or allow all origins (less secure, but easier for testing):

```javascript
app.use(cors()); // Allows all origins
```

## Step 5: Test Deployment

1. **Test Frontend:**
   - Visit your Netlify URL
   - Check browser console for API calls
   - Verify API_BASE_URL is correct

2. **Test Backend:**
   - Visit `https://your-backend.railway.app/api/health`
   - Should return server status

3. **Test Full Flow:**
   - Register a user
   - Login
   - Browse events
   - Book an event
   - Test admin panel

## Environment Variables Summary

### Netlify (Frontend)
```
API_BASE_URL = https://your-backend.railway.app
```

### Backend (Railway/Render)
```
DB_USER = your_username
DB_PASSWORD = your_password
DB_CONNECTION_STRING = your_connection_string
PORT = 4400
NODE_ENV = production
```

## Custom Domain Setup

### Netlify Custom Domain

1. Go to Site settings → Domain management
2. Add custom domain
3. Follow DNS configuration instructions
4. Update `API_BASE_URL` if needed

### Backend Custom Domain

1. Configure custom domain in Railway/Render
2. Update `API_BASE_URL` in Netlify to match
3. Update CORS in backend to include new domain

## Troubleshooting

### CORS Errors

**Problem:** Browser blocks API requests

**Solution:**
- Update CORS in `server/server.js` to include Netlify domain
- Check that `API_BASE_URL` is correct in Netlify

### API Not Found

**Problem:** Frontend can't reach backend

**Solution:**
- Verify `API_BASE_URL` is set correctly
- Check backend is running and accessible
- Test backend URL directly in browser

### Database Connection Issues

**Problem:** Backend can't connect to Oracle DB

**Solution:**
- Verify database is accessible from backend server
- Check firewall rules
- Verify connection string format
- Check Oracle Instant Client is installed (if needed)

## Advantages of This Setup

✅ **Fast Frontend**: Netlify CDN for fast static file delivery  
✅ **Scalable Backend**: Railway/Render auto-scales your API  
✅ **Same Database**: Oracle Database works exactly as in development  
✅ **Easy Updates**: Push to GitHub, both deploy automatically  
✅ **Cost Effective**: Netlify free tier + Railway free tier  

## Next Steps

1. Deploy backend to Railway/Render
2. Get backend URL
3. Deploy frontend to Netlify
4. Set `API_BASE_URL` in Netlify
5. Update CORS in backend
6. Test everything!

Your application will work exactly the same as in development, just hosted! 🚀

