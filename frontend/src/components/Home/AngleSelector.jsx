import { FaCheckCircle } from 'react-icons/fa';

export default function AngleSelector({ angles, activeAngle, onSelect, verifiedAngles = {} }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none px-1">
      {angles.map((angle) => {
        const isActive = activeAngle.id === angle.id;
        const isVerified = verifiedAngles[angle.id];

        return (
          <button
            key={angle.id}
            onClick={() => onSelect(angle)}
            className={`relative flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 ${isActive
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                : isVerified
                  ? 'bg-green-50 text-green-700 border-2 border-green-200'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
              }`}
          >
            <span className={`text-base ${isActive ? 'text-white' : isVerified ? 'text-green-600' : 'text-gray-400'}`}>
              {angle.icon}
            </span>
            <span>{angle.label}</span>
            {isVerified && (
              <span className={`text-xs ${isActive ? 'text-white/80' : 'text-green-500'}`}>
                <FaCheckCircle />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
