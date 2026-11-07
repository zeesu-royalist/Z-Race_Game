import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { CIRCUIT_CHECKPOINTS } from './RacingSystem';
import { Compass } from 'lucide-react';

// City Map racing circuit extents:
const MAP_BOUNDS = {
  minX: -80,
  maxX: 40,
  minZ: -45,
  maxZ: 175,
  spanX: 120,
  spanZ: 220
};

export function MiniMap() {
  const canvasRef = useRef(null);

  useEffect(() => {
    let animId;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });

    const width = canvas.width;
    const height = canvas.height;
    const drawWidth = width - 24;
    const drawHeight = height - 24;

    const toRadarX = (wx) => ((wx - MAP_BOUNDS.minX) / MAP_BOUNDS.spanX) * drawWidth + 12;
    const toRadarY = (wz) => ((wz - MAP_BOUNDS.minZ) / MAP_BOUNDS.spanZ) * drawHeight + 12;

    const renderRadar = () => {
      const { carPosition, carRotation, currentCheckpoint, raceActive } = useGameStore.getState();

      ctx.clearRect(0, 0, width, height);

      // Background plate
      ctx.fillStyle = 'rgba(10, 16, 26, 0.88)';
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, 16);
      ctx.fill();

      // Border glow
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 30; i < width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      for (let j = 30; j < height; j += 30) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(width, j);
        ctx.stroke();
      }

      // Main Grand Boulevard (Z: -35 to 160 at X: -3.0)
      const bX1 = toRadarX(-3.0);
      const bY1 = toRadarY(-35);
      const bX2 = toRadarX(-3.0);
      const bY2 = toRadarY(160);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(bX1, bY1);
      ctx.lineTo(bX2, bY2);
      ctx.stroke();

      // Circuit Track Connecting Lines
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.lineWidth = 2.5;
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
      if (raceActive) {
        CIRCUIT_CHECKPOINTS.forEach((cp, idx) => {
          const ptX = toRadarX(cp.pos[0]);
          const ptY = toRadarY(cp.pos[2]);
          const isTarget = idx === currentCheckpoint;

          ctx.beginPath();
          ctx.arc(ptX, ptY, isTarget ? 5 : 3, 0, Math.PI * 2);
          ctx.fillStyle = isTarget ? '#00f0ff' : 'rgba(0, 200, 255, 0.4)';
          ctx.fill();

          if (isTarget) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        });
      }

      // Player Arrow Marker
      const carX = toRadarX(carPosition[0]);
      const carY = toRadarY(carPosition[2]);

      ctx.save();
      ctx.translate(carX, carY);
      ctx.rotate(carRotation);

      ctx.fillStyle = '#ff2244';
      ctx.shadowColor = '#ff2244';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, 7);
      ctx.lineTo(-4, -6);
      ctx.lineTo(0, -3);
      ctx.lineTo(4, -6);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
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
        <Compass size={14} className="radar-icon" />
        <span>CITY RADAR</span>
        <span className="north-tag">N</span>
      </div>
      <canvas
        ref={canvasRef}
        width={180}
        height={180}
        className="minimap-canvas"
      />
    </div>
  );
}
