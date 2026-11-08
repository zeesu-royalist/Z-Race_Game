import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useGameStore } from '../store/gameStore';

// Target car length scaled proportionally to city road lanes
const TARGET_CAR_LENGTH = 3.9;
const SLS_RAW_LENGTH = 4.85;
const SCALE_FACTOR = TARGET_CAR_LENGTH / SLS_RAW_LENGTH; // ~0.8041

// Track Waypoints defining the full-city championship circuit (1.16 km)
// Spans across South Grand Boulevard, Racing Tunnel, Turbo Alley Central Expressway,
// Mid-City Highway, Far West Coastal Avenue, and North Metropolis Grand Finish Boulevard
export const TRACK_WAYPOINTS = [
  // Sector 1: Grand Boulevard Start
  new THREE.Vector3(-3.0, 0.3, -4.0),
  new THREE.Vector3(-3.0, 0.3, 20.0),
  new THREE.Vector3(-3.0, 0.3, 28.0),   // Gate 0: Start Line under Copperline Garage
  new THREE.Vector3(-3.0, 0.3, 55.0),   // Gate 1: Boulevard Sprint
  new THREE.Vector3(-3.0, 0.3, 70.0),
  new THREE.Vector3(-3.5, 0.3, 78.0),
  new THREE.Vector3(-5.0, 0.3, 85.0),
  new THREE.Vector3(-8.5, 0.3, 95.0),
  new THREE.Vector3(-14.5, 0.3, 105.0), // Sweeping Corner Apex
  new THREE.Vector3(-22.0, 0.3, 112.0),
  new THREE.Vector3(-30.0, 0.3, 117.0),
  new THREE.Vector3(-40.0, 0.3, 121.0),

  // Sector 2: Racing Tunnel
  new THREE.Vector3(-60.0, 0.3, 122.1),
  new THREE.Vector3(-80.0, 0.3, 122.1), // Gate 2: Tunnel Entry
  new THREE.Vector3(-105.0, 0.3, 122.1),
  new THREE.Vector3(-130.0, 0.3, 122.1),
  new THREE.Vector3(-148.0, 0.3, 119.5),
  new THREE.Vector3(-168.0, 0.3, 112.5),
  new THREE.Vector3(-188.0, 0.3, 99.5),
  new THREE.Vector3(-204.0, 0.3, 79.5),
  new THREE.Vector3(-215.0, 0.3, 58.0),
  new THREE.Vector3(-221.0, 0.3, 38.0),

  // Sector 3: Turbo Alley Central Expressway
  new THREE.Vector3(-222.0, 0.3, 20.0),
  new THREE.Vector3(-222.0, 0.3, 0.0),   // Gate 3: Turbo Alley Tunnel
  new THREE.Vector3(-222.0, 0.3, -40.0), // Under Turbo Alley Arch
  new THREE.Vector3(-222.0, 0.3, -80.0),
  new THREE.Vector3(-222.0, 0.3, -115.0),// Double Overpass
  new THREE.Vector3(-222.0, 0.3, -145.0),
  new THREE.Vector3(-222.0, 0.3, -160.0),

  // Sector 4: Mid-City Highway Connector
  new THREE.Vector3(-224.0, 0.3, -172.0),
  new THREE.Vector3(-228.0, 0.3, -182.0),
  new THREE.Vector3(-236.0, 0.3, -192.0),
  new THREE.Vector3(-248.0, 0.3, -200.0),
  new THREE.Vector3(-262.0, 0.3, -206.0),
  new THREE.Vector3(-278.0, 0.3, -210.5),
  new THREE.Vector3(-300.0, 0.3, -211.2),// Gate 4: Mid-City Highway
  new THREE.Vector3(-330.0, 0.3, -211.2),
  new THREE.Vector3(-360.0, 0.3, -211.2),
  new THREE.Vector3(-380.0, 0.3, -211.2),

  // Sector 5: West Coastal Avenue
  new THREE.Vector3(-405.0, 0.3, -215.0),
  new THREE.Vector3(-430.0, 0.3, -225.0),
  new THREE.Vector3(-452.0, 0.3, -242.0),
  new THREE.Vector3(-468.0, 0.3, -265.0),
  new THREE.Vector3(-476.0, 0.3, -288.0),
  new THREE.Vector3(-479.2, 0.3, -310.0),
  new THREE.Vector3(-479.2, 0.3, -330.0),// Gate 5: Coastal Subway Bridge
  new THREE.Vector3(-479.2, 0.3, -360.0),
  new THREE.Vector3(-479.2, 0.3, -385.0),

  // Sector 6: North Sweeper
  new THREE.Vector3(-476.0, 0.3, -402.0),
  new THREE.Vector3(-471.0, 0.3, -412.0),
  new THREE.Vector3(-464.0, 0.3, -418.5),
  new THREE.Vector3(-455.0, 0.3, -424.5),
  new THREE.Vector3(-442.0, 0.3, -428.5),// Gate 6: North Sweeper
  new THREE.Vector3(-422.0, 0.3, -431.5),
  new THREE.Vector3(-402.0, 0.3, -433.5),
  new THREE.Vector3(-386.0, 0.3, -436.5),
  new THREE.Vector3(-377.0, 0.3, -441.5),

  // Sector 7: North Metropolis Grand Finish Boulevard
  new THREE.Vector3(-371.5, 0.3, -448.0),
  new THREE.Vector3(-369.7, 0.3, -458.0),// Gate 7: Final Sprint
  new THREE.Vector3(-369.7, 0.3, -472.0),
  new THREE.Vector3(-369.7, 0.3, -488.0) // Gate 8: City End Finish Line Arch!
];

