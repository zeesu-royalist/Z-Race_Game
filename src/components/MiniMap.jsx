import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { CIRCUIT_CHECKPOINTS } from './RacingSystem';
import { rivalRadarPositions } from './RivalCars';
import { Compass } from 'lucide-react';

const MAP_BOUNDS = { minX: -560, minZ: -680, spanX: 850, spanZ: 880 };

const CITY_ROADS = [
  [[-3, -80], [-3, 75], [-5, 85], [-14.5, 105], [-35, 120], [-135, 122], [-220, 40], [-222, 20]],
  [[-222, 40], [-222, -165]],
  [[-222, -165], [-240, -195], [-278, -210.5], [-380, -211.2]],
  [[-380, -211.2], [-452, -242], [-479.2, -310], [-479.2, -385]],
  [
    [-479.2, -385], [-471, -412], [-442, -428.5], [-377, -441.5], [-369.7, -488],
    [-360.5, -520], [-325, -535], [-265.3, -550], [-259.5, -568], [-248, -583],
    [-144, -580], [-136.3, -500], [-134, -435], [-60, -425.6], [-22, -435],
    [-12, -535], [5, -580], [26, -604], [100, -620.8], [182, -604]
  ],
  [[-150, -40], [-3, -40]],
  [[-250, -80], [220, -80]],
  [[180, -120], [180, 60]],
  [[250, -80], [250, 0], [180, 0]]
];

function getDistrictName(x, z) {
  if (z < -450) return 'NORTH METRO';
  if (x < -270) return 'WEST DISTRICT';
  if (x > 80) return 'EAST METRO';
  if (z > 40) return 'GRAND BOULEVARD';
  return 'DOWNTOWN';
}

