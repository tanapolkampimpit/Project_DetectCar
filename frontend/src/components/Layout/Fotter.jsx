import { FaCarSide, FaCarCrash } from 'react-icons/fa';
export default function Fotter() {
    return (
        <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-20 bg-white flex justify-around items-center shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-30">
            <div className="text-2xl text-[#1e40af]">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mx-auto mb-1"></div>
                <FaCarSide />
            </div>
            <div className="text-2xl text-gray-300"><FaCarCrash />
            </div>
        </footer>
    );
}