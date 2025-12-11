import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

interface BarcodeViewerProps {
  value: string;
  type: 'barcode' | 'qrcode';
  width?: number;
  height?: number;
  showValue?: boolean;
}

const BarcodeViewer: React.FC<BarcodeViewerProps> = ({ 
  value, 
  type, 
  width = 2, 
  height = 50,
  showValue = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    try {
      if (type === 'barcode') {
        JsBarcode(canvasRef.current, value, {
          format: 'CODE128',
          width: width,
          height: height,
          displayValue: showValue,
          margin: 10,
          background: '#ffffff',
          lineColor: '#000000'
        });
      } else {
        QRCode.toCanvas(canvasRef.current, value, {
          width: height * 2, // QR code usually needs to be square and larger
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        }, (error) => {
          if (error) console.error('QR Code generation error:', error);
        });
      }
    } catch (error) {
      console.error('Barcode generation error:', error);
    }
  }, [value, type, width, height, showValue]);

  return (
    <div className="flex justify-center items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default BarcodeViewer;