// Precompute smooth centripetal Catmull-Rom road spline
export const raceTrackCurve = new THREE.CatmullRomCurve3(TRACK_WAYPOINTS, false, 'centripetal');
export const TRACK_TOTAL_LENGTH = raceTrackCurve.getLength();
export const FINISH_LINE_DIST = 1156.0; // Distance along track to Finish Line Gate 8

// Precomputed track samples for 60 FPS zero-overhead player distance lookup (0 GC)
const SAMPLE_COUNT = 300;
const TRACK_SAMPLES = [];
for (let i = 0; i <= SAMPLE_COUNT; i++) {
  const t = i / SAMPLE_COUNT;
  TRACK_SAMPLES.push({
    pos: raceTrackCurve.getPointAt(t),
    dist: t * TRACK_TOTAL_LENGTH
  });
}

// Reusable calculation vectors (Zero GC per frame)
const tempPoint = new THREE.Vector3();
const tempTangent = new THREE.Vector3();
const tempNormal = new THREE.Vector3();

export const RIVAL_CARS_CONFIG = [
  {
    id: 'rival_1',
    name: 'Viper',
    color: '#dc2626', // Crimson Red
    gridSlot: 1,
    startDist: 28.0,
    initialLane: -1.8,
    topSpeed: 59.0, // m/s (~212 km/h)
    accelRate: 19.5
  },
  {
    id: 'rival_2',
    name: 'Phantom',
    color: '#2563eb', // Cobalt Blue
    gridSlot: 2,
    startDist: 24.0,
    initialLane: 1.8,
    topSpeed: 57.0,
    accelRate: 18.8
  },
  {
    id: 'rival_3',
    name: 'Apex',
    color: '#16a34a', // Emerald Green
    gridSlot: 3,
    startDist: 20.0,
    initialLane: -0.8,
    topSpeed: 60.5,
    accelRate: 20.2
  },
  // Player is at gridSlot 4: startDist ~ 14.0m, pos [-4.8, 0.3, 10.0]
  {
    id: 'rival_4',
    name: 'Blaze',
    color: '#f59e0b', // Cyber Amber
    gridSlot: 5,
    startDist: 10.0,
    initialLane: -1.8,
    topSpeed: 56.0,
    accelRate: 18.2
  },
  {
    id: 'rival_5',
    name: 'Titan',
    color: '#ea580c', // Blaze Orange
    gridSlot: 6,
    startDist: 6.0,
    initialLane: 1.2,
    topSpeed: 58.0,
    accelRate: 19.0
  },
  {
    id: 'rival_6',
    name: 'Shadow',
    color: '#9333ea', // Neon Purple
    gridSlot: 7,
    startDist: 2.0,
    initialLane: -0.2,
    topSpeed: 55.0,
    accelRate: 17.8
  }
];

// Calculate initial 3D spawn position for each rival on the starting grid
function computeSpawnPos(cfg) {
  const t = cfg.startDist / TRACK_TOTAL_LENGTH;
  const pt = raceTrackCurve.getPointAt(t);
  const tan = raceTrackCurve.getTangentAt(t).normalize();
  const n = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
  return [
    pt.x + n.x * cfg.initialLane,
    0.30,
    pt.z + n.z * cfg.initialLane
  ];
}

// Augment config with exact startPos and initial rotY
RIVAL_CARS_CONFIG.forEach((cfg) => {
  cfg.startPos = computeSpawnPos(cfg);
  const t = cfg.startDist / TRACK_TOTAL_LENGTH;
  const tan = raceTrackCurve.getTangentAt(t).normalize();
  cfg.startRotY = Math.atan2(tan.x, tan.z);
});

// Shared mutable buffer for 60 FPS radar updates (Zero React re-render overhead)
export const rivalRadarPositions = RIVAL_CARS_CONFIG.map((cfg) => ({
  id: cfg.id,
  name: cfg.name,
  color: cfg.color,
  x: cfg.startPos[0],
  z: cfg.startPos[2],
  rotY: cfg.startRotY,
  speed: 0
}));

