'use client';

import { QRCodeSVG } from 'qrcode.react';

interface QRCodeDisplayProps {
  data: string;
  size?: number;
  title?: string;
}

export default function QRCodeDisplay({ data, size = 256, title }: QRCodeDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-2xl shadow-xl">
      {title && (
        <h3 className="text-xl font-bold text-gray-800">{title}</h3>
      )}
      <div className="p-4 bg-white rounded-lg border-4 border-purple-500">
        <QRCodeSVG
          value={data}
          size={size}
          level="H"
          includeMargin={true}
        />
      </div>
      <p className="text-sm text-gray-600 text-center max-w-xs">
        Share this QR code with your friends to invite them to your team
      </p>
    </div>
  );
}

