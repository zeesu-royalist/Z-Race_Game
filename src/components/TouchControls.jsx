import React, { useCallback } from 'react';
import { inputState } from './Car';
import { soundManager } from '../utils/AudioSystem';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Zap, Disc } from 'lucide-react';

export function TouchControls() {
  const handleTouch = useCallback((key, active, e) => {
    if (e && e.cancelable) e.preventDefault();
    soundManager.init();
    soundManager.resume();
    if (key in inputState) inputState[key] = active;
  }, []);

  const touchProps = (key) => ({
    onPointerDown: (e) => handleTouch(key, true, e),
    onPointerUp: (e) => handleTouch(key, false, e),
    onPointerLeave: (e) => handleTouch(key, false, e),
    onPointerCancel: (e) => handleTouch(key, false, e)
  });

  return (
    <div className="touch-controls-container">
      {/* Left side: Steering Controls */}
      <div className="touch-steering-group">
        <button type="button" className="touch-btn steer-btn" {...touchProps('left')} aria-label="Steer Left">
          <ChevronLeft size={36} />
        </button>
        <button type="button" className="touch-btn steer-btn" {...touchProps('right')} aria-label="Steer Right">
          <ChevronRight size={36} />
        </button>
      </div>

      {/* Right side: Pedals, Handbrake, Boost */}
      <div className="touch-pedals-group">
        <div className="touch-aux-row">
          <button type="button" className="touch-btn aux-btn handbrake-btn" {...touchProps('handbrake')} aria-label="Handbrake">
            <Disc size={22} />
            <span>DRIFT</span>
          </button>
          <button type="button" className="touch-btn aux-btn boost-btn" {...touchProps('nitro')} aria-label="Nitro Boost">
            <Zap size={22} />
            <span>NITRO</span>
          </button>
        </div>

        <div className="touch-drive-row">
          <button type="button" className="touch-btn pedal-btn brake-pedal" {...touchProps('backward')} aria-label="Brake or Reverse">
            <ArrowDown size={32} />
            <span>BRAKE</span>
          </button>
          <button type="button" className="touch-btn pedal-btn gas-pedal" {...touchProps('forward')} aria-label="Accelerate">
            <ArrowUp size={36} />
            <span>GAS</span>
          </button>
        </div>
      </div>
    </div>
  );
}
