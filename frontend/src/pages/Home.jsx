import React, { useState, useRef } from 'react';
import { FaCarSide, FaCheck, FaImage, FaTimes, FaRedo, FaShieldAlt } from 'react-icons/fa';
import { MdDirectionsCar, MdOutlineDirectionsCar, MdOutlinePhotoCamera } from 'react-icons/md';
import { TbCameraRotate } from 'react-icons/tb';
import Fotter from '../components/Layout/Fotter';

// ─── Insurance-required angles (6 มุม ตามมาตรฐานประกันภัย) ────────────────
const ANGLES = [
  {
    id: 'front',
    label: 'ด้านหน้าตรง',
    desc: 'ถ่ายให้เห็นรถเต็มคัน และป้ายทะเบียนหน้าชัดเจน',
    icon: <MdDirectionsCar />,
    modelKey: 'Front',
    tip: 'ยืนห่างจากรถ 3–5 เมตร ตรงกลางหน้ารถ',
  },
  {
    id: 'rear',
    label: 'ด้านหลังตรง',
    desc: 'ถ่ายให้เห็นรถเต็มคัน และป้ายทะเบียนหลังชัดเจน',
    icon: <MdOutlineDirectionsCar />,
    modelKey: 'Back',
    tip: 'ยืนห่างจากรถ 3–5 เมตร ตรงกลางท้ายรถ',
  },
  {
    id: 'left',
    label: 'ด้านข้างซ้าย',
    desc: 'ถ่ายด้านซ้ายตามยาว เห็นรถตลอดคัน',
    icon: <FaCarSide />,
    modelKey: 'Left',
    tip: 'ยืนห่างจากรถ 3–5 เมตร ขนานด้านซ้ายรถ',
  },
  {
    id: 'right',
    label: 'ด้านข้างขวา',
    desc: 'ถ่ายด้านขวาตามยาว เห็นรถตลอดคัน',
    icon: <FaCarSide style={{ transform: 'scaleX(-1)' }} />,
    modelKey: 'Right',
    tip: 'ยืนห่างจากรถ 3–5 เมตร ขนานด้านขวารถ',
  },
  {
    id: 'front-left',
    label: 'มุมหน้า-ซ้าย 45°',
    desc: 'ถ่ายมุมเฉียง 45° ด้านหน้า-ซ้าย',
    icon: <span className="text-lg font-black">↗</span>,
    modelKey: 'Front-Left',
    tip: 'ยืนมุม 45° หน้า-ซ้ายของรถ ให้เห็นด้านหน้าและด้านข้าง',
  },
  {
    id: 'front-right',
    label: 'มุมหน้า-ขวา 45°',
    desc: 'ถ่ายมุมเฉียง 45° ด้านหน้า-ขวา',
    icon: <span className="text-lg font-black">↖</span>,
    modelKey: 'Front-Right',
    tip: 'ยืนมุม 45° หน้า-ขวาของรถ ให้เห็นด้านหน้าและด้านข้าง',
  },
];

const LABEL_TH = {
  'Front': 'ด้านหน้าตรง',
  'Back': 'ด้านหลังตรง',
  'Left': 'ด้านข้างซ้าย',
  'Right': 'ด้านข้างขวา',
  'Front-Left': 'มุมหน้า-ซ้าย 45°',
  'Front-Right': 'มุมหน้า-ขวา 45°',
  'Back-Left': 'มุมหลัง-ซ้าย 45°',
  'Back-Right': 'มุมหลัง-ขวา 45°',
};

// ─── Blur helper: apply Gaussian-like blur via Canvas StackBlur ──────────────
async function applyBlurToFile(file, blurPx) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      // Draw original
      ctx.drawImage(img, 0, 0);
      if (blurPx > 0) {
        // Use CSS filter via offscreen approach
        ctx.filter = `blur(${blurPx}px)`;
        ctx.drawImage(img, 0, 0);
        ctx.filter = 'none';
      }
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
    };
    img.src = url;
  });
}

