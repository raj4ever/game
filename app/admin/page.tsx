'use client';

import { useState, useEffect } from 'react';
import { 
  adminLogin, 
  logout, 
  checkAuth,
  createLocation, 
  updateLocation,
  setActiveLocation,
  getAllLocations, 
  getActiveLocation 
} from '../utils/supabase';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lat, setLat] = useState('21.855204');
  const [lon, setLon] = useState('70.249010');
  const [name, setName] = useState('First Location');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [locations, setLocations] = useState<any[]>([]);
  const [activeLocation, setActiveLocation] = useState<any>(null);
  const [email, setEmail] = useState('raj4everwap@gmail.com');
  const [password, setPassword] = useState('R@J4ever');

  // Check if already authenticated
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const isAuth = await checkAuth();
        setIsAuthenticated(isAuth);
        if (isAuth) {
          await loadLocations();
        }
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuthentication();
  }, []);

  const loadLocations = async () => {
    try {
      const allLocations = await getAllLocations();
      setLocations(allLocations || []);
      
      const active = await getActiveLocation();
      if (active && active.lat && active.lon) {
        setActiveLocation(active);
        setLat(active.lat.toString());
        setLon(active.lon.toString());
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await adminLogin(email, password);
      setIsAuthenticated(true);
      await loadLocations();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!lat || !lon || !name) {
      setError('Please enter location name, latitude, and longitude');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await createLocation(lat, lon, name);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setLat('21.855204');
      setLon('70.249010');
      setName('First Location');
      await loadLocations();
    } catch (err: any) {
      setError(err.message || 'Failed to save location');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetActive = async (locationId: string) => {
    setError('');
    setIsLoading(true);
    try {
      const result = await setActiveLocation(locationId);
      if (result) {
        setError(''); // Clear any previous errors
        await loadLocations(); // Reload to show updated state
      } else {
        setError('Failed to set active location. Please try again.');
      }
    } catch (err: any) {
      console.error('Set active error:', err);
      setError(err.message || 'Failed to set active location. Make sure you are logged in.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 p-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
              🔐 Admin Login
            </h1>
            <form onSubmit={handleLogin}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-purple-600 text-white rounded-lg font-bold text-lg hover:bg-purple-700 transition shadow-lg disabled:opacity-50"
                >
                  {isLoading ? 'Logging in...' : 'Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto mt-8">
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">
              🎯 Admin Panel
            </h1>
            <button
              onClick={async () => {
                await logout();
                setIsAuthenticated(false);
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>

          <p className="text-gray-600 mb-6">
            Manage treasure hunt locations and settings
          </p>

          {/* Active Location Info */}
          {activeLocation && activeLocation.lat && activeLocation.lon && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Active Location:</strong> {activeLocation.lat.toFixed(6)}, {activeLocation.lon.toFixed(6)}
              </p>
            </div>
          )}

          {/* Save New Location */}
          <div className="space-y-4 mb-8">
            <h2 className="text-xl font-semibold text-gray-800">Set Target Location</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="First Location"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Latitude
              </label>
              <input
                type="text"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="21.855204"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Longitude
              </label>
              <input
                type="text"
                value={lon}
                onChange={(e) => setLon(e.target.value)}
                placeholder="70.249010"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="w-full py-4 bg-purple-600 text-white rounded-lg font-bold text-lg hover:bg-purple-700 transition shadow-lg disabled:opacity-50"
            >
              {saved ? '✓ Saved!' : isLoading ? 'Saving...' : 'Save Location'}
            </button>
          </div>

          {/* All Locations List */}
          {locations.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">All Locations</h2>
              <div className="space-y-2">
                {locations.map((loc) => (
                  <div
                    key={loc.id}
                    className={`p-4 border rounded-lg ${
                      loc.active ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-800">{loc.name || 'Unnamed Location'}</p>
                        <p className="text-sm text-gray-600">
                          {parseFloat(loc.latitude).toFixed(6)}, {parseFloat(loc.longitude).toFixed(6)}
                        </p>
                        {loc.active && (
                          <span className="inline-block mt-1 px-2 py-1 bg-green-600 text-white text-xs rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <div>
                        {!loc.active && (
                          <button
                            onClick={() => handleSetActive(loc.id)}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                          >
                            Set Active
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 text-center">
            <a
              href="/game"
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              Go to Game →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
