// Supabase client utility
import { createClient } from '@supabase/supabase-js';
import { calculateDistance } from './location';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Create Supabase client with proper configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json',
    },
  },
});

// Admin authentication (using Supabase Auth)
export async function adminLogin(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    // Session is automatically stored by Supabase client
    // No need to manually store token
    return data;
  } catch (error: any) {
    console.error('Admin login error:', error);
    throw error;
  }
}

// Check if user is authenticated
export async function checkAuth() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session !== null;
  } catch (error) {
    return false;
  }
}

// Logout
export async function logout() {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Get active location
export async function getActiveLocation() {
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(); // Use maybeSingle() instead of single() to handle no rows gracefully

    if (error) {
      console.error('Supabase error:', error);
      return null;
    }

    if (data && data.latitude && data.longitude) {
      return {
        lat: parseFloat(data.latitude),
        lon: parseFloat(data.longitude),
        id: data.id,
        name: data.name || '',
        winning_amount: parseFloat(data.winning_amount || '0') || 0,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching location:', error);
    return null;
  }
}

// Get location by ID
export async function getLocationById(id: string) {
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    if (data) {
      return {
        lat: parseFloat(data.latitude),
        lon: parseFloat(data.longitude),
        id: data.id,
        name: data.name || '',
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching location:', error);
    return null;
  }
}

// Get all locations
export async function getAllLocations() {
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching locations:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching locations:', error);
    return [];
  }
}

// Get nearest location from user's current location
export async function getNearestLocation(userLat: number, userLon: number, excludeLocationIds: string[] = []): Promise<{
  lat: number;
  lon: number;
  id: string;
  name: string;
  winning_amount: number;
} | null> {
  try {
    // Get all locations
    const allLocations = await getAllLocations();
    
    if (!allLocations || allLocations.length === 0) {
      return null;
    }

    // Filter out excluded locations (completed locations)
    const availableLocations = allLocations.filter((loc: any) => 
      !excludeLocationIds.includes(loc.id) && loc.latitude && loc.longitude
    );

    if (availableLocations.length === 0) {
      return null;
    }

    // Calculate distance to each location and find nearest
    let nearestLocation: any = null;
    let minDistance = Infinity;

    for (const location of availableLocations) {
      const locLat = parseFloat(location.latitude);
      const locLon = parseFloat(location.longitude);
      
      // Calculate distance using Haversine formula from utility
      const distance = calculateDistance(userLat, userLon, locLat, locLon);

      if (distance < minDistance) {
        minDistance = distance;
        nearestLocation = location;
      }
    }

    if (nearestLocation) {
      return {
        lat: parseFloat(nearestLocation.latitude),
        lon: parseFloat(nearestLocation.longitude),
        id: nearestLocation.id,
        name: nearestLocation.name || '',
        winning_amount: parseFloat(nearestLocation.winning_amount || '0') || 0,
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting nearest location:', error);
    return null;
  }
}

// Create location
export async function createLocation(lat: string, lon: string, name?: string, winning_amount?: number, minimum_team_size?: number) {
  try {
    const { data, error } = await supabase
      .from('locations')
      .insert({
        latitude: lat,
        longitude: lon,
        name: name || 'Treasure Location',
        active: false,
        winning_amount: winning_amount || 0,
        minimum_team_size: minimum_team_size || 1,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error creating location:', error);
    throw error;
  }
}

// Update location
export async function updateLocation(id: string, updates: {
  latitude?: string;
  longitude?: string;
  name?: string;
  active?: boolean;
  winning_amount?: number;
}) {
  try {
    const { data, error } = await supabase
      .from('locations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error updating location:', error);
    throw error;
  }
}

// Set active location (allow multiple active locations)
export async function setActiveLocation(id: string) {
  console.log('[setActiveLocation] Starting with ID:', id);
  try {
    // Check if user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('[setActiveLocation] Session error:', sessionError);
    }
    if (!session) {
      console.error('[setActiveLocation] No session found');
      throw new Error('You must be logged in to set active location');
    }

    console.log('[setActiveLocation] User authenticated, session:', session.user.email);

    // Activate the selected location (no need to deactivate others - allow multiple active)
    console.log('[setActiveLocation] Attempting to update location:', id);
    const { data, error } = await supabase
      .from('locations')
      .update({ active: true })
      .eq('id', id)
      .select('*');

    console.log('[setActiveLocation] Update response - data:', data, 'error:', error);

    if (error) {
      console.error('[setActiveLocation] Error activating location:', error);
      console.error('[setActiveLocation] Error code:', error.code);
      console.error('[setActiveLocation] Error message:', error.message);
      console.error('[setActiveLocation] Error details:', JSON.stringify(error, null, 2));
      // More detailed error message
      if (error.code === 'PGRST301' || error.message.includes('permission') || error.message.includes('row-level security')) {
        throw new Error('Permission denied. Make sure you are logged in and have permission to update locations.');
      }
      throw new Error(`Failed to set active location: ${error.message}`);
    }

    // Check if data array has items
    let locationData = null;
    
    if (data && data.length > 0) {
      locationData = data[0];
      console.log('Location activated successfully (from update response):', locationData);
    } else {
      console.warn('No data returned from update, trying to verify...');
      // Try to fetch the location to verify it was updated
      // This can happen if RLS prevents returning the updated row
      const { data: verifyData, error: verifyError } = await supabase
        .from('locations')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (verifyError) {
        console.error('Error verifying location:', verifyError);
        throw new Error(`Location update may have failed: ${verifyError.message}`);
      }
      
      if (!verifyData) {
        throw new Error('Location not found after update. Please refresh and try again.');
      }
      
      locationData = verifyData;
      console.log('Location verified (from separate query):', locationData);
    }

    // Ensure we have valid location data
    if (!locationData || !locationData.id) {
      throw new Error('Invalid location data returned. Please try again.');
    }

    // Return formatted location object
    if (!locationData.latitude || !locationData.longitude) {
      console.error('[setActiveLocation] Invalid location data - missing coordinates:', locationData);
      throw new Error('Location data is missing required fields (latitude/longitude).');
    }

    const result = {
      lat: parseFloat(locationData.latitude),
      lon: parseFloat(locationData.longitude),
      id: locationData.id,
      name: locationData.name || '',
      active: locationData.active === true || locationData.active === 'true',
    };

    console.log('[setActiveLocation] Returning location:', result);
    console.log('[setActiveLocation] Result type check:', typeof result, result !== undefined, result !== null);
    
    if (!result || !result.id) {
      console.error('[setActiveLocation] Result validation failed:', result);
      throw new Error('Failed to format location data. Please try again.');
    }
    
    return result;
  } catch (error: any) {
    console.error('[setActiveLocation] Error caught:', error);
    console.error('[setActiveLocation] Error stack:', error.stack);
    throw error;
  }
}

// Deactivate a location
export async function deactivateLocation(id: string) {
  try {
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be logged in to deactivate location');
    }

    // Deactivate the selected location
    const { data, error } = await supabase
      .from('locations')
      .update({ active: false })
      .eq('id', id)
      .select('*');

    if (error) {
      console.error('Error deactivating location:', error);
      throw new Error(`Failed to deactivate location: ${error.message}`);
    }

    let locationData = null;

    if (data && data.length > 0) {
      locationData = data[0];
      console.log('Location deactivated successfully (from update response):', locationData);
    } else {
      console.warn('No data returned from deactivate, verifying...');
      // Verify by fetching
      const { data: verifyData, error: verifyError } = await supabase
        .from('locations')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (verifyError) {
        console.error('Error verifying location:', verifyError);
        throw new Error(`Location deactivation may have failed: ${verifyError.message}`);
      }

      if (!verifyData) {
        throw new Error('Location not found after deactivation. Please refresh and try again.');
      }

      locationData = verifyData;
      console.log('Location verified (from separate query):', locationData);
    }

    // Ensure we have valid location data
    if (!locationData || !locationData.id) {
      throw new Error('Invalid location data returned. Please try again.');
    }

    // Return formatted location object
    const result = {
      lat: parseFloat(locationData.latitude),
      lon: parseFloat(locationData.longitude),
      id: locationData.id,
      name: locationData.name || '',
      active: locationData.active || false,
    };

    console.log('Returning deactivated location:', result);
    return result;
  } catch (error: any) {
    console.error('Error deactivating location:', error);
    throw error;
  }
}

// Delete a location
export async function deleteLocation(id: string) {
  try {
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be logged in to delete location');
    }

    console.log('[deleteLocation] Attempting to delete location:', id);

    // Delete the location
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[deleteLocation] Error deleting location:', error);
      if (error.code === 'PGRST301' || error.message.includes('permission') || error.message.includes('row-level security')) {
        throw new Error('Permission denied. Make sure you are logged in and have permission to delete locations.');
      }
      throw new Error(`Failed to delete location: ${error.message}`);
    }

    console.log('[deleteLocation] Location deleted successfully');
    return { success: true };
  } catch (error: any) {
    console.error('[deleteLocation] Error:', error);
    throw error;
  }
}

// Check if user already completed a location
export async function hasUserCompletedLocation(userId: string, locationId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_completed_locations')
      .select('id')
      .eq('user_id', userId)
      .eq('location_id', locationId)
      .maybeSingle();

    if (error) {
      console.error('Error checking completed location:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in hasUserCompletedLocation:', error);
    return false;
  }
}

// Get all locations completed by user
export async function getUserCompletedLocations(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('user_completed_locations')
      .select('location_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Error getting completed locations:', error);
      return [];
    }

    return data?.map((item: any) => item.location_id) || [];
  } catch (error) {
    console.error('Error in getUserCompletedLocations:', error);
    return [];
  }
}

