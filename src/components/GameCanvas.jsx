import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { CityMap } from './CityMap';
import { Car } from './Car';
import { CameraRig } from './CameraRig';
import { RacingSystem } from './RacingSystem';

function LoadingScreen() {
  return (
    <Html center>
      <div className="loading-card">
        <div className="loading-spinner"></div>
        <div className="loading-title">LOADING 3D CITY</div>
        <div className="loading-subtitle">Preparing optimized roads & collision engine...</div>
      </div>
    </Html>
  );
}

function EnvironmentLights() {
  const timeOfDay = useGameStore((s) => s.timeOfDay);

  if (timeOfDay === 'sunset') {
    return (
      <>
        <Sky
          distance={450000}
          sunPosition={[200, 15, 60]}
          turbidity={8}
          rayleigh={5}
          mieCoefficient={0.005}
          mieDirectionalG={0.85}
        />
        <ambientLight intensity={0.55} color="#ffd4a3" />
        <directionalLight
          position={[180, 70, 70]}
          intensity={2.6}
          color="#ff9944"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-near={1}
          shadow-camera-far={400}
          shadow-camera-left={-70}
          shadow-camera-right={70}
          shadow-camera-top={70}
          shadow-camera-bottom={-70}
          shadow-bias={-0.00015}
        />
        <hemisphereLight skyColor="#ff9955" groundColor="#332211" intensity={0.65} />
        <fog attach="fog" args={['#a85c42', 80, 750]} />
      </>
    );
  }

  if (timeOfDay === 'night') {
    return (
      <>
        <color attach="background" args={['#06080e']} />
        <ambientLight intensity={0.22} color="#4466aa" />
        <directionalLight
          position={[70, 100, 70]}
          intensity={0.5}
          color="#99bbff"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.00015}
        />
        <hemisphereLight skyColor="#0c1626" groundColor="#050608" intensity={0.3} />
        <fog attach="fog" args={['#070a12', 40, 500]} />
      </>
    );
  }

  // Day (Default)
  return (
    <>
      <Sky
        distance={450000}
        sunPosition={[120, 80, 100]}
        turbidity={4}
        rayleigh={1.2}
        mieCoefficient={0.002}
        mieDirectionalG={0.8}
      />
      <ambientLight intensity={0.75} color="#ffffff" />
      <directionalLight
        position={[120, 140, 90]}
        intensity={2.8}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={420}
        shadow-camera-left={-75}
        shadow-camera-right={75}
        shadow-camera-top={75}
        shadow-camera-bottom={-75}
        shadow-bias={-0.00015}
      />
      <hemisphereLight skyColor="#87ceeb" groundColor="#3a4042" intensity={0.65} />
      <fog attach="fog" args={['#b8d8ea', 120, 850]} />
    </>
  );
}

export function GameCanvas() {
  return (
    <Canvas
      shadows={{ type: THREE.PCFSoftShadowMap }}
      dpr={[1, 1.5]}
      camera={{ position: [10, 5, -20], fov: 62, near: 0.1, far: 2000 }}
      gl={{
        antialias: true,
        stencil: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.15
      }}
    >
      <EnvironmentLights />
      <Suspense fallback={<LoadingScreen />}>
        <CityMap />
        <Car />
        <RacingSystem />
      </Suspense>
      <CameraRig />
    </Canvas>
  );
}
