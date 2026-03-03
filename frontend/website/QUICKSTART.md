# Quick Start Guide - KAT OHMS Landing Page

Get up and running with the KAT OHMS landing page in 5 minutes.

## 1️⃣ Setup (2 minutes)

```bash
# Navigate to website directory
cd frontend/website

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. ✅

## 2️⃣ Basic Customization (3 minutes)

### Change Logo & Company Name
Edit `components/Header.tsx`:
```tsx
<span className="font-bold text-lg text-primary">
  KAT OHMS  {/* Change this */}
</span>
```

### Update Hero Title
Edit `components/HeroSection.tsx`:
```tsx
<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
  Your New Title Here
</h1>
```

### Modify Colors
Edit `tailwind.config.js`:
```js
colors: {
  primary: '#122056',      // Change brand color
  accent: '#818CF8',       // Change accent color
  // ... update other colors
}
```

### Update Links
- App link: Search for `app.katohms.com` and replace
- Support email: Search for `support@katohms.com` and replace
- Phone: Search for `+1234567890` and replace

## 3️⃣ Build for Production

```bash
npm run build
npm run start
```

## 4️⃣ Deploy to Vercel

### First Time
```bash
npm install -g vercel
vercel --prod
```

### Subsequent Updates
```bash
git add .
git commit -m "Update landing page"
git push origin main
# Vercel automatically deploys on push
```

## 📁 File Structure Quick Reference

```
components/
├── Header.tsx           ← Navigation & logo
├── HeroSection.tsx      ← Main banner
├── FeaturesSection.tsx  ← 6 key features
├── ModulesSection.tsx   ← 6 modules
├── BenefitsSection.tsx  ← Benefits & stats
├── ComplianceSection.tsx ← Standards & certs
├── CTASection.tsx       ← Action buttons
└── Footer.tsx           ← Links & info

app/
├── page.tsx            ← Main page structure
├── layout.tsx          ← HTML layout & metadata
└── globals.css         ← Global styles
```

## 🎨 Common Customizations

### Add New Section
1. Create file: `components/NewSection.tsx`
2. Import in `app/page.tsx`
3. Add to JSX

### Change Feature Icons
Replace imports in component:
```tsx
import { Heart, AlertCircle, Shield } from 'lucide-react'
// Browse more at: https://lucide.dev
```

### Add Images
Place in `public/` folder and reference:
```tsx
<img src="/image-name.png" alt="Description" />
```

### Update Content
- **Text**: Edit JSX in component files
- **Lists**: Update array objects (features, modules, benefits)
- **Links**: Search and replace URLs

## 🚀 Deployment Checklist

- [ ] Content updated
- [ ] Colors customized
- [ ] Links verified
- [ ] Images added (if needed)
- [ ] Mobile responsive check
- [ ] Build test: `npm run build`
- [ ] Deployed to Vercel
- [ ] Domain configured
- [ ] Analytics setup

## 📊 Analytics

View in Vercel Dashboard:
- Real-time traffic
- Performance metrics
- Build history
- Deployment analytics

## 🐛 Debug Mode

Check browser console (F12) for errors:
```bash
# Check for console errors
npm run dev

# Fix TypeScript issues
npm run lint
```

## ❓ Need Help?

### Common Issues

**Port 3000 in use?**
```bash
npm run dev -- -p 3001
```

**Build errors?**
```bash
rm -rf .next node_modules
npm install
npm run build
```

**Cache issues?**
```bash
# Clear cache
npm run build -- --no-cache
```

### Resources
- Next.js Docs: https://nextjs.org/docs
- Tailwind CSS: https://tailwindcss.com/docs
- Lucide Icons: https://lucide.dev
- Vercel Docs: https://vercel.com/docs

## 📞 Support

- Email: support@katohms.com
- Docs: Check README.md for detailed guide
- Deployment: See DEPLOYMENT.md

---

**Happy building! 🎉**
