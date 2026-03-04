# ✅ Environment Variables Setup - Complete Guide

## Summary

The frontend has been configured to use **environment variables** instead of hardcoded URLs. This enables seamless deployment across development, staging, and production environments.

---

## 📁 Files Created/Modified

### 1. Environment Files

| File | Purpose | Committed? | Action |
|------|---------|-----------|--------|
| `.env` | Development config | ❌ No | Already created with `http://localhost:8000` |
| `.env.production` | Production config | ❌ No | Already created, update with your domain |
| `.env.example` | Template for team | ✅ Yes | Reference for available variables |
| `.env.local` | Personal dev overrides | ❌ No | Create as needed, auto-ignored |
| `.env.production.local` | Personal prod overrides | ❌ No | Create as needed, auto-ignored |

### 2. Configuration Code

**`src/config/env.ts`** - Centralized environment management
```typescript
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
export const APP_ENV = (process.env.REACT_APP_ENV || 'development') as 'development' | 'production' | 'staging';
export const isDevelopment = APP_ENV === 'development';
export const isProduction = APP_ENV === 'production';
```

### 3. Git Configuration

**`.gitignore`** - Updated to properly exclude environment files:
```gitignore
.env.local                  # Local development overrides
.env.production.local       # Local production overrides
.env.*.local               # Any environment-specific local files
```

### 4. Documentation

| Document | Purpose |
|----------|---------|
| `ENV_SETUP.md` | Comprehensive setup and usage guide |
| `ENV_MIGRATION_COMPLETE.md` | Migration status and progress tracking |
| `ENVIRONMENT_SETUP_GUIDE.md` | This document |

---

## 🚀 Quick Start

### Development Environment ✅
Already configured - just start coding:
```bash
npm start
# or
expo start
```

The app automatically uses `http://localhost:8000` from `.env`

### Production Deployment
Before deploying to production:

1. **Update `.env.production`**:
   ```bash
   REACT_APP_API_URL=https://your-api-domain.com
   REACT_APP_ENV=production
   ```

2. **Build for production**:
   ```bash
   npm run build
   # or
   expo export
   ```

### Local Testing Override
For testing against a different server without committing:

Create `.env.local`:
```bash
REACT_APP_API_URL=http://192.168.1.100:8000
```

This file is **automatically ignored by git** ✅

---

## 📝 Usage in Code

### Recommended Pattern (Use This)
```typescript
import { API_BASE_URL, isProduction } from '../config/env';

// In your component
const response = await axios.get(`${API_BASE_URL}/api/v1/endpoint/`);

// Feature flagging
if (isProduction) {
  // Production-only logic
}
```

### Old Pattern (Don't Use Anymore)
```typescript
// ❌ Outdated - don't do this
const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// ❌ Hardcoding URLs
const response = await axios.get('http://localhost:8000/api/v1/endpoint/');
```

---

## 🔄 Variable Priority Order

When the app runs, variables are resolved in this order:

```
1. .env.local (if exists) ← Highest priority
2. .env.production.local (if exists)
3. .env
4. .env.production
5. Code defaults (API_BASE_URL fallback)
```

Example:
- **Development**: Uses `.env` (or `.env.local` if you create it)
- **Production build**: Uses `.env.production` (or `.env.production.local` if you create it)

---

## 📋 Available Variables

| Variable | Default | Environment | Purpose |
|----------|---------|-------------|---------|
| `REACT_APP_API_URL` | `http://localhost:8000` | All | Backend API base URL |
| `REACT_APP_ENV` | `development` | All | Deployment environment |

---

## ⚠️ Important Rules

✅ **DO:**
- Use `config/env.ts` for accessing environment variables
- Create `.env.local` for personal testing setups
- Commit `.env.example` to show team what variables exist
- Update `.env.production` before deploying

❌ **DON'T:**
- Hardcode URLs in components (e.g., `http://localhost:8000`)
- Commit `.env` or `.env.production` files
- Store secrets in environment files
- Use variable names without `REACT_APP_` prefix

---

## 🔧 Configuration Examples

### Example 1: Local Development
**File: `.env`**
```bash
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENV=development
```
→ App uses `http://localhost:8000`

### Example 2: Personal Testing Against Remote Server
**File: `.env.local`**
```bash
REACT_APP_API_URL=https://staging.yourdomain.com
```
→ Overrides `.env`, app uses staging server
→ This file is ignored by git, won't affect team

### Example 3: Production Deployment
**File: `.env.production`**
```bash
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_ENV=production
```
→ When you run `npm run build`, app uses production server

---

## 🔄 Migrating Screens

### Current Status: PPEManagementScreen ✅ DONE

**Before:**
```typescript
const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:8000');
const res = await axios.get(`${API_BASE}/api/v1/...`);
```

**After:**
```typescript
import { API_BASE_URL } from '../config/env';
const res = await axios.get(`${API_BASE_URL}/api/v1/...`);
```

### Screens Still Using Old Pattern:
- `RiskAssessmentScreen.tsx`
- `IncidentsScreen.tsx`
- `OccHealthDashboard.tsx`
- `AudiometryResultScreen.tsx`
- `OverexposureAlertScreen.tsx`

These can be migrated incrementally using the pattern above.

---

## 🚀 Deployment Checklist

### Before Local Testing
- [ ] `.env` exists with `REACT_APP_API_URL=http://localhost:8000`
- [ ] Run `npm start` or `expo start`
- [ ] App connects to backend successfully

### Before Production Deployment
- [ ] `.env.production` exists with your production domain
- [ ] Run `npm run build` to create production bundle
- [ ] Test the production build locally
- [ ] Deploy with confidence ✅

### CI/CD Pipeline Setup
For GitHub Actions, GitLab CI, or other CI/CD:

```yaml
# Example: Create .env.production during build
- name: Create production env
  run: |
    echo "REACT_APP_API_URL=${{ secrets.PRODUCTION_API_URL }}" > .env.production
    echo "REACT_APP_ENV=production" >> .env.production

- name: Build
  run: npm run build
```

Then define `PRODUCTION_API_URL` in your CI/CD secrets.

---

## 📞 Troubleshooting

### Variables Not Updating
**Problem**: Changed `.env` but app still uses old URL

**Solution**: 
1. Stop the dev server (Ctrl+C)
2. Clear cache: `npm cache clean` or `expo r -c`
3. Restart: `npm start`

### Variable Shows as Undefined
**Problem**: `process.env.MY_VARIABLE` is undefined

**Common Mistake**: Variable name doesn't start with `REACT_APP_`

```bash
❌ API_URL=...           # Won't work
✅ REACT_APP_API_URL=... # Works!
```

### Different Values in Dev vs Build
**Reason**: Environment variables are baked into the build at compile time

**Solution**: Restart dev server or rebuild after changing env files

---

## 📚 Reference

For more detailed information, see:
- **Setup Guide**: [ENV_SETUP.md](./ENV_SETUP.md)
- **Migration Status**: [ENV_MIGRATION_COMPLETE.md](./ENV_MIGRATION_COMPLETE.md)
- **Configuration Code**: [src/config/env.ts](./src/config/env.ts)

---

## ✅ Verification

To verify everything is working:

```bash
# Check that .env is being read
npm start

# In your browser console, you should see:
# App connecting to: http://localhost:8000

# For production build
npm run build
# Should use URL from .env.production
```

---

**Status**: ✅ Core setup complete and PPEManagementScreen updated as example
