import React, { useEffect, useState } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { SpeedometerHUD } from './components/SpeedometerHUD';
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
    fetchCars();

    if (import.meta.hot) {
      import.meta.hot.on('cars-updated', (updatedCars) => {
        syncCarsList(updatedCars);
      });
    }

    const updateTouch = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches ||
        window.innerWidth <= 1024
      );
    };
    updateTouch();
    window.addEventListener('resize', updateTouch);
    window.addEventListener('orientationchange', updateTouch);
    soundManager.init();

    const handleUserInteraction = () => {
      soundManager.init();
      soundManager.resume();
      if (screen.orientation?.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      }
    };

    const events = ['click', 'pointerdown', 'keydown', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, handleUserInteraction, { capture: true, passive: true }));

    const handleVisibilityChange = () => {
      if (document.hidden) {
        soundManager.setEnabled(false);
      } else {
        const soundEnabled = useGameStore.getState().soundEnabled;
        soundManager.setEnabled(soundEnabled);
        if (soundEnabled) soundManager.resume();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('resize', updateTouch);
      window.removeEventListener('orientationchange', updateTouch);
      events.forEach((evt) => window.removeEventListener(evt, handleUserInteraction));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchCars, syncCarsList]);

  return (
    <div className="game-viewport">
      <GameCanvas />
      <ControlsOverlay />
      <SpeedometerHUD />
      {isTouchDevice && <TouchControls />}
    </div>
  );
}
