'use client';

import { useState, useEffect, useRef } from 'react';
import ARCamera from '../components/ARCamera';
import { calculateDistance, formatDistance, LocationSmoother } from '../utils/location';

// Default target coordinates
const DEFAULT_TARGET_LAT = 21.854978;
const DEFAULT_TARGET_LON = 70.249041;
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
  // Get target coordinates from localStorage or use defaults
  const getTargetCoordinates = () => {
    if (typeof window !== 'undefined') {
      const savedLat = localStorage.getItem('targetLat');
      const savedLon = localStorage.getItem('targetLon');
      if (savedLat && savedLon) {
        return {
          lat: parseFloat(savedLat),
          lon: parseFloat(savedLon),
        };
      }
    }
    return {
      lat: DEFAULT_TARGET_LAT,
      lon: DEFAULT_TARGET_LON,
    };
  };

  const [targetCoords, setTargetCoords] = useState(getTargetCoordinates());
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [hasReached, setHasReached] = useState(false);
  const [showScratchCard, setShowScratchCard] = useState(false);
  const [code, setCode] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const locationSmootherRef = useRef(new LocationSmoother());

  // Update target coordinates when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setTargetCoords(getTargetCoordinates());
    };
    window.addEventListener('storage', handleStorageChange);
    // Also check periodically in case same tab updates
    const interval = setInterval(() => {
      setTargetCoords(getTargetCoordinates());
    }, 1000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
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
          
          // Calculate distance using Haversine formula
          const dist = calculateDistance(smoothed.lat, smoothed.lon, targetCoords.lat, targetCoords.lon);
          setDistance(dist);
          
          if (dist <= REACH_DISTANCE) {
            setHasReached(true);
          }
        },
        (err) => {
          setError('Location permission denied. Please enable GPS to play.');
          setIsLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
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


  const handleRevealClick = () => {
    if (hasReached && !showScratchCard) {
      const newCode = generateCode();
      setCode(newCode);
      setShowScratchCard(true);
    }
  };

  const handleCloseAR = () => {
    setShowScratchCard(false);
    setCode('');
  };

  const handleOpenGoogleMaps = () => {
    if (userLocation) {
      // Open Google Maps with directions
      const origin = `${userLocation.lat},${userLocation.lon}`;
      const destination = `${targetCoords.lat},${targetCoords.lon}`;
      
      // Try to open in Google Maps app first, fallback to web
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      if (isIOS) {
        // iOS - try Google Maps app, fallback to Apple Maps
        window.open(`comgooglemaps://?saddr=${origin}&daddr=${destination}&directionsmode=walking`, '_blank');
        // Fallback to Apple Maps if Google Maps app not installed
        setTimeout(() => {
          window.open(`http://maps.apple.com/?saddr=${origin}&daddr=${destination}&dirflg=w`, '_blank');
        }, 500);
      } else if (isAndroid) {
        // Android - open Google Maps
        window.open(`google.navigation:q=${destination}&mode=w`, '_blank');
        // Fallback to web if app not available
        setTimeout(() => {
          window.open(`https://www.google.com/maps/dir/${origin}/${destination}/@${userLocation.lat},${userLocation.lon},15z/data=!4m2!4m1!3e2`, '_blank');
        }, 500);
      } else {
        // Desktop/Web - open Google Maps web
        window.open(`https://www.google.com/maps/dir/${origin}/${destination}/@${userLocation.lat},${userLocation.lon},15z/data=!4m2!4m1!3e2`, '_blank');
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
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-3 bg-white text-purple-600 rounded-full font-bold hover:bg-gray-100 transition"
          >
            Try Again
          </button>
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
        {hasReached && !showScratchCard && (
          <div className="bg-green-500 text-white rounded-2xl p-6 mb-6 shadow-xl text-center">
            <p className="text-xl font-bold mb-4">🎉 You've reached the treasure!</p>
            <button
              onClick={handleRevealClick}
              className="w-full py-4 bg-white text-green-600 rounded-xl font-bold text-lg hover:bg-gray-100 transition shadow-lg flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Open AR Camera
            </button>
          </div>
        )}

        {/* AR Camera */}
        {showScratchCard && code && (
          <ARCamera code={code} onClose={handleCloseAR} />
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

