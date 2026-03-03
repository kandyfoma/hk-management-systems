# Vercel Deployment Guide - KAT OHMS Landing Page

Complete step-by-step guide for deploying the KAT OHMS landing page to Vercel with custom domain configuration.

## Prerequisites

- Vercel account (free or paid) - [Sign up here](https://vercel.com)
- GitHub account with the repository containing the code
- Domain access (katohms.com) - Registrar account
- Basic understanding of Git and CLI

## Deployment Steps

### Step 1: Prepare Your Repository

1. Ensure the website code is in your GitHub repository:
   ```
   hk-management-systems/
   └── frontend/
       └── website/
   ```

2. Commit and push all changes:
   ```bash
   cd frontend/website
   git add .
   git commit -m "Initial landing page setup"
   git push origin main
   ```

### Step 2: Create Vercel Project

#### Method A: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Create New"** → **"Project"**
3. Search and select your GitHub repository
4. Configure project settings:
   - **Project Name**: `kat-ohms-landing`
   - **Framework**: Next.js (auto-detected)
   - **Root Directory**: `frontend/website` ← **Important**
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Environment Variables**: Leave empty for now

5. Click **"Deploy"** and wait for completion

#### Method B: Using Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Navigate to website directory
cd frontend/website

# Deploy
vercel --prod

# Follow prompts to link account and configure project
```

### Step 3: Configure Custom Domain

#### For www.katohms.com

1. In Vercel Dashboard, go to your project
2. Click **Settings** → **Domains**
3. Click **"Add"** and enter: `www.katohms.com`
4. Choose DNS provider option:
   - If domain is registered elsewhere (GoDaddy, Namecheap, etc.):
     - Get Vercel's nameservers
     - Update DNS at your registrar
     - Propagation takes 24-48 hours

5. Verify domain ownership in Vercel

#### DNS Configuration

Add these records at your domain registrar:

**Option 1: Point to Vercel nameservers (Recommended)**
```
ns1.vercel.com
ns2.vercel.com
ns3.vercel.com
ns4.vercel.com
```

**Option 2: CNAME Record**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

**Option 3: A Record**
```
Type: A
Name: www
Value: 76.76.19.89
TTL: 3600
```

### Step 4: Set Up Application Subdomain

For app.katohms.com, create a separate Vercel project:

1. Deploy main application to Vercel with domain `app.katohms.com`
2. Or update DNS records to point app subdomain to your app hosting provider

### Step 5: Environment Variables (Optional)

If needed, add environment variables in Vercel:

1. Go to **Settings** → **Environment Variables**
2. Add variables:
   ```
   NEXT_PUBLIC_APP_URL=https://app.katohms.com
   ```

### Step 6: Verify Deployment

1. Visit `https://www.katohms.com` in your browser
2. Verify all pages load correctly
3. Check responsive design on mobile
4. Test links to app.katohms.com

## Post-Deployment Configuration

### Analytics & Monitoring

1. **Vercel Analytics** (Automatic):
   - Available in Vercel dashboard
   - Shows performance metrics

2. **Google Analytics** (Optional):
   ```tsx
   // Add to app/layout.tsx
   <script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
   ```

### Email Configuration

For contact forms, configure email service:
- SendGrid
- Mailgun
- AWS SES
- Or custom SMTP

### SSL/TLS Certificate

- ✅ Automatically provided by Let's Encrypt
- ✅ Auto-renewal enabled
- ✅ HTTPS enforced by default

## Maintenance

### Updates

To deploy updates:

```bash
# Make changes locally
cd frontend/website
git add .
git commit -m "Update landing page content"
git push origin main

# Vercel automatically redeploys on push
```

### Monitoring

1. Check Vercel Dashboard regularly
2. Monitor performance metrics
3. Review analytics
4. Check for deployment errors

### Backups

Vercel automatically maintains:
- ✅ Git history
- ✅ Production deployments
- ✅ Build logs
- ✅ Environment variables (encrypted)

## Troubleshooting

### Domain Not Pointing Correctly

1. Check DNS propagation: [dnschecker.org](https://dnschecker.org)
2. Clear browser cache and DNS cache
3. Wait 24-48 hours for full propagation
4. Verify nameserver updates at registrar

### Build Failures

1. Check build logs in Vercel dashboard
2. Verify Node version (18+)
3. Clear cache: **Settings** → **Advanced** → **Clear Cache**
4. Redeploy

### Performance Issues

1. Check Vercel analytics
2. Review build size
3. Optimize images
4. Check for 3rd-party scripts

### SSL Certificate Issues

1. Vercel handles SSL automatically
2. If issues persist, contact Vercel support
3. Wait 24-48 hours for certificate generation on new domains

## Advanced Configuration

### Custom Headers

Add to `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/:path*",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

### Caching

Configure cache headers in `next.config.js`:
```js
async headers() {
  return [
    {
      source": '/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=3600'
        }
      ]
    }
  ]
}
```

### Redirects

Configure in `vercel.json`:
```json
{
  "redirects": [
    {
      "source": "/old-page",
      "destination": "/new-page",
      "permanent": true
    }
  ]
}
```

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Vercel Support**: support@vercel.com
- **Community**: https://github.com/vercel/next.js/discussions

## Checklist

Before going live:

- [ ] Domain configured and verified
- [ ] SSL certificate active
- [ ] All pages loading correctly
- [ ] Mobile responsive design verified
- [ ] Links to app.katohms.com working
- [ ] Analytics configured
- [ ] Email contact forms tested
- [ ] Performance optimized
- [ ] SEO metadata verified
- [ ] Social media previews working
- [ ] Custom 404 page configured
- [ ] Robots.txt and sitemap.xml configured

## Performance Standards

Target metrics:

- ✅ Lighthouse Score: 90+
- ✅ First Contentful Paint: < 2.5s
- ✅ Largest Contentful Paint: < 4s
- ✅ Cumulative Layout Shift: < 0.1
- ✅ Time to Interactive: < 3.8s

## Scaling

For increased traffic:

1. Vercel auto-scales automatically
2. No configuration needed for standard usage
3. Contact Vercel for enterprise scaling
4. Monitor usage in Vercel dashboard

## Cost Estimation

**Hobby Plan (Free)**:
- Perfect for landing pages
- Up to 100GB bandwidth/month
- Unlimited deployments

**Pro Plan** ($20/month):
- 1TB bandwidth/month
- Advanced analytics
- Priority support
- Custom domains

**Enterprise**:
- Custom pricing
- Dedicated support
- SLA guarantees
- Custom infrastructure

---

**Deployment Date**: ___________
**Last Updated**: March 3, 2026
**Status**: ✅ Ready for Production
