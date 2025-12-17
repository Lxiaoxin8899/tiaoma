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
  height = 100,
  showValue = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    try {
      if (type === 'barcode') {
        const scale = 2; // Internal render scale for sharpness
        JsBarcode(canvasRef.current, value, {
          format: 'CODE128',
          width: width * scale,
          height: height * scale,
          displayValue: showValue,
          fontSize: 16 * scale,
          margin: 10 * scale,
          textMargin: 2 * scale,
          background: '#ffffff',
          lineColor: '#000000'
        });
      } else {
        const scale = 4; // High res for QR
        QRCode.toCanvas(canvasRef.current, value, {
          width: 200 * scale,
          margin: 2,
          errorCorrectionLevel: 'H',
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
    <div className="flex justify-center items-center overflow-hidden w-full">
      {/* Use CSS to scale down the high-res canvas to fit container if needed, maintaining aspect ratio */}
      <canvas
        ref={canvasRef}
        style={{
          maxWidth: '100%',
          height: 'auto',
          maxHeight: '300px' // Prevent it from becoming too tall
        }}
      />
    </div>
  );
};

export default BarcodeViewer;
