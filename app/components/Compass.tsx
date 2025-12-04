'use client';

import { useEffect, useState } from 'react';

interface CompassProps {
  bearing: number; // Bearing to target in degrees (0-360)
  userHeading?: number; // User's device heading in degrees (0-360)
  accuracy?: number; // GPS accuracy in meters
}

export default function Compass({ bearing, userHeading = 0, accuracy }: CompassProps) {
  const [compassRotation, setCompassRotation] = useState(0);
  const [needleRotation, setNeedleRotation] = useState(0);

  useEffect(() => {
    // Calculate the relative angle considering device orientation
    // When device is pointing north (userHeading = 0), bearing should point directly
    let relativeAngle = bearing - userHeading;
    
    // Normalize to 0-360
    relativeAngle = ((relativeAngle % 360) + 360) % 360;
    
    // Smooth the rotation for better visual experience
    const targetRotation = relativeAngle;
    const currentRotation = needleRotation;
    
    // Calculate shortest rotation path
    let diff = targetRotation - currentRotation;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    
    // Smooth interpolation
    const smoothedRotation = (currentRotation + diff * 0.1) % 360;
    const normalized = ((smoothedRotation % 360) + 360) % 360;
    
    setNeedleRotation(normalized);
  }, [bearing, userHeading]);

  // Rotate compass background based on device heading (so N always points north)
  useEffect(() => {
    setCompassRotation(-userHeading);
  }, [userHeading]);

  // Get accuracy indicator color
  const getAccuracyColor = () => {
    if (!accuracy) return 'text-gray-500';
    if (accuracy < 10) return 'text-green-600';
    if (accuracy < 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="relative w-56 h-56 mx-auto">
      {/* Compass circle with rotation */}
      <div 
        className="absolute inset-0 rounded-full border-4 border-gray-800 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg transition-transform duration-100"
        style={{ transform: `rotate(${compassRotation}deg)` }}
      >
        {/* Cardinal directions */}
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-xl font-bold text-red-600 z-10">
          N
        </div>
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xl font-bold text-gray-700 z-10">
          S
        </div>
        <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xl font-bold text-gray-700 z-10">
          W
        </div>
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xl font-bold text-gray-700 z-10">
          E
        </div>
        
        {/* Intermediate directions */}
        <div className="absolute top-6 right-6 text-sm font-semibold text-gray-600">NE</div>
        <div className="absolute top-6 left-6 text-sm font-semibold text-gray-600">NW</div>
        <div className="absolute bottom-6 right-6 text-sm font-semibold text-gray-600">SE</div>
        <div className="absolute bottom-6 left-6 text-sm font-semibold text-gray-600">SW</div>
        
        {/* Degree markers */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
          <div
            key={deg}
            className="absolute top-0 left-1/2 origin-bottom"
            style={{
              transform: `translateX(-50%) rotate(${deg}deg)`,
              height: '50%',
            }}
          >
            <div className={`absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 ${deg % 90 === 0 ? 'h-4 bg-gray-800' : 'h-2 bg-gray-600'}`}></div>
          </div>
        ))}
      </div>
      
      {/* Compass needle pointing to target - rotates independently */}
      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 origin-bottom transition-transform duration-200 z-20"
        style={{ transform: `translate(-50%, -50%) rotate(${needleRotation}deg)` }}
      >
        <div className="w-1.5 h-24 bg-red-600 rounded-full shadow-lg"></div>
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-b-[16px] border-l-transparent border-r-transparent border-b-red-600 drop-shadow-md"></div>
      </div>
      
      {/* Center dot */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-gray-800 rounded-full z-30 border-2 border-white shadow-lg"></div>
      
      {/* Accuracy indicator */}
      {accuracy !== undefined && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-center">
          <span className={getAccuracyColor()}>
            Accuracy: {accuracy < 10 ? 'Excellent' : accuracy < 30 ? 'Good' : accuracy < 50 ? 'Fair' : 'Poor'} ({Math.round(accuracy)}m)
          </span>
        </div>
      )}
    </div>
  );
}
