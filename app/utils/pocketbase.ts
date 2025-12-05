// PocketBase client utility
// Using custom API routes to avoid mixed content issues (HTTPS -> HTTP)

const API_BASE = '/api/pocketbase';
const POCKETBASE_URL = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://72.61.235.215:8090';

// Store auth token
let authToken: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
}

export function clearAuthToken() {
  authToken = null;
}

function getAuthHeaders() {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  // Get token from state or localStorage
  const token = authToken || (typeof window !== 'undefined' ? localStorage.getItem('pb_auth_token') : null);
  if (token) {
    // PocketBase expects Authorization header format: "Bearer {token}" or just the token
    headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }
  return headers;
}

// Admin authentication
export async function adminLogin(email: string, password: string) {
  try {
    const response = await fetch(`${API_BASE}/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include', // Include cookies
    });

    const data = await response.json();
    
    if (response.ok) {
      // PocketBase admin auth returns: { token, admin: {...} }
      const token = data.token;
      if (token) {
        setAuthToken(token);
        if (typeof window !== 'undefined') {
          localStorage.setItem('pb_auth_token', token);
        }
        return data;
      } else {
        throw new Error('Token not received from server');
      }
    } else {
      const errorMsg = data.message || data.error?.message || data.error || 'Login failed';
      throw new Error(errorMsg);
    }
  } catch (error: any) {
    console.error('Admin login error:', error);
    throw error;
  }
}

// Get active location (first location)
export async function getActiveLocation() {
  try {
    const response = await fetch(`${API_BASE}/locations?active=true`);
    const data = await response.json();
    
    if (response.ok && data.items && data.items.length > 0) {
      const location = data.items[0];
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
    const response = await fetch(`${API_BASE}/locations/${id}`);
    const data = await response.json();
    
    if (response.ok) {
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

// Create or update location
export async function saveLocation(lat: string, lon: string, name?: string) {
  try {
    // Check if active location exists
    const existingResponse = await fetch(`${API_BASE}/locations?active=true`);
    const existingData = await existingResponse.json();

    if (existingData.items && existingData.items.length > 0) {
      // Update existing
      const response = await fetch(`${API_BASE}/locations/${existingData.items[0].id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
          name: name || 'Treasure Location',
          active: true,
        }),
      });
      const data = await response.json();
      return data;
    } else {
      // Create new
      const response = await fetch(`${API_BASE}/locations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          latitude: lat,
          longitude: lon,
          name: name || 'Treasure Location',
          active: true,
        }),
      });
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.error('Error saving location:', error);
    throw error;
  }
}

// Get all locations
export async function getAllLocations() {
  try {
    const response = await fetch(`${API_BASE}/locations`);
    const data = await response.json();
    
    if (response.ok && data.items) {
      return data.items;
    }
    return [];
  } catch (error) {
    console.error('Error fetching locations:', error);
    return [];
  }
}

// Verify code
export async function verifyCode(code: string, locationId: string) {
  try {
    const response = await fetch(
      `${API_BASE}/codes?code=${encodeURIComponent(code.toUpperCase())}&location_id=${locationId}&used=false`
    );
    const data = await response.json();
    
    if (response.ok && data.items && data.items.length > 0) {
      const codeRecord = data.items[0];
      
      // Mark code as used
      await fetch(`${API_BASE}/codes/${codeRecord.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          used: true,
          used_at: new Date().toISOString(),
        }),
      });
      
      // Get next location
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
    
    const response = await fetch(`${API_BASE}/codes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        code: code,
        location_id: locationId,
        next_location_id: nextLocationId || '',
        used: false,
      }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      return code;
    } else {
      throw new Error(data.message || 'Failed to create code');
    }
  } catch (error) {
    console.error('Error generating code:', error);
    throw error;
  }
}

