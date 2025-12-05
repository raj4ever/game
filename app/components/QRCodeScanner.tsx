'use client';

import { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRCodeScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export default function QRCodeScanner({ onScan, onClose }: QRCodeScannerProps) {
  const [error, setError] = useState<string>('');
  const [scanning, setScanning] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = 'qr-scanner';

  useEffect(() => {
    let html5QrcodeScanner: Html5Qrcode | null = null;

    const startScanning = async () => {
      try {
        html5QrcodeScanner = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrcodeScanner;

        await html5QrcodeScanner.start(
          {
            facingMode: 'environment' // Use back camera on mobile
          },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            // QR code detected
            console.log('QR Code detected:', decodedText);
            setScanning(false);
            onScan(decodedText);
            stopScanning();
          },
          (errorMessage) => {
            // Ignore scanning errors (they're frequent during scanning)
            // Only log if it's not a normal scanning error
            if (!errorMessage.includes('NotFoundException')) {
              // This is normal - just means no QR code in view yet
            }
          }
        );
      } catch (err: any) {
        console.error('QR Scanner error:', err);
        setError('Camera access denied. Please allow camera permission and try again.');
        setScanning(false);
      }
    };

    const stopScanning = async () => {
      if (html5QrcodeScanner) {
        try {
          await html5QrcodeScanner.stop();
          await html5QrcodeScanner.clear();
        } catch (err) {
          console.error('Error stopping scanner:', err);
        }
      }
    };

    startScanning();

    // Cleanup on unmount
    return () => {
      stopScanning();
    };
  }, [onScan]);

  const handleClose = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Scan QR Code</h2>
          <button
            onClick={handleClose}
            className="text-gray-600 hover:text-gray-800 text-2xl"
          >
            ×
          </button>
        </div>

        {error ? (
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <p className="text-sm text-gray-600 mb-4">
              Please allow camera permission in your browser settings and try again.
            </p>
          </div>
        ) : (
          <>
            <div className="relative mb-4 bg-black rounded-lg overflow-hidden" style={{ minHeight: '300px' }}>
              <div id={scannerId} style={{ width: '100%' }}></div>
            </div>
            
            <div className="text-center">
              <p className="text-gray-600 mb-2">
                Point your camera at the QR code
              </p>
              <p className="text-xs text-gray-500">
                Make sure the QR code is clearly visible in the frame
              </p>
            </div>
          </>
        )}

        <button
          onClick={handleClose}
          className="w-full mt-4 py-3 bg-gray-200 text-gray-800 rounded-xl font-bold hover:bg-gray-300 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

