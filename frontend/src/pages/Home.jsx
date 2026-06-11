import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCarSide, FaCheck, FaImage, FaTimes, FaRedo, FaShieldAlt, FaIdCard, FaFileAlt, FaPlus, FaTools } from 'react-icons/fa';
import { MdDirectionsCar, MdOutlineDirectionsCar, MdOutlinePhotoCamera, MdSettingsInputComponent, MdQrCodeScanner } from 'react-icons/md';
import { GiCarSeat, GiCarWheel } from 'react-icons/gi';
import { TbCameraRotate } from 'react-icons/tb';

// ─── Insurance-required angles (22 มุม ตามมาตรฐานประกันภัย) ────────────────
const ANGLES = [
  { id: 'front', label: 'ด้านหน้าตรง', desc: 'ถ่ายให้เห็นรถเต็มคัน และป้ายทะเบียนหน้าชัดเจน', icon: <MdDirectionsCar />, modelKey: 'Front', tip: 'ยืนห่างจากรถ 3–5 เมตร ตรงกลางหน้ารถ' },
  { id: 'rear', label: 'ด้านหลังตรง', desc: 'ถ่ายให้เห็นรถเต็มคัน และป้ายทะเบียนหลังชัดเจน', icon: <MdOutlineDirectionsCar />, modelKey: 'Back', tip: 'ยืนห่างจากรถ 3–5 เมตร ตรงกลางท้ายรถ' },
  { id: 'left', label: 'ด้านข้างซ้าย', desc: 'ถ่ายด้านซ้ายตามยาว เห็นรถตลอดคัน', icon: <FaCarSide />, modelKey: 'Left', tip: 'ยืนห่างจากรถ 3–5 เมตร ขนานด้านซ้ายรถ' },
  { id: 'right', label: 'ด้านข้างขวา', desc: 'ถ่ายด้านขวาตามยาว เห็นรถตลอดคัน', icon: <FaCarSide style={{ transform: 'scaleX(-1)' }} />, modelKey: 'Right', tip: 'ยืนห่างจากรถ 3–5 เมตร ขนานด้านขวารถ' },
  { id: 'roof', label: 'หลังคารถยนต์', desc: 'ถ่ายให้เห็นหลังคารถชัดเจน', icon: <span className="text-lg font-black">⬆️</span>, modelKey: 'Roof', tip: 'หาจุดที่สูงกว่ารถ หรือชูแขนถ่ายให้เห็นหลังคาเต็มพื้นที่' },
  { id: 'interior', label: 'ภายใน/อุปกรณ์ตกแต่ง', desc: 'ถ่ายภาพคอนโซลหน้า และภายในรถ', icon: <GiCarSeat />, modelKey: 'Interior', tip: 'เปิดประตูถ่ายให้เห็นคอนโซล เบาะ และอุปกรณ์ภายใน' },
  { id: 'spare_tire', label: 'ยางอะไหล่', desc: 'ถ่ายภาพยางอะไหล่ (ถ้ามี)', icon: <GiCarWheel />, modelKey: 'SpareTire', tip: 'ถ่ายให้เห็นตัวยางและสภาพของยางอะไหล่' },
  { id: 'chassis', label: 'เลขตัวถังรถยนต์', desc: 'ถ่ายภาพเลขตัวถังให้ชัดเจน', icon: <FaIdCard />, modelKey: 'ChassisNumber', tip: 'หาตำแหน่งเลขตัวถัง (มักอยู่ที่เสาประตูหรือห้องเครื่อง) แล้วถ่ายให้ชัดเจน' },
  { id: 'accessories', label: 'กรณีมีอุปกรณ์ตกแต่ง เช่นล้อแม็กซ์ เครื่องเสียง', desc: 'อุปกรณ์ตกแต่งเพิ่มเติม', icon: <FaTools />, modelKey: 'Accessories', tip: 'ถ่ายเจาะจงอุปกรณ์ที่ต้องการระบุในกรมธรรม์' },
  { id: 'dashcam', label: 'กล้องติดหน้ารถ', desc: 'ถ่ายภาพกล้องที่ติดตั้งในรถ', icon: <MdSettingsInputComponent />, modelKey: 'Dashcam', tip: 'ถ่ายให้เห็นตัวกล้องที่ติดตั้งอยู่บนกระจกหรือคอนโซล' },
  { id: 'front-right', label: 'เฉียงหน้าด้านขวา', desc: 'ถ่ายมุมเฉียง 45° ด้านหน้า-ขวา', icon: <span className="text-lg font-black">↖</span>, modelKey: 'Front-Right', tip: 'ยืนมุม 45° หน้า-ขวาของรถ' },
  { id: 'front-left', label: 'เฉียงหน้าด้านซ้าย', desc: 'ถ่ายมุมเฉียง 45° ด้านหน้า-ซ้าย', icon: <span className="text-lg font-black">↗</span>, modelKey: 'Front-Left', tip: 'ยืนมุม 45° หน้า-ซ้ายของรถ' },
  { id: 'back-right', label: 'เฉียงหลังด้านขวา', desc: 'ถ่ายมุมเฉียง 45° ด้านหลัง-ขวา', icon: <span className="text-lg font-black">↘</span>, modelKey: 'Back-Right', tip: 'ยืนมุม 45° หลัง-ขวาของรถ' },
  { id: 'back-left', label: 'เฉียงหลังด้านซ้าย', desc: 'ถ่ายมุมเฉียง 45° ด้านหลัง-ซ้าย', icon: <span className="text-lg font-black">↙</span>, modelKey: 'Back-Left', tip: 'ยืนมุม 45° หลัง-ซ้ายของรถ' },
  { id: 'odometer', label: 'จอเลขไมล์', desc: 'ถ่ายภาพหน้าปัดเรือนไมล์', icon: <MdQrCodeScanner />, modelKey: 'Odometer', tip: 'สตาร์ทรถหรือบิดกุญแจให้เห็นตัวเลขไมล์ชัดเจน' },
  { id: 'tax_sticker', label: 'แผ่นป้ายภาษี', desc: 'ถ่ายภาพป้ายภาษีรถยนต์', icon: <FaFileAlt />, modelKey: 'TaxSticker', tip: 'ถ่ายให้เห็นปีภาษีและทะเบียนชัดเจน' },
  { id: 'registration_doc', label: 'รายการจดทะเบียน', desc: 'ถ่ายภาพเล่มทะเบียนรถ', icon: <FaFileAlt />, modelKey: 'RegistrationDoc', tip: 'ถ่ายให้เห็นรายละเอียดในเล่มทะเบียนชัดเจน' },
  { id: 'engine_compartment', label: 'ห้องเครื่องยนต์', desc: 'ถ่ายภาพห้องเครื่อง', icon: <FaTools />, modelKey: 'EngineCompartment', tip: 'เปิดฝากระโปรงหน้า ถ่ายให้เห็นภาพรวมของห้องเครื่อง' },
  { id: 'tire_fl', label: 'ล้อที่ให้เห็นยี่ห้อและขนาด ปีผลิตของยาง ล้อหน้าซ้าย', desc: 'ล้อหน้าซ้าย', icon: <GiCarWheel />, modelKey: 'TireFrontLeft', tip: 'ถ่ายเจาะจงล้อหน้าซ้าย ให้เห็นยี่ห้อ ขนาด และปีผลิต' },
  { id: 'tire_fr', label: 'ล้อที่ให้เห็นยี่ห้อและขนาด ปีผลิตของยาง ล้อหน้าขวา', desc: 'ล้อหน้าขวา', icon: <GiCarWheel />, modelKey: 'TireFrontRight', tip: 'ถ่ายเจาะจงล้อหน้าขวา ให้เห็นยี่ห้อ ขนาด และปีผลิต' },
  { id: 'tire_bl', label: 'ล้อที่ให้เห็นยี่ห้อและขนาด ปีผลิตของยาง ล้อหลังซ้าย', desc: 'ล้อหลังซ้าย', icon: <GiCarWheel />, modelKey: 'TireBackLeft', tip: 'ถ่ายเจาะจงล้อหลังซ้าย ให้เห็นยี่ห้อ ขนาด และปีผลิต' },
  { id: 'tire_br', label: 'ล้อที่ให้เห็นยี่ห้อและขนาด ปีผลิตของยาง ล้อหลังขวา', desc: 'ล้อหลังขวา', icon: <GiCarWheel />, modelKey: 'TireBackRight', tip: 'ถ่ายเจาะจงล้อหลังขวา ให้เห็นยี่ห้อ ขนาด และปีผลิต' },
  { id: 'others', label: 'อื่นๆ (MTPhoto)', desc: 'ภาพอื่นๆ นอกเหนือจากที่ระบุ', icon: <FaImage />, modelKey: 'Others', tip: 'ถ่ายภาพส่วนอื่นๆ ของรถเพิ่มเติม' }
];

