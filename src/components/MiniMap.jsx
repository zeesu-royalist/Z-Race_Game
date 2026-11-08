import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { CIRCUIT_CHECKPOINTS } from './RacingSystem';
import { rivalRadarPositions } from './RivalCars';
import { Compass } from 'lucide-react';

// City Map Full Open-World Bounds (covering all 815m x 849m of terrain_retextured.glb + safety buffers)
const MAP_BOUNDS = {
  minX: -560,
  maxX: 290,
  minZ: -680,
  maxZ: 200,
  spanX: 850,
  spanZ: 880
};

// Open-world arterial road network coordinates
const CITY_ROADS = [
  // 1. South Grand Boulevard & Racing Tunnel Circuit
  [[-3, -80], [-3, 75], [-5, 85], [-14.5, 105], [-35, 120], [-135, 122], [-220, 40], [-222, 20]],
  // 2. Central Expressway (Turbo Alley North-South backbone)
  [[-222, 40], [-222, -165]],
  // 3. Mid-City Highway Connector
  [[-222, -165], [-240, -195], [-278, -210.5], [-380, -211.2]],
  // 4. Far West Coastal Avenue under Subway Bridge
  [[-380, -211.2], [-452, -242], [-479.2, -310], [-479.2, -385]],
  // 5. North Metropolis Sweeper & Grand Finish Boulevard
  [[-479.2, -385], [-471, -412], [-442, -428.5], [-377, -441.5], [-369.7, -488]],
  // 6. Central Connector to Grand Blvd
  [[-150, -40], [-3, -40]],
  // 7. Downtown Crossway
  [[-250, -80], [220, -80]],
  // 8. East Metro Boulevard
  [[180, -120], [180, 60]],
  // 9. Far East District Loop
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

    // --- PRE-RENDER STATIC RADAR BASE ONCE INTO CACHED OFFSCREEN CANVAS ---
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = width;
    bgCanvas.height = height;
    const bgCtx = bgCanvas.getContext('2d', { alpha: true });

    // Radar Background Glass Plate
    bgCtx.fillStyle = 'rgba(8, 13, 22, 0.92)';
    bgCtx.beginPath();
    bgCtx.roundRect(0, 0, width, height, 14);
    bgCtx.fill();

    // Border glow
    bgCtx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    bgCtx.lineWidth = 1.2;
    bgCtx.stroke();

    // GPS Sector Grid
    bgCtx.strokeStyle = 'rgba(0, 240, 255, 0.06)';
    bgCtx.lineWidth = 1;
    for (let i = 25; i < width; i += 25) {
      bgCtx.beginPath();
      bgCtx.moveTo(i, 0);
      bgCtx.lineTo(i, height);
      bgCtx.stroke();
    }
    for (let j = 25; j < height; j += 25) {
      bgCtx.beginPath();
      bgCtx.moveTo(0, j);
      bgCtx.lineTo(width, j);
      bgCtx.stroke();
    }

    // District Watermark Labels
    bgCtx.font = '600 7px "Orbitron", sans-serif';
    bgCtx.fillStyle = 'rgba(0, 240, 255, 0.2)';
    bgCtx.fillText('NORTH METRO', toRadarX(-160), toRadarY(-590));
    bgCtx.fillText('WEST DIST', toRadarX(-430), toRadarY(-360));
    bgCtx.fillText('DOWNTOWN', toRadarX(-120), toRadarY(-140));
    bgCtx.fillText('GRAND BLVD', toRadarX(20), toRadarY(70));
    bgCtx.fillText('EAST METRO', toRadarX(140), toRadarY(-40));

    // Draw Unlocked City Arterial Road Network
    bgCtx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    bgCtx.lineWidth = 2.0;
    bgCtx.lineCap = 'round';
    bgCtx.lineJoin = 'round';

    CITY_ROADS.forEach((road) => {
      bgCtx.beginPath();
      road.forEach((pt, idx) => {
        const rx = toRadarX(pt[0]);
        const ry = toRadarY(pt[1]);
        if (idx === 0) bgCtx.moveTo(rx, ry);
        else bgCtx.lineTo(rx, ry);
      });
      bgCtx.stroke();
    });

    // Highlight Main Grand Boulevard (Spawn Highway)
    const gbX1 = toRadarX(-3.0);
    const gbY1 = toRadarY(-80);
    const gbX2 = toRadarX(-3.0);
    const gbY2 = toRadarY(160);
    bgCtx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
    bgCtx.lineWidth = 3.5;
    bgCtx.beginPath();
    bgCtx.moveTo(gbX1, gbY1);
    bgCtx.lineTo(gbX2, gbY2);
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

      // Update District & Coords HUD badge without layout thrashing
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

      // 1. Blit cached background in 1 ultra-fast drawImage call (0% redraw cost!)
      ctx.drawImage(bgCanvas, 0, 0);

      // 2. Circuit Track Connecting Lines (when race active)
      if (raceActive) {
        ctx.strokeStyle = 'rgba(255, 170, 0, 0.55)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        CIRCUIT_CHECKPOINTS.forEach((cp, idx) => {
          const px = toRadarX(cp.pos[0]);
          const py = toRadarY(cp.pos[2]);
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();

        // Checkpoints
        CIRCUIT_CHECKPOINTS.forEach((cp, idx) => {
          const ptX = toRadarX(cp.pos[0]);
          const ptY = toRadarY(cp.pos[2]);
          const isTarget = idx === currentCheckpoint;

          ctx.beginPath();
          ctx.arc(ptX, ptY, isTarget ? 4.5 : 2.5, 0, Math.PI * 2);
          ctx.fillStyle = isTarget ? '#00f0ff' : 'rgba(255, 170, 0, 0.6)';
          ctx.fill();

          if (isTarget) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        });
      }

      // 3. Rival Competitor Cars on Radar (Rendered in matching livery colors)
      if (raceActive) {
        rivalRadarPositions.forEach((rival) => {
          const rx = toRadarX(rival.x);
          const ry = toRadarY(rival.z);

          ctx.save();
          ctx.translate(rx, ry);
          ctx.rotate(rival.rotY);

          // Sleek rival chevron
          ctx.fillStyle = rival.color;
          ctx.beginPath();
          ctx.moveTo(0, 5.0);
          ctx.lineTo(-3, -4.0);
          ctx.lineTo(0, -2.0);
          ctx.lineTo(3, -4.0);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        });
      }

      // 4. Player Arrow Marker (Position & Real-time Orientation)
      const carX = toRadarX(cx);
      const carY = toRadarY(cz);

      // Radar Pulse Ring around Player
      ctx.beginPath();
      ctx.arc(carX, carY, 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 34, 68, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.save();
      ctx.translate(carX, carY);
      ctx.rotate(carRot);

      // Soft glow aura without expensive software Gaussian shadowBlur
      ctx.fillStyle = 'rgba(255, 34, 68, 0.22)';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();

      // Sharp racing chevron
      ctx.fillStyle = '#ff2244';
      ctx.beginPath();
      ctx.moveTo(0, 6.5);
      ctx.lineTo(-4, -5.5);
      ctx.lineTo(0, -2.5);
      ctx.lineTo(4, -5.5);
      ctx.closePath();
      ctx.fill();

      // Front directional beacon
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
