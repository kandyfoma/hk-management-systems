# Vercel Deployment Guide - React Native App

This guide explains how to deploy the KAT OHMS React Native app to Vercel as a web application.

## Overview

The React Native app can be deployed to Vercel as a web application using Expo's web export functionality. This creates a static web build that can be served from Vercel's CDN.

## Prerequisites

- Vercel account (https://vercel.com)
- GitHub account with the repository
- Node.js and npm installed locally
- Git configured

## Deployment Steps

### Step 1: Prepare Your Repository

1. Ensure your code is pushed to GitHub:
```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

2. Verify the build works locally:
```bash
npm run build:web
```

This should create a `dist/` folder with static files.

### Step 2: Connect to Vercel

1. Go to **https://vercel.com/dashboard**
2. Click **"Add New..."** → **"Project"**
3. Select **"Import Git Repository"**
4. Paste your GitHub repository URL
5. Click **"Continue"**

### Step 3: Configure Build Settings

Vercel should auto-detect most settings, but verify:

**Framework Preset:** Leave as "Other"

**Build Command:** 
```
npm run build:web
```

**Output Directory:** 
```
dist
```

**Install Command:** 
```
npm install
```

### Step 4: Add Environment Variables

After importing the project, set up environment variables:

1. Go to **Settings** → **Environment Variables**
2. Add the following variables from `.env.example`:

#### Required Variables
| Variable | Example | Environment |
|----------|---------|-------------|
| `REACT_APP_ENV` | `production` | Production |
| `REACT_APP_API_URL` | `https://api.katohms.com` | Production |

#### Optional Variables
- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_SENTRY_DSN`
- `REACT_APP_ANALYTICS_ID`

**Important:** Select which environments each variable applies to:
- ✓ Production
- ✓ Preview (for branch deployments)
- ✓ Development

3. Click **"Save"**

### Step 5: Configure Custom Domain

1. Go to **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `app.katohms.com`)
4. Follow DNS configuration instructions
5. Update your domain registrar's records

Example DNS setup:
```
app.katohms.com → CNAME → vercel.app
```

### Step 6: Deploy

Once configured, Vercel will:
- ✅ Automatically deploy on every push to main branch
- ✅ Generate preview deployments for pull requests
- ✅ Build production-optimized assets
- ✅ Enable automatic SSL/HTTPS

## Environment Variables Reference

### `.env.example` (Vercel Production)

```env
# Application environment
REACT_APP_ENV=production

# Backend API
REACT_APP_API_URL=https://api.katohms.com

# Optional: Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_PROJECT_ID=your_project_id

# Optional: Monitoring
REACT_APP_SENTRY_DSN=https://your-sentry-dsn
```

### `.env.local.example` (Local Development)

```env
REACT_APP_ENV=development
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENABLE_DEBUG_LOGS=true
```

**Note:** Never commit `.env.local` to version control - use Vercel dashboard for production secrets.

## Build Process Explained

### Local Build
```bash
npm run build:web
```

This command:
1. Runs `expo export --platform web`
2. Exports React Native app as static web assets
3. Outputs to `dist/` directory
4. Creates bundle-optimized files

### Vercel Build
Vercel automatically:
1. Installs dependencies: `npm install`
2. Runs build: `npm run build:web`
3. Uploads `dist/` contents to CDN
4. Optimizes and caches assets

## Available Build Scripts

```bash
# Development
npm run web              # Start local web dev server (expo dev)
npm run start            # Start Expo dev server

# Production Build
npm run build:web        # Export static web build
npm run build:web:docker # Build with Docker simulation
npm run vercel-build     # Explicit Vercel build script

# Other
npm run android          # Build for Android
npm run ios              # Build for iOS
npm run clear            # Clear cache and start
```

## Monitoring Deployments

### View Deployment Logs

1. Click on a deployment in **Deployments** tab
2. Click **"Build Log"** to see build output
3. Look for errors in:
   - Installation phase
   - Build phase
   - Optimization phase

### Common Build Errors

**Error: "expo command not found"**
- Solution: Ensure `expo` is installed in package.json devDependencies

**Error: "dist directory not found"**
- Solution: Check `expo export` output, ensure build:web script works locally

**Error: "Missing environment variable"**
- Solution: Add variable in Vercel dashboard Settings → Environment Variables

### Performance Monitoring

1. Go to **Analytics** → **Speed Insights**
2. Monitor:
   - Page load times
   - Core Web Vitals
   - User interactions

## Rollback Deployment

If something breaks:

1. Go to **Deployments** tab
2. Find the previous stable deployment
3. Click **⋮** menu → **Promote to Production**

## Continuous Deployment

Push to main branch → Automatic build & deploy

For different environments:
- **Production:** Merge to `main` branch
- **Staging:** Push to `staging` branch (configure in Vercel)
- **Preview:** Create pull request (auto-preview URL)

## Local Development

### Setup
```bash
# Install dependencies
npm install

# Start dev server
npm run web

# Available at http://localhost:8081 or 19006
```

### Environment Setup
```bash
# Copy example env file
cp .env.local.example .env.local

# Edit with your local values
# REACT_APP_API_URL=http://localhost:8000
```

## Troubleshooting

### Build Takes Too Long
- Check for large assets in `assets/`
- Optimize images before deployment
- Clear `.expo/` cache locally

### Blank Page After Deployment
- Check browser console for errors (F12)
- Verify `REACT_APP_API_URL` is accessible
- Ensure API CORS is configured

### Environment Variables Not Working
- Verify variable names (case-sensitive)
- Confirm selected for Production environment
- Re-deploy after adding new variables

## Production Checklist

Before deploying to production:

- [ ] Environment variables configured in Vercel
- [ ] API endpoints match production URLs
- [ ] Custom domain DNS records updated
- [ ] SSL certificate generated (auto by Vercel)
- [ ] Test API connectivity from deployed app
- [ ] Monitor error logs for first 24 hours
- [ ] Set up email alerts for failed deployments

## Support

- **Vercel Docs:** https://vercel.com/docs
- **Expo Web Docs:** https://docs.expo.dev/clients/expo-go-web/
- **React Native Web:** https://necolas.github.io/react-native-web/

## Additional Resources

- [Vercel Environment Variables](https://vercel.com/docs/concepts/environment-variables)
- [Expo Web Export](https://docs.expo.dev/build/how-to-use-expo-local-build/)
- [React Native Web Guide](https://necolas.github.io/react-native-web/)
- [Next Steps - Backend Integration](#backend-integration)

---

## Backend Integration

To connect the app to your backend API:

1. **Update .env.example:**
   ```env
   REACT_APP_API_URL=https://api.katohms.com
   ```

2. **Configure CORS** on your backend to allow requests from:
   - `https://app.katohms.com` (production)
   - `https://your-project.vercel.app` (preview)

3. **Test API calls** from the deployed app:
   - Open DevTools (F12)
   - Check Network tab for API requests
   - Verify responses are received correctly

4. **Enable monitoring:**
   - Add Sentry for error tracking
   - Enable analytics for user tracking
   - Set up alerts for API failures