if (typeof window !== 'undefined') {
  window.rivalRadarPositions = rivalRadarPositions;
}

export function RivalCars() {
  const { scene: slsBaseScene } = useGLTF('/cars-models/mercedes_sls_gt3.glb');
  const raceActive = useGameStore((s) => s.raceActive);
  const raceFinished = useGameStore((s) => s.raceFinished);
  const setRacePosition = useGameStore((s) => s.setRacePosition);

  // Group refs for each rival car
  const groupRefs = useRef([]);

  // AI dynamic simulation state for each competitor (Zero GC per frame)
  const simState = useRef(
    RIVAL_CARS_CONFIG.map((cfg) => ({
      trackDist: cfg.startDist,
      speed: 0,
      targetSpeed: cfg.topSpeed,
      accelRate: cfg.accelRate,
      laneOffset: cfg.initialLane,
      targetLaneOffset: cfg.initialLane,
      finished: false,
      speedVarianceTimer: Math.random() * 2,
      x: cfg.startPos[0],
      y: cfg.startPos[1],
      z: cfg.startPos[2],
      rotY: cfg.startRotY
    }))
  );

  // Clone SLS model once per rival with distinct custom paint material (Zero extra geometry memory)
  const rivalScenes = useMemo(() => {
    return RIVAL_CARS_CONFIG.map((cfg) => {
      const cloned = SkeletonUtils.clone(slsBaseScene);
      cloned.scale.set(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);

      cloned.traverse((child) => {
        if (child.isMesh) {
          // Disable shadow casting on rival cars for 60 FPS performance on budget GPUs
          child.castShadow = false;
          child.receiveShadow = true;

          // Replace paint material with unique colored instance
          if (child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            const hasPaint = mats.some(
              (m) => m.name && (m.name.includes('Carpaint') || m.name.includes('paint') || m.name === 'EXT_Carpaint.007')
            );

            if (hasPaint) {
              const newMat = (mats[0] || child.material).clone();
              newMat.color = new THREE.Color(cfg.color);
              if (newMat.metalness !== undefined) newMat.metalness = 0.85;
              if (newMat.roughness !== undefined) newMat.roughness = 0.22;
              child.material = newMat;
            }
          }
        }
      });

      return cloned;
    });
  }, [slsBaseScene]);

  // Reset rivals whenever race starts
  useEffect(() => {
    if (raceActive) {
      simState.current.forEach((sim, idx) => {
        const cfg = RIVAL_CARS_CONFIG[idx];
        sim.trackDist = cfg.startDist;
        sim.speed = 0;
        sim.targetSpeed = cfg.topSpeed;
        sim.laneOffset = cfg.initialLane;
        sim.targetLaneOffset = cfg.initialLane;
        sim.finished = false;
        sim.speedVarianceTimer = Math.random() * 2;
        sim.x = cfg.startPos[0];
        sim.y = cfg.startPos[1];
        sim.z = cfg.startPos[2];
        sim.rotY = cfg.startRotY;

        const grp = groupRefs.current[idx];
        if (grp) {
          grp.position.set(sim.x, sim.y, sim.z);
          grp.rotation.set(0, sim.rotY, 0);
        }

        rivalRadarPositions[idx].x = sim.x;
        rivalRadarPositions[idx].z = sim.z;
        rivalRadarPositions[idx].rotY = sim.rotY;
        rivalRadarPositions[idx].speed = 0;
      });
    }
  }, [raceActive]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.08); // Clamp large delta spikes
    const curCountdown = useGameStore.getState().raceCountdown;
    const isCountingDown = curCountdown !== null && curCountdown > 0;
    const canRace = raceActive && !isCountingDown;
    const playerPos = useGameStore.getState().carPosition;

    simState.current.forEach((sim, idx) => {
      const cfg = RIVAL_CARS_CONFIG[idx];
      const grp = groupRefs.current[idx];

      if (isCountingDown) {
        // Pre-race engine rev vibration on the starting grid
        const vibration = Math.sin(state.clock.elapsedTime * 35 + idx * 1.5) * 0.004;
        sim.y = 0.30 + vibration;
        sim.speed = 0;
      } else if (canRace && !sim.finished) {
        // Dynamic AI speed fluctuations (simulating drafting & throttle balance)
        sim.speedVarianceTimer += dt;
        if (sim.speedVarianceTimer > 1.6) {
          sim.speedVarianceTimer = 0;
          const variance = (Math.random() - 0.5) * 4.5;
          sim.targetSpeed = THREE.MathUtils.clamp(cfg.topSpeed + variance, 48, 63);

          // Subtle lane shifting for overtaking maneuvers (safe road corridor)
          if (Math.random() > 0.5) {
            const laneShift = (Math.random() - 0.5) * 1.8;
            sim.targetLaneOffset = THREE.MathUtils.clamp(cfg.initialLane + laneShift, -2.2, 2.2);
          }
        }

        // Accelerate forward
        if (sim.speed < sim.targetSpeed) {
          sim.speed = Math.min(sim.targetSpeed, sim.speed + sim.accelRate * dt);
        } else {
          sim.speed = Math.max(sim.targetSpeed, sim.speed - 9.0 * dt);
        }

        // Advance along spline track
        sim.trackDist += sim.speed * dt;

        // Check if rival crossed the End Road Finish Line Arch
        if (sim.trackDist >= FINISH_LINE_DIST) {
          sim.finished = true;
        }

        // Smooth lateral steering to target lane
        sim.laneOffset = THREE.MathUtils.lerp(sim.laneOffset, sim.targetLaneOffset, 2.5 * dt);

        // Compute 3D road surface coordinates from Catmull-Rom spline
        const t = THREE.MathUtils.clamp(sim.trackDist / TRACK_TOTAL_LENGTH, 0, 1);
        raceTrackCurve.getPointAt(t, tempPoint);
        raceTrackCurve.getTangentAt(t, tempTangent);
        tempTangent.normalize();

        // Normal vector perpendicular to road direction on XZ plane
        tempNormal.set(-tempTangent.z, 0, tempTangent.x).normalize();

        // Position car on asphalt road with lane offset
        sim.x = tempPoint.x + tempNormal.x * sim.laneOffset;
        sim.y = 0.30;
        sim.z = tempPoint.z + tempNormal.z * sim.laneOffset;

        // Natural heading along track tangent with subtle lateral steering yaw
        const baseRotY = Math.atan2(tempTangent.x, tempTangent.z);
        const laneDiff = sim.targetLaneOffset - sim.laneOffset;
        sim.rotY = baseRotY - laneDiff * 0.05;
      } else if (sim.finished) {
        // Smooth slowdown after crossing the finish line arch into tunnel run-off zone
        sim.speed = Math.max(0, sim.speed - 22.0 * dt);
        sim.trackDist = Math.min(TRACK_TOTAL_LENGTH, sim.trackDist + sim.speed * dt);

        const t = Math.min(1, sim.trackDist / TRACK_TOTAL_LENGTH);
        raceTrackCurve.getPointAt(t, tempPoint);
        raceTrackCurve.getTangentAt(t, tempTangent);
        tempTangent.normalize();
        tempNormal.set(-tempTangent.z, 0, tempTangent.x).normalize();

        sim.x = tempPoint.x + tempNormal.x * sim.laneOffset;
        sim.y = 0.30;
        sim.z = tempPoint.z + tempNormal.z * sim.laneOffset;
        sim.rotY = Math.atan2(tempTangent.x, tempTangent.z);
      }

      // Update 3D mesh transform
      if (grp) {
        grp.position.set(sim.x, sim.y, sim.z);
        grp.rotation.set(0, sim.rotY, 0);
      }

      // Sync radar coordinates
      rivalRadarPositions[idx].x = sim.x;
      rivalRadarPositions[idx].z = sim.z;
      rivalRadarPositions[idx].rotY = sim.rotY;
      rivalRadarPositions[idx].speed = sim.speed;
    });

    // Compute player track distance and live ranking among 7 racers (P1 to P7)
    if (raceActive || raceFinished) {
      let closestDistSq = Infinity;
      let playerTrackDist = 0;

      for (let i = 0; i < TRACK_SAMPLES.length; i++) {
        const sp = TRACK_SAMPLES[i];
        const dx = sp.pos.x - playerPos[0];
        const dz = sp.pos.z - playerPos[2];
        const dSq = dx * dx + dz * dz;
        if (dSq < closestDistSq) {
          closestDistSq = dSq;
          playerTrackDist = sp.dist;
        }
      }

      let rivalsAhead = 0;
      simState.current.forEach((sim) => {
        if (sim.trackDist > playerTrackDist) {
          rivalsAhead++;
        }
      });

      const liveRank = rivalsAhead + 1;
      setRacePosition(liveRank);
    }
  });

  return (
    <group>
      {RIVAL_CARS_CONFIG.map((cfg, idx) => (
        <group
          key={cfg.id}
          ref={(el) => (groupRefs.current[idx] = el)}
          position={cfg.startPos}
          rotation={[0, cfg.startRotY, 0]}
        >
          <primitive object={rivalScenes[idx]} />
        </group>
      ))}
    </group>
  );
}

useGLTF.preload('/cars-models/mercedes_sls_gt3.glb');
