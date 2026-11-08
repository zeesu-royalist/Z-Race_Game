import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { useGameStore } from '../store/gameStore';
import { soundManager } from '../utils/AudioSystem';

// Checkpoints defining the Full-City Championship Circuit (1.16 km)
// Spanning from South Grand Boulevard through Racing Tunnel, Central Expressway,
// Mid-City Highway, Far West Coastal Avenue, and North Metropolis Grand Finish Arch
export const CIRCUIT_CHECKPOINTS = [
  { id: 0, pos: [-3.0, 1.2, 28.0], name: 'Start Line', rotY: 0 },
  { id: 1, pos: [-3.0, 1.2, 55.0], name: 'Boulevard Sprint', rotY: 0 },
  { id: 2, pos: [-80.0, 1.2, 122.1], name: 'Racing Tunnel', rotY: Math.PI / 2 },
  { id: 3, pos: [-222.0, 1.2, 0.0], name: 'Turbo Alley Expressway', rotY: Math.PI },
  { id: 4, pos: [-300.0, 1.2, -211.2], name: 'Mid-City Highway', rotY: Math.PI / 2 },
  { id: 5, pos: [-479.2, 1.2, -330.0], name: 'Coastal Subway Bridge', rotY: Math.PI },
  { id: 6, pos: [-442.0, 1.2, -428.5], name: 'North Sweeper', rotY: -Math.PI / 2 },
  { id: 7, pos: [-369.7, 1.2, -458.0], name: 'Grand Finale Sprint', rotY: Math.PI },
  { id: 8, pos: [-369.7, 1.2, -488.0], name: 'City End Finish Line Arch', rotY: Math.PI }
];

// Shared geometry buffers across gates (Eliminates redundant GPU buffer allocations)
const sharedOuterTorus = new THREE.TorusGeometry(4.2, 0.16, 8, 24);
const sharedInnerTorus = new THREE.TorusGeometry(3.8, 0.06, 6, 20);
const sharedPillarGeo = new THREE.CylinderGeometry(0.2, 0.25, 6, 8);
const sharedBannerGeo = new THREE.BoxGeometry(11.5, 0.8, 0.2);

export function RacingSystem() {
  const raceActive = useGameStore((s) => s.raceActive);
  const raceFinished = useGameStore((s) => s.raceFinished);
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
    const distSq = dx * dx + dz * dz;

    // Radius 9.5m => distSq < 90.25 (responsive checkpoint trigger at 200+ km/h)
    if (distSq < 90.25) {
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

  // Keep gates and celebratory finish arch visible while racing or when finished
  if (!raceActive && !raceFinished) return null;

  return (
    <group>
      {CIRCUIT_CHECKPOINTS.map((cp, idx) => {
        const isNext = idx === currentCheckpoint;
        const isPassed = idx < currentCheckpoint;
        const isFinish = idx === CIRCUIT_CHECKPOINTS.length - 1;

        return (
          <CheckpointGate
            key={cp.id}
            position={cp.pos}
            rotY={cp.rotY || 0}
            isNext={isNext}
            isPassed={isPassed}
            gateNumber={idx + 1}
            isFinish={isFinish}
          />
        );
      })}
    </group>
  );
}

// Glowing Holographic Gate & End Road Finish Line Arch
function CheckpointGate({ position, rotY, isNext, isPassed, gateNumber, isFinish }) {
  const color = isFinish ? (isPassed ? '#22ff88' : '#ffd700') : isPassed ? '#22ff88' : isNext ? '#00f0ff' : '#225577';
  const emissiveColor = isFinish ? (isPassed ? '#00cc55' : '#ffaa00') : isPassed ? '#00cc55' : isNext ? '#00ffff' : '#113355';
  const scale = isFinish ? 1.25 : isNext ? 1.08 : 0.95;

  return (
    <group position={position} rotation={[0, rotY, 0]} scale={[scale, scale, scale]}>
      {/* Outer Hologram Ring using shared geometry */}
      <mesh geometry={sharedOuterTorus} rotation={[0, 0, 0]}>
        <meshStandardMaterial
          color={color}
          emissive={emissiveColor}
          emissiveIntensity={isNext || isFinish ? 3.5 : 0.8}
          roughness={0.2}
          transparent
          opacity={isNext || isFinish ? 0.95 : 0.45}
        />
      </mesh>

      {/* Inner Rotating Laser Ring using shared geometry */}
      <mesh geometry={sharedInnerTorus} rotation={[0, 0, Math.PI / 4]}>
        <meshBasicMaterial
          color={isFinish ? '#ffffff' : isNext ? '#ffffff' : '#00aaff'}
          transparent
          opacity={isNext || isFinish ? 0.75 : 0.2}
        />
      </mesh>

      {/* End Road Finish Arch Structure */}
      {isFinish && (
        <group position={[0, 0.8, 0]}>
          {/* Left Pylon */}
          <mesh geometry={sharedPillarGeo} position={[-5.5, 1.2, 0]}>
            <meshStandardMaterial color="#ffd700" emissive="#ff8800" emissiveIntensity={1.5} metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Right Pylon */}
          <mesh geometry={sharedPillarGeo} position={[5.5, 1.2, 0]}>
            <meshStandardMaterial color="#ffd700" emissive="#ff8800" emissiveIntensity={1.5} metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Top Finish Banner */}
          <mesh geometry={sharedBannerGeo} position={[0, 4.4, 0]}>
            <meshStandardMaterial color="#ffd700" emissive="#ffaa00" emissiveIntensity={2.0} roughness={0.3} />
          </mesh>
        </group>
      )}
    </group>
  );
}
