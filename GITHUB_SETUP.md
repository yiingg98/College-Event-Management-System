# GitHub Setup Guide

Follow these steps to push your project to GitHub and share it with friends.

## Step 1: Create a GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right → **"New repository"**
3. Fill in:
   - **Repository name:** `uni-events` (or any name you prefer)
   - **Description:** "University Event Management Platform"
   - **Visibility:** Choose Public (to share) or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click **"Create repository"**

## Step 2: Push Your Code to GitHub

Run these commands in your project directory:

```powershell
# Make sure you're in the project directory
cd "C:\Users\LOQ\Desktop\event management"

# Stage all changes
git add .

# Commit changes
git commit -m "Initial commit: UNI Events platform with Oracle database"

# Add your GitHub repository as remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Push to GitHub
git push -u origin main
```

**Note:** If you already have a remote origin, you can update it:
```powershell
git remote set-url origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git push -u origin main
```

## Step 3: Share with Friends

Once pushed, share the repository URL with your friends:
```
https://github.com/YOUR_USERNAME/REPO_NAME
```

## For Your Friends: How to Clone and Run

Your friends should follow these steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/REPO_NAME.git
   cd REPO_NAME
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment:**
   ```bash
   # Copy the example environment file
   copy .env.example .env
   # (On Mac/Linux: cp .env.example .env)
   
   # Edit .env with their database credentials
   ```

4. **Set up Oracle Database:**
   - Install Oracle Database locally
   - Install Oracle Instant Client
   - Start Oracle services
   - Update `.env` with their database credentials

5. **Initialize database:**
   ```bash
   npm run init-db
   ```

6. **Start the server:**
   ```bash
   npm start
   ```

7. **Access the application:**
   - Main site: `http://localhost:4400`
   - Admin panel: `http://localhost:4400/admin.html`

## Important Notes

- **Never commit `.env` file** - It contains sensitive database credentials
- **`.env.example`** is included as a template
- **`node_modules/`** is excluded (friends will run `npm install`)
- **`data/uploads/`** is excluded (user-uploaded files)

