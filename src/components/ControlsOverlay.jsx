import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import {
  Car,
  Volume2,
  VolumeX,
  Camera,
  Sun,
  Sunset,
  Moon,
  RotateCcw,
  Flag,
  Wrench,
  HelpCircle,
  X,
  Keyboard,
  Lightbulb
} from 'lucide-react';
import { CarCustomizerModal } from './CarCustomizerModal';

export function ControlsOverlay() {
  const cameraMode = useGameStore((s) => s.cameraMode);
  const cycleCameraMode = useGameStore((s) => s.cycleCameraMode);
  const timeOfDay = useGameStore((s) => s.timeOfDay);
  const cycleTimeOfDay = useGameStore((s) => s.cycleTimeOfDay);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const toggleSound = useGameStore((s) => s.toggleSound);
  const triggerReset = useGameStore((s) => s.triggerReset);
  const raceActive = useGameStore((s) => s.raceActive);
  const startRace = useGameStore((s) => s.startRace);
  const stopRace = useGameStore((s) => s.stopRace);
  const headlights = useGameStore((s) => s.headlights);
  const toggleHeadlights = useGameStore((s) => s.toggleHeadlights);
  const carName = useGameStore((s) => s.carName);

  const [isGarageOpen, setIsGarageOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const getTimeIcon = () => {
    if (timeOfDay === 'day') return <Sun size={17} color="#ffbb00" />;
    if (timeOfDay === 'sunset') return <Sunset size={17} color="#ff7733" />;
    return <Moon size={17} color="#88aaff" />;
  };

  return (
    <>
      <header className="game-header">
        {/* Brand / Title */}
        <div className="brand-group">
          <span className="brand-badge">PRO EDITION</span>
          <h1 className="brand-title">Z-RACE</h1>
          <span className="brand-sub">3D CITY RACER</span>
        </div>

        {/* Center Quick Action Buttons */}
        <div className="header-actions">
          {/* Race Mode Toggle */}
          <button
            className={`action-pill ${raceActive ? 'race-active-pill' : 'race-idle-pill'}`}
            onClick={raceActive ? stopRace : startRace}
            title={raceActive ? 'End Race' : 'Start Circuit Race'}
          >
            <Flag size={16} />
            <span>{raceActive ? 'ABORT RACE' : 'START RACE'}</span>
          </button>

          {/* Garage / Car Customizer */}
          <button
            className="action-pill car-selector-pill"
            onClick={() => setIsGarageOpen(true)}
            title="Switch Car / Garage (Press to change car)"
          >
            <Car size={16} />
            <span>{carName.toUpperCase()}</span>
          </button>

          {/* Camera View Switcher */}
          <button
            className="action-pill"
            onClick={cycleCameraMode}
            title="Switch Camera (Press C)"
          >
            <Camera size={16} />
            <span>CAM: {cameraMode.toUpperCase()}</span>
          </button>

          {/* Time of Day Switcher */}
          <button
            className="action-pill"
            onClick={cycleTimeOfDay}
            title="Toggle Day/Sunset/Night (Press T)"
          >
            {getTimeIcon()}
            <span>{timeOfDay.toUpperCase()}</span>
          </button>

          {/* Headlights Toggle */}
          <button
            className={`action-pill ${headlights ? 'headlights-on' : ''}`}
            onClick={toggleHeadlights}
            title="Toggle Headlights (Press L)"
          >
            <Lightbulb size={16} />
            <span>LIGHTS</span>
          </button>

          {/* Sound Toggle */}
          <button
            className="icon-action-btn"
            onClick={toggleSound}
            title="Toggle Audio (Press M)"
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} color="#ff4455" />}
          </button>

          {/* Reset Car */}
          <button
            className="icon-action-btn reset-btn"
            onClick={triggerReset}
            title="Reset Car Upright (Press R)"
          >
            <RotateCcw size={18} />
          </button>

          {/* Controls Help */}
          <button
            className="icon-action-btn"
            onClick={() => setIsHelpOpen(true)}
            title="Controls & Instructions"
          >
            <HelpCircle size={18} />
          </button>
        </div>
      </header>

      {/* Car Customizer & Model Selector Modal */}
      <CarCustomizerModal
        isOpen={isGarageOpen}
        onClose={() => setIsGarageOpen(false)}
      />

      {/* Controls Help Modal */}
      {isHelpOpen && (
        <div className="modal-backdrop" onClick={() => setIsHelpOpen(false)}>
          <div className="modal-card help-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <Keyboard className="text-cyan" size={24} />
                <h2>GAME CONTROLS & HOW TO PLAY</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setIsHelpOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="keys-grid">
                <div className="key-row">
                  <div className="key-badges">
                    <span className="key-cap">W</span>
                    <span className="key-cap">▲</span>
                  </div>
                  <span className="key-desc">Accelerate / Gas Pedal</span>
                </div>
                <div className="key-row">
                  <div className="key-badges">
                    <span className="key-cap">S</span>
                    <span className="key-cap">▼</span>
                  </div>
                  <span className="key-desc">Brake / Reverse Gear</span>
                </div>
                <div className="key-row">
                  <div className="key-badges">
                    <span className="key-cap">A</span>
                    <span className="key-cap">D</span>
                    <span className="key-cap">◀</span>
                    <span className="key-cap">▶</span>
                  </div>
                  <span className="key-desc">Steer Left & Right</span>
                </div>
                <div className="key-row">
                  <div className="key-badges">
                    <span className="key-cap wide-key">SPACE</span>
                  </div>
                  <span className="key-desc">Handbrake / Power Drift</span>
                </div>
                <div className="key-row">
                  <div className="key-badges">
                    <span className="key-cap wide-key">SHIFT</span>
                  </div>
                  <span className="key-desc">Nitro Boost Surge</span>
                </div>
                <div className="key-row">
                  <div className="key-badges">
                    <span className="key-cap">R</span>
                  </div>
                  <span className="key-desc">Reset Car onto Road</span>
                </div>
                <div className="key-row">
                  <div className="key-badges">
                    <span className="key-cap">C</span>
                  </div>
                  <span className="key-desc">Cycle 3 Camera Angles (Close, Far, Aerial)</span>
                </div>
                <div className="key-row">
                  <div className="key-badges">
                    <span className="key-cap">T</span>
                  </div>
                  <span className="key-desc">Cycle Time (Day, Sunset, Cyberpunk Night)</span>
                </div>
                <div className="key-row">
                  <div className="key-badges">
                    <span className="key-cap">L</span>
                  </div>
                  <span className="key-desc">Toggle High-Beam Headlights</span>
                </div>
                <div className="key-row">
                  <div className="key-badges">
                    <span className="key-cap">M</span>
                  </div>
                  <span className="key-desc">Mute / Unmute Procedural Sound</span>
                </div>
                <div className="key-row">
                  <div className="key-badges">
                    <span className="key-cap wide-key">MOUSE DRAG</span>
                  </div>
                  <span className="key-desc">360° Orbit Camera (Inspect Car from Any Angle)</span>
                </div>
                <div className="key-row">
                  <div className="key-badges">
                    <span className="key-cap wide-key">WHEEL / PINCH</span>
                  </div>
                  <span className="key-desc">Zoom In & Out Smoothly</span>
                </div>
                <div className="key-row">
                  <div className="key-badges">
                    <span className="key-cap wide-key">DRIVE (W / ▲)</span>
                  </div>
                  <span className="key-desc">Auto-Recenter Camera Smoothly Behind Car</span>
                </div>
                <div className="key-row">
                  <div className="key-badges">
                    <span className="key-cap wide-key">2x CLICK</span>
                  </div>
                  <span className="key-desc">Instant Camera Snap to Rear</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="primary-btn" onClick={() => setIsHelpOpen(false)}>
                GOT IT, LET'S RACE!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

