import React, { useMemo, useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { useGameStore } from '../store/gameStore';

// Extend THREE with three-mesh-bvh
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

// Shared array of meshes used for car wheel raycasting and chassis collision
export const cityColliders = [];

export function CityMap() {
  const timeOfDay = useGameStore((s) => s.timeOfDay);
  const { scene } = useGLTF('/city-models/terrain_retextured.glb');
  const cityRef = useRef();

  useEffect(() => {
    cityColliders.length = 0; // Clear previous

    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        // Freeze static transformations so Three.js does not re-compute matrices every frame
        child.matrixAutoUpdate = false;
        child.updateMatrix();

        // Optimize materials & textures
        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((mat) => {
            if (mat.map) {
              mat.map.colorSpace = THREE.SRGBColorSpace;
              mat.map.anisotropy = 4; // High visual quality without memory penalty
            }
            if (mat.normalMap) {
              mat.normalMap.anisotropy = 4;
            }
            // Fix alpha sorting for cutouts
            if (mat.name && (mat.name.includes('alpha') || mat.name.includes('cutout'))) {
              mat.alphaTest = 0.5;
              mat.depthWrite = true;
            }
          });
        }

        // Build BVH for ultra fast raycasts (suspension & collision)
        if (child.geometry) {
          try {
            if (!child.geometry.boundsTree) {
              child.geometry.computeBoundsTree({
                maxLeafTris: 15
              });
            }
            cityColliders.push(child);
          } catch (e) {
            console.warn('BVH computation skipped for mesh:', child.name, e);
          }
        }
      }
    });

    console.log(`[Z-Race] City loaded & optimized with ${cityColliders.length} collision meshes.`);
  }, [scene]);

  // Streetlights along the main boulevard (flanking road center at z: -5.4)
  const streetLightPositions = useMemo(() => {
    const list = [];
    for (let x = -400; x <= 140; x += 70) {
      list.push([x, 8, -15]);
      list.push([x, 8, 4]);
    }
    return list;
  }, []);

  const isDark = timeOfDay === 'night' || timeOfDay === 'sunset';

  return (
    <group ref={cityRef}>
      {/* 3D City GLB Model */}
      <primitive object={scene} />

      {/* Safety Floor below the city (prevents falling through if off-road) */}
      <mesh position={[-235, -2, 135]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1400, 1400]} />
        <meshStandardMaterial color="#0e1318" roughness={0.9} />
      </mesh>

      {/* Starting Grid Line Decal dead center on the road */}
      <group position={[10, 0.05, -5.4]}>
        {/* Checkered Start Line */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[2.5, 9.5]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.1} />
        </mesh>
        {/* Yellow Grid Marks */}
        {[-3, 0, 3].map((offsetZ, i) => (
          <mesh key={i} position={[0, 0.01, offsetZ]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[2.0, 0.35]} />
            <meshStandardMaterial color="#ffcc00" emissive="#ffaa00" emissiveIntensity={0.3} />
          </mesh>
        ))}
        {/* Start Line Gantry */}
        <group position={[0, 0, 0]}>
          <mesh position={[0, 4, -5.5]} castShadow>
            <cylinderGeometry args={[0.2, 0.2, 8]} />
            <meshStandardMaterial color="#222" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 4, 5.5]} castShadow>
            <cylinderGeometry args={[0.2, 0.2, 8]} />
            <meshStandardMaterial color="#222" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 8, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.18, 0.18, 11.4]} />
            <meshStandardMaterial color="#333" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 7.2, 0]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[0.2, 1.4, 9]} />
            <meshStandardMaterial
              color="#0d1b2a"
              emissive="#00f0ff"
              emissiveIntensity={isDark ? 0.6 : 0.2}
            />
          </mesh>
        </group>
      </group>

      {/* Optimized Streetlights (render light instances only at night) */}
      {isDark && (
        <group>
          {streetLightPositions.map((pos, idx) => (
            <group key={idx} position={pos}>
              <mesh position={[0, -4, 0]}>
                <cylinderGeometry args={[0.1, 0.15, 8]} />
                <meshStandardMaterial color="#2c3437" metalness={0.8} />
              </mesh>
              <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.28, 12, 12]} />
                <meshBasicMaterial color="#ffe8aa" />
              </mesh>
              {timeOfDay === 'night' && idx % 3 === 0 && (
                <pointLight
                  position={[0, -0.5, 0]}
                  color="#ffe8aa"
                  intensity={14}
                  distance={25}
                  decay={2}
                />
              )}
            </group>
          ))}
        </group>
      )}
    </group>
  );
}

useGLTF.preload('/city-models/terrain_retextured.glb');
