import React, { useCallback } from 'react';
import { inputState } from './Car';
import { soundManager } from '../utils/AudioSystem';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Zap, Disc } from 'lucide-react';

export function TouchControls() {
  const handleTouch = useCallback((key, active, e) => {
    if (e && e.cancelable) {
      e.preventDefault();
    }
    soundManager.init();
    if (key in inputState) {
      inputState[key] = active;
    }
  }, []);

  return (
    <div className="touch-controls-container">
      {/* Left side: Steering Controls */}
      <div className="touch-steering-group">
        <button
          type="button"
          className="touch-btn steer-btn"
          onPointerDown={(e) => handleTouch('left', true, e)}
          onPointerUp={(e) => handleTouch('left', false, e)}
          onPointerLeave={(e) => handleTouch('left', false, e)}
          onPointerCancel={(e) => handleTouch('left', false, e)}
          aria-label="Steer Left"
        >
          <ChevronLeft size={36} />
        </button>
        <button
          type="button"
          className="touch-btn steer-btn"
          onPointerDown={(e) => handleTouch('right', true, e)}
          onPointerUp={(e) => handleTouch('right', false, e)}
          onPointerLeave={(e) => handleTouch('right', false, e)}
          onPointerCancel={(e) => handleTouch('right', false, e)}
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
            type="button"
            className="touch-btn aux-btn handbrake-btn"
            onPointerDown={(e) => handleTouch('handbrake', true, e)}
            onPointerUp={(e) => handleTouch('handbrake', false, e)}
            onPointerLeave={(e) => handleTouch('handbrake', false, e)}
            onPointerCancel={(e) => handleTouch('handbrake', false, e)}
            aria-label="Handbrake"
          >
            <Disc size={22} />
            <span>DRIFT</span>
          </button>
          <button
            type="button"
            className="touch-btn aux-btn boost-btn"
            onPointerDown={(e) => handleTouch('nitro', true, e)}
            onPointerUp={(e) => handleTouch('nitro', false, e)}
            onPointerLeave={(e) => handleTouch('nitro', false, e)}
            onPointerCancel={(e) => handleTouch('nitro', false, e)}
            aria-label="Nitro Boost"
          >
            <Zap size={22} />
            <span>NITRO</span>
          </button>
        </div>

        {/* Accelerate & Brake Pedals */}
        <div className="touch-drive-row">
          <button
            type="button"
            className="touch-btn pedal-btn brake-pedal"
            onPointerDown={(e) => handleTouch('backward', true, e)}
            onPointerUp={(e) => handleTouch('backward', false, e)}
            onPointerLeave={(e) => handleTouch('backward', false, e)}
            onPointerCancel={(e) => handleTouch('backward', false, e)}
            aria-label="Brake or Reverse"
          >
            <ArrowDown size={32} />
            <span>BRAKE</span>
          </button>
          <button
            type="button"
            className="touch-btn pedal-btn gas-pedal"
            onPointerDown={(e) => handleTouch('forward', true, e)}
            onPointerUp={(e) => handleTouch('forward', false, e)}
            onPointerLeave={(e) => handleTouch('forward', false, e)}
            onPointerCancel={(e) => handleTouch('forward', false, e)}
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
