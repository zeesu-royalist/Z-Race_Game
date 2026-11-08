import React, { useEffect, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { SpeedometerHUD } from './components/SpeedometerHUD';
import { MiniMap } from './components/MiniMap';
import { ControlsOverlay } from './components/ControlsOverlay';
import { TouchControls } from './components/TouchControls';
import { soundManager } from './utils/AudioSystem';
import { useGameStore } from './store/gameStore';

export default function App() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const fetchCars = useGameStore((s) => s.fetchCars);
  const syncCarsList = useGameStore((s) => s.syncCarsList);

  useEffect(() => {
    // 1. Initial car scanning from public/cars-models/
    fetchCars();

    // 2. Real-time HMR watcher for dynamically dropped .glb files
    if (import.meta.hot) {
      import.meta.hot.on('cars-updated', (updatedCars) => {
        console.log('[Z-Race] New cars detected in public/cars-models/!', updatedCars);
        syncCarsList(updatedCars);
      });
    }

    // 3. Detect touch capability
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(hasTouch);

    // 4. Audio context auto-init on first click or touch
    const handleFirstClick = () => {
      soundManager.init();
      window.removeEventListener('click', handleFirstClick);
      window.removeEventListener('keydown', handleFirstClick);
      window.removeEventListener('touchstart', handleFirstClick);
    };

    window.addEventListener('click', handleFirstClick);
    window.addEventListener('keydown', handleFirstClick);
    window.addEventListener('touchstart', handleFirstClick, { passive: true });

    // 5. Suspend audio and save CPU/battery when tab is hidden or phone screen is locked
    const handleVisibilityChange = () => {
      if (document.hidden) {
        soundManager.setEnabled(false);
      } else {
        const soundEnabled = useGameStore.getState().soundEnabled;
        soundManager.setEnabled(soundEnabled);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('click', handleFirstClick);
      window.removeEventListener('keydown', handleFirstClick);
      window.removeEventListener('touchstart', handleFirstClick);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchCars, syncCarsList]);

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
