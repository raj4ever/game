'use client';

import { useState, useEffect, useRef } from 'react';
import ScratchCard from '../components/ScratchCard';
import { calculateDistance, formatDistance, LocationSmoother } from '../utils/location';
import { getActiveLocation, verifyCode, generateCodeForLocation } from '../utils/pocketbase';

// Default target coordinates
const DEFAULT_TARGET_LAT = 21.855204;
const DEFAULT_TARGET_LON = 70.249010;
// Second location coordinates (after code entry)
const SECOND_LOCATION_LAT = 21.741518;
const SECOND_LOCATION_LON = 70.277832;
const REACH_DISTANCE = 50; // Distance in meters to consider "reached"

// Generate a random 6-character code
function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function GamePage() {
  const [targetCoords, setTargetCoords] = useState({ lat: DEFAULT_TARGET_LAT, lon: DEFAULT_TARGET_LON });
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [hasReached, setHasReached] = useState(false);
  const [showScratchCard, setShowScratchCard] = useState(false);
  const [code, setCode] = useState<string>('');
  const [enteredCode, setEnteredCode] = useState<string>('');
  const [codeVerified, setCodeVerified] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const locationSmootherRef = useRef(new LocationSmoother());

  // Load target coordinates from PocketBase
  useEffect(() => {
    const loadLocation = async () => {
      try {
        const location = await getActiveLocation();
        if (location) {
          setTargetCoords({ lat: location.lat, lon: location.lon });
          setCurrentLocationId(location.id);
        }
      } catch (error) {
        console.error('Error loading location:', error);
        // Fallback to defaults
        setTargetCoords({ lat: DEFAULT_TARGET_LAT, lon: DEFAULT_TARGET_LON });
      }
    };
    
    loadLocation();
    
    // Refresh location every 30 seconds
    const interval = setInterval(loadLocation, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Request location permission and start tracking
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          // Fix accuracy - some browsers return undefined
          const actualAccuracy = accuracy !== undefined && accuracy !== null ? accuracy : 100;
          
          // Smooth the location for better accuracy
          const smoothed = locationSmootherRef.current.addPosition(latitude, longitude, actualAccuracy);
          setUserLocation({ lat: smoothed.lat, lon: smoothed.lon });
          setGpsAccuracy(actualAccuracy);
          setIsLoading(false);
          setError(''); // Clear any previous errors
          
          // Calculate distance using Haversine formula
          const dist = calculateDistance(smoothed.lat, smoothed.lon, targetCoords.lat, targetCoords.lon);
          setDistance(dist);
          
          if (dist <= REACH_DISTANCE) {
            setHasReached(true);
          }
        },
        (err) => {
          let errorMessage = 'Location permission denied. Please enable GPS to play.';
          
          // More specific error messages
          switch(err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please allow location access in browser settings and refresh the page.';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable. Please check your GPS settings.';
              break;
            case err.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
            default:
              errorMessage = 'Error getting location. Please check your GPS settings and try again.';
              break;
          }
          
          setError(errorMessage);
          setIsLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 20000, // Increased timeout
          maximumAge: 0, // Always get fresh data
        }
      );

      // Watch position changes
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          // Fix accuracy - some browsers return undefined
          const actualAccuracy = accuracy !== undefined && accuracy !== null ? accuracy : 100;
          
          // Only process if accuracy is reasonable (filter out very poor readings)
          if (actualAccuracy > 100) {
            // Skip very inaccurate readings, but still update if it's the only data
            if (gpsAccuracy && gpsAccuracy < 50) {
              return; // Skip if we have better accuracy data
            }
          }
          
          // Smooth the location for better accuracy
          const smoothed = locationSmootherRef.current.addPosition(latitude, longitude, actualAccuracy);
          setUserLocation({ lat: smoothed.lat, lon: smoothed.lon });
          setGpsAccuracy(actualAccuracy);
          
          // Calculate distance using Haversine formula
          const dist = calculateDistance(smoothed.lat, smoothed.lon, targetCoords.lat, targetCoords.lon);
          setDistance(dist);
          
          if (dist <= REACH_DISTANCE && !hasReached) {
            setHasReached(true);
          } else if (dist > REACH_DISTANCE && hasReached) {
            setHasReached(false);
            setShowScratchCard(false);
          }
        },
        (err) => {
          setError('Error getting location: ' + err.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0, // Always get fresh data
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
      setIsLoading(false);
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [targetCoords.lat, targetCoords.lon, hasReached]);


  const handleRevealClick = async () => {
    if (hasReached && !showScratchCard && currentLocationId) {
      try {
        // Generate code in PocketBase
        const newCode = await generateCodeForLocation(currentLocationId);
        setCode(newCode);
        setShowScratchCard(true);
      } catch (error) {
        // Fallback to local code generation
        const newCode = generateCode();
        setCode(newCode);
        setShowScratchCard(true);
        console.error('Error generating code:', error);
      }
    }
  };

  const handleScratchReveal = () => {
    // Code revealed in scratch card, show code input
    setShowCodeInput(true);
  };

  const handleCodeSubmit = async () => {
    if (!currentLocationId) {
      setError('Location not loaded. Please refresh the page.');
      return;
    }

    try {
      // Verify code with PocketBase
      const nextLocation = await verifyCode(enteredCode.toUpperCase().trim(), currentLocationId);
      
      if (nextLocation) {
        // Code verified, move to next location
        setCodeVerified(true);
        setShowCodeInput(false);
        setTargetCoords({
          lat: nextLocation.lat,
          lon: nextLocation.lon,
        });
        setCurrentLocationId(nextLocation.id);
        // Reset states for next location
        setHasReached(false);
        setShowScratchCard(false);
        setCode('');
        setEnteredCode('');
      } else {
        // Fallback: check local code
        if (enteredCode.toUpperCase().trim() === code.toUpperCase().trim()) {
          setCodeVerified(true);
          setShowCodeInput(false);
          // Use second location as fallback
          setTargetCoords({
            lat: SECOND_LOCATION_LAT,
            lon: SECOND_LOCATION_LON,
          });
          setHasReached(false);
          setShowScratchCard(false);
          setCode('');
          setEnteredCode('');
        } else {
          setError('Invalid code! Please try again.');
          setTimeout(() => setError(''), 3000);
        }
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      // Fallback to local verification
      if (enteredCode.toUpperCase().trim() === code.toUpperCase().trim()) {
        setCodeVerified(true);
        setShowCodeInput(false);
        setTargetCoords({
          lat: SECOND_LOCATION_LAT,
          lon: SECOND_LOCATION_LON,
        });
        setHasReached(false);
        setShowScratchCard(false);
        setCode('');
        setEnteredCode('');
      } else {
        setError('Invalid code! Please try again.');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const handleOpenGoogleMaps = () => {
    if (userLocation && distance !== null) {
      // Open Google Maps with directions
      const origin = `${userLocation.lat},${userLocation.lon}`;
      const destination = `${targetCoords.lat},${targetCoords.lon}`;
      
      // Determine mode based on distance
      // If distance < 1000m (meters), use walking mode
      // If distance >= 1000m (kilometers), use driving mode
      const mode = distance < 1000 ? 'walking' : 'driving';
      const modeCode = distance < 1000 ? 'w' : 'd'; // w = walking, d = driving
      const webMode = distance < 1000 ? '3e2' : '3e0'; // 3e2 = walking, 3e0 = driving
      
      // Try to open in Google Maps app first, fallback to web
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      if (isIOS) {
        // iOS - try Google Maps app, fallback to Apple Maps
        window.open(`comgooglemaps://?saddr=${origin}&daddr=${destination}&directionsmode=${mode}`, '_blank');
        // Fallback to Apple Maps if Google Maps app not installed
        setTimeout(() => {
          window.open(`http://maps.apple.com/?saddr=${origin}&daddr=${destination}&dirflg=${modeCode}`, '_blank');
        }, 500);
      } else if (isAndroid) {
        // Android - open Google Maps
        window.open(`google.navigation:q=${destination}&mode=${modeCode}`, '_blank');
        // Fallback to web if app not available
        setTimeout(() => {
          window.open(`https://www.google.com/maps/dir/${origin}/${destination}/@${userLocation.lat},${userLocation.lon},15z/data=!4m2!4m1!${webMode}`, '_blank');
        }, 500);
      } else {
        // Desktop/Web - open Google Maps web
        window.open(`https://www.google.com/maps/dir/${origin}/${destination}/@${userLocation.lat},${userLocation.lon},15z/data=!4m2!4m1!${webMode}`, '_blank');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mx-auto mb-4"></div>
          <p className="text-xl">Getting your location...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-400 to-pink-500 p-4">
        <div className="text-center text-white bg-black/30 rounded-2xl p-8 max-w-md">
          <p className="text-xl mb-4">⚠️ {error}</p>
          <div className="space-y-3">
            <button
              onClick={() => {
                setError('');
                setIsLoading(true);
                window.location.reload();
              }}
              className="w-full px-6 py-3 bg-white text-purple-600 rounded-full font-bold hover:bg-gray-100 transition"
            >
              Try Again
            </button>
            <p className="text-sm text-white/80 mt-4">
              💡 Tip: Check browser settings → Site permissions → Location → Allow
            </p>
            <p className="text-xs text-white/60 mt-2">
              Make sure you're using HTTPS (required for GPS)
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center text-white mb-6 pt-8">
          <h1 className="text-3xl font-bold mb-2">🎯 Treasure Hunt</h1>
          <p className="text-lg opacity-90">Find the hidden treasure!</p>
        </div>

        {/* Distance Display */}
        {distance !== null && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 mb-6 shadow-xl">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Distance to Treasure</p>
              <p className="text-4xl font-bold text-purple-600">
                {formatDistance(distance)}
              </p>
              {gpsAccuracy !== null && (
                <p className={`text-xs mt-2 ${
                  gpsAccuracy < 10 ? 'text-green-600' : 
                  gpsAccuracy < 30 ? 'text-yellow-600' : 
                  'text-red-600'
                }`}>
                  GPS Accuracy: {Math.round(gpsAccuracy)}m
                </p>
              )}
            </div>
          </div>
        )}

        {/* Open Google Maps Button */}
        {userLocation && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 mb-6 shadow-xl">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">Get Directions</p>
              <button
                onClick={handleOpenGoogleMaps}
                className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg flex items-center justify-center gap-2"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                Open in Google Maps
              </button>
              <p className="text-xs text-gray-500 mt-3">
                Get step-by-step directions to the treasure
              </p>
            </div>
          </div>
        )}

        {/* Reach Status */}
        {hasReached && !showScratchCard && !codeVerified && (
          <div className="bg-green-500 text-white rounded-2xl p-6 mb-6 shadow-xl text-center">
            <p className="text-xl font-bold mb-4">🎉 You've reached the treasure!</p>
            <button
              onClick={handleRevealClick}
              className="w-full py-4 bg-white text-green-600 rounded-xl font-bold text-lg hover:bg-gray-100 transition shadow-lg"
            >
              Click to Reveal Code
            </button>
          </div>
        )}

        {/* Scratch Card */}
        {showScratchCard && code && (
          <div className="mb-6">
            <ScratchCard code={code} onReveal={handleScratchReveal} />
          </div>
        )}

        {/* Code Input */}
        {showCodeInput && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 mb-6 shadow-xl">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-800 mb-2">Enter Your Code</p>
              <p className="text-sm text-gray-600 mb-4">Enter the code you found to unlock the next location</p>
              <input
                type="text"
                value={enteredCode}
                onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="w-full px-4 py-3 text-center text-2xl font-bold tracking-widest border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none mb-4"
                autoFocus
              />
              <button
                onClick={handleCodeSubmit}
                className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-lg hover:bg-purple-700 transition shadow-lg"
              >
                Verify Code
              </button>
              {error && (
                <p className="text-red-600 text-sm mt-2">{error}</p>
              )}
            </div>
          </div>
        )}

        {/* Code Verified - Second Location */}
        {codeVerified && (
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-6 mb-6 shadow-xl text-center">
            <p className="text-2xl font-bold mb-2">✅ Code Verified!</p>
            <p className="text-lg mb-4">New location unlocked! Navigate to the next treasure.</p>
            <p className="text-sm opacity-90">New target: {SECOND_LOCATION_LAT.toFixed(6)}, {SECOND_LOCATION_LON.toFixed(6)}</p>
          </div>
        )}

        {/* Location Info (for debugging) */}
        {userLocation && (
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 text-white text-xs text-center">
            <p>Your Location: {userLocation.lat.toFixed(6)}, {userLocation.lon.toFixed(6)}</p>
            <p>Target: {targetCoords.lat.toFixed(6)}, {targetCoords.lon.toFixed(6)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

