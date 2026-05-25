import { useLocation, useNavigate } from "react-router-dom";
import { FaCheck, FaShieldAlt, FaPrint, FaArrowLeft } from 'react-icons/fa';

const ANGLES = [
    { id: 'front', label: 'ด้านหน้าตรง' },
    { id: 'rear', label: 'ด้านหลังตรง' },
    { id: 'left', label: 'ด้านข้างซ้าย' },
    { id: 'right', label: 'ด้านข้างขวา' },
    { id: 'roof', label: 'หลังคารถยนต์' },
    { id: 'interior', label: 'ภายใน/อุปกรณ์ตกแต่ง' },
    { id: 'spare_tire', label: 'ยางอะไหล่' },
    { id: 'chassis', label: 'เลขตัวถังรถยนต์' },
    { id: 'accessories', label: 'กรณีมีอุปกรณ์ตกแต่ง เช่นล้อแม็กซ์ เครื่องเสียง' },
    { id: 'dashcam', label: 'กล้องติดหน้ารถ' },
    { id: 'front-right', label: 'เฉียงหน้าด้านขวา' },
    { id: 'front-left', label: 'เฉียงหน้าด้านซ้าย' },
    { id: 'back-right', label: 'เฉียงหลังด้านขวา' },
    { id: 'back-left', label: 'เฉียงหลังด้านซ้าย' },
    { id: 'odometer', label: 'จอเลขไมล์' },
    { id: 'tax_sticker', label: 'แผ่นป้ายภาษี' },
    { id: 'registration_doc', label: 'รายการจดทะเบียน' },
    { id: 'engine_compartment', label: 'ห้องเครื่องยนต์' },
    { id: 'tire_fl', label: 'ล้อที่ให้เห็นยี่ห้อและขนาด ปีผลิตของยาง ล้อหน้าซ้าย' },
    { id: 'tire_fr', label: 'ล้อที่ให้เห็นยี่ห้อและขนาด ปีผลิตของยาง ล้อหน้าขวา' },
    { id: 'tire_bl', label: 'ล้อที่ให้เห็นยี่ห้อและขนาด ปีผลิตของยาง ล้อหลังซ้าย' },
    { id: 'tire_br', label: 'ล้อที่ให้เห็นยี่ห้อและขนาด ปีผลิตของยาง ล้อหลังขวา' },
    { id: 'others', label: 'อื่นๆ (MTPhoto)' }
];

export default function Summarie() {
    const location = useLocation();
    const navigate = useNavigate();

    const verifiedAngles = location.state?.verifiedAngles || {};
    const totalAngles = ANGLES.length;
    const verifiedCount = Object.keys(verifiedAngles).length;

    if (verifiedCount === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f7fe] p-5">
                <p className="text-gray-500 mb-4">ยังไม่มีข้อมูลรูปภาพจากการทำนาย</p>
                <button onClick={() => navigate('/')} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700">
                    กลับไปถ่ายรูป
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-[480px] w-full min-h-screen bg-[#f4f7fe] mx-auto flex flex-col font-sans">
            <div className="bg-white px-5 pt-6 pb-5 rounded-b-3xl shadow-sm flex items-center justify-between z-10 relative">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-white text-xl shadow-md shadow-green-500/20">
                        <FaShieldAlt />
                    </div>
                    <div>
                        <h1 className="text-base font-extrabold text-gray-900 leading-tight">สรุปผลการตรวจสอบ</h1>
                        <p className="text-[11px] text-gray-500">
                            {verifiedCount === totalAngles ? "รูปภาพครบถ้วนสมบูรณ์" : `ขาดอีก ${totalAngles - verifiedCount} มุม`}
                        </p>
                    </div>
                </div>
                <button onClick={() => navigate(-1)} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
                    <FaArrowLeft className="text-sm" />
                </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto pb-6">
                <div className="grid grid-cols-2 gap-4">
                    {ANGLES.map((a) => {
                        const v = verifiedAngles[a.id];
                        return (
                            <div key={a.id} className={`bg-white rounded-2xl overflow-hidden shadow-sm border ${v ? 'border-green-200' : 'border-gray-200 border-dashed'} transition-all`}>
                                <div className="h-32 bg-gray-50 relative group">
                                    {v?.image ? (
                                        <img src={v.image} alt={a.label} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                                            <FaShieldAlt className="text-2xl mb-1 opacity-20" />
                                            <span className="text-[10px] font-medium">รอรูปภาพ</span>
                                        </div>
                                    )}
                                    {v && (
                                        <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-[10px] shadow-md border-2 border-white">
                                            <FaCheck />
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 bg-white">
                                    <p className="text-xs font-bold text-gray-800">{a.label}</p>
                                    {v && (
                                        <div className="flex flex-col gap-0.5 mt-1">
                                            <div className="flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                <p className="text-[10px] text-gray-500 font-medium">AI มั่นใจ {Math.round(v.confidence || 0)}%</p>
                                            </div>
                                            {v.class_details && (
                                                <div className="flex items-start gap-1 mt-1.5">
                                                    <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100 flex-shrink-0">
                                                        {v.class_details.group}
                                                    </span>
                                                    <span className="text-[10px] text-gray-600 line-clamp-1">
                                                        {v.class_details.th_name}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-white p-4 rounded-t-3xl shadow-[0_-10px_30px_rgba(0,0,0,0.05)] flex gap-3 z-10">
                <button onClick={() => navigate('/')} className="flex-1 py-4 bg-gray-50 border border-gray-200 text-gray-700 rounded-2xl font-bold text-sm hover:bg-gray-100 transition-all">แก้ไขรูป</button>
                <button className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all flex items-center justify-center gap-2" onClick={() => alert("บันทึกข้อมูลเรียบร้อย!")}><FaPrint /> ยืนยันข้อมูล</button>
            </div>
        </div>
    );
}