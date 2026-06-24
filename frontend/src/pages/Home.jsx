import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCarSide, FaCheck, FaImage, FaTimes, FaRedo, FaShieldAlt, FaPlus } from 'react-icons/fa';
import {
  MdInfo,
  MdLightbulb,
  MdNorth,
  MdNorthEast,
  MdNorthWest,
  MdOutlinePhotoCamera,
  MdSouthEast,
  MdSouthWest,
  MdSwapHoriz,
  MdWarning,
} from 'react-icons/md';
import { GiCarSeat, GiCarWheel, GiFlatTire, GiMechanicGarage } from 'react-icons/gi';
import {
  FaBarcode,
  FaCamera,
  FaCar as FaCarFront,
  FaCarRear,
  FaFileLines,
  FaFileShield,
  FaGaugeHigh,
  FaGears,
} from 'react-icons/fa6';

function AngleViewIcon({ car = FaCarFront, arrow = MdNorth, flip = false }) {
  const CarIcon = car;
  const ArrowIcon = arrow;

  return (
    <span className="relative inline-flex w-6 h-6 items-center justify-center">
      <CarIcon className={`text-[1.15em] ${flip ? 'scale-x-[-1]' : ''}`} />
      <ArrowIcon className="absolute -right-1 -top-1 text-[0.7em] text-current opacity-80" />
    </span>
  );
}

// ─── Insurance-required angles (22 มุม ตามมาตรฐานประกันภัย) ────────────────
const ANGLES = [
  { id: 'front', label: 'ด้านหน้าตรง', desc: 'ถ่ายให้เห็นรถเต็มคัน และป้ายทะเบียนหน้าชัดเจน', icon: <AngleViewIcon car={FaCarFront} arrow={MdNorth} />, modelKey: 'Front', tip: 'ยืนห่างจากรถ 3–5 เมตร ตรงกลางหน้ารถ' },
  { id: 'front-left', label: 'เฉียงหน้าด้านซ้าย', desc: 'ถ่ายมุมเฉียง 45° ด้านหน้า-ซ้าย', icon: <AngleViewIcon car={FaCarFront} arrow={MdNorthEast} />, modelKey: 'Front-Left', tip: 'ยืนมุม 45° หน้า-ซ้ายของรถ' },
  { id: 'left', label: 'ด้านข้างซ้าย', desc: 'ถ่ายด้านซ้ายตามยาว เห็นรถตลอดคัน', icon: <AngleViewIcon car={FaCarSide} arrow={MdNorth} />, modelKey: 'Left', tip: 'ยืนห่างจากรถ 3–5 เมตร ขนานด้านซ้ายรถ' },
  { id: 'back-left', label: 'เฉียงหลังด้านซ้าย', desc: 'ถ่ายมุมเฉียง 45° ด้านหลัง-ซ้าย', icon: <AngleViewIcon car={FaCarRear} arrow={MdSouthWest} />, modelKey: 'Back-Left', tip: 'ยืนมุม 45° หลัง-ซ้ายของรถ' },
  { id: 'rear', label: 'ด้านหลังตรง', desc: 'ถ่ายให้เห็นรถเต็มคัน และป้ายทะเบียนหลังชัดเจน', icon: <AngleViewIcon car={FaCarRear} arrow={MdNorth} />, modelKey: 'Back', tip: 'ยืนห่างจากรถ 3–5 เมตร ตรงกลางท้ายรถ' },
  { id: 'back-right', label: 'เฉียงหลังด้านขวา', desc: 'ถ่ายมุมเฉียง 45° ด้านหลัง-ขวา', icon: <AngleViewIcon car={FaCarRear} arrow={MdSouthEast} />, modelKey: 'Back-Right', tip: 'ยืนมุม 45° หลัง-ขวาของรถ' },
  { id: 'right', label: 'ด้านข้างขวา', desc: 'ถ่ายด้านขวาตามยาว เห็นรถตลอดคัน', icon: <AngleViewIcon car={FaCarSide} arrow={MdNorth} flip />, modelKey: 'Right', tip: 'ยืนห่างจากรถ 3–5 เมตร ขนานด้านขวารถ' },
  { id: 'front-right', label: 'เฉียงหน้าด้านขวา', desc: 'ถ่ายมุมเฉียง 45° ด้านหน้า-ขวา', icon: <AngleViewIcon car={FaCarFront} arrow={MdNorthWest} />, modelKey: 'Front-Right', tip: 'ยืนมุม 45° หน้า-ขวาของรถ' },
  { id: 'roof', label: 'หลังคารถยนต์', desc: 'ถ่ายให้เห็นหลังคารถชัดเจน', icon: <AngleViewIcon car={FaCarFront} arrow={MdNorth} />, modelKey: 'Roof', tip: 'หาจุดที่สูงกว่ารถ หรือชูแขนถ่ายให้เห็นหลังคาเต็มพื้นที่' },
  { id: 'engine_compartment', label: 'ห้องเครื่องยนต์', desc: 'ถ่ายภาพห้องเครื่อง', icon: <GiMechanicGarage />, modelKey: 'EngineCompartment', tip: 'เปิดฝากระโปรงหน้า ถ่ายให้เห็นภาพรวมของห้องเครื่อง' },
  { id: 'interior', label: 'ภายใน/อุปกรณ์ตกแต่ง', desc: 'ถ่ายภาพคอนโซลหน้า และภายในรถ', icon: <GiCarSeat />, modelKey: 'Interior', tip: 'เปิดประตูถ่ายให้เห็นคอนโซล เบาะ และอุปกรณ์ภายใน' },
  { id: 'odometer', label: 'จอเลขไมล์', desc: 'ถ่ายภาพหน้าปัดเรือนไมล์', icon: <FaGaugeHigh />, modelKey: 'Odometer', tip: 'สตาร์ทรถหรือบิดกุญแจให้เห็นตัวเลขไมล์ชัดเจน' },
  { id: 'chassis', label: 'เลขตัวถังรถยนต์', desc: 'ถ่ายภาพเลขตัวถังให้ชัดเจน', icon: <FaBarcode />, modelKey: 'ChassisNumber', tip: 'หาตำแหน่งเลขตัวถัง (มักอยู่ที่เสาประตูหรือห้องเครื่อง) แล้วถ่ายให้ชัดเจน' },
  { id: 'tax_sticker', label: 'แผ่นป้ายภาษี', desc: 'ถ่ายภาพป้ายภาษีรถยนต์', icon: <FaFileShield />, modelKey: 'TaxSticker', tip: 'ถ่ายให้เห็นปีภาษีและทะเบียนชัดเจน' },
  { id: 'registration_doc', label: 'รายการจดทะเบียน', desc: 'ถ่ายภาพเล่มทะเบียนรถ', icon: <FaFileLines />, modelKey: 'RegistrationDoc', tip: 'ถ่ายให้เห็นรายละเอียดในเล่มทะเบียนชัดเจน' },
  { id: 'dashcam', label: 'กล้องติดหน้ารถ', desc: 'ถ่ายภาพกล้องที่ติดตั้งในรถ', icon: <FaCamera />, modelKey: 'Dashcam', tip: 'ถ่ายให้เห็นตัวกล้องที่ติดตั้งอยู่บนกระจกหรือคอนโซล' },
  { id: 'accessories', label: 'กรณีมีอุปกรณ์ตกแต่ง เช่นล้อแม็กซ์ เครื่องเสียง', desc: 'อุปกรณ์ตกแต่งเพิ่มเติม', icon: <FaGears />, modelKey: 'Accessories', tip: 'ถ่ายเจาะจงอุปกรณ์ที่ต้องการระบุในกรมธรรม์' },
  { id: 'spare_tire', label: 'ยางอะไหล่', desc: 'ถ่ายภาพยางอะไหล่ (ถ้ามี)', icon: <GiFlatTire />, modelKey: 'SpareTire', tip: 'ถ่ายให้เห็นตัวยางและสภาพของยางอะไหล่' },
  { id: 'tire_fl', label: 'ล้อที่ให้เห็นยี่ห้อและขนาด ปีผลิตของยาง ล้อหน้าซ้าย', desc: 'ล้อหน้าซ้าย', icon: <GiCarWheel />, modelKey: 'TireFrontLeft', tip: 'ถ่ายเจาะจงล้อหน้าซ้าย ให้เห็นยี่ห้อ ขนาด และปีผลิต' },
  { id: 'tire_fr', label: 'ล้อที่ให้เห็นยี่ห้อและขนาด ปีผลิตของยาง ล้อหน้าขวา', desc: 'ล้อหน้าขวา', icon: <GiCarWheel />, modelKey: 'TireFrontRight', tip: 'ถ่ายเจาะจงล้อหน้าขวา ให้เห็นยี่ห้อ ขนาด และปีผลิต' },
  { id: 'tire_bl', label: 'ล้อที่ให้เห็นยี่ห้อและขนาด ปีผลิตของยาง ล้อหลังซ้าย', desc: 'ล้อหลังซ้าย', icon: <GiCarWheel />, modelKey: 'TireBackLeft', tip: 'ถ่ายเจาะจงล้อหลังซ้าย ให้เห็นยี่ห้อ ขนาด และปีผลิต' },
  { id: 'tire_br', label: 'ล้อที่ให้เห็นยี่ห้อและขนาด ปีผลิตของยาง ล้อหลังขวา', desc: 'ล้อหลังขวา', icon: <GiCarWheel />, modelKey: 'TireBackRight', tip: 'ถ่ายเจาะจงล้อหลังขวา ให้เห็นยี่ห้อ ขนาด และปีผลิต' },
  { id: 'others', label: 'อื่นๆ (MTPhoto)', desc: 'ภาพอื่นๆ นอกเหนือจากที่ระบุ', icon: <FaImage />, modelKey: 'Others', tip: 'ถ่ายภาพส่วนอื่นๆ ของรถเพิ่มเติม' }
];

