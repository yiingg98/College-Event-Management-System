# UNI Events - Deployment Guide

Complete guide for deploying the UNI Events platform to production.

## Prerequisites

- Node.js (v14 or higher)
- Oracle Database (local or cloud)
- Oracle Instant Client installed
- Git (for version control)

## Project Structure

```
event management/
├── public/              # Frontend static files
├── server/              # Backend Express server
│   ├── server.js        # Main server file
│   ├── db.js            # Database connection
│   ├── db-access.js     # Database queries
│   └── schema.sql       # Database schema
├── data/                # Uploads directory
├── package.json
├── .env                 # Environment variables (create from .env.example)
└── Procfile             # For Heroku/Railway deployment
```

## Deployment Options

### Option 1: Netlify (Frontend) + Railway/Render (Backend) ⭐ Recommended

**Best for:** Fast frontend delivery + scalable backend

- **Frontend**: Netlify (static hosting, CDN)
- **Backend**: Railway/Render (Node.js with Oracle DB)
- **Database**: Oracle Database (cloud or local)

See `NETLIFY_DEPLOY.md` for detailed instructions.

### Option 2: Full Stack on Railway/Render

**Best for:** Simple deployment, everything in one place

1. Deploy entire project to Railway/Render
2. Set `public` as static files directory
3. Server serves both API and static files

### Option 3: Heroku

**Best for:** Traditional PaaS deployment

See Heroku section below.

### Option 4: VPS (DigitalOcean, AWS EC2, etc.)

**Best for:** Full control and custom configuration

See VPS section below.

## Local Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and update with your database credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
DB_USER=your_username
DB_PASSWORD=your_password
DB_CONNECTION_STRING=localhost:1521/XEPDB1
PORT=4400
```

### 3. Initialize Database

Run the database initialization script:

```bash
npm run init-db
```

This will create all necessary tables in your Oracle database.

### 4. Verify Database Setup

```bash
npm run verify-db
```

### 5. Start the Server

```bash
npm start
```

The server will run on `http://localhost:4400`

## Deployment: Netlify + Backend (Recommended)

See `NETLIFY_DEPLOY.md` for complete instructions.

**Quick Steps:**
1. Deploy backend to Railway/Render
2. Deploy frontend to Netlify
3. Set `API_BASE_URL` in Netlify environment variables
4. Update CORS in backend
5. Test!

## Deployment: Railway (Full Stack)

Railway supports Node.js and Oracle databases.

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy from GitHub**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Environment Variables**
   - Go to Variables tab
   - Add all variables from `.env.example`
   - Update `DB_CONNECTION_STRING` with your Oracle database connection string
   - Set `NODE_ENV=production`

4. **Set Build Command**
   - No build command needed (just `npm start`)

5. **Initialize Database**
   - After first deployment, open Railway CLI or web terminal
   - Run: `npm run init-db`

6. **Configure Domain**
   - Railway provides a default domain
   - Update `API_BASE_URL` in frontend files to match

## Deployment: Render

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create New Web Service**
   - Connect your GitHub repository
   - Set:
     - **Build Command:** (leave empty)
     - **Start Command:** `npm start`
     - **Environment:** Node

3. **Add Environment Variables**
   - Add all variables from `.env.example`

4. **Deploy**
   - Render will automatically deploy on git push

## Deployment: Heroku

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   ```

2. **Login and Create App**
   ```bash
   heroku login
   heroku create your-app-name
   ```

3. **Set Environment Variables**
   ```bash
   heroku config:set DB_USER=your_username
   heroku config:set DB_PASSWORD=your_password
   heroku config:set DB_CONNECTION_STRING=your_connection_string
   heroku config:set NODE_ENV=production
   heroku config:set PORT=80
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

5. **Initialize Database**
   ```bash
   heroku run npm run init-db
   ```

## Deployment: VPS (DigitalOcean, AWS EC2, etc.)

1. **Set up Server**
   - Create Ubuntu/Debian VPS
   - Install Node.js, npm, Oracle Instant Client

2. **Clone Repository**
   ```bash
   git clone your-repo-url
   cd event-management
   npm install
   ```

3. **Set up Environment**
   - Create `.env` file with production values
   - Set up PM2 or systemd for process management

4. **Initialize Database**
   ```bash
   npm run init-db
   ```

5. **Start Server**
   ```bash
   npm start
   # Or with PM2:
   pm2 start server/server.js --name uni-events
   ```

6. **Set up Nginx Reverse Proxy**
   - Configure Nginx to proxy requests to Node.js server
   - Set up SSL with Let's Encrypt

## Database Setup

### Oracle Database Options

1. **Oracle Cloud (Free Tier)**
   - Sign up at [cloud.oracle.com](https://cloud.oracle.com)
   - Create Always Free Autonomous Database
   - Get connection string from dashboard

2. **Local Oracle Database**
   - Install Oracle Database Express Edition (XE)
   - Use connection string: `localhost:1521/XEPDB1`

3. **Docker Oracle**
   ```bash
   docker run -d -p 1521:1521 -e ORACLE_PWD=password container-registry.oracle.com/database/express:latest
   ```

### Initialize Database

After setting up your Oracle database:

```bash
npm run init-db
```

This creates all necessary tables:
- `users` - User accounts
- `admins` - Admin accounts
- `events` - Event listings
- `bookings` - Event bookings
- `event_requests` - User event requests
- `contact_requests` - Contact form submissions
- `reviews` - User reviews

## Environment Variables

Required environment variables:

```env
# Database
DB_USER=your_username
DB_PASSWORD=your_password
DB_CONNECTION_STRING=host:port/service_name

# Optional: Oracle Client Path (Windows)
ORACLE_CLIENT_LIB_DIR=C:\path\to\instantclient

# Server
PORT=4400
NODE_ENV=production

# Frontend URL (for CORS - if using Netlify)
FRONTEND_URL=https://your-site.netlify.app

# API URL (for frontend - if using Netlify)
API_BASE_URL=https://your-backend.railway.app
```

## Post-Deployment Checklist

- [ ] Database initialized (`npm run init-db`)
- [ ] Environment variables configured
- [ ] Database connection tested
- [ ] Admin account created (if not in schema)
- [ ] File uploads directory created (`data/uploads/events`)
- [ ] CORS configured for frontend domain (if using Netlify)
- [ ] API_BASE_URL updated in frontend (if using Netlify)
- [ ] SSL/HTTPS enabled
- [ ] Test all major features:
  - [ ] User registration
  - [ ] User login
  - [ ] Event browsing
  - [ ] Event booking
  - [ ] Admin login
  - [ ] Admin panel functions

## Troubleshooting

### Database Connection Issues

- Verify Oracle Instant Client is installed
- Check connection string format
- Ensure database is accessible from deployment server
- Check firewall rules

### File Upload Issues

- Ensure `data/uploads/events` directory exists
- Check write permissions
- For cloud deployments, use cloud storage (S3, etc.)

### CORS Issues

- Update CORS settings in `server/server.js`
- Add your frontend domain to allowed origins
- Check `FRONTEND_URL` environment variable

## Support

For issues:
1. Check server logs
2. Verify database connection
3. Check environment variables
4. Review error messages in browser console
