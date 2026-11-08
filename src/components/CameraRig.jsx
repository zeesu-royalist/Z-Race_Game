import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { inputState } from './Car';

// 3 Dedicated Camera Angles:
// 1st: Initial Close
// 2nd: Thoda Dur
// 3rd: Thoda Uper Se Thoda Dur (High Angle)
export function getCameraDefaults(mode) {
  if (mode === 'far') {
    return { dist: 6.8, height: 1.85, fov: 58, lookHeight: 0.95 };
  }
  if (mode === 'aerial') {
    return { dist: 8.6, height: 3.4, fov: 60, lookHeight: 0.65 };
  }
  return { dist: 4.7, height: 1.45, fov: 56, lookHeight: 0.85 };
}

export function CameraRig() {
  // Only subscribe to cameraMode so React NEVER re-renders CameraRig during driving/racing
  const cameraMode = useGameStore((s) => s.cameraMode);

  const { camera, gl } = useThree();

  // Internal smooth tracking vectors (Zero GC allocations in useFrame)
  const currentCamPos = useRef(new THREE.Vector3(-3, 3, -5));
  const currentLookAt = useRef(new THREE.Vector3(-3, 1, 15));
  const math = useRef({
    carPosVec: new THREE.Vector3(),
    targetCamPos: new THREE.Vector3(),
    targetLookAt: new THREE.Vector3()
  });

  // Interactive Mouse / Touch Orbit & Zoom State
  const initialCfg = getCameraDefaults(cameraMode);
  const orbit = useRef({
    yaw: 0,
    pitch: 0,
    distance: initialCfg.dist,
    targetDist: initialCfg.dist,
    isDragging: false,
    lastInteractionTime: 0,
    prevX: 0,
    prevY: 0,
    activeTouches: new Map(),
    initialPinchDist: 0,
    initialPinchTargetDist: initialCfg.dist
  });

  // Smoothly glide target distance when cycling camera angles (Close / Far / Aerial)
  useEffect(() => {
    const cfg = getCameraDefaults(cameraMode);
    orbit.current.targetDist = cfg.dist;
  }, [cameraMode]);

  // Setup Mouse, Wheel, and Touch Listeners on Canvas
  useEffect(() => {
    const dom = gl.domElement;
    if (!dom) return;

    dom.style.touchAction = 'none';

    // Pointer Down (Mouse click or touch start)
    const onPointerDown = (e) => {
      if (e.target !== dom && !dom.contains(e.target)) return;

      orbit.current.activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (orbit.current.activeTouches.size === 1) {
        orbit.current.isDragging = true;
        orbit.current.prevX = e.clientX;
        orbit.current.prevY = e.clientY;
        orbit.current.lastInteractionTime = performance.now();
      } else if (orbit.current.activeTouches.size === 2) {
        const touches = Array.from(orbit.current.activeTouches.values());
        orbit.current.initialPinchDist = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y);
        orbit.current.initialPinchTargetDist = orbit.current.targetDist;
      }
    };

    // Pointer Move (Mouse drag or touch drag)
    const onPointerMove = (e) => {
      if (!orbit.current.isDragging && orbit.current.activeTouches.size === 0) return;

      if (orbit.current.activeTouches.has(e.pointerId)) {
        orbit.current.activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      if (orbit.current.activeTouches.size === 1 && orbit.current.isDragging) {
        const dx = e.clientX - orbit.current.prevX;
        const dy = e.clientY - orbit.current.prevY;
        orbit.current.prevX = e.clientX;
        orbit.current.prevY = e.clientY;

        const yawSensitivity = 0.0055;
        const pitchSensitivity = 0.0045;

        orbit.current.yaw -= dx * yawSensitivity;
        orbit.current.pitch = THREE.MathUtils.clamp(
          orbit.current.pitch + dy * pitchSensitivity,
          -0.45,
          0.95
        );

        orbit.current.lastInteractionTime = performance.now();
      } else if (orbit.current.activeTouches.size === 2) {
        const touches = Array.from(orbit.current.activeTouches.values());
        const currentPinchDist = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y);
        if (orbit.current.initialPinchDist > 0) {
          const ratio = orbit.current.initialPinchDist / Math.max(1, currentPinchDist);
          orbit.current.targetDist = THREE.MathUtils.clamp(
            orbit.current.initialPinchTargetDist * ratio,
            1.8,
            12.0
          );
          orbit.current.lastInteractionTime = performance.now();
        }
      }
    };

    // Pointer Up / Cancel
    const onPointerUp = (e) => {
      orbit.current.activeTouches.delete(e.pointerId);
      if (orbit.current.activeTouches.size === 0) {
        orbit.current.isDragging = false;
        orbit.current.lastInteractionTime = performance.now();
      } else if (orbit.current.activeTouches.size === 1) {
        const remaining = Array.from(orbit.current.activeTouches.values())[0];
        orbit.current.prevX = remaining.x;
        orbit.current.prevY = remaining.y;
      }
    };

    // Mouse Wheel Zoom In / Out
    const onWheel = (e) => {
      e.preventDefault();
      const zoomStep = e.deltaY > 0 ? 1.10 : 0.90;
      orbit.current.targetDist = THREE.MathUtils.clamp(
        orbit.current.targetDist * zoomStep,
        1.8,
        12.0
      );
      orbit.current.lastInteractionTime = performance.now();
    };

    // Double-click to instantly re-center rear view
    const onDblClick = () => {
      orbit.current.yaw = 0;
      orbit.current.pitch = 0;
      const cfg = getCameraDefaults(cameraMode);
      orbit.current.targetDist = cfg.dist;
    };

    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('dblclick', onDblClick);

    return () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('dblclick', onDblClick);
    };
  }, [gl, cameraMode]);

  // Main 60-120 FPS Camera Dynamics Loop (Zero React overhead)
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const m = math.current;
    const orb = orbit.current;
    const { carPosition, carRotation, speed, isNitroActive } = useGameStore.getState();

    m.carPosVec.set(carPosition[0], carPosition[1], carPosition[2]);

    const camCfg = getCameraDefaults(cameraMode);
    const defaultDist = camCfg.dist;
    const baseHeight = camCfg.height;
    const baseFov = camCfg.fov;
    const lookHeight = camCfg.lookHeight;

    // --- AUTO-RECENTER LOGIC WHEN DRIVING ---
    const now = performance.now();
    const timeSinceInteract = (now - orb.lastInteractionTime) / 1000;
    const speedKmH = Math.abs(speed);
    const isDrivingInput =
      inputState.forward || inputState.backward || inputState.left || inputState.right;
    const isDriving = speedKmH > 2.5 || isDrivingInput;

    if (!orb.isDragging && isDriving && timeSinceInteract > 0.3) {
      const yawDiff = Math.atan2(Math.sin(orb.yaw), Math.cos(orb.yaw));
      const returnSpeed = 3.2 + Math.min(speedKmH / 30, 4.5);

      orb.yaw = THREE.MathUtils.lerp(yawDiff, 0, returnSpeed * dt);
      orb.pitch = THREE.MathUtils.lerp(orb.pitch, 0, 3.8 * dt);
      orb.targetDist = THREE.MathUtils.lerp(orb.targetDist, defaultDist, 3.2 * dt);
    }

    // Smooth Distance Zoom Lerp
    orb.distance = THREE.MathUtils.lerp(orb.distance, orb.targetDist, 10.0 * dt);

    // Compute 3D Orbit Coordinates Around the Car
    const camAzimuth = carRotation + Math.PI + orb.yaw;
    const camElevation = orb.pitch;

    const horizDist = orb.distance * Math.cos(camElevation);
    const vertDist = orb.distance * Math.sin(camElevation);

    // Camera 3D Position with Ground Clip Protection
    const desiredY = m.carPosVec.y + baseHeight + vertDist;
    const clampedY = Math.max(m.carPosVec.y + 0.35, desiredY);

    m.targetCamPos.set(
      m.carPosVec.x + horizDist * Math.sin(camAzimuth),
      clampedY,
      m.carPosVec.z + horizDist * Math.cos(camAzimuth)
    );

    // Target Look-At Point on the Car
    m.targetLookAt.set(
      m.carPosVec.x + 0.3 * Math.sin(carRotation),
      m.carPosVec.y + lookHeight + Math.max(0, vertDist * 0.2),
      m.carPosVec.z + 0.3 * Math.cos(carRotation)
    );

    // Dynamic FOV kick on high speed & boost
    const speedRatio = Math.min(1.0, speed / 240);
    const targetFov = baseFov + speedRatio * 3.5 + (isNitroActive ? 2.5 : 0);
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 6.0 * dt);
    camera.updateProjectionMatrix();

    // High-speed camera follow tightness
    const speedFactor = Math.min(1.0, speedKmH / 160);
    const baseCamLerp = 14.0 + speedFactor * 14.0;
    const baseLookLerp = 18.0 + speedFactor * 12.0;

    const camLerpSpeed = orb.isDragging ? 22.0 : baseCamLerp;
    const lookLerpSpeed = orb.isDragging ? 24.0 : baseLookLerp;

    currentCamPos.current.lerp(m.targetCamPos, camLerpSpeed * dt);
    currentLookAt.current.lerp(m.targetLookAt, lookLerpSpeed * dt);

    camera.position.copy(currentCamPos.current);
    camera.lookAt(currentLookAt.current);
  });

  return null;
}
