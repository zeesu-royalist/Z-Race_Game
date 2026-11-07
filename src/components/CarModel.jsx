import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useGameStore } from '../store/gameStore';

/**
 * Universal GLB Car Loader
 * Automatically handles centering, scale normalization, shadow configuration,
 * and wheel node detection/rotation from user's custom GLB model.
 */
function CustomCarGLB({ url, steerAngle = 0, wheelRotation = 0, isBraking = false }) {
  const { scene } = useGLTF(url);
  const modelRef = useRef();
  const wheelNodes = useRef({ fl: [], fr: [], rl: [], rr: [] });

  // Clone & configure scene once on load
  const processedScene = useMemo(() => {
    const clone = scene.clone(true);
    wheelNodes.current = { fl: [], fr: [], rl: [], rr: [] };

    // Calculate bounding box to auto-center and measure model dimensions
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Auto-normalize scale if model was exported in millimeters or extreme scale
    let scaleMultiplier = 1.0;
    if (size.z > 25 || size.x > 25) {
      // Model in centimeters/millimeters
      scaleMultiplier = 0.01;
    } else if (size.z < 0.8 && size.x < 0.8) {
      scaleMultiplier = 4.0;
    }

    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((mat) => {
            if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
          });
        }

        // Identify wheel nodes if named conventionally in Blender/3ds Max
        const name = child.name.toLowerCase();
        if (name.includes('wheel') || name.includes('tire') || name.includes('tyre') || name.includes('rim')) {
          if (name.includes('fl') || name.includes('front_l') || (name.includes('front') && name.includes('left'))) {
            wheelNodes.current.fl.push(child);
          } else if (name.includes('fr') || name.includes('front_r') || (name.includes('front') && name.includes('right'))) {
            wheelNodes.current.fr.push(child);
          } else if (name.includes('rl') || name.includes('rear_l') || (name.includes('back_l'))) {
            wheelNodes.current.rl.push(child);
          } else if (name.includes('rr') || name.includes('rear_r') || (name.includes('back_r'))) {
            wheelNodes.current.rr.push(child);
          }
        }
      }
    });

    return { clone, scaleMultiplier, centerOffset: center };
  }, [scene]);

  // Rotate wheels if wheels are detected in GLB
  useEffect(() => {
    const nodes = wheelNodes.current;
    nodes.fl.forEach((node) => {
      node.rotation.y = steerAngle;
      node.rotation.x = wheelRotation;
    });
    nodes.fr.forEach((node) => {
      node.rotation.y = steerAngle;
      node.rotation.x = wheelRotation;
    });
    nodes.rl.forEach((node) => {
      node.rotation.x = wheelRotation;
    });
    nodes.rr.forEach((node) => {
      node.rotation.x = wheelRotation;
    });
  }, [steerAngle, wheelRotation]);

  return (
    <group ref={modelRef} scale={processedScene.scaleMultiplier}>
      <primitive object={processedScene.clone} />
    </group>
  );
}

/**
 * Clean Waiting Placeholder:
 * Minimal neon chassis footprint indicator shown while waiting for user's car GLB.
 * No procedural car body geometry is generated.
 */
function AwaitingCarPlaceholder() {
  return (
    <group position={[0, 0.35, 0]}>
      {/* Sleek minimalist chassis perimeter line */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(1.9, 0.5, 4.3)]} />
        <lineBasicMaterial color="#00f0ff" linewidth={2} transparent opacity={0.7} />
      </lineSegments>

      {/* Cyber Neon Floor Plate */}
      <mesh position={[0, -0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.85, 4.2]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.12} />
      </mesh>

      {/* Forward Heading Arrow Decal */}
      <mesh position={[0, -0.2, 0.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.35, 0.8, 3]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.5} />
      </mesh>

      {/* 4 Minimalist Wheel Locators */}
      {[
        [-0.95, 0, 1.35],
        [0.95, 0, 1.35],
        [-0.95, 0, -1.35],
        [0.95, 0, -1.35]
      ].map((pos, idx) => (
        <group key={idx} position={pos}>
          <lineSegments>
            <edgesGeometry args={[new THREE.CylinderGeometry(0.36, 0.36, 0.3, 16)]} />
            <lineBasicMaterial color="#00e5ff" transparent opacity={0.6} />
          </lineSegments>
        </group>
      ))}
    </group>
  );
}

export function CarModel({
  steerAngle = 0,
  wheelRotation = 0,
  isBraking = false,
  isNitroActive = false,
  isDrifting = false,
  headlightsOn = true
}) {
  const customModelPath = useGameStore((s) => s.carModelPath);

  return (
    <group>
      {/* If user provided a GLB car model, load and render it! */}
      {customModelPath ? (
        <CustomCarGLB
          url={customModelPath}
          steerAngle={steerAngle}
          wheelRotation={wheelRotation}
          isBraking={isBraking}
        />
      ) : (
        /* Clean placeholder while waiting for user's car GLB in the next prompt */
        <AwaitingCarPlaceholder />
      )}

      {/* High-Beam Projected Headlights for night driving */}
      {headlightsOn && (
        <>
          <spotLight
            position={[-0.7, 0.45, 2.1]}
            target-position={[-0.7, -0.6, 50]}
            color="#eaf5ff"
            intensity={40}
            distance={65}
            angle={0.52}
            penumbra={0.6}
          />
          <spotLight
            position={[0.7, 0.45, 2.1]}
            target-position={[0.7, -0.6, 50]}
            color="#eaf5ff"
            intensity={40}
            distance={65}
            angle={0.52}
            penumbra={0.6}
          />
        </>
      )}

      {/* Nitro Boost Thruster Glow */}
      {isNitroActive && (
        <group position={[0, 0.3, -2.1]}>
          <pointLight color="#00f0ff" intensity={8} distance={6} />
        </group>
      )}
    </group>
  );
}
