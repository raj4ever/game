'use client';

import { useEffect, useRef, useState } from 'react';

interface ARCameraProps {
  code: string;
  onClose: () => void;
}

export default function ARCamera({ code, onClose }: ARCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Request camera access
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Use back camera on mobile
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          setIsLoading(false);
        }
      } catch (err) {
        setError('Camera access denied. Please allow camera permission.');
        setIsLoading(false);
        console.error('Camera error:', err);
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
          <button
            onClick={handleClose}
            className="px-6 py-3 bg-white text-red-600 rounded-full font-bold hover:bg-gray-100 transition"
          >
            Close
          </button>
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

