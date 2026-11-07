import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { inputState } from './Car';

export function CameraRig() {
  const cameraMode = useGameStore((s) => s.cameraMode);
  const isNitroActive = useGameStore((s) => s.isNitroActive);
  const speed = useGameStore((s) => s.speed);

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
  const orbit = useRef({
    yaw: 0,             // Horizontal rotation offset around car (radians)
    pitch: 0,           // Vertical elevation offset (radians)
    distance: 4.7,      // Current smoothed distance (closer, intimate framing)
    targetDist: 4.7,    // Target distance (from wheel/pinch)
    isDragging: false,
    lastInteractionTime: 0,
    prevX: 0,
    prevY: 0,
    activeTouches: new Map(),
    initialPinchDist: 0,
    initialPinchTargetDist: 4.7
  });

  // Setup Mouse, Wheel, and Touch Listeners on Canvas
  useEffect(() => {
    const dom = gl.domElement;
    if (!dom) return;

    dom.style.touchAction = 'none';

    // Pointer Down (Mouse click or touch start)
    const onPointerDown = (e) => {
      // Ignore if clicking on UI overlay buttons
      if (e.target !== dom && !dom.contains(e.target)) return;

      orbit.current.activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (orbit.current.activeTouches.size === 1) {
        orbit.current.isDragging = true;
        orbit.current.prevX = e.clientX;
        orbit.current.prevY = e.clientY;
        orbit.current.lastInteractionTime = performance.now();
      } else if (orbit.current.activeTouches.size === 2) {
        // Pinch zoom start
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

        // Yaw & Pitch Orbit Sensitivity (natural intuitive drag: right->right, up->tilt up/look up)
        const yawSensitivity = 0.0055;
        const pitchSensitivity = 0.0045;

        orbit.current.yaw -= dx * yawSensitivity;
        orbit.current.pitch = THREE.MathUtils.clamp(
          orbit.current.pitch + dy * pitchSensitivity,
          -0.45, // Min low-angle limit (just above ground)
          0.95   // Max high-angle bird's eye view
        );

        orbit.current.lastInteractionTime = performance.now();
      } else if (orbit.current.activeTouches.size === 2) {
        // Multi-touch pinch zoom
        const touches = Array.from(orbit.current.activeTouches.values());
        const currentPinchDist = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y);
        if (orbit.current.initialPinchDist > 0) {
          const ratio = orbit.current.initialPinchDist / Math.max(1, currentPinchDist);
          orbit.current.targetDist = THREE.MathUtils.clamp(
            orbit.current.initialPinchTargetDist * ratio,
            1.8,
            10.0
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
        10.0
      );
      orbit.current.lastInteractionTime = performance.now();
    };

    // Double-click to instantly re-center rear view
    const onDblClick = () => {
      orbit.current.yaw = 0;
      orbit.current.pitch = 0;
      const defaultDist = cameraMode === 'action' ? 3.6 : cameraMode === 'cockpit' ? 0.28 : 4.7;
      orbit.current.targetDist = defaultDist;
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

  // Main 60-120 FPS Camera Dynamics Loop
  useFrame((_, delta) => {
    if (cameraMode === 'free') return;

    const dt = Math.min(delta, 0.05);
    const m = math.current;
    const orb = orbit.current;
    const { carPosition, carRotation } = useGameStore.getState();

    m.carPosVec.set(carPosition[0], carPosition[1], carPosition[2]);

    // Camera Profile Base Defaults (closer, intimate framing)
    let defaultDist = 4.7;
    let baseHeight = 1.45;
    let baseFov = 56;
    let lookHeight = 0.85;

    if (cameraMode === 'action') {
      defaultDist = 3.6;
      baseHeight = 1.15;
      baseFov = 60;
      lookHeight = 0.75;
    } else if (cameraMode === 'cockpit') {
      defaultDist = 0.28;
      baseHeight = 0.80;
      baseFov = 72;
      lookHeight = 0.75;
    }

    // --- AUTO-RECENTER LOGIC WHEN DRIVING ---
    const now = performance.now();
    const timeSinceInteract = (now - orb.lastInteractionTime) / 1000;
    const speedKmH = Math.abs(speed);
    const isDrivingInput =
      inputState.forward || inputState.backward || inputState.left || inputState.right;
    const isDriving = speedKmH > 2.5 || isDrivingInput;

    // Smoothly return camera directly behind car if driving and user is not actively dragging
    if (!orb.isDragging && isDriving && timeSinceInteract > 0.3) {
      // Shortest angular difference to 0 (avoids 360 wrap-around spins)
      const yawDiff = Math.atan2(Math.sin(orb.yaw), Math.cos(orb.yaw));
      // Re-center faster as vehicle speed increases
      const returnSpeed = 3.2 + Math.min(speedKmH / 30, 4.5);

      orb.yaw = THREE.MathUtils.lerp(yawDiff, 0, returnSpeed * dt);
      orb.pitch = THREE.MathUtils.lerp(orb.pitch, 0, 3.8 * dt);
      orb.targetDist = THREE.MathUtils.lerp(orb.targetDist, defaultDist, 3.2 * dt);
    }

    // Smooth Distance Zoom Lerp
    orb.distance = THREE.MathUtils.lerp(orb.distance, orb.targetDist, 10.0 * dt);

    // Compute 3D Orbit Coordinates Around the Car
    // carRotation: forward is along +Z when rotation = 0; rear is +Math.PI
    const camAzimuth = carRotation + Math.PI + orb.yaw;
    const camElevation = orb.pitch;

    const horizDist = orb.distance * Math.cos(camElevation);
    const vertDist = orb.distance * Math.sin(camElevation);

    // Camera 3D Position with Ground Clip Protection (always above ground)
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

    // Dynamic FOV kick on high speed & boost (subtle so car stays close and prominent!)
    const speedRatio = Math.min(1.0, speed / 240);
    const targetFov = baseFov + speedRatio * 3.5 + (isNitroActive ? 2.5 : 0);
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 6.0 * dt);
    camera.updateProjectionMatrix();

    // High-speed camera follow tightness (eliminates rubber-band camera lag/stretch!)
    // At higher speeds, tracking tightens so car never pulls away from camera
    const speedFactor = Math.min(1.0, speedKmH / 160);
    const baseCamLerp = 14.0 + speedFactor * 14.0; // 14.0 at stop -> 28.0 at top speed!
    const baseLookLerp = 18.0 + speedFactor * 12.0;

    const camLerpSpeed = cameraMode === 'cockpit' ? 30.0 : orb.isDragging ? 22.0 : baseCamLerp;
    const lookLerpSpeed = cameraMode === 'cockpit' ? 30.0 : orb.isDragging ? 24.0 : baseLookLerp;

    currentCamPos.current.lerp(m.targetCamPos, camLerpSpeed * dt);
    currentLookAt.current.lerp(m.targetLookAt, lookLerpSpeed * dt);

    camera.position.copy(currentCamPos.current);
    camera.lookAt(currentLookAt.current);
  });

  if (cameraMode === 'free') {
    const carPos = useGameStore.getState().carPosition;
    return <OrbitControls target={[carPos[0], carPos[1] + 1, carPos[2]]} enableDamping />;
  }

  return null;
}
