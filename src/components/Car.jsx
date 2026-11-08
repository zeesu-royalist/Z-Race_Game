import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { CarModel } from './CarModel';
import { soundManager } from '../utils/AudioSystem';
import { cityColliders } from './CityMap';
import { rivalCarsSim } from './RivalCars';
import {
  checkCarCollision,
  PLAYER_HALF_LENGTH,
  PLAYER_HALF_WIDTH,
  RIVAL_HALF_LENGTH,
  RIVAL_HALF_WIDTH
} from '../utils/carCollision';

// Virtual keyboard & touch input tracker
export const inputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  handbrake: false,
  nitro: false
};

// Spawn location: Dead Center of the Wide Boulevard (x: -3.0, y: 0.3, z: 10.0), facing +Z straight down the highway
const SPAWN_POS = new THREE.Vector3(-3.0, 0.3, 10.0);
const SPAWN_ROT_Y = 0;

export function Car() {
  const carGroup = useRef();

  // Zustand state hooks (event-driven)
  const resetSignal = useGameStore((s) => s.resetSignal);
  const teleportSignal = useGameStore((s) => s.teleportSignal);
  const currentCarId = useGameStore((s) => s.currentCarId);
  const headlights = useGameStore((s) => s.headlights);
  const soundEnabled = useGameStore((s) => s.soundEnabled);

  // Cached active car profile & tuning to eliminate per-frame object lookups
  const activeCarCategoryRef = useRef('jdm_turbo');
  const tuningRef = useRef({
    maxSpeed: 64,
    accelRate: 19,
    gripFactor: 0.9,
    turnMultiplier: 1.0
  });

  // Crash sound debouncer
  const lastCrashSoundTime = useRef(0);

  // Vehicle dynamics physics state
  const state = useRef({
    position: SPAWN_POS.clone(),
    rotationY: SPAWN_ROT_Y,
    pitch: 0,
    roll: 0,
    speed: 0, // m/s
    steerAngle: 0, // radians
    wheelRotation: 0,
    angularVelocity: 0,
    verticalVelocity: 0,
    isGrounded: true,
    isDrifting: false,
    driftIntensity: 0,
    driftScore: 0,
    currentGear: 1,
    rpm: 900,
    isBraking: false,
    nitro: 100,
    isNitroActive: false
  });

  // Reusable vectors & raycasters to eliminate GC memory thrashing
  const math = useRef({
    raycaster: new THREE.Raycaster(),
    downVec: new THREE.Vector3(0, -1, 0),
    forwardVec: new THREE.Vector3(),
    rightVec: new THREE.Vector3(),
    normalVec: new THREE.Vector3(0, 1, 0),
    wallRaycaster: new THREE.Raycaster(),
    rayOrigin: new THREE.Vector3(),
    wallOrigin: new THREE.Vector3(),
    checkDir: new THREE.Vector3(),
    groundHits: [],
    wallHits: []
  });

  // Setup Keyboard Listeners
  useEffect(() => {
    const onKeyDown = (e) => {
      soundManager.init();
      soundManager.resume();

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          inputState.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          inputState.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          inputState.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          inputState.right = true;
          break;
        case 'Space':
          inputState.handbrake = true;
          e.preventDefault();
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          inputState.nitro = true;
          break;
        case 'KeyR':
          useGameStore.getState().triggerReset();
          break;
        case 'KeyC':
          useGameStore.getState().cycleCameraMode();
          break;
        case 'KeyL':
          useGameStore.getState().toggleHeadlights();
          break;
        case 'KeyM':
          useGameStore.getState().toggleSound();
          break;
        case 'KeyT':
          useGameStore.getState().cycleTimeOfDay();
          break;
        default:
          break;
      }
    };

    const onKeyUp = (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          inputState.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          inputState.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          inputState.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          inputState.right = false;
          break;
        case 'Space':
          inputState.handbrake = false;
          break;
        case 'ShiftLeft':
          case 'ShiftRight':
          inputState.nitro = false;
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Handle Car Reset Signal (R key or Reset button)
  useEffect(() => {
    if (resetSignal > 0) {
      const s = state.current;
      s.position.copy(SPAWN_POS);
      s.rotationY = SPAWN_ROT_Y;
      s.pitch = 0;
      s.roll = 0;
      s.speed = 0;
      s.steerAngle = 0;
      s.angularVelocity = 0;
      s.verticalVelocity = 0;
      s.isDrifting = false;
      s.driftScore = 0;
      s.currentGear = 1;
      s.rpm = 900;
      if (carGroup.current) {
        carGroup.current.position.copy(s.position);
        carGroup.current.rotation.set(0, s.rotationY, 0);
      }
    }
  }, [resetSignal]);

  // Audio mute/unmute sync
  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // Fast Travel & District Teleport Handler
  useEffect(() => {
    if (teleportSignal > 0) {
      const target = useGameStore.getState().teleportTarget;
      if (target) {
        const s = state.current;
        s.position.set(target.pos[0], target.pos[1], target.pos[2]);
        s.rotationY = target.rotY;
        s.speed = 0;
        s.verticalVelocity = 0;
        s.angularVelocity = 0;
        s.steerAngle = 0;
        s.pitch = 0;
        s.roll = 0;
        s.isGrounded = true;
        if (carGroup.current) {
          carGroup.current.position.copy(s.position);
          carGroup.current.rotation.set(0, s.rotationY, 0);
        }
      }
    }
  }, [teleportSignal]);

  // Cache tuning and sound profile once when car changes (Zero per-frame array searches)
  useEffect(() => {
    const s = state.current;
    s.speed = 0;
    s.angularVelocity = 0;
    s.steerAngle = 0;
    s.verticalVelocity = 0;

    const car = useGameStore.getState().cars.find((c) => c.id === currentCarId);
    if (car) {
      activeCarCategoryRef.current = car.category || '';
      tuningRef.current = car.tuning || {
        maxSpeed: 64,
        accelRate: 19,
        gripFactor: 0.9,
        turnMultiplier: 1.0
      };
      soundManager.setProfile(car.category || '');
    }
  }, [currentCarId]);

  // Highly Optimized 60-120 FPS Vehicle Physics Loop
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05); // Clamp dt to prevent tunneling
    const s = state.current;
    const m = math.current;

    // --- 1. NITRO BOOST LOGIC ---
    let nitroMultiplier = 1.0;
    if (inputState.nitro && s.nitro > 0 && inputState.forward) {
      nitroMultiplier = 1.65;
      s.isNitroActive = true;
      s.nitro = Math.max(0, s.nitro - dt * 25);
    } else {
      s.isNitroActive = false;
      if (s.nitro < 100) {
        s.nitro = Math.min(100, s.nitro + dt * 6);
      }
    }

    // --- 2. STEERING DYNAMICS (Speed-sensitive) ---
    const speedKmH = Math.abs(s.speed * 3.6);
    const speedFactor = Math.max(0.28, 1.0 - (speedKmH / 220) * 0.72);
    const maxSteer = 0.58 * speedFactor;
    const steerSpeed = 4.8 * dt;

    if (inputState.left) {
      s.steerAngle = Math.min(maxSteer, s.steerAngle + steerSpeed);
    } else if (inputState.right) {
      s.steerAngle = Math.max(-maxSteer, s.steerAngle - steerSpeed);
    } else {
      s.steerAngle = THREE.MathUtils.lerp(s.steerAngle, 0, 8.5 * dt);
    }

    // Read cached active car tuning parameters
    const tuning = tuningRef.current;

    // --- 3. ACCELERATION & BRAKING ---
    const raceCountdown = useGameStore.getState().raceCountdown;
    const isLockedByCountdown = raceCountdown !== null && raceCountdown > 0;

    const maxForwardSpeed = (tuning.maxSpeed || 64) * nitroMultiplier;
    const maxReverseSpeed = -15;
    const accelRate = (tuning.accelRate || 19) * nitroMultiplier;
    const brakeRate = 34;
    const naturalFriction = 3.6;

    s.isBraking = false;

    if (isLockedByCountdown) {
      s.speed = 0;
      s.steerAngle = 0;
      if (inputState.forward) {
        s.rpm = Math.min(6200, s.rpm + 5000 * dt);
      } else {
        s.rpm = Math.max(900, s.rpm - 3500 * dt);
      }
    } else if (inputState.forward) {
      if (s.speed < 0) {
        s.speed += brakeRate * dt;
        s.isBraking = true;
      } else {
        s.speed = Math.min(maxForwardSpeed, s.speed + accelRate * dt);
      }
    } else if (inputState.backward) {
      if (s.speed > 0.5) {
        s.speed = Math.max(0, s.speed - brakeRate * dt);
        s.isBraking = true;
      } else {
        s.speed = Math.max(maxReverseSpeed, s.speed - accelRate * 0.65 * dt);
      }
    } else {
      if (s.speed > 0) {
        s.speed = Math.max(0, s.speed - naturalFriction * dt);
      } else if (s.speed < 0) {
        s.speed = Math.min(0, s.speed + naturalFriction * dt);
      }
    }

    // Handbrake drift physics
    let gripFactor = 1.0;
    if (inputState.handbrake) {
      gripFactor = 0.28;
      s.speed = Math.max(0, s.speed - 12 * dt);
      s.isBraking = true;
    }

    // --- 4. YAW ROTATION & DRIFT ---
    const isMovingBackward = s.speed < -0.5;
    const directionSign = isMovingBackward ? -1 : 1;

    let turnRate = 0;
    if (Math.abs(s.speed) > 0.2) {
      turnRate = s.steerAngle * (Math.abs(s.speed) / 5.5) * directionSign * (tuning.turnMultiplier || 1.0);
      if (inputState.handbrake && Math.abs(s.speed) > 5) {
        turnRate *= 1.85;
      }
    }

    s.angularVelocity = THREE.MathUtils.lerp(s.angularVelocity, turnRate, 9.5 * dt);
    s.rotationY += s.angularVelocity * dt;

    // Drift Detection
    const turningSharp = Math.abs(s.steerAngle) > 0.18;
    const fastEnough = speedKmH > 35;
    const driftTriggered = (inputState.handbrake && fastEnough) || (turningSharp && speedKmH > 65);

    s.isDrifting = driftTriggered && s.isGrounded;
    s.driftIntensity = s.isDrifting ? Math.min(1.0, (speedKmH / 100) * (inputState.handbrake ? 1.4 : 0.8)) : 0;

    if (s.isDrifting) {
      s.driftScore += Math.round(s.driftIntensity * 10);
    }

    // --- 5. POSITION DISPLACEMENT (Zero GC) ---
    m.forwardVec.set(Math.sin(s.rotationY), 0, Math.cos(s.rotationY)).normalize();
    m.rightVec.set(m.forwardVec.z, 0, -m.forwardVec.x);

    const forwardStep = s.speed * dt;
    s.position.x += m.forwardVec.x * forwardStep;
    s.position.z += m.forwardVec.z * forwardStep;

    if (s.isDrifting) {
      const slipAmount = (1.0 - gripFactor) * s.angularVelocity * 0.4 * dt * s.speed;
      s.position.x += m.rightVec.x * slipAmount;
      s.position.z += m.rightVec.z * slipAmount;
    }

    // --- 5.1 CAR-TO-CAR RACING COLLISION (Player vs 6 Rival SLS GT3 Cars) ---
    const raceActive = useGameStore.getState().raceActive;
    const raceFinished = useGameStore.getState().raceFinished;

    if (raceActive || raceFinished) {
      const px = s.position.x;
      const pz = s.position.z;
      const pRot = s.rotationY;
      const pSin = m.forwardVec.x;
      const pCos = m.forwardVec.z;
      const pVx = pSin * s.speed;
      const pVz = pCos * s.speed;

      for (let i = 0; i < rivalCarsSim.length; i++) {
        const rival = rivalCarsSim[i];
        const col = checkCarCollision(
          px, pz, pRot, PLAYER_HALF_LENGTH, PLAYER_HALF_WIDTH,
          rival.x, rival.z, rival.rotY, RIVAL_HALF_LENGTH, RIVAL_HALF_WIDTH
        );

        if (col) {
          // 1. Smooth positional anti-penetration along continuous capsule normal
          s.position.x += col.normalX * col.depth * 0.55;
          s.position.z += col.normalZ * col.depth * 0.55;
          rival.pushX = THREE.MathUtils.clamp(rival.pushX - col.normalX * col.depth * 0.45, -1.6, 1.6);
          rival.pushZ = THREE.MathUtils.clamp(rival.pushZ - col.normalZ * col.depth * 0.45, -1.6, 1.6);
          rival.x -= col.normalX * col.depth * 0.45;
          rival.z -= col.normalZ * col.depth * 0.45;

          // 2. Relative velocity along collision normal
          const rSin = Math.sin(rival.rotY);
          const rCos = Math.cos(rival.rotY);
          const rVx = rSin * rival.speed;
          const rVz = rCos * rival.speed;

          const relVx = pVx - rVx;
          const relVz = pVz - rVz;
          const normalVel = relVx * col.normalX + relVz * col.normalZ;

          // 3. Audio crash feedback (debounced to avoid buzz, never throws)
          const now = performance.now() * 0.001;
          if (now - lastCrashSoundTime.current > 0.16 && normalVel < -1.0) {
            const impactForce = Math.min(2.0, Math.abs(normalVel) / 8.0 + 0.35);
            soundManager.playCrash(impactForce);
            lastCrashSoundTime.current = now;
          }

          if (normalVel < 0) {
            // Semi-elastic collision impulse (Newtonian conservation of momentum)
            const restitution = 0.35;
            const impulse = -(1 + restitution) * normalVel * 0.5;

            // Player car orientation axes
            const pForwardDot = col.normalX * pSin + col.normalZ * pCos;
            const pRightDot = col.normalX * pCos - col.normalZ * pSin;

            // Longitudinal speed adjustment
            // Rear-ending competitor slows player down; being rear-ended gives player a boost
            const deltaPlayerSpeed = impulse * pForwardDot;
            s.speed = Math.max(0, s.speed + deltaPlayerSpeed);

            // Off-center contact torque / lateral steering kick
            const rx = col.contactX - s.position.x;
            const rz = col.contactZ - s.position.z;
            const leverArmLongitudinal = rx * pSin + rz * pCos;
            const lateralImpulse = impulse * pRightDot;
            const torque = leverArmLongitudinal * lateralImpulse;
            s.angularVelocity += THREE.MathUtils.clamp(torque * 0.10, -2.2, 2.2);

            // Contact friction damping
            s.speed *= 0.985;

            // Rival competitor vehicle response
            const rForwardDot = (-col.normalX) * rSin + (-col.normalZ) * rCos;
            const rRightDot = (-col.normalX) * rCos - (-col.normalZ) * rSin;

            rival.speed = THREE.MathUtils.clamp(rival.speed + impulse * rForwardDot, 12, rival.topSpeed + 10);
            rival.targetLaneOffset = THREE.MathUtils.clamp(rival.laneOffset + rRightDot * 0.45, -1.8, 1.8);
          }
        }
      }
    }

    // --- 6. BVH SUSPENSION & MULTI-TIER ROAD/BRIDGE RAYCAST (Zero Array Allocations) ---
    if (cityColliders.length > 0) {
      m.rayOrigin.copy(s.position);
      m.rayOrigin.y += 0.45;
      m.raycaster.set(m.rayOrigin, m.downVec);
      m.raycaster.far = 25.0;

      // Passing m.groundHits and recursive=false eliminates per-frame heap allocations & recursive tree traversals
      m.groundHits.length = 0;
      m.raycaster.intersectObjects(cityColliders, false, m.groundHits);
      const groundHits = m.groundHits;

      let validHit = null;
      for (let i = 0; i < groundHits.length; i++) {
        const h = groundHits[i];
        if (h.normal && h.normal.y > 0.45 && h.point.y <= s.position.y + 0.35) {
          validHit = h;
          break;
        }
      }

      if (validHit) {
        const groundHeight = validHit.point.y;
        const targetY = groundHeight + 0.02;
        const diff = s.position.y - targetY;

        if (diff <= 0.45) {
          s.position.y = THREE.MathUtils.lerp(s.position.y, targetY, 24.0 * dt);
          s.verticalVelocity = 0;
          s.isGrounded = true;

          if (validHit.normal) {
            m.normalVec.copy(validHit.normal);
            const targetPitch = m.normalVec.z * Math.cos(s.rotationY) + m.normalVec.x * Math.sin(s.rotationY);
            s.pitch = THREE.MathUtils.lerp(s.pitch, -targetPitch * 0.4, 10.0 * dt);
          }
        } else {
          s.isGrounded = false;
          s.verticalVelocity -= 22.0 * dt;
          s.position.y += s.verticalVelocity * dt;
          if (s.position.y <= targetY) {
            s.position.y = targetY;
            s.verticalVelocity = 0;
            s.isGrounded = true;
          }
        }
      } else {
        if (s.position.y > 0.0) {
          s.isGrounded = false;
          s.verticalVelocity -= 22.0 * dt;
          s.position.y = Math.max(0.0, s.position.y + s.verticalVelocity * dt);
          if (s.position.y <= 0.0) {
            s.position.y = 0.0;
            s.verticalVelocity = 0;
            s.isGrounded = true;
          }
        } else {
          s.position.y = 0.0;
          s.verticalVelocity = 0;
          s.isGrounded = true;
        }
      }

      // Wall / Building collision
      if (Math.abs(s.speed) > 2) {
        m.wallOrigin.copy(s.position);
        m.wallOrigin.y += 0.85;
        m.checkDir.copy(m.forwardVec);
        if (s.speed < 0) m.checkDir.negate();

        m.wallRaycaster.set(m.wallOrigin, m.checkDir);
        m.wallRaycaster.far = 2.4;

        m.wallHits.length = 0;
        m.wallRaycaster.intersectObjects(cityColliders, false, m.wallHits);
        const wallHits = m.wallHits;

        if (wallHits.length > 0 && wallHits[0].distance < 2.0) {
          const hitNorm = wallHits[0].normal;
          if (hitNorm && Math.abs(hitNorm.y) < 0.55) {
            const dot = m.checkDir.dot(hitNorm);
            if (dot < -0.65) {
              soundManager.playCrash(Math.abs(s.speed) / 25);
              s.speed = -s.speed * 0.25;
              s.position.x += hitNorm.x * 0.35;
              s.position.z += hitNorm.z * 0.35;
            } else {
              soundManager.playCrash(Math.abs(s.speed) / 50);
              s.speed *= 0.8;
              s.position.x += hitNorm.x * 0.2;
              s.position.z += hitNorm.z * 0.2;
            }
          }
        }
      }
    }

    // Completely unlocked open-world city boundary (1600m x 1600m free-roam buffer)
    if (s.position.x < -800) { s.position.x = -795; s.speed = 0; }
    if (s.position.x > 500) { s.position.x = 495; s.speed = 0; }
    if (s.position.z < -900) { s.position.z = -895; s.speed = 0; }
    if (s.position.z > 400) { s.position.z = 395; s.speed = 0; }

    // Wheel rotation
    const wheelCircumference = 2 * Math.PI * 0.36;
    s.wheelRotation += (s.speed * dt / wheelCircumference) * Math.PI * 2;

    // Automatic Gears & RPM
    let gear = 1;
    let gearMaxSpeed = 10;
    if (s.speed < -0.1) {
      gear = 'R';
    } else {
      if (speedKmH < 45) { gear = 1; gearMaxSpeed = 45; }
      else if (speedKmH < 85) { gear = 2; gearMaxSpeed = 85; }
      else if (speedKmH < 125) { gear = 3; gearMaxSpeed = 125; }
      else if (speedKmH < 165) { gear = 4; gearMaxSpeed = 165; }
      else if (speedKmH < 205) { gear = 5; gearMaxSpeed = 205; }
      else { gear = 6; gearMaxSpeed = 270; }
    }

    let rpm = 900;
    if (gear === 'R') {
      rpm = 900 + (Math.abs(speedKmH) / 50) * 5500;
    } else {
      const gearMin = gear === 1 ? 0 : [0, 0, 45, 85, 125, 165, 205][gear];
      const normGearSpeed = Math.max(0, Math.min(1, (speedKmH - gearMin) / (gearMaxSpeed - gearMin)));
      rpm = 900 + normGearSpeed * 6800 + (inputState.forward ? 300 : 0);
    }
    s.rpm = Math.min(8000, Math.max(900, rpm));
    if (s.currentGear !== gear && s.currentGear !== 'R' && gear !== 'R' && gear > s.currentGear && speedKmH > 25) {
      soundManager.playGearShift();
    }
    s.currentGear = gear;

    // Apply Transforms to 3D Car Root
    if (carGroup.current) {
      carGroup.current.position.copy(s.position);
      carGroup.current.rotation.set(s.pitch, s.rotationY, 0, 'YXZ');
    }

    // Sound Engine Update
    soundManager.updateEngine(s.rpm, inputState.forward, speedKmH);
    soundManager.updateDrift(s.isDrifting, s.driftIntensity);
    soundManager.updateNitro(s.isNitroActive);

    // Update Store Telemetry in-place (Zero new Array allocations per frame)
    const st = useGameStore.getState();
    st.carPosition[0] = s.position.x;
    st.carPosition[1] = s.position.y;
    st.carPosition[2] = s.position.z;

    useGameStore.setState({
      speed: Math.round(speedKmH),
      rpm: Math.round(s.rpm),
      gear: String(s.currentGear),
      steerAngle: s.steerAngle,
      nitro: Math.round(s.nitro),
      isNitroActive: s.isNitroActive,
      isDrifting: s.isDrifting,
      driftScore: s.driftScore,
      carRotation: s.rotationY
    });
  });

  return (
    <group ref={carGroup} position={[SPAWN_POS.x, SPAWN_POS.y, SPAWN_POS.z]}>
      <CarModel
        steerAngle={state.current.steerAngle}
        wheelRotation={state.current.wheelRotation}
        isBraking={state.current.isBraking}
        isNitroActive={state.current.isNitroActive}
        isDrifting={state.current.isDrifting}
        headlightsOn={headlights}
      />
    </group>
  );
}
