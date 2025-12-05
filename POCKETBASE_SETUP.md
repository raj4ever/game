# PocketBase Setup Guide

## Database Collections Setup

You need to create the following collections in your PocketBase admin panel:

### 1. Collection: `locations`

**Fields:**
- `latitude` (text, required) - Latitude coordinate
- `longitude` (text, required) - Longitude coordinate  
- `name` (text, optional) - Location name
- `active` (bool, default: false) - Whether this is the active location
- `created` (date, auto) - Creation timestamp
- `updated` (date, auto) - Update timestamp

**Indexes:**
- Create index on `active` field for faster queries

**Rules:**
- Admin can create, update, delete
- Public can only read active locations

### 2. Collection: `codes`

**Fields:**
- `code` (text, required, unique) - 6-character code
- `location_id` (relation, required) - Reference to locations collection
- `next_location_id` (relation, optional) - Reference to next location
- `used` (bool, default: false) - Whether code has been used
- `used_at` (date, optional) - When code was used
- `created` (date, auto) - Creation timestamp

**Indexes:**
- Create index on `code` field
- Create index on `location_id` field
- Create index on `used` field

**Rules:**
- Admin can create, update, delete
- Public can only read unused codes for verification

## Environment Variables

Add to `.env.local`:

```
NEXT_PUBLIC_POCKETBASE_URL=http://72.61.235.215:8090
```

For Vercel deployment, add this in Vercel project settings → Environment Variables.

## Initial Setup Steps

1. **Login to PocketBase Admin:**
   - Go to: http://72.61.235.215:8090/_/
   - Login with: admin@srv1178811.hstgr.cloud / R@J4evergmail

2. **Create Collections:**
   - Go to Collections → New Collection
   - Create `locations` collection with fields above
   - Create `codes` collection with fields above

3. **Set Collection Rules:**
   - For `locations`: Allow public read for active locations
   - For `codes`: Allow public read for unused codes

4. **Create First Location:**
   - Go to Admin Panel in app: `/admin`
   - Login with credentials
   - Set first location coordinates
   - Save

## Testing

1. Admin Panel: `/admin` - Login and set locations
2. Game: `/game` - Should fetch active location from PocketBase
3. Code Verification: Enter code to unlock next location

## Troubleshooting

- **CORS Issues**: Make sure PocketBase allows requests from your domain
- **Authentication**: Check if admin credentials are correct
- **Collection Names**: Must be exactly `locations` and `codes`
- **Field Names**: Must match exactly as specified

