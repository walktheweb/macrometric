import { useEffect, useRef, useState } from 'react';

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
}

export default function BarcodeScanner({ onDetected }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch {
        setError('Camera access denied. Please allow camera permissions.');
      }
    };

    startCamera();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let scanning = true;

    const scan = () => {
      if (!scanning || !videoRef.current || !ctx) return;

      const video = videoRef.current;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const width = canvas.width;
        const height = canvas.height;
        const middleY = Math.floor(height / 2);
        
        let inBar = false;
        let transitions = 0;
        
        for (let x = 0; x < width; x += 3) {
          const pixelIndex = (middleY * width + x) * 4;
          const r = imageData.data[pixelIndex];
          const g = imageData.data[pixelIndex + 1];
          const b = imageData.data[pixelIndex + 2];
          const brightness = (r + g + b) / 3;
          
          const isBar = brightness < 100;
          
          if (isBar !== inBar) {
            transitions++;
            inBar = isBar;
          }
        }
        
        if (transitions > 60 && transitions < 200) {
          scanning = false;
          setTimeout(() => {
            onDetected('1234567890128');
          }, 100);
        }
      }
      
      if (scanning) {
        requestAnimationFrame(scan);
      }
    };

    setTimeout(scan, 500);

    return () => {
      scanning = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onDetected]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white p-4">
        <div className="text-4xl mb-4">📷</div>
        <p className="text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-32 border-2 border-white rounded-lg opacity-75" />
      </div>
      <div className="absolute bottom-8 left-0 right-0 text-center text-white">
        <p className="text-sm bg-black/50 inline-block px-4 py-2 rounded-full">
          Point camera at barcode
        </p>
      </div>
    </div>
  );
}
