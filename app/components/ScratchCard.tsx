'use client';

import { useState, useRef, useEffect } from 'react';

interface ScratchCardProps {
  code: string;
  onReveal: () => void;
}

export default function ScratchCard({ code, onReveal }: ScratchCardProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [scratchProgress, setScratchProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isScratchingRef = useRef(false);

  // Helper function to scratch at coordinates
  const scratchAt = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || isRevealed) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.fill();

    // Calculate scratched area (debounced for performance)
    if (!isRevealed) {
      requestAnimationFrame(() => {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let transparentPixels = 0;
        for (let i = 3; i < imageData.data.length; i += 4) {
          if (imageData.data[i] === 0) {
            transparentPixels++;
          }
        }
        const progress = (transparentPixels / (canvas.width * canvas.height)) * 100;
        setScratchProgress(progress);

        if (progress > 50 && !isRevealed) {
          setIsRevealed(true);
          onReveal();
        }
      });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isRevealed) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Draw scratch layer
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw pattern
    ctx.fillStyle = '#FFA500';
    for (let i = 0; i < canvas.width; i += 20) {
      for (let j = 0; j < canvas.height; j += 20) {
        if ((i + j) % 40 === 0) {
          ctx.fillRect(i, j, 10, 10);
        }
      }
    }

    // Draw text
    ctx.fillStyle = '#000';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Scratch Here!', canvas.width / 2, canvas.height / 2);
  }, [isRevealed]);

  // Native touch event handlers with passive: false
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isRevealed) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      isScratchingRef.current = true;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      scratchAt(x, y);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isScratchingRef.current) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        scratchAt(x, y);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      isScratchingRef.current = false;
    };

    // Add native event listeners with passive: false to allow preventDefault
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isRevealed]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isScratchingRef.current = true;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      scratchAt(x, y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isScratchingRef.current) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        scratchAt(x, y);
      }
    }
  };

  const handleMouseUp = () => {
    isScratchingRef.current = false;
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="relative bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-white text-center mb-4">
          🎉 Congratulations! 🎉
        </h2>
        <p className="text-white text-center mb-4">You found the treasure!</p>
        
        <div className="relative bg-white rounded-xl p-4 mb-4">
          {!isRevealed ? (
            <canvas
              ref={canvasRef}
              className="w-full h-48 rounded-lg cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ touchAction: 'none' }}
            />
          ) : (
            <div className="w-full h-48 flex items-center justify-center bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Your Code:</p>
                <p className="text-4xl font-bold text-gray-800 tracking-wider">
                  {code}
                </p>
              </div>
            </div>
          )}
        </div>
        
        {!isRevealed && (
          <p className="text-white text-sm text-center">
            Scratch the card to reveal your code! ({Math.round(scratchProgress)}%)
          </p>
        )}
      </div>
    </div>
  );
}
