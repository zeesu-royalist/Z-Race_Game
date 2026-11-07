import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { useGameStore } from '../store/gameStore';
import { soundManager } from '../utils/AudioSystem';

// Checkpoints defining the Grand Prix circuit on real verified road surfaces
export const CIRCUIT_CHECKPOINTS = [
  { id: 0, pos: [-3.0, 1.2, 10.0], name: 'Start / Finish' },
  { id: 1, pos: [-3.0, 1.2, 60.0], name: 'Boulevard Sprint' },
  { id: 2, pos: [-5.0, 1.2, 95.0], name: 'North Junction' },
  { id: 3, pos: [-25.0, 1.2, 135.0], name: 'North Hairpin' },
  { id: 4, pos: [-5.0, 1.2, 150.0], name: 'North Loop Apex' },
  { id: 5, pos: [8.0, 1.2, 110.0], name: 'East Return Straight' },
  { id: 6, pos: [-3.0, 1.2, 0.0], name: 'South Boulevard Run' },
  { id: 7, pos: [-25.0, 1.2, -18.0], name: 'South Hairpin Apex' }
];

export function RacingSystem() {
  const raceActive = useGameStore((s) => s.raceActive);
  const currentCheckpoint = useGameStore((s) => s.currentCheckpoint);
  const reachCheckpoint = useGameStore((s) => s.reachCheckpoint);
  const updateLapTime = useGameStore((s) => s.updateLapTime);

  // Check collision with current checkpoint every frame
  useFrame((_, delta) => {
    if (!raceActive) return;

    updateLapTime(delta);

    const carPos = useGameStore.getState().carPosition;
    const target = CIRCUIT_CHECKPOINTS[currentCheckpoint];
    if (!target) return;

    const dx = carPos[0] - target.pos[0];
    const dz = carPos[2] - target.pos[2];
    const dist = Math.hypot(dx, dz);

    // If car enters checkpoint gate (radius 8.5m)
    if (dist < 8.5) {
      soundManager.playCheckpoint();
      reachCheckpoint(currentCheckpoint);

      // If race just finished, launch confetti celebration!
      if (currentCheckpoint === CIRCUIT_CHECKPOINTS.length - 1) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
    }
  });

  if (!raceActive) return null;

  return (
    <group>
      {CIRCUIT_CHECKPOINTS.map((cp, idx) => {
        const isNext = idx === currentCheckpoint;
        const isPassed = idx < currentCheckpoint;

        return (
          <CheckpointGate
            key={cp.id}
            position={cp.pos}
            isNext={isNext}
            isPassed={isPassed}
            gateNumber={idx + 1}
          />
        );
      })}
    </group>
  );
}

// Glowing Holographic Gate
function CheckpointGate({ position, isNext, isPassed, gateNumber }) {
  const color = isPassed ? '#22ff88' : isNext ? '#00f0ff' : '#225577';
  const emissiveColor = isPassed ? '#00cc55' : isNext ? '#00ffff' : '#113355';
  const scale = isNext ? 1.08 : 0.95;

  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Outer Hologram Ring */}
      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[4.2, 0.16, 12, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={emissiveColor}
          emissiveIntensity={isNext ? 3.5 : 0.8}
          roughness={0.2}
          transparent
          opacity={isNext ? 0.95 : 0.45}
        />
      </mesh>

      {/* Inner Rotating Laser Ring */}
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <torusGeometry args={[3.8, 0.06, 8, 24]} />
        <meshBasicMaterial
          color={isNext ? '#ffffff' : '#00aaff'}
          transparent
          opacity={isNext ? 0.7 : 0.2}
        />
      </mesh>
    </group>
  );
}

