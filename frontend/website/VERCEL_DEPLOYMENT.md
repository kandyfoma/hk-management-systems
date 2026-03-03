# Vercel Deployment Guide

This guide explains how to deploy the KAT OHMS Landing Website to Vercel.

## Prerequisites

- Vercel account (free at https://vercel.com)
- GitHub account (for repository connection)
- Git installed locally

## Deployment Steps

### 1. Push Code to GitHub

First, ensure your code is pushed to a GitHub repository:

```bash
git init
git add .
git commit -m "Initial commit: KAT OHMS landing website"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/your-repo-name.git
git push -u origin main
```

### 2. Connect to Vercel

1. Go to **https://vercel.com/dashboard**
2. Click **"Add New..."** → **"Project"**
3. Select **"Import Git Repository"**
4. Paste your GitHub repository URL and click **"Continue"**
5. Vercel will automatically detect Next.js configuration

### 3. Configure Environment Variables (Optional)

1. In your Vercel project dashboard, go to **Settings** → **Environment Variables**
2. Add variables from `.env.example`:

   ```
   NEXT_PUBLIC_APP_URL: https://www.katohms.com
   NEXT_PUBLIC_APP_ENV: production
   ```

3. Select which environments these variables apply to:
   - **Development** - for `vercel env pull`
   - **Preview** - for preview deployments
   - **Production** - for main domain

**Note:** Variables starting with `NEXT_PUBLIC_` are exposed to the browser. Never add secrets without this prefix.

### 4. Custom Domain Setup

1. In Vercel Dashboard, go to **Settings** → **Domains**
2. Click **"Add Domain"**
3. Enter your domain: **www.katohms.com**
4. Follow the DNS configuration instructions
5. Update your domain registrar's DNS records to point to Vercel's nameservers

For subdomain setup:
- **www.katohms.com** → Points to website
- **api.katohms.com** → Can point to backend
- **app.katohms.com** → Can point to mobile app

### 5. Deploy

Once connected, your project will:
- Deploy automatically on every push to `main` branch
- Generate preview deployments for pull requests
- Show deployment logs in the dashboard

## Automatic Deployments

The project is configured to:
- ✅ Install dependencies: `npm install`
- ✅ Build: `npm run build`
- ✅ Output: `.next` directory
- ✅ Framework: Next.js 14.2.35

## Environment Variables Reference

| Variable | Type | Example | Required |
|----------|------|---------|----------|
| `NEXT_PUBLIC_APP_URL` | String | `https://www.katohms.com` | Optional |
| `NEXT_PUBLIC_APP_ENV` | String | `production` or `staging` | Optional |
| `NEXT_PUBLIC_API_URL` | String | `https://api.katohms.com` | Optional |
| `NEXT_PUBLIC_ANALYTICS_ID` | String | `G-XXXXXXXXXX` | Optional |

## Monitoring & Logs

1. Go to **Settings** → **Monitoring**
2. Enable performance analytics
3. View real-time logs under **Deployments** tab
4. Check **Speed Insights** for performance metrics

## Troubleshooting

### Build Fails

Check the build logs in Vercel dashboard:
1. Click on the failed deployment
2. View logs under **Build** tab
3. Look for TypeScript, linting, or runtime errors

### Environment Variables Not Loading

- Ensure variables start with `NEXT_PUBLIC_` for client-side access
- Re-deploy after adding new variables
- Check variable is selected for correct environment (Production)

### Domain Not Resolving

- Verify DNS records are updated (can take 24-48 hours)
- Check domain registrar settings
- Use https://dns.google.com to verify DNS propagation

## Rollback

If a deployment causes issues:
1. Go to **Deployments** tab
2. Find a previous stable deployment
3. Click **⋮** menu → **Promote to Production**

## Additional Resources

- [Vercel Docs](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/environment-variables)

## Support

For issues with:
- **Vercel deployment**: Check Vercel documentation or contact Vercel support
- **Next.js**: See Next.js documentation
- **Content/Features**: Contact your development team
