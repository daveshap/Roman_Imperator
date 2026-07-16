export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const distanceSq = (a, b) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;

export function wrapAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

export const angleDifference = (target, current) => wrapAngle(target - current);
export const headingTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
export const forwardOf = heading => ({ x: Math.sin(heading), z: Math.cos(heading) });
export const lateralOf = heading => ({ x: Math.cos(heading), z: -Math.sin(heading) });
export const dot2 = (a, b) => a.x * b.x + a.z * b.z;
export const cross2 = (a, b) => a.x * b.z - a.z * b.x;
export const add2 = (a, b) => ({ x: a.x + b.x, z: a.z + b.z });
export const sub2 = (a, b) => ({ x: a.x - b.x, z: a.z - b.z });
export const scale2 = (a, scale) => ({ x: a.x * scale, z: a.z * scale });

export function normalize2(vector, fallback = { x: 0, z: 1 }) {
  const magnitude = Math.hypot(vector.x, vector.z);
  return magnitude > 1e-9
    ? { x: vector.x / magnitude, z: vector.z / magnitude }
    : { x: fallback.x, z: fallback.z };
}

export function rotateToward(current, target, maxStep) {
  return wrapAngle(current + clamp(angleDifference(target, current), -maxStep, maxStep));
}

export function worldFromLocal(origin, heading, lateral, depth) {
  const forward = forwardOf(heading);
  const side = lateralOf(heading);
  return {
    x: origin.x + side.x * lateral + forward.x * depth,
    z: origin.z + side.z * lateral + forward.z * depth
  };
}

export function localFromWorld(origin, heading, point) {
  const delta = sub2(point, origin);
  return { lateral: dot2(delta, lateralOf(heading)), depth: dot2(delta, forwardOf(heading)) };
}

export function quantize(value, step) {
  return Math.round(value / step) * step;
}

export function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const key of Object.keys(value)) deepFreeze(value[key]);
  return Object.freeze(value);
}
