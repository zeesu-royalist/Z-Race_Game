import React, { useEffect, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { SpeedometerHUD } from './components/SpeedometerHUD';
import { MiniMap } from './components/MiniMap';
import { ControlsOverlay } from './components/ControlsOverlay';
import { TouchControls } from './components/TouchControls';
import { soundManager } from './utils/AudioSystem';
import { useGameStore } from './store/gameStore';

export default function App() {
  if (typeof window !== 'undefined') {
    window.useGameStore = useGameStore;
    window.soundManager = soundManager;
  }
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

    // 4. Audio context pre-init & instant resume on any user gesture (click, keypress, touch)
    soundManager.init();

    const handleUserInteraction = () => {
      soundManager.init();
      soundManager.resume();
    };

    window.addEventListener('click', handleUserInteraction, { capture: true, passive: true });
    window.addEventListener('pointerdown', handleUserInteraction, { capture: true, passive: true });
    window.addEventListener('keydown', handleUserInteraction, { capture: true, passive: true });
    window.addEventListener('touchstart', handleUserInteraction, { capture: true, passive: true });

    // 5. Suspend audio and save CPU/battery when tab is hidden or phone screen is locked
    const handleVisibilityChange = () => {
      if (document.hidden) {
        soundManager.setEnabled(false);
      } else {
        const soundEnabled = useGameStore.getState().soundEnabled;
        soundManager.setEnabled(soundEnabled);
        if (soundEnabled) {
          soundManager.resume();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('pointerdown', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
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
