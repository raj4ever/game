'use client';

import { useState, useEffect } from 'react';
import { 
  adminLogin, 
  logout, 
  checkAuth,
  createLocation, 
  updateLocation,
  setActiveLocation,
  deactivateLocation,
  deleteLocation,
  getAllLocations, 
  getActiveLocation 
} from '../utils/supabase';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lat, setLat] = useState('21.855204');
  const [lon, setLon] = useState('70.249010');
  const [name, setName] = useState('First Location');
  const [winningAmount, setWinningAmount] = useState('0');
  const [minimumTeamSize, setMinimumTeamSize] = useState('1');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [locations, setLocations] = useState<any[]>([]);
  const [activeLocation, setActiveLocationState] = useState<any>(null);
  const [email, setEmail] = useState('raj4everwap@gmail.com');
  const [password, setPassword] = useState('R@J4ever');
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  const [editWinningAmount, setEditWinningAmount] = useState<string>('');
  const [editMinimumTeamSize, setEditMinimumTeamSize] = useState<string>('1');

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
        setActiveLocationState(active);
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
      const amount = parseFloat(winningAmount) || 0;
      const teamSize = parseInt(minimumTeamSize) || 1;
      await createLocation(lat, lon, name, amount, teamSize);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setLat('21.855204');
      setLon('70.249010');
      setName('First Location');
      setWinningAmount('0');
      setMinimumTeamSize('1');
      await loadLocations();
    } catch (err: any) {
      setError(err.message || 'Failed to save location');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetActive = async (locationId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setError('');
    setIsLoading(true);
    try {
      console.log('[Admin] Setting active location:', locationId);
      const result = await setActiveLocation(locationId);
      console.log('[Admin] Active location set result:', result);
      console.log('[Admin] Result type:', typeof result);
      console.log('[Admin] Result value:', JSON.stringify(result));
      
      if (!result) {
        throw new Error('Location activation returned no result. Please try again.');
      }
      
      setError(''); // Clear any previous errors
      // Force reload locations to get fresh data from database
      await loadLocations();
    } catch (err: any) {
      console.error('[Admin] Set active error:', err);
      console.error('[Admin] Error details:', JSON.stringify(err, null, 2));
      setError(err.message || 'Failed to set active location. Make sure you are logged in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivate = async (locationId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setError('');
    setIsLoading(true);
    try {
      console.log('Deactivating location:', locationId);
      const result = await deactivateLocation(locationId);
      console.log('Location deactivated:', result);
      
      setError(''); // Clear any previous errors
      await loadLocations();
    } catch (err: any) {
      console.error('Deactivate error:', err);
      setError(err.message || 'Failed to deactivate location. Make sure you are logged in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (locationId: string, locationName: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Confirm deletion
    const confirmMessage = `Are you sure you want to delete "${locationName || 'this location'}"? This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      console.log('[Admin] Deleting location:', locationId);
      await deleteLocation(locationId);
      console.log('[Admin] Location deleted successfully');
      
      setError(''); // Clear any previous errors
      // Force reload locations to get fresh data from database
      await loadLocations();
    } catch (err: any) {
      console.error('[Admin] Delete error:', err);
      setError(err.message || 'Failed to delete location. Make sure you are logged in.');
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Winning Amount (₹)
              </label>
              <input
                type="number"
                value={winningAmount}
                onChange={(e) => setWinningAmount(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Amount user will win when they complete this location</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Team Size
              </label>
              <input
                type="number"
                value={minimumTeamSize}
                onChange={(e) => setMinimumTeamSize(e.target.value)}
                placeholder="1"
                min="1"
                step="1"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                1 = Single player, 2 = Team of 2 required, 4 = Team of 4 required, etc.
              </p>
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
                        {loc.winning_amount && parseFloat(loc.winning_amount) > 0 && (
                          <p className="text-sm text-green-600 font-semibold mt-1">
                            ₹{parseFloat(loc.winning_amount).toFixed(2)}
                          </p>
                        )}
                        <p className="text-sm text-blue-600 font-medium mt-1">
                          Team Size: {loc.minimum_team_size || 1} {loc.minimum_team_size === 1 ? 'player' : 'players'}
                        </p>
                        {loc.active && (
                          <span className="inline-block mt-1 px-2 py-1 bg-green-600 text-white text-xs rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(e) => loc.active ? handleDeactivate(loc.id, e) : handleSetActive(loc.id, e)}
                          disabled={isLoading}
                          className={`px-4 py-2 text-white text-sm rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${
                            loc.active 
                              ? 'bg-orange-600 hover:bg-orange-700' 
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          {isLoading ? 'Updating...' : loc.active ? 'Deactivate' : 'Set Active'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingLocation(loc.id);
                            setEditWinningAmount(loc.winning_amount?.toString() || '0');
                            setEditMinimumTeamSize(loc.minimum_team_size?.toString() || '1');
                          }}
                          disabled={isLoading}
                          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(loc.id, loc.name || 'Unnamed Location', e)}
                          disabled={isLoading}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                    {/* Edit Location Form */}
                    {editingLocation === loc.id && (
                      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Winning Amount (₹)
                          </label>
                          <input
                            type="number"
                            value={editWinningAmount}
                            onChange={(e) => setEditWinningAmount(e.target.value)}
                            placeholder="0"
                            min="0"
                            step="0.01"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Minimum Team Size
                          </label>
                          <input
                            type="number"
                            value={editMinimumTeamSize}
                            onChange={(e) => setEditMinimumTeamSize(e.target.value)}
                            placeholder="1"
                            min="1"
                            step="1"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            1 = Single player, 2 = Team of 2, 4 = Team of 4, etc.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setError('');
                              setIsLoading(true);
                              try {
                                const amount = parseFloat(editWinningAmount) || 0;
                                const teamSize = parseInt(editMinimumTeamSize) || 1;
                                await updateLocation(loc.id, { 
                                  winning_amount: amount,
                                  minimum_team_size: teamSize
                                });
                                setEditingLocation(null);
                                await loadLocations();
                              } catch (err: any) {
                                setError(err.message || 'Failed to update location');
                              } finally {
                                setIsLoading(false);
                              }
                            }}
                            disabled={isLoading}
                            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setEditingLocation(null);
                              setEditWinningAmount('');
                              setEditMinimumTeamSize('1');
                            }}
                            disabled={isLoading}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
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
