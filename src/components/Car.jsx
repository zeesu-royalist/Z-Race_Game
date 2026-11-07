import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { CarModel } from './CarModel';
import { soundManager } from '../utils/AudioSystem';
import { cityColliders } from './CityMap';

// Virtual keyboard & touch input tracker
export const inputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  handbrake: false,
  nitro: false
};

// Spawn location: Dead Center of Main Boulevard (x: 10, y: 0.3, z: -5.4), facing +X down the road
const SPAWN_POS = new THREE.Vector3(10, 0.3, -5.4);
const SPAWN_ROT_Y = Math.PI / 2;

export function Car() {
  const carGroup = useRef();

  // Zustand state hooks (event-driven)
  const resetSignal = useGameStore((s) => s.resetSignal);
  const headlights = useGameStore((s) => s.headlights);
  const soundEnabled = useGameStore((s) => s.soundEnabled);

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
    checkDir: new THREE.Vector3()
  });

  // Setup Keyboard Listeners
  useEffect(() => {
    const onKeyDown = (e) => {
      soundManager.init();

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

    // Read active car tuning parameters
    const tuning = useGameStore.getState().carTuning || {
      maxSpeed: 64,
      accelRate: 19,
      gripFactor: 0.9,
      turnMultiplier: 1.0
    };

    // --- 3. ACCELERATION & BRAKING ---
    const maxForwardSpeed = (tuning.maxSpeed || 64) * nitroMultiplier;
    const maxReverseSpeed = -15;
    const accelRate = (tuning.accelRate || 19) * nitroMultiplier;
    const brakeRate = 34;
    const naturalFriction = 3.6;

    s.isBraking = false;

    if (inputState.forward) {
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
      const driftPoints = Math.round(s.driftIntensity * 10);
      useGameStore.getState().addDriftScore(driftPoints);
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

    // --- 6. BVH SUSPENSION & OBSTACLE RAYCAST ---
    if (cityColliders.length > 0) {
      m.rayOrigin.copy(s.position);
      m.rayOrigin.y += 2.5;
      m.raycaster.set(m.rayOrigin, m.downVec);
      m.raycaster.far = 12.0;

      const groundHits = m.raycaster.intersectObjects(cityColliders, true);

      if (groundHits.length > 0) {
        const hit = groundHits[0];
        const groundHeight = hit.point.y;
        const targetY = groundHeight + 0.02;

        if (s.position.y <= targetY + 0.35) {
          s.position.y = THREE.MathUtils.lerp(s.position.y, targetY, 20.0 * dt);
          s.verticalVelocity = 0;
          s.isGrounded = true;

          if (hit.normal) {
            m.normalVec.copy(hit.normal);
            const targetPitch = m.normalVec.z * Math.cos(s.rotationY) + m.normalVec.x * Math.sin(s.rotationY);
            s.pitch = THREE.MathUtils.lerp(s.pitch, -targetPitch * 0.4, 10.0 * dt);
          }
        } else {
          s.isGrounded = false;
          s.verticalVelocity -= 22.0 * dt;
          s.position.y += s.verticalVelocity * dt;
        }
      } else {
        if (s.position.y > 0.05) {
          s.verticalVelocity -= 22.0 * dt;
          s.position.y = Math.max(0.05, s.position.y + s.verticalVelocity * dt);
        } else {
          s.position.y = 0.05;
          s.verticalVelocity = 0;
          s.isGrounded = true;
        }
      }

      // Wall / Building collision
      if (Math.abs(s.speed) > 2) {
        m.wallOrigin.copy(s.position);
        m.wallOrigin.y += 0.5;
        m.checkDir.copy(m.forwardVec);
        if (s.speed < 0) m.checkDir.negate();

        m.wallRaycaster.set(m.wallOrigin, m.checkDir);
        m.wallRaycaster.far = 2.4;

        const wallHits = m.wallRaycaster.intersectObjects(cityColliders, true);
        if (wallHits.length > 0 && wallHits[0].distance < 2.2) {
          const hitNorm = wallHits[0].normal;
          if (hitNorm && Math.abs(hitNorm.y) < 0.6) {
            soundManager.playCrash(Math.abs(s.speed) / 25);
            s.speed = -s.speed * 0.35;
            s.position.x += hitNorm.x * 0.3;
            s.position.z += hitNorm.z * 0.3;
          }
        }
      }
    }

    // Safety boundary clamp (850m x 816m world)
    if (s.position.x < -645) { s.position.x = -640; s.speed = 0; }
    if (s.position.x > 175) { s.position.x = 170; s.speed = 0; }
    if (s.position.z < -260) { s.position.z = -255; s.speed = 0; }
    if (s.position.z > 530) { s.position.z = 525; s.speed = 0; }

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

    // Update Store (Reads directly via getState / subscribe, avoids React render cycle)
    useGameStore.setState({
      speed: Math.round(speedKmH),
      rpm: Math.round(s.rpm),
      gear: String(s.currentGear),
      steerAngle: s.steerAngle,
      nitro: Math.round(s.nitro),
      isNitroActive: s.isNitroActive,
      isDrifting: s.isDrifting,
      carPosition: [s.position.x, s.position.y, s.position.z],
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
