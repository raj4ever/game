// Supabase client utility
import { createClient } from '@supabase/supabase-js';

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
    if (typeof window !== 'undefined') {
      localStorage.removeItem('supabase_auth_token');
    }
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

// Create location
export async function createLocation(lat: string, lon: string, name?: string) {
  try {
    const { data, error } = await supabase
      .from('locations')
      .insert({
        latitude: lat,
        longitude: lon,
        name: name || 'Treasure Location',
        active: false,
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

// Set active location (deactivate others, activate this one)
export async function setActiveLocation(id: string) {
  try {
    // Check if user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Session error:', sessionError);
    }
    if (!session) {
      throw new Error('You must be logged in to set active location');
    }

    console.log('User authenticated, session:', session.user.email);

    // First, deactivate all locations
    const { error: deactivateError } = await supabase
      .from('locations')
      .update({ active: false })
      .eq('active', true);

    if (deactivateError) {
      console.error('Error deactivating locations:', deactivateError);
      // Continue anyway - might be no active locations
    } else {
      console.log('All locations deactivated');
    }

    // Then activate the selected location
    const { data, error } = await supabase
      .from('locations')
      .update({ active: true })
      .eq('id', id)
      .select('*')
      .maybeSingle(); // Use maybeSingle to handle cases gracefully

    if (error) {
      console.error('Error activating location:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', JSON.stringify(error, null, 2));
      // More detailed error message
      if (error.code === 'PGRST301' || error.message.includes('permission') || error.message.includes('row-level security')) {
        throw new Error('Permission denied. Make sure you are logged in and have permission to update locations.');
      }
      throw new Error(`Failed to set active location: ${error.message}`);
    }

    if (!data) {
      console.warn('No data returned from update, but update might have succeeded');
      // Try to fetch the location to verify it was updated
      const { data: verifyData, error: verifyError } = await supabase
        .from('locations')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (verifyError) {
        console.error('Error verifying location:', verifyError);
        throw new Error('Location update may have failed. Please refresh and try again.');
      }
      
      if (verifyData && verifyData.active) {
        console.log('Location verified as active:', verifyData);
        return verifyData;
      }
      
      throw new Error('Location not found or update failed');
    }

    console.log('Location activated successfully:', data);
    return data;
  } catch (error: any) {
    console.error('Error setting active location:', error);
    throw error;
  }
}

// Verify code
export async function verifyCode(code: string, locationId: string) {
  try {
    const { data, error } = await supabase
      .from('codes')
      .select('*, next_location:next_location_id(*)')
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
      // Mark code as used
      await supabase
        .from('codes')
        .update({
          used: true,
          used_at: new Date().toISOString(),
        })
        .eq('id', data.id);

      // Get next location if exists
      if (data.next_location_id && data.next_location) {
        return {
          lat: parseFloat(data.next_location.latitude),
          lon: parseFloat(data.next_location.longitude),
          id: data.next_location.id,
          name: data.next_location.name || '',
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

