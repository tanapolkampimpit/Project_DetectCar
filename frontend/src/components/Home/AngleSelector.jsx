export default function AngleSelector({ angles, activeAngle, onSelect }) {
  return (
    <div className="p-6 flex justify-around bg-white rounded-b-[36px] -mt-1 shadow-inner">
      {angles.map((angle) => (
        <div key={angle.id} className="flex flex-col items-center gap-2">
          <button
            className={`w-12 h-12 rounded-xl text-xl flex items-center justify-center transition-all duration-300 ${
              activeAngle.id === angle.id 
              ? 'bg-[#1e40af] text-white shadow-lg shadow-blue-900/20' 
              : 'bg-gray-100 text-gray-400'
            }`}
            onClick={() => onSelect(angle)}
          >
            {angle.icon}
          </button>
          <span className="text-[10px] font-bold text-gray-400 text-center uppercase tracking-tighter">{angle.label}</span>
        </div>
      ))}
    </div>
  );
}
