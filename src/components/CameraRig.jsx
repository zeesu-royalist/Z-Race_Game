import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';

export function CameraRig() {
  const cameraMode = useGameStore((s) => s.cameraMode);
  const isNitroActive = useGameStore((s) => s.isNitroActive);
  const speed = useGameStore((s) => s.speed);

  const { camera } = useThree();

  // Internal smooth tracking vectors (Zero GC allocations in useFrame)
  const currentCamPos = useRef(new THREE.Vector3(10, 5, -20));
  const currentLookAt = useRef(new THREE.Vector3(10, 0.5, -9));
  const math = useRef({
    carPosVec: new THREE.Vector3(),
    forwardVec: new THREE.Vector3(),
    targetCamPos: new THREE.Vector3(),
    targetLookAt: new THREE.Vector3()
  });

  useFrame((_, delta) => {
    if (cameraMode === 'free') return;

    const dt = Math.min(delta, 0.05);
    const m = math.current;
    const { carPosition, carRotation } = useGameStore.getState();

    m.carPosVec.set(carPosition[0], carPosition[1], carPosition[2]);

    // Forward direction of the car
    m.forwardVec.set(
      Math.sin(carRotation),
      0,
      Math.cos(carRotation)
    ).normalize();

    let baseFov = 62;

    if (cameraMode === 'chase') {
      const backDist = 7.2;
      const height = 2.4;
      m.targetCamPos.copy(m.carPosVec)
        .addScaledVector(m.forwardVec, -backDist)
        .add({ x: 0, y: height, z: 0 });

      m.targetLookAt.copy(m.carPosVec)
        .add({ x: 0, y: 1.2, z: 0 })
        .addScaledVector(m.forwardVec, 4);
    } else if (cameraMode === 'action') {
      const backDist = 5.2;
      const height = 1.6;
      m.targetCamPos.copy(m.carPosVec)
        .addScaledVector(m.forwardVec, -backDist)
        .add({ x: 0, y: height, z: 0 });

      m.targetLookAt.copy(m.carPosVec)
        .add({ x: 0, y: 0.9, z: 0 })
        .addScaledVector(m.forwardVec, 5);
      baseFov = 68;
    } else if (cameraMode === 'cockpit') {
      m.targetCamPos.copy(m.carPosVec)
        .addScaledVector(m.forwardVec, 0.4)
        .add({ x: 0, y: 0.92, z: 0 });

      m.targetLookAt.copy(m.carPosVec)
        .addScaledVector(m.forwardVec, 15)
        .add({ x: 0, y: 0.8, z: 0 });
      baseFov = 75;
    }

    // Dynamic FOV kick on high speed & boost
    const speedRatio = Math.min(1.0, speed / 240);
    const targetFov = baseFov + speedRatio * 10 + (isNitroActive ? 8 : 0);
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 6.0 * dt);
    camera.updateProjectionMatrix();

    // Cinematic damped tracking
    const camLerpSpeed = cameraMode === 'cockpit' ? 28.0 : 8.5;
    const lookLerpSpeed = cameraMode === 'cockpit' ? 28.0 : 12.0;

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