// Mark location as completed for user
export async function markLocationAsCompleted(userId: string, locationId: string, codeId: string, winningAmount: number) {
  try {
    const { error } = await supabase
      .from('user_completed_locations')
      .upsert({
        user_id: userId,
        location_id: locationId,
        code_id: codeId,
        winning_amount: winningAmount,
        completed_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,location_id',
      });

    if (error) {
      console.error('Error marking location as completed:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in markLocationAsCompleted:', error);
    return false;
  }
}

// Verify code with user tracking
export async function verifyCode(code: string, locationId: string, userId?: string) {
  try {
    // Check if user already completed this location
    if (userId) {
      const alreadyCompleted = await hasUserCompletedLocation(userId, locationId);
      if (alreadyCompleted) {
        console.log('User already completed this location');
        return { error: 'You have already completed this location.' };
      }
    }

    const { data, error } = await supabase
      .from('codes')
      .select('*, next_location:next_location_id(*), current_location:location_id(*)')
      .eq('code', code.toUpperCase().trim())
      .eq('location_id', locationId)
      .eq('used', false)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - code not found
        return null;
      }
      throw error;
    }

    if (data) {
      // Get winning amount from current location
      const currentLocation = data.current_location;
      const winningAmount = currentLocation?.winning_amount 
        ? parseFloat(currentLocation.winning_amount) || 0 
        : 0;

      // Mark code as used
      await supabase
        .from('codes')
        .update({
          used: true,
          used_at: new Date().toISOString(),
        })
        .eq('id', data.id);

      // Mark location as completed for user (if userId provided)
      if (userId) {
        await markLocationAsCompleted(userId, locationId, data.id, winningAmount);
      }

      // Get next location if exists
      if (data.next_location_id && data.next_location) {
        // Get winning amount from next location, not current location
        const nextLocationWinningAmount = data.next_location.winning_amount 
          ? parseFloat(data.next_location.winning_amount) || 0 
          : 0;
        
        return {
          lat: parseFloat(data.next_location.latitude),
          lon: parseFloat(data.next_location.longitude),
          id: data.next_location.id,
          name: data.next_location.name || '',
          winning_amount: nextLocationWinningAmount, // Next location's winning amount
          codeId: data.id, // Return code ID for team completion tracking
        };
      } else {
        // Return winning amount even if no next location
        return {
          winning_amount: winningAmount,
          codeId: data.id, // Return code ID for team completion tracking
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Error verifying code:', error);
    return null;
  }
}

// Generate and save code for location
export async function generateCodeForLocation(locationId: string, nextLocationId?: string) {
  try {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const { data, error } = await supabase
      .from('codes')
      .insert({
        code: code,
        location_id: locationId,
        next_location_id: nextLocationId || null,
        used: false,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return code;
  } catch (error) {
    console.error('Error generating code:', error);
    throw error;
  }
}

// Get IP address (client-side helper - actual IP will come from server)
async function getUserIP(): Promise<string | null> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || null;
  } catch (error) {
    console.error('Error fetching IP:', error);
    return null;
  }
}

// Check if device fingerprint already has an account
export async function checkDeviceFingerprint(deviceFingerprint: string): Promise<{ exists: boolean; userId?: string; userDisplay?: string }> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('user_id, user_display')
      .eq('device_fingerprint', deviceFingerprint)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error checking device fingerprint:', error);
      return { exists: false };
    }

    if (data) {
      return {
        exists: true,
        userId: data.user_id,
        userDisplay: data.user_display,
      };
    }

    return { exists: false };
  } catch (error) {
    console.error('Error in checkDeviceFingerprint:', error);
    return { exists: false };
  }
}

