# 🚀 Vercel Deployment Guide

## Prerequisites

1. GitHub account
2. Vercel account (sign up at https://vercel.com)

## Step-by-Step Deployment

### Step 1: Push Code to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Ready for Vercel deployment"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Vercel

1. **Go to Vercel**: https://vercel.com
2. **Sign in** with your GitHub account
3. **Click "Add New Project"**
4. **Import your repository** from GitHub
5. **Configure Project**:
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)

### Step 3: Deploy

1. Click **Deploy**
2. Wait for build to complete (usually 1-2 minutes)
3. Your app will be live at: `https://your-project.vercel.app`

## Post-Deployment Setup

### 1. Test GPS Functionality

1. Open your deployed URL on a mobile device
2. Go to `/game` page
3. Allow GPS permission
4. Test the location tracking

### 2. Custom Domain (Optional)

1. In Vercel project settings, go to **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update Google Maps API restrictions to include your custom domain

## Important Notes

✅ **HTTPS**: Vercel automatically provides HTTPS, so GPS will work on mobile devices

✅ **No API Keys Required**: App uses Haversine formula for distance calculation

✅ **Google Maps Integration**: "Open in Google Maps" button opens native app/web for directions

✅ **Build**: The project builds successfully and is ready for production

## Troubleshooting

### GPS Not Working
- Make sure you're accessing via HTTPS (Vercel provides this automatically)
- Check browser console for errors
- Verify GPS permissions are granted

### Google Maps Button Not Working
- Make sure you're on a mobile device or have Google Maps app installed
- Check if browser allows opening external apps
- Try on different browsers (Chrome, Safari)

### Build Fails
- Check Vercel build logs
- Ensure all dependencies are in `package.json`
- Verify TypeScript compilation passes locally

## Production Checklist

- [ ] Code pushed to GitHub
- [ ] Project deployed on Vercel
- [ ] GPS tested on mobile device
- [ ] Google Maps button tested
- [ ] Custom domain configured (if needed)
- [ ] Admin panel tested
- [ ] AR camera tested

## Support

For issues or questions:
- Check Vercel logs: Project Settings > Logs
- Check Next.js documentation: https://nextjs.org/docs
- Check Vercel documentation: https://vercel.com/docs

