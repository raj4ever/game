// PocketBase client utility
import PocketBase from 'pocketbase';

const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://72.61.235.215:8090';

// Create PocketBase client instance
export const pb = new PocketBase(POCKETBASE_URL);

// Admin authentication
export async function adminLogin(email: string, password: string) {
  try {
    const authData = await pb.admins.authWithPassword(email, password);
    return authData;
  } catch (error) {
    console.error('Admin login error:', error);
    throw error;
  }
}

// Get active location (first location)
export async function getActiveLocation() {
  try {
    const records = await pb.collection('locations').getList(1, 1, {
      filter: 'active = true',
      sort: '-created',
    });
    
    if (records.items.length > 0) {
      const location = records.items[0];
      return {
        lat: parseFloat(location.latitude),
        lon: parseFloat(location.longitude),
        id: location.id,
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
    const record = await pb.collection('locations').getOne(id);
    return {
      lat: parseFloat(record.latitude),
      lon: parseFloat(record.longitude),
      id: record.id,
      name: record.name || '',
    };
  } catch (error) {
    console.error('Error fetching location:', error);
    return null;
  }
}

// Create or update location
export async function saveLocation(lat: string, lon: string, name?: string) {
  try {
    // Check if active location exists
    const existing = await pb.collection('locations').getList(1, 1, {
      filter: 'active = true',
    });

    if (existing.items.length > 0) {
      // Update existing
      const record = await pb.collection('locations').update(existing.items[0].id, {
        latitude: lat,
        longitude: lon,
        name: name || 'Treasure Location',
        active: true,
      });
      return record;
    } else {
      // Create new
      const record = await pb.collection('locations').create({
        latitude: lat,
        longitude: lon,
        name: name || 'Treasure Location',
        active: true,
      });
      return record;
    }
  } catch (error) {
    console.error('Error saving location:', error);
    throw error;
  }
}

// Get all locations
export async function getAllLocations() {
  try {
    const records = await pb.collection('locations').getFullList({
      sort: '-created',
    });
    return records;
  } catch (error) {
    console.error('Error fetching locations:', error);
    return [];
  }
}

// Verify code
export async function verifyCode(code: string, locationId: string) {
  try {
    const records = await pb.collection('codes').getList(1, 1, {
      filter: `code = "${code.toUpperCase()}" && location_id = "${locationId}" && used = false`,
    });
    
    if (records.items.length > 0) {
      // Mark code as used
      await pb.collection('codes').update(records.items[0].id, {
        used: true,
        used_at: new Date().toISOString(),
      });
      
      // Get next location
      const codeRecord = records.items[0];
      if (codeRecord.next_location_id) {
        return await getLocationById(codeRecord.next_location_id);
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
    
    const record = await pb.collection('codes').create({
      code: code,
      location_id: locationId,
      next_location_id: nextLocationId || '',
      used: false,
    });
    
    return code;
  } catch (error) {
    console.error('Error generating code:', error);
    throw error;
  }
}

