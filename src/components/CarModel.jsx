import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameStore';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { DEVICE_TIER } from '../utils/deviceTier';

// Target standard sports car length in meters (proportionally balanced to city road lanes)
const TARGET_CAR_LENGTH = 3.9;

// Known orientation overrides for models with non-standard coordinate systems
const KNOWN_ORIENTATIONS = {
  // BMW M4 was exported facing -Z (backwards). Rotate 180° around Y to face +Z.
  'bmw_m4_f82_razor_2014__www.vecarz.com.glb': [0, Math.PI, 0],
  // Dominus has length along X axis, facing +X. Rotate -90° around Y to face +Z.
  'dominus_-_rocket_league_car.glb': [0, -Math.PI / 2, 0],
  // Ferrari 488 has length along X axis, facing +X. Rotate -90° around Y to face +Z.
  'ferrari_488_pista_widebody.glb': [0, -Math.PI / 2, 0]
};

// Lightweight, Zero-Allocation Instanced Tire Smoke Particle System (Optimized for Low-End GPUs)
function TireSmokeEmitter({ isDrifting }) {
  const maxParticles = DEVICE_TIER.isLowTier ? 25 : 50;
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useRef(
    Array.from({ length: maxParticles }, () => ({
      pos: new THREE.Vector3(0, -999, 0),
      vel: new THREE.Vector3(),
      scale: 0.1,
      life: 1.0,
      maxLife: 0.75,
      active: false
    }))
  );

  const nextSpawnIndex = useRef(0);
  const spawnTimer = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const pList = particles.current;
    const mesh = meshRef.current;
    if (!mesh) return;

    spawnTimer.current += dt;
    if (isDrifting && spawnTimer.current > 0.04) {
      spawnTimer.current = 0;
      const sides = [-0.64, 0.64];
      for (let s = 0; s < 2; s++) {
        const xOff = sides[s];
        const p = pList[nextSpawnIndex.current % maxParticles];
        nextSpawnIndex.current++;
        p.active = true;
        p.life = 0;
        p.maxLife = 0.5 + Math.random() * 0.3;
        p.scale = 0.18 + Math.random() * 0.12;
        p.pos.set(
          xOff + (Math.random() - 0.5) * 0.15,
          0.10 + Math.random() * 0.05,
          -1.48 - Math.random() * 0.2
        );
        p.vel.set(
          (Math.random() - 0.5) * 0.5 + (xOff > 0 ? 0.3 : -0.3),
          0.6 + Math.random() * 0.5,
          -1.2 - Math.random() * 1.0
        );
      }
    }

    let needsUpdate = false;
    for (let i = 0; i < maxParticles; i++) {
      const p = pList[i];
      if (!p.active) {
        dummy.position.set(0, -999, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }

      needsUpdate = true;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        dummy.position.set(0, -999, 0);
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }

      const progress = p.life / p.maxLife;
      p.pos.x += p.vel.x * dt;
      p.pos.y += p.vel.y * dt;
      p.pos.z += p.vel.z * dt;
      const currentScale = p.scale * (1.0 + progress * 2.6);

      dummy.position.copy(p.pos);
      dummy.scale.setScalar(currentScale);
      dummy.rotation.x += dt * 0.6;
      dummy.rotation.y += dt * 0.9;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    if (needsUpdate || isDrifting) {
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, maxParticles]}>
      <planeGeometry args={[0.32, 0.32]} />
      <meshBasicMaterial
        color="#d2dce6"
        transparent
        opacity={0.34}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

/**
 * Universal Global Car Adapter
 * Automatically scales, centers, orients any 3D car GLB,
 * adapts missing shaders/colors, and connects steering/rolling wheels.
 */
function UniversalCarGLB({ url, steerAngle = 0, wheelRotation = 0 }) {
  const { scene } = useGLTF(url);
  const frontWheelsRef = useRef([]);
  const rearWheelsRef = useRef([]);

  const adapted = useMemo(() => {
    // Universal clone using SkeletonUtils: ensures skinned mesh models (like 2026 Lamborghini Fenomeno)
    // clone their skeleton bones and bind matrices properly to the active scene graph
    const root = SkeletonUtils.clone(scene);
    frontWheelsRef.current = [];
    rearWheelsRef.current = [];

    const fileName = (url || '').split('/').pop();
    const maxAnisotropy = DEVICE_TIER.isLowTier ? 1 : 2;

    // 1. Material Adaptation & Color Correction
    root.traverse((node) => {
      const name = (node.name || '').toLowerCase();

      // Hide fake baked ground shadows
      if (name.includes('shadow') || (name.includes('ground') && !name.includes('compound'))) {
        node.visible = false;
      }

      if (node.isMesh) {
        // Only primary car exterior meshes cast shadows; disable receiveShadow on car parts
        // to avoid self-shadow acne and cut draw-call shader overhead in half!
        const isGlass = name.includes('glass') || name.includes('window') || name.includes('windshield');
        const isInterior = name.includes('interior') || name.includes('seat') || name.includes('steering');
        
        node.castShadow = !isGlass && !isInterior;
        node.receiveShadow = false;

        if (node.material) {
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          mats.forEach((mat) => {
            // Fix sRGB color space on all textures
            if (mat.map) {
              mat.map.colorSpace = THREE.SRGBColorSpace;
              mat.map.anisotropy = maxAnisotropy;
              mat.map.needsUpdate = true;
            }

            const matName = (mat.name || '').toLowerCase();

            // 2026 Lamborghini Fenomeno fix:
            if (fileName.includes('fenomeno') || fileName.includes('lamborghini_fenomeno')) {
              if (mat.name === 'Paint' || matName.includes('paint')) {
                mat.roughness = 0.18;
                mat.metalness = 0.55;
                if ('clearcoat' in mat) mat.clearcoat = 1.0;
                if ('clearcoatRoughness' in mat) mat.clearcoatRoughness = 0.08;
              } else if (mat.name === 'Coloured') {
                mat.roughness = 0.35;
                mat.metalness = 0.3;
              }
            }

            // Ferrari 488 Pista Widebody fix:
            else if (mat.name === 'GREEN_car_paint' || matName.includes('green_car_paint')) {
              mat.color.set('#15803d');
              mat.roughness = 0.2;
              mat.metalness = 0.5;
              if ('clearcoat' in mat) mat.clearcoat = 1.0;
            } else if (mat.name === 'Coloured' && fileName.includes('ferrari')) {
              mat.color.set('#1e293b');
              mat.roughness = 0.35;
              mat.metalness = 0.5;
            }

            // BMW M4 Razor Edition fix:
            else if (mat.name === 'chassis.011' || (fileName.includes('bmw') && matName.includes('chassis'))) {
              mat.color.set('#c8d0dc');
              mat.roughness = 0.22;
              mat.metalness = 0.75;
              if ('clearcoat' in mat) mat.clearcoat = 0.9;
            }

            // Dominus fix:
            else if (fileName.includes('dominus')) {
              if (mat.name === 'Window') {
                mat.color.set('#1a2634');
                mat.transparent = true;
                mat.opacity = 0.45;
                mat.roughness = 0.1;
              } else if (mat.name === 'Cristiano' || mat.name === 'Tread') {
                mat.color.set('#1a1a1a');
                mat.roughness = 0.88;
                mat.metalness = 0.08;
              }
            }

            // Windows & Tinted Glass across all models:
            if (matName.includes('window') || matName.includes('glass') || matName.includes('windshield')) {
              if (!mat.map && (mat.color.getHex() === 0 || mat.color.getHex() === 0xffffff)) {
                mat.color.set('#141c26');
                mat.transparent = true;
                mat.opacity = 0.42;
                mat.roughness = 0.1;
                mat.metalness = 0.2;
              }
            }

            // General Protection for untextured pure pitch-black materials:
            if (!mat.map && mat.color.getHex() === 0) {
              const isTire = matName.includes('tire') || matName.includes('tyre') || matName.includes('tread') || matName.includes('rubber');
              const isBody = matName.includes('paint') || matName.includes('body') || matName.includes('chassis') || matName.includes('car');

              if (isBody) {
                mat.color.set('#242b35');
                mat.roughness = 0.25;
                mat.metalness = 0.6;
              } else if (isTire) {
                mat.color.set('#1a1a1a');
                mat.roughness = 0.85;
                mat.metalness = 0.05;
              } else {
                mat.color.set('#202328');
                mat.roughness = Math.max(0.3, mat.roughness);
              }
            }

            // Ensure ultra-smooth metallic surfaces never render pure black
            if (mat.metalness >= 0.85 && mat.roughness <= 0.05) {
              mat.roughness = 0.12;
            }

            mat.needsUpdate = true;
          });
        }
      }
    });

    // 2. Measure Raw Dimensions Before Orientation
    root.updateMatrixWorld(true);
    const rawBox = new THREE.Box3().setFromObject(root);
    const rawSize = new THREE.Vector3();
    rawBox.getSize(rawSize);

    // 3. Precise Orientation Logic
    const explicitRot = KNOWN_ORIENTATIONS[fileName];
    if (explicitRot) {
      root.rotation.set(explicitRot[0], explicitRot[1], explicitRot[2]);
    } else {
      if (rawSize.x > rawSize.z * 1.3 && rawSize.x > rawSize.y) {
        root.rotation.y = -Math.PI / 2;
      } else if (rawSize.y > rawSize.z * 1.3 && rawSize.y > rawSize.x) {
        root.rotation.x = -Math.PI / 2;
      }
    }

    // 4. Compute Bounding Box After Orientation
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // 5. Scale Normalization (Normalized to standard 3.90m length)
    const scaleMultiplier = TARGET_CAR_LENGTH / size.z;

    // 6. Perfect Center & Tire Alignment
    root.position.x = -center.x;
    root.position.y = -box.min.y;
    root.position.z = -center.z;

    // 7. Wrapper Group
    const wrapper = new THREE.Group();
    wrapper.name = 'CarUniversalWrapper';
    wrapper.add(root);
    wrapper.scale.setScalar(scaleMultiplier);
    wrapper.updateMatrixWorld(true);

    // 8. Find and Register Wheels for Steering & Rolling
    root.traverse((node) => {
      const name = (node.name || '').toLowerCase();
      const isWheelNode =
        ((name.includes('wheel') || name.includes('tire') || name.includes('tyre') || name.includes('rim')) &&
          (node.isMesh || node.isBone)) &&
        !name.includes('steering');

      if (isWheelNode) {
        const pos = new THREE.Vector3();
        if (node.isMesh) {
          const wBox = new THREE.Box3().setFromObject(node);
          wBox.getCenter(pos);
        } else {
          node.getWorldPosition(pos);
        }

        const isFront = pos.z > 0 || name.includes('front') || name.includes('fl') || name.includes('fr');
        if (isFront) {
          frontWheelsRef.current.push(node);
        } else {
          rearWheelsRef.current.push(node);
        }
      }
    });

    console.log(`[CarModel] Configured & optimized: ${fileName}`, {
      frontWheels: frontWheelsRef.current.length,
      rearWheels: rearWheelsRef.current.length
    });

    return { wrapper };
  }, [scene, url]);

  // Clean up cloned materials/textures on car swap or unmount to prevent VRAM memory leak
  useEffect(() => {
    return () => {
      if (adapted?.wrapper) {
        adapted.wrapper.traverse((child) => {
          if (child.isMesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((m) => {
              if (m && typeof m.dispose === 'function') m.dispose();
            });
          }
        });
      }
    };
  }, [adapted]);

  // High-performance 60-120 FPS wheel animation
  useFrame(() => {
    const front = frontWheelsRef.current;
    for (let i = 0; i < front.length; i++) {
      front[i].rotation.y = steerAngle;
      front[i].rotation.x = wheelRotation;
    }
    const rear = rearWheelsRef.current;
    for (let i = 0; i < rear.length; i++) {
      rear[i].rotation.x = wheelRotation;
    }
  });

  return <primitive object={adapted.wrapper} />;
}

export function CarModel({
  steerAngle = 0,
  wheelRotation = 0,
  isBraking = false,
  isNitroActive = false,
  isDrifting = false,
  headlightsOn = true
}) {
  const carModelPath = useGameStore((s) => s.carModelPath);

  return (
    <group>
      {carModelPath && (
        <UniversalCarGLB
          url={carModelPath}
          steerAngle={steerAngle}
          wheelRotation={wheelRotation}
        />
      )}

      {/* Dynamic Tire Smoke Particles when Drifting (Low-fillrate instanced quads) */}
      <TireSmokeEmitter isDrifting={isDrifting} />

      {/* Projected High-Beam Headlights */}
      {headlightsOn && (
        <>
          <spotLight
            position={[-0.64, 0.38, 1.82]}
            target-position={[-0.64, -0.6, 40]}
            color="#eaf5ff"
            intensity={DEVICE_TIER.isLowTier ? 24 : 38}
            distance={DEVICE_TIER.isLowTier ? 38 : 52}
            angle={0.52}
            penumbra={0.55}
          />
          <spotLight
            position={[0.64, 0.38, 1.82]}
            target-position={[0.64, -0.6, 40]}
            color="#eaf5ff"
            intensity={DEVICE_TIER.isLowTier ? 24 : 38}
            distance={DEVICE_TIER.isLowTier ? 38 : 52}
            angle={0.52}
            penumbra={0.55}
          />
        </>
      )}

      {/* Nitro Boost Thruster Flame */}
      {isNitroActive && (
        <group position={[0, 0.3, -1.9]}>
          {DEVICE_TIER.enableExtraLights && (
            <pointLight color="#00f0ff" intensity={8} distance={5} />
          )}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.13, 1.3, 12]} />
            <meshBasicMaterial color="#00e5ff" transparent opacity={0.85} />
          </mesh>
        </group>
      )}

      {/* Taillight Brake Glow */}
      {isBraking && (
        <group position={[0, 0.42, -1.9]}>
          {DEVICE_TIER.enableExtraLights && (
            <pointLight color="#ff0022" intensity={8} distance={4} />
          )}
        </group>
      )}
    </group>
  );
}
