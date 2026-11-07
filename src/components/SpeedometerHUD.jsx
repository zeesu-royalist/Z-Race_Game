import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { Zap, Flame, Timer, Trophy } from 'lucide-react';

export function SpeedometerHUD() {
  // Event-driven state only (triggers React re-render only when race state changes)
  const raceActive = useGameStore((s) => s.raceActive);
  const lapTime = useGameStore((s) => s.lapTime);
  const bestLapTime = useGameStore((s) => s.bestLapTime);
  const currentCheckpoint = useGameStore((s) => s.currentCheckpoint);
  const totalCheckpoints = useGameStore((s) => s.totalCheckpoints);
  const raceFinished = useGameStore((s) => s.raceFinished);
  const isDrifting = useGameStore((s) => s.isDrifting);
  const driftScore = useGameStore((s) => s.driftScore);

  // Direct DOM refs for 60/120 FPS high-performance updates (ZERO React re-renders)
  const needleRef = useRef(null);
  const speedArcRef = useRef(null);
  const speedTextRef = useRef(null);
  const gearBadgeRef = useRef(null);
  const rpmValRef = useRef(null);
  const rpmBarRef = useRef(null);
  const nitroBarRef = useRef(null);

  useEffect(() => {
    let animId;
    const maxDialSpeed = 260;
    const maxDashOffset = 390;

    const updateHUD = () => {
      const state = useGameStore.getState();
      const speed = state.speed;
      const rpm = state.rpm;
      const gear = state.gear;
      const nitro = state.nitro;
      const isNitroActive = state.isNitroActive;

      // 1. Digital Speed Text
      if (speedTextRef.current) {
        speedTextRef.current.textContent = speed;
      }

      // 2. Needle Angle (-130deg to +130deg)
      if (needleRef.current) {
        const clampedSpeed = Math.min(maxDialSpeed, Math.max(0, speed));
        const needleAngle = -130 + (clampedSpeed / maxDialSpeed) * 260;
        needleRef.current.style.transform = `rotate(${needleAngle}deg)`;
      }

      // 3. Speed SVG Arc
      if (speedArcRef.current) {
        const clampedSpeed = Math.min(maxDialSpeed, Math.max(0, speed));
        const dashOffset = maxDashOffset - (clampedSpeed / maxDialSpeed) * 260;
        speedArcRef.current.style.strokeDashoffset = dashOffset;
      }

      // 4. Gear Badge
      if (gearBadgeRef.current) {
        gearBadgeRef.current.textContent = gear;
        if (gear === 'R') {
          gearBadgeRef.current.className = 'gear-badge gear-reverse';
        } else {
          gearBadgeRef.current.className = 'gear-badge';
        }
      }

      // 5. RPM Display & Bar
      if (rpmValRef.current) {
        rpmValRef.current.textContent = rpm;
        rpmValRef.current.className = rpm > 7200 ? 'redline-text' : '';
      }
      if (rpmBarRef.current) {
        const rpmRatio = Math.max(0, Math.min(1, (rpm - 900) / 7100));
        rpmBarRef.current.style.width = `${rpmRatio * 100}%`;
        rpmBarRef.current.className = rpm > 7200 ? 'rpm-fill redline-fill' : 'rpm-fill';
      }

      // 6. Nitro Bar
      if (nitroBarRef.current) {
        nitroBarRef.current.style.width = `${nitro}%`;
        nitroBarRef.current.className = isNitroActive ? 'nitro-fill nitro-burning' : 'nitro-fill';
      }

      animId = requestAnimationFrame(updateHUD);
    };

    animId = requestAnimationFrame(updateHUD);
    return () => cancelAnimationFrame(animId);
  }, []);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remSecs = (secs % 60).toFixed(2);
    return `${mins < 10 ? '0' : ''}${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`;
  };

  return (
    <div className="hud-container">
      {/* Top Bar: Race stats (updates on lap/checkpoint change) */}
      {raceActive && (
        <div className="race-top-card">
          <div className="race-stat-col">
            <div className="race-stat-label">
              <Timer size={14} className="icon-pulse" /> LAP TIME
            </div>
            <div className="race-stat-value timer-glow">{formatTime(lapTime)}</div>
          </div>
          <div className="race-stat-divider" />
          <div className="race-stat-col">
            <div className="race-stat-label">CHECKPOINT</div>
            <div className="race-stat-value">
              <span className="cp-cur">{currentCheckpoint}</span> / {totalCheckpoints}
            </div>
          </div>
          {bestLapTime !== null && (
            <>
              <div className="race-stat-divider" />
              <div className="race-stat-col">
                <div className="race-stat-label">
                  <Trophy size={14} color="#ffd700" /> BEST LAP
                </div>
                <div className="race-stat-value best-glow">{formatTime(bestLapTime)}</div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Race Finished Banner */}
      {raceFinished && (
        <div className="race-finish-banner">
          <div className="banner-badge">VICTORY</div>
          <div className="banner-title">CIRCUIT COMPLETED!</div>
          <div className="banner-time">Final Time: {formatTime(lapTime)}</div>
        </div>
      )}

      {/* Drift Score Popup */}
      {isDrifting && (
        <div className="drift-score-popup">
          <div className="drift-title">
            <Flame size={20} className="flame-icon" /> DRIFT!
          </div>
          <div className="drift-score">+{driftScore}</div>
        </div>
      )}

      {/* Bottom Right: High-Performance Speedometer Cluster */}
      <div className="speedometer-cluster">
        {/* Analog Gauge */}
        <div className="gauge-dial">
          <svg className="dial-svg" viewBox="0 0 200 200">
            {/* Background Arc */}
            <circle
              cx="100"
              cy="100"
              r="85"
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="8"
              strokeDasharray="390"
              strokeDashoffset="130"
              transform="rotate(135 100 100)"
            />
            {/* Speed Value Arc */}
            <circle
              ref={speedArcRef}
              cx="100"
              cy="100"
              r="85"
              fill="none"
              stroke="url(#speedGradient)"
              strokeWidth="9"
              strokeDasharray="390"
              strokeDashoffset="390"
              transform="rotate(135 100 100)"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="speedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00d2ff" />
                <stop offset="60%" stopColor="#00f0ff" />
                <stop offset="90%" stopColor="#ff0055" />
              </linearGradient>
            </defs>
          </svg>

          {/* Needle Indicator */}
          <div ref={needleRef} className="gauge-needle" />

          {/* Center Digital Display */}
          <div className="gauge-center">
            <div ref={speedTextRef} className="digital-speed">0</div>
            <div className="speed-unit">KM/H</div>
            <div ref={gearBadgeRef} className="gear-badge">1</div>
          </div>
        </div>

        {/* RPM Bar */}
        <div className="rpm-bar-container">
          <div className="rpm-labels">
            <span>RPM</span>
            <span ref={rpmValRef}>900</span>
          </div>
          <div className="rpm-track">
            <div ref={rpmBarRef} className="rpm-fill" style={{ width: '0%' }} />
          </div>
        </div>

        {/* Nitro Fuel Bar */}
        <div className="nitro-container">
          <div className="nitro-label">
            <Zap size={13} />
            <span>NITRO</span>
          </div>
          <div className="nitro-track">
            <div ref={nitroBarRef} className="nitro-fill" style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