export function MiniMap() {
  const canvasRef = useRef(null);
  const districtRef = useRef(null);
  const coordsRef = useRef(null);

  useEffect(() => {
    let animId;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });

    const width = canvas.width;
    const height = canvas.height;
    const drawWidth = width - 16;
    const drawHeight = height - 16;

    const toRadarX = (wx) => ((wx - MAP_BOUNDS.minX) / MAP_BOUNDS.spanX) * drawWidth + 8;
    const toRadarY = (wz) => ((wz - MAP_BOUNDS.minZ) / MAP_BOUNDS.spanZ) * drawHeight + 8;

    // Pre-render static background onto offscreen canvas
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = width;
    bgCanvas.height = height;
    const bgCtx = bgCanvas.getContext('2d', { alpha: true });

    bgCtx.fillStyle = 'rgba(8, 13, 22, 0.92)';
    bgCtx.beginPath();
    bgCtx.roundRect(0, 0, width, height, 14);
    bgCtx.fill();

    bgCtx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    bgCtx.lineWidth = 1.2;
    bgCtx.stroke();

    bgCtx.strokeStyle = 'rgba(0, 240, 255, 0.06)';
    bgCtx.lineWidth = 1;
    bgCtx.beginPath();
    for (let i = 25; i < width; i += 25) {
      bgCtx.moveTo(i, 0);
      bgCtx.lineTo(i, height);
    }
    for (let j = 25; j < height; j += 25) {
      bgCtx.moveTo(0, j);
      bgCtx.lineTo(width, j);
    }
    bgCtx.stroke();

    bgCtx.font = '600 7px "Orbitron", sans-serif';
    bgCtx.fillStyle = 'rgba(0, 240, 255, 0.2)';
    bgCtx.fillText('NORTH METRO', toRadarX(-160), toRadarY(-590));
    bgCtx.fillText('WEST DIST', toRadarX(-430), toRadarY(-360));
    bgCtx.fillText('DOWNTOWN', toRadarX(-120), toRadarY(-140));
    bgCtx.fillText('GRAND BLVD', toRadarX(20), toRadarY(70));
    bgCtx.fillText('EAST METRO', toRadarX(140), toRadarY(-40));

    bgCtx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    bgCtx.lineWidth = 2.0;
    bgCtx.lineCap = 'round';
    bgCtx.lineJoin = 'round';

    for (let r = 0; r < CITY_ROADS.length; r++) {
      const road = CITY_ROADS[r];
      bgCtx.beginPath();
      for (let idx = 0; idx < road.length; idx++) {
        const rx = toRadarX(road[idx][0]);
        const ry = toRadarY(road[idx][1]);
        if (idx === 0) bgCtx.moveTo(rx, ry);
        else bgCtx.lineTo(rx, ry);
      }
      bgCtx.stroke();
    }

    bgCtx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
    bgCtx.lineWidth = 3.5;
    bgCtx.beginPath();
    bgCtx.moveTo(toRadarX(-3.0), toRadarY(-80));
    bgCtx.lineTo(toRadarX(-3.0), toRadarY(160));
    bgCtx.stroke();

    let prevDistrict = '';
    let prevCoordsText = '';

    const renderRadar = () => {
      const state = useGameStore.getState();
      const carPos = state.carPosition;
      const carRot = state.carRotation;
      const raceActive = state.raceActive;
      const currentCheckpoint = state.currentCheckpoint;
      const cx = carPos[0];
      const cz = carPos[2];

      const dName = getDistrictName(cx, cz);
      if (districtRef.current && dName !== prevDistrict) {
        districtRef.current.textContent = dName;
        prevDistrict = dName;
      }
      const coordsText = `X:${Math.round(cx)} Z:${Math.round(cz)}`;
      if (coordsRef.current && coordsText !== prevCoordsText) {
        coordsRef.current.textContent = coordsText;
        prevCoordsText = coordsText;
      }

      ctx.drawImage(bgCanvas, 0, 0);

      if (raceActive) {
        ctx.strokeStyle = 'rgba(255, 170, 0, 0.55)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        for (let idx = 0; idx < CIRCUIT_CHECKPOINTS.length; idx++) {
          const cp = CIRCUIT_CHECKPOINTS[idx];
          const px = toRadarX(cp.pos[0]);
          const py = toRadarY(cp.pos[2]);
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        for (let idx = 0; idx < CIRCUIT_CHECKPOINTS.length; idx++) {
          const cp = CIRCUIT_CHECKPOINTS[idx];
          const isTarget = idx === currentCheckpoint;
          ctx.beginPath();
          ctx.arc(toRadarX(cp.pos[0]), toRadarY(cp.pos[2]), isTarget ? 4.5 : 2.5, 0, Math.PI * 2);
          ctx.fillStyle = isTarget ? '#00f0ff' : 'rgba(255, 170, 0, 0.6)';
          ctx.fill();
          if (isTarget) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }

        for (let idx = 0; idx < rivalRadarPositions.length; idx++) {
          const rival = rivalRadarPositions[idx];
          ctx.save();
          ctx.translate(toRadarX(rival.x), toRadarY(rival.z));
          ctx.rotate(rival.rotY);
          ctx.fillStyle = rival.color;
          ctx.beginPath();
          ctx.moveTo(0, 5.0);
          ctx.lineTo(-3, -4.0);
          ctx.lineTo(0, -2.0);
          ctx.lineTo(3, -4.0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      const carX = toRadarX(cx);
      const carY = toRadarY(cz);

      ctx.beginPath();
      ctx.arc(carX, carY, 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 34, 68, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.save();
      ctx.translate(carX, carY);
      ctx.rotate(carRot);

      ctx.fillStyle = 'rgba(255, 34, 68, 0.22)';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff2244';
      ctx.beginPath();
      ctx.moveTo(0, 6.5);
      ctx.lineTo(-4, -5.5);
      ctx.lineTo(0, -2.5);
      ctx.lineTo(4, -5.5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(0, 0, 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      animId = requestAnimationFrame(renderRadar);
    };

    animId = requestAnimationFrame(renderRadar);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="minimap-container">
      <div className="minimap-header">
        <Compass size={13} className="radar-icon" />
        <span ref={districtRef} className="district-tag">
          OPEN CITY
        </span>
        <span className="unlocked-pill">UNLOCKED</span>
        <span className="north-tag">N</span>
      </div>
      <canvas
        ref={canvasRef}
        width={180}
        height={180}
        className="minimap-canvas"
      />
      <div className="minimap-footer">
        <span ref={coordsRef} className="coords-tag">
          X:-3 Z:10
        </span>
        <span className="roam-tag">FREE ROAM</span>
      </div>
    </div>
  );
}
