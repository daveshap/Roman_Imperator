export function hashUint(a, b = 0, c = 0, d = 0) {
  let value = Math.imul((a + 1) | 0, 0x9e3779b1) ^
    Math.imul((b + 7) | 0, 0x85ebca6b) ^
    Math.imul((c + 13) | 0, 0xc2b2ae35) ^
    Math.imul((d + 29) | 0, 0x27d4eb2d);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return value >>> 0;
}

export const hash01 = (a, b = 0, c = 0, d = 0) => hashUint(a, b, c, d) / 4294967296;

export function createRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export const agentRandom = (seed, id, purpose, epoch = 0) => hash01(seed, id, purpose, epoch);
