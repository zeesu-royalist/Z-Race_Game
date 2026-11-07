import React, { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

// Extend THREE with three-mesh-bvh
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

// Shared array of meshes used for car wheel raycasting and chassis collision
export const cityColliders = [];

export function CityMap() {
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

  return (
    <group ref={cityRef}>
      {/* 3D City GLB Model */}
      <primitive object={scene} />

      {/* Safety Floor below the city (prevents falling through if off-road) */}
      <mesh position={[-235, -2, 135]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1400, 1400]} />
        <meshStandardMaterial color="#0e1318" roughness={0.9} />
      </mesh>
    </group>
  );
}

useGLTF.preload('/city-models/terrain_retextured.glb');
