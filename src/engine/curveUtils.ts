import * as THREE from 'three';

/**
 * Global Bulletproof Guard for Three.js CatmullRomCurve3
 * Prevents: Uncaught TypeError: Cannot read properties of undefined (reading 'distanceToSquared')
 * This error happens when t or u is negative, >= 1, NaN, or out of range, causing p0/p1 to be undefined.
 */
const proto = THREE.CatmullRomCurve3.prototype as any;
if (!proto._safeGuarded) {
  proto._safeGuarded = true;
  const originalGetPoint = proto.getPoint;

  proto.getPoint = function (t: number, optionalTarget?: THREE.Vector3): THREE.Vector3 {
    const target = optionalTarget || new THREE.Vector3();

    // 1. Sanitize input t against NaN, Infinity, undefined
    if (typeof t !== 'number' || isNaN(t) || !isFinite(t)) {
      t = 0;
    }

    // 2. Closed curve wrap-around handling
    if (this.closed) {
      t = ((t % 1.0) + 1.0) % 1.0;
      if (t >= 0.999999) t = 0.999999;
    } else {
      t = Math.max(0, Math.min(1.0, t));
    }

    try {
      return originalGetPoint.call(this, t, target);
    } catch {
      // Fallback in case of numerical singularity
      if (this.points && this.points.length > 0 && this.points[0]) {
        target.copy(this.points[0]);
      } else {
        target.set(0, 0, 0);
      }
      return target;
    }
  };
}

/**
 * Normalizes any curve parameter into a strictly safe [0, 0.99999] range
 */
export function getSafeCurveU(u: number): number {
  if (typeof u !== 'number' || isNaN(u) || !isFinite(u)) {
    return 0;
  }
  let norm = ((u % 1.0) + 1.0) % 1.0;
  if (norm >= 0.99999) {
    norm = 0.99999;
  }
  return Math.max(0, norm);
}

/**
 * Safe point evaluation on CatmullRomCurve3
 */
export function safeGetPointAt(
  curve: THREE.CatmullRomCurve3,
  u: number,
  optionalTarget: THREE.Vector3 = new THREE.Vector3()
): THREE.Vector3 {
  try {
    const safeU = getSafeCurveU(u);
    return curve.getPointAt(safeU, optionalTarget) || optionalTarget.set(0, 0, 0);
  } catch {
    return optionalTarget.set(0, 0, 0);
  }
}

/**
 * Safe normalized tangent evaluation on CatmullRomCurve3
 */
export function safeGetTangentAt(
  curve: THREE.CatmullRomCurve3,
  u: number,
  optionalTarget: THREE.Vector3 = new THREE.Vector3()
): THREE.Vector3 {
  try {
    const safeU = getSafeCurveU(u);
    const tangent = curve.getTangentAt(safeU, optionalTarget);
    if (!tangent || isNaN(tangent.x) || isNaN(tangent.y) || isNaN(tangent.z) || tangent.lengthSq() < 1e-8) {
      return optionalTarget.set(0, 0, 1);
    }
    return tangent.normalize();
  } catch {
    return optionalTarget.set(0, 0, 1);
  }
}
