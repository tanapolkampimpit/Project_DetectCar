import { FaCamera, FaSyncAlt, FaExclamationTriangle } from 'react-icons/fa';
import { MdCheckCircle, MdOutlinePhotoCamera } from 'react-icons/md';
import { useRef, useState, useEffect } from 'react';

export default function Viewfinder({ activeAngle, capturedImage, onImageCapture, loading, verifiedAngles }) {
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null); // String for error message
  const [facingMode, setFacingMode] = useState('environment');

  const isVerified = verifiedAngles?.[activeAngle.id];

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraReady(false);

    try {
      // Check if browser supports mediaDevices
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('NOT_SUPPORTED');
      }

      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }

      const constraints = {
        video: {
          // ใช้ ideal เพื่อให้บราวเซอร์พยายามหากล้องที่ตรงกัน โดยไม่แครชถ้าหาไม่เจอเป๊ะๆ
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        // Wait for metadata to load before playing
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(e => console.error("Video play failed:", e));
          setIsCameraReady(true);
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      let errorMsg = 'CAMERA_ERROR';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'PERMISSION_DENIED';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'NO_CAMERA';
      } else if (err.message === 'NOT_SUPPORTED') {
        errorMsg = 'NOT_SUPPORTED';
      }
      setCameraError(errorMsg);
      setIsCameraReady(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
      setIsCameraReady(false);
    }
  };

  useEffect(() => {
    if (!capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturedImage, facingMode]);

  const toggleCamera = (e) => {
    e.stopPropagation();
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const handleCapture = () => {
    if (isCameraReady && videoRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Use actual video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
          onImageCapture(file);
        }
      }, 'image/jpeg', 0.95);
    } else {
      fileInputRef.current?.click();
    }
  };

  const getErrorMessage = () => {
    switch (cameraError) {
      case 'PERMISSION_DENIED': return 'กรุณาอนุญาตให้เข้าถึงกล้อง';
      case 'NO_CAMERA': return 'ไม่พบกล้องในอุปกรณ์นี้';
      case 'NOT_SUPPORTED': return 'เบราว์เซอร์ไม่รองรับระบบกล้อง';
      default: return 'ไม่สามารถเปิดกล้องได้';
    }
  };

  return (
    <div
      className="relative w-full rounded-3xl overflow-hidden bg-gray-950 shadow-2xl cursor-pointer"
      style={{ aspectRatio: '4/3' }}
      onClick={() => !capturedImage && !isCameraReady && fileInputRef.current?.click()}
    >
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) onImageCapture(file);
          e.target.value = '';
        }}
      />

      <canvas ref={canvasRef} className="hidden" />

      {capturedImage ? (
        <img
          src={capturedImage}
          alt="Captured"
          className="w-full h-full object-cover animate-fade-in"
        />
      ) : (
        <div className="w-full h-full relative bg-gradient-to-br from-gray-900 to-gray-800">
          {!cameraError && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-opacity duration-500 ${isCameraReady ? 'opacity-100' : 'opacity-0'} ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
          )}

          {(!isCameraReady || cameraError) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gray-900/40 p-6 text-center">
              {cameraError ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                    <FaExclamationTriangle className="text-2xl" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-white font-bold">{getErrorMessage()}</p>
                    <p className="text-white/50 text-xs">แตะที่นี่เพื่อเลือกรูปจากคลังแทน</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); startCamera(); }}
                    className="mt-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs text-white border border-white/10 transition-all"
                  >
                    ลองใหม่
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center animate-pulse">
                    <FaCamera className="text-white/20 text-2xl" />
                  </div>
                  <p className="text-white/40 text-sm animate-pulse">กำลังเตรียมกล้อง...</p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Overlays */}
      {!cameraError && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          <div className="absolute inset-0 pointer-events-none p-6">
            <div className="absolute top-5 left-5 w-10 h-10 border-t-[3px] border-l-[3px] border-white/60 rounded-tl-xl" />
            <div className="absolute top-5 right-5 w-10 h-10 border-t-[3px] border-r-[3px] border-white/60 rounded-tr-xl" />
            <div className="absolute bottom-5 left-5 w-10 h-10 border-b-[3px] border-l-[3px] border-white/60 rounded-bl-xl" />
            <div className="absolute bottom-5 right-5 w-10 h-10 border-b-[3px] border-r-[3px] border-white/60 rounded-br-xl" />
          </div>
        </>
      )}

      {/* Top Header */}
      <div className="absolute top-0 left-0 w-full p-4 flex items-center justify-between pointer-events-none">
        {!capturedImage && !cameraError && (
          <button
            onClick={toggleCamera}
            className="pointer-events-auto bg-black/40 backdrop-blur-md text-white p-3 rounded-full border border-white/10 active:scale-90 transition-all"
          >
            <FaSyncAlt className="text-sm" />
          </button>
        )}
        <div className="flex-1 flex justify-center">
          <span className="bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-4 py-1.5 rounded-full border border-white/10 uppercase tracking-widest">
            {activeAngle.label}
          </span>
        </div>
        <div className="w-10 h-10" /> {/* Spacer */}
      </div>

      {isVerified && (
        <div className="absolute top-4 right-4">
          <div className="bg-green-500 text-white rounded-full p-1.5 shadow-lg animate-scale-in">
            <MdCheckCircle className="text-xl" />
          </div>
        </div>
      )}

      {/* Capture Button */}
      {!capturedImage && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <button
            onClick={(e) => { e.stopPropagation(); handleCapture(); }}
            disabled={loading}
            className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-95 ${loading || (cameraError && cameraError !== 'PERMISSION_DENIED')
                ? 'bg-white/20 cursor-not-allowed grayscale'
                : 'bg-white/20 hover:bg-white/30 backdrop-blur-md scale-110'
              }`}
          >
            {loading ? (
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <MdOutlinePhotoCamera className="text-white text-4xl" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}