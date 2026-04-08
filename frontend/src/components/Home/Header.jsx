import { FaCar } from 'react-icons/fa';
import { MdFlashOn } from 'react-icons/md';

export default function Header({ verifiedCount, totalAngles }) {
  return (
    <header className="px-5 pt-5 pb-3 flex items-center justify-between z-20">
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 w-9 h-9 rounded-xl flex items-center justify-center text-white text-base shadow-lg shadow-blue-500/30">
          <FaCar />
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-900 leading-tight">ถ่ายรูปรถยนต์</h2>
          <p className="text-[10px] text-gray-400 font-medium">AI วิเคราะห์มุมภาพอัตโนมัติ</p>
        </div>
      </div>

      {/* Progress pill */}
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${
        verifiedCount === totalAngles 
          ? 'bg-green-100 text-green-700' 
          : 'bg-blue-50 text-blue-600'
      }`}>
        <MdFlashOn className="text-sm" />
        <span>{verifiedCount}/{totalAngles} มุม</span>
      </div>
    </header>
  );
}
