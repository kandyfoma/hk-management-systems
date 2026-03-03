# Quick Start - Vercel Deployment

## Files Created for Vercel Integration

✅ `vercel.json` - Vercel build configuration
✅ `.env.example` - Production environment variables template
✅ `.env.local.example` - Local development environment variables
✅ `.vercelignore` - Files to exclude from Vercel build
✅ `VERCEL_DEPLOYMENT.md` - Complete deployment guide
✅ Updated `package.json` - Added build:web script

## Quick Deployment Steps

### 1. Local Testing
```bash
npm run build:web
```

### 2. Push to GitHub
```bash
git add .
git commit -m "Setup Vercel deployment"
git push origin main
```

### 3. Deploy on Vercel
1. Visit https://vercel.com/new
2. Import your GitHub repository
3. Vercel auto-detects the configuration
4. Add environment variables (see `.env.example`)
5. Click "Deploy"

## Environment Variables to Add in Vercel Dashboard

Copy these from `.env.example` and add to Vercel project settings:

| Variable | Value |
|----------|-------|
| `REACT_APP_ENV` | `production` |
| `REACT_APP_API_URL` | `https://api.katohms.com` |

**Settings Location:** Project Settings → Environment Variables

## Build Commands

```bash
# Local static build (used by Vercel)
npm run build:web

# Local dev server
npm run web

# Build with output info
npm run build:web:docker
```

## Domain Configuration

1. In Vercel dashboard: Settings → Domains
2. Add your domain: `app.katohms.com`
3. Update DNS records at your registrar
4. Point to Vercel's nameservers

## Common Issues & Fixes

### Build fails: "expo not found"
→ Ensure `expo` is in dependencies (already set in package.json)

### Environment variables not working
→ Verify they're added in Vercel dashboard (Settings → Environment Variables)
→ Make sure you selected the right environment (Production)
→ Re-deploy after adding new variables

### App shows blank page
→ Check browser console (F12) for errors
→ Verify REACT_APP_API_URL is accessible
→ Check CORS configuration on your API server

## Files Structure

```
frontend/
├── vercel.json              ← Vercel configuration
├── .env.example             ← Production env template
├── .env.local.example       ← Local development env
├── .vercelignore            ← Files to skip in build
├── VERCEL_DEPLOYMENT.md     ← Complete guide
├── package.json             ← Updated with build:web
└── public/
    └── favicon.ico
```

## Next Steps

1. Review `.env.example` and update with your actual values
2. Test build locally: `npm run build:web`
3. Commit changes and push to GitHub
4. Go to https://vercel.com/new and import repository
5. Add environment variables in Vercel dashboard
6. Deploy!

## Support Links

- Full Guide: See `VERCEL_DEPLOYMENT.md`
- Vercel Docs: https://vercel.com/docs
- Expo Web: https://docs.expo.dev/clients/expo-go-web/

---

**Setup Complete!** Your React Native app is ready for Vercel deployment. 🚀
