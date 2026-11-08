// High-performance 2D Oriented Bounding Box (OBB) Separating Axis Theorem (SAT)
// Zero-allocation car-to-car collision engine (0 GC memory overhead per frame)

export const PLAYER_HALF_LENGTH = 2.10;
export const PLAYER_HALF_WIDTH = 0.92;
export const RIVAL_HALF_LENGTH = 1.95;
export const RIVAL_HALF_WIDTH = 0.90;

// Reusable result container to prevent per-frame heap allocations
const colResult = {
  normalX: 0,
  normalZ: 0,
  depth: 0
};

/**
 * Checks 2D OBB intersection between two oriented vehicles on the XZ ground plane.
 * Returns colResult if colliding, or null if separated.
 */
export function checkCarCollision(
  x1, z1, rot1, hl1, hw1,
  x2, z2, rot2, hl2, hw2
) {
  const dx = x1 - x2;
  const dz = z1 - z2;
  const distSq = dx * dx + dz * dz;

  // Broadphase: Early discard if vehicles are farther than bounding radii
  const maxRadius = hl1 + hl2 + 0.8;
  if (distSq > maxRadius * maxRadius) {
    return null;
  }

  const sin1 = Math.sin(rot1);
  const cos1 = Math.cos(rot1);
  const fx1 = sin1;
  const fz1 = cos1;
  const rx1 = cos1;
  const rz1 = -sin1;

  const sin2 = Math.sin(rot2);
  const cos2 = Math.cos(rot2);
  const fx2 = sin2;
  const fz2 = cos2;
  const rx2 = cos2;
  const rz2 = -sin2;

  // 4 Separating Axes to test (Car 1 Right & Forward, Car 2 Right & Forward)
  let minOverlap = Infinity;
  let bestAxisX = 0;
  let bestAxisZ = 0;

  // Axis 1: Car 1 Right (rx1, rz1)
  {
    const dProj = Math.abs(dx * rx1 + dz * rz1);
    const r1 = hw1;
    const r2 = hw2 * Math.abs(rx2 * rx1 + rz2 * rz1) + hl2 * Math.abs(fx2 * rx1 + fz2 * rz1);
    const overlap = (r1 + r2) - dProj;
    if (overlap <= 0) return null;
    if (overlap < minOverlap) {
      minOverlap = overlap;
      bestAxisX = rx1;
      bestAxisZ = rz1;
    }
  }

  // Axis 2: Car 1 Forward (fx1, fz1)
  {
    const dProj = Math.abs(dx * fx1 + dz * fz1);
    const r1 = hl1;
    const r2 = hw2 * Math.abs(rx2 * fx1 + rz2 * fz1) + hl2 * Math.abs(fx2 * fx1 + fz2 * fz1);
    const overlap = (r1 + r2) - dProj;
    if (overlap <= 0) return null;
    if (overlap < minOverlap) {
      minOverlap = overlap;
      bestAxisX = fx1;
      bestAxisZ = fz1;
    }
  }

  // Axis 3: Car 2 Right (rx2, rz2)
  {
    const dProj = Math.abs(dx * rx2 + dz * rz2);
    const r1 = hw1 * Math.abs(rx1 * rx2 + rz1 * rz2) + hl1 * Math.abs(fx1 * rx2 + fz1 * rz2);
    const r2 = hw2;
    const overlap = (r1 + r2) - dProj;
    if (overlap <= 0) return null;
    if (overlap < minOverlap) {
      minOverlap = overlap;
      bestAxisX = rx2;
      bestAxisZ = rz2;
    }
  }

  // Axis 4: Car 2 Forward (fx2, fz2)
  {
    const dProj = Math.abs(dx * fx2 + dz * fz2);
    const r1 = hw1 * Math.abs(rx1 * fx2 + rz1 * fz2) + hl1 * Math.abs(fx1 * fx2 + fz1 * fz2);
    const r2 = hl2;
    const overlap = (r1 + r2) - dProj;
    if (overlap <= 0) return null;
    if (overlap < minOverlap) {
      minOverlap = overlap;
      bestAxisX = fx2;
      bestAxisZ = fz2;
    }
  }

  // Ensure collision normal points from Car 2 toward Car 1
  if (dx * bestAxisX + dz * bestAxisZ < 0) {
    bestAxisX = -bestAxisX;
    bestAxisZ = -bestAxisZ;
  }

  colResult.normalX = bestAxisX;
  colResult.normalZ = bestAxisZ;
  colResult.depth = minOverlap;

  return colResult;
}
