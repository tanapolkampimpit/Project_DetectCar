import React, { useState, useEffect } from 'react';
import { FaCarSide } from 'react-icons/fa';
import { MdDirectionsCar } from 'react-icons/md';

// Import New Components
import Header from '../components/Home/Header';
import Viewfinder from '../components/Home/Viewfinder';
import AngleSelector from '../components/Home/AngleSelector';
import Controls from '../components/Home/Controls';
import Fotter from '../components/Layout/Fotter';

const ANGLES = [
  { id: 'right', label: 'ข้างขวา', icon: <FaCarSide style={{ transform: 'scaleX(-1)' }} /> },
  { id: 'front', label: 'หน้า', icon: <MdDirectionsCar /> },
  { id: 'rear', label: 'หลัง', icon: <MdDirectionsCar style={{ transform: 'rotate(180deg)' }} /> },
  { id: 'left', label: 'ข้างซ้าย', icon: <FaCarSide /> }

];

function Home() {
  const [activeAngle, setActiveAngle] = useState(ANGLES[0]);
  const [capturedImage, setCapturedImage] = useState(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedImage = localStorage.getItem('last_captured_car');
    if (savedImage) {
      setCapturedImage(savedImage);
    }
  }, []);

  const saveImage = (imgData) => {
    setCapturedImage(imgData);
    localStorage.setItem('last_captured_car', imgData);
  };

  return (
    <div className="max-w-[480px] w-full min-h-screen bg-[#f8fbff] mx-auto flex flex-col pb-[80px] font-sans text-gray-900 animate-fade-in relative overflow-hidden">
      <Header />

      <main className="p-6 flex flex-col gap-6">
        <div className="flex flex-col relative">
          <Viewfinder
            activeAngle={activeAngle}
            capturedImage={capturedImage}
          />

          <AngleSelector
            angles={ANGLES}
            activeAngle={activeAngle}
            onSelect={setActiveAngle}
          />
        </div>

        <Controls
          activeAngle={activeAngle}
          onImageCapture={saveImage}
        />
      </main>

      <Fotter />
    </div>
  );
}

export default Home;
