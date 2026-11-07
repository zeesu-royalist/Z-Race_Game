import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { CIRCUIT_CHECKPOINTS } from './RacingSystem';
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
  // 1. South Grand Boulevard
  [[-3, -80], [-3, 160]],
  // 2. South Hairpin / Loop
  [[-3, 160], [-25, 135], [-25, -20], [-3, 0]],
  // 3. Central Expressway (North-South backbone)
  [[-150, -620], [-150, 0]],
  // 4. Central Connector to Grand Blvd
  [[-150, -40], [-3, -40]],
  // 5. Mid-City Highway Connector
  [[-450, -200], [150, -200]],
  // 6. West District Boulevard
  [[-350, -600], [-350, -150]],
  // 7. Far West Coastal Avenue
  [[-450, -550], [-450, -250]],
  // 8. North Metropolis Beltway
  [[-450, -550], [180, -550]],
  // 9. North High Loop
  [[-300, -620], [150, -620]],
  // 10. Downtown Crossway
  [[-250, -80], [220, -80]],
  // 11. East Metro Boulevard
  [[180, -120], [180, 60]],
  // 12. Far East District Loop
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

    const renderRadar = () => {
      const { carPosition, carRotation, currentCheckpoint, raceActive } = useGameStore.getState();

      const cx = carPosition[0];
      const cz = carPosition[2];

      // Update District & Coords HUD badge without React state re-renders
      if (districtRef.current) {
        districtRef.current.textContent = getDistrictName(cx, cz);
      }
      if (coordsRef.current) {
        coordsRef.current.textContent = `X:${Math.round(cx)} Z:${Math.round(cz)}`;
      }

      ctx.clearRect(0, 0, width, height);

      // Radar Background Glass Plate
      ctx.fillStyle = 'rgba(8, 13, 22, 0.92)';
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, 14);
      ctx.fill();

      // Border glow
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // GPS Sector Grid
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.06)';
      ctx.lineWidth = 1;
      for (let i = 25; i < width; i += 25) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      for (let j = 25; j < height; j += 25) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(width, j);
        ctx.stroke();
      }

      // District Watermark Labels
      ctx.font = '600 7px "Orbitron", sans-serif';
      ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.fillText('NORTH METRO', toRadarX(-160), toRadarY(-590));
      ctx.fillText('WEST DIST', toRadarX(-430), toRadarY(-360));
      ctx.fillText('DOWNTOWN', toRadarX(-120), toRadarY(-140));
      ctx.fillText('GRAND BLVD', toRadarX(20), toRadarY(70));
      ctx.fillText('EAST METRO', toRadarX(140), toRadarY(-40));

      // Draw Unlocked City Arterial Road Network
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 2.0;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      CITY_ROADS.forEach((road) => {
        ctx.beginPath();
        road.forEach((pt, idx) => {
          const rx = toRadarX(pt[0]);
          const ry = toRadarY(pt[1]);
          if (idx === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        });
        ctx.stroke();
      });

      // Highlight Main Grand Boulevard (Spawn Highway)
      const gbX1 = toRadarX(-3.0);
      const gbY1 = toRadarY(-80);
      const gbX2 = toRadarX(-3.0);
      const gbY2 = toRadarY(160);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(gbX1, gbY1);
      ctx.lineTo(gbX2, gbY2);
      ctx.stroke();

      // Circuit Track Connecting Lines (when race active or overview)
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
        ctx.closePath();
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

      // Player Arrow Marker (Position & Real-time Orientation)
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
      ctx.rotate(carRotation);

      ctx.fillStyle = '#ff2244';
      ctx.shadowColor = '#ff2244';
      ctx.shadowBlur = 8;
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
