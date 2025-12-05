# 🎯 Treasure Hunt Game

A location-based treasure hunt game built with Next.js. Find hidden treasures using GPS, navigate with a compass, and reveal scratch cards when you reach the target location!

## Features

- 📍 Real-time GPS tracking
- 📏 Accurate distance calculation using Haversine formula
- 🗺️ Smart Google Maps integration (walking for <1km, driving for >=1km)
- 🎴 Scratch card code reveal system
- 🔐 PocketBase database integration for production
- 👨‍💼 Admin panel for managing locations
- 📱 Mobile-friendly (iPhone & Android)
- 🔐 HTTPS support for GPS access

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup PocketBase (Production)

For production database:

1. Create `.env.local` file:
```bash
NEXT_PUBLIC_POCKETBASE_URL=http://72.61.235.215:8090
```

2. Setup PocketBase collections (see [POCKETBASE_SETUP.md](./POCKETBASE_SETUP.md))

3. Admin credentials:
   - Email: `admin@srv1178811.hstgr.cloud`
   - Password: `R@J4evergmail`

### 3. Run Development Server

For HTTP (localhost only):
```bash
npm run dev
```

For HTTPS (required for mobile devices on network):
```bash
npm run dev:https
```

The HTTPS server will automatically create self-signed certificates on first run.

### 4. Access the App

- **Local:** http://localhost:3000 (or https://localhost:3000 for HTTPS)
- **Network:** https://[YOUR_IP]:3000 (for mobile devices)

**Important:** For GPS to work on mobile devices, you must use HTTPS. Accept the self-signed certificate warning when accessing via network IP.

## Usage

1. **Admin Panel** (`/admin`): 
   - Login with PocketBase credentials
   - Set target coordinates for the treasure
   - Manage multiple locations
2. **Game Page** (`/game`): 
   - Allow GPS permission
   - Navigate to the target location
   - Click "Open in Google Maps" for step-by-step directions
   - When within 50 meters, click "Open AR Camera"
   - View your 6-character code in AR camera!

## Deploy on Vercel

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/treasure-hunt-game.git
git push -u origin main
```

### Step 2: Deploy to Vercel

1. Go to [Vercel](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

### Step 3: Add Environment Variables

In Vercel project settings, add:

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

**Important:** 
- Vercel automatically provides HTTPS, so GPS will work on mobile devices
- Make sure your Google Maps API key has proper restrictions set in Google Cloud Console
- Add your Vercel domain to allowed domains in Google Maps API settings

### Step 4: Deploy

Click "Deploy" and wait for the build to complete. Your app will be live at `https://your-project.vercel.app`

### Post-Deployment

1. **Test GPS**: Open the deployed URL on a mobile device and test GPS functionality
2. **Update API Restrictions**: In Google Cloud Console, add your Vercel domain to allowed referrers
3. **Custom Domain** (Optional): Add a custom domain in Vercel settings

## Project Structure

- `app/game/page.tsx` - Main game page with GPS tracking
- `app/admin/page.tsx` - Admin panel for setting coordinates
- `app/components/ARCamera.tsx` - AR camera component for code reveal
- `app/utils/location.ts` - Location calculation utilities (Haversine formula)
- `server.js` - Local HTTPS server (development only, not used in production)

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