const DAMAGE_ELIGIBLE_MODEL_KEYS = new Set([
  'Front',
  'Back',
  'Left',
  'Right',
  'Front-Left',
  'Front-Right',
  'Back-Left',
  'Back-Right',
  'Roof',
  'Others',
]);

const isDamageModelKeyEligible = (modelKey) => DAMAGE_ELIGIBLE_MODEL_KEYS.has(modelKey);

const isDamageEligible = (item) => (
  isDamageModelKeyEligible(item?.angle?.modelKey)
  || isDamageModelKeyEligible(item?.viewResult?.prediction?.label)
);

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



const CLASS_GROUPS_MAP = {
  'Front': 'Exterior', 'Back': 'Exterior', 'Left': 'Exterior', 'Right': 'Exterior',
  'Front-Left': 'Exterior', 'Front-Right': 'Exterior', 'Back-Left': 'Exterior', 'Back-Right': 'Exterior',
  'Roof': 'Exterior', 'SpareTire': 'Exterior', 'TireFrontLeft': 'Exterior', 'TireFrontRight': 'Exterior',
  'TireBackLeft': 'Exterior', 'TireBackRight': 'Exterior',
  'Interior': 'Interior', 'Dashcam': 'Accessories', 'Odometer': 'Interior',
  'ChassisNumber': 'Document', 'TaxSticker': 'Document', 'RegistrationDoc': 'Document',
  'EngineCompartment': 'Engine Compartment',
  'Accessories': 'Other', 'Others': 'Other'
};

