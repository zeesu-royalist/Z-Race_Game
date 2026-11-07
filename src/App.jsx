import React, { useEffect, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { SpeedometerHUD } from './components/SpeedometerHUD';
import { MiniMap } from './components/MiniMap';
import { ControlsOverlay } from './components/ControlsOverlay';
import { TouchControls } from './components/TouchControls';
import { soundManager } from './utils/AudioSystem';

export default function App() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Detect touch capability
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(hasTouch);

    // Audio context auto-init on first click
    const handleFirstClick = () => {
      soundManager.init();
      window.removeEventListener('click', handleFirstClick);
      window.removeEventListener('keydown', handleFirstClick);
    };

    window.addEventListener('click', handleFirstClick);
    window.addEventListener('keydown', handleFirstClick);

    return () => {
      window.removeEventListener('click', handleFirstClick);
      window.removeEventListener('keydown', handleFirstClick);
    };
  }, []);

  return (
    <div className="game-viewport">
      {/* 3D WebGL Canvas */}
      <GameCanvas />

      {/* Top Controls Overlay */}
      <ControlsOverlay />

      {/* Mini-map Radar */}
      <MiniMap />

      {/* Speedometer & Tachometer Cluster */}
      <SpeedometerHUD />

      {/* Mobile / Touchscreen On-screen Controls */}
      {isTouchDevice && <TouchControls />}
    </div>
  );
}

