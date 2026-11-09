import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { Zap, Flame, Timer, Trophy } from 'lucide-react';

export function SpeedometerHUD() {
  const raceActive = useGameStore((s) => s.raceActive);
  const raceCountdown = useGameStore((s) => s.raceCountdown);
  const bestLapTime = useGameStore((s) => s.bestLapTime);
  const currentCheckpoint = useGameStore((s) => s.currentCheckpoint);
  const totalCheckpoints = useGameStore((s) => s.totalCheckpoints);
  const raceFinished = useGameStore((s) => s.raceFinished);

  const speedTextRef = useRef(null);
  const gearBadgeRef = useRef(null);
  const rpmValRef = useRef(null);
  const rpmTrackRef = useRef(null);
  const nitroFillRef = useRef(null);
  const speedVignetteRef = useRef(null);
  const lapTimeRef = useRef(null);
  const posValRef = useRef(null);
  const driftPopupRef = useRef(null);
  const driftScoreRef = useRef(null);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remSecs = (secs % 60).toFixed(2);
    return `${mins < 10 ? '0' : ''}${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`;
  };

  useEffect(() => {
    let animId;
    let prevSpeed = -1;
    let prevRpm = -1;
    let prevGear = '';
    let prevNitro = -1;
    let prevNitroActive = false;
    let prevDrifting = false;
    let prevDriftScore = -1;
    let prevLapFormatted = '';
    let prevRacePos = -1;

    const updateHUD = () => {
      const state = useGameStore.getState();
      const speed = state.speed;
      const rpm = state.rpm;
      const gear = state.gear;
      const nitro = state.nitro;
      const isNitroActive = state.isNitroActive;
      const isDrifting = state.isDrifting;
      const driftScore = state.driftScore;

      // 1. High-speed & Nitro Wind Vignette
      if (speedVignetteRef.current) {
        if (isNitroActive || speed > 130) {
          const intensity = isNitroActive ? 0.85 : Math.min(0.65, (speed - 130) / 100);
          speedVignetteRef.current.style.opacity = intensity;
          if (isNitroActive !== prevNitroActive) {
            speedVignetteRef.current.className = isNitroActive ? 'speed-vignette nitro-vignette' : 'speed-vignette';
          }
        } else if (prevSpeed > 130 || prevNitroActive) {
          speedVignetteRef.current.style.opacity = 0;
        }
      }

      // 2. Digital Speed Text
      if (speedTextRef.current && speed !== prevSpeed) {
        speedTextRef.current.textContent = speed;
      }

      // 3. Gear Badge
      if (gearBadgeRef.current && gear !== prevGear) {
        gearBadgeRef.current.textContent = gear;
        gearBadgeRef.current.className = gear === 'R' ? 'cyber-gear-val gear-rev' : 'cyber-gear-val';
      }

      // 4. Angular Segmented RPM Tachometer (10 LED Blocks)
      if (rpm !== prevRpm) {
        if (rpmValRef.current) {
          rpmValRef.current.textContent = rpm;
          rpmValRef.current.className = rpm > 7200 ? 'cyber-rpm-num redline-text' : 'cyber-rpm-num';
        }
        if (rpmTrackRef.current) {
          const rpmRatio = Math.max(0, Math.min(1, (rpm - 900) / 7100));
          const activeSegments = Math.round(rpmRatio * 10);
          const segments = rpmTrackRef.current.children;
          for (let i = 0; i < 10; i++) {
            if (i < activeSegments) {
              segments[i].classList.add('active');
            } else {
              segments[i].classList.remove('active');
            }
          }
          if (rpm > 7200) {
            rpmTrackRef.current.classList.add('redline-strobe');
          } else {
            rpmTrackRef.current.classList.remove('redline-strobe');
          }
        }
      }

      // 5. Angular Nitro Blade
      if (nitroFillRef.current && (nitro !== prevNitro || isNitroActive !== prevNitroActive)) {
        nitroFillRef.current.style.width = `${nitro}%`;
        nitroFillRef.current.className = isNitroActive ? 'cyber-nitro-fill nitro-burning' : 'cyber-nitro-fill';
      }

      // 6. Live Lap Time Display
      if (lapTimeRef.current && state.raceActive) {
        const formatted = formatTime(state.lapTime);
        if (formatted !== prevLapFormatted) {
          lapTimeRef.current.textContent = formatted;
          prevLapFormatted = formatted;
        }
      }

      // Live Race Position
      if (posValRef.current && state.raceActive) {
        if (state.racePosition !== prevRacePos) {
          posValRef.current.textContent = state.racePosition;
          prevRacePos = state.racePosition;
        }
      }

      // 7. Live Drift Score Popup
      if (driftPopupRef.current) {
        if (isDrifting) {
          if (!prevDrifting) {
            driftPopupRef.current.style.display = 'block';
          }
          if (driftScoreRef.current && driftScore !== prevDriftScore) {
            driftScoreRef.current.textContent = `+${driftScore}`;
          }
        } else if (prevDrifting) {
          driftPopupRef.current.style.display = 'none';
        }
      }

      prevSpeed = speed;
      prevRpm = rpm;
      prevGear = gear;
      prevNitro = nitro;
      prevNitroActive = isNitroActive;
      prevDrifting = isDrifting;
      prevDriftScore = driftScore;

      animId = requestAnimationFrame(updateHUD);
    };

    animId = requestAnimationFrame(updateHUD);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <>
      <div ref={speedVignetteRef} className="speed-vignette" />

      <div className="hud-container">
        {raceActive && (
          <div className="race-top-card">
            <div className="race-stat-col">
              <div className="race-stat-label">POSITION</div>
              <div className="race-stat-value">
                <span ref={posValRef} className="cp-cur">{useGameStore.getState().racePosition}</span> / 7
              </div>
            </div>
            <div className="race-stat-divider" />
            <div className="race-stat-col">
              <div className="race-stat-label">
                <Timer size={14} className="icon-pulse" /> LAP TIME
              </div>
              <div ref={lapTimeRef} className="race-stat-value timer-glow">
                {formatTime(useGameStore.getState().lapTime)}
              </div>
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

        {raceCountdown !== null && (
          <div className="race-countdown-overlay">
            <div key={raceCountdown} className={`countdown-num ${raceCountdown === 0 ? 'countdown-go' : ''}`}>
              {raceCountdown === 0 ? 'GO!' : raceCountdown}
            </div>
          </div>
        )}

        {raceFinished && (
          <div className="race-finish-banner">
            <div className="banner-badge">
              {useGameStore.getState().racePosition === 1 ? 'VICTORY' : `POSITION P${useGameStore.getState().racePosition}`}
            </div>
            <div className="banner-title">
              {useGameStore.getState().racePosition === 1 ? '1ST PLACE FINISH!' : `RACE COMPLETED!`}
            </div>
            <div className="banner-time">Final Time: {formatTime(useGameStore.getState().lapTime)}</div>
          </div>
        )}

        <div ref={driftPopupRef} className="drift-score-popup" style={{ display: 'none' }}>
          <div className="drift-title">
            <Flame size={20} className="flame-icon" /> DRIFT!
          </div>
          <div ref={driftScoreRef} className="drift-score">+0</div>
        </div>

        {/* ULTRA-COMPACT MINIMAL RACING HUD (Low Height, Top-Right, Zero Background) */}
        <div className="speedometer-cluster">
          {/* Top Micro Luminous Blade */}
          <div className="cyber-hud-topline" />

          {/* Main Row: Compact Gear & Speed */}
          <div className="cyber-hud-main">
            <div className="cyber-gear-box">
              <span className="cyber-gear-label">GEAR</span>
              <span ref={gearBadgeRef} className="cyber-gear-val">1</span>
            </div>

            <div className="cyber-speed-group">
              <span ref={speedTextRef} className="cyber-speed-digits">0</span>
              <span className="cyber-unit-kmh">KM/H</span>
            </div>
          </div>

          {/* Slim F1 Shift-Light Array with Inline Live RPM */}
          <div className="cyber-tach-bar-row">
            <div ref={rpmTrackRef} className="cyber-led-array">
              <div className="cyber-led seg-cyan" />
              <div className="cyber-led seg-cyan" />
              <div className="cyber-led seg-cyan" />
              <div className="cyber-led seg-cyan" />
              <div className="cyber-led seg-cyan" />
              <div className="cyber-led seg-amber" />
              <div className="cyber-led seg-amber" />
              <div className="cyber-led seg-amber" />
              <div className="cyber-led seg-red" />
              <div className="cyber-led seg-red" />
            </div>
            <span ref={rpmValRef} className="cyber-rpm-num">900</span>
          </div>

          {/* Micro Nitro Boost Rail */}
          <div className="cyber-nitro-row">
            <Zap size={9} className="cyber-zap" />
            <div className="cyber-nitro-track">
              <div ref={nitroFillRef} className="cyber-nitro-fill" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
