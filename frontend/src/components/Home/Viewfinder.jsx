import { FaCamera } from 'react-icons/fa';
import { MdCheckCircle, MdOutlinePhotoCamera } from 'react-icons/md';
import { useRef } from 'react';

export default function Viewfinder({ activeAngle, capturedImage, onImageCapture, loading, verifiedAngles }) {
  const fileInputRef = useRef(null);
  const isVerified = verifiedAngles?.[activeAngle.id];

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-gray-950 shadow-2xl"
      style={{ aspectRatio: '4/3' }}>

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

      {/* Image preview or empty state */}
      {capturedImage ? (
        <img
          src={capturedImage}
          alt="Captured"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-gray-900 to-gray-800">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
            <FaCamera className="text-white/40 text-2xl" />
          </div>
          <p className="text-white/40 text-sm font-medium">แตะปุ่มกล้องเพื่อถ่ายรูป</p>
        </div>
      )}

      {/* Dark overlay for better readability */}
      {capturedImage && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
      )}

      {/* Focus brackets */}
      <div className="absolute inset-0 pointer-events-none p-6">
        <div className="absolute top-5 left-5 w-10 h-10 border-t-[3px] border-l-[3px] border-white/60 rounded-tl-xl" />
        <div className="absolute top-5 right-5 w-10 h-10 border-t-[3px] border-r-[3px] border-white/60 rounded-tr-xl" />
        <div className="absolute bottom-5 left-5 w-10 h-10 border-b-[3px] border-l-[3px] border-white/60 rounded-bl-xl" />
        <div className="absolute bottom-5 right-5 w-10 h-10 border-b-[3px] border-r-[3px] border-white/60 rounded-br-xl" />
      </div>

      {/* Top badge - angle label */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none">
        <span className="bg-black/50 backdrop-blur-md text-white text-xs font-bold px-4 py-1.5 rounded-full border border-white/10">
          {activeAngle.label}
        </span>
      </div>

      {/* Verified badge */}
      {isVerified && (
        <div className="absolute top-3 right-3">
          <div className="bg-green-500 text-white rounded-full p-1 shadow-lg">
            <MdCheckCircle className="text-xl" />
          </div>
        </div>
      )}

      {/* Bottom camera button */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className={`w-16 h-16 rounded-full border-4 border-white flex items-center justify-center shadow-2xl transition-all duration-200 active:scale-90 ${
            loading
              ? 'bg-white/20 cursor-not-allowed'
              : 'bg-white/20 hover:bg-white/30 backdrop-blur-md'
          }`}
          aria-label="ถ่ายรูป"
        >
          {loading ? (
            <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <MdOutlinePhotoCamera className="text-white text-3xl" />
          )}
        </button>
      </div>
    </div>
  );
}