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
  const floorRef = useRef();

  useEffect(() => {
    cityColliders.length = 0; // Clear previous
    const maxAnisotropy = 2;

    scene.traverse((child) => {
      if (child.isMesh) {
        // City meshes only RECEIVE shadows from the car.
        // Disabling castShadow on static city meshes eliminates hundreds of costly shadow map draw calls!
        child.castShadow = false;
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
              mat.map.anisotropy = maxAnisotropy;
            }
            if (mat.normalMap) {
              mat.normalMap.anisotropy = maxAnisotropy;
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
            if (!child.geometry.boundingSphere) {
              child.geometry.computeBoundingSphere();
            }
            cityColliders.push(child);
          } catch (e) {
            console.warn('BVH computation skipped for mesh:', child.name, e);
          }
        }
      }
    });

    // Add expansive 3.2km safety ground to colliders for 100% gap-free open-world driving
    if (floorRef.current && floorRef.current.geometry) {
      try {
        if (!floorRef.current.geometry.boundsTree) {
          floorRef.current.geometry.computeBoundsTree({ maxLeafTris: 15 });
        }
        if (!floorRef.current.geometry.boundingSphere) {
          floorRef.current.geometry.computeBoundingSphere();
        }
        cityColliders.push(floorRef.current);
      } catch (e) {
        console.warn('BVH computation skipped for safety floor:', e);
      }
    }

    console.log(`[Z-Race] City loaded & optimized with ${cityColliders.length} collision meshes across open world.`);
  }, [scene]);

  return (
    <group ref={cityRef}>
      {/* 3D City GLB Model (X: -542m to +273m, Z: -660m to +188m) */}
      <primitive object={scene} />

      {/* Fully unlocked open-world ground base centered at city center (-135m, -240m) spanning 3200m */}
      <mesh
        ref={floorRef}
        position={[-135, -0.05, -240]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[3200, 3200]} />
        <meshStandardMaterial color="#11161d" roughness={0.88} metalness={0.12} />
      </mesh>
    </group>
  );
}

useGLTF.preload('/city-models/terrain_retextured.glb');
