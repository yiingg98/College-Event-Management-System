# Deployment Checklist

Use this checklist to ensure a smooth deployment process.

## Pre-Deployment

### 1. Code Preparation
- [ ] All code committed to Git
- [ ] Unnecessary files removed
- [ ] `.env.example` file created and updated
- [ ] `.gitignore` configured properly
- [ ] All tests passing (if any)

### 2. Database Setup
- [ ] Oracle Database accessible (local or cloud)
- [ ] Database credentials ready
- [ ] Connection string formatted correctly
- [ ] Oracle Instant Client installed (if needed)

### 3. Environment Variables
- [ ] `DB_USER` - Database username
- [ ] `DB_PASSWORD` - Database password
- [ ] `DB_CONNECTION_STRING` - Database connection string
- [ ] `PORT` - Server port (default: 4400)
- [ ] `NODE_ENV` - Set to `production`
- [ ] `API_BASE_URL` - Backend API URL (for frontend)

## Deployment Steps

### Step 1: Choose Platform
- [ ] Railway (recommended)
- [ ] Render
- [ ] Heroku
- [ ] VPS (DigitalOcean, AWS, etc.)

### Step 2: Deploy Application
- [ ] Connect GitHub repository
- [ ] Configure build settings
- [ ] Set environment variables
- [ ] Deploy application

### Step 3: Initialize Database
- [ ] Connect to deployed server
- [ ] Run `npm run init-db`
- [ ] Verify tables created: `npm run verify-db`
- [ ] Create admin account (if not in schema)

### Step 4: Configure File Uploads
- [ ] Create `data/uploads/events` directory
- [ ] Set proper permissions
- [ ] For cloud: Configure cloud storage (S3, etc.)

### Step 5: Test Deployment
- [ ] Server starts successfully
- [ ] Database connection works
- [ ] API endpoints respond
- [ ] File uploads work
- [ ] Admin panel accessible
- [ ] User registration works
- [ ] Event booking works

## Post-Deployment

### Security
- [ ] Change default admin password
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS for production domain
- [ ] Review and restrict API endpoints if needed
- [ ] Set up rate limiting

### Monitoring
- [ ] Set up error logging
- [ ] Configure health check endpoint
- [ ] Set up uptime monitoring
- [ ] Configure backup strategy

### Frontend (if separate)
- [ ] Update `API_BASE_URL` in frontend files
- [ ] Deploy frontend to Netlify/Vercel
- [ ] Test frontend-backend communication
- [ ] Verify CORS settings

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check connection string format
   - Verify database is accessible
   - Check firewall rules
   - Verify credentials

2. **File Upload Errors**
   - Check directory permissions
   - Verify upload path exists
   - Check disk space

3. **CORS Errors**
   - Update CORS settings in `server.js`
   - Add frontend domain to allowed origins

4. **Port Issues**
   - Verify PORT environment variable
   - Check platform-specific port requirements

## Rollback Plan

If deployment fails:
1. Keep previous version running
2. Fix issues in development
3. Test locally
4. Redeploy

## Support Resources

- Check server logs
- Review `DEPLOY.md` for detailed instructions
- Check platform-specific documentation
- Review error messages in browser console

