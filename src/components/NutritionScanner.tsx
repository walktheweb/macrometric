import { useState, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import MaterialIcon from './MaterialIcon';

interface NutritionScannerProps {
  onScan: (data: {
    name: string;
    calories: number;
    fat: number;
    protein: number;
    carbs: number;
    netCarbs: number;
    servingSize: string;
  }) => void;
  onClose: () => void;
}

export default function NutritionScanner({ onScan, onClose }: NutritionScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setError('Camera access denied. Please allow camera permissions.');
    }
  };

  const captureAndScan = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg');
    setCapturedImage(imageData);
    processImage(imageData);
  };

  const processImage = async (imageData: string) => {
    setIsProcessing(true);

    try {
      const result = await Tesseract.recognize(imageData, 'eng', {
        logger: m => console.log(m)
      });

      const text = result.data.text;
      const parsed = parseNutritionLabel(text);

      if (parsed.calories > 0 || parsed.fat > 0 || parsed.protein > 0 || parsed.carbs > 0) {
        onScan(parsed);
      } else {
        setError('Could not detect nutrition facts. Try another photo with better lighting.');
        setCapturedImage(null);
      }
    } catch (err) {
      console.error('OCR Error:', err);
      setError('Failed to process image. Please try again.');
      setCapturedImage(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const parseNutritionLabel = (text: string): {
    name: string;
    calories: number;
    fat: number;
    protein: number;
    carbs: number;
    netCarbs: number;
    servingSize: string;
  } => {
    const lines = text.split('\n').map(l => l.toLowerCase().trim());
    
    let calories = 0;
    let fat = 0;
    let protein = 0;
    let carbs = 0;
    let netCarbs = 0;
    let servingSize = '';

    for (const line of lines) {
      const caloriesMatch = line.match(/calories[\s\:]*(\d+)/i) || line.match(/^(\d+)\s*kcal/i);
      if (caloriesMatch) {
        calories = parseInt(caloriesMatch[1]) || 0;
      }

      const fatMatch = line.match(/total fat[\s\:]*(\d+\.?\d*)\s*g/i) || line.match(/fat[\s\:]*(\d+\.?\d*)\s*g/i);
      if (fatMatch) {
        fat = parseFloat(fatMatch[1]) || 0;
      }

      const proteinMatch = line.match(/protein[\s\:]*(\d+\.?\d*)\s*g/i);
      if (proteinMatch) {
        protein = parseFloat(proteinMatch[1]) || 0;
      }

      const carbsMatch = line.match(/total carbohydrate[\s\:]*(\d+\.?\d*)\s*g/i) || 
                         line.match(/carbohydrate[\s\:]*(\d+\.?\d*)\s*g/i) ||
                         line.match(/carbs[\s\:]*(\d+\.?\d*)\s*g/i);
      if (carbsMatch) {
        carbs = parseFloat(carbsMatch[1]) || 0;
      }

      const netCarbsMatch = line.match(/net carbs[\s\:]*(\d+\.?\d*)\s*g/i) ||
                           line.match(/digestible carbs[\s\:]*(\d+\.?\d*)\s*g/i) ||
                           line.match(/net carbohydrate[\s\:]*(\d+\.?\d*)\s*g/i);
      if (netCarbsMatch) {
        netCarbs = parseFloat(netCarbsMatch[1]) || 0;
      }

      const servingMatch = line.match(/serving size[\s\:]*([^\n]+)/i) || 
                          line.match(/serving[\s\:]*(\d+[^\n]*)/i);
      if (servingMatch && !servingSize) {
        servingSize = servingMatch[1].trim();
      }
    }

    if (!servingSize) {
      servingSize = '100g';
    }

    return { name: '', calories, fat, protein, carbs, netCarbs, servingSize };
  };

  const retake = () => {
    setCapturedImage(null);
    setError('');
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full text-black"
        >
          <MaterialIcon name="close" className="text-[20px]" />
        </button>
        <div className="mb-4 text-white">
          <MaterialIcon name="photo_camera" className="text-[40px]" />
        </div>
        <p className="text-white text-center mb-4">{error}</p>
        <button
          onClick={retake}
          className="px-6 py-3 bg-white text-black rounded-xl font-semibold"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full text-black"
      >
        <MaterialIcon name="close" className="text-[20px]" />
      </button>

      {!capturedImage ? (
        <>
          <video
            ref={videoRef}
            className="flex-1 object-cover"
            playsInline
            autoPlay
            muted
          />
          <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-4">
            <p className="text-white text-sm bg-black/50 px-4 py-2 rounded-full">
              Point camera at nutrition label
            </p>
            <button
              onClick={captureAndScan}
              disabled={isProcessing}
              className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 hover:bg-gray-100 transition-colors disabled:opacity-50"
            />
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center">
          <img src={capturedImage} alt="Captured" className="w-full h-auto max-h-[60vh] object-contain" />
          <div className="mt-4 flex gap-4">
            <button
              onClick={retake}
              className="px-6 py-3 bg-gray-600 text-white rounded-xl font-semibold"
            >
              Retake
            </button>
            {isProcessing && (
              <div className="px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold flex items-center gap-2">
                <MaterialIcon name="hourglass_top" className="text-[18px] animate-spin" />
                Processing...
              </div>
            )}
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
