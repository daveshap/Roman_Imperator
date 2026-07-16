/**
 * Local collision-avoidance solver boundary.
 *
 * This module accepts only copied public observations: position, visible
 * velocity, public state, and physical radius. It cannot inspect doctrine,
 * claims, targets, intentions, timers, or any observer-owned state.
 */
export const ORCA2D = (() => {
  const EPSILON = 1e-7;
  const vec = (x = 0, z = 0) => ({ x, z });
  const add = (a, b) => vec(a.x + b.x, a.z + b.z);
  const sub = (a, b) => vec(a.x - b.x, a.z - b.z);
  const scale = (a, s) => vec(a.x * s, a.z * s);
  const dot = (a, b) => a.x * b.x + a.z * b.z;
  const det = (a, b) => a.x * b.z - a.z * b.x;
  const lengthSq = a => dot(a, a);
  const length = a => Math.sqrt(lengthSq(a));
  const normalize = (a, fallback = vec(1, 0)) => {
    const m = length(a);
    return m > EPSILON ? scale(a, 1 / m) : vec(fallback.x, fallback.z);
  };
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const Vec = Object.freeze({ create: vec, add, sub, scale, dot, det, lengthSq, length, normalize });
  const DEFAULT_STATE_MOBILITY = Object.freeze({
    muster: 1, form: 1, dress: 0.08, march: 1, fight: 0, flee: 1, testudo: 0.22
  });

  function mobilityForState(publicState, stateMobility = DEFAULT_STATE_MOBILITY) {
    const state = typeof publicState === 'string' ? publicState.toLowerCase() : publicState;
    let value;
    if (typeof stateMobility === 'function') value = stateMobility(state);
    else if (stateMobility && Object.prototype.hasOwnProperty.call(stateMobility, state)) value = stateMobility[state];
    return Number.isFinite(value) ? Math.max(0, value) : 1;
  }

  function responsibilityForStates(selfState, otherState, stateMobility) {
    const mine = mobilityForState(selfState, stateMobility);
    const theirs = mobilityForState(otherState, stateMobility);
    const total = mine + theirs;
    return total > EPSILON ? mine / total : 0.5;
  }

  function isStaticPublicState(publicState) {
    const state = typeof publicState === 'string' ? publicState.toLowerCase() : publicState;
    return state === 'dress' || state === 'fight';
  }

  function visibleVelocity(agent) {
    return vec(Number.isFinite(agent.seenVx) ? agent.seenVx : 0,
      Number.isFinite(agent.seenVz) ? agent.seenVz : 0);
  }

  function position(agent) {
    return vec(Number.isFinite(agent.x) ? agent.x : 0, Number.isFinite(agent.z) ? agent.z : 0);
  }

  function makeAgentLine(self, other, options) {
    const dt = Math.max(EPSILON, Number.isFinite(options.dt) ? options.dt : 1 / 60);
    const dynamicHorizon = Math.max(EPSILON,
      Number.isFinite(options.timeHorizon) ? options.timeHorizon : 2.5);
    const staticHorizon = Math.max(EPSILON,
      Number.isFinite(options.staticTimeHorizon) ? options.staticTimeHorizon : dynamicHorizon);
    const staticTest = typeof options.isStaticState === 'function'
      ? options.isStaticState : isStaticPublicState;
    const horizon = staticTest(other.publicState) ? staticHorizon : dynamicHorizon;
    const invTimeHorizon = 1 / horizon;
    const radiusOf = typeof options.collisionRadius === 'function'
      ? options.collisionRadius
      : agent => Number.isFinite(agent.radius) ? agent.radius : 0.5;
    const padding = Number.isFinite(options.padding) ? Math.max(0, options.padding) : 0;
    const combinedRadius = Math.max(0, Number(radiusOf(self)) || 0) +
      Math.max(0, Number(radiusOf(other)) || 0) + padding;
    const combinedRadiusSq = combinedRadius * combinedRadius;
    const selfVelocity = visibleVelocity(self);
    const relativePosition = sub(position(other), position(self));
    const relativeVelocity = sub(selfVelocity, visibleVelocity(other));
    const distSq = lengthSq(relativePosition);
    let direction;
    let u;

    if (distSq > combinedRadiusSq) {
      const w = sub(relativeVelocity, scale(relativePosition, invTimeHorizon));
      const wLengthSq = lengthSq(w);
      const dot1 = dot(w, relativePosition);
      if (dot1 < 0 && dot1 * dot1 > combinedRadiusSq * wLengthSq) {
        const wLength = Math.sqrt(wLengthSq);
        const unitW = normalize(w, normalize(scale(relativePosition, -1)));
        direction = vec(unitW.z, -unitW.x);
        u = scale(unitW, combinedRadius * invTimeHorizon - wLength);
      } else {
        const leg = Math.sqrt(Math.max(0, distSq - combinedRadiusSq));
        if (det(relativePosition, w) > 0) {
          direction = scale(vec(
            relativePosition.x * leg - relativePosition.z * combinedRadius,
            relativePosition.x * combinedRadius + relativePosition.z * leg
          ), 1 / distSq);
        } else {
          direction = scale(vec(
            -(relativePosition.x * leg + relativePosition.z * combinedRadius),
            relativePosition.x * combinedRadius - relativePosition.z * leg
          ), 1 / distSq);
        }
        u = sub(scale(direction, dot(relativeVelocity, direction)), relativeVelocity);
      }
    } else {
      const invTimeStep = 1 / dt;
      const w = sub(relativeVelocity, scale(relativePosition, invTimeStep));
      const wLength = length(w);
      const fallback = normalize(scale(relativePosition, -1));
      const unitW = normalize(w, fallback);
      direction = vec(unitW.z, -unitW.x);
      u = scale(unitW, combinedRadius * invTimeStep - wLength);
    }

    const responsibility = typeof options.responsibility === 'function'
      ? clamp(Number(options.responsibility(self.publicState, other.publicState)) || 0, 0, 1)
      : responsibilityForStates(self.publicState, other.publicState, options.stateMobility);
    return {
      point: add(selfVelocity, scale(u, responsibility)),
      direction: normalize(direction, vec(0, -1)), responsibility, timeHorizon: horizon
    };
  }

  function buildAgentLines(self, localNeighbors, options = {}) {
    const lines = [];
    for (const other of localNeighbors) {
      if (!other || other === self) continue;
      lines.push(makeAgentLine(self, other, options));
    }
    return lines;
  }

  function linearProgram1(lines, lineNo, radius, optVelocity, directionOpt) {
    const line = lines[lineNo];
    const dotProduct = dot(line.point, line.direction);
    const discriminant = dotProduct * dotProduct + radius * radius - lengthSq(line.point);
    if (discriminant < 0) return { ok: false, result: vec() };
    const sqrtDiscriminant = Math.sqrt(discriminant);
    let tLeft = -dotProduct - sqrtDiscriminant;
    let tRight = -dotProduct + sqrtDiscriminant;
    for (let i = 0; i < lineNo; i++) {
      const denominator = det(line.direction, lines[i].direction);
      const numerator = det(lines[i].direction, sub(line.point, lines[i].point));
      if (Math.abs(denominator) <= EPSILON) {
        if (numerator < 0) return { ok: false, result: vec() };
        continue;
      }
      const t = numerator / denominator;
      if (denominator >= 0) tRight = Math.min(tRight, t);
      else tLeft = Math.max(tLeft, t);
      if (tLeft > tRight) return { ok: false, result: vec() };
    }
    const t = directionOpt
      ? (dot(optVelocity, line.direction) > 0 ? tRight : tLeft)
      : clamp(dot(line.direction, sub(optVelocity, line.point)), tLeft, tRight);
    return { ok: true, result: add(line.point, scale(line.direction, t)) };
  }

  function linearProgram2(lines, radius, optVelocity, directionOpt = false) {
    radius = Math.max(0, radius);
    let result;
    if (directionOpt) result = scale(normalize(optVelocity), radius);
    else if (lengthSq(optVelocity) > radius * radius) result = scale(normalize(optVelocity), radius);
    else result = vec(optVelocity.x, optVelocity.z);
    for (let i = 0; i < lines.length; i++) {
      if (det(lines[i].direction, sub(lines[i].point, result)) > 0) {
        const previous = result;
        const solved = linearProgram1(lines, i, radius, optVelocity, directionOpt);
        if (!solved.ok) return { result: previous, failedLine: i };
        result = solved.result;
      }
    }
    return { result, failedLine: lines.length };
  }

  function linearProgram3(lines, numObstacleLines, beginLine, radius, initialResult) {
    let result = vec(initialResult.x, initialResult.z);
    let distance = 0;
    for (let i = beginLine; i < lines.length; i++) {
      const violation = det(lines[i].direction, sub(lines[i].point, result));
      if (violation <= distance) continue;
      const projectedLines = lines.slice(0, numObstacleLines);
      for (let j = numObstacleLines; j < i; j++) {
        const determinant = det(lines[i].direction, lines[j].direction);
        let point;
        if (Math.abs(determinant) <= EPSILON) {
          if (dot(lines[i].direction, lines[j].direction) > 0) continue;
          point = scale(add(lines[i].point, lines[j].point), 0.5);
        } else {
          const t = det(lines[j].direction, sub(lines[i].point, lines[j].point)) / determinant;
          point = add(lines[i].point, scale(lines[i].direction, t));
        }
        projectedLines.push({ point, direction: normalize(sub(lines[j].direction, lines[i].direction)) });
      }
      const previous = result;
      const perpendicular = vec(-lines[i].direction.z, lines[i].direction.x);
      const solved = linearProgram2(projectedLines, radius, perpendicular, true);
      result = solved.failedLine < projectedLines.length ? previous : solved.result;
      distance = det(lines[i].direction, sub(lines[i].point, result));
    }
    return result;
  }

  function solvePreferredVelocity(self, localNeighbors, preferredVelocity, maxSpeed, options = {}) {
    const fixedLines = Array.isArray(options.fixedLines)
      ? options.fixedLines.filter(line => line && line.point && line.direction &&
          [line.point.x, line.point.z, line.direction.x, line.direction.z].every(Number.isFinite))
        .map(line => ({
          point: vec(line.point.x, line.point.z),
          direction: normalize(line.direction, vec(0, -1)), fixed: true
        }))
      : [];
    const lines = fixedLines.concat(buildAgentLines(self, localNeighbors, options));
    const preferred = vec(Number.isFinite(preferredVelocity.x) ? preferredVelocity.x : 0,
      Number.isFinite(preferredVelocity.z) ? preferredVelocity.z : 0);
    const speed = Math.max(0, Number(maxSpeed) || 0);
    const lp2 = linearProgram2(lines, speed, preferred, false);
    const velocity = lp2.failedLine < lines.length
      ? linearProgram3(lines, fixedLines.length, lp2.failedLine, speed, lp2.result)
      : lp2.result;
    return { x: velocity.x, z: velocity.z, lines, failedLine: lp2.failedLine,
      fixedLineCount: fixedLines.length };
  }

  return Object.freeze({
    EPSILON, Vec, DEFAULT_STATE_MOBILITY, mobilityForState,
    responsibilityForStates, isStaticPublicState, makeAgentLine,
    buildAgentLines, buildOrcaLines: buildAgentLines,
    linearProgram1, linearProgram2, linearProgram3,
    lp1: linearProgram1, lp2: linearProgram2, lp3: linearProgram3,
    solvePreferredVelocity, solve: solvePreferredVelocity
  });
})();
