# Environment Variables Setup

This document explains how to configure environment variables for the frontend application.

## Overview

The application uses environment variables to manage configuration across different environments (development, staging, production). These variables are loaded from `.env` and `.env.production` files.

## Files

- **`.env`** - Development environment variables (local machine)
- **`.env.production`** - Production environment variables (deployed app)
- **`.env.example`** - Template file showing all available variables (COMMITTED TO GIT)
- **`.env.local`** - Local overrides (ignored by git, never committed)
- **`.env.production.local`** - Production overrides (ignored by git, never committed)

## Setup Instructions

### Development Environment

1. **Create `.env` file** (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env`** with your local settings:
   ```bash
   REACT_APP_API_URL=http://localhost:8000
   REACT_APP_ENV=development
   ```

3. **Start the development server**:
   ```bash
   npm start
   # or
   expo start
   ```

The app will automatically load variables from `.env`.

### Production Environment

For production deployments, use `.env.production`:

1. **Create `.env.production`**:
   ```bash
   REACT_APP_API_URL=https://api.yourdomain.com
   REACT_APP_ENV=production
   ```

2. **Build for production**:
   ```bash
   npm run build
   # or
   expo export
   ```

The build process will use variables from `.env.production`.

### Override Variables Locally

To override variables on your machine without committing changes:

1. **Create `.env.local`** (ignored by git):
   ```bash
   REACT_APP_API_URL=http://192.168.1.100:8000
   ```

2. **For production overrides**, create `.env.production.local`:
   ```bash
   REACT_APP_API_URL=https://staging.yourdomain.com
   ```

## Available Variables

| Variable | Default | Description | Environment |
|----------|---------|-------------|-------------|
| `REACT_APP_API_URL` | `http://localhost:8000` | Backend API base URL | dev, prod |
| `REACT_APP_ENV` | `development` | Application environment | dev, prod |

## Usage in Code

### Option 1: Using the Centralized Config

```typescript
// Recommended approach
import { API_BASE_URL, isProduction } from '../config/env';

const response = await axios.get(`${API_BASE_URL}/api/v1/endpoint/`);

if (isProduction) {
  // Production-specific logic
}
```

### Option 2: Direct Environment Variable Access

```typescript
// Still works, but not recommended - use config/env.ts instead
const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
```

## Migration Guide

If you're currently using hardcoded URLs in your code:

**Before:**
```typescript
const baseURL = 'http://localhost:8000';
const response = await axios.get(`${baseURL}/api/v1/endpoint/`);
```

**After:**
```typescript
import { API_BASE_URL } from '../config/env';
const response = await axios.get(`${API_BASE_URL}/api/v1/endpoint/`);
```

## Git Configuration

The following files are **ignored by git**:
- `.env.local`
- `.env.production.local`
- `.env.*.local`

The following files are **committed to git**:
- `.env.example` (template only)

**Never commit**:
- `.env` (contains development secrets)
- `.env.production` (contains production secrets)

## CI/CD Integration

For CI/CD pipelines (GitHub Actions, GitLab CI, etc.):

1. **Set environment variables** in your CI/CD platform settings (GitHub Secrets, GitLab Variables, etc.)
2. **Create `.env.production`** during the build step:
   ```bash
   echo "REACT_APP_API_URL=$API_URL" > .env.production
   echo "REACT_APP_ENV=production" >> .env.production
   ```
3. **Build** with the generated files

## Troubleshooting

### Variables Not Updating

React/Expo caches environment variables at build time. After changing `.env`:

1. **Stop the development server** (Ctrl+C)
2. **Clear cache**: `expo r -c` or `npm cache clean`
3. **Restart**: `npm start` or `expo start`

### Variable Shows as Undefined

Ensure the variable name starts with `REACT_APP_`:
- ✅ `REACT_APP_API_URL` - Accessible via `process.env.REACT_APP_API_URL`
- ❌ `API_URL` - NOT accessible (won't be exposed)

### Different Values in Build vs Runtime

Environment variables are baked into the build at compile time. For runtime configuration, you may need to:

1. Load from a config API endpoint
2. Use AsyncStorage for user-specific settings
3. Use feature flags service

## Best Practices

1. ✅ **Always use `.env.example`** as a template for new variables
2. ✅ **Use centralized config file** (`config/env.ts`) for import consistency
3. ✅ **Never commit `.env`** or `.env.production` files
4. ✅ **Document all variables** in `.env.example` with descriptions
5. ✅ **Use provider environment variables** in CI/CD instead of files
6. ❌ **Don't hardcode URLs** in component files
7. ❌ **Don't store secrets** in environment files
8. ❌ **Don't commit `.env.*.local`** files

## References

- [React - Environment Variables](https://create-react-app.dev/docs/adding-custom-environment-variables/)
- [Expo - Environment Variables](https://docs.expo.dev/build-reference/variables/)
- [12 Factor App - Config](https://12factor.net/config)
