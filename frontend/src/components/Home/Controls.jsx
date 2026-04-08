import { FaCheck, FaImage, FaTimes } from 'react-icons/fa';
import { MdRotateLeft } from 'react-icons/md';
import React, { useState, useRef } from 'react';

const LABEL_MAP = {
  "Front": "ด้านหน้า",
  "Left": "ด้านซ้าย",
  "Back": "ด้านหลัง",
  "Right": "ด้านขวา",
  "Front-Left": "ด้านหน้า-ซ้าย",
  "Front-Right": "ด้านหน้า-ขวา",
  "Back-Left": "ด้านหลัง-ซ้าย",
  "Back-Right": "ด้านหลัง-ขวา"
};

const ANGLE_MAPPING = {
  'front': 'Front',
  'right': 'Right',
  'rear': 'Back',
  'left': 'Left',
  'Front-Left': 'Front-Left',
  'Front-Right': 'Front-Right',
  'Back-Left': 'Back-Left',
  'Back-Right': 'Back-Right'
};

export default function ResultCard({
  activeAngle,
  onImageCapture,
  loading,
  predictions,
  setPredictions,
  isCar,
  setIsCar,
  capturedImage,
  verifiedAngles
}) {
  const [selectedResult, setSelectedResult] = useState(null);
  const [targetConfidence, setTargetConfidence] = useState(null);
  const fileInputRef = useRef(null);

  React.useEffect(() => {
    if (predictions.length > 0 && isCar) {
      const targetModelLabel = ANGLE_MAPPING[activeAngle.id];
      const targetPred = predictions.find(p => p.label === targetModelLabel);
      setTargetConfidence(targetPred ? targetPred.confidence : null);
      setSelectedResult(predictions[0]);
    } else {
      setTargetConfidence(null);
      setSelectedResult(null);
    }
  }, [predictions, isCar, activeAngle.id]);

  const handleConfirmSelection = () => {
    if (selectedResult) {
      setPredictions([]);
      setSelectedResult(null);
    }
  };

  const handleReset = () => {
    setPredictions([]);
    setSelectedResult(null);
    setTargetConfidence(null);
    setIsCar(true);
  };

  // ─── No predictions yet = gallery button ───────────────────────
  if (predictions.length === 0) {
    return (
      <div>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files[0];
            if (file) onImageCapture(file);
            e.target.value = '';
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-white border-2 border-dashed border-blue-200 text-blue-500 font-bold hover:bg-blue-50 hover:border-blue-400 transition-all disabled:opacity-50 text-sm"
        >
          <FaImage className="text-lg" />
          เลือกรูปจากคลัง
        </button>
      </div>
    );
  }

  // ─── Not a car warning ─────────────────────────────────────────
  if (!isCar) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-3xl p-5 flex flex-col items-center gap-3 animate-slide-up">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center text-red-500 text-2xl">
          <FaTimes />
        </div>
        <div className="text-center">
          <h3 className="font-bold text-red-800 text-base">ไม่ใช่รูปรถยนต์</h3>
          <p className="text-red-500 text-xs mt-1">ไม่พบรถยนต์ในภาพนี้ กรุณาลองใหม่</p>
        </div>
        <button
          onClick={handleReset}
          className="w-full py-3 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all text-sm"
        >
          ลองใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  // ─── Predictions result card ───────────────────────────────────
  const topMatch = ANGLE_MAPPING[activeAngle.id];
  const matchedPred = predictions.find(p => p.label === topMatch);
  const isCorrectAngle = matchedPred && matchedPred.confidence > 70;

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-slide-up">
      {/* Status bar */}
      <div className={`px-5 py-3.5 flex items-center justify-between ${
        isCorrectAngle ? 'bg-green-500' : 'bg-orange-400'
      }`}>
        <div className="flex items-center gap-2 text-white">
          <span className="font-bold text-sm">
            {isCorrectAngle ? `✓ ตรงกับมุม ${activeAngle.label}` : `⚠ ตรวจพบมุมอื่น`}
          </span>
        </div>
        {targetConfidence !== null && (
          <span className="text-white/90 font-mono text-sm font-bold">
            {targetConfidence}%
          </span>
        )}
      </div>

      {/* Prediction options */}
      <div className="p-4">
        <p className="text-[11px] text-gray-400 font-bold mb-3 uppercase tracking-wider">AI ตรวจพบมุมเหล่านี้</p>
        <div className="flex flex-col gap-2">
          {predictions.slice(0, 3).map((res) => {
            const isSelected = selectedResult?.label === res.label;
            const confInt = Math.round(res.confidence);
            return (
              <button
                key={res.label}
                onClick={() => setSelectedResult(res)}
                className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                }`}
              >
                {/* Confidence bar */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-sm font-bold truncate ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                      {LABEL_MAP[res.label] || res.label}
                    </span>
                    <span className={`text-xs font-mono font-bold ml-2 flex-shrink-0 ${
                      confInt > 70 ? 'text-green-600' : confInt > 40 ? 'text-orange-500' : 'text-red-500'
                    }`}>{confInt}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isSelected ? 'bg-blue-500' :
                        confInt > 70 ? 'bg-green-400' :
                        confInt > 40 ? 'bg-orange-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${confInt}%` }}
                    />
                  </div>
                </div>
                {/* Checkmark */}
                <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs transition-all ${
                  isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 text-transparent'
                }`}>
                  <FaCheck />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-4 flex gap-3">
        <button
          onClick={handleReset}
          className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-200 transition-all"
        >
          <MdRotateLeft className="text-base" />
          ถ่ายใหม่
        </button>
        <button
          onClick={handleConfirmSelection}
          disabled={!selectedResult}
          className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <FaCheck className="text-xs" />
          ยืนยันมุมนี้
        </button>
      </div>
    </div>
  );
}