const LABEL_TH = {
  'Front': 'ด้านหน้าตรง',
  'Back': 'ด้านหลังตรง',
  'Left': 'ด้านข้างซ้าย',
  'Right': 'ด้านข้างขวา',
  'Front-Left': 'เฉียงหน้าด้านซ้าย',
  'Front-Right': 'เฉียงหน้าด้านขวา',
  'Back-Left': 'เฉียงหลังด้านซ้าย',
  'Back-Right': 'เฉียงหลังด้านขวา',
  'Roof': 'หลังคารถยนต์',
  'Interior': 'ภายใน/อุปกรณ์ตกแต่ง',
  'SpareTire': 'ยางอะไหล่',
  'ChassisNumber': 'เลขตัวถังรถยนต์',
  'Accessories': 'กรณีมีอุปกรณ์ตกแต่ง เช่นล้อแม็กซ์ เครื่องเสียง',
  'Dashcam': 'กล้องติดหน้ารถ',
  'Odometer': 'จอเลขไมล์',
  'TaxSticker': 'แผ่นป้ายภาษี',
  'RegistrationDoc': 'รายการจดทะเบียน',
  'EngineCompartment': 'ห้องเครื่องยนต์',
  'TireFrontLeft': 'ล้อหน้าซ้าย',
  'TireFrontRight': 'ล้อหน้าขวา',
  'TireBackLeft': 'ล้อหลังซ้าย',
  'TireBackRight': 'ล้อหลังขวา',
  'Others': 'อื่นๆ (MTPhoto)'
};



