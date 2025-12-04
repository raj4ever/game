'use client';

import { useState } from 'react';

export default function AdminPage() {
  const [lat, setLat] = useState('21.854978');
  const [lon, setLon] = useState('70.249041');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // In a real app, you would save this to a database or API
    // For now, we'll use localStorage
    localStorage.setItem('targetLat', lat);
    localStorage.setItem('targetLon', lon);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-800 to-gray-900 p-4">
      <div className="max-w-md mx-auto mt-20">
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            🎯 Admin Panel
          </h1>
          <p className="text-gray-600 mb-6 text-center">
            Set the target coordinates for the treasure hunt
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Latitude
              </label>
              <input
                type="text"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="21.854978"
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
                placeholder="70.249041"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handleSave}
              className="w-full py-4 bg-purple-600 text-white rounded-lg font-bold text-lg hover:bg-purple-700 transition shadow-lg"
            >
              {saved ? '✓ Saved!' : 'Save Coordinates'}
            </button>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> In a production app, these coordinates should be saved to a database. Currently using localStorage for demo purposes.
            </p>
          </div>

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

