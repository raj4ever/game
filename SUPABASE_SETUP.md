# Supabase Setup Guide

This document outlines the steps to set up your Supabase instance for the Treasure Hunt Game.

## Step 1: Create Supabase Project

1. Go to [Supabase](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in project details:
   - **Name:** Treasure Hunt Game (or any name)
   - **Database Password:** Choose a strong password (save it!)
   - **Region:** Choose closest to your users
4. Wait for project to be created (takes 1-2 minutes)

## Step 2: Get API Credentials

1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

## Step 3: Create Database Tables

Go to **SQL Editor** in Supabase dashboard and run these SQL commands:

### Table 1: `locations`

```sql
CREATE TABLE locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  latitude TEXT NOT NULL,
  longitude TEXT NOT NULL,
  name TEXT,
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Create policy: Allow public read access
CREATE POLICY "Allow public read access" ON locations
  FOR SELECT USING (true);

-- Create policy: Allow authenticated users to insert/update
CREATE POLICY "Allow authenticated insert" ON locations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update" ON locations
  FOR UPDATE USING (auth.role() = 'authenticated');
```

### Table 2: `codes`

```sql
CREATE TABLE codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  next_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE codes ENABLE ROW LEVEL SECURITY;

-- Create policy: Allow public read access
CREATE POLICY "Allow public read access" ON codes
  FOR SELECT USING (true);

-- Create policy: Allow authenticated users to insert/update
CREATE POLICY "Allow authenticated insert" ON codes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update" ON codes
  FOR UPDATE USING (auth.role() = 'authenticated');
```

## Step 4: Create Admin User

1. Go to **Authentication** → **Users** in Supabase dashboard
2. Click **Add User** → **Create new user**
3. Enter:
   - **Email:** `admin@srv1178811.hstgr.cloud` (or your admin email)
   - **Password:** `R@J4evergmail` (or your admin password)
   - **Auto Confirm User:** ✅ (check this)
4. Click **Create User**

## Step 5: Set Environment Variables

### For Local Development

Create a `.env.local` file in your project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### For Vercel Deployment

1. Go to your Vercel project settings
2. Go to **Environment Variables**
3. Add these variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your Supabase anon key

## Step 6: Test the Setup

1. Run your Next.js app: `npm run dev`
2. Go to `/admin` and login with your admin credentials
3. Add a location and set it as active
4. Go to `/game` and test the game flow

## Security Notes

- The `anon` key is safe to use in client-side code (it's public)
- Row Level Security (RLS) policies protect your data
- Only authenticated users can create/update locations and codes
- Public users can only read data (which is needed for the game)

## Troubleshooting

### "Invalid API key" error
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly
- Make sure there are no extra spaces in the values

### "Row Level Security policy violation"
- Check that RLS policies are created correctly
- Make sure you're logged in as an authenticated user for write operations

### "Relation does not exist"
- Make sure you've run the SQL commands to create the tables
- Check table names match exactly: `locations` and `codes`

