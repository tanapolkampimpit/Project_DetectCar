import { FaImage } from 'react-icons/fa';

export default function Viewfinder({
  activeAngle,
  capturedImage
}) {
  return (
    <div className="bg-white rounded-[36px] overflow-hidden relative shadow-2xl flex flex-col transition-all duration-500">
      {/* ส่วนหัวแสดงชื่อมุมมอง */}
      <div className="p-6 text-center z-10 bg-white/10 backdrop-blur-sm border-b border-gray-100">
        <h3 className="text-xl font-bold text-gray-800">
          {activeAngle.label}
        </h3>
      </div>

      <div className="w-full h-[420px] bg-gray-100 relative overflow-hidden">
        {capturedImage ? (
          /* ส่วนแสดงรูปภาพที่เลือก/แอดเข้ามา */
          <div className="w-full h-full relative animate-in fade-in duration-300">
            <img
              src={capturedImage}
              alt="Captured Content"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/10 flex flex-col items-center justify-end p-6">
              <span className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl text-xs font-bold text-gray-900 shadow-lg border border-white/50">
                รูปที่วิเคราะห์ล่าสุด
              </span>
            </div>
          </div>
        ) : (
          /* ส่วนแสดงสถานะว่าง (ยังไม่ได้แอดภาพ) */
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-4 bg-gray-50">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center shadow-inner">
              <FaImage className="text-4xl opacity-30" />
            </div>
            <p className="font-semibold text-gray-400">
              กรุณาเลือกรูปภาพเพื่อวิเคราะห์
            </p>
          </div>
        )}

        {/* Viewfinder Overlays (กรอบสี่เหลี่ยมโฟกัส) */}
        <div className="absolute inset-0 pointer-events-none p-8">
          <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-white/80 rounded-tl-xl"></div>
          <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-white/80 rounded-tr-xl"></div>
          <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-white/80 rounded-bl-xl"></div>
          <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-white/80 rounded-br-xl"></div>
        </div>
      </div>
    </div>
  );
}