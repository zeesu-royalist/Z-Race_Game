import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useGameStore } from '../store/gameStore';
import { checkCarCollision, RIVAL_HALF_LENGTH, RIVAL_HALF_WIDTH } from '../utils/carCollision';

// Target car length scaled proportionally to city road lanes
const TARGET_CAR_LENGTH = 3.9;
const SLS_RAW_LENGTH = 4.85;
const SCALE_FACTOR = TARGET_CAR_LENGTH / SLS_RAW_LENGTH; // ~0.8041

// Track Waypoints defining the full-city championship circuit (2.05 km)
// Spans across South Grand Boulevard, Racing Tunnel, Turbo Alley Central Expressway,
// Mid-City Highway, Far West Coastal Avenue, North Metropolis Sweeper,
// Super Highway Straight, Mid-City Avenue, Cross Boulevard, East Metro Avenue,
// and East Metropolis Grand Terminus Finish Line Arch!
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

  // Sector 7: North Avenue Sprint
  new THREE.Vector3(-371.5, 0.3, -448.0),
  new THREE.Vector3(-369.7, 0.3, -458.0),// Gate 7: North Avenue Sprint
  new THREE.Vector3(-369.7, 0.3, -475.0),
  new THREE.Vector3(-369.3, 0.3, -495.0),// Gate 8: North Metropolis Gateway Arch
  new THREE.Vector3(-367.5, 0.3, -505.0),
  new THREE.Vector3(-364.5, 0.3, -512.0),
  new THREE.Vector3(-360.5, 0.3, -520.0),
  new THREE.Vector3(-350.0, 0.3, -528.0),

  // Sector 8: North Metropolis Highway Sweeper
  new THREE.Vector3(-325.0, 0.3, -535.0),
  new THREE.Vector3(-285.0, 0.3, -542.0),
  new THREE.Vector3(-265.3, 0.3, -550.0),// Gate 9: North Highway Apex
  new THREE.Vector3(-261.0, 0.3, -558.0),
  new THREE.Vector3(-259.5, 0.3, -568.0),
  new THREE.Vector3(-254.0, 0.3, -576.0),
  new THREE.Vector3(-248.0, 0.3, -583.0),

  // Sector 9: Mid-North Super Highway Straight
  new THREE.Vector3(-230.0, 0.3, -585.0),
  new THREE.Vector3(-190.0, 0.3, -585.0),// Gate 10: Super Highway Straight
  new THREE.Vector3(-160.0, 0.3, -585.0),
  new THREE.Vector3(-144.0, 0.3, -580.0),

  // Sector 10: Mid-City Avenue South
  new THREE.Vector3(-136.3, 0.3, -560.0),
  new THREE.Vector3(-136.3, 0.3, -520.0),
  new THREE.Vector3(-136.3, 0.3, -500.0),// Gate 11: Mid-City Avenue South
  new THREE.Vector3(-136.3, 0.3, -480.0),
  new THREE.Vector3(-136.3, 0.3, -450.0),
  new THREE.Vector3(-134.0, 0.3, -435.0),

  // Sector 11: Cross Boulevard East
  new THREE.Vector3(-120.0, 0.3, -427.0),
  new THREE.Vector3(-90.0, 0.3, -425.6),
  new THREE.Vector3(-60.0, 0.3, -425.6), // Gate 12: Cross Boulevard East
  new THREE.Vector3(-35.0, 0.3, -427.0),
  new THREE.Vector3(-22.0, 0.3, -435.0),

  // Sector 12: East Metro Avenue North
  new THREE.Vector3(-14.0, 0.3, -460.0),
  new THREE.Vector3(-12.5, 0.3, -500.0),
  new THREE.Vector3(-12.0, 0.3, -535.0),
  new THREE.Vector3(-5.0, 0.3, -560.0),  // Gate 13: East Metro Avenue
  new THREE.Vector3(5.0, 0.3, -580.0),
  new THREE.Vector3(15.0, 0.3, -594.0),
  new THREE.Vector3(26.0, 0.3, -604.0),

  // Sector 13: East Metropolis Grand Terminus Finish Boulevard
  new THREE.Vector3(38.0, 0.3, -610.0),
  new THREE.Vector3(65.0, 0.3, -618.5),
  new THREE.Vector3(100.0, 0.3, -620.8), // Gate 14: East Metro Grand Boulevard
  new THREE.Vector3(140.0, 0.3, -620.8),
  new THREE.Vector3(170.0, 0.3, -615.0),
  new THREE.Vector3(182.0, 0.3, -604.0)  // Gate 15: East Metro Grand Terminus Finish Line Arch!
];

// Precompute smooth centripetal Catmull-Rom road spline
export const raceTrackCurve = new THREE.CatmullRomCurve3(TRACK_WAYPOINTS, false, 'centripetal');
export const TRACK_TOTAL_LENGTH = raceTrackCurve.getLength();
export const FINISH_LINE_DIST = 2044.8; // Distance along track to Finish Line Gate 15

// Precomputed track samples for 60 FPS zero-overhead player distance lookup (0 GC)
const SAMPLE_COUNT = 500;
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

// Shared mutable buffer for 60 FPS rival simulation & physics collision
export const rivalCarsSim = RIVAL_CARS_CONFIG.map((cfg) => ({
  id: cfg.id,
  name: cfg.name,
  color: cfg.color,
  startDist: cfg.startDist,
  trackDist: cfg.startDist,
  speed: 0,
  topSpeed: cfg.topSpeed,
  accelRate: cfg.accelRate,
  initialLane: cfg.initialLane,
  laneOffset: cfg.initialLane,
  targetLaneOffset: cfg.initialLane,
  finished: false,
  speedVarianceTimer: Math.random() * 2,
  x: cfg.startPos[0],
  y: cfg.startPos[1],
  z: cfg.startPos[2],
  rotY: cfg.startRotY,
  pushX: 0,
  pushZ: 0
}));

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
  window.rivalCarsSim = rivalCarsSim;
}

export function RivalCars() {
  const { scene: slsBaseScene } = useGLTF('/cars-models/mercedes_sls_gt3.glb');
  const raceActive = useGameStore((s) => s.raceActive);
  const raceFinished = useGameStore((s) => s.raceFinished);
  const setRacePosition = useGameStore((s) => s.setRacePosition);

  // Group refs for each rival car
  const groupRefs = useRef([]);

  // Cached player sample index for fast localized track distance lookup (94% fewer iterations)
  const lastPlayerSampleIdx = useRef(0);

  // AI dynamic simulation state for each competitor (Zero GC per frame)
  const simState = useRef(rivalCarsSim);

  // Clone SLS model once per rival with distinct custom paint material (Zero extra geometry memory)
  const rivalScenes = useMemo(() => {
    return RIVAL_CARS_CONFIG.map((cfg) => {
      const cloned = SkeletonUtils.clone(slsBaseScene);
      cloned.scale.set(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);

      cloned.traverse((child) => {
        if (child.isMesh) {
          // Disable shadow casting on rival cars for 60 FPS performance on budget GPUs
          child.castShadow = false;
          child.receiveShadow = false;

          // Cull invisible interior cockpit parts on competitor cars (Saves 33 draw calls and 86,000 tris per car!)
          const matName = child.material ? (child.material.name || '') : '';
          const nodeName = child.name || '';
          if (
            matName.startsWith('INT_') ||
            nodeName.startsWith('INT_') ||
            matName.includes('Cockpit') ||
            matName.includes('Volante') ||
            matName.includes('ROLLBAR') ||
            matName.includes('Decals') ||
            matName.includes('Rim_Blur')
          ) {
            child.visible = false;
            return;
          }

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
        sim.pushX = 0;
        sim.pushZ = 0;
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
        const time = performance.now() * 0.001;
        const vibration = Math.sin(time * 35 + idx * 1.5) * 0.004;
        sim.y = 0.30 + vibration;
        sim.speed = 0;
      } else if (canRace && !sim.finished) {
        // Compute 3D road surface coordinates from Catmull-Rom spline
        const t = THREE.MathUtils.clamp(sim.trackDist / TRACK_TOTAL_LENGTH, 0, 1);
        raceTrackCurve.getPointAt(t, tempPoint);
        raceTrackCurve.getTangentAt(t, tempTangent);
        tempTangent.normalize();

        // Normal vector perpendicular to road direction on XZ plane
        tempNormal.set(-tempTangent.z, 0, tempTangent.x).normalize();

        // Dynamic AI speed fluctuations (simulating drafting & throttle balance)
        sim.speedVarianceTimer += dt;
        if (sim.speedVarianceTimer > 1.8) {
          sim.speedVarianceTimer = 0;
          const variance = (Math.random() - 0.5) * 4.0;
          sim.targetSpeed = THREE.MathUtils.clamp(cfg.topSpeed + variance, 48, 62);
        }

        // --- AI Pack Proactive Obstacle & Traffic Awareness ---
        // Look ahead for cars directly in front (both rivals and player) to cleanly overtake
        let carAheadDist = Infinity;
        let carAheadSpeed = sim.speed;
        let carAheadLane = sim.laneOffset;

        // Check distance to player
        if (playerPos) {
          const pDx = playerPos[0] - sim.x;
          const pDz = playerPos[2] - sim.z;
          const forwardDist = pDx * tempTangent.x + pDz * tempTangent.z;
          if (forwardDist > 0.5 && forwardDist < 14.0) {
            const latDist = pDx * tempNormal.x + pDz * tempNormal.z;
            carAheadDist = forwardDist;
            carAheadSpeed = useGameStore.getState().speed || 30;
            carAheadLane = sim.laneOffset + latDist;
          }
        }

        // Check distance to other competitors ahead
        for (let j = 0; j < simState.current.length; j++) {
          if (j === idx) continue;
          const other = simState.current[j];
          if (other.finished) continue;
          const dTrack = other.trackDist - sim.trackDist;
          if (dTrack > 0.5 && dTrack < carAheadDist && dTrack < 14.0) {
            carAheadDist = dTrack;
            carAheadSpeed = other.speed;
            carAheadLane = other.laneOffset;
          }
        }

        // Proactive overtaking maneuver: smooth lane shift when car ahead is blocking
        if (carAheadDist < 12.0 && Math.abs(sim.laneOffset - carAheadLane) < 1.3) {
          const shiftDir = carAheadLane >= 0 ? -1.0 : 1.0;
          sim.targetLaneOffset = THREE.MathUtils.clamp(carAheadLane + shiftDir * 1.5, -1.8, 1.8);

          // Modulate speed to match traffic before making the pass
          if (carAheadDist < 4.0 && sim.speed > carAheadSpeed) {
            sim.speed = THREE.MathUtils.lerp(sim.speed, carAheadSpeed, 3.5 * dt);
          }
        }

        // Accelerate forward toward target speed
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

        // Decay physical collision push safely clamped to road pavement bounds
        sim.pushX = THREE.MathUtils.clamp(THREE.MathUtils.lerp(sim.pushX, 0, 8.0 * dt), -1.6, 1.6);
        sim.pushZ = THREE.MathUtils.clamp(THREE.MathUtils.lerp(sim.pushZ, 0, 8.0 * dt), -1.6, 1.6);

        // Position car on asphalt road with lane offset + collision displacement
        sim.x = tempPoint.x + tempNormal.x * sim.laneOffset + sim.pushX;
        sim.y = 0.30;
        sim.z = tempPoint.z + tempNormal.z * sim.laneOffset + sim.pushZ;

        // Natural heading along track tangent with subtle lateral steering yaw
        const baseRotY = Math.atan2(tempTangent.x, tempTangent.z);
        const laneDiff = sim.targetLaneOffset - sim.laneOffset;
        sim.rotY = baseRotY - laneDiff * 0.05;
      } else if (sim.finished) {
        // Smooth slowdown after crossing the finish line arch into run-off zone
        sim.speed = Math.max(0, sim.speed - 22.0 * dt);
        sim.trackDist = Math.min(TRACK_TOTAL_LENGTH, sim.trackDist + sim.speed * dt);

        const t = Math.min(1, sim.trackDist / TRACK_TOTAL_LENGTH);
        raceTrackCurve.getPointAt(t, tempPoint);
        raceTrackCurve.getTangentAt(t, tempTangent);
        tempTangent.normalize();
        tempNormal.set(-tempTangent.z, 0, tempTangent.x).normalize();

        sim.pushX = THREE.MathUtils.clamp(THREE.MathUtils.lerp(sim.pushX, 0, 8.0 * dt), -1.6, 1.6);
        sim.pushZ = THREE.MathUtils.clamp(THREE.MathUtils.lerp(sim.pushZ, 0, 8.0 * dt), -1.6, 1.6);

        sim.x = tempPoint.x + tempNormal.x * sim.laneOffset + sim.pushX;
        sim.y = 0.30;
        sim.z = tempPoint.z + tempNormal.z * sim.laneOffset + sim.pushZ;
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

    // Rival-to-Rival Smooth Continuous Capsule Collision
    if (canRace) {
      for (let i = 0; i < simState.current.length; i++) {
        for (let j = i + 1; j < simState.current.length; j++) {
          const r1 = simState.current[i];
          const r2 = simState.current[j];
          if (r1.finished || r2.finished) continue;

          const col = checkCarCollision(
            r1.x, r1.z, r1.rotY, RIVAL_HALF_LENGTH, RIVAL_HALF_WIDTH,
            r2.x, r2.z, r2.rotY, RIVAL_HALF_LENGTH, RIVAL_HALF_WIDTH
          );

          if (col) {
            // Smooth anti-penetration separation along continuous normal
            const sepX = col.normalX * col.depth * 0.5;
            const sepZ = col.normalZ * col.depth * 0.5;
            r1.pushX = THREE.MathUtils.clamp(r1.pushX + sepX, -1.6, 1.6);
            r1.pushZ = THREE.MathUtils.clamp(r1.pushZ + sepZ, -1.6, 1.6);
            r2.pushX = THREE.MathUtils.clamp(r2.pushX - sepX, -1.6, 1.6);
            r2.pushZ = THREE.MathUtils.clamp(r2.pushZ - sepZ, -1.6, 1.6);
            r1.x += sepX;
            r1.z += sepZ;
            r2.x -= sepX;
            r2.z -= sepZ;

            // Gentle lane separation scaled by dt (zero sudden jerking)
            if (r1.laneOffset <= r2.laneOffset) {
              r1.targetLaneOffset = THREE.MathUtils.clamp(r1.targetLaneOffset - 0.7 * dt, -1.8, 1.8);
              r2.targetLaneOffset = THREE.MathUtils.clamp(r2.targetLaneOffset + 0.7 * dt, -1.8, 1.8);
            } else {
              r1.targetLaneOffset = THREE.MathUtils.clamp(r1.targetLaneOffset + 0.7 * dt, -1.8, 1.8);
              r2.targetLaneOffset = THREE.MathUtils.clamp(r2.targetLaneOffset - 0.7 * dt, -1.8, 1.8);
            }

            // Trailing car yields throttle smoothly; leading car gets pushed forward
            if (r1.trackDist > r2.trackDist) {
              r2.speed = Math.max(12, r2.speed - 8.0 * dt);
              r1.speed = Math.min(r1.topSpeed + 4, r1.speed + 4.0 * dt);
            } else {
              r1.speed = Math.max(12, r1.speed - 8.0 * dt);
              r2.speed = Math.min(r2.topSpeed + 4, r2.speed + 4.0 * dt);
            }

            const grp1 = groupRefs.current[i];
            if (grp1) grp1.position.set(r1.x, r1.y, r1.z);
            const grp2 = groupRefs.current[j];
            if (grp2) grp2.position.set(r2.x, r2.y, r2.z);
          }
        }
      }
    }

    // Compute player track distance and live ranking among 7 racers (P1 to P7)
    if (raceActive || raceFinished) {
      let closestDistSq = Infinity;
      let playerTrackDist = 0;
      let bestIdx = lastPlayerSampleIdx.current;

      // Localized window search around last known position (30 checks instead of 500)
      const windowStart = Math.max(0, bestIdx - 6);
      const windowEnd = Math.min(TRACK_SAMPLES.length, bestIdx + 24);

      for (let i = windowStart; i < windowEnd; i++) {
        const sp = TRACK_SAMPLES[i];
        const dx = sp.pos.x - playerPos[0];
        const dz = sp.pos.z - playerPos[2];
        const dSq = dx * dx + dz * dz;
        if (dSq < closestDistSq) {
          closestDistSq = dSq;
          playerTrackDist = sp.dist;
          bestIdx = i;
        }
      }

      // Fallback full scan only if player teleported or respawned > 30m away
      if (closestDistSq > 900) {
        for (let i = 0; i < TRACK_SAMPLES.length; i++) {
          const sp = TRACK_SAMPLES[i];
          const dx = sp.pos.x - playerPos[0];
          const dz = sp.pos.z - playerPos[2];
          const dSq = dx * dx + dz * dz;
          if (dSq < closestDistSq) {
            closestDistSq = dSq;
            playerTrackDist = sp.dist;
            bestIdx = i;
          }
        }
      }

      lastPlayerSampleIdx.current = bestIdx;

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
