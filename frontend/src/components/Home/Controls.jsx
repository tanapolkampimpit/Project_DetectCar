import { FaCheck, FaImage, FaLink } from 'react-icons/fa';
import { FaRotateLeft } from 'react-icons/fa6';
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

export default function Controls({ activeAngle, onImageCapture }) {
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [targetConfidence, setTargetConfidence] = useState(null);
  const [isCar, setIsCar] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef(null);

  // Map activeAngle.id from UI to Model Label names
  const ANGLE_MAPPING = {
    'front': 'Front',
    'right': 'Right',
    'rear': 'Back',
    'left': 'Left',
    'front-left': 'Front-Left',
    'front-right': 'Front-Right',
    'back-left': 'Back-Left',
    'back-right': 'Back-Right'
  };

  const handleUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      processAnalysis(file);
    }
  };

  const processAnalysis = async (imageFile) => {
    setLoading(true);
    setPredictions([]);
    setSelectedResult(null);
    setTargetConfidence(null);

    try {
      // Create preview Data URL for localStorage
      if (imageFile instanceof Blob) {
        const reader = new FileReader();
        reader.onloadend = () => {
          onImageCapture(reader.result);
        };
        reader.readAsDataURL(imageFile);
      }

      const formData = new FormData();
      formData.append('file', imageFile, 'image.jpg');

      // Use absolute path for local backend
      const response = await fetch('http://localhost:8000/api/v1/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const result = await response.json();
      if (result.status === 'success') {
        const sortedPredictions = result.predictions;
        setPredictions(sortedPredictions);
        setIsCar(result.is_car);

        if (result.is_car) {
          const targetModelLabel = ANGLE_MAPPING[activeAngle.id];
          const targetPred = sortedPredictions.find(p => p.label === targetModelLabel);
          if (targetPred) {
            setTargetConfidence(targetPred.confidence);
          }

          if (sortedPredictions.length > 0) {
            setSelectedResult(sortedPredictions[0]);
          }
        } else {
          setTargetConfidence(null);
          setSelectedResult(null);
        }
      }
    } catch (error) {
      console.error("Error processing analysis:", error);
      alert("ไม่สามารถวิเคราะห์ภาพได้");
    } finally {
      setLoading(false);
    }
  };

  const handleUrlAnalyze = async () => {
    if (!imageUrl || loading) return;
    setLoading(true);
    try {
      // Note: This might fail due to CORS if the image server doesn't allow it
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      processAnalysis(blob);
      setShowUrlInput(false);
      setImageUrl('');
    } catch (error) {
      console.error("Error fetching image from URL:", error);
      alert("ไม่สามารถดึงรูปภาพจาก URL ได้ (อาจติดปัญหา CORS)");
      setLoading(false);
    }
  };

  const handleConfirmSelection = () => {
    if (selectedResult) {
      alert(`คุณยืนยันเลือก: ${LABEL_MAP[selectedResult.label] || selectedResult.label} (ความมั่นใจ ${selectedResult.confidence}%)`);
      setPredictions([]);
      setSelectedResult(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-4">
      {/* Action Bar */}
      <div className="flex items-center justify-center gap-6">
        {/* Gallery / Image Upload */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files[0];
            if (file) processAnalysis(file);
          }}
        />
        <button
          onClick={() => fileInputRef.current.click()}
          disabled={loading}
          className="w-18 h-18 rounded-3xl flex flex-col items-center justify-center transition-all bg-white text-blue-600 hover:bg-blue-50 shadow-lg border border-blue-100 gap-1 active:scale-95"
          aria-label="Upload Image"
        >
          <FaImage className="text-2xl" />
          <span className="text-[10px] font-bold">เลือกรูป</span>
        </button>

        <button
          onClick={() => setShowUrlInput(!showUrlInput)}
          disabled={loading}
          className={`w-18 h-18 rounded-3xl flex flex-col items-center justify-center transition-all shadow-lg border gap-1 active:scale-95 ${showUrlInput ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'}`}
          aria-label="Test from URL"
        >
          <FaLink className="text-2xl" />
          <span className="text-[10px] font-bold">ใส่ลิงก์</span>
        </button>

        <button
          onClick={() => { setPredictions([]); setSelectedResult(null); setTargetConfidence(null); setIsCar(true); }}
          disabled={predictions.length === 0}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${predictions.length > 0
            ? 'bg-orange-50 text-orange-500 hover:bg-orange-100 active:scale-90 shadow-sm'
            : 'bg-transparent text-transparent pointer-events-none'
            }`}
        >
          <FaRotateLeft className="text-lg" />
        </button>
      </div>

      {/* URL Input field for testing */}
      {showUrlInput && (
        <div className="mx-6 p-4 bg-white border-2 border-dashed border-blue-200 rounded-3xl animate-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col gap-3">
            <h5 className="text-xs font-bold text-blue-600 px-1 uppercase tracking-wider">ทดสอบด้วย URL รูปภาพ</h5>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://example.com/car-image.jpg"
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <button
                onClick={handleUrlAnalyze}
                disabled={!imageUrl || loading}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-2xl text-sm font-bold disabled:opacity-50 hover:bg-blue-700 transition-colors"
              >
                {loading ? '...' : 'ตรวจ'}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 px-1">
              * หมายเหตุ: ลิงก์บางเว็บอาจมีระบบป้องกันไม่ให้ดึงข้อมูลข้ามเว็บไซต์ (CORS)
            </p>
          </div>
        </div>
      )}

      {/* Not a Car Warning */}
      {predictions.length > 0 && !isCar && (
        <div className="mx-6 p-6 bg-red-50 border-2 border-red-100 rounded-3xl flex flex-col items-center gap-3 shadow-md animate-in slide-in-from-top-4 duration-500">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-2">
            <FaRotateLeft className="text-3xl" />
          </div>
          <h3 className="text-xl font-bold text-red-800">ไม่ใช่รูปรถยนต์</h3>
          <p className="text-red-600/80 text-center text-sm font-medium">ไม่พบรถยนต์ในภาพนี้ <br /> หรือภาพถ่ายไม่ชัดเจนพอสําหรับการวิเคราะห์</p>
          <button
            onClick={() => { setPredictions([]); setIsCar(true); }}
            className="mt-4 w-full py-3 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-colors"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      )}

      {/* Target Confidence Check (Requested Feature) - Only if it's a car */}
      {predictions.length > 0 && isCar && targetConfidence !== null && (
        <div className="mx-6 p-4 bg-white border border-blue-100 rounded-3xl flex items-center justify-between shadow-sm animate-in zoom-in-95 duration-300">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm ${targetConfidence > 70 ? 'bg-green-100 text-green-600' :
                targetConfidence > 40 ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
              }`}>
              {activeAngle.icon}
            </div>
            <div>
              <h5 className="text-[12px] font-bold text-gray-400 leading-none">ความมั่นใจว่าเป็น {activeAngle.label}</h5>
              <p className={`text-lg font-black ${targetConfidence > 70 ? 'text-green-600' :
                  targetConfidence > 40 ? 'text-orange-600' : 'text-red-500'
                }`}>
                {targetConfidence}%
              </p>
            </div>
          </div>

          <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${targetConfidence > 70 ? 'bg-green-500' :
                  targetConfidence > 40 ? 'bg-orange-500' : 'bg-red-500'
                }`}
              style={{ width: `${targetConfidence}%` }}
            />
          </div>
        </div>
      )}

      {/* Results Selection Card - Only if it's a car */}
      {predictions.length > 0 && isCar && (
        <div className="bg-white border border-gray-100 rounded-[32px] p-5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] animate-in fade-in slide-in-from-bottom-5 duration-500">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-3">
              {onImageCapture && (
                <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-blue-100 shadow-sm">
                  <img src={localStorage.getItem('last_captured_car')} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <h4 className="font-bold text-gray-900 border-b-2 border-blue-500/10 pb-0.5 inline-block text-base">ระบบวิเคราะห์มุมภาพ</h4>
                <p className="text-[11px] text-gray-400 mt-0.5 font-medium">มุมที่ AI ตรวจพบในภาพ</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest font-black text-blue-600/60 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                AI Processing
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {predictions.slice(0, 4).map((res, index) => (
              <button
                key={res.label}
                onClick={() => setSelectedResult(res)}
                className={`flex flex-col gap-1.5 p-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden group ${selectedResult?.label === res.label
                  ? 'border-blue-600 bg-blue-100/30'
                  : 'border-gray-50 bg-gray-50 hover:bg-white hover:border-gray-200'
                  }`}
              >
                {selectedResult?.label === res.label && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-white text-[10px]">
                    <FaCheck />
                  </div>
                )}
                <span className={`text-[14px] font-bold ${selectedResult?.label === res.label ? 'text-blue-900' : 'text-gray-700'}`}>
                  {LABEL_MAP[res.label] || res.label}
                  {res.label === ANGLE_MAPPING[activeAngle.id] && (
                    <span className="ml-2 text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full uppercase tracking-tighter align-middle">
                      Selected
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200/60 rounded-full overflow-hidden backdrop-blur-sm">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${selectedResult?.label === res.label ? 'bg-blue-600' : 'bg-gray-400'
                        }`}
                      style={{ width: `${res.confidence}%` }}
                    />
                  </div>
                  <span className={`text-[11px] font-mono font-bold ${selectedResult?.label === res.label ? 'text-blue-600' : 'text-gray-400'
                    }`}>
                    {Math.round(res.confidence)}%
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => { setPredictions([]); setSelectedResult(null); }}
              className="flex-1 py-4 rounded-2xl font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 transition-all text-sm"
            >
              ถ่ายใหม่
            </button>
            <button
              onClick={handleConfirmSelection}
              className="flex-[2] py-4 bg-[#1e40af] text-white rounded-2xl font-bold shadow-[0_10px_20px_-5px_rgba(30,64,175,0.3)] active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2"
            >
              <FaCheck className="text-xs" />
              ยืนยันการเลือก
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