// Get next user number from database (server-side counter)
export async function getNextUserNumber(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_next_user_number');

    if (error) {
      console.error('Error getting next user number:', error);
      // Fallback: get max user number and increment
      const { data: maxData, error: maxError } = await supabase
        .from('users')
        .select('user_display');
      
      if (!maxError && maxData) {
        let maxNum = 0;
        maxData.forEach((user: any) => {
          const match = user.user_display?.match(/User (\d+)/);
          if (match) {
            const num = parseInt(match[1]);
            if (num > maxNum) maxNum = num;
          }
        });
        return maxNum + 1;
      }
      return 1; // Default fallback
    }

    return data || 1;
  } catch (error) {
    console.error('Error in getNextUserNumber:', error);
    return 1;
  }
}

// Create or update user in database with device fingerprint
export async function createOrUpdateUser(userId: string, userDisplay: string, deviceFingerprint?: string, ipAddress?: string) {
  try {
    // If device fingerprint is provided, check if account already exists
    if (deviceFingerprint) {
      const existing = await checkDeviceFingerprint(deviceFingerprint);
      
      if (existing.exists && existing.userId) {
        // Device already has an account - use existing account
        console.log('Device already has account:', existing.userId);
        
        // Update last seen and IP
        const updateData: any = {
          last_seen: new Date().toISOString(),
          is_online: true,
        };
        if (ipAddress) {
          updateData.ip_address = ipAddress;
        }

        const { data, error } = await supabase
          .from('users')
          .update(updateData)
          .eq('user_id', existing.userId)
          .select()
          .single();

        if (error) {
          console.error('Error updating existing user:', error);
          return { data: null, isExisting: true, existingUserId: existing.userId, existingUserDisplay: existing.userDisplay };
        }

        return { data, isExisting: true, existingUserId: existing.userId, existingUserDisplay: existing.userDisplay };
      }
    }

    // Create new account
    const userData: any = {
      user_id: userId,
      user_display: userDisplay,
      last_seen: new Date().toISOString(),
      is_online: true,
    };

    if (deviceFingerprint) {
      userData.device_fingerprint = deviceFingerprint;
    }

    if (ipAddress) {
      userData.ip_address = ipAddress;
    }

    const { data, error } = await supabase
      .from('users')
      .upsert(userData, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating/updating user:', error);
      // Don't throw - this is non-critical
      return { data: null, isExisting: false };
    }

    return { data, isExisting: false };
  } catch (error) {
    console.error('Error in createOrUpdateUser:', error);
    return { data: null, isExisting: false };
  }
}

