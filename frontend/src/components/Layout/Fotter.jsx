import { FaCarSide, FaCarCrash } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Fotter() {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        { icon: <FaCarSide />, path: '/', label: 'ถ่ายรูป' },
        { icon: <FaCarCrash />, path: '/summarie', label: 'สรุปผล' },
    ];

    return (
        <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-20 bg-white flex justify-around items-center shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-30">
            {tabs.map((tab) => {
                const isActive = location.pathname === tab.path;
                return (
                    <button
                        key={tab.path}
                        onClick={() => navigate(tab.path)}
                        className="flex flex-col items-center gap-1 bg-transparent border-none cursor-pointer transition-all duration-200"
                    >
                        {isActive && (
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                        )}
                        <div className={`text-2xl transition-colors duration-200 ${isActive ? 'text-[#1e40af]' : 'text-gray-300'}`}>
                            {tab.icon}
                        </div>
                        <span className={`text-[10px] font-medium ${isActive ? 'text-[#1e40af]' : 'text-gray-300'}`}>
                            {tab.label}
                        </span>
                    </button>
                );
            })}
    </footer>
    );
}