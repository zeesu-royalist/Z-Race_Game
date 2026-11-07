import React from 'react';
import { inputState } from './Car';
import { soundManager } from '../utils/AudioSystem';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Zap, Disc } from 'lucide-react';

export function TouchControls() {
  const handleTouch = (key, active) => {
    soundManager.init();
    if (key in inputState) {
      inputState[key] = active;
    }
  };

  return (
    <div className="touch-controls-container">
      {/* Left side: Steering Controls */}
      <div className="touch-steering-group">
        <button
          className="touch-btn steer-btn"
          onPointerDown={() => handleTouch('left', true)}
          onPointerUp={() => handleTouch('left', false)}
          onPointerLeave={() => handleTouch('left', false)}
          aria-label="Steer Left"
        >
          <ChevronLeft size={36} />
        </button>
        <button
          className="touch-btn steer-btn"
          onPointerDown={() => handleTouch('right', true)}
          onPointerUp={() => handleTouch('right', false)}
          onPointerLeave={() => handleTouch('right', false)}
          aria-label="Steer Right"
        >
          <ChevronRight size={36} />
        </button>
      </div>

      {/* Right side: Pedals, Handbrake, Boost */}
      <div className="touch-pedals-group">
        {/* Handbrake & Boost */}
        <div className="touch-aux-row">
          <button
            className="touch-btn aux-btn handbrake-btn"
            onPointerDown={() => handleTouch('handbrake', true)}
            onPointerUp={() => handleTouch('handbrake', false)}
            onPointerLeave={() => handleTouch('handbrake', false)}
            aria-label="Handbrake"
          >
            <Disc size={22} />
            <span>DRIFT</span>
          </button>
          <button
            className="touch-btn aux-btn boost-btn"
            onPointerDown={() => handleTouch('nitro', true)}
            onPointerUp={() => handleTouch('nitro', false)}
            onPointerLeave={() => handleTouch('nitro', false)}
            aria-label="Nitro Boost"
          >
            <Zap size={22} />
            <span>NITRO</span>
          </button>
        </div>

        {/* Accelerate & Brake Pedals */}
        <div className="touch-drive-row">
          <button
            className="touch-btn pedal-btn brake-pedal"
            onPointerDown={() => handleTouch('backward', true)}
            onPointerUp={() => handleTouch('backward', false)}
            onPointerLeave={() => handleTouch('backward', false)}
            aria-label="Brake or Reverse"
          >
            <ArrowDown size={32} />
            <span>BRAKE</span>
          </button>
          <button
            className="touch-btn pedal-btn gas-pedal"
            onPointerDown={() => handleTouch('forward', true)}
            onPointerUp={() => handleTouch('forward', false)}
            onPointerLeave={() => handleTouch('forward', false)}
            aria-label="Accelerate"
          >
            <ArrowUp size={36} />
            <span>GAS</span>
          </button>
        </div>
      </div>
    </div>
  );
}

