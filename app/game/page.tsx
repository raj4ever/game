'use client';

import { useState, useEffect, useRef } from 'react';
import ScratchCard from '../components/ScratchCard';
import QRCodeDisplay from '../components/QRCodeDisplay';
import QRCodeScanner from '../components/QRCodeScanner';
import { calculateDistance, formatDistance, LocationSmoother } from '../utils/location';
import { getActiveLocation, verifyCode, generateCodeForLocation, createOrUpdateUser, updateUserLastSeen, getOnlinePlayersCount, addWinningsToUser, getUserTotalWinnings, checkDeviceFingerprint, createNewUser, getUserCompletedLocations, hasUserCompletedLocation, getNearestLocation, createTeam, getUserTeam, getTeamMembers, generateTeamInvite, joinTeamByInvite, getLocationTeamRequirement, hasTeamCompletedLocation, markLocationAsCompletedByTeam, supabase } from '../utils/supabase';
import { getDeviceFingerprint, getDeviceInfo } from '../utils/deviceFingerprint';

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
  const [userId, setUserId] = useState<string>('');
  const [userUniqueId, setUserUniqueId] = useState<string>('');
  const [onlinePlayersCount, setOnlinePlayersCount] = useState<number>(0);
  const [totalWinnings, setTotalWinnings] = useState<number>(0);
  const [currentWinningAmount, setCurrentWinningAmount] = useState<number>(0);
  const [justWonAmount, setJustWonAmount] = useState<number>(0);
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
  const [nextTargetCoords, setNextTargetCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [verifiedLocationIds, setVerifiedLocationIds] = useState<Set<string>>(new Set()); // Track verified locations
  
  // Team-related states
  const [currentTeam, setCurrentTeam] = useState<{ teamId: string; teamCode: string; memberCount: number } | null>(null);
  const [teamMembers, setTeamMembers] = useState<Array<{ userId: string; userDisplay: string; role: string }>>([]);
  const [minimumTeamSize, setMinimumTeamSize] = useState<number>(1);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [teamInviteCode, setTeamInviteCode] = useState<string>('');
  const [hasCreatedTeam, setHasCreatedTeam] = useState(false); // Track if user created a team
  
  const watchIdRef = useRef<number | null>(null);
  const locationSmootherRef = useRef(new LocationSmoother());

  // Initialize user ID on component mount with device fingerprinting for security
  useEffect(() => {
    const initializeUser = async () => {
      try {
        // Get device fingerprint (unique per device)
        const deviceFingerprint = getDeviceFingerprint();
        console.log('Device fingerprint:', deviceFingerprint);

        // Check if this device already has an account
        const existingAccount = await checkDeviceFingerprint(deviceFingerprint);
        
        if (existingAccount.exists && existingAccount.userId && existingAccount.userDisplay) {
          // Device already has an account - use existing account (prevent multiple accounts)
          console.log('Using existing account for this device:', existingAccount.userDisplay);
          setUserId(existingAccount.userDisplay);
          setUserUniqueId(existingAccount.userId);
          
          // Update last seen and load winnings
          await createOrUpdateUser(existingAccount.userId, existingAccount.userDisplay, deviceFingerprint);
          const winnings = await getUserTotalWinnings(existingAccount.userId);
          setTotalWinnings(winnings);
          
          // Load completed locations from database
          const completedLocations = await getUserCompletedLocations(existingAccount.userId);
          setVerifiedLocationIds(new Set(completedLocations));
          
          return;
        }

        // New device - create new account with database-assigned user number
        // Get IP address for security tracking
        let ipAddress: string | null = null;
        try {
          const ipResponse = await fetch('https://api.ipify.org?format=json');
          const ipData = await ipResponse.json();
          ipAddress = ipData.ip || null;
        } catch (ipError) {
          console.error('Could not fetch IP address:', ipError);
        }

        // Create new user with database-assigned number (prevents duplicates)
        const newUser = await createNewUser(deviceFingerprint, ipAddress || undefined);
        
        if (newUser) {
          setUserId(newUser.userDisplay);
          setUserUniqueId(newUser.userId);
          
          // Load user's total winnings
          const winnings = await getUserTotalWinnings(newUser.userId);
          setTotalWinnings(winnings);
          
          // Load completed locations from database
          const completedLocations = await getUserCompletedLocations(newUser.userId);
          setVerifiedLocationIds(new Set(completedLocations));
        } else {
          // Database failed - show error
          console.error('Failed to create user in database');
          setError('Failed to initialize user. Please refresh the page.');
        }
      } catch (error) {
        console.error('Error initializing user:', error);
        setError('Failed to initialize user. Please refresh the page.');
      }
    };

    initializeUser();
  }, []);

  // Update user's last_seen every 30 seconds
  useEffect(() => {
    if (!userUniqueId) return;

    const updateInterval = setInterval(async () => {
      await updateUserLastSeen(userUniqueId);
    }, 30000); // Update every 30 seconds

    return () => clearInterval(updateInterval);
  }, [userUniqueId]);

  // Get online players count every 10 seconds
  useEffect(() => {
    const fetchOnlineCount = async () => {
      try {
        const count = await getOnlinePlayersCount();
        setOnlinePlayersCount(count);
      } catch (error) {
        console.error('Error fetching online players count:', error);
      }
    };

    fetchOnlineCount();
    const countInterval = setInterval(fetchOnlineCount, 10000); // Update every 10 seconds

    return () => clearInterval(countInterval);
  }, []);

  // Load nearest location based on user's current location
  useEffect(() => {
    const loadNearestLocation = async () => {
      if (!userLocation || !userUniqueId) return;
      
      try {
        // Get completed locations to exclude them
        const completedLocations = await getUserCompletedLocations(userUniqueId);
        setVerifiedLocationIds(new Set(completedLocations));
        
        // Find nearest location from user's current location
        const nearestLocation = await getNearestLocation(
          userLocation.lat, 
          userLocation.lon, 
          Array.from(completedLocations)
        );
        
        if (nearestLocation) {
          setTargetCoords({ lat: nearestLocation.lat, lon: nearestLocation.lon });
          setCurrentLocationId(nearestLocation.id);
          setCurrentWinningAmount(nearestLocation.winning_amount || 0);
          
          // Get team requirement for this location
          const teamRequirement = await getLocationTeamRequirement(nearestLocation.id);
          setMinimumTeamSize(teamRequirement);
          
          // Check if user has a team for this location
          const userTeam = await getUserTeam(userUniqueId, nearestLocation.id);
          if (userTeam) {
            setCurrentTeam(userTeam);
            // Load team members
            const members = await getTeamMembers(userTeam.teamId);
            setTeamMembers(members);
            // Check if user is the leader (created the team)
            const isLeader = members.some(m => m.userId === userUniqueId && m.role === 'leader');
            setHasCreatedTeam(isLeader);
          } else {
            setCurrentTeam(null);
            setTeamMembers([]);
            setHasCreatedTeam(false);
          }
          
          // Check if this location is already completed
          if (userTeam) {
            const teamCompleted = await hasTeamCompletedLocation(userTeam.teamId, nearestLocation.id);
            if (teamCompleted) {
              setVerifiedLocationIds(prev => new Set(prev).add(nearestLocation.id));
              setHasReached(false);
              setShowScratchCard(false);
              setShowCodeInput(false);
            }
          } else {
            const completed = await hasUserCompletedLocation(userUniqueId, nearestLocation.id);
            if (completed) {
              setVerifiedLocationIds(prev => new Set(prev).add(nearestLocation.id));
              setHasReached(false);
              setShowScratchCard(false);
              setShowCodeInput(false);
            }
          }
        } else {
          // Fallback to active location if no nearest found
          const location = await getActiveLocation();
          if (location) {
            setTargetCoords({ lat: location.lat, lon: location.lon });
            setCurrentLocationId(location.id);
            setCurrentWinningAmount(location.winning_amount || 0);
            
            const teamRequirement = await getLocationTeamRequirement(location.id);
            setMinimumTeamSize(teamRequirement);
          } else {
            // Final fallback to defaults
            setTargetCoords({ lat: DEFAULT_TARGET_LAT, lon: DEFAULT_TARGET_LON });
          }
        }
      } catch (error) {
        console.error('Error loading nearest location:', error);
        // Fallback to defaults
        setTargetCoords({ lat: DEFAULT_TARGET_LAT, lon: DEFAULT_TARGET_LON });
      }
    };
    
    if (userLocation && userUniqueId) {
      loadNearestLocation();
      
      // Refresh location every 30 seconds
      const interval = setInterval(loadNearestLocation, 30000);
      return () => clearInterval(interval);
    }
  }, [userLocation, userUniqueId]);

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
          
          // Only set hasReached if location is not already verified
          if (dist <= REACH_DISTANCE && currentLocationId && !verifiedLocationIds.has(currentLocationId)) {
            // Double-check database before showing reached message
            if (userUniqueId) {
              hasUserCompletedLocation(userUniqueId, currentLocationId).then((completed) => {
                if (!completed) {
                  setHasReached(true);
                } else {
                  setHasReached(false);
                  // Update local state
                  setVerifiedLocationIds(prev => new Set(prev).add(currentLocationId!));
                }
              });
            } else {
              setHasReached(true);
            }
          } else if (currentLocationId && verifiedLocationIds.has(currentLocationId)) {
            // Location already verified - don't show reached message
            setHasReached(false);
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
          
          // Only set hasReached if location is not already verified
          if (dist <= REACH_DISTANCE && currentLocationId && !verifiedLocationIds.has(currentLocationId)) {
            // Double-check database before showing reached message
            if (userUniqueId) {
              hasUserCompletedLocation(userUniqueId, currentLocationId).then((completed) => {
                if (!completed) {
                  setHasReached(true);
                } else {
                  setHasReached(false);
                  // Update local state
                  setVerifiedLocationIds(prev => new Set(prev).add(currentLocationId!));
                }
              });
            } else {
              setHasReached(true);
            }
          } else if (currentLocationId && verifiedLocationIds.has(currentLocationId)) {
            // Location already verified - don't show reached message
            setHasReached(false);
            setShowScratchCard(false);
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
    if (!currentLocationId || !userUniqueId) {
      setError('Location or user not loaded. Please refresh the page.');
      return;
    }

    // Check database if location already completed
    const alreadyCompleted = await hasUserCompletedLocation(userUniqueId, currentLocationId);
    if (alreadyCompleted || verifiedLocationIds.has(currentLocationId)) {
      setError('You have already completed this location. Please move to the next one.');
      setHasReached(false);
      return;
    }

    // For first location (single player), directly show scratch card
    if (minimumTeamSize === 1 && hasReached && !showScratchCard && currentLocationId) {
      try {
        // Generate code in Supabase
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
    // For team locations, scratch card will show automatically after team is complete
  };

  const handleScratchReveal = () => {
    // Code revealed in scratch card, show code input
    setShowCodeInput(true);
  };

  // Auto-show scratch card when team is complete and location is reached
  useEffect(() => {
    const showScratchCardForTeam = async () => {
      if (
        hasReached && 
        !showScratchCard && 
        !codeVerified && 
        currentLocationId && 
        minimumTeamSize > 1 && 
        currentTeam && 
        currentTeam.memberCount >= minimumTeamSize &&
        !verifiedLocationIds.has(currentLocationId)
      ) {
        // Check if location already completed
        const teamCompleted = await hasTeamCompletedLocation(currentTeam.teamId, currentLocationId);
        if (!teamCompleted) {
          try {
            // Generate code in Supabase
            const newCode = await generateCodeForLocation(currentLocationId);
            setCode(newCode);
            setShowScratchCard(true);
          } catch (error) {
            console.error('Error generating code:', error);
          }
        }
      }
    };

    showScratchCardForTeam();
  }, [hasReached, currentTeam, minimumTeamSize, currentLocationId, showScratchCard, codeVerified, verifiedLocationIds]);

  // Team management handlers
  const handleCreateTeam = async () => {
    if (!currentLocationId || !userUniqueId) return;
    
    try {
      // If user is already in a team, leave it first
      if (currentTeam) {
        // Note: In a real scenario, you might want to add a leaveTeam function
        // For now, we'll allow creating a new team which will replace the old one
        setCurrentTeam(null);
        setTeamMembers([]);
      }
      
      const team = await createTeam(userUniqueId, currentLocationId);
      if (team) {
        setCurrentTeam({ teamId: team.teamId, teamCode: team.teamCode, memberCount: 1 });
        setHasCreatedTeam(true);
        // Generate QR invite
        const invite = await generateTeamInvite(team.teamId, currentLocationId, userUniqueId);
        if (invite) {
          setQrCodeData(invite.qrData);
          setShowQRCode(true);
        }
        // Refresh team members
        const members = await getTeamMembers(team.teamId);
        setTeamMembers(members);
        setError(''); // Clear any errors
      }
    } catch (error) {
      console.error('Error creating team:', error);
      setError('Failed to create team. Please try again.');
    }
  };

  const handleJoinTeam = () => {
    setShowQRScanner(true);
  };

  const handleQRScan = async (data: string) => {
    setShowQRScanner(false);
    
    try {
      // Try to parse QR data
      let inviteCode = data;
      try {
        const parsed = JSON.parse(data);
        if (parsed.inviteCode) {
          inviteCode = parsed.inviteCode;
        }
      } catch {
        // If not JSON, use as-is
      }

      // Pass current location ID for security validation
      const result = await joinTeamByInvite(inviteCode, userUniqueId, currentLocationId || undefined);
      if (result.success && result.teamId) {
        // Refresh team info
        if (currentLocationId) {
          const userTeam = await getUserTeam(userUniqueId, currentLocationId);
          if (userTeam) {
            setCurrentTeam(userTeam);
            setHasCreatedTeam(false); // User joined, didn't create
            const members = await getTeamMembers(userTeam.teamId);
            setTeamMembers(members);
            setShowQRCode(false); // Close QR code if open
            setError('');
            
            // After joining team, if team is complete, automatically show scratch card
            if (userTeam.memberCount >= minimumTeamSize && hasReached) {
              // Generate and show scratch card
              try {
                const newCode = await generateCodeForLocation(currentLocationId);
                setCode(newCode);
                setShowScratchCard(true);
              } catch (error) {
                console.error('Error generating code:', error);
              }
            }
          }
        }
      } else {
        setError(result.error || 'Failed to join team');
      }
    } catch (error) {
      console.error('Error joining team:', error);
      setError('Failed to join team. Please try again.');
    }
  };

  const handleCodeSubmit = async () => {
    if (!currentLocationId || !userUniqueId) {
      setError('Location not loaded. Please refresh the page.');
      return;
    }

    // Check team requirement
    if (minimumTeamSize > 1) {
      if (!currentTeam) {
        setError(`This location requires a team of ${minimumTeamSize} members. Please create or join a team first.`);
        return;
      }
      
      if (currentTeam.memberCount < minimumTeamSize) {
        setError(`This location requires ${minimumTeamSize} team members. You have ${currentTeam.memberCount}. Please invite more members.`);
        return;
      }

      // Check if team already completed this location
      const teamCompleted = await hasTeamCompletedLocation(currentTeam.teamId, currentLocationId);
      if (teamCompleted || verifiedLocationIds.has(currentLocationId)) {
        setError('Your team has already completed this location. Please move to the next one.');
        setHasReached(false);
        setShowScratchCard(false);
        setShowCodeInput(false);
        return;
      }
    } else {
      // Single player - check individual completion
      const alreadyCompleted = await hasUserCompletedLocation(userUniqueId, currentLocationId);
      if (alreadyCompleted || verifiedLocationIds.has(currentLocationId)) {
        setError('You have already completed this location. Please move to the next one.');
        setHasReached(false);
        setShowScratchCard(false);
        setShowCodeInput(false);
        return;
      }
    }

    try {
      // Verify code with Supabase (with userId for tracking)
      const result = await verifyCode(enteredCode.toUpperCase().trim(), currentLocationId, userUniqueId);
      
      // Check if result has error (already completed)
      if (result && 'error' in result) {
        setError(result.error || 'An error occurred');
        setHasReached(false);
        return;
      }
      
      if (result) {
        const winningAmount = result.winning_amount || currentWinningAmount || 0;
        setJustWonAmount(winningAmount);
        
        // Handle team vs individual completion
        if (minimumTeamSize > 1 && currentTeam) {
          // Team completion - distribute winnings
          const codeId = result.codeId || '';
          const nextLocationId = result.id || undefined; // Next location ID from verifyCode result
          await markLocationAsCompletedByTeam(currentTeam.teamId, currentLocationId!, codeId, winningAmount, nextLocationId);
          
          // Update user's total winnings (already distributed in the function)
          const winnings = await getUserTotalWinnings(userUniqueId);
          setTotalWinnings(winnings);
          
          // Reset team state for next location
          if (nextLocationId) {
            // Team will be moved to next location in database
            // Refresh team info for new location
            setTimeout(async () => {
              if (nextLocationId) {
                const userTeam = await getUserTeam(userUniqueId, nextLocationId);
                if (userTeam) {
                  setCurrentTeam(userTeam);
                  const members = await getTeamMembers(userTeam.teamId);
                  setTeamMembers(members);
                } else {
                  setCurrentTeam(null);
                  setTeamMembers([]);
                  setHasCreatedTeam(false);
                }
              }
            }, 1000);
          }
        } else {
          // Individual completion
          if (winningAmount > 0) {
            const updatedWinnings = await addWinningsToUser(userUniqueId, winningAmount);
            if (updatedWinnings) {
              setTotalWinnings(updatedWinnings.total_winnings);
            }
          }
        }

        // Mark current location as verified (prevent reuse)
        if (currentLocationId) {
          setVerifiedLocationIds(prev => new Set(prev).add(currentLocationId));
        }

        setCodeVerified(true);
        setShowCodeInput(false);
        
        // Reset states for next location immediately
        setHasReached(false);
        setShowScratchCard(false);
        setCode('');
        setEnteredCode('');

        // If there's a next location, move there immediately
        if (result.lat && result.lon && result.id) {
          // Load next location immediately using data from verifyCode response
          setTargetCoords({
            lat: result.lat,
            lon: result.lon,
          });
          setCurrentLocationId(result.id);
          // Use winning amount from next location if available, otherwise 0
          setCurrentWinningAmount(result.winning_amount || 0);
          
          // Clear verification message after 3 seconds
          setTimeout(() => {
            setJustWonAmount(0);
            setCodeVerified(false);
          }, 3000);
        } else {
          // No next location - game might be complete
          setTimeout(() => {
            setJustWonAmount(0);
            setCodeVerified(false);
          }, 5000);
        }
      } else {
        // Fallback: check local code
        if (enteredCode.toUpperCase().trim() === code.toUpperCase().trim()) {
          // Add winnings for local verification too
          const winningAmount = currentWinningAmount || 0;
          setJustWonAmount(winningAmount);
          if (winningAmount > 0 && userUniqueId) {
            const updatedWinnings = await addWinningsToUser(userUniqueId, winningAmount);
            if (updatedWinnings) {
              setTotalWinnings(updatedWinnings.total_winnings);
            }
          }

          // Mark current location as verified (prevent reuse)
          if (currentLocationId) {
            setVerifiedLocationIds(prev => new Set(prev).add(currentLocationId));
          }

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
        const winningAmount = currentWinningAmount || 0;
        if (winningAmount > 0 && userUniqueId) {
          const updatedWinnings = await addWinningsToUser(userUniqueId, winningAmount);
          if (updatedWinnings) {
            setTotalWinnings(updatedWinnings.total_winnings);
          }
        }

        // Mark current location as verified (prevent reuse)
        if (currentLocationId) {
          setVerifiedLocationIds(prev => new Set(prev).add(currentLocationId));
        }

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
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 p-4 relative">
      {/* User Badge - Top Right Corner */}
      {userId && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-white/95 backdrop-blur-sm shadow-xl rounded-2xl p-3 border-2 border-purple-500 min-w-[80px]">
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center border-2 border-purple-500">
                <span className="text-purple-600 font-bold text-sm">{userId.replace('User ', '')}</span>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600">Winnings</p>
                <p className="text-purple-600 font-bold text-sm">₹{totalWinnings.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto pb-20">
        {/* Header */}
        <div className="text-center text-white mb-6 pt-8">
          <h1 className="text-3xl font-bold mb-2">🎯 Treasure Hunt</h1>
          <p className="text-lg opacity-90">Find the hidden treasure!</p>
        </div>

        {/* Team Status - Show only when reached location and team required */}
        {hasReached && minimumTeamSize > 1 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 mb-6 shadow-xl">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Team Required</p>
              <p className="text-2xl font-bold text-purple-600 mb-4">
                {currentTeam ? `${currentTeam.memberCount}/${minimumTeamSize} Members` : `0/${minimumTeamSize} Members`}
              </p>
              
              {!currentTeam ? (
                <div className="space-y-2">
                  <button
                    onClick={handleCreateTeam}
                    className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition"
                  >
                    Create Team & Generate QR
                  </button>
                  <button
                    onClick={handleJoinTeam}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
                  >
                    Join Team (Scan QR)
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentTeam.memberCount < minimumTeamSize && (
                    <>
                      <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-3 mb-3">
                        <p className="text-sm text-yellow-800 mb-2">
                          Need {minimumTeamSize - currentTeam.memberCount} more member(s)
                        </p>
                        <div className="space-y-2">
                          <button
                            onClick={async () => {
                              if (currentLocationId) {
                                const invite = await generateTeamInvite(currentTeam.teamId, currentLocationId, userUniqueId);
                                if (invite) {
                                  setQrCodeData(invite.qrData);
                                  setShowQRCode(true);
                                }
                              }
                            }}
                            className="w-full py-2 bg-yellow-500 text-white rounded-lg font-bold hover:bg-yellow-600 transition text-sm"
                          >
                            Generate QR Invite
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                  
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-2 font-semibold">Team Members:</p>
                    <div className="space-y-2">
                      {teamMembers.map((member) => (
                        <div key={member.userId} className="flex items-center justify-between text-sm bg-white rounded-lg p-2">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800">{member.userDisplay}</span>
                            <span className="text-xs text-gray-500 font-mono">ID: {member.userId.substring(0, 20)}...</span>
                          </div>
                          {member.role === 'leader' && (
                            <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded font-bold">👑 Leader</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Always show join option if team is not full - for all locations */}
                  {currentTeam.memberCount < minimumTeamSize && (
                    <div className="mt-3">
                      <button
                        onClick={async () => {
                          // Leave current team and allow joining another
                          setCurrentTeam(null);
                          setTeamMembers([]);
                          setHasCreatedTeam(false);
                          setShowQRCode(false);
                          handleJoinTeam();
                        }}
                        className="w-full py-2 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition text-sm"
                      >
                        Join Another Team (Scan QR)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Distance Display - Only show when not verified and not reached */}
        {!codeVerified && !hasReached && distance !== null && (
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

        {/* Open Google Maps Button - Only show when not verified and not reached */}
        {!codeVerified && !hasReached && userLocation && (
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

        {/* Reach Status - Only show if location not already verified */}
        {/* For first location (single player), show reveal button directly */}
        {hasReached && !showScratchCard && !codeVerified && currentLocationId && !verifiedLocationIds.has(currentLocationId) && minimumTeamSize === 1 && (
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
        
        {/* For team locations, show message when team is complete */}
        {hasReached && !showScratchCard && !codeVerified && currentLocationId && !verifiedLocationIds.has(currentLocationId) && minimumTeamSize > 1 && currentTeam && currentTeam.memberCount >= minimumTeamSize && (
          <div className="bg-green-500 text-white rounded-2xl p-6 mb-6 shadow-xl text-center">
            <p className="text-xl font-bold mb-2">🎉 Team Complete!</p>
            <p className="text-sm mb-4">Your team has reached the treasure location</p>
            <p className="text-xs opacity-90">Code will be revealed automatically...</p>
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

        {/* Code Verified - Congratulations with Winning Amount */}
        {codeVerified && (
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-6 mb-6 shadow-xl text-center">
            <p className="text-3xl font-bold mb-3">🎉 Congratulations!</p>
            {justWonAmount > 0 && (
              <div className="bg-white/20 rounded-lg p-4 mb-4">
                <p className="text-sm opacity-90 mb-1">You Won</p>
                <p className="text-4xl font-bold">₹{justWonAmount.toFixed(2)}</p>
                <p className="text-xs opacity-75 mt-2">Total Winnings: ₹{totalWinnings.toFixed(2)}</p>
              </div>
            )}
            <p className="text-xl mb-2">✅ Code Verified!</p>
            {nextTargetCoords && (
              <>
                <p className="text-lg mb-4">New location unlocked! Navigate to the next treasure.</p>
                <div className="bg-white/20 rounded-lg p-3 mt-4">
                  <p className="text-sm font-semibold mb-1">Next Target Location:</p>
                  <p className="text-base font-mono">
                    {nextTargetCoords.lat.toFixed(6)}, {nextTargetCoords.lon.toFixed(6)}
                  </p>
                </div>
                <p className="text-sm opacity-90 mt-4">Loading next location...</p>
              </>
            )}
          </div>
        )}

        {/* Location Info (for debugging) */}
        {userLocation && (
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 text-white text-xs text-center">
            <p>Your Location: {userLocation.lat.toFixed(6)}, {userLocation.lon.toFixed(6)}</p>
            <p>Target: {targetCoords.lat.toFixed(6)}, {targetCoords.lon.toFixed(6)}</p>
          </div>
        )}

        {/* Online Players Counter - Bottom */}
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-white/95 backdrop-blur-sm rounded-full px-6 py-3 shadow-xl border-2 border-purple-500">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-purple-600 font-bold text-sm">
                {onlinePlayersCount} {onlinePlayersCount === 1 ? 'Player' : 'Players'} Online
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Display Modal */}
      {showQRCode && qrCodeData && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Team Invite</h2>
              <button
                onClick={() => setShowQRCode(false)}
                className="text-gray-600 hover:text-gray-800 text-2xl"
              >
                ×
              </button>
            </div>
            <QRCodeDisplay data={qrCodeData} title="Scan to Join Team" />
            <button
              onClick={() => setShowQRCode(false)}
              className="w-full mt-4 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* QR Code Scanner Modal */}
      {showQRScanner && (
        <QRCodeScanner
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </div>
  );
}