// ─── Main ───────────────────────────────────────────────────────────────────
export default function Home() {
  const [screen, setScreen] = useState('checklist'); // 'checklist' | 'capture'
  const [activeAngle, setActiveAngle] = useState(null);
  const [verifiedAngles, setVerifiedAngles] = useState({});
  const [capturedImage, setCapturedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [blurLevel, setBlurLevel] = useState(0);       // 0–20 px for test
  const [originalFile, setOriginalFile] = useState(null); // keep original for re-blur
  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const verifiedCount = Object.keys(verifiedAngles).length;
  const totalAngles = ANGLES.length;
  const allDone = verifiedCount === totalAngles;

  const handleStartCapture = (angle) => {
    setActiveAngle(angle);
    setCapturedImage(null);
    setResult(null);
    setBlurLevel(0);
    setOriginalFile(null);
    setScreen('capture');
  };

  const handleBack = () => {
    setScreen('checklist');
    setActiveAngle(null);
    setResult(null);
    setCapturedImage(null);
    setBlurLevel(0);
    setOriginalFile(null);
  };

  const analyzeImage = async (file) => {
    setLoading(true);
    setResult(null);

    // Immediate preview
    const reader = new FileReader();
    reader.onloadend = () => setCapturedImage(reader.result);
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append('file', file, 'image.jpg');
      formData.append('expected_view', activeAngle.modelKey);

      const res = await fetch('/api/v1/analyze', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();

      if (data.status === 'success') {
        setResult(data);

        // Auto-verify only if fully passed (angle + quality)
        if (data.match && data.is_car) {
          setTimeout(() => {
            setCapturedImage((img) => {
              setVerifiedAngles((prev) => ({
                ...prev,
                [activeAngle.id]: {
                  image: img,
                  confidence: data.best_confidence,
                  qualityOk: data.quality_ok,
                },
              }));
              return img;
            });
          }, 700);
        }
      }
    } catch (err) {
      setResult({ error: true, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setOriginalFile(file);
      setBlurLevel(0);
      analyzeImage(file);
    }
    e.target.value = '';
  };

  // Re-apply blur and re-analyze without picking a new file
  const handleBlurReanalyze = async () => {
    if (!originalFile) return;
    setResult(null);
    setLoading(true);
    try {
      const blurred = blurLevel > 0 ? await applyBlurToFile(originalFile, blurLevel) : originalFile;
      // Update preview
      const reader = new FileReader();
      reader.onloadend = () => setCapturedImage(reader.result);
      reader.readAsDataURL(blurred);
      // Send blurred blob
      const formData = new FormData();
      formData.append('file', blurred, 'image.jpg');
      formData.append('expected_view', activeAngle.modelKey);
      const res = await fetch('/api/v1/analyze', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      if (data.status === 'success') setResult(data);
    } catch (err) {
      setResult({ error: true, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // ── Done screen ─────────────────────────────────────────────────────────
  if (allDone) {
    return (
      <div className="max-w-[480px] w-full min-h-screen bg-[#f4f7fe] mx-auto flex flex-col pb-[80px] font-sans">
        <div className="bg-white px-5 pt-6 pb-5 rounded-b-3xl shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-white text-xl">
            <FaShieldAlt />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-gray-900">ถ่ายรูปครบแล้ว!</h1>
            <p className="text-[11px] text-gray-400">ผ่านทุกมุมตามมาตรฐานประกันภัย</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 p-4 mt-2">
          {/* Summary grid */}
          <div className="grid grid-cols-2 gap-3">
            {ANGLES.map((a) => {
              const v = verifiedAngles[a.id];
              return (
                <div key={a.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-green-100">
                  {v?.image ? (
                    <img src={v.image} alt={a.label} className="w-full h-24 object-cover" />
                  ) : (
                    <div className="w-full h-24 bg-green-50 flex items-center justify-center text-green-300 text-3xl">
                      {a.icon}
                    </div>
                  )}
                  <div className="px-3 py-2 flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white text-[8px] flex-shrink-0">
                      <FaCheck />
                    </div>
                    <span className="text-[11px] font-bold text-gray-700 leading-tight">{a.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => { setVerifiedAngles({}); setScreen('checklist'); }}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all mt-2"
          >
            เริ่มใหม่อีกครั้ง
          </button>
        </div>
        <Fotter />
      </div>
    );
  }

  // ── Capture screen ──────────────────────────────────────────────────────
  if (screen === 'capture' && activeAngle) {
    const matched = result?.match && result?.is_car;
    const notCar = result && !result.is_car;
    const wrongAngle = result?.is_car && result?.angle_match === false;
    const qualityFailed = result?.is_car && result?.angle_match && !result?.quality_ok;
    const topPred = result?.predictions?.[0];

    return (
      <div className="max-w-[480px] w-full min-h-screen bg-gray-950 mx-auto flex flex-col pb-[80px] font-sans">
        {/* Hidden inputs */}
        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
        <input ref={galleryInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <button onClick={handleBack} className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-white text-xl hover:bg-white/20 transition-all">
            ‹
          </button>
          <div className="text-center">
            <p className="text-white font-bold text-sm">{activeAngle.label}</p>
            <p className="text-white/40 text-[10px]">{verifiedCount}/{totalAngles} มุม</p>
          </div>
          <div className="w-9 h-9" /> {/* spacer */}
        </div>

        {/* Viewfinder */}
        <div className="relative mx-4 rounded-3xl overflow-hidden bg-gray-900 flex-shrink-0" style={{ aspectRatio: '4/3' }}>
          {capturedImage ? (
            <img src={capturedImage} alt="captured" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 px-8 text-center">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-white/30 text-3xl">
                {activeAngle.icon}
              </div>
              <p className="text-white/40 text-xs leading-relaxed">{activeAngle.tip}</p>
            </div>
          )}

          {/* Gradient overlay */}
          {capturedImage && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
          )}

          {/* Focus brackets */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-5 left-5 w-10 h-10 border-t-[3px] border-l-[3px] border-white/40 rounded-tl-xl" />
            <div className="absolute top-5 right-5 w-10 h-10 border-t-[3px] border-r-[3px] border-white/40 rounded-tr-xl" />
            <div className="absolute bottom-14 left-5 w-10 h-10 border-b-[3px] border-l-[3px] border-white/40 rounded-bl-xl" />
            <div className="absolute bottom-14 right-5 w-10 h-10 border-b-[3px] border-r-[3px] border-white/40 rounded-br-xl" />
          </div>

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-white text-sm font-medium">AI กำลังตรวจสอบ...</span>
            </div>
          )}

          {/* Success overlay */}
          {matched && (
            <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center gap-2">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white text-4xl shadow-2xl">
                <FaCheck />
              </div>
              <span className="text-white font-bold text-lg mt-1">ผ่านแล้ว!</span>
            </div>
          )}

          {/* Shutter button */}
          <div className="absolute bottom-4 inset-x-0 flex justify-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || matched}
              className={`w-16 h-16 rounded-full border-4 border-white flex items-center justify-center shadow-2xl transition-all active:scale-90 ${matched ? 'bg-green-500/80 border-green-300' : 'bg-white/20 backdrop-blur-md hover:bg-white/30'}`}
            >
              {matched
                ? <FaCheck className="text-white text-xl" />
                : <MdOutlinePhotoCamera className="text-white text-3xl" />}
            </button>
          </div>
        </div>

        {/* Result cards */}
        <div className="flex flex-col gap-2.5 p-4 mt-1">

          {/* Error */}
          {result?.error && (
            <StatusCard color="red" icon={<FaTimes />} title="เชื่อมต่อ backend ไม่ได้" desc={result.message} />
          )}

          {/* Not a car */}
          {notCar && (
            <StatusCard color="red" icon={<FaTimes />}
              title="ไม่พบรถยนต์ในภาพ"
              desc="กรุณาถ่ายภาพรถยนต์ให้ชัดเจนและอยู่กลางภาพ"
            />
          )}

          {/* Wrong angle */}
          {wrongAngle && topPred && (
            <StatusCard color="orange" icon="⚠"
              title={`พบมุมไม่ตรง — ลองยืนให้ตรงกว่านี้`}
              desc={`AI เห็นว่าเป็น ${LABEL_TH[topPred.label] || topPred.label} (${Math.round(topPred.confidence)}%)`}
            />
          )}

          {/* Quality issues */}
          {qualityFailed && result.quality_issues?.length > 0 && (
            <div className="bg-yellow-900/40 border border-yellow-500/30 rounded-2xl p-4 flex flex-col gap-2">
              <p className="text-yellow-300 font-bold text-sm">⚠ ภาพไม่ผ่านมาตรฐาน</p>
              {result.quality_issues.map((issue, i) => (
                <p key={i} className="text-yellow-200/70 text-xs">• {issue}</p>
              ))}
            </div>
          )}

          {/* Success */}
          {matched && (
            <StatusCard color="green" icon={<FaCheck />}
              title={`ตรงมุม "${activeAngle.label}" แล้ว!`}
              desc={`ความมั่นใจ ${Math.round(result.best_confidence)}% · คุณภาพภาพผ่าน`}
            />
          )}

          {/* Action buttons */}
          {result && (
            <div className="flex gap-3 mt-1">
              {!matched && (
                <button
                  onClick={() => { setCapturedImage(null); setResult(null); fileInputRef.current?.click(); }}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-white/10 text-white rounded-2xl font-bold text-sm hover:bg-white/20 transition-all"
                >
                  <FaRedo className="text-xs" /> ถ่ายใหม่
                </button>
              )}
              {matched && (
                <button
                  onClick={handleBack}
                  className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-green-500/30 hover:bg-green-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <FaCheck /> มุมต่อไป
                </button>
              )}
            </div>
          )}


          {/* Gallery fallback (shown when idle) */}
          {!result && !loading && (
            <button
              onClick={() => galleryInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-white/10 text-white/60 rounded-2xl font-bold text-sm hover:bg-white/15 transition-all border border-white/10"
            >
              <FaImage className="text-sm" /> เลือกจากคลังภาพ
            </button>
          )}

          {/* 🧪 Blur Test Panel — visible only when angle is correct */}
          {originalFile && result?.angle_match && !matched && (
            <div className="mt-1 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400 text-sm">🧪</span>
                  <span className="text-yellow-300 text-xs font-bold tracking-wide">ทดสอบภาพเบลอ</span>
                </div>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                  blurLevel === 0
                    ? 'bg-green-500/20 text-green-400'
                    : blurLevel <= 5
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {blurLevel === 0 ? 'ชัด' : `blur ${blurLevel}px`}
                </span>
              </div>

              {/* Slider */}
              <div className="flex items-center gap-3">
                <span className="text-white/30 text-[10px] font-bold w-6 text-center flex-shrink-0">0</span>
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={1}
                  value={blurLevel}
                  onChange={(e) => setBlurLevel(Number(e.target.value))}
                  className="flex-1 accent-yellow-400 cursor-pointer"
                />
                <span className="text-white/30 text-[10px] font-bold w-6 text-center flex-shrink-0">20</span>
              </div>

              {/* Re-analyze button */}
              <button
                onClick={handleBlurReanalyze}
                disabled={loading}
                className="w-full py-3 bg-yellow-500 text-gray-900 rounded-xl font-bold text-sm hover:bg-yellow-400 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading
                  ? <><div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" /> กำลังวิเคราะห์...</>
                  : <><FaRedo className="text-xs" /> ส่งวิเคราะห์ด้วยภาพระดับนี้</>
                }
              </button>

              <p className="text-white/25 text-[10px] text-center">blur จะถูกใช้จริงกับไฟล์ที่ส่ง backend</p>
            </div>
          )}

        </div>
      </div>
    );
  }

  // ── Checklist screen ────────────────────────────────────────────────────
  return (
    <div className="max-w-[480px] w-full min-h-screen bg-[#f4f7fe] mx-auto flex flex-col pb-[80px] font-sans">
      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-5 rounded-b-3xl shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl shadow-md shadow-blue-500/30">
            <FaShieldAlt />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-gray-900 leading-tight">ถ่ายรูปตรวจสภาพ</h1>
            <p className="text-[11px] text-gray-400">ตามมาตรฐานบริษัทประกันภัย · {totalAngles} มุม</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-700"
              style={{ width: `${(verifiedCount / totalAngles) * 100}%` }}
            />
          </div>
          <span className={`text-xs font-bold flex-shrink-0 ${verifiedCount === totalAngles ? 'text-green-600' : 'text-blue-600'}`}>
            {verifiedCount}/{totalAngles}
          </span>
        </div>
      </div>

      {/* Requirements note */}
      <div className="mx-4 mt-3 p-3 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-2">
        <span className="text-blue-400 text-sm mt-0.5 flex-shrink-0">ℹ️</span>
        <p className="text-blue-600 text-[11px] font-medium leading-relaxed">
          AI จะตรวจสอบว่า: มุมภาพถูกต้อง · เห็นรถเต็มคัน · ภาพไม่เบลอ · แสงพอเหมาะ
        </p>
      </div>

      {/* Angle list */}
      <div className="flex flex-col gap-3 p-4">
        {ANGLES.map((angle, idx) => {
          const verified = verifiedAngles[angle.id];
          // Allow all angles regardless of order (more flexible UX)
          const isNext = !verified && idx === ANGLES.findIndex(a => !verifiedAngles[a.id]);

          return (
            <button
              key={angle.id}
              onClick={() => !verified && handleStartCapture(angle)}
              disabled={!!verified}
              className={`w-full flex items-center gap-4 p-4 rounded-3xl border-2 text-left transition-all duration-300 ${
                verified
                  ? 'bg-green-50 border-green-200 cursor-default'
                  : isNext
                  ? 'bg-white border-blue-400 shadow-lg shadow-blue-100 active:scale-[0.98]'
                  : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm active:scale-[0.98]'
              }`}
            >
              {/* Thumbnail / Icon */}
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl overflow-hidden ${
                verified ? 'bg-green-100' : isNext ? 'bg-blue-50' : 'bg-gray-100'
              }`}>
                {verified?.image ? (
                  <img src={verified.image} alt={angle.label} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <span className={verified ? 'text-green-500' : isNext ? 'text-blue-500' : 'text-gray-300'}>
                    {angle.icon}
                  </span>
                )}
              </div>

              {/* Labels */}
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm ${verified ? 'text-green-800' : isNext ? 'text-blue-900' : 'text-gray-700'}`}>
                  {angle.label}
                </p>
                <p className={`text-[11px] mt-0.5 leading-relaxed ${verified ? 'text-green-600' : 'text-gray-400'}`}>
                  {verified
                    ? `ผ่านแล้ว · ความมั่นใจ ${Math.round(verified.confidence ?? 0)}%`
                    : angle.desc}
                </p>
              </div>

              {/* Status badge */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                verified
                  ? 'bg-green-500 text-white shadow-md shadow-green-300'
                  : isNext
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-300'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {verified ? (
                  <FaCheck className="text-xs" />
                ) : isNext ? (
                  <MdOutlinePhotoCamera className="text-sm" />
                ) : (
                  <span className="text-xs font-bold">{idx + 1}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Hint */}
      {verifiedCount > 0 && !allDone && (
        <div className="mx-4 p-3 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-2">
          <span className="text-base">💡</span>
          <p className="text-blue-600 text-xs font-medium">เหลืออีก {totalAngles - verifiedCount} มุม เสร็จใกล้แล้ว!</p>
        </div>
      )}

      <Fotter />
    </div>
  );
}

// ── Reusable status card ─────────────────────────────────────────────────────
function StatusCard({ color, icon, title, desc }) {
  const colors = {
    green:  'bg-green-900/40 border-green-500/30 text-green-400 bg-green-500/20',
    red:    'bg-red-900/40 border-red-500/30 text-red-400 bg-red-500/20',
    orange: 'bg-orange-900/40 border-orange-500/30 text-orange-400 bg-orange-500/20',
    yellow: 'bg-yellow-900/40 border-yellow-500/30 text-yellow-400 bg-yellow-500/20',
  };
  const [bg, border, iconColor, iconBg] = colors[color]?.split(' ') ?? [];

  return (
    <div className={`${bg} border ${border} rounded-2xl p-4 flex items-center gap-3 animate-fade-in`}>
      <div className={`w-10 h-10 ${iconBg} rounded-full flex items-center justify-center ${iconColor} flex-shrink-0 text-base`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-sm">{title}</p>
        {desc && <p className="text-white/50 text-xs mt-0.5">{desc}</p>}
      </div>
    </div>
  );
}
