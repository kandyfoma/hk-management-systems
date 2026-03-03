# KAT OHMS Landing Page

Professional landing page for the KAT Occupational Health Management System deployed on Vercel.

## Overview

This is a Next.js-based landing page that showcases the features and benefits of the KAT OHMS platform. The site is optimized for performance, SEO, and conversion with modern design and responsive layout.

## Features

- ✅ Hero section with compelling value proposition
- ✅ Comprehensive features showcase
- ✅ Specialized modules display
- ✅ Benefits and compliance information
- ✅ Call-to-action sections
- ✅ Mobile-responsive design
- ✅ Performance optimized
- ✅ SEO-friendly metadata
- ✅ Tailwind CSS styling

## Tech Stack

- **Framework**: Next.js 14
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Language**: TypeScript
- **Deployment**: Vercel

## Getting Started

### Prerequisites
- Node.js 18+ or later
- npm or yarn package manager

### Installation

1. Navigate to the website directory:
```bash
cd frontend/website
```

2. Install dependencies:
```bash
npm install
```

3. Run development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
website/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   └── globals.css         # Global styles
├── components/
│   ├── Header.tsx          # Navigation header
│   ├── HeroSection.tsx      # Hero banner
│   ├── FeaturesSection.tsx  # Features showcase
│   ├── ModulesSection.tsx   # Modules display
│   ├── BenefitsSection.tsx  # Benefits section
│   ├── ComplianceSection.tsx # Compliance info
│   ├── CTASection.tsx       # Call-to-action
│   └── Footer.tsx           # Footer
├── public/                  # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
└── next.config.js
```

## Deploying to Vercel

### Option 1: Using Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy from the website directory:
```bash
cd frontend/website
vercel --prod
```

3. Follow the prompts to link to your Vercel account

### Option 2: Using GitHub Integration

1. Push the code to your GitHub repository
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Set the root directory to `frontend/website`
6. Click "Deploy"

### Option 3: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New..." → "Project"
3. Paste your Git repository URL
4. Configure settings:
   - **Root Directory**: `frontend/website`
   - **Framework**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. Click "Deploy"

## Configuration

### Domain Setup

After deployment, configure your domain:

1. **Landing Page**: www.katohms.com
   - Go to Vercel Project Settings
   - Add domain "www.katohms.com"
   - Update DNS records to point to Vercel

2. **Application**: app.katohms.com
   - In the landing page, links point to `https://app.katohms.com`
   - Deploy the main application to a separate Vercel project with this domain

### Environment Variables

Create a `.env.local` file (optional):
```
NEXT_PUBLIC_APP_URL=https://app.katohms.com
```

## Building for Production

```bash
npm run build
npm run start
```

## Performance Optimization

- ✅ Image optimization with Next.js Image
- ✅ Code splitting and lazy loading
- ✅ CSS minification with Tailwind
- ✅ Static generation for faster page loads
- ✅ SEO metadata optimization

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Customization

### Colors
Update `tailwind.config.js` to customize brand colors:
```js
colors: {
  primary: '#122056',
  primaryLight: '#1E3A8A',
  accent: '#818CF8',
  // ... more colors
}
```

### Content
Edit component files in `components/` to update content:
- `HeroSection.tsx` - Hero banner text
- `FeaturesSection.tsx` - Features list
- `ModulesSection.tsx` - Module details
- `BenefitsSection.tsx` - Benefits content
- `ComplianceSection.tsx` - Compliance standards
- `CTASection.tsx` - Call-to-action

### Layout
Modify `app/page.tsx` to reorder sections or add new ones

## Analytics & Monitoring

### Google Analytics
Add to `app/layout.tsx`:
```tsx
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
```

### Vercel Analytics
Analytics are automatically available in the Vercel dashboard

## SEO Optimization

- ✅ Responsive meta tags in `app/layout.tsx`
- ✅ Open Graph tags for social sharing
- ✅ Structured heading hierarchy
- ✅ Alt text for images
- ✅ Fast Core Web Vitals

## Troubleshooting

### Build Issues
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Deployment Issues
- Check Vercel project settings
- Verify environment variables
- Review build logs in Vercel dashboard
- Ensure Node version compatibility

## Support

For issues or questions:
- 📧 Email: support@katohms.com
- 📞 Phone: +1 (234) 567-890
- 🌐 Website: https://www.katohms.com

## License

All rights reserved © 2024 KAT Systems
