'use client';

import { useEffect, useRef, useState } from 'react';

interface ARCameraProps {
  code: string;
  onClose: () => void;
  onError?: () => void;
}

export default function ARCamera({ code, onClose, onError }: ARCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Check if camera is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.');
      setIsLoading(false);
      return;
    }

    // Request camera access
    const startCamera = async () => {
      try {
        // Try back camera first (for mobile), fallback to any camera
        let stream: MediaStream | null = null;
        
        try {
          // First try: back camera (environment) - for mobile devices
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });
        } catch (envError) {
          // Fallback: any available camera (for PC/desktop)
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: 'user', // Front camera or default
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
            });
          } catch (userError) {
            // Last fallback: any camera without facingMode constraint
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
            });
          }
        }

        if (stream) {
          streamRef.current = stream;
          
          // Wait a bit for video element to be ready
          const setupVideo = () => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              
              // Wait for video to be ready
              videoRef.current.onloadedmetadata = () => {
                if (videoRef.current) {
                  videoRef.current.play().then(() => {
                    setIsLoading(false);
              }).catch((playError) => {
                console.error('Video play error:', playError);
                setError('Camera started but video playback failed. Switching to scratch card...');
                setIsLoading(false);
                // Switch to scratch card after showing error
                if (onError) {
                  setTimeout(() => {
                    onError();
                  }, 2000);
                }
              });
                }
              };
              
              // Handle video errors
              videoRef.current.onerror = () => {
                setError('Video element error. Switching to scratch card...');
                setIsLoading(false);
                if (onError) {
                  setTimeout(() => {
                    onError();
                  }, 2000);
                }
              };
            } else {
              // Retry after a short delay if video element not ready
              setTimeout(setupVideo, 100);
            }
          };
          
          setupVideo();
        } else {
          setError('Camera stream not available. Switching to scratch card...');
          setIsLoading(false);
          if (onError) {
            setTimeout(() => {
              onError();
            }, 2000);
          }
        }
      } catch (err: any) {
        let errorMessage = 'Camera access denied. Please allow camera permission.';
        
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Camera permission denied. Please allow camera access in browser settings and refresh.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMessage = 'No camera found. Please connect a camera and try again.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMessage = 'Camera is being used by another application. Please close other apps using the camera.';
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Camera constraints not supported. Trying with default settings...';
        }
        
        setError(errorMessage);
        setIsLoading(false);
        console.error('Camera error:', err);
        
        // Call onError callback to switch to scratch card
        if (onError) {
          setTimeout(() => {
            onError();
          }, 2000); // Show error for 2 seconds then switch
        }
      }
    };

    startCamera();

    // Cleanup
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    onClose();
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mx-auto mb-4"></div>
          <p className="text-xl">Starting AR Camera...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4">
        <div className="text-center text-white bg-red-600/90 rounded-2xl p-8 max-w-md">
          <p className="text-xl mb-4">⚠️ {error}</p>
          <div className="space-y-3">
            <button
              onClick={handleClose}
              className="w-full px-6 py-3 bg-white text-red-600 rounded-full font-bold hover:bg-gray-100 transition"
            >
              Close
            </button>
            <p className="text-sm text-white/80 mt-4">
              💡 Tip: Check browser settings → Site permissions → Camera → Allow
            </p>
            <p className="text-xs text-white/60">
              Make sure you're using HTTPS and have granted camera permission
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Camera Video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {/* AR Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {/* Scanning Frame */}
        <div className="relative w-64 h-64 border-4 border-green-400 rounded-lg shadow-2xl">
          {/* Corner indicators */}
          <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-green-400"></div>
          <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-green-400"></div>
          <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-green-400"></div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-green-400"></div>
          
          {/* Scanning line animation */}
          <div className="absolute inset-0 overflow-hidden rounded-lg">
            <div className="absolute w-full h-1 bg-green-400 shadow-lg animate-scan"></div>
          </div>
        </div>

        {/* Code Display with AR effect */}
        <div className="mt-8 relative">
          <div className="bg-black/80 backdrop-blur-md rounded-2xl p-6 border-2 border-green-400 shadow-2xl transform perspective-1000">
            <div className="text-center">
              <p className="text-sm text-green-400 mb-2 font-semibold tracking-wider">TREASURE CODE</p>
              <div className="relative">
                <p className="text-5xl font-bold text-white tracking-wider mb-2 drop-shadow-2xl">
                  {code}
                </p>
                {/* Glow effect */}
                <div className="absolute inset-0 text-5xl font-bold text-green-400 tracking-wider blur-xl opacity-50 animate-pulse">
                  {code}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">Point camera at treasure location</p>
            </div>
          </div>
        </div>
      </div>

      {/* Close Button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 bg-black/70 hover:bg-black/90 text-white rounded-full p-3 shadow-lg transition z-10"
        aria-label="Close AR Camera"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md rounded-xl p-4 text-white text-sm">
        <p className="text-center">
          🎯 You found the treasure! Your code is displayed above.
        </p>
      </div>
    </div>
  );
}

