import { FaCar } from 'react-icons/fa';

export default function Header() {
  return (
    <header className="bg-white p-6 flex items-center gap-4 rounded-b-3xl shadow-sm z-20">
      <div className="bg-[#1e40af] w-11 h-11 rounded-xl flex items-center justify-center text-white text-xl">
        <FaCar />
      </div>
      <div>
        <h2 className="text-lg font-extrabold text-[#1e40af] leading-tight">ConnectCar</h2>
        <p className="text-xs text-gray-400 font-medium tracking-wide">เชื่อมต่อรถยนต์ - Camera Active</p>
      </div>
    </header>
  );
}
