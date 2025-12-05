# 🔒 Security Features

## Anti-Cheat System

This document describes the security features implemented to prevent cheating in the Treasure Hunt game.

## Device Fingerprinting

### What is Device Fingerprinting?
Device fingerprinting creates a unique identifier for each device/browser combination using multiple characteristics:

- Screen resolution and color depth
- Browser user agent
- Language and timezone settings
- Hardware information (CPU cores, memory)
- Canvas fingerprinting (graphics rendering)
- WebGL fingerprinting (graphics card information)

### How It Prevents Cheating
- **One Account Per Device**: Each device can only have one account, regardless of browser
- **Automatic Detection**: When a device with an existing account is detected, the system automatically uses the existing account
- **Persistent Tracking**: Device fingerprint is stored in the database and cannot be easily changed

## Security Features

### 1. Device-Based Account Limitation
- ✅ Prevents creating multiple accounts from the same device
- ✅ Automatically detects and reuses existing account
- ✅ Works across all browsers on the same device

### 2. IP Address Tracking
- ✅ Tracks user's IP address for additional security
- ✅ Can help identify suspicious activity patterns
- ✅ Stored securely in database

### 3. Database-Level Security
- ✅ Device fingerprint stored in `users` table
- ✅ Indexed for fast lookups
- ✅ Cannot be bypassed by client-side manipulation

### 4. User ID System
- ✅ Permanent user ID stored in database
- ✅ Synced with database device fingerprint
- ✅ Cannot create multiple accounts by clearing browser data

## How It Works

### User Registration Flow

1. **Device Fingerprint Generation**
   - System generates a unique fingerprint when user first visits
   - Based on multiple device/browser characteristics
   - Stored in database for persistent tracking

2. **Existing Account Check**
   - System checks database for existing account with same fingerprint
   - If found, automatically loads existing account
   - Prevents creation of duplicate accounts

3. **New Account Creation**
   - Only creates new account if device fingerprint is unique
   - Stores fingerprint in database
   - Tracks IP address for security

4. **Account Recovery**
   - If user switches browsers on same device
   - System automatically detects existing account
   - Loads previous account and winnings

## Limitations

### What It Prevents
- ✅ Creating multiple accounts from same device
- ✅ Using different browsers to create multiple accounts
- ✅ Clearing browser data to create new account

### What It Doesn't Prevent
- ⚠️ Using different physical devices (each device gets one account)
- ⚠️ Using VPN/Proxy (IP tracking may vary)
- ⚠️ Factory reset of device (new fingerprint after reset)

## Technical Implementation

### Files Modified
- `app/utils/deviceFingerprint.ts` - Device fingerprinting utility
- `app/utils/supabase.ts` - Database functions for security checks
- `app/game/page.tsx` - User initialization with security checks

### Database Schema
```sql
ALTER TABLE users ADD COLUMN device_fingerprint TEXT;
ALTER TABLE users ADD COLUMN ip_address TEXT;
CREATE INDEX idx_users_device_fingerprint ON users(device_fingerprint);
```

### Functions
- `generateDeviceFingerprint()` - Creates unique device fingerprint
- `checkDeviceFingerprint()` - Checks for existing account
- `createOrUpdateUser()` - Creates user with security checks

## Privacy Considerations

- Device fingerprinting is used only for preventing cheating
- IP addresses are stored for security purposes only
- No personal information is collected
- All data is stored securely in Supabase database

## Testing

To test the security features:

1. Create an account on a device
2. Try to create a new account using a different browser on the same device
3. System should automatically load the existing account
4. Check database to verify only one account exists per device fingerprint