const drawDamagesOnImage = (imageSrc, damages) => {
  return new Promise((resolve) => {
    if (!damages || damages.length === 0) {
      resolve(imageSrc);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const lineWidth = Math.max(3, Math.floor(img.width / 200));
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = '#ef4444'; // Tailwind red-500

      const fontSize = Math.max(16, Math.floor(img.width / 30));
      ctx.font = `bold ${fontSize}px sans-serif`;

      damages.forEach(dmg => {
        if (dmg.box && dmg.box.length === 4) {
          const [x1, y1, x2, y2] = dmg.box;

          ctx.beginPath();
          ctx.rect(x1, y1, x2 - x1, y2 - y1);
          ctx.stroke();

          const text = dmg.label;
          const textWidth = ctx.measureText(text).width;
          const textHeight = fontSize;

          const bgX = x1 - lineWidth / 2;
          let bgY = y1 - textHeight - 8;
          if (bgY < 0) bgY = y1;

          ctx.fillStyle = '#ef4444';
          ctx.fillRect(bgX, bgY, textWidth + 12, textHeight + 8);

          ctx.fillStyle = '#ffffff';
          ctx.fillText(text, bgX + 6, bgY + textHeight);
        }
      });
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(URL.createObjectURL(blob));
        } else {
          resolve(imageSrc);
        }
      }, 'image/jpeg', 0.85);
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
};

