'use client';

interface DirectionGuideProps {
  currentStep?: string;
  distance?: number;
  duration?: number;
  nextInstruction?: string;
}

export default function DirectionGuide({ currentStep, distance, duration, nextInstruction }: DirectionGuideProps) {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
      <div className="text-center">
        <div className="mb-4">
          <div className="text-5xl mb-2">🧭</div>
          <p className="text-lg font-semibold text-gray-800 mb-2">Navigation Guide</p>
        </div>
        
        {nextInstruction && (
          <div className="bg-blue-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-blue-600 font-medium mb-1">Next Step:</p>
            <p className="text-base text-gray-800 font-semibold">{nextInstruction}</p>
          </div>
        )}
        
        {currentStep && (
          <div className="bg-gray-50 rounded-xl p-3 mb-4">
            <p className="text-xs text-gray-600 mb-1">Current:</p>
            <p className="text-sm text-gray-700">{currentStep}</p>
          </div>
        )}
        
        {duration && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <span>⏱️</span>
            <span>Estimated time: {Math.round(duration / 60)} minutes</span>
          </div>
        )}
      </div>
    </div>
  );
}

