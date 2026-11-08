/**
 * Lightweight Device & Performance Tier Detector
 * Calibrates DPR, shadow resolution, and WebGL parameters for low-end phones & laptops.
 */

function detectDeviceTier() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isMobile: false,
      isLowTier: false,
      dprRange: [1, 1.25],
      shadowMapSize: 1024,
      allowPBRSmoke: false,
      enableExtraLights: true
    };
  }

  const ua = navigator.userAgent || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 1);

  // Check Hardware Concurrency (CPU Cores)
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4; // GB (if supported by Chrome)

  let isLowTier = false;

  // 1. Dual-core or quad-core mobile / laptop with <= 4GB RAM
  if (cores <= 4 || memory <= 4) {
    isLowTier = true;
  }

  // 2. Detect weak mobile / integrated GPUs
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
        // Known low-end GPUs: Intel HD Graphics 3000-520, Mali G51/G52, Adreno 505/506/610/612, PowerVR
        if (
          renderer.includes('intel hd') ||
          renderer.includes('intel(r) hd') ||
          renderer.includes('mali-4') ||
          renderer.includes('mali-g51') ||
          renderer.includes('mali-g52') ||
          renderer.includes('adreno (tm) 50') ||
          renderer.includes('adreno (tm) 61') ||
          renderer.includes('powervr') ||
          renderer.includes('llvmpipe') ||
          renderer.includes('swiftshader')
        ) {
          isLowTier = true;
        }
      }
    }
  } catch (e) {
    // Graceful fallback
  }

  // DPR configuration:
  // On low-end phones with 1080p/1440p screens, DPR 2.5-3.0 creates massive fill-rate bottlenecks.
  // Clamping DPR to 1.0 (or 1.25 on high-spec) provides crisp UI while keeping WebGL at 60 FPS.
  const maxDpr = isLowTier ? (isMobile ? 1.0 : 1.1) : 1.25;
  const minDpr = isLowTier ? 0.8 : 1.0;

  return {
    isMobile,
    isLowTier,
    dprRange: [minDpr, maxDpr],
    shadowMapSize: isLowTier ? 512 : 1024,
    enableExtraLights: !isLowTier
  };
}

export const DEVICE_TIER = detectDeviceTier();

