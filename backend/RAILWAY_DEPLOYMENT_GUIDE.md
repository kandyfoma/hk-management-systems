# Railway Deployment Guide

This guide walks you through deploying the KAT Management Systems backend on Railway.

## Prerequisites

- Railway account (https://railway.app)
- GitHub repository connected to Railway
- Domain configured on Cloudflare

## Step 1: Set Up Railway Project

1. Go to https://railway.app and log in
2. Click **New Project** → **Deploy from GitHub**
3. Select the `hk-management-systems` repository
4. Railway will auto-detect `railway.json` and `Procfile`

## Step 2: Add PostgreSQL Database

1. In your Railway project, click **+ Add** → **Database** → **PostgreSQL**
2. Railway automatically creates and links a PostgreSQL instance
3. Your `DATABASE_URL` environment variable is automatically set

## Step 3: Configure Environment Variables

In the Railway dashboard, go to **Variables** and add:

### Required Variables

```bash
# Django Core
SECRET_KEY=<generate-a-strong-secret-key>
DEBUG=False
ALLOWED_HOSTS=api.katms.org,localhost

# Database (auto-set by Railway PostgreSQL)
# DATABASE_URL=<auto-populated>

# Frontend CORS
CORS_ALLOWED_ORIGINS=https://app.katms.org
CSRF_TRUSTED_ORIGINS=https://app.katms.org

# Security (Production)
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True
```

### Optional: Email Configuration (for notifications)

```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=KAT Management <noreply@katms.org>
```

### Optional: Gemini API (for AI features)

```bash
GEMINI_API_KEY=<your-gemini-api-key>
```

## Step 4: Deploy

1. Click the **Deploy** button in Railway
2. The Procfile will execute:
   ```bash
   python manage.py migrate --noinput
   python manage.py collectstatic --noinput
   gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 3
   ```

3. Check logs for any errors:
   - Click **Deployments** → latest deployment → **View Logs**

## Step 5: Verify Deployment

### Health Check Endpoint
```bash
curl https://api.katms.org/health
# Expected response: {"status": "ok"}
```

### API Test
```bash
curl https://api.katms.org/api/v1/auth/profile/ \
  -H "Authorization: Token YOUR_TOKEN"
```

## Step 6: Configure Cloudflare DNS

Once Railway assigns a domain, add the CNAME record:

1. **Cloudflare Dashboard** → **katms.org** → **DNS**
2. Click **+ Add Record**:
   - **Type:** CNAME
   - **Name:** `api`
   - **Target:** Your Railway domain (e.g., `hk-management-systems-production.up.railway.app`)
   - **TTL:** Auto
   - **Proxy:** Proxied (orange cloud)
3. Save and wait for DNS propagation (5-15 minutes)

## Step 7: Update Frontend Configuration

Once `api.katms.org` is live, update the frontend:

```bash
# frontend/.env.production
REACT_APP_API_URL=https://api.katms.org
REACT_APP_ENV=production
```

Then redeploy on Vercel.

## Production Checklist

- [ ] SECRET_KEY is strong and unique
- [ ] DEBUG=False
- [ ] ALLOWED_HOSTS includes api.katms.org
- [ ] CORS_ALLOWED_ORIGINS includes https://app.katms.org
- [ ] CSRF_TRUSTED_ORIGINS includes https://app.katms.org
- [ ] Database is PostgreSQL (not SQLite)
- [ ] Static files are collecting properly
- [ ] Health endpoint returns 200 OK
- [ ] API endpoints require authentication
- [ ] HTTPS is enforced
- [ ] HSTS headers are set

## Monitoring

### View Logs
```
Railway Dashboard → Deployments → View Logs
```

### Common Issues

**Issue:** Database connection fails
- Check `DATABASE_URL` is set in Variables
- Ensure PostgreSQL plugin is added to project

**Issue:** Static files return 404
- Check `python manage.py collectstatic --noinput` runs successfully
- Verify STATIC_ROOT and STATICFILES_STORAGE in settings.py

**Issue:** CORS errors from frontend
- Update CORS_ALLOWED_ORIGINS to match frontend domain
- Restart the deployment for changes to take effect

**Issue:** Email not sending
- Verify EMAIL_HOST_USER and EMAIL_HOST_PASSWORD are correct
- Check Gmail "App Passwords" if using Gmail (not regular password)

## Rollback

If deployment breaks:
1. **Railway Dashboard** → **Deployments**
2. Click the previous working version → **Redeploy**

## Database Migrations

Migrations run automatically on every deployment via the Procfile.

To manually run migrations on deployed instance:
```
Railway Dashboard → Terminal → Run migration
# Then:
python manage.py migrate
```

## Scaling

As traffic increases:
1. Increase **Worker Count** in `railway.json` (default: 3)
2. Upgrade PostgreSQL plan for larger databases
3. Consider Redis caching for frequently accessed data

## Support

- Railway Docs: https://docs.railway.app
- Django Deployment: https://docs.djangoproject.com/en/5.0/howto/deployment/
- Contact: [your support email]