// Create new user with auto-assigned user number from database
export async function createNewUser(deviceFingerprint?: string, ipAddress?: string): Promise<{ userId: string; userDisplay: string } | null> {
  try {
    // Get next user number from database (atomic increment)
    const userNumber = await getNextUserNumber();
    const userDisplay = `User ${userNumber}`;
    const userId = `user-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Create user with device fingerprint
    const result = await createOrUpdateUser(userId, userDisplay, deviceFingerprint, ipAddress);
    
    if (result.isExisting) {
      return {
        userId: result.existingUserId || userId,
        userDisplay: result.existingUserDisplay || userDisplay,
      };
    }

    return {
      userId,
      userDisplay,
    };
  } catch (error) {
    console.error('Error creating new user:', error);
    return null;
  }
}

// Update user's last seen timestamp (mark as online)
export async function updateUserLastSeen(userId: string) {
  try {
    const { error } = await supabase
      .from('users')
      .update({
        last_seen: new Date().toISOString(),
        is_online: true,
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating user last seen:', error);
    }
  } catch (error) {
    console.error('Error in updateUserLastSeen:', error);
  }
}

// Get count of online players (active in last 5 minutes)
export async function getOnlinePlayersCount(): Promise<number> {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('last_seen', fiveMinutesAgo)
      .eq('is_online', true);

    if (error) {
      console.error('Error getting online players count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getOnlinePlayersCount:', error);
    return 0;
  }
}

// Mark users as offline (cleanup old entries)
export async function cleanupOfflineUsers() {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { error } = await supabase
      .from('users')
      .update({ is_online: false })
      .lt('last_seen', tenMinutesAgo)
      .eq('is_online', true);

    if (error) {
      console.error('Error cleaning up offline users:', error);
    }
  } catch (error) {
    console.error('Error in cleanupOfflineUsers:', error);
  }
}

// Add winning amount to user's total
export async function addWinningsToUser(userId: string, amount: number) {
  try {
    // First get current total
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('total_winnings')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching user winnings:', fetchError);
      return null;
    }

    const currentTotal = parseFloat(userData?.total_winnings || '0') || 0;
    const newTotal = currentTotal + amount;

    // Update total winnings
    const { data, error } = await supabase
      .from('users')
      .update({ total_winnings: newTotal })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user winnings:', error);
      return null;
    }

    return { total_winnings: newTotal };
  } catch (error) {
    console.error('Error in addWinningsToUser:', error);
    return null;
  }
}

// Get user's total winnings
export async function getUserTotalWinnings(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('total_winnings')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user total winnings:', error);
      return 0;
    }

    return parseFloat(data?.total_winnings || '0') || 0;
  } catch (error) {
    console.error('Error in getUserTotalWinnings:', error);
    return 0;
  }
}

// ========== TEAM MANAGEMENT FUNCTIONS ==========

// Generate unique team code
function generateTeamCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a new team
export async function createTeam(userId: string, locationId: string): Promise<{ teamId: string; teamCode: string } | null> {
  try {
    // Check if user is already in a team for this location
    const existingTeam = await getUserTeam(userId, locationId);
    if (existingTeam) {
      return { teamId: existingTeam.teamId, teamCode: existingTeam.teamCode };
    }

    // Generate unique team code
    let teamCode = generateTeamCode();
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from('teams')
        .select('id')
        .eq('team_code', teamCode)
        .maybeSingle();
      
      if (!existing) break;
      teamCode = generateTeamCode();
      attempts++;
    }

    // Create team
    const { data, error } = await supabase
      .from('teams')
      .insert({
        team_code: teamCode,
        created_by: userId,
        current_location_id: locationId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating team:', error);
      return null;
    }

    // Add creator as team member
    await addTeamMember(data.id, userId, 'leader');

    return { teamId: data.id, teamCode: data.team_code };
  } catch (error) {
    console.error('Error in createTeam:', error);
    return null;
  }
}

// Add member to team
export async function addTeamMember(teamId: string, userId: string, role: string = 'member'): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
        role: role,
      });

    if (error) {
      console.error('Error adding team member:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in addTeamMember:', error);
    return false;
  }
}

// Get user's current team for a location
export async function getUserTeam(userId: string, locationId: string): Promise<{ teamId: string; teamCode: string; memberCount: number } | null> {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select('team_id, teams!inner(team_code, current_location_id)')
      .eq('user_id', userId)
      .eq('teams.current_location_id', locationId);

    if (error || !data || data.length === 0) {
      return null;
    }

    const teamId = data[0].team_id;
    const teamCode = (data[0].teams as any).team_code;

    // Get member count
    const { count } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId);

    return {
      teamId,
      teamCode,
      memberCount: count || 0,
    };
  } catch (error) {
    console.error('Error in getUserTeam:', error);
    return null;
  }
}

// Get team members
export async function getTeamMembers(teamId: string): Promise<Array<{ userId: string; userDisplay: string; role: string; joinedAt: string }>> {
  try {
    // First get team members
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select('user_id, role, joined_at')
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true });

    if (membersError) {
      console.error('Error getting team members:', membersError);
      return [];
    }

    if (!members || members.length === 0) {
      return [];
    }

    // Get user details for each member
    const userIds = members.map((m: any) => m.user_id);
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('user_id, user_display')
      .in('user_id', userIds);

    if (usersError) {
      console.error('Error getting user details:', usersError);
      // Return members without user display names
      return members.map((member: any) => ({
        userId: member.user_id,
        userDisplay: member.user_id, // Fallback to user_id if display name not available
        role: member.role,
        joinedAt: member.joined_at,
      }));
    }

    // Create a map of user_id to user_display
    const userMap = new Map(
      (users || []).map((u: any) => [u.user_id, u.user_display])
    );

    // Combine member data with user display names
    return members.map((member: any) => ({
      userId: member.user_id,
      userDisplay: userMap.get(member.user_id) || member.user_id,
      role: member.role,
      joinedAt: member.joined_at,
    }));
  } catch (error) {
    console.error('Error in getTeamMembers:', error);
    return [];
  }
}

// Generate QR code invite for team
export async function generateTeamInvite(teamId: string, locationId: string, userId: string): Promise<{ inviteCode: string; qrData: string } | null> {
  try {
    // Generate unique invite code
    const inviteCode = `INV-${generateTeamCode()}-${Date.now().toString(36).substring(0, 6).toUpperCase()}`;
    
    // Expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('team_invites')
      .insert({
        invite_code: inviteCode,
        team_id: teamId,
        location_id: locationId,
        created_by: userId,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      console.error('Error generating team invite:', error);
      return null;
    }

    // Create QR code data (JSON with invite code and team info)
    const qrData = JSON.stringify({
      type: 'team_invite',
      inviteCode: inviteCode,
      teamId: teamId,
      locationId: locationId,
    });

    return { inviteCode, qrData };
  } catch (error) {
    console.error('Error in generateTeamInvite:', error);
    return null;
  }
}

// Join team via invite code with location validation
export async function joinTeamByInvite(inviteCode: string, userId: string, userLocationId?: string): Promise<{ success: boolean; teamId?: string; error?: string }> {
  try {
    // Get invite
    const { data: invite, error: inviteError } = await supabase
      .from('team_invites')
      .select('*, teams!inner(id, team_code, current_location_id)')
      .eq('invite_code', inviteCode)
      .eq('used', false)
      .single();

    if (inviteError || !invite) {
      return { success: false, error: 'Invalid or expired invite code' };
    }

    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
      return { success: false, error: 'Invite code has expired' };
    }

    // SECURITY: Check if both users are at the same location
    const inviteLocationId = invite.location_id;
    const teamLocationId = (invite.teams as any).current_location_id;
    
    if (userLocationId && inviteLocationId !== userLocationId) {
      return { 
        success: false, 
        error: 'You must be at the same location as the team creator to join. Please reach the location first.' 
      };
    }

    if (userLocationId && teamLocationId !== userLocationId) {
      return { 
        success: false, 
        error: 'You must be at the same location as the team to join. Please reach the location first.' 
      };
    }

    // Check if user is already in this team
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', invite.team_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingMember) {
      return { success: false, error: 'You are already in this team' };
    }

    // Add user to team
    const added = await addTeamMember(invite.team_id, userId);
    if (!added) {
      return { success: false, error: 'Failed to join team' };
    }

    // Mark invite as used
    await supabase
      .from('team_invites')
      .update({
        used: true,
        used_by: userId,
        used_at: new Date().toISOString(),
      })
      .eq('id', invite.id);

    return { success: true, teamId: invite.team_id };
  } catch (error) {
    console.error('Error in joinTeamByInvite:', error);
    return { success: false, error: 'Failed to join team' };
  }
}

// Check if team has completed a location
export async function hasTeamCompletedLocation(teamId: string, locationId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('team_completed_locations')
      .select('id')
      .eq('team_id', teamId)
      .eq('location_id', locationId)
      .maybeSingle();

    if (error) {
      console.error('Error checking team completed location:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in hasTeamCompletedLocation:', error);
    return false;
  }
}

// Mark location as completed by team
export async function markLocationAsCompletedByTeam(
  teamId: string,
  locationId: string,
  codeId: string,
  winningAmount: number,
  nextLocationId?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('team_completed_locations')
      .upsert({
        team_id: teamId,
        location_id: locationId,
        code_id: codeId,
        winning_amount: winningAmount,
        completed_at: new Date().toISOString(),
      }, {
        onConflict: 'team_id,location_id',
      });

    if (error) {
      console.error('Error marking location as completed by team:', error);
      return false;
    }

    // Update team's current location to next location if available
    if (nextLocationId) {
      await supabase
        .from('teams')
        .update({ 
          current_location_id: nextLocationId,
          updated_at: new Date().toISOString()
        })
        .eq('id', teamId);
    }

    // Distribute winnings to all team members
    const members = await getTeamMembers(teamId);
    const amountPerMember = winningAmount / members.length;

    for (const member of members) {
      await addWinningsToUser(member.userId, amountPerMember);
    }

    return true;
  } catch (error) {
    console.error('Error in markLocationAsCompletedByTeam:', error);
    return false;
  }
}

// Get location's minimum team size requirement
export async function getLocationTeamRequirement(locationId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('minimum_team_size')
      .eq('id', locationId)
      .single();

    if (error || !data) {
      return 1; // Default to 1 (single player)
    }

    return parseInt(data.minimum_team_size) || 1;
  } catch (error) {
    console.error('Error getting location team requirement:', error);
    return 1;
  }
}