const getClassDetails = (label) => ({
  group: CLASS_GROUPS_MAP[label] || 'Other',
  th_name: LABEL_TH[label] || label
});

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
  const [damageAllLoading, setDamageAllLoading] = useState(false);
  const [damageQueue, setDamageQueue] = useState([]);
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
      setDamageQueue(prev => prev.filter(item => item.isDuplicate || (item.angleId !== angleId && item.originalAngleId !== angleId)));
    }
  };

  const handleRemoveDuplicate = (e, duplicateId) => {
    e.stopPropagation();
    setDuplicateImages(prev => prev.filter(item => item.id !== duplicateId));
    setDamageQueue(prev => prev.filter(item => item.duplicateId !== duplicateId));
  };

  const updateDuplicateImage = (duplicateId, updates) => {
    if (!duplicateId) return;
    setDuplicateImages(prev => prev.map(item => (
      item.id === duplicateId
        ? {
          ...item,
          ...updates,
          quality: {
            ...(item.quality || {}),
            ...(updates.quality || {}),
          },
        }
        : item
    )));
  };

  const stageImageForDamage = async (file) => {
    setLoading(true);
    setResult(null);

    // Immediate preview
    const base64Image = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    setCapturedImage(base64Image);
    setOriginalImage(base64Image);

    try {
      const healthRes = await fetch('/api/v1/health');
      if (!healthRes.ok) throw new Error(`Health check failed ${healthRes.status}`);
      const healthData = await healthRes.json();
      const queueId = `${activeAngle.id}-${Date.now()}`;

      const queuedImage = {
        id: queueId,
        angleId: activeAngle.id,
        originalAngleId: activeAngle.id,
        angle: activeAngle,
        originalAngle: activeAngle,
        file,
        image: base64Image,
        originalImage: base64Image,
        damages: [],
        status: 'ready',
        viewStatus: 'pending',
        viewResult: null,
        health: healthData,
      };

      setDamageQueue(prev => [queuedImage, ...prev.filter(item => item.isDuplicate || (item.angleId !== activeAngle.id && item.originalAngleId !== activeAngle.id))]);
      setResult({ staged: true, message: 'รูปพร้อมสำหรับทำนายรอยแล้ว' });
      await predictViewForItem(queuedImage);
    } catch (err) {
      setResult({ error: true, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const predictViewForItem = async (item) => {
    setDamageQueue(prev => prev.map(row => (
      row.id === item.id
        ? { ...row, viewStatus: 'loading', viewError: null }
        : row
    )));

    try {
      const formData = new FormData();
      formData.append('file', item.file, 'image.jpg');
      formData.append('expected_view', item.angle.modelKey);

      const res = await fetch('/api/v1/predict_view', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);

      const data = await res.json();
      if (data.status === 'error') {
        throw new Error(data.message || data.error || 'View prediction failed');
      }

      const predictedLabel = data.prediction?.label;
      const predictedConfidence = data.prediction?.confidence || 0;
      const targetAngle = ANGLES.find(a => a.modelKey === predictedLabel);
      const switchThreshold = predictedLabel === 'Roof' ? 25 : 55;
      const shouldAutoSwitch = (
        data.is_car &&
        !data.match &&
        targetAngle &&
        targetAngle.id !== item.angleId &&
        predictedConfidence > switchThreshold &&
        !verifiedAngles[targetAngle.id]
      );
      const assignedAngle = shouldAutoSwitch ? targetAngle : item.angle;

      setDamageQueue(prev => prev.map(row => (
        row.id === item.id
          ? {
            ...row,
            angleId: assignedAngle.id,
            angle: assignedAngle,
            originalAngleId: row.originalAngleId || item.angleId,
            originalAngle: row.originalAngle || item.angle,
            viewStatus: 'done',
            viewResult: data,
            viewError: null,
            auto_switched: shouldAutoSwitch,
          }
          : row
      )));

      if (activeAngle?.id === item.angleId || activeAngle?.id === item.originalAngleId) {
        setResult({
          ...data,
          view_checked: true,
          auto_switched: shouldAutoSwitch,
          auto_switched_to: shouldAutoSwitch ? assignedAngle.label : null,
        });
      }
    } catch (err) {
      setDamageQueue(prev => prev.map(row => (
        row.id === item.id
          ? { ...row, viewStatus: 'error', viewError: err.message }
          : row
      )));

      if (activeAngle?.id === item.angleId || activeAngle?.id === item.originalAngleId) {
        setResult({ error: true, message: err.message });
      }
    }
  };

  const predictDamageForItem = async (item) => {
    if (!isDamageEligible(item)) {
      setDamageQueue(prev => prev.map(row => (
        row.id === item.id
          ? { ...row, status: 'skipped', damages: [], error: null }
          : row
      )));
      return;
    }

    setDamageQueue(prev => prev.map(row => row.id === item.id ? { ...row, status: 'loading', error: null } : row));

    try {
      const formData = new FormData();
      formData.append('file', item.file, 'image.jpg');

      const res = await fetch('/api/v1/predict_damage', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);

      const data = await res.json();
      if (data.status === 'error') {
        throw new Error(data.message || data.error || 'Damage prediction failed');
      }

      const imageWithBoxes = data.damages?.length
        ? await drawDamagesOnImage(item.originalImage, data.damages)
        : item.originalImage;

      const predictedLabel = item.viewResult?.prediction?.label;
      const predictedConfidence = item.viewResult?.prediction?.confidence || 0;
      const assignedAngle = item.angle;

      setDamageQueue(prev => prev.map(row => (
        row.id === item.id
          ? {
            ...row,
            angleId: assignedAngle.id,
            angle: assignedAngle,
            image: imageWithBoxes,
            damages: data.damages || [],
            quality: data.quality || {},
            time_ms: data.time_ms || 0,
            status: 'done',
            originalAngle: item.originalAngle || item.angle,
          }
          : row
      )));

      const verifiedPayload = {
        image: imageWithBoxes,
        originalImage: item.originalImage,
        confidence: predictedConfidence || 100,
        damages: data.damages || [],
        quality: {
          ...(item.viewResult?.quality || {}),
          ...(data.quality || {}),
        },
        class_details: getClassDetails(predictedLabel || assignedAngle.modelKey),
        prediction: item.viewResult?.prediction,
        match: item.viewResult?.match,
        is_car: item.viewResult?.is_car,
        time_ms: data.time_ms || 0,
        original_expected: item.originalAngle?.modelKey || item.angle.modelKey,
        auto_switched: item.auto_switched || false,
        original_angle_label: item.originalAngle?.label,
      };

      if (item.isDuplicate) {
        updateDuplicateImage(item.duplicateId, verifiedPayload);
      } else {
        setVerifiedAngles(prev => ({
          ...prev,
          [assignedAngle.id]: {
            ...(prev[assignedAngle.id] || {}),
            ...verifiedPayload,
            confidence: predictedConfidence || prev[assignedAngle.id]?.confidence || 100,
          },
        }));
      }

      if (activeAngle?.id === item.angleId || activeAngle?.id === item.originalAngleId) {
        setCapturedImage(imageWithBoxes);
        setResult({
          ...(item.viewResult || {}),
          damage_checked: true,
          auto_switched: item.auto_switched || false,
          auto_switched_to: item.auto_switched ? item.angle.label : null,
          damages: data.damages || [],
          quality: {
            ...(item.viewResult?.quality || {}),
            ...(data.quality || {}),
          },
          time_ms: data.time_ms || 0
        });
      }
    } catch (err) {
      setDamageQueue(prev => prev.map(row => row.id === item.id ? { ...row, status: 'error', error: err.message } : row));
      if (activeAngle?.id === item.angleId) {
        setResult({ error: true, message: err.message });
      }
    }
  };

  const confirmItemWithoutDamage = (item) => {
    const assignedAngle = item.angle;
    const predictedLabel = item.viewResult?.prediction?.label || assignedAngle.modelKey;
    const predictedConfidence = item.viewResult?.prediction?.confidence || 100;

    setDamageQueue(prev => prev.map(row => (
      row.id === item.id
        ? { ...row, status: 'skipped', damages: [], error: null }
        : row
    )));

    const verifiedPayload = {
      image: item.image,
      originalImage: item.originalImage,
      confidence: predictedConfidence,
      damages: [],
      quality: item.viewResult?.quality || item.health || {},
      class_details: getClassDetails(predictedLabel),
      prediction: item.viewResult?.prediction,
      match: item.viewResult?.match,
      is_car: item.viewResult?.is_car,
      original_expected: item.originalAngle?.modelKey || assignedAngle.modelKey,
      auto_switched: item.auto_switched || false,
      original_angle_label: item.originalAngle?.label,
    };

    if (item.isDuplicate) {
      updateDuplicateImage(item.duplicateId, verifiedPayload);
    } else {
      setVerifiedAngles(prev => ({
        ...prev,
        [assignedAngle.id]: {
          ...(prev[assignedAngle.id] || {}),
          ...verifiedPayload,
        },
      }));
    }

    if (activeAngle?.id === item.angleId || activeAngle?.id === item.originalAngleId) {
      setResult({
        ...(item.viewResult || {}),
        damage_checked: true,
        damages: [],
        skipped_damage: true,
      });
    }
  };

  const handlePredictAllDamages = async () => {
    const pendingItems = damageQueue.filter(item => (
      isDamageEligible(item)
      && item.status !== 'done'
      && item.viewStatus !== 'loading'
    ));
    if (!pendingItems.length) return;

    setDamageAllLoading(true);
    try {
      for (const item of pendingItems) {
        await predictDamageForItem(item);
      }
    } finally {
      setDamageAllLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      stageImageForDamage(file);
    }
    e.target.value = '';
  };


  // ─── Batch Analysis ───────────────────────────────────────────────────────
  const predictViewForBatchFile = async (file, expectedModelKey) => {
    const formData = new FormData();
    formData.append('file', file, file.name || 'image.jpg');
    formData.append('expected_view', expectedModelKey);

    const res = await fetch('/api/v1/predict_view', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || `Server error ${res.status}`);
    }

    const data = await res.json();
    const predictedLabel = data.prediction?.label || 'Unknown';
    const confidence = data.prediction?.confidence || 0;
    const isCar = Boolean(data.is_car);
    const match = Boolean(data.match);
    const finalAssignedView = !match && isCar ? predictedLabel : expectedModelKey;

    return {
      original_expected: expectedModelKey,
      predicted_label: predictedLabel,
      final_assigned_view: finalAssignedView,
      is_car: isCar,
      match,
      confidence,
      needs_swap: !match && isCar,
      quality: data.quality || {},
      damages: [],
      prediction: data.prediction,
      time_ms: data.time_ms || 0,
      error: data.status === 'error' ? (data.error || data.message) : null,
    };
  };

  const handleBatchUpload = async (e) => {
    const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
    if (!files.length) {
      alert('ไม่พบรูปภาพในโฟลเดอร์ที่เลือก');
      return;
    }

    setBatchLoading(true);
    try {
      const unverifiedKeys = ANGLES.filter(a => !verifiedAngles[a.id]).map(a => a.modelKey);
      const expViewsArray = files.map((file, index) => unverifiedKeys[index] || ANGLES[index % ANGLES.length].modelKey);
      const results = [];

      for (let idx = 0; idx < files.length; idx += 1) {
        results.push(await predictViewForBatchFile(files[idx], expViewsArray[idx]));
      }

      const data = { status: 'success', results };

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
        const newDamageQueueItems = [];

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
            const duplicateId = `duplicate-${assignedAngle.id}-${Date.now()}-${newDuplicates.length}`;
            const viewResult = {
              prediction: item.resItem.prediction || {
                label: item.resItem.predicted_label,
                confidence: item.resItem.confidence,
              },
              match: item.resItem.match,
              is_car: item.resItem.is_car,
              quality: item.resItem.quality || {},
              time_ms: item.resItem.time_ms || 0,
            };

            newDuplicates.push({
              id: duplicateId,
              angleId: assignedAngle.id,
              image: fileObjUrl,
              originalImage: fileObjUrl,
              label: assignedAngle.label,
              confidence: item.resItem.confidence,
              quality: item.resItem.quality || {},
              class_details: getClassDetails(item.resItem.predicted_label || item.resItem.prediction?.label || assignedAngle.modelKey),
              damages: item.resItem.damages || [],
              prediction: viewResult.prediction,
              match: viewResult.match,
              is_car: viewResult.is_car,
              duplicate: true,
            });

            if (isDamageModelKeyEligible(assignedAngle.modelKey)) {
              newDamageQueueItems.push({
                id: `batch-${duplicateId}`,
                duplicateId,
                isDuplicate: true,
                angleId: assignedAngle.id,
                originalAngleId: item.expectedAngle?.id || assignedAngle.id,
                angle: assignedAngle,
                originalAngle: item.expectedAngle || assignedAngle,
                file: item.file,
                image: fileObjUrl,
                originalImage: fileObjUrl,
                damages: item.resItem.damages || [],
                status: 'ready',
                viewStatus: 'done',
                viewResult,
                auto_switched: item.resItem.needs_swap || false,
              });
            }
          } else if (assignedAngle && !newVerified[assignedAngle.id]) {
            const viewResult = {
              prediction: item.resItem.prediction || {
                label: item.resItem.predicted_label,
                confidence: item.resItem.confidence,
              },
              match: item.resItem.match,
              is_car: item.resItem.is_car,
              quality: item.resItem.quality || {},
              time_ms: item.resItem.time_ms || 0,
            };

            newVerified[assignedAngle.id] = {
              image: fileObjUrl,
              originalImage: fileObjUrl,
              file: item.file,
              confidence: item.resItem.confidence,
              quality: item.resItem.quality || {},
              class_details: getClassDetails(item.resItem.predicted_label || item.resItem.prediction?.label),
              damages: item.resItem.damages || [],
              prediction: viewResult.prediction,
              match: viewResult.match,
              is_car: viewResult.is_car,
            };

            if (isDamageModelKeyEligible(assignedAngle.modelKey)) {
              newDamageQueueItems.push({
                id: `batch-${assignedAngle.id}-${Date.now()}-${newDamageQueueItems.length}`,
                angleId: assignedAngle.id,
                originalAngleId: item.expectedAngle?.id || assignedAngle.id,
                angle: assignedAngle,
                originalAngle: item.expectedAngle || assignedAngle,
                file: item.file,
                image: fileObjUrl,
                originalImage: fileObjUrl,
                damages: item.resItem.damages || [],
                status: 'ready',
                viewStatus: 'done',
                viewResult,
                auto_switched: item.resItem.needs_swap || false,
              });
            }
          }
        }

        // 2. จัดการรูปที่ไม่ใช่รถ (Auto-Route ไปยังช่องว่างของกลุ่ม Non-AI)
        const NON_AI_VIEW_IDS = ['engine_compartment', 'interior', 'odometer', 'chassis', 'tax_sticker', 'registration_doc', 'dashcam', 'accessories', 'spare_tire', 'tire_fl', 'tire_fr', 'tire_bl', 'tire_br', 'others'];
        nonVehicleFiles.forEach(item => {
          const emptySlotId = NON_AI_VIEW_IDS.find(id => !newVerified[id]);
          if (emptySlotId) {
            newVerified[emptySlotId] = {
              image: URL.createObjectURL(item.file),
              confidence: 100,
              quality: { is_non_car: true },
              class_details: getClassDetails('Others'),
              damages: item.resItem.damages || [],
            };
            autoRoutedCount++;
          }
        });

        setDuplicateImages(newDuplicates);
        setVerifiedAngles(newVerified);
        if (newDamageQueueItems.length > 0) {
          const queuedAngleIds = new Set(newDamageQueueItems.filter(item => !item.isDuplicate).map(item => item.angleId));
          const queuedDuplicateIds = new Set(newDamageQueueItems.filter(item => item.isDuplicate).map(item => item.duplicateId));
          setDamageQueue(prev => [
            ...newDamageQueueItems,
            ...prev.filter(item => (
              item.isDuplicate
                ? !queuedDuplicateIds.has(item.duplicateId)
                : !queuedAngleIds.has(item.angleId)
            )),
          ]);
        }

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

  const completedDamageCount = damageQueue.filter(item => item.status === 'done' && item.damages.length > 0).length;
  const eligibleDamageCount = damageQueue.filter(isDamageEligible).length;
  const pendingDamageCount = damageQueue.filter(item => isDamageEligible(item) && item.status !== 'done').length;

  const rightPanel = (
    <div className="hidden lg:flex flex-col w-[500px] max-w-[40vw] bg-white border-l border-gray-200 overflow-y-auto h-screen sticky top-0">
      <div className="p-6 bg-red-50/90 border-b border-red-100 sticky top-0 z-10 backdrop-blur-md">
        <h2 className="text-xl font-bold text-red-700 flex items-center gap-2">
          <FaShieldAlt className="text-red-500" /> คิวทำนายรอย ({damageQueue.length})
        </h2>
        <p className="text-sm text-red-500/80 mt-1">คัดเฉพาะหลังคา/ภายนอก/อื่นๆ {eligibleDamageCount} รูป · พบรอยแล้ว {completedDamageCount} รูป · รอทำนาย {pendingDamageCount} รูป</p>
        {damageQueue.length > 0 && (
          <button
            onClick={handlePredictAllDamages}
            disabled={damageAllLoading || pendingDamageCount === 0}
            className="mt-4 w-full py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {damageAllLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FaShieldAlt />
            )}
            {damageAllLoading ? 'กำลังทำนายรอยทั้งหมด...' : `ทำนายรอยทั้งหมด (${pendingDamageCount})`}
          </button>
        )}
      </div>
      <div className="p-6 flex flex-col gap-6">
        {damageQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <FaShieldAlt className="text-6xl mb-4 opacity-20" />
            <p>ยังไม่มีรูปที่รอทำนายรอย</p>
          </div>
        ) : (
          damageQueue.map((item) => {
            const canPredictDamage = isDamageEligible(item);

            return (
              <div key={item.id} className="bg-white border border-red-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-red-50/50 px-4 py-3 border-b border-red-50 flex justify-between items-center">
                  <span className="font-bold text-red-900 flex items-center gap-2">
                    {item.angle?.label || 'รูปภาพ'}
                    {item.isDuplicate && (
                      <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                        รูปซ้ำ
                      </span>
                    )}
                  </span>
                  {item.status === 'done' ? (
                    <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full font-bold shadow-sm shadow-red-500/30">
                      พบ {item.damages.length} จุด
                    </span>
                  ) : !canPredictDamage ? (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-bold">
                      ข้าม
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-bold">
                      รอทำนาย
                    </span>
                  )}
                </div>
                <div
                  className="bg-gray-50 flex justify-center relative group p-2 cursor-pointer"
                  onClick={() => { setZoomImage(item.originalImage || item.image); setZoomScale(1); }}
                >
                  <img src={item.image} alt={item.angle?.label} className="w-full h-auto max-h-[360px] object-contain rounded-lg" />
                  <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white font-bold text-xs bg-gray-900/70 px-2.5 py-1 rounded-full backdrop-blur-sm shadow-lg flex items-center gap-1.5">
                      <FaImage /> ดูรูปต้นฉบับ
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-white">
                  {!canPredictDamage && (
                    <div className="mb-3 flex flex-col gap-2">
                      <p className="text-xs text-gray-400 font-medium">ไม่ใช่กลุ่มหลังคา/ภายนอก/อื่นๆ จึงไม่ส่งตรวจรอย</p>
                      {item.status !== 'skipped' && item.status !== 'done' && (
                        <button
                          onClick={() => confirmItemWithoutDamage(item)}
                          className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                        >
                          <FaCheck /> ยืนยัน ไม่ต้องตรวจรอย
                        </button>
                      )}
                    </div>
                  )}

                  {canPredictDamage && item.status !== 'done' && (
                    <button
                      onClick={() => predictDamageForItem(item)}
                      disabled={damageAllLoading || item.status === 'loading' || item.viewStatus === 'loading'}
                      className="w-full py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {item.status === 'loading' ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <FaShieldAlt />
                      )}
                      {item.viewStatus === 'loading' ? 'รอตรวจมุม...' : item.status === 'loading' ? 'กำลังทำนายรอย...' : 'ทำนายรอย'}
                    </button>
                  )}

                  {item.status === 'error' && (
                    <p className="mt-2 text-xs text-red-500 font-medium">{item.error}</p>
                  )}

                  <div className="mb-3">
                    {item.viewResult ? (
                      <div className={`rounded-xl px-3 py-2 text-xs font-bold ${item.viewResult.match && item.viewResult.is_car ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-indigo-50 text-yellow-700 border border-indigo-100'}`}>
                        AI ทาย: {LABEL_TH[item.viewResult.prediction?.label] || item.viewResult.prediction?.label || 'Unknown'} · {Math.round(item.viewResult.prediction?.confidence || 0)}%
                      </div>
                    ) : (
                      <button
                        onClick={() => predictViewForItem(item)}
                        disabled={item.viewStatus === 'loading'}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                      >
                        {item.viewStatus === 'loading' ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <FaCheck />
                        )}
                        {item.viewStatus === 'loading' ? 'กำลังตรวจมุม...' : 'ตรวจมุม'}
                      </button>
                    )}
                    {item.viewStatus === 'error' && (
                      <p className="mt-2 text-xs text-red-500 font-medium">{item.viewError}</p>
                    )}
                  </div>

                  {item.status === 'done' && item.damages.length === 0 && (
                    <p className="text-sm text-gray-400 font-medium">ไม่พบรอยตำหนิในรูปนี้</p>
                  )}

                  {item.damages.length > 0 && (
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
                  )}
                </div>
              </div>
            );
          })
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
            onClick={() => navigate('/summarie', { state: { verifiedAngles, duplicateImages } })}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-base shadow-xl shadow-blue-500/30 hover:bg-blue-700 active:scale-[0.98] transition-all mb-5 z-10"
          >
            ดูหน้าสรุปผลการทำนาย
          </button>

          <button
            onClick={() => { setVerifiedAngles({}); setDuplicateImages([]); setDamageQueue([]); setScreen('checklist'); }}
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
    const activeDamageItem = damageQueue.find(item => !item.isDuplicate && (item.angleId === activeAngle.id || item.originalAngleId === activeAngle.id));
    const canPredictActiveDamage = isDamageEligible(activeDamageItem);
    const matched = result?.match && result?.is_car;
    const notCar = result?.is_car === false;
    // ปรับเงื่อนไข wrongAngle: ต้องเป็นรถ และ Label ไม่ตรงกับที่คาดหวัง
    const wrongAngle = result?.is_car && result?.prediction?.label !== activeAngle.modelKey;
    // เพิ่มเงื่อนไข lowConfidence: ถ้า Label ตรง แต่ AI มั่นใจไม่ถึงเกณฑ์
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
                <span className="text-white text-sm font-medium">กำลังเช็ค API...</span>
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

            {result?.staged && (
              <StatusCard
                color="green"
                icon={<FaCheck />}
                title="เพิ่มรูปเข้าคิวแล้ว"
                desc={canPredictActiveDamage ? 'กดตรวจมุมเพื่อให้ AI บอกว่าถูกมุมไหม จากนั้นค่อยทำนายรอย' : 'รูปนี้ไม่ใช่หลังคา/ภายนอก/อื่นๆ จึงไม่ต้องทำนายรอย'}
              />
            )}

            {result?.damage_checked && (
              <StatusCard
                color="green"
                icon={<FaShieldAlt />}
                title={result.skipped_damage ? 'ยืนยันรูปแล้ว' : 'ทำนายรอยเสร็จแล้ว'}
                desc={result.skipped_damage ? 'ข้ามการทำนายรอย เพราะไม่ใช่กลุ่มหลังคา/ภายนอก/อื่นๆ' : `พบรอย ${result.damages?.length || 0} จุด`}
              />
            )}

            {notCar && (
              <StatusCard color="red" icon={<FaTimes />} title="ไม่พบรถยนต์ในภาพ" desc="กรุณาถ่ายภาพรถยนต์ให้ชัดเจนและอยู่กลางภาพ" />
            )}

            {wrongAngle && topPred && (
              <StatusCard color="yellow" icon={<MdSwapHoriz />} title="พบมุมไม่ตรง" desc={`AI เห็นว่าเป็น ${LABEL_TH[topPred.label] || topPred.label} (${Math.round(topPred.confidence)}%)`} />
            )}

            {result?.auto_switched && (
              <StatusCard color="yellow" icon={<MdSwapHoriz />} title="ย้ายช่องให้อัตโนมัติแล้ว" desc={`รูปนี้ถูกนำไปไว้ที่ "${result.auto_switched_to}"`} />
            )}

            {lowConfidence && topPred && (
              <StatusCard color="yellow" icon={<MdWarning />} title={`ภาพยังไม่ชัดเจนพอ`} desc={`AI เห็นว่าเป็น ${LABEL_TH[topPred.label] || topPred.label} แต่ AI มั่นใจต่ำ (${Math.round(topPred.confidence)}%) กรุณาขยับมุมหรือถ่ายในที่สว่างขึ้น`} />
            )}

            {matched && (
              <StatusCard color="green" icon={<FaCheck />} title={`ตรงมุม "${activeAngle.label}" แล้ว!`} desc={`AI มั่นใจ ${Math.round(result.prediction.confidence)}% · คุณภาพภาพผ่าน`} />
            )}

            {activeDamageItem && activeDamageItem.status !== 'done' && (
              <div className="flex flex-col gap-3 mt-1">
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setCapturedImage(null);
                      setOriginalImage(null);
                      setResult(null);
                      setDamageQueue(prev => prev.filter(item => item.isDuplicate || (item.angleId !== activeAngle.id && item.originalAngleId !== activeAngle.id)));
                      fileInputRef.current?.click();
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-white/10 text-white rounded-2xl font-bold text-sm hover:bg-white/20 transition-all"
                  >
                    <FaRedo className="text-xs" /> ถ่ายใหม่
                  </button>
                  <button
                    onClick={() => activeDamageItem && predictViewForItem(activeDamageItem)}
                    disabled={!activeDamageItem || activeDamageItem.viewStatus === 'loading'}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {activeDamageItem?.viewStatus === 'loading' ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <FaCheck />
                    )}
                    {activeDamageItem?.viewStatus === 'loading' ? 'กำลังตรวจ...' : activeDamageItem?.viewResult ? 'ตรวจมุมอีกครั้ง' : 'ตรวจมุม'}
                  </button>
                </div>
                {canPredictActiveDamage ? (
                  <button
                    onClick={() => activeDamageItem && predictDamageForItem(activeDamageItem)}
                    disabled={!activeDamageItem || damageAllLoading || activeDamageItem.status === 'loading' || activeDamageItem.viewStatus === 'loading'}
                    className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-red-500/30 hover:bg-red-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {activeDamageItem?.status === 'loading' ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <FaShieldAlt />
                    )}
                    {activeDamageItem?.viewStatus === 'loading' ? 'รอตรวจมุม...' : activeDamageItem?.status === 'loading' ? 'กำลังทำนาย...' : 'ทำนายรอย'}
                  </button>
                ) : (
                  <button
                    onClick={() => activeDamageItem && confirmItemWithoutDamage(activeDamageItem)}
                    disabled={!activeDamageItem || activeDamageItem.viewStatus === 'loading'}
                    className="w-full py-4 bg-gray-100 text-gray-800 rounded-2xl font-bold text-sm hover:bg-gray-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <FaCheck /> ยืนยัน ไม่ต้องตรวจรอย
                  </button>
                )}
              </div>
            )}

            {result?.damage_checked && (
              <div className="flex gap-3 mt-1">
                <button
                  onClick={() => {
                    setCapturedImage(null);
                    setOriginalImage(null);
                    setResult(null);
                    setDamageQueue(prev => prev.filter(item => item.isDuplicate || (item.angleId !== activeAngle.id && item.originalAngleId !== activeAngle.id)));
                    fileInputRef.current?.click();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-white/10 text-white rounded-2xl font-bold text-sm hover:bg-white/20 transition-all"
                >
                  <FaRedo className="text-xs" /> ถ่ายใหม่
                </button>
                <button onClick={handleBack} className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-green-500/30 hover:bg-green-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                  <FaCheck /> มุมต่อไป
                </button>
              </div>
            )}

            {result && !result.staged && !result.damage_checked && (
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
                            class_details: getClassDetails(result?.prediction?.label || activeAngle.modelKey),
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
                  <button onClick={handleBack} className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-green-500/30 hover:bg-green-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
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

  const findPrimaryQueuedItem = (angleId) => damageQueue.find(item => !item.isDuplicate && item.angleId === angleId);
  const hasChecklistResults = verifiedCount > 0 || duplicateImages.length > 0 || damageQueue.length > 0;
  const filledAngles = hasChecklistResults
    ? ANGLES.filter(angle => verifiedAngles[angle.id] || findPrimaryQueuedItem(angle.id))
    : ANGLES;
  const missingAngles = hasChecklistResults
    ? ANGLES.filter(angle => !verifiedAngles[angle.id] && !findPrimaryQueuedItem(angle.id))
    : [];
  const firstEmptyAngleIndex = ANGLES.findIndex(a => !verifiedAngles[a.id] && !findPrimaryQueuedItem(a.id));

  const renderAngleCard = (angle, idx, isMissing = false) => {
    const verified = verifiedAngles[angle.id];
    const queued = findPrimaryQueuedItem(angle.id);
    const displayItem = verified || queued;
    const isNext = !hasChecklistResults && !displayItem && idx === firstEmptyAngleIndex;

    return (
      <div key={angle.id} className="flex flex-col items-center">
        <button
          onClick={() => {
            if (!displayItem) handleStartCapture(angle);
          }}
          className={`relative w-full aspect-[4/3] rounded-xl border-2 overflow-hidden transition-all duration-300 flex items-center justify-center ${verified ? 'border-green-400 bg-white' : queued ? 'border-orange-300 bg-white shadow-sm' : isNext ? 'border-blue-400 bg-white shadow-md' : isMissing ? 'border-gray-200 border-dashed bg-gray-50' : 'border-gray-200 bg-gray-50'}`}
        >
          {displayItem?.image ? (
            <>
              <img src={displayItem.image} alt={angle.label} className="w-full h-full object-cover" />
              {queued && !verified && (
                <div className="absolute left-1 bottom-1 bg-orange-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">
                  รอทำนาย
                </div>
              )}
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
                {angle.icon}
              </div>
              {isMissing ? (
                <span className="text-[10px] font-bold text-gray-400">ไม่มีรูป</span>
              ) : (
                isNext && <MdOutlinePhotoCamera className="text-xs" />
              )}
            </div>
          )}
        </button>

        <div className="mt-1.5 flex items-start gap-1 px-0.5 w-full justify-center min-h-[30px]">
          <div className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[8px] ${verified ? 'bg-green-500 text-white' : queued ? 'bg-orange-100 border border-orange-300 text-orange-500' : 'border border-gray-300 bg-white'}`}>
            {verified && <FaCheck />}
          </div>
          <span className={`min-w-0 flex-1 text-[10px] leading-[1.15] font-bold text-center line-clamp-2 break-words ${verified ? 'text-green-700' : queued ? 'text-orange-600' : isNext ? 'text-blue-900' : 'text-gray-500'}`}>
            {angle.label}
          </span>
        </div>
      </div>
    );
  };

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
          <MdInfo className="text-blue-400 text-sm mt-0.5 flex-shrink-0" />
          <p className="text-blue-600 text-[11px] font-medium leading-relaxed">
            AI จะตรวจสอบว่า: มุมภาพถูกต้อง · เห็นรถเต็มคัน · ภาพไม่เบลอ · แสงพอเหมาะ
          </p>
        </div>

        <div className="mx-4 mt-3">
          <input ref={batchInputRef} type="file" webkitdirectory="true" multiple className="hidden" onChange={handleBatchUpload} />
          <button onClick={() => batchInputRef.current?.click()} disabled={batchLoading} className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600/10 border border-indigo-500/30 text-indigo-700 rounded-2xl font-bold text-sm hover:bg-indigo-600/20 transition-all disabled:opacity-50">
            {batchLoading ? <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <FaImage />}
            {batchLoading ? 'กำลังตรวจมุมจากโฟลเดอร์...' : 'อัปโหลดทั้งโฟลเดอร์ (ตรวจมุมอัตโนมัติ)'}
          </button>
        </div>

        {damageQueue.length > 0 && (
          <div className="mx-4 mt-3 lg:hidden">
            <button
              onClick={handlePredictAllDamages}
              disabled={damageAllLoading || pendingDamageCount === 0}
              className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all disabled:opacity-50"
            >
              {damageAllLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FaShieldAlt />
              )}
              {damageAllLoading ? 'กำลังทำนายรอยทั้งหมด...' : `ทำนายรอยทั้งหมด (${pendingDamageCount})`}
            </button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 p-4">
          {filledAngles.map((angle, idx) => renderAngleCard(angle, idx))}

          {duplicateImages.map((dup, idx) => {
            const duplicateId = dup.id || `duplicate-${idx}`;
            const duplicateLabel = dup.label || 'รูปซ้ำ';

            return (
              <div key={duplicateId} className="flex flex-col items-center">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => { setZoomImage(dup.originalImage || dup.image); setZoomScale(1); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setZoomImage(dup.originalImage || dup.image);
                      setZoomScale(1);
                    }
                  }}
                  className="relative w-full aspect-[4/3] rounded-xl border-2 border-orange-300 bg-white shadow-sm overflow-hidden transition-all duration-300 flex items-center justify-center cursor-pointer"
                >
                  <img src={dup.image} alt={duplicateLabel} className="w-full h-full object-cover" />
                  <div className="absolute left-1 bottom-1 bg-orange-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">
                    รูปซ้ำ
                  </div>
                  <button
                    onClick={(e) => handleRemoveDuplicate(e, duplicateId)}
                    className="absolute top-1 right-1 w-6 h-6 bg-gray-900/60 text-white rounded-full flex items-center justify-center text-[10px] hover:bg-gray-900 transition-colors z-10"
                  >
                    <FaTimes />
                  </button>
                </div>

                <div className="mt-1.5 flex items-start gap-1 px-0.5 w-full justify-center min-h-[30px]">
                  <div className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[8px] bg-orange-100 border border-orange-300 text-orange-500">
                    <FaPlus />
                  </div>
                  <span className="min-w-0 flex-1 text-[10px] leading-[1.15] font-bold text-center line-clamp-2 break-words text-orange-700">
                    {duplicateLabel}
                  </span>
                </div>
              </div>
            );
          })}

          {missingAngles.map((angle, idx) => renderAngleCard(angle, idx, true))}
        </div>

        {verifiedCount > 0 && !allDone && (
          <div className="mx-4 p-3 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-2">
            <MdLightbulb className="text-blue-500 text-base flex-shrink-0" />
            <p className="text-blue-600 text-xs font-medium">เหลืออีก {totalAngles - verifiedCount} มุม เสร็จใกล้แล้ว!</p>
          </div>
        )}

        {duplicateImages.length > 0 && (
          <div className="mx-4 mt-1 p-3 bg-orange-50 rounded-2xl border border-orange-200 flex items-center justify-between gap-3">
            <p className="text-orange-700 text-xs font-bold">
              สร้างช่องรูปซ้ำเพิ่มแล้ว {duplicateImages.length} รูป
            </p>
            <button
              onClick={() => setDuplicateImages([])}
              className="px-3 py-2 bg-orange-100 text-orange-700 text-[11px] font-bold rounded-xl hover:bg-orange-200 transition-colors flex-shrink-0"
            >
              ลบทั้งหมด
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
    yellow: 'bg-indigo-50 border-indigo-100 text-yellow-700 bg-yellow-100',
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