// ─── Main ───────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState('checklist'); // 'checklist' | 'capture'
  const [activeAngle, setActiveAngle] = useState(null);
  const [verifiedAngles, setVerifiedAngles] = useState({});
  const [duplicateImages, setDuplicateImages] = useState([]);
  const [capturedImage, setCapturedImage] = useState(null);
  const [originalImage, setOriginalImage] = useState(null);
  const [zoomImage, setZoomImage] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const batchInputRef = useRef(null);

  const verifiedCount = Object.keys(verifiedAngles).length;
  const totalAngles = ANGLES.length;
  const allDone = verifiedCount === totalAngles;

  const handleStartCapture = (angle) => {
    setActiveAngle(angle);
    setCapturedImage(null);
    setResult(null);
    setScreen('capture');
  };

  const handleBack = () => {
    setScreen('checklist');
    setActiveAngle(null);
    setResult(null);
    setCapturedImage(null);
    setOriginalImage(null);
  };

  const handleRemoveVerified = (e, angleId) => {
    e.stopPropagation();
    if (window.confirm(`ลบรูปภาพมุม "${LABEL_TH[ANGLES.find(a => a.id === angleId)?.modelKey]}" ใช่หรือไม่?`)) {
      setVerifiedAngles(prev => {
        const next = { ...prev };
        delete next[angleId];
        return next;
      });
    }
  };

  const analyzeImage = async (file) => {
    setLoading(true);
    setResult(null);

    // Immediate preview
    let base64Image = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    setCapturedImage(base64Image);
    setOriginalImage(base64Image);
    const originalBase64Image = base64Image;

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

        // draw boxes
        if (data.damages && data.damages.length > 0) {
          base64Image = await drawDamagesOnImage(base64Image, data.damages);
          setCapturedImage(base64Image);
        }

        // --- เพิ่ม Logic: ถ้าไม่ใช่รถ ให้ลองหาช่อง "อื่นๆ" ที่ว่างอยู่ ---
        if (!data.is_car) {
          const predLabel = data.prediction?.label;
          const EXTERIOR_MODEL_KEYS = ['Front', 'Back', 'Left', 'Right', 'Roof', 'Front-Right', 'Front-Left', 'Back-Right', 'Back-Left'];

          // ถ้ายอดทำนายยังคงเป็นคลาสกลุ่มภายนอกรถ (แต่ confidence ต่ำ) ไม่ควรย้ายช่องอัตโนมัติ 
          // เพื่อให้ผู้ใช้เห็นปุ่ม "ยืนยันใช้รูปนี้" (Force Verify) และกดยืนยันใช้งานได้
          if (!EXTERIOR_MODEL_KEYS.includes(predLabel)) {
            // Find if the predLabel matches an angle modelKey
            const targetAngle = ANGLES.find(a => a.modelKey === predLabel);

            if (targetAngle && !verifiedAngles[targetAngle.id]) {
              setTimeout(() => {
                setCapturedImage((img) => {
                  setVerifiedAngles((prev) => ({
                    ...prev,
                    [targetAngle.id]: {
                      image: img,
                      originalImage: originalBase64Image,
                      confidence: data.prediction.confidence || 100,
                      quality: data.quality,
                      class_details: data.class_details,
                      damages: data.damages || [],
                    },
                  }));
                  return img;
                });
                alert(`ย้ายช่องอัตโนมัติ \nAI ตรวจพบว่าเป็นภาพ "${targetAngle.label}" จึงนำไปใส่ในช่องที่ถูกต้องให้ครับ`);
                handleBack();
              }, 700);
              return;
            }
          }
        }

        if (data.is_car) {
          if (data.match) {
            setTimeout(() => {
              setCapturedImage((img) => {
                setVerifiedAngles((prev) => ({
                  ...prev,
                  [activeAngle.id]: {
                    image: img,
                    confidence: data.prediction.confidence,
                    quality: data.quality,
                    class_details: data.class_details,
                    damages: data.damages || [],
                  },
                }));
                return img;
              });
            }, 700);
          } else {
            // Auto-Swap logic for single upload
            const predLabel = data.prediction.label;
            const targetAngle = ANGLES.find(a => a.modelKey === predLabel);
            const threshold = predLabel === 'Roof' ? 25 : 55;
            if (targetAngle && data.prediction.confidence > threshold) {
              setTimeout(() => {
                setCapturedImage((img) => {
                  setVerifiedAngles((prev) => ({
                    ...prev,
                    [targetAngle.id]: {
                      image: img,
                      originalImage: originalBase64Image,
                      confidence: data.prediction.confidence,
                      quality: data.quality,
                      class_details: data.class_details,
                      damages: data.damages || [],
                    },
                  }));
                  return img;
                });
                alert(`สลับช่องอัตโนมัติ \nAI ตรวจพบว่าเป็นมุม "${targetAngle.label}" แทน จึงจัดเรียงเข้าช่องให้เรียบร้อยแล้วครับ!`);
                handleBack();
              }, 1200);
            }
          }
        }
      }
    } catch (err) {
      // --- Fallback Logic: หากเกิด Error (เช่น 400) ให้เช็คว่าเป็นกลุ่มมุมมองพิเศษหรือไม่ ---
      const NON_AI_VIEWS = ['interior', 'spare_tire', 'chassis', 'accessories', 'dashcam', 'inspection', 'others'];
      if (NON_AI_VIEWS.includes(activeAngle.id)) {
        console.log("Fallback: AI Error but view is Non-AI, verifying anyway.");
        setTimeout(() => {
          setCapturedImage((img) => {
            setVerifiedAngles((prev) => ({
              ...prev,
              [activeAngle.id]: {
                image: img,
                confidence: 100, // ใส่เป็น 100 สำหรับแมนนวล
                quality: { is_blurry: false },
              },
            }));
            return img;
          });
          handleBack();
        }, 500);
      } else {
        setResult({ error: true, message: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      analyzeImage(file);
    }
    e.target.value = '';
  };


  // ─── Batch Analysis ───────────────────────────────────────────────────────
  const handleBatchUpload = async (e) => {
    const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
    if (!files.length) {
      alert('ไม่พบรูปภาพในโฟลเดอร์ที่เลือก');
      return;
    }

    setBatchLoading(true);
    try {
      const formData = new FormData();
      const unverifiedKeys = ANGLES.filter(a => !verifiedAngles[a.id]).map(a => a.modelKey);

      const expViewsArray = files.map((file, index) => unverifiedKeys[index] || ANGLES[index % ANGLES.length].modelKey);
      formData.append('expected_views', expViewsArray.join(','));

      files.forEach((file) => {
        formData.append('files', file);
      });

      const res = await fetch('/api/v1/analyze_batch', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Server error ${res.status}`);
      }

      const data = await res.json();

      if (data.status === 'success') {
        const newVerified = { ...verifiedAngles };
        let swappedCount = 0;
        let autoRoutedCount = 0;

        const pendingImages = [];
        const nonVehicleFiles = [];

        data.results.forEach((resItem, idx) => {
          if (resItem.needs_swap) swappedCount++;

          const threshold = resItem.final_assigned_view === 'Roof' ? 25 : 55;
          if (resItem.is_car && resItem.confidence > threshold) {
            const expectedModelKey = unverifiedKeys[idx] || ANGLES[idx % ANGLES.length].modelKey;
            const expectedAngle = ANGLES.find(a => a.modelKey === expectedModelKey);
            const targetAngle = ANGLES.find(a => a.modelKey === resItem.final_assigned_view);

            pendingImages.push({
              file: files[idx],
              resItem,
              targetAngle,
              expectedAngle
            });
          } else if (!resItem.is_car) {
            // เก็บรูปที่ไม่ใช่รถไว้ประมวลผลต่อ
            nonVehicleFiles.push({ file: files[idx], resItem });
          }
        });

        // 1. จัดการรูปที่ AI ทายมุมได้ก่อน
        pendingImages.sort((a, b) => b.resItem.confidence - a.resItem.confidence);
        const newDuplicates = [...duplicateImages];

        for (const item of pendingImages) {
          let assignedAngle = item.targetAngle;

          // Auto-distribute multiple wheels to empty tire slots
          if (assignedAngle && newVerified[assignedAngle.id]) {
            const TIRE_IDS = ['tire_fl', 'tire_fr', 'tire_bl', 'tire_br'];
            if (TIRE_IDS.includes(assignedAngle.id)) {
              const emptyTireId = TIRE_IDS.find(id => !newVerified[id]);
              if (emptyTireId) {
                assignedAngle = ANGLES.find(a => a.id === emptyTireId);
              }
            }
          }

          let fileObjUrl = URL.createObjectURL(item.file);
          if (item.resItem.damages && item.resItem.damages.length > 0) {
            let b64 = await new Promise(resolve => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(item.file);
            });
            fileObjUrl = await drawDamagesOnImage(b64, item.resItem.damages);
          }

          if (assignedAngle && newVerified[assignedAngle.id]) {
            newDuplicates.push({
              image: fileObjUrl,
              label: assignedAngle.label,
              confidence: item.resItem.confidence,
            });
          } else if (assignedAngle && !newVerified[assignedAngle.id]) {
            newVerified[assignedAngle.id] = {
              image: fileObjUrl,
              confidence: item.resItem.confidence,
              quality: item.resItem.quality || {},
              class_details: item.resItem.class_details,
              damages: item.resItem.damages || [],
            };
          }
        }

        // 2. จัดการรูปที่ไม่ใช่รถ (Auto-Route ไปยังช่องว่างของกลุ่ม Non-AI)
        const NON_AI_VIEW_IDS = ['interior', 'spare_tire', 'chassis', 'accessories', 'dashcam', 'odometer', 'tax_sticker', 'registration_doc', 'engine_compartment', 'tire_fl', 'tire_fr', 'tire_bl', 'tire_br', 'others'];
        nonVehicleFiles.forEach(item => {
          const emptySlotId = NON_AI_VIEW_IDS.find(id => !newVerified[id]);
          if (emptySlotId) {
            newVerified[emptySlotId] = {
              image: URL.createObjectURL(item.file),
              confidence: 100,
              quality: { is_non_car: true },
              class_details: item.resItem.class_details,
              damages: item.resItem.damages || [],
            };
            autoRoutedCount++;
          }
        });

        setDuplicateImages(newDuplicates);
        setVerifiedAngles(newVerified);

        if (swappedCount > 0 || autoRoutedCount > 0) {
          let msg = `จัดเรียงสำเร็จ!`;
          if (swappedCount > 0) msg += `\n- สลับมุมรถอัตโนมัติ ${swappedCount} รูป`;
          if (autoRoutedCount > 0) msg += `\n- จัดลงช่องอื่นๆ (ภายใน/เอกสาร) ${autoRoutedCount} รูป`;
          alert(msg);
        }
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setBatchLoading(false);
      if (batchInputRef.current) batchInputRef.current.value = '';
    }
  };

  // Generate the right panel for damaged images
  const damagedImages = Object.entries(verifiedAngles).filter(([, v]) => v.damages && v.damages.length > 0).map(([id, v]) => ({
    angle: ANGLES.find(a => a.id === id),
    ...v
  }));

  const rightPanel = (
    <div className="hidden lg:flex flex-col w-[500px] max-w-[40vw] bg-white border-l border-gray-200 overflow-y-auto h-screen sticky top-0">
      <div className="p-6 bg-red-50/90 border-b border-red-100 sticky top-0 z-10 backdrop-blur-md">
        <h2 className="text-xl font-bold text-red-700 flex items-center gap-2">
          <FaShieldAlt className="text-red-500" /> รอยตำหนิที่ตรวจพบ ({damagedImages.length})
        </h2>
        <p className="text-sm text-red-500/80 mt-1">รายการภาพที่มีการตีกรอบรอยความเสียหาย</p>
      </div>
      <div className="p-6 flex flex-col gap-6">
        {damagedImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <FaShieldAlt className="text-6xl mb-4 opacity-20" />
            <p>ยังไม่พบรูปรอยตำหนิ</p>
          </div>
        ) : (
          damagedImages.map((item, i) => (
            <div key={i} className="bg-white border border-red-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-red-50/50 px-4 py-3 border-b border-red-50 flex justify-between items-center">
                <span className="font-bold text-red-900">{item.angle?.label || 'รูปภาพ'}</span>
                <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full font-bold shadow-sm shadow-red-500/30">
                  พบ {item.damages.length} จุด
                </span>
              </div>
              <div 
                className="bg-gray-900 flex justify-center relative group p-2 cursor-pointer"
                onClick={() => { setZoomImage(item.originalImage || item.image); setZoomScale(1); }}
              >
                <img src={item.image} alt={item.angle?.label} className="w-full h-auto max-h-[300px] object-contain rounded-lg" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg m-2">
                  <span className="text-white font-bold text-sm bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm shadow-lg flex items-center gap-2">
                    <FaImage /> ดูรูปต้นฉบับ
                  </span>
                </div>
              </div>
              <div className="p-4 bg-white">
                <div className="flex flex-wrap gap-2">
                  {item.damages.map((dmg, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white border border-gray-200 shadow-sm px-2 py-1.5 rounded-xl">
                      {dmg.image_base64 && <img src={dmg.image_base64} alt={dmg.label} className="w-10 h-10 object-cover rounded-lg border border-gray-100" />}
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-800">{dmg.label}</span>
                        <span className="text-[10px] text-gray-400">มั่นใจ {dmg.confidence}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const zoomModal = zoomImage ? (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      <button 
        onClick={() => setZoomImage(null)}
        className="absolute top-4 right-4 text-white bg-white/10 w-10 h-10 rounded-full flex items-center justify-center text-xl hover:bg-white/20 z-50 backdrop-blur-md"
      >
        <FaTimes />
      </button>
      
      <div className="w-full h-full overflow-auto flex items-center justify-center relative">
        <img 
          src={zoomImage} 
          alt="Zoomed Original" 
          className="max-w-none transition-transform duration-200" 
          style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center' }}
        />
      </div>
      
      <div className="absolute bottom-8 flex gap-4 bg-black/60 p-2 rounded-full backdrop-blur-md z-50 items-center">
        <button onClick={() => setZoomScale(s => Math.max(0.5, s - 0.5))} className="w-10 h-10 text-white flex items-center justify-center text-2xl font-bold bg-white/10 rounded-full hover:bg-white/20">-</button>
        <div className="w-12 flex items-center justify-center text-white font-bold">{Math.round(zoomScale * 100)}%</div>
        <button onClick={() => setZoomScale(s => Math.min(4, s + 0.5))} className="w-10 h-10 text-white flex items-center justify-center text-2xl font-bold bg-white/10 rounded-full hover:bg-white/20">+</button>
        <div className="w-[1px] h-6 bg-white/20 mx-1"></div>
        <button onClick={() => setZoomScale(1)} className="px-3 text-white text-sm font-bold hover:text-gray-300">Reset</button>
      </div>
    </div>
  ) : null;

  // ── Done screen ─────────────────────────────────────────────────────────
  if (allDone) {
    return (
      <div className="w-full min-h-screen bg-gray-100 flex justify-center font-sans">
        <div className="max-w-[480px] w-full min-h-screen bg-[#f4f7fe] flex flex-col items-center justify-center p-6 relative shadow-[0_0_40px_rgba(0,0,0,0.1)] z-20 overflow-x-hidden">
          <div className="absolute top-10 w-full px-6 opacity-10 pointer-events-none">
            <FaCarSide className="text-[12rem] mx-auto" />
          </div>

          <div className="w-24 h-24 bg-green-500 rounded-[2rem] flex items-center justify-center text-white text-5xl mb-6 shadow-2xl shadow-green-500/40 z-10 animate-bounce">
            <FaShieldAlt />
          </div>

          <h1 className="text-2xl font-extrabold text-gray-900 mb-3 z-10">ตรวจสภาพครบถ้วน!</h1>
          <p className="text-gray-500 text-center text-sm mb-12 z-10 leading-relaxed">
            AI ได้ตรวจสอบรูปภาพครบทุกมุมตามมาตรฐานบริษัทประกันภัยเรียบร้อยแล้ว
          </p>

          <button
            onClick={() => navigate('/summarie', { state: { verifiedAngles } })}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-base shadow-xl shadow-blue-500/30 hover:bg-blue-700 active:scale-[0.98] transition-all mb-5 z-10"
          >
            ดูหน้าสรุปผลการทำนาย
          </button>

          <button
            onClick={() => { setVerifiedAngles({}); setScreen('checklist'); }}
            className="text-gray-400 font-bold text-sm hover:text-gray-600 z-10"
          >
            เริ่มถ่ายใหม่อีกครั้ง
          </button>
        </div>
        {rightPanel}
        {zoomModal}
      </div>
    );
  }

  // ── Capture screen ──────────────────────────────────────────────────────
  if (screen === 'capture' && activeAngle) {
    const matched = result?.match && result?.is_car;
    const notCar = result && !result.is_car;
    // ปรับเงื่อนไข wrongAngle: ต้องเป็นรถ และ Label ไม่ตรงกับที่คาดหวัง
    const wrongAngle = result?.is_car && result?.prediction?.label !== activeAngle.modelKey;
    // เพิ่มเงื่อนไข lowConfidence: ถ้า Label ตรง แต่ความมั่นใจไม่ถึงเกณฑ์
    const lowConfidence = result?.is_car && result?.prediction?.label === activeAngle.modelKey && !result?.match;
    const topPred = result?.prediction;

    return (
      <div className="w-full min-h-screen bg-gray-100 flex justify-center font-sans">
        <div className="max-w-[480px] w-full min-h-screen bg-gray-950 flex flex-col pb-[80px] shadow-[0_0_40px_rgba(0,0,0,0.1)] z-20 overflow-x-hidden relative">
          <input ref={fileInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
          <input ref={galleryInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />

          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <button onClick={handleBack} className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-white text-xl hover:bg-white/20 transition-all">
              ‹
            </button>
            <div className="text-center">
              <p className="text-white font-bold text-sm">{activeAngle.label}</p>
              <p className="text-white/40 text-[10px]">{verifiedCount}/{totalAngles} มุม</p>
            </div>
            <div className="w-9 h-9" />
          </div>

          <div className="relative mx-4 rounded-3xl overflow-hidden bg-gray-900 flex-shrink-0" style={{ aspectRatio: '4/3' }}>
            {capturedImage ? (
              <div 
                className="w-full h-full relative group cursor-pointer"
                onClick={() => { setZoomImage(originalImage || capturedImage); setZoomScale(1); }}
              >
                <img src={capturedImage} alt="captured" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white font-bold text-sm bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm shadow-lg flex items-center gap-2">
                    <FaImage /> ดูรูปต้นฉบับ
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 px-8 text-center">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-white/30 text-3xl">
                  {activeAngle.icon}
                </div>
                <p className="text-white/40 text-xs leading-relaxed">{activeAngle.tip}</p>
              </div>
            )}

            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-5 left-5 w-10 h-10 border-t-[3px] border-l-[3px] border-white/40 rounded-tl-xl" />
              <div className="absolute top-5 right-5 w-10 h-10 border-t-[3px] border-r-[3px] border-white/40 rounded-tr-xl" />
              <div className="absolute bottom-14 left-5 w-10 h-10 border-b-[3px] border-l-[3px] border-white/40 rounded-bl-xl" />
              <div className="absolute bottom-14 right-5 w-10 h-10 border-b-[3px] border-r-[3px] border-white/40 rounded-br-xl" />
            </div>

            {loading && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="text-white text-sm font-medium">AI กำลังตรวจสอบ...</span>
              </div>
            )}

            {matched && (
              <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center gap-2">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white text-4xl shadow-2xl">
                  <FaCheck />
                </div>
                <span className="text-white font-bold text-lg mt-1">ผ่านแล้ว!</span>
              </div>
            )}

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

          <div className="flex flex-col gap-2.5 p-4 mt-1">
            {result?.error && (
              <StatusCard color="red" icon={<FaTimes />} title="เกิดข้อผิดพลาด ในการทำนาย" desc={result.message} />
            )}

            {notCar && (
              <StatusCard color="red" icon={<FaTimes />} title="ไม่พบรถยนต์ในภาพ" desc="กรุณาถ่ายภาพรถยนต์ให้ชัดเจนและอยู่กลางภาพ" />
            )}

            {wrongAngle && topPred && (
              <StatusCard color="yellow" icon="🔄" title={`พบมุมไม่ตรง — กำลังสลับช่องให้อัตโนมัติ`} desc={`AI เห็นว่าเป็น ${LABEL_TH[topPred.label] || topPred.label} (${Math.round(topPred.confidence)}%)`} />
            )}

            {lowConfidence && topPred && (
              <StatusCard color="yellow" icon="⚠️" title={`ภาพยังไม่ชัดเจนพอ`} desc={`AI เห็นว่าเป็น ${LABEL_TH[topPred.label] || topPred.label} แต่ความมั่นใจต่ำ (${Math.round(topPred.confidence)}%) กรุณาขยับมุมหรือถ่ายในที่สว่างขึ้น`} />
            )}

            {matched && (
              <StatusCard color="green" icon={<FaCheck />} title={`ตรงมุม "${activeAngle.label}" แล้ว!`} desc={`ความมั่นใจ ${Math.round(result.prediction.confidence)}% · คุณภาพภาพผ่าน`} />
            )}

            {result && (
              <div className="flex gap-3 mt-1">
                {!matched && (
                  <>
                    <button onClick={() => { setCapturedImage(null); setResult(null); fileInputRef.current?.click(); }} className="flex-1 flex items-center justify-center gap-2 py-4 bg-white/10 text-white rounded-2xl font-bold text-sm hover:bg-white/20 transition-all">
                      <FaRedo className="text-xs" /> ถ่ายใหม่
                    </button>
                    {/* ปุ่ม Force Verify สำหรับกรณีที่ AI ตรวจไม่เจอแต่ผู้ใช้จะใช้รูปนี้ */}
                    <button
                      onClick={() => {
                        setVerifiedAngles((prev) => ({
                          ...prev,
                          [activeAngle.id]: {
                            image: capturedImage,
                            originalImage: originalImage,
                            confidence: result?.prediction?.confidence || 0,
                            quality: result?.quality || {},
                            class_details: result?.class_details,
                            damages: result?.damages || [],
                            is_manual: true
                          },
                        }));
                        handleBack();
                      }}
                      className="flex-1 py-4 bg-blue-600/30 text-blue-400 border border-blue-500/50 rounded-2xl font-bold text-sm hover:bg-blue-600/40 transition-all"
                    >
                      ยืนยันใช้รูปนี้
                    </button>
                  </>
                )}
                {matched && (
                  <button onClick={handleBack} className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-green-500/30 hover:bg-green-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                    <FaCheck /> มุมต่อไป
                  </button>
                )}
              </div>
            )}

            {!result && !loading && (
              <button onClick={() => galleryInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-3.5 bg-white/10 text-white/60 rounded-2xl font-bold text-sm hover:bg-white/15 transition-all border border-white/10">
                <FaImage className="text-sm" /> เลือกจากคลังภาพ
              </button>
            )}
          </div>
        </div>
        {rightPanel}
        {zoomModal}
      </div>
    );
  }

  // ── Checklist screen ────────────────────────────────────────────────────
  return (
    <div className="w-full min-h-screen bg-gray-100 flex justify-center font-sans">
      <div className="max-w-[480px] w-full min-h-screen bg-[#f4f7fe] flex flex-col pb-[80px] font-sans relative shadow-[0_0_40px_rgba(0,0,0,0.1)] z-20 overflow-x-hidden">
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

          <div className="flex items-center gap-3">
            <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${(verifiedCount / totalAngles) * 100}%` }} />
            </div>
            <span className={`text-xs font-bold flex-shrink-0 ${verifiedCount === totalAngles ? 'text-green-600' : 'text-blue-600'}`}>
              {verifiedCount}/{totalAngles}
            </span>
          </div>
        </div>

        <div className="mx-4 mt-3 p-3 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-2">
          <span className="text-blue-400 text-sm mt-0.5 flex-shrink-0">ℹ️</span>
          <p className="text-blue-600 text-[11px] font-medium leading-relaxed">
            AI จะตรวจสอบว่า: มุมภาพถูกต้อง · เห็นรถเต็มคัน · ภาพไม่เบลอ · แสงพอเหมาะ
          </p>
        </div>

        <div className="mx-4 mt-3">
          <input ref={batchInputRef} type="file" webkitdirectory="true" multiple className="hidden" onChange={handleBatchUpload} />
          <button onClick={() => batchInputRef.current?.click()} disabled={batchLoading} className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600/10 border border-indigo-500/30 text-indigo-700 rounded-2xl font-bold text-sm hover:bg-indigo-600/20 transition-all disabled:opacity-50">
            {batchLoading ? <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <FaImage />}
            {batchLoading ? 'กำลังวิเคราะห์รูปจากโฟลเดอร์...' : 'อัปโหลดทั้งโฟลเดอร์ (Auto-Detect)'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 p-4">
          {ANGLES.map((angle, idx) => {
            const verified = verifiedAngles[angle.id];
            const isNext = !verified && idx === ANGLES.findIndex(a => !verifiedAngles[a.id]);

            return (
              <div key={angle.id} className="flex flex-col items-center">
                <button
                  onClick={() => !verified && handleStartCapture(angle)}
                  disabled={!!verified}
                  className={`relative w-full aspect-[4/3] rounded-xl border-2 overflow-hidden transition-all duration-300 flex items-center justify-center ${verified ? 'border-green-400 bg-white' : isNext ? 'border-blue-400 bg-white shadow-md' : 'border-gray-200 bg-gray-50'}`}
                >
                  {verified?.image ? (
                    <>
                      <img src={verified.image} alt={angle.label} className="w-full h-full object-cover" />
                      <button
                        onClick={(e) => handleRemoveVerified(e, angle.id)}
                        className="absolute top-1 right-1 w-6 h-6 bg-gray-900/60 text-white rounded-full flex items-center justify-center text-[10px] hover:bg-gray-900 transition-colors z-10"
                      >
                        <FaTimes />
                      </button>
                    </>
                  ) : (
                    <div className={`flex flex-col items-center gap-1 ${isNext ? 'text-blue-500' : 'text-gray-300'}`}>
                      <div className="text-2xl">
                        {/* ถ้าเป็นกลุ่มมุมรถ ให้ใช้ไอคอนรถ ถ้าไม่ใช่ให้ใช้ไอคอน อื่นๆ/รูปภาพ */}
                        {['front', 'rear', 'left', 'right', 'roof', 'front-left', 'front-right', 'back-left', 'back-right'].includes(angle.id)
                          ? angle.icon
                          : <FaImage />}
                      </div>
                      {isNext && <MdOutlinePhotoCamera className="text-xs" />}
                    </div>
                  )}
                </button>

                <div className="mt-1.5 flex items-center gap-1 px-1 w-full justify-center">
                  <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[8px] ${verified ? 'bg-green-500 text-white' : 'border border-gray-300 bg-white'}`}>
                    {verified && <FaCheck />}
                  </div>
                  <span className={`text-[10px] font-bold truncate text-center ${verified ? 'text-green-700' : isNext ? 'text-blue-900' : 'text-gray-500'}`}>
                    {angle.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {verifiedCount > 0 && !allDone && (
          <div className="mx-4 p-3 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-2">
            <span className="text-base">💡</span>
            <p className="text-blue-600 text-xs font-medium">เหลืออีก {totalAngles - verifiedCount} มุม เสร็จใกล้แล้ว!</p>
          </div>
        )}

        {duplicateImages.length > 0 && (
          <div className="mx-4 mt-4 p-4 bg-orange-50 rounded-3xl border border-orange-200">
            <h2 className="text-sm font-bold text-orange-800 mb-3 flex items-center gap-2">
              <span className="text-lg">⚠️</span> ผลรูปซ้ำที่ AI ทายตรงกัน ({duplicateImages.length} รูป)
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {duplicateImages.map((dup, idx) => (
                <div key={idx} className="bg-white p-2 rounded-2xl border border-orange-100 shadow-sm relative overflow-hidden">
                  <img src={dup.image} alt="dup" className="w-full h-24 object-cover rounded-xl mb-2" />
                  <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-md">
                    ทายซ้ำ
                  </div>
                  <p className="text-[11px] font-bold text-gray-800">AI ทายว่า: <span className="text-orange-600">{dup.label}</span></p>
                  <p className="text-[10px] text-gray-500 mt-0.5">ความมั่นใจ: {Math.round(dup.confidence)}%</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setDuplicateImages([])}
              className="w-full mt-3 py-2 bg-orange-100 text-orange-700 text-xs font-bold rounded-xl hover:bg-orange-200 transition-colors"
            >
              ลบรูปซ้ำทั้งหมด
            </button>
          </div>
        )}

      </div>
      {rightPanel}
      {zoomModal}
    </div>
  );
}

function StatusCard({ color, icon, title, desc }) {
  const colors = {
    green: 'bg-green-50 border-green-100 text-green-700 bg-green-100',
    red: 'bg-red-50 border-red-100 text-red-700 bg-red-100',
    yellow: 'bg-yellow-50 border-yellow-100 text-yellow-700 bg-yellow-100',
  };
  const [bg, border, text, iconBg] = colors[color]?.split(' ') ?? [];

  return (
    <div className={`${bg} border ${border} rounded-2xl p-4 flex items-center gap-3 animate-fade-in`}>
      <div className={`w-10 h-10 ${iconBg} rounded-full flex items-center justify-center ${text} flex-shrink-0 text-base`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`${text} font-bold text-sm`}>{title}</p>
        {desc && <p className={`${text} opacity-70 text-xs mt-0.5`}>{desc}</p>}
      </div>
    </div>
  );
}
