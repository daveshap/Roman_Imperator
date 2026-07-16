(() => {
  // src/constants.js
  var VERSION = 31;
  var TEAM = Object.freeze({ BLUE: "blue", RED: "red" });
  var TEAMS = Object.freeze([TEAM.BLUE, TEAM.RED]);
  var POSTURE = Object.freeze({
    AGGRESSIVE: "aggressive",
    HOLD: "hold",
    DEFENSIVE_FEINT: "defensive-feint"
  });
  var POSTURES = Object.freeze(Object.values(POSTURE));
  var CENTURION_STATE = Object.freeze({
    ADVANCE: "advance",
    MARCH_TO_ZONE: "march-to-zone",
    FORM_LINE: "form-line",
    FIX_ENEMY: "fix-enemy",
    STAGE_FLANK: "stage-flank",
    MANEUVER_FLANK: "maneuver-flank",
    HOLD: "hold",
    COUNTER: "counter",
    BAIT_WAIT: "bait-wait",
    FEINT_OUT: "feint-out",
    FEINT_RETIRE: "feint-retire",
    COVER_FEINT: "cover-feint",
    AMBUSH_STRIKE: "ambush-strike",
    GUARD_FLANK: "guard-flank",
    SUPPORT_ALLY: "support-ally",
    WITHDRAW: "withdraw",
    ROUTED: "routed"
  });
  var SOLDIER_STATE = Object.freeze({
    FORM: "form",
    DRESS: "dress",
    MARCH: "march",
    ENGAGE: "engage",
    ROUTE: "route",
    FALLEN: "fallen"
  });
  var COMBAT_STATE = Object.freeze({
    READY: "ready",
    APPROACH: "approach",
    GUARD: "guard",
    COMMIT: "commit",
    STRIKE: "strike",
    RECOVER: "recover"
  });
  var GENERAL_STATE = Object.freeze({
    OBSERVE: "observe",
    PROBE: "probe",
    DECEIVE: "deceive",
    PRESS: "press",
    GUARD: "guard",
    RECOVER: "recover"
  });
  var MESSAGE_KIND = Object.freeze({
    PLAN_PROPOSAL: "plan-proposal",
    PLAN_ACK: "plan-ack",
    PLAN_COMMIT: "plan-commit",
    LINE_REPORT: "line-report",
    CONTACT_REPORT: "contact-report",
    FLANK_WARNING: "flank-warning",
    SUPPORT_REQUEST: "support-request",
    FEINT_PHASE: "feint-phase",
    WITHDRAW: "withdraw"
  });
  var TACTICAL_ROLE = Object.freeze({
    FIX: "fix",
    FLANK: "flank",
    HOLD_WING: "hold-wing",
    BAIT: "bait",
    COVER: "cover"
  });
  var PLAN_STATUS = Object.freeze({
    DOCTRINE: "doctrine",
    WAITING: "waiting",
    PROPOSED: "proposed",
    RECEIVED: "received",
    ACKNOWLEDGED: "acknowledged",
    COMMITTED: "committed",
    ABORTED: "aborted"
  });
  var STANDARD_CODE = Object.freeze({
    NONE: "none",
    READY: "ready",
    GO: "go",
    FIXED: "fixed",
    DRAW: "draw",
    ABORT: "abort"
  });
  var TUNING = Object.freeze({
    fixedDt: 1 / 30,
    defaultPerCentury: 36,
    ranks: 3,
    spacing: 1.18,
    centuryGap: 4.8,
    bodyRadius: 0.31,
    centurionRadius: 0.44,
    centurionGuideGap: 0.95,
    soldierThink: 0.1,
    centurionThink: 0.22,
    generalThink: 0.5,
    generalSight: 70,
    generalMemoryHalfLife: 12,
    generalTrackMaxAge: 36,
    generalDecisionFloor: 10,
    generalOrderRetry: 32,
    centurionSight: 82,
    centurionFov: 150 * Math.PI / 180,
    centurionCloseAwareness: 16,
    soldierSight: 9.5,
    soldierFov: 190 * Math.PI / 180,
    soldierCloseAwareness: 2.4,
    officerVoice: 25,
    standardSignalRange: 75,
    standardSignalDelay: 0.45,
    generalStandardSight: 92,
    soldierVoice: 6.2,
    orderRepeat: 3.6,
    orderCadence: 1.6,
    orderComprehension: 0.24,
    runnerSpeed: 2.6,
    runnerSight: 18,
    runnerMessageTtl: 45,
    planCommitWindow: 36,
    planReconcileGrace: 30,
    directMessageDelay: 0.22,
    contactMemoryHalfLife: 5.8,
    individualMemoryHalfLife: 2.5,
    minimumFormationEvidence: 3,
    allyMemoryHalfLife: 8.5,
    allyLineMaxAge: 6.5,
    lineDepthTolerance: 4.2,
    lineGapTolerance: 3.5,
    lineDepthBreak: 8.4,
    lineGapBreak: 7,
    formationRecoverCohesion: 0.78,
    formationBreakCohesion: 0.58,
    contactHaltRange: 25,
    contactDirectFreshness: 3.2,
    doctrineOverrideMin: 2.8,
    zoneArrivalFraction: 0.6,
    zoneResumeDelay: 3,
    flankScanPeriod: 3.2,
    flankScanDuration: 0.55,
    holdRepositionSpeed: 0.56,
    counterSpeed: 0.44,
    withdrawSpeed: 1.05,
    centurionMaxSpeed: 1.4,
    soldierMarchSpeed: 1.45,
    soldierDressSpeed: 0.62,
    soldierCombatSpeed: 0.92,
    soldierRouteSpeed: 2.25,
    soldierTurnRate: 5.2,
    postArrive: 0.19,
    engageRange: 6.8,
    weaponReach: 1.42,
    commitTime: 0.18,
    strikeTime: 0.09,
    recoverTime: 0.62,
    baseHitChance: 0.46,
    flankHitBonus: 0.26,
    fatiguePerStrike: 0.055,
    fatigueRecovery: 0.018,
    routeMorale: 0.16,
    rallyMorale: 0.34,
    moraleRecovery: 0.018,
    localMoraleRadius: 7.5,
    hardZoneDefaultRadius: 14,
    battlefieldHalfWidth: 68,
    battlefieldHalfDepth: 72,
    matchTimeLimit: 360
  });
  var TEAM_DOCTRINE = Object.freeze({
    [TEAM.BLUE]: Object.freeze({ forwardHeading: 0, deploymentZ: -34 }),
    [TEAM.RED]: Object.freeze({ forwardHeading: Math.PI, deploymentZ: 34 })
  });

  // src/math.js
  var clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  var distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  var distanceSq = (a, b) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
  function wrapAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }
  var angleDifference = (target, current) => wrapAngle(target - current);
  var headingTo = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
  var forwardOf = (heading) => ({ x: Math.sin(heading), z: Math.cos(heading) });
  var lateralOf = (heading) => ({ x: Math.cos(heading), z: -Math.sin(heading) });
  var dot2 = (a, b) => a.x * b.x + a.z * b.z;
  var sub2 = (a, b) => ({ x: a.x - b.x, z: a.z - b.z });
  function normalize2(vector, fallback = { x: 0, z: 1 }) {
    const magnitude = Math.hypot(vector.x, vector.z);
    return magnitude > 1e-9 ? { x: vector.x / magnitude, z: vector.z / magnitude } : { x: fallback.x, z: fallback.z };
  }
  function rotateToward(current, target, maxStep) {
    return wrapAngle(current + clamp(angleDifference(target, current), -maxStep, maxStep));
  }
  function worldFromLocal(origin, heading, lateral, depth) {
    const forward = forwardOf(heading);
    const side = lateralOf(heading);
    return {
      x: origin.x + side.x * lateral + forward.x * depth,
      z: origin.z + side.z * lateral + forward.z * depth
    };
  }
  function localFromWorld(origin, heading, point) {
    const delta = sub2(point, origin);
    return { lateral: dot2(delta, lateralOf(heading)), depth: dot2(delta, forwardOf(heading)) };
  }
  function quantize(value, step) {
    return Math.round(value / step) * step;
  }
  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    return Object.freeze(value);
  }

  // src/rng.js
  function hashUint(a, b = 0, c = 0, d = 0) {
    let value = Math.imul(a + 1 | 0, 2654435761) ^ Math.imul(b + 7 | 0, 2246822507) ^ Math.imul(c + 13 | 0, 3266489909) ^ Math.imul(d + 29 | 0, 668265261);
    value ^= value >>> 16;
    value = Math.imul(value, 2146121005);
    value ^= value >>> 15;
    value = Math.imul(value, 2221713035);
    value ^= value >>> 16;
    return value >>> 0;
  }
  var hash01 = (a, b = 0, c = 0, d = 0) => hashUint(a, b, c, d) / 4294967296;
  var agentRandom = (seed, id, purpose, epoch = 0) => hash01(seed, id, purpose, epoch);

  // src/orca.js
  var ORCA2D = (() => {
    const EPSILON = 1e-7;
    const vec = (x = 0, z = 0) => ({ x, z });
    const add = (a, b) => vec(a.x + b.x, a.z + b.z);
    const sub = (a, b) => vec(a.x - b.x, a.z - b.z);
    const scale = (a, s) => vec(a.x * s, a.z * s);
    const dot = (a, b) => a.x * b.x + a.z * b.z;
    const det = (a, b) => a.x * b.z - a.z * b.x;
    const lengthSq = (a) => dot(a, a);
    const length = (a) => Math.sqrt(lengthSq(a));
    const normalize = (a, fallback = vec(1, 0)) => {
      const m = length(a);
      return m > EPSILON ? scale(a, 1 / m) : vec(fallback.x, fallback.z);
    };
    const clamp3 = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
    const Vec = Object.freeze({ create: vec, add, sub, scale, dot, det, lengthSq, length, normalize });
    const DEFAULT_STATE_MOBILITY = Object.freeze({
      muster: 1,
      form: 1,
      dress: 0.08,
      march: 1,
      fight: 0,
      flee: 1,
      testudo: 0.22
    });
    function mobilityForState(publicState, stateMobility = DEFAULT_STATE_MOBILITY) {
      const state = typeof publicState === "string" ? publicState.toLowerCase() : publicState;
      let value;
      if (typeof stateMobility === "function") value = stateMobility(state);
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
      const state = typeof publicState === "string" ? publicState.toLowerCase() : publicState;
      return state === "dress" || state === "fight";
    }
    function visibleVelocity(agent) {
      return vec(
        Number.isFinite(agent.seenVx) ? agent.seenVx : 0,
        Number.isFinite(agent.seenVz) ? agent.seenVz : 0
      );
    }
    function position(agent) {
      return vec(Number.isFinite(agent.x) ? agent.x : 0, Number.isFinite(agent.z) ? agent.z : 0);
    }
    function makeAgentLine(self, other, options) {
      const dt = Math.max(EPSILON, Number.isFinite(options.dt) ? options.dt : 1 / 60);
      const dynamicHorizon = Math.max(
        EPSILON,
        Number.isFinite(options.timeHorizon) ? options.timeHorizon : 2.5
      );
      const staticHorizon = Math.max(
        EPSILON,
        Number.isFinite(options.staticTimeHorizon) ? options.staticTimeHorizon : dynamicHorizon
      );
      const staticTest = typeof options.isStaticState === "function" ? options.isStaticState : isStaticPublicState;
      const horizon = staticTest(other.publicState) ? staticHorizon : dynamicHorizon;
      const invTimeHorizon = 1 / horizon;
      const radiusOf = typeof options.collisionRadius === "function" ? options.collisionRadius : (agent) => Number.isFinite(agent.radius) ? agent.radius : 0.5;
      const padding = Number.isFinite(options.padding) ? Math.max(0, options.padding) : 0;
      const combinedRadius = Math.max(0, Number(radiusOf(self)) || 0) + Math.max(0, Number(radiusOf(other)) || 0) + padding;
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
      const responsibility = typeof options.responsibility === "function" ? clamp3(Number(options.responsibility(self.publicState, other.publicState)) || 0, 0, 1) : responsibilityForStates(self.publicState, other.publicState, options.stateMobility);
      return {
        point: add(selfVelocity, scale(u, responsibility)),
        direction: normalize(direction, vec(0, -1)),
        responsibility,
        timeHorizon: horizon
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
        const t2 = numerator / denominator;
        if (denominator >= 0) tRight = Math.min(tRight, t2);
        else tLeft = Math.max(tLeft, t2);
        if (tLeft > tRight) return { ok: false, result: vec() };
      }
      const t = directionOpt ? dot(optVelocity, line.direction) > 0 ? tRight : tLeft : clamp3(dot(line.direction, sub(optVelocity, line.point)), tLeft, tRight);
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
      let distance2 = 0;
      for (let i = beginLine; i < lines.length; i++) {
        const violation = det(lines[i].direction, sub(lines[i].point, result));
        if (violation <= distance2) continue;
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
        distance2 = det(lines[i].direction, sub(lines[i].point, result));
      }
      return result;
    }
    function solvePreferredVelocity(self, localNeighbors, preferredVelocity, maxSpeed, options = {}) {
      const fixedLines = Array.isArray(options.fixedLines) ? options.fixedLines.filter((line) => line && line.point && line.direction && [line.point.x, line.point.z, line.direction.x, line.direction.z].every(Number.isFinite)).map((line) => ({
        point: vec(line.point.x, line.point.z),
        direction: normalize(line.direction, vec(0, -1)),
        fixed: true
      })) : [];
      const lines = fixedLines.concat(buildAgentLines(self, localNeighbors, options));
      const preferred = vec(
        Number.isFinite(preferredVelocity.x) ? preferredVelocity.x : 0,
        Number.isFinite(preferredVelocity.z) ? preferredVelocity.z : 0
      );
      const speed = Math.max(0, Number(maxSpeed) || 0);
      const lp2 = linearProgram2(lines, speed, preferred, false);
      const velocity = lp2.failedLine < lines.length ? linearProgram3(lines, fixedLines.length, lp2.failedLine, speed, lp2.result) : lp2.result;
      return {
        x: velocity.x,
        z: velocity.z,
        lines,
        failedLine: lp2.failedLine,
        fixedLineCount: fixedLines.length
      };
    }
    return Object.freeze({
      EPSILON,
      Vec,
      DEFAULT_STATE_MOBILITY,
      mobilityForState,
      responsibilityForStates,
      isStaticPublicState,
      makeAgentLine,
      buildAgentLines,
      buildOrcaLines: buildAgentLines,
      linearProgram1,
      linearProgram2,
      linearProgram3,
      lp1: linearProgram1,
      lp2: linearProgram2,
      lp3: linearProgram3,
      solvePreferredVelocity,
      solve: solvePreferredVelocity
    });
  })();

  // src/capabilities.js
  var APTITUDE_BOUNDS = deepFreeze({ min: 0.9, max: 1.1 });
  var PROFILE_BOUNDS = deepFreeze({
    training: { min: 0.7, max: 1.35 },
    experience: { min: 0.75, max: 1.35 },
    equipment: { min: 0.6, max: 1.6 },
    penetration: { min: 0, max: 0.6 },
    modifierAdd: { min: -0.5, max: 0.5 },
    modifierMultiply: { min: 0.5, max: 1.5 }
  });
  var CAPABILITY_BOUNDS = deepFreeze({
    health: { min: 0.72, max: 1.45 },
    armor: { min: 0.55, max: 1.8 },
    shield: { min: 0.55, max: 1.65 },
    speed: { min: 0.72, max: 1.35 },
    acceleration: { min: 0.72, max: 1.35 },
    turn: { min: 0.75, max: 1.3 },
    stamina: { min: 0.7, max: 1.45 },
    perception: { min: 0.78, max: 1.3 },
    orderResponse: { min: 0.7, max: 1.4 },
    formation: { min: 0.7, max: 1.4 },
    reach: { min: 0.82, max: 1.22 },
    damage: { min: 0.62, max: 1.55 },
    attack: { min: 0.65, max: 1.5 },
    defense: { min: 0.65, max: 1.5 },
    morale: { min: 0.68, max: 1.45 },
    command: { min: 0.7, max: 1.45 },
    leadership: { min: 0.7, max: 1.45 },
    communication: { min: 0.72, max: 1.38 },
    routeThreshold: { min: 0.1, max: 0.24 },
    rallyThreshold: { min: 0.22, max: 0.42 }
  });
  var TRAINING_KEYS = Object.freeze([
    "weapons",
    "defense",
    "formation",
    "discipline",
    "conditioning",
    "awareness",
    "command",
    "tactics",
    "leadership",
    "communication"
  ]);
  var EXPERIENCE_KEYS = Object.freeze(["battle", "command"]);
  var EQUIPMENT_KEYS = Object.freeze([
    "weaponReach",
    "weaponDamage",
    "penetration",
    "armor",
    "shield",
    "load"
  ]);
  var EQUIPMENT_CLASS_KEYS = Object.freeze(["weaponClass", "armorClass", "shieldClass"]);
  var MODIFIABLE_STATS = Object.freeze([
    "health",
    "armor",
    "shield",
    "speed",
    "acceleration",
    "turn",
    "stamina",
    "perception",
    "orderResponse",
    "formation",
    "reach",
    "damage",
    "attack",
    "defense",
    "morale",
    "command",
    "leadership",
    "communication",
    "routeThreshold",
    "rallyThreshold"
  ]);
  var DEFAULT_UNIT_PROFILE = deepFreeze({
    training: Object.fromEntries(TRAINING_KEYS.map((key) => [key, 1])),
    experience: Object.fromEntries(EXPERIENCE_KEYS.map((key) => [key, 1])),
    equipment: {
      weaponClass: "gladius-basic",
      armorClass: "basic-armor",
      shieldClass: "scutum-basic",
      weaponReach: 1,
      weaponDamage: 1,
      penetration: 0,
      armor: 1,
      shield: 1,
      load: 1
    },
    modifiers: []
  });
  function finiteOr(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }
  function bounded(value, bounds, fallback = 1) {
    return clamp(finiteOr(value, fallback), bounds.min, bounds.max);
  }
  function safeClass(value, fallback) {
    return typeof value === "string" && value.trim() ? value.trim().slice(0, 80) : fallback;
  }
  function normalizedCategory(input, keys, bounds, defaults, partial = false) {
    const source = input && typeof input === "object" ? input : {};
    const output = {};
    for (const key of keys) {
      if (partial && !(key in source)) continue;
      output[key] = bounded(source[key], bounds, defaults[key]);
    }
    return output;
  }
  function normalizeModifier(effect, index) {
    if (!effect || typeof effect !== "object") {
      throw new TypeError(`modifier at index ${index} must be an object`);
    }
    const id = typeof effect.id === "string" && effect.id.trim() ? effect.id.trim().slice(0, 120) : `modifier-${index + 1}`;
    const stat = String(effect.stat || "");
    if (!MODIFIABLE_STATS.includes(stat)) {
      throw new RangeError(`unknown modifier stat: ${stat || "(empty)"}`);
    }
    const mode = effect.mode === "add" ? "add" : effect.mode === "multiply" ? "multiply" : null;
    if (!mode) throw new RangeError(`modifier ${id} mode must be add or multiply`);
    const rawValue = Number(effect.value);
    if (!Number.isFinite(rawValue)) throw new TypeError(`modifier ${id} value must be finite`);
    const value = mode === "add" ? clamp(rawValue, PROFILE_BOUNDS.modifierAdd.min, PROFILE_BOUNDS.modifierAdd.max) : clamp(
      rawValue,
      PROFILE_BOUNDS.modifierMultiply.min,
      PROFILE_BOUNDS.modifierMultiply.max
    );
    const startsAt = Number.isFinite(effect.startsAt) ? Number(effect.startsAt) : -Infinity;
    const expiresAt = Number.isFinite(effect.expiresAt) ? Number(effect.expiresAt) : Infinity;
    if (expiresAt < startsAt) throw new RangeError(`modifier ${id} expires before it starts`);
    return { id, stat, mode, value, startsAt, expiresAt };
  }
  function normalizeModifierList(input) {
    if (input == null) return [];
    if (!Array.isArray(input)) throw new TypeError("modifiers must be an array");
    const effects = input.map(normalizeModifier).sort((a, b) => a.id.localeCompare(b.id));
    for (let index = 1; index < effects.length; index++) {
      if (effects[index - 1].id === effects[index].id) {
        throw new RangeError(`duplicate modifier id: ${effects[index].id}`);
      }
    }
    return effects;
  }
  function normalizeUnitProfileLayer(input = {}) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new TypeError("unit profile layer must be an object");
    }
    const output = {};
    if ("training" in input) {
      output.training = normalizedCategory(
        input.training,
        TRAINING_KEYS,
        PROFILE_BOUNDS.training,
        DEFAULT_UNIT_PROFILE.training,
        true
      );
    }
    if ("experience" in input) {
      output.experience = normalizedCategory(
        input.experience,
        EXPERIENCE_KEYS,
        PROFILE_BOUNDS.experience,
        DEFAULT_UNIT_PROFILE.experience,
        true
      );
    }
    if ("equipment" in input) {
      const source = input.equipment && typeof input.equipment === "object" ? input.equipment : {};
      output.equipment = normalizedCategory(
        source,
        EQUIPMENT_KEYS.filter((key) => key !== "penetration"),
        PROFILE_BOUNDS.equipment,
        DEFAULT_UNIT_PROFILE.equipment,
        true
      );
      if ("penetration" in source) {
        output.equipment.penetration = bounded(
          source.penetration,
          PROFILE_BOUNDS.penetration,
          DEFAULT_UNIT_PROFILE.equipment.penetration
        );
      }
      for (const key of EQUIPMENT_CLASS_KEYS) {
        if (key in source) output.equipment[key] = safeClass(
          source[key],
          DEFAULT_UNIT_PROFILE.equipment[key]
        );
      }
    }
    if ("modifiers" in input) output.modifiers = normalizeModifierList(input.modifiers);
    return deepFreeze(output);
  }
  function prepareUnitProfileMap(input = {}) {
    if (input == null) return deepFreeze({});
    if (typeof input !== "object" || Array.isArray(input)) {
      throw new TypeError("unitProfiles must be an object keyed by default, team, century, or actor");
    }
    const output = /* @__PURE__ */ Object.create(null);
    for (const [key, layer] of Object.entries(input)) {
      output[String(key)] = normalizeUnitProfileLayer(layer);
    }
    return deepFreeze(output);
  }
  function mergeUnitProfileLayers(...layers) {
    const merged = {
      training: { ...DEFAULT_UNIT_PROFILE.training },
      experience: { ...DEFAULT_UNIT_PROFILE.experience },
      equipment: { ...DEFAULT_UNIT_PROFILE.equipment },
      modifiers: []
    };
    for (const rawLayer of layers) {
      if (!rawLayer) continue;
      const layer = normalizeUnitProfileLayer(rawLayer);
      Object.assign(merged.training, layer.training || {});
      Object.assign(merged.experience, layer.experience || {});
      Object.assign(merged.equipment, layer.equipment || {});
      if (layer.modifiers) merged.modifiers.push(...layer.modifiers.map((effect) => ({ ...effect })));
    }
    merged.modifiers.sort((a, b) => a.id.localeCompare(b.id));
    for (let index = 1; index < merged.modifiers.length; index++) {
      if (merged.modifiers[index - 1].id === merged.modifiers[index].id) {
        throw new RangeError(`duplicate modifier id across profile layers: ${merged.modifiers[index].id}`);
      }
    }
    return deepFreeze(merged);
  }
  function resolveUnitProfile(profileMap, team, centuryId, actorId = null) {
    const map = profileMap || {};
    return mergeUnitProfileLayers(
      map.default,
      map[team],
      map[centuryId],
      actorId ? map[actorId] : null
    );
  }
  function centeredTriangular(seed, actorKey, salt, lane = 0) {
    return hash01(seed, actorKey, salt, lane) + hash01(seed, actorKey, salt ^ 1540483477, lane + 17) - 1;
  }
  function aptitude(seed, actorKey, salt, latent, span = 0.08) {
    const specific = centeredTriangular(seed, actorKey, salt, 1);
    return clamp(
      1 + (latent * 0.58 + specific * 0.42) * span,
      APTITUDE_BOUNDS.min,
      APTITUDE_BOUNDS.max
    );
  }
  function copyDevelopment(unitProfile) {
    return {
      training: { ...unitProfile.training },
      experience: { ...unitProfile.experience },
      equipment: { ...unitProfile.equipment },
      modifiers: unitProfile.modifiers.map((effect) => ({ ...effect }))
    };
  }
  function createActorProfile({ seed, actorKey, profileId, kind, unitProfile }) {
    if (!["soldier", "centurion", "runner"].includes(kind)) {
      throw new RangeError("actor profile kind must be soldier, centurion, or runner");
    }
    const physical = centeredTriangular(seed, actorKey, 28929);
    const coordination = centeredTriangular(seed, actorKey, 28930);
    const temperament = centeredTriangular(seed, actorKey, 28931);
    const aptitudes = {
      stature: aptitude(seed, actorKey, 28945, physical, 0.065),
      strength: aptitude(seed, actorKey, 28946, physical, 0.085),
      agility: aptitude(seed, actorKey, 28947, coordination, 0.08),
      endurance: aptitude(seed, actorKey, 28948, physical, 0.08),
      perception: aptitude(seed, actorKey, 28949, coordination, 0.075),
      cognition: aptitude(seed, actorKey, 28950, coordination, 0.075),
      nerve: aptitude(seed, actorKey, 28951, temperament, 0.09)
    };
    const development = copyDevelopment(unitProfile || DEFAULT_UNIT_PROFILE);
    return deepFreeze({
      schemaVersion: 1,
      profileId: String(profileId),
      kind,
      aptitudes,
      training: development.training,
      experience: development.experience,
      equipment: development.equipment,
      modifiers: development.modifiers
    });
  }
  function weighted(values) {
    let total = 0;
    let weights = 0;
    for (const [value, weight] of values) {
      total += value * weight;
      weights += weight;
    }
    return weights ? total / weights : 1;
  }
  function resolveModifierStack(base, modifiers, stat, bounds, now = 0) {
    const ordered = (modifiers || []).filter((effect) => effect.stat === stat && now >= effect.startsAt && now <= effect.expiresAt).slice().sort((a, b) => a.id.localeCompare(b.id));
    let additive = 0;
    let logMultiplier = 0;
    for (const effect of ordered) {
      if (!Number.isFinite(effect.value)) continue;
      if (effect.mode === "add") additive += effect.value;
      else if (effect.mode === "multiply" && effect.value > 0) {
        logMultiplier += Math.log(effect.value);
      }
    }
    const adjustedBase = finiteOr(base, 1) + additive;
    if (!Number.isFinite(adjustedBase)) {
      return adjustedBase > 0 ? bounds.max : bounds.min;
    }
    if (adjustedBase === 0) return clamp(0, bounds.min, bounds.max);
    const logMagnitude = Math.log(Math.abs(adjustedBase)) + logMultiplier;
    if (logMagnitude > Math.log(Number.MAX_VALUE)) {
      return adjustedBase > 0 ? bounds.max : bounds.min;
    }
    if (logMagnitude < Math.log(Number.MIN_VALUE)) {
      return clamp(0, bounds.min, bounds.max);
    }
    return bounded(Math.sign(adjustedBase) * Math.exp(logMagnitude), bounds, 1);
  }
  function deriveCapabilities(profile, now = 0) {
    const a = profile.aptitudes;
    const t = profile.training;
    const e = profile.experience;
    const q = profile.equipment;
    const effects = profile.modifiers;
    const apply = (stat, base) => resolveModifierStack(
      base,
      effects,
      stat,
      CAPABILITY_BOUNDS[stat],
      now
    );
    const stamina = apply("stamina", weighted([
      [a.endurance, 0.48],
      [t.conditioning, 0.38],
      [e.battle, 0.14]
    ]));
    const speed = apply("speed", weighted([
      [a.agility, 0.38],
      [a.endurance, 0.2],
      [t.conditioning, 0.32],
      [1 / Math.sqrt(q.load), 0.1]
    ]));
    const perception = apply("perception", weighted([
      [a.perception, 0.5],
      [a.cognition, 0.14],
      [t.awareness, 0.28],
      [e.battle, 0.08]
    ]));
    const formation = apply("formation", weighted([
      [a.cognition, 0.2],
      [a.nerve, 0.1],
      [t.formation, 0.42],
      [t.discipline, 0.23],
      [e.battle, 0.05]
    ]));
    const orderResponse = apply("orderResponse", weighted([
      [a.cognition, 0.3],
      [a.nerve, 0.1],
      [t.formation, 0.25],
      [t.discipline, 0.28],
      [e.battle, 0.07]
    ]));
    const attack = apply("attack", weighted([
      [a.agility, 0.22],
      [a.perception, 0.12],
      [t.weapons, 0.43],
      [e.battle, 0.23]
    ]));
    const defense = apply("defense", weighted([
      [a.agility, 0.3],
      [a.perception, 0.13],
      [t.defense, 0.4],
      [e.battle, 0.17]
    ]));
    const morale = apply("morale", weighted([
      [a.nerve, 0.43],
      [t.discipline, 0.34],
      [e.battle, 0.18],
      [t.leadership, 0.05]
    ]));
    const promoted = profile.kind === "centurion" ? 1.06 : 1;
    const command = apply("command", weighted([
      [a.cognition, 0.24],
      [a.nerve, 0.11],
      [t.command, 0.31],
      [t.tactics, 0.16],
      [e.command, 0.18]
    ]) * promoted);
    const leadership = apply("leadership", weighted([
      [a.nerve, 0.31],
      [a.cognition, 0.14],
      [t.leadership, 0.35],
      [t.discipline, 0.08],
      [e.command, 0.12]
    ]) * promoted);
    const communication = apply("communication", weighted([
      [a.cognition, 0.21],
      [t.communication, 0.42],
      [t.command, 0.2],
      [e.command, 0.17]
    ]) * (profile.kind === "centurion" ? 1.03 : 1));
    const routeThreshold = apply("routeThreshold", 0.16 / morale);
    const rallyRaw = apply("rallyThreshold", 0.34 / Math.sqrt(morale * orderResponse));
    const rallyThreshold = clamp(
      rallyRaw,
      routeThreshold + 0.12,
      CAPABILITY_BOUNDS.rallyThreshold.max
    );
    return deepFreeze({
      body: {
        health: apply("health", weighted([
          [a.endurance, 0.48],
          [a.strength, 0.3],
          [t.conditioning, 0.22]
        ])),
        armor: apply("armor", q.armor),
        shield: apply("shield", q.shield)
      },
      movement: {
        speed,
        acceleration: apply("acceleration", weighted([
          [a.agility, 0.48],
          [t.conditioning, 0.3],
          [1 / Math.sqrt(q.load), 0.22]
        ])),
        turn: apply("turn", weighted([
          [a.agility, 0.68],
          [t.defense, 0.2],
          [1 / Math.sqrt(q.load), 0.12]
        ])),
        stamina,
        fatigueCost: clamp(q.load / stamina, 0.65, 1.55),
        fatigueRecovery: clamp(stamina / Math.sqrt(q.load), 0.68, 1.5)
      },
      perception: {
        quality: perception,
        sight: clamp(0.88 + perception * 0.12, 0.93, 1.08),
        fov: clamp(0.92 + perception * 0.08, 0.95, 1.06),
        closeAwareness: clamp(0.9 + perception * 0.1, 0.95, 1.06),
        error: clamp(1 / perception, 0.78, 1.28),
        targetMemory: clamp(0.7 + perception * 0.3, 0.88, 1.16)
      },
      formation: {
        quality: formation,
        orderResponse,
        reaction: clamp(1 / orderResponse, 0.7, 1.4),
        postGain: clamp(formation, 0.7, 1.4),
        arrivalTolerance: clamp(1 / formation, 0.72, 1.38),
        guideMemory: clamp(weighted([[formation, 0.55], [perception, 0.45]]), 0.72, 1.38),
        relayInterval: clamp(
          1 / weighted([[formation, 0.55], [communication, 0.45]]),
          0.72,
          1.38
        )
      },
      combat: {
        reach: apply("reach", q.weaponReach * (1 + (a.stature - 1) * 0.36)),
        damage: apply("damage", q.weaponDamage * weighted([
          [a.strength, 0.32],
          [t.weapons, 0.43],
          [e.battle, 0.25]
        ])),
        penetration: q.penetration,
        attack,
        defense,
        guardTime: clamp(1 / weighted([[attack, 0.65], [perception, 0.35]]), 0.7, 1.35),
        commitTime: clamp(1 / weighted([[attack, 0.72], [a.agility, 0.28]]), 0.7, 1.35),
        strikeTime: clamp(1 / weighted([[attack, 0.6], [a.agility, 0.4]]), 0.72, 1.32),
        recoveryTime: clamp(q.load / weighted([[attack, 0.38], [stamina, 0.62]]), 0.68, 1.45)
      },
      morale: {
        stability: morale,
        routeThreshold,
        rallyThreshold,
        recovery: clamp(morale * 0.62 + t.discipline * 0.38, 0.7, 1.45),
        casualtyShock: clamp(1 / morale, 0.68, 1.48),
        officerShock: clamp(1 / weighted([[morale, 0.65], [leadership, 0.35]]), 0.68, 1.48)
      },
      command: {
        quality: command,
        leadership,
        communication,
        judgment: clamp(weighted([
          [command, 0.42],
          [t.tactics, 0.38],
          [perception, 0.2]
        ]), 0.7, 1.45),
        orderCadence: clamp(1 / command, 0.7, 1.4),
        orderClarity: clamp(weighted([[command, 0.6], [communication, 0.4]]), 0.72, 1.4),
        reportCadence: clamp(
          1 / weighted([[command, 0.55], [communication, 0.45]]),
          0.72,
          1.4
        )
      },
      equipment: {
        weaponClass: q.weaponClass,
        armorClass: q.armorClass,
        shieldClass: q.shieldClass,
        load: q.load
      }
    });
  }
  function capabilityRatings(capabilities) {
    const causal = {
      health: capabilities.body.health,
      armor: capabilities.body.armor,
      attack: capabilities.combat.attack,
      defense: capabilities.combat.defense,
      morale: capabilities.morale.stability,
      formation: capabilities.formation.quality,
      orderResponse: capabilities.formation.orderResponse,
      reach: capabilities.combat.reach,
      damage: capabilities.combat.damage,
      speed: capabilities.movement.speed,
      perception: capabilities.perception.quality,
      command: capabilities.command.quality,
      leadership: capabilities.command.leadership
    };
    const overall = weighted([
      [causal.attack, 0.17],
      [causal.defense, 0.14],
      [causal.morale, 0.15],
      [causal.formation, 0.16],
      [causal.orderResponse, 0.12],
      [causal.health, 0.08],
      [causal.speed, 0.06],
      [causal.perception, 0.06],
      [causal.command, 0.06]
    ]);
    return deepFreeze({ ...causal, overall });
  }
  function summarizeCapabilities(capabilityList) {
    const ratings = capabilityList.map(capabilityRatings);
    if (!ratings.length) return deepFreeze({ count: 0, mean: {}, min: {}, max: {} });
    const keys = Object.keys(ratings[0]);
    const mean = {};
    const min = {};
    const max = {};
    for (const key of keys) {
      const values = ratings.map((rating) => rating[key]);
      mean[key] = values.reduce((sum, value) => sum + value, 0) / values.length;
      min[key] = Math.min(...values);
      max[key] = Math.max(...values);
    }
    return deepFreeze({ count: ratings.length, mean, min, max });
  }
  function orderReactionDelay(baseDelay, capabilities, commandClarity = 1) {
    return clamp(baseDelay * capabilities.formation.reaction / clamp(commandClarity, 0.72, 1.4), 0.05, 0.8);
  }
  function combatHitChance({
    baseChance,
    flankBonus,
    flank,
    shieldFront,
    attacker,
    target,
    fatigue = 0,
    targetKind = "soldier"
  }) {
    const defenseExposure = flank ? 0.22 : shieldFront ? 1 : 0.62;
    return clamp(baseChance + (flank ? flankBonus : 0) + (attacker.combat.attack - 1) * 0.26 - (target.combat.defense - 1) * 0.24 * defenseExposure - (shieldFront ? 0.19 * target.body.shield : 0) - clamp(fatigue, 0, 1) * 0.18 + (targetKind === "centurion" ? -0.05 : 0), 0.08, 0.88);
  }
  function combatDamage({ directionalBase, attacker, target }) {
    const effectiveArmor = target.body.armor > 1 ? 1 + (target.body.armor - 1) * (1 - attacker.combat.penetration) : target.body.armor;
    return clamp(
      directionalBase * attacker.combat.damage / Math.max(0.45, effectiveArmor),
      0.15,
      1.25
    );
  }

  // src/engine.js
  var otherTeam = (team) => team === TEAM.BLUE ? TEAM.RED : TEAM.BLUE;
  var copyPacket = (packet) => deepFreeze(JSON.parse(JSON.stringify(packet)));
  var stableNumericKey = (value) => [...String(value)].reduce(
    (hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0,
    2166136261
  );
  function detachedFrozen(value) {
    const clone = (source) => {
      if (!source || typeof source !== "object") return source;
      if (Array.isArray(source)) return source.map(clone);
      return Object.fromEntries(Object.entries(source).map(([key, child]) => [key, clone(child)]));
    };
    return deepFreeze(clone(value));
  }
  function attachCondition(body, initial) {
    body.condition = {
      hp: initial.hp,
      morale: initial.morale ?? 1,
      fatigue: initial.fatigue ?? 0,
      effects: []
    };
    for (const key of ["hp", "morale", "fatigue"]) {
      Object.defineProperty(body, key, {
        enumerable: true,
        configurable: false,
        get() {
          return this.condition[key];
        },
        set(value) {
          this.condition[key] = value;
        }
      });
    }
    return body;
  }
  function formationPlan(strength) {
    const ranks = TUNING.ranks;
    return Object.freeze({ ranks, columns: Math.max(1, Math.ceil(strength / ranks)) });
  }
  function formationHalfWidth(plan, spacing = TUNING.spacing) {
    return Math.max(0, plan.columns - 1) * spacing * 0.5;
  }
  function guideFromCenter(center, heading, plan, spacing = TUNING.spacing) {
    return worldFromLocal(
      center,
      heading,
      -(formationHalfWidth(plan, spacing) + TUNING.centurionGuideGap),
      Math.max(0, plan.ranks - 1) * spacing * 0.5
    );
  }
  function centerFromGuide(guide, heading, plan, spacing = TUNING.spacing) {
    const offset = worldFromLocal(
      { x: 0, z: 0 },
      heading,
      -(formationHalfWidth(plan, spacing) + TUNING.centurionGuideGap),
      Math.max(0, plan.ranks - 1) * spacing * 0.5
    );
    return { x: guide.x - offset.x, z: guide.z - offset.z };
  }
  function slotPosition(center, heading, doctrine) {
    return worldFromLocal(center, heading, doctrine.lateral, doctrine.depth);
  }
  function postureIsValid(posture) {
    return POSTURES.includes(posture);
  }
  function createBattlefieldSimulation(options = {}) {
    const unitProfiles = prepareUnitProfileMap(options.unitProfiles || {});
    const generalAIOption = options.generalAI;
    const config = {
      seed: Number.isFinite(options.seed) ? Number(options.seed) >>> 0 : 805322756,
      perCentury: clamp(Math.round(Number(options.perCentury) || TUNING.defaultPerCentury), 12, 100),
      unitProfiles,
      generalAIBlue: Boolean(generalAIOption === true || generalAIOption?.[TEAM.BLUE]),
      generalAIRed: Boolean(generalAIOption === true || generalAIOption?.[TEAM.RED]),
      paused: false,
      timeScale: 1,
      showCognition: false,
      showMessages: true
    };
    let simTime = 0;
    let tick = 0;
    let matchResult = null;
    let spatial = null;
    let spatialCell = 3.2;
    const centuries = [];
    const soldiers = [];
    const couriers = [];
    const fallenBodies = [];
    const pendingStrikes = [];
    const combatEvents = [];
    const communicationEvents = [];
    const observerEvents = [];
    let observerEventCursor = 0;
    const aggregateCounters = {
      messagesDispatched: 0,
      messagesDelivered: 0,
      runnerDeliveries: 0,
      voiceDeliveries: 0,
      strikes: 0,
      hits: 0,
      soldierCasualties: 0,
      centurionCasualties: 0,
      runnerLosses: 0
    };
    const generalCommandQueue = [];
    const nextGeneralCommandSerial = { [TEAM.BLUE]: 1, [TEAM.RED]: 1 };
    const generalBrains = /* @__PURE__ */ new Map();
    const bodyById = /* @__PURE__ */ new Map();
    const officerByPublicMark = /* @__PURE__ */ new Map();
    const generalPosts = Object.freeze({
      [TEAM.BLUE]: Object.freeze({ x: 0, z: -54 }),
      [TEAM.RED]: Object.freeze({ x: 0, z: 54 })
    });
    function generalAIEnabled(team) {
      return team === TEAM.BLUE ? config.generalAIBlue : config.generalAIRed;
    }
    function strengthBandForEstimate(estimate, initial) {
      if (!Number.isFinite(estimate)) return "unknown";
      const ratio = estimate / Math.max(1, initial);
      if (ratio >= 0.82) return "full";
      if (ratio >= 0.56) return "worn";
      if (ratio >= 0.28) return "depleted";
      return "remnant";
    }
    function contactStrengthBand(estimate) {
      if (!Number.isFinite(estimate)) return "unknown";
      if (estimate >= 28) return "many";
      if (estimate >= 11) return "body";
      return "few";
    }
    function generalStatusBand(state) {
      if ([CENTURION_STATE.WITHDRAW, CENTURION_STATE.ROUTED].includes(state)) {
        return "withdrawing";
      }
      if ([
        CENTURION_STATE.ADVANCE,
        CENTURION_STATE.STAGE_FLANK,
        CENTURION_STATE.MARCH_TO_ZONE,
        CENTURION_STATE.MANEUVER_FLANK,
        CENTURION_STATE.FEINT_OUT
      ].includes(state)) {
        return "moving";
      }
      if (state === CENTURION_STATE.FORM_LINE) return "forming";
      if ([
        CENTURION_STATE.FIX_ENEMY,
        CENTURION_STATE.COUNTER,
        CENTURION_STATE.AMBUSH_STRIKE,
        CENTURION_STATE.GUARD_FLANK,
        CENTURION_STATE.SUPPORT_ALLY
      ].includes(state)) return "engaged";
      if (state === CENTURION_STATE.FEINT_RETIRE) return "retiring";
      return "holding";
    }
    function createGeneralBrain(team) {
      const teamLane = team === TEAM.BLUE ? 1 : 2;
      const traits = deepFreeze({
        aggression: 0.34 + hash01(config.seed, teamLane, 769, 1) * 0.48,
        deception: 0.24 + hash01(config.seed, teamLane, 770, 2) * 0.58,
        patience: 10 + hash01(config.seed, teamLane, 771, 3) * 10,
        acumen: 0.88 + hash01(config.seed, teamLane, 772, 4) * 0.24
      });
      const friendlyTracks = /* @__PURE__ */ new Map();
      for (const century of centuries.filter((unit) => unit.team === team)) {
        friendlyTracks.set(century.standard, {
          centuryId: century.id,
          mark: century.standard,
          x: century.deploymentAnchor.x,
          z: century.deploymentAnchor.z,
          vx: 0,
          vz: 0,
          heading: TEAM_DOCTRINE[team].forwardHeading,
          doctrinePlan: Object.freeze({
            ranks: century.plan.ranks,
            columns: century.plan.columns
          }),
          spacing: century.spacing,
          strengthEstimate: century.initialStrength,
          initialStrength: century.initialStrength,
          statusBand: "deployed",
          standardCode: STANDARD_CODE.NONE,
          confidence: 0.55,
          observedAt: 0,
          updatedAt: 0,
          source: "doctrine",
          intendedPosture: team === TEAM.BLUE ? POSTURE.AGGRESSIVE : POSTURE.HOLD,
          confirmedPosture: team === TEAM.BLUE ? POSTURE.AGGRESSIVE : POSTURE.HOLD,
          confirmedPostureSerial: 0,
          intendedZoneActive: false,
          confirmedZoneActive: false,
          intendedZone: null,
          confirmedZone: null,
          confirmedZoneSerial: 0,
          strengthConfidence: 0.55,
          strengthObservedAt: 0
        });
      }
      const general = {
        team,
        post: generalPosts[team],
        brain: {
          state: GENERAL_STATE.OBSERVE,
          intent: team === TEAM.BLUE ? POSTURE.AGGRESSIVE : POSTURE.HOLD,
          reason: "awaiting-evidence",
          traits,
          thinkT: hash01(config.seed, teamLane, 773, 5) * TUNING.generalThink,
          nextDecisionAt: traits.patience,
          lastDecisionAt: 0,
          lastOrderAt: 0,
          lastOrderedPosture: team === TEAM.BLUE ? POSTURE.AGGRESSIVE : POSTURE.HOLD,
          decisionSerial: 0,
          ordersIssued: 0,
          reportsReceived: 0,
          deceptionCommittedAt: -Infinity,
          deceptionSpent: false,
          zoneIssuedAt: -Infinity,
          zoneActive: false,
          lastZoneIntent: null,
          friendlyTracks,
          enemyTracks: /* @__PURE__ */ new Map(),
          signatureTracks: /* @__PURE__ */ new Map(),
          directSight: deepFreeze({ observedAt: 0, bodies: [], remains: [] }),
          nextTrackSerial: 1,
          orderReceipts: /* @__PURE__ */ new Map(),
          postureReceipts: /* @__PURE__ */ new Map(),
          zoneReceipts: /* @__PURE__ */ new Map(),
          receiptHistory: /* @__PURE__ */ new Map(),
          runnerLeases: /* @__PURE__ */ new Map()
        }
      };
      generalBrains.set(team, general);
      return general;
    }
    function emitObserver(type, payload = {}) {
      observerEvents.push(deepFreeze({
        index: observerEventCursor++,
        type,
        t: simTime,
        payload: { ...payload }
      }));
      if (observerEvents.length > 300) observerEvents.splice(0, observerEvents.length - 300);
    }
    function logCommunication(event) {
      if (event.event === "dispatched") aggregateCounters.messagesDispatched++;
      if (event.event === "delivered") {
        aggregateCounters.messagesDelivered++;
        if (event.delivery === "runner") aggregateCounters.runnerDeliveries++;
        if (event.delivery === "voice") aggregateCounters.voiceDeliveries++;
      }
      communicationEvents.push(deepFreeze({ t: simTime, ...event }));
      if (communicationEvents.length > 2e3) {
        communicationEvents.splice(0, communicationEvents.length - 2e3);
      }
    }
    function logCombat(event) {
      if (event.event === "hit" || event.event === "miss") aggregateCounters.strikes++;
      if (event.event === "hit") aggregateCounters.hits++;
      if (event.event === "casualty") {
        if (event.kind === "soldier") aggregateCounters.soldierCasualties++;
        if (event.kind === "centurion") aggregateCounters.centurionCasualties++;
        if (event.kind === "runner") aggregateCounters.runnerLosses++;
      }
      combatEvents.push(deepFreeze({ t: simTime, ...event }));
      if (combatEvents.length > 3e3) combatEvents.splice(0, combatEvents.length - 3e3);
    }
    function centuryById(id) {
      return centuries.find((century) => century.id === id) || null;
    }
    function partnerOf(century) {
      return centuries.find((other) => other.team === century.team && other.id !== century.id) || null;
    }
    function aliveSoldiers(century) {
      return soldiers.filter((soldier) => soldier.alive && soldier.centuryId === century.id);
    }
    function currentCenturyCenter(century) {
      return centerFromGuide(
        century.centurion,
        century.centurion.heading,
        century.plan,
        century.spacing
      );
    }
    function roleForPosture(posture, index) {
      if (posture === POSTURE.AGGRESSIVE) {
        return index === 0 ? TACTICAL_ROLE.FIX : TACTICAL_ROLE.FLANK;
      }
      if (posture === POSTURE.DEFENSIVE_FEINT) {
        return index === 0 ? TACTICAL_ROLE.BAIT : TACTICAL_ROLE.COVER;
      }
      return TACTICAL_ROLE.HOLD_WING;
    }
    function createCentury(team, index) {
      const plan = formationPlan(config.perCentury);
      const heading = TEAM_DOCTRINE[team].forwardHeading;
      const halfWidth = formationHalfWidth(plan);
      const centerSeparation = halfWidth * 2 + TUNING.centuryGap;
      const wingSign = index === 0 ? -1 : 1;
      const center = {
        x: wingSign * centerSeparation * 0.5,
        z: TEAM_DOCTRINE[team].deploymentZ
      };
      const guide = guideFromCenter(center, heading, plan);
      const id = `${team}-${index + 1}`;
      const unitProfile = resolveUnitProfile(config.unitProfiles, team, id);
      const centurionId = `centurion-${id}`;
      const centurionUnitProfile = resolveUnitProfile(config.unitProfiles, team, id, centurionId);
      const centurionProfile = createActorProfile({
        seed: config.seed,
        actorKey: 5e4 + index,
        profileId: `profile-centurion-${id}`,
        kind: "centurion",
        unitProfile: centurionUnitProfile
      });
      const centurionCapabilities = deriveCapabilities(centurionProfile);
      const centurion = attachCondition({
        id: centurionId,
        kind: "centurion",
        team,
        centuryId: id,
        x: guide.x,
        z: guide.z,
        vx: 0,
        vz: 0,
        seenVx: 0,
        seenVz: 0,
        heading,
        radius: TUNING.centurionRadius,
        maxHp: 2.2 * centurionCapabilities.body.health,
        profile: centurionProfile,
        capabilities: centurionCapabilities,
        ratings: capabilityRatings(centurionCapabilities),
        alive: true,
        publicState: CENTURION_STATE.HOLD,
        publicOrderCue: null,
        standardCode: STANDARD_CODE.NONE,
        standardEpoch: 0,
        standardRaisedAt: -Infinity,
        nextStandardCode: STANDARD_CODE.NONE,
        nextStandardEpoch: 0
      }, {
        hp: 2.2 * centurionCapabilities.body.health,
        morale: clamp(0.94 + (centurionCapabilities.morale.stability - 1) * 0.12, 0.82, 1),
        fatigue: 0
      });
      centurion.publicMark = `${team === TEAM.BLUE ? "B" : "R"}${index + 1}`;
      officerByPublicMark.set(centurion.publicMark, centurion);
      const initialPosture = team === TEAM.BLUE ? POSTURE.AGGRESSIVE : POSTURE.HOLD;
      const century = {
        id,
        team,
        index,
        wingSign,
        outerLateralSign: wingSign,
        standard: `${team === TEAM.BLUE ? "B" : "R"}${index + 1}`,
        initialStrength: config.perCentury,
        plan,
        spacing: TUNING.spacing,
        posture: initialPosture,
        fallbackAnchor: Object.freeze({ ...center }),
        deploymentAnchor: Object.freeze({ ...center }),
        deploymentProfile: unitProfile,
        capabilitySummary: null,
        holdZone: null,
        centurion,
        soldierIds: [],
        orderSerial: 0,
        publicOrder: null,
        publicOrderUntil: 0,
        nextPublicOrder: null,
        nextPublicOrderUntil: 0,
        muted: false,
        brain: {
          state: CENTURION_STATE.HOLD,
          thinkT: agentRandom(config.seed, index + (team === TEAM.RED ? 10 : 0), 641) * TUNING.centurionThink,
          reportT: 0,
          lastReportedState: null,
          lastReportedThreat: null,
          lastReportedStandard: null,
          lastReportedContact: null,
          orderT: 0,
          scanPhase: agentRandom(config.seed, index, team === TEAM.BLUE ? 642 : 643) * Math.PI * 2,
          gazeHeading: heading,
          desiredHeading: heading,
          desiredVelocity: { x: 0, z: 0 },
          enemyTracks: /* @__PURE__ */ new Map(),
          signatureTracks: /* @__PURE__ */ new Map(),
          nextTrackSerial: 1,
          individualContacts: [],
          allyTrack: null,
          inbox: [],
          commandInbox: [],
          seenInboxSerials: /* @__PURE__ */ new Set(),
          lastGeneralCommandSerial: { posture: 0, zone: 0 },
          pendingMission: null,
          abortedMission: null,
          abortedAt: -Infinity,
          nextAbortResponseAt: 0,
          lastCommittedMission: null,
          plan: {
            epoch: 0,
            pendingEpoch: null,
            status: PLAN_STATUS.DOCTRINE,
            scope: "doctrine",
            posture: initialPosture,
            role: roleForPosture(initialPosture, index),
            allyRole: roleForPosture(initialPosture, index === 0 ? 1 : 0),
            coordinatorId: `${team}-1`,
            proposedAt: 0,
            committedAt: 0,
            nextTxAt: 0,
            retries: 0
          },
          standard: {
            code: STANDARD_CODE.NONE,
            epoch: 0,
            until: 0
          },
          fixSignalUntil: 0,
          fixSignalEpoch: -1,
          fixSignalEvidenceAt: -Infinity,
          flankCommitEpoch: -1,
          feintSignalUntil: 0,
          feintSignalEpoch: -1,
          feintSignalEvidenceAt: -Infinity,
          allyAbortNotice: null,
          feintRetreatStart: null,
          feintCompletedEpoch: -1,
          feintHoldPoint: null,
          withdrawUntil: 0,
          runnerReturnedAt: 0,
          voiceAvailableAt: 0,
          contactConfidence: 0,
          flankThreat: null,
          flankThreatUntil: 0,
          supportRequest: null,
          perceivedOwn: config.perCentury,
          perceivedCohesion: 1,
          perceivedMorale: 1,
          lineDepthError: 0,
          lineGapError: 0,
          lineHeading: heading,
          lineIntegrityBand: "sound",
          doctrinePriority: "mission",
          doctrineCommitUntil: 0,
          zonePhase: "none",
          zoneResumeAt: 0,
          helpRequest: null,
          centurionRunnerLease: null,
          communicationState: "local",
          ordersIssued: 0,
          messagesSent: 0,
          messagesReceived: 0,
          lastReason: "deployment"
        }
      };
      centuries.push(century);
      bodyById.set(centurion.id, centurion);
      let created = 0;
      for (let rank = 0; rank < plan.ranks && created < config.perCentury; rank++) {
        for (let file = 0; file < plan.columns && created < config.perCentury; file++) {
          const localIndex = created++;
          const lateral = (file - (plan.columns - 1) * 0.5) * century.spacing;
          const depth = ((plan.ranks - 1) * 0.5 - rank) * century.spacing;
          const post = worldFromLocal(center, heading, lateral, depth);
          const jitterX = (agentRandom(config.seed, localIndex, index + 31, team === TEAM.BLUE ? 1 : 2) - 0.5) * 0.04;
          const jitterZ = (agentRandom(config.seed, localIndex, index + 61, team === TEAM.BLUE ? 3 : 4) - 0.5) * 0.04;
          const soldierId = `${id}-s${localIndex + 1}`;
          const doctrine = deepFreeze({
            centuryId: id,
            standard: century.standard,
            team,
            rank,
            file,
            lateral,
            depth,
            ranks: plan.ranks,
            columns: plan.columns,
            spacing: century.spacing,
            wingSign,
            relayDuty: file % 3 === 0 || file === plan.columns - 1,
            initialStrength: config.perCentury
          });
          const numericId = (team === TEAM.BLUE ? 0 : 1e4) + index * 1e3 + localIndex;
          const soldierProfile = createActorProfile({
            seed: config.seed,
            actorKey: index * 1e3 + localIndex,
            profileId: `profile-${soldierId}`,
            kind: "soldier",
            unitProfile: resolveUnitProfile(config.unitProfiles, team, id, soldierId)
          });
          const capabilities = deriveCapabilities(soldierProfile);
          const initialFatigue = agentRandom(config.seed, localIndex, 645, index) * 0.05;
          const initialMorale = clamp(0.92 + agentRandom(config.seed, localIndex, 646, index) * 0.07 + (capabilities.morale.stability - 1) * 0.12, 0.82, 0.995);
          const soldier = attachCondition({
            id: soldierId,
            numericId,
            kind: "soldier",
            team,
            centuryId: id,
            x: post.x + jitterX,
            z: post.z + jitterZ,
            vx: 0,
            vz: 0,
            seenVx: 0,
            seenVz: 0,
            speed: 0,
            heading,
            radius: TUNING.bodyRadius,
            maxHp: capabilities.body.health,
            profile: soldierProfile,
            capabilities,
            ratings: capabilityRatings(capabilities),
            alive: true,
            doctrine,
            publicMark: century.standard,
            publicState: SOLDIER_STATE.DRESS,
            nextPublicState: SOLDIER_STATE.DRESS,
            publicOrderCue: null,
            nextOrderCue: null,
            publicGuideCue: null,
            nextGuideCue: null,
            guideTrack: {
              x: centurion.x,
              z: centurion.z,
              heading,
              confidence: 1,
              observedAt: 0,
              relayHops: 0
            },
            lastHeardOrder: 0,
            privateOrder: null,
            orderCallT: agentRandom(config.seed, localIndex, 647, index) * 0.45,
            guideCallT: agentRandom(config.seed, localIndex, 648, index) * 0.65,
            orderUnderstoodAt: 0,
            thinkT: agentRandom(config.seed, localIndex, 644, index) * TUNING.soldierThink,
            plannedVx: 0,
            plannedVz: 0,
            targetX: post.x,
            targetZ: post.z,
            combatState: COMBAT_STATE.READY,
            combatAge: 0,
            targetMemory: null,
            strikeSerial: 0,
            lastLossScan: -Infinity
          }, { hp: capabilities.body.health, fatigue: initialFatigue, morale: initialMorale });
          soldiers.push(soldier);
          century.soldierIds.push(soldier.id);
          bodyById.set(soldier.id, soldier);
        }
      }
      century.capabilitySummary = summarizeCapabilities([
        centurion.capabilities,
        ...century.soldierIds.map((soldierId) => bodyById.get(soldierId).capabilities)
      ]);
      return century;
    }
    function initializeBattlefield() {
      simTime = 0;
      tick = 0;
      nextGeneralCommandSerial[TEAM.BLUE] = 1;
      nextGeneralCommandSerial[TEAM.RED] = 1;
      matchResult = null;
      centuries.length = 0;
      soldiers.length = 0;
      couriers.length = 0;
      fallenBodies.length = 0;
      pendingStrikes.length = 0;
      combatEvents.length = 0;
      communicationEvents.length = 0;
      observerEvents.length = 0;
      for (const key of Object.keys(aggregateCounters)) aggregateCounters[key] = 0;
      generalCommandQueue.length = 0;
      bodyById.clear();
      officerByPublicMark.clear();
      generalBrains.clear();
      createCentury(TEAM.BLUE, 0);
      createCentury(TEAM.BLUE, 1);
      createCentury(TEAM.RED, 0);
      createCentury(TEAM.RED, 1);
      createGeneralBrain(TEAM.BLUE);
      createGeneralBrain(TEAM.RED);
      for (const century of centuries) {
        const partner = partnerOf(century);
        const ownCenter = currentCenturyCenter(century);
        const partnerCenter = currentCenturyCenter(partner);
        const local = localFromWorld(ownCenter, century.centurion.heading, partnerCenter);
        century.outerLateralSign = local.lateral >= 0 ? -1 : 1;
        century.brain.allyAssemblyPoint = Object.freeze({ ...partnerCenter });
        century.brain.allyDoctrine = deepFreeze({
          plan: { ranks: partner.plan.ranks, columns: partner.plan.columns },
          spacing: partner.spacing
        });
        publishCenturyOrder(century, "hold", century.centurion.heading, 0, "deployment");
      }
      commitCenturyOrders();
      spatial = null;
      emitObserver("reset", { seed: config.seed, perCentury: config.perCentury });
    }
    function spatialKey(ix, iz) {
      return `${ix},${iz}`;
    }
    function rebuildSpatial(cellSize = 3.2) {
      spatialCell = cellSize;
      spatial = /* @__PURE__ */ new Map();
      for (const body of bodyById.values()) {
        if (!body.alive) continue;
        const ix = Math.floor(body.x / cellSize);
        const iz = Math.floor(body.z / cellSize);
        const key = spatialKey(ix, iz);
        let bucket = spatial.get(key);
        if (!bucket) spatial.set(key, bucket = []);
        bucket.push(body);
      }
    }
    function queryPhysicalBodies(x, z, radius, self = null) {
      if (!spatial) rebuildSpatial();
      const output = [];
      const minX = Math.floor((x - radius) / spatialCell);
      const maxX = Math.floor((x + radius) / spatialCell);
      const minZ = Math.floor((z - radius) / spatialCell);
      const maxZ = Math.floor((z + radius) / spatialCell);
      const radiusSq = radius * radius;
      for (let ix = minX; ix <= maxX; ix++) {
        for (let iz = minZ; iz <= maxZ; iz++) {
          const bucket = spatial.get(spatialKey(ix, iz));
          if (!bucket) continue;
          for (const body of bucket) {
            if (body === self || !body.alive) continue;
            const dx = body.x - x;
            const dz = body.z - z;
            if (dx * dx + dz * dz <= radiusSq) output.push(body);
          }
        }
      }
      return output;
    }
    function withinSensorArc(observer, target, heading, range, fov, closeRange) {
      const d = distance(observer, target);
      if (d > range) return false;
      if (d <= closeRange) return true;
      return Math.abs(angleDifference(headingTo(observer, target), heading)) <= fov * 0.5;
    }
    function noisyPoint(observerId, sourceId, point, range, salt, errorScale = 1) {
      const observerKey = [...String(observerId)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const sourceKey = [...String(sourceId)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
      const epoch = Math.floor(simTime * 3);
      const error = (0.12 + range * 6e-3) * clamp(errorScale, 0.7, 1.35);
      return {
        x: quantize(point.x + (hash01(config.seed, observerKey, sourceKey, epoch + salt) - 0.5) * error, 0.1),
        z: quantize(point.z + (hash01(config.seed, sourceKey, observerKey, epoch + salt + 17) - 0.5) * error, 0.1)
      };
    }
    function clusterGeneralDetections(detections) {
      const components = [];
      const unused = new Set(detections.map((_, index) => index));
      const linkDistanceSq = 2.8 ** 2;
      while (unused.size) {
        const seedIndex = unused.values().next().value;
        unused.delete(seedIndex);
        const queue = [seedIndex];
        const component = [];
        while (queue.length) {
          const index = queue.pop();
          const detection = detections[index];
          component.push(detection);
          for (const candidateIndex of [...unused]) {
            const candidate = detections[candidateIndex];
            const dx = detection.x - candidate.x;
            const dz = detection.z - candidate.z;
            if (dx * dx + dz * dz <= linkDistanceSq) {
              unused.delete(candidateIndex);
              queue.push(candidateIndex);
            }
          }
        }
        if (component.length < TUNING.minimumFormationEvidence) continue;
        const inverse = 1 / component.length;
        let x = 0;
        let z = 0;
        let vx = 0;
        let vz = 0;
        let headingX = 0;
        let headingZ = 0;
        let minX = Infinity;
        let maxX = -Infinity;
        let minZ = Infinity;
        let maxZ = -Infinity;
        let signature = null;
        for (const detection of component) {
          x += detection.x;
          z += detection.z;
          vx += detection.vx;
          vz += detection.vz;
          headingX += Math.sin(detection.heading);
          headingZ += Math.cos(detection.heading);
          minX = Math.min(minX, detection.x);
          maxX = Math.max(maxX, detection.x);
          minZ = Math.min(minZ, detection.z);
          maxZ = Math.max(maxZ, detection.z);
          if (detection.publicMark) signature = detection.publicMark;
        }
        components.push(deepFreeze({
          contactClass: "formation",
          signature,
          x: quantize(x * inverse, 0.5),
          z: quantize(z * inverse, 0.5),
          vx: quantize(vx * inverse, 0.2),
          vz: quantize(vz * inverse, 0.2),
          heading: quantize(Math.atan2(headingX, headingZ), Math.PI / 36),
          visibleStrength: component.length,
          width: quantize(Math.hypot(maxX - minX, maxZ - minZ), 1),
          observedAt: simTime
        }));
      }
      return components;
    }
    function senseGeneral(general) {
      const friendlyStrength = /* @__PURE__ */ new Map();
      const friendlyObservations = [];
      const enemyDetections = [];
      const directlySeenBodies = [];
      const directlySeenRemains = [];
      const sight = TUNING.generalSight * general.brain.traits.acumen;
      for (const body of bodyById.values()) {
        if (!body.alive) continue;
        const range = distance(general.post, body);
        if (body.team === general.team) {
          if (body.kind === "soldier" && range <= sight && body.publicMark) {
            friendlyStrength.set(
              body.publicMark,
              (friendlyStrength.get(body.publicMark) || 0) + 1
            );
          }
          continue;
        }
        if (range > sight) continue;
        directlySeenBodies.push(deepFreeze({
          visualClass: body.kind === "centurion" ? "standard" : body.kind === "runner" ? "runner" : "ranker",
          x: quantize(body.x, 0.05),
          z: quantize(body.z, 0.05),
          heading: quantize(body.heading, Math.PI / 72),
          ...body.kind === "centurion" && body.publicMark ? { recognizedMark: body.publicMark } : {}
        }));
        if (body.kind === "runner") continue;
        const point = noisyPoint(
          `general-${general.team}`,
          body.id,
          body,
          range,
          774,
          1 / general.brain.traits.acumen
        );
        enemyDetections.push({
          kind: body.kind,
          x: point.x,
          z: point.z,
          vx: quantize(body.seenVx || 0, 0.2),
          vz: quantize(body.seenVz || 0, 0.2),
          heading: quantize(body.heading, Math.PI / 36),
          publicMark: body.kind === "centurion" ? body.publicMark : null
        });
      }
      for (const body of fallenBodies) {
        if (body.team === general.team || distance(general.post, body) > sight) continue;
        directlySeenRemains.push(deepFreeze({
          visualClass: body.kind === "centurion" ? "standard" : body.kind === "runner" ? "runner" : "ranker",
          x: quantize(body.x, 0.05),
          z: quantize(body.z, 0.05),
          heading: quantize(body.heading, Math.PI / 72)
        }));
      }
      const sortVisualGeometry = (left, right) => left.visualClass.localeCompare(right.visualClass) || left.x - right.x || left.z - right.z || left.heading - right.heading || String(left.recognizedMark || "").localeCompare(String(right.recognizedMark || ""));
      directlySeenBodies.sort(sortVisualGeometry);
      directlySeenRemains.sort(sortVisualGeometry);
      for (const body of bodyById.values()) {
        if (!body.alive || body.team !== general.team || body.kind !== "centurion") continue;
        const range = distance(general.post, body);
        if (range > TUNING.generalStandardSight) continue;
        const doctrineTrack = general.brain.friendlyTracks.get(body.publicMark);
        const formationCenter = doctrineTrack ? centerFromGuide(
          body,
          body.heading,
          doctrineTrack.doctrinePlan,
          doctrineTrack.spacing
        ) : body;
        const footprintRadius = doctrineTrack ? Math.hypot(
          formationHalfWidth(doctrineTrack.doctrinePlan, doctrineTrack.spacing),
          Math.max(0, doctrineTrack.doctrinePlan.ranks - 1) * doctrineTrack.spacing * 0.5
        ) + 1.5 : Infinity;
        const fullFootprintVisible = distance(general.post, formationCenter) + footprintRadius <= sight;
        const point = noisyPoint(
          `general-${general.team}`,
          body.id,
          body,
          range,
          775,
          1 / general.brain.traits.acumen
        );
        friendlyObservations.push(deepFreeze({
          recognizedMark: body.publicMark,
          x: quantize(point.x, 0.5),
          z: quantize(point.z, 0.5),
          vx: quantize(body.seenVx || 0, 0.2),
          vz: quantize(body.seenVz || 0, 0.2),
          heading: quantize(body.heading, Math.PI / 36),
          publicState: body.publicState,
          standardCode: simTime - body.standardRaisedAt >= TUNING.standardSignalDelay ? body.standardCode || STANDARD_CODE.NONE : STANDARD_CODE.NONE,
          visibleStrength: fullFootprintVisible ? friendlyStrength.get(body.publicMark) ?? 0 : null,
          strengthCoverage: fullFootprintVisible ? "full-footprint" : "partial-or-unknown",
          observedAt: simTime,
          positionKind: "guide",
          source: "vision"
        }));
      }
      return deepFreeze({
        friendlyObservations,
        enemyObservations: clusterGeneralDetections(enemyDetections),
        directSight: {
          observedAt: simTime,
          bodies: directlySeenBodies,
          remains: directlySeenRemains
        }
      });
    }
    function associateGeneralEnemyTrack(general, observation) {
      const brain = general.brain;
      if (observation.signature && brain.signatureTracks.has(observation.signature)) {
        const mapped = brain.enemyTracks.get(brain.signatureTracks.get(observation.signature));
        if (mapped) return mapped;
        brain.signatureTracks.delete(observation.signature);
      }
      let best = null;
      let bestDistance = 18 * general.brain.traits.acumen;
      for (const track of brain.enemyTracks.values()) {
        if (observation.signature && track.signature && observation.signature !== track.signature) continue;
        const d = distance(track, observation);
        if (d < bestDistance) {
          best = track;
          bestDistance = d;
        }
      }
      return best;
    }
    function mergeGeneralEnemyObservation(general, observation, source = "vision", evidenceAt = simTime) {
      const brain = general.brain;
      let track = associateGeneralEnemyTrack(general, observation);
      const direct = source === "vision";
      const incomingConfidence = direct ? clamp(0.48 * brain.traits.acumen, 0.4, 0.6) : clamp(observation.confidence || 0.24, 0.05, 0.46);
      if (!track) {
        track = {
          id: `${general.team}-general-track-${brain.nextTrackSerial++}`,
          signature: observation.signature || null,
          x: observation.x,
          z: observation.z,
          vx: observation.vx || 0,
          vz: observation.vz || 0,
          heading: observation.heading || TEAM_DOCTRINE[otherTeam(general.team)].forwardHeading,
          strengthEstimate: observation.visibleStrength || observation.strengthEstimate || 6,
          width: observation.width || 6,
          confidence: incomingConfidence,
          observedAt: evidenceAt,
          updatedAt: simTime,
          lastDirectAt: direct ? evidenceAt : -Infinity,
          source
        };
        brain.enemyTracks.set(track.id, track);
      } else if (evidenceAt >= track.observedAt) {
        const weight = direct ? 0.72 : 0.48;
        track.x = track.x * (1 - weight) + observation.x * weight;
        track.z = track.z * (1 - weight) + observation.z * weight;
        track.vx = track.vx * (1 - weight) + (observation.vx || 0) * weight;
        track.vz = track.vz * (1 - weight) + (observation.vz || 0) * weight;
        track.heading = observation.heading ?? track.heading;
        track.strengthEstimate = Math.max(
          track.strengthEstimate * (direct ? 0.72 : 0.82),
          observation.visibleStrength || observation.strengthEstimate || 0
        );
        track.width = observation.width || track.width;
        track.confidence = clamp(Math.max(track.confidence, incomingConfidence) + (direct ? 0.16 * brain.traits.acumen : 0.05), 0, 1);
        track.observedAt = evidenceAt;
        track.updatedAt = simTime;
        if (direct) track.lastDirectAt = evidenceAt;
        track.source = source;
      }
      if (observation.signature) {
        track.signature = observation.signature;
        brain.signatureTracks.set(observation.signature, track.id);
      }
      return track;
    }
    function updateGeneralAwareness(general, percept, dt) {
      const brain = general.brain;
      brain.directSight = percept.directSight;
      for (const track of brain.enemyTracks.values()) {
        const elapsed = Math.max(0, simTime - track.updatedAt);
        decayTrackConfidence(
          track,
          TUNING.generalMemoryHalfLife * brain.traits.acumen,
          elapsed || dt
        );
        track.x += track.vx * elapsed;
        track.z += track.vz * elapsed;
        track.updatedAt = simTime;
      }
      for (const observation of percept.enemyObservations) {
        mergeGeneralEnemyObservation(general, observation, "vision", observation.observedAt);
      }
      for (const [trackId, track] of brain.enemyTracks) {
        if (track.confidence < 0.08 || simTime - track.observedAt > TUNING.generalTrackMaxAge * brain.traits.acumen) {
          brain.enemyTracks.delete(trackId);
          for (const [signature, mapped] of brain.signatureTracks) {
            if (mapped === trackId) brain.signatureTracks.delete(signature);
          }
        }
      }
      for (const track of brain.friendlyTracks.values()) {
        track.strengthConfidence *= Math.pow(0.5, dt / (TUNING.generalMemoryHalfLife * brain.traits.acumen));
      }
      const seenMarks = /* @__PURE__ */ new Set();
      for (const observation of percept.friendlyObservations) {
        const track = brain.friendlyTracks.get(observation.recognizedMark);
        if (!track) continue;
        seenMarks.add(track.mark);
        const observedCenter = observation.positionKind === "guide" ? centerFromGuide(
          observation,
          observation.heading,
          track.doctrinePlan,
          track.spacing
        ) : observation;
        track.x = observedCenter.x;
        track.z = observedCenter.z;
        track.vx = observation.vx || 0;
        track.vz = observation.vz || 0;
        track.heading = observation.heading;
        track.statusBand = generalStatusBand(observation.publicState);
        track.standardCode = observation.standardCode;
        if (Number.isFinite(observation.visibleStrength)) {
          track.strengthEstimate = track.strengthEstimate * 0.48 + observation.visibleStrength * 0.52;
          track.strengthConfidence = 1;
          track.strengthObservedAt = observation.observedAt;
        }
        track.confidence = 1;
        track.observedAt = observation.observedAt;
        track.updatedAt = simTime;
        track.source = "vision";
      }
      for (const track of brain.friendlyTracks.values()) {
        if (seenMarks.has(track.mark)) continue;
        track.confidence *= Math.pow(0.5, dt / (TUNING.generalMemoryHalfLife * brain.traits.acumen));
        track.x = clamp(
          track.x + track.vx * dt,
          -TUNING.battlefieldHalfWidth,
          TUNING.battlefieldHalfWidth
        );
        track.z = clamp(
          track.z + track.vz * dt,
          -TUNING.battlefieldHalfDepth,
          TUNING.battlefieldHalfDepth
        );
        track.updatedAt = simTime;
      }
    }
    function senseCenturion(century) {
      const officer = century.centurion;
      const brain = century.brain;
      const perception = officer.capabilities.perception;
      const sightRange = TUNING.centurionSight * perception.sight;
      const fieldOfView = TUNING.centurionFov * perception.fov;
      const closeAwareness = TUNING.centurionCloseAwareness * perception.closeAwareness;
      const enemyDetections = [];
      const individualObservations = [];
      const ownDetections = [];
      let allyObservation = null;
      for (const body of bodyById.values()) {
        if (!body.alive || body === officer) continue;
        const sameMark = body.publicMark === century.standard;
        const isOwn = body.team === century.team && sameMark && body.kind === "soldier";
        const isAllyOfficer = body.kind === "centurion" && body.team === century.team && !sameMark;
        const isEnemy = body.team !== century.team;
        const range = distance(officer, body);
        const visible = withinSensorArc(
          officer,
          body,
          brain.gazeHeading,
          sightRange,
          fieldOfView,
          closeAwareness
        );
        const ownBearing = Math.abs(angleDifference(headingTo(officer, body), brain.gazeHeading));
        const ownVisible = isOwn && range <= 48 * perception.sight && (range <= closeAwareness || ownBearing <= 150 * Math.PI / 180);
        if (ownVisible) {
          ownDetections.push({ x: body.x, z: body.z, heading: body.heading });
        }
        if (isAllyOfficer && range <= TUNING.standardSignalRange * perception.sight) {
          const p2 = noisyPoint(officer.id, body.id, body, range, 49, perception.error);
          const recognizedCode = simTime - body.standardRaisedAt >= TUNING.standardSignalDelay ? body.standardCode || STANDARD_CODE.NONE : STANDARD_CODE.NONE;
          allyObservation = deepFreeze({
            recognizedMark: body.publicMark,
            x: p2.x,
            z: p2.z,
            heading: quantize(body.heading, Math.PI / 180),
            publicState: body.publicState,
            standardCode: recognizedCode,
            standardEpoch: body.standardEpoch || 0,
            positionKind: "guide",
            observedAt: simTime,
            source: "vision"
          });
        }
        if (!isEnemy || !visible) continue;
        const p = noisyPoint(officer.id, body.id, body, range, 71, perception.error);
        const detection = {
          kind: body.kind,
          x: p.x,
          z: p.z,
          vx: quantize(body.seenVx || 0, 0.1),
          vz: quantize(body.seenVz || 0, 0.1),
          heading: quantize(body.heading, Math.PI / 90),
          publicMark: body.kind === "centurion" ? body.publicMark : null
        };
        if (body.kind === "runner") {
          individualObservations.push(deepFreeze({
            contactClass: "courier",
            kind: "runner",
            recognizedMark: body.publicMark || null,
            x: detection.x,
            z: detection.z,
            vx: detection.vx,
            vz: detection.vz,
            heading: detection.heading,
            observedAt: simTime
          }));
          continue;
        }
        enemyDetections.push(detection);
      }
      const components = [];
      const unused = new Set(enemyDetections.map((_, index) => index));
      const linkDistanceSq = 2.8 ** 2;
      while (unused.size) {
        const seedIndex = unused.values().next().value;
        unused.delete(seedIndex);
        const queue = [seedIndex];
        const component = [];
        while (queue.length) {
          const index = queue.pop();
          const detection = enemyDetections[index];
          component.push(detection);
          for (const candidateIndex of [...unused]) {
            const candidate = enemyDetections[candidateIndex];
            const dx = detection.x - candidate.x;
            const dz = detection.z - candidate.z;
            if (dx * dx + dz * dz <= linkDistanceSq) {
              unused.delete(candidateIndex);
              queue.push(candidateIndex);
            }
          }
        }
        components.push(component);
      }
      const enemyObservations = [];
      for (const component of components) {
        const count = component.length;
        if (count < TUNING.minimumFormationEvidence) {
          for (const detection of component) {
            individualObservations.push(deepFreeze({
              contactClass: "isolated",
              kind: detection.kind,
              recognizedMark: detection.publicMark,
              x: detection.x,
              z: detection.z,
              vx: detection.vx,
              vz: detection.vz,
              heading: detection.heading,
              observedAt: simTime
            }));
          }
          continue;
        }
        const inverse = 1 / Math.max(1, count);
        let x = 0;
        let z = 0;
        let vx = 0;
        let vz = 0;
        let headingsX = 0;
        let headingsZ = 0;
        let minX = Infinity;
        let maxX = -Infinity;
        let minZ = Infinity;
        let maxZ = -Infinity;
        let signature = null;
        for (const detection of component) {
          x += detection.x;
          z += detection.z;
          vx += detection.vx;
          vz += detection.vz;
          headingsX += Math.sin(detection.heading);
          headingsZ += Math.cos(detection.heading);
          minX = Math.min(minX, detection.x);
          maxX = Math.max(maxX, detection.x);
          minZ = Math.min(minZ, detection.z);
          maxZ = Math.max(maxZ, detection.z);
          if (detection.publicMark) signature = detection.publicMark;
        }
        enemyObservations.push(deepFreeze({
          contactClass: "formation",
          signature,
          x: quantize(x * inverse, 0.25),
          z: quantize(z * inverse, 0.25),
          vx: quantize(vx * inverse, 0.1),
          vz: quantize(vz * inverse, 0.1),
          heading: quantize(Math.atan2(headingsX, headingsZ), Math.PI / 90),
          visibleStrength: count,
          width: quantize(Math.hypot(maxX - minX, maxZ - minZ), 0.5),
          observedAt: simTime
        }));
      }
      let ownCohesion = 0;
      if (ownDetections.length) {
        let alignmentX = 0;
        let alignmentZ = 0;
        let neighborScore = 0;
        for (let index = 0; index < ownDetections.length; index++) {
          const detection = ownDetections[index];
          alignmentX += Math.sin(detection.heading);
          alignmentZ += Math.cos(detection.heading);
          let nearest = Infinity;
          for (let other = 0; other < ownDetections.length; other++) {
            if (other === index) continue;
            nearest = Math.min(nearest, distance(detection, ownDetections[other]));
          }
          if (Number.isFinite(nearest)) {
            neighborScore += clamp(1 - Math.abs(nearest - century.spacing) / (century.spacing * 1.8), 0, 1);
          }
        }
        const alignment = Math.hypot(alignmentX, alignmentZ) / ownDetections.length;
        const spacingScore = ownDetections.length > 1 ? neighborScore / ownDetections.length : 0.4;
        ownCohesion = clamp(alignment * 0.42 + spacingScore * 0.58, 0, 1);
      }
      return deepFreeze({
        enemyObservations,
        individualObservations,
        allyObservation,
        ownVisible: ownDetections.length,
        ownCohesion
      });
    }
    function senseSoldier(soldier) {
      const perception = soldier.capabilities.perception;
      const sightRange = TUNING.soldierSight * perception.sight;
      const bodies = queryPhysicalBodies(soldier.x, soldier.z, sightRange, soldier);
      const nearby = [];
      const heardOrders = [];
      const officer = officerByPublicMark.get(soldier.publicMark);
      const officerVoiceRange = officer?.capabilities ? TUNING.officerVoice * clamp(
        0.94 + officer.capabilities.command.communication * 0.06,
        0.96,
        1.04
      ) : TUNING.officerVoice;
      if (officer?.alive && officer.publicOrderCue && distance(soldier, officer) <= officerVoiceRange) {
        heardOrders.push(deepFreeze({
          source: "officer-voice",
          publicMark: officer.publicMark,
          publicOrderCue: officer.publicOrderCue
        }));
      }
      for (const body of bodies) {
        const sameFriendlyMark = body.team === soldier.team && body.publicMark === soldier.publicMark;
        if (sameFriendlyMark && body.kind === "soldier" && body.publicOrderCue && distance(soldier, body) <= TUNING.soldierVoice) {
          heardOrders.push(deepFreeze({
            source: "soldier-relay",
            publicMark: body.publicMark,
            publicOrderCue: body.publicOrderCue
          }));
        }
        if (!withinSensorArc(
          soldier,
          body,
          soldier.heading,
          sightRange,
          TUNING.soldierFov * perception.fov,
          TUNING.soldierCloseAwareness * perception.closeAwareness
        )) continue;
        nearby.push(deepFreeze({
          kind: body.kind,
          team: body.team,
          publicMark: body.team === soldier.team ? body.publicMark || null : null,
          x: body.x,
          z: body.z,
          seenVx: body.seenVx || 0,
          seenVz: body.seenVz || 0,
          heading: body.heading,
          radius: body.radius,
          publicState: body.publicState,
          publicOrderCue: sameFriendlyMark && body.kind === "soldier" ? body.publicOrderCue : null,
          publicGuideCue: sameFriendlyMark && body.kind === "soldier" ? body.publicGuideCue : null
        }));
      }
      const losses = fallenBodies.filter((body) => simTime - body.fallenAt < 12 && distanceSq(soldier, body) <= (TUNING.localMoraleRadius * perception.sight) ** 2).map((body) => deepFreeze({
        team: body.team,
        kind: body.kind,
        fallenAt: body.fallenAt
      }));
      return deepFreeze({ nearby, heardOrders, losses });
    }
    function decayTrackConfidence(track, halfLife, dt) {
      track.confidence *= Math.pow(0.5, dt / halfLife);
    }
    function associateEnemyTrack(century, observation) {
      const brain = century.brain;
      const judgment = century.centurion.capabilities.command.judgment;
      if (observation.signature && brain.signatureTracks.has(observation.signature)) {
        const mapped = brain.enemyTracks.get(brain.signatureTracks.get(observation.signature));
        if (mapped && (!mapped.signature || mapped.signature === observation.signature)) return mapped;
        brain.signatureTracks.delete(observation.signature);
      }
      let best = null;
      let bestDistance = 14 * clamp(0.92 + judgment * 0.08, 0.96, 1.04);
      for (const track of brain.enemyTracks.values()) {
        if (observation.signature && track.signature && observation.signature !== track.signature) continue;
        const age = Math.max(0, simTime - (track.updatedAt ?? track.observedAt));
        const predicted = { x: track.x + track.vx * age, z: track.z + track.vz * age };
        const d = distance(predicted, observation);
        if (d < bestDistance) {
          bestDistance = d;
          best = track;
        }
      }
      return best;
    }
    function updateEnemyTracks(century, observations) {
      const brain = century.brain;
      const capabilities = century.centurion.capabilities;
      for (const track of brain.enemyTracks.values()) {
        const propagationDt = Math.max(0, simTime - (track.updatedAt ?? track.observedAt));
        decayTrackConfidence(
          track,
          TUNING.contactMemoryHalfLife * capabilities.perception.targetMemory,
          propagationDt
        );
        track.x += track.vx * propagationDt;
        track.z += track.vz * propagationDt;
        track.updatedAt = simTime;
      }
      for (const observation of observations) {
        let track = associateEnemyTrack(century, observation);
        if (!track) {
          track = {
            id: `${century.id}-track-${brain.nextTrackSerial++}`,
            contactClass: "formation",
            signature: observation.signature,
            x: observation.x,
            z: observation.z,
            vx: observation.vx,
            vz: observation.vz,
            heading: observation.heading,
            visibleStrength: observation.visibleStrength,
            strengthEstimate: observation.visibleStrength,
            width: observation.width,
            confidence: clamp(0.35 * capabilities.command.judgment, 0.28, 0.44),
            observedAt: observation.observedAt,
            updatedAt: observation.observedAt,
            lastDirectAt: observation.observedAt,
            directHits: 1,
            source: "vision"
          };
          brain.enemyTracks.set(track.id, track);
        } else {
          const elapsed = Math.max(
            TUNING.centurionThink,
            observation.observedAt - (track.updatedAt ?? track.observedAt)
          );
          const observedVx = (observation.x - track.x) / elapsed;
          const observedVz = (observation.z - track.z) / elapsed;
          track.vx = track.vx * 0.45 + observedVx * 0.35 + observation.vx * 0.2;
          track.vz = track.vz * 0.45 + observedVz * 0.35 + observation.vz * 0.2;
          track.x = observation.x;
          track.z = observation.z;
          track.heading = observation.heading;
          track.visibleStrength = observation.visibleStrength;
          track.strengthEstimate = Math.max(
            observation.visibleStrength,
            track.strengthEstimate * 0.72 + observation.visibleStrength * 0.28
          );
          track.width = observation.width;
          track.confidence = clamp(track.confidence + 0.22 * capabilities.command.judgment, 0, 1);
          track.observedAt = observation.observedAt;
          track.updatedAt = observation.observedAt;
          track.lastDirectAt = observation.observedAt;
          track.directHits = (track.directHits || 0) + 1;
          track.source = "vision";
        }
        if (observation.signature) {
          track.signature = observation.signature;
          brain.signatureTracks.set(observation.signature, track.id);
        }
      }
      for (const [trackId, track] of brain.enemyTracks) {
        if (track.confidence < 0.1 || simTime - track.observedAt > 18 * capabilities.perception.targetMemory) {
          brain.enemyTracks.delete(trackId);
          for (const [signature, mappedTrackId] of brain.signatureTracks) {
            if (mappedTrackId === trackId) brain.signatureTracks.delete(signature);
          }
        }
      }
    }
    function updateIndividualContacts(century, observations, dt) {
      const brain = century.brain;
      const memoryScale = century.centurion.capabilities.perception.targetMemory;
      for (const contact of brain.individualContacts) {
        decayTrackConfidence(contact, TUNING.individualMemoryHalfLife * memoryScale, dt);
        contact.x += contact.vx * dt;
        contact.z += contact.vz * dt;
      }
      for (const observation of observations) {
        let best = null;
        let bestDistance = 5;
        for (const contact of brain.individualContacts) {
          if (contact.kind !== observation.kind || contact.contactClass !== observation.contactClass) continue;
          if (observation.recognizedMark && contact.recognizedMark && observation.recognizedMark !== contact.recognizedMark) continue;
          const d = distance(contact, observation);
          if (d < bestDistance) {
            best = contact;
            bestDistance = d;
          }
        }
        if (!best) {
          brain.individualContacts.push({
            ...observation,
            confidence: 0.45
          });
        } else {
          best.x = observation.x;
          best.z = observation.z;
          best.vx = observation.vx;
          best.vz = observation.vz;
          best.heading = observation.heading;
          best.recognizedMark = observation.recognizedMark || best.recognizedMark;
          best.observedAt = observation.observedAt;
          best.confidence = clamp(best.confidence + 0.25, 0, 1);
        }
      }
      brain.individualContacts = brain.individualContacts.filter((contact) => contact.confidence >= 0.08 && simTime - contact.observedAt <= 8 * memoryScale).slice(-16);
    }
    function updateAllyTrackFromObservation(century, observation) {
      if (!observation) return false;
      const prior = century.brain.allyTrack;
      if (prior && (observation.observedAt < prior.observedAt || observation.observedAt === prior.observedAt && prior.source === "vision" && observation.source !== "vision")) return false;
      const perceivedPosition = observation.positionKind === "guide" && century.brain.allyDoctrine ? centerFromGuide(
        observation,
        observation.heading,
        century.brain.allyDoctrine.plan,
        century.brain.allyDoctrine.spacing
      ) : observation;
      const elapsed = prior ? Math.max(TUNING.centurionThink, observation.observedAt - prior.observedAt) : 1;
      let observedVx = Number.isFinite(observation.vx) ? observation.vx : prior ? (perceivedPosition.x - prior.x) / elapsed : 0;
      let observedVz = Number.isFinite(observation.vz) ? observation.vz : prior ? (perceivedPosition.z - prior.z) / elapsed : 0;
      const observedSpeed = Math.hypot(observedVx, observedVz);
      const plausibleSpeed = TUNING.centurionMaxSpeed * 1.15;
      if (observedSpeed > plausibleSpeed) {
        observedVx *= plausibleSpeed / observedSpeed;
        observedVz *= plausibleSpeed / observedSpeed;
      }
      if (prior) {
        observedVx = prior.vx * 0.62 + observedVx * 0.38;
        observedVz = prior.vz * 0.62 + observedVz * 0.38;
      }
      century.brain.allyTrack = {
        recognizedMark: observation.recognizedMark,
        x: perceivedPosition.x,
        z: perceivedPosition.z,
        vx: observedVx,
        vz: observedVz,
        heading: observation.heading,
        publicState: observation.publicState || prior?.publicState || null,
        confidence: clamp(observation.confidence ?? 1, 0, 1),
        observedAt: observation.observedAt,
        source: observation.source,
        standardCode: observation.standardCode || STANDARD_CODE.NONE,
        standardEpoch: observation.standardEpoch || 0
      };
      return true;
    }
    function incorporateReportedContact(century, contact, senderConfidence = 1, transitAge = 0) {
      if (!contact || !Number.isFinite(contact.x) || !Number.isFinite(contact.z)) return;
      const reportedStrength = contact.strengthBand === "many" ? 32 : contact.strengthBand === "body" ? 16 : 6;
      const bandAge = contact.ageBand === "fresh" ? 0.8 : contact.ageBand === "recent" ? 4 : 8;
      const reportedAge = clamp(
        bandAge + Math.max(0, transitAge),
        0,
        TUNING.runnerMessageTtl + 8
      );
      const evidenceAt = simTime - reportedAge;
      const reportedVx = Number.isFinite(contact.vx) ? contact.vx : 0;
      const reportedVz = Number.isFinite(contact.vz) ? contact.vz : 0;
      const estimatedContact = {
        x: contact.x + reportedVx * reportedAge,
        z: contact.z + reportedVz * reportedAge
      };
      const reportConfidence = clamp(0.36 * senderConfidence * Math.pow(0.5, reportedAge / TUNING.contactMemoryHalfLife), 0.01, 0.52);
      let best = null;
      let bestD = 16;
      for (const track of century.brain.enemyTracks.values()) {
        const d = distance(track, estimatedContact);
        if (d < bestD) {
          bestD = d;
          best = track;
        }
      }
      if (!best) {
        best = {
          id: `${century.id}-track-${century.brain.nextTrackSerial++}`,
          contactClass: "formation",
          signature: null,
          x: estimatedContact.x,
          z: estimatedContact.z,
          vx: reportedVx,
          vz: reportedVz,
          heading: contact.heading || TEAM_DOCTRINE[otherTeam(century.team)].forwardHeading,
          visibleStrength: 0,
          strengthEstimate: reportedStrength,
          width: contact.width || 8,
          confidence: reportConfidence,
          observedAt: evidenceAt,
          updatedAt: simTime,
          lastDirectAt: -Infinity,
          directHits: 0,
          source: "ally-report"
        };
        century.brain.enemyTracks.set(best.id, best);
      } else if (evidenceAt > best.observedAt) {
        best.x = best.x * 0.35 + estimatedContact.x * 0.65;
        best.z = best.z * 0.35 + estimatedContact.z * 0.65;
        best.vx = best.vx * 0.5 + reportedVx * 0.5;
        best.vz = best.vz * 0.5 + reportedVz * 0.5;
        best.strengthEstimate = Math.max(
          best.strengthEstimate * 0.75,
          reportedStrength
        );
        best.confidence = Math.max(best.confidence, reportConfidence);
        best.observedAt = evidenceAt;
        best.updatedAt = simTime;
        best.source = Number.isFinite(best.lastDirectAt) ? "vision" : "ally-report";
      }
    }
    function raiseStandard(century, code, duration = 1.8, epoch = century.brain.plan.epoch) {
      const standard = century.brain.standard;
      standard.code = code;
      standard.epoch = epoch;
      standard.until = Math.max(standard.until, simTime + duration);
      century.centurion.nextStandardCode = code;
      century.centurion.nextStandardEpoch = epoch;
    }
    function expireStandard(century) {
      const standard = century.brain.standard;
      if (standard.code !== STANDARD_CODE.NONE && simTime > standard.until) {
        standard.code = STANDARD_CODE.NONE;
        century.centurion.nextStandardCode = STANDARD_CODE.NONE;
        century.centurion.nextStandardEpoch = standard.epoch;
      }
    }
    function commitCenturionSignals() {
      for (const century of centuries) {
        const codeChanged = century.centurion.standardCode !== century.centurion.nextStandardCode || century.centurion.standardEpoch !== century.centurion.nextStandardEpoch;
        if (codeChanged) century.centurion.standardRaisedAt = simTime;
        century.centurion.standardCode = century.centurion.nextStandardCode;
        century.centurion.standardEpoch = century.centurion.nextStandardEpoch;
      }
    }
    function missionFingerprint(mission) {
      if (!mission || typeof mission !== "object") return "";
      const roles = Object.entries(mission.roles || {}).sort(([left], [right]) => left.localeCompare(right));
      return JSON.stringify([
        mission.missionId,
        mission.epoch,
        mission.posture,
        mission.scope,
        mission.expiresAt,
        mission.coordinatorId,
        roles
      ]);
    }
    function validTeamMission(century, mission) {
      const partner = partnerOf(century);
      const validRoles = Object.values(TACTICAL_ROLE);
      return Boolean(mission && partner && mission.scope === "team" && mission.coordinatorId === `${century.team}-1` && mission.missionId === `${century.team}:${mission.epoch}:team` && Number.isSafeInteger(mission.epoch) && mission.epoch > 0 && Number.isFinite(mission.expiresAt) && postureIsValid(mission.posture) && validRoles.includes(mission.roles?.[century.id]) && validRoles.includes(mission.roles?.[partner.id]));
    }
    function missionFor(century, posture, epoch, scope = "single") {
      const normalizedScope = scope === "team" ? "team" : "single";
      const roles = normalizedScope === "team" ? {
        [`${century.team}-1`]: roleForPosture(posture, 0),
        [`${century.team}-2`]: roleForPosture(posture, 1)
      } : { [century.id]: roleForPosture(posture, century.index) };
      return {
        missionId: `${century.team}:${epoch}:${normalizedScope}`,
        epoch,
        posture,
        scope: normalizedScope,
        expiresAt: simTime + TUNING.planCommitWindow,
        coordinatorId: `${century.team}-1`,
        roles
      };
    }
    function activateMission(century, mission, source) {
      const brain = century.brain;
      const partner = partnerOf(century);
      const priorAllyRole = brain.plan.allyRole;
      century.posture = mission.posture;
      brain.plan = {
        epoch: mission.epoch,
        pendingEpoch: null,
        status: PLAN_STATUS.COMMITTED,
        scope: mission.scope,
        posture: mission.posture,
        role: mission.roles[century.id] || roleForPosture(mission.posture, century.index),
        allyRole: mission.scope === "team" ? mission.roles[partner?.id] : priorAllyRole,
        coordinatorId: mission.coordinatorId,
        proposedAt: brain.plan.proposedAt || simTime,
        committedAt: simTime,
        nextTxAt: simTime,
        retries: brain.plan.retries || 0
      };
      brain.pendingMission = null;
      brain.abortedMission = null;
      brain.abortedAt = -Infinity;
      brain.lastCommittedMission = deepFreeze(JSON.parse(JSON.stringify(mission)));
      brain.fixSignalUntil = 0;
      brain.fixSignalEpoch = -1;
      brain.fixSignalEvidenceAt = -Infinity;
      brain.feintSignalUntil = 0;
      brain.feintSignalEpoch = -1;
      brain.feintSignalEvidenceAt = -Infinity;
      brain.allyAbortNotice = null;
      brain.nextAbortResponseAt = 0;
      brain.feintRetreatStart = null;
      brain.feintCompletedEpoch = -1;
      brain.feintHoldPoint = null;
      brain.withdrawUntil = 0;
      brain.flankCommitEpoch = -1;
      brain.supportRequest = null;
      brain.orderT = 0;
      if (mission.posture !== POSTURE.AGGRESSIVE) {
        century.fallbackAnchor = Object.freeze({ ...currentCenturyCenter(century) });
      }
      brain.lastReason = source;
      raiseStandard(century, STANDARD_CODE.GO, 2.1, mission.epoch);
      emitObserver("mission-committed", {
        centuryId: century.id,
        epoch: mission.epoch,
        posture: mission.posture,
        role: brain.plan.role,
        scope: mission.scope,
        source
      });
    }
    function sectorZoneForCentury(century, zone, teamScope) {
      if (!teamScope) return deepFreeze({ ...zone, enabled: true, issuedAt: simTime });
      const heading = TEAM_DOCTRINE[century.team].forwardHeading;
      const side = lateralOf(heading);
      const offset = century.wingSign * (formationHalfWidth(century.plan, century.spacing) + TUNING.centuryGap * 0.5);
      return deepFreeze({
        ...zone,
        x: clamp(
          zone.x + side.x * offset,
          -TUNING.battlefieldHalfWidth,
          TUNING.battlefieldHalfWidth
        ),
        z: clamp(
          zone.z + side.z * offset,
          -TUNING.battlefieldHalfDepth,
          TUNING.battlefieldHalfDepth
        ),
        enabled: true,
        issuedAt: simTime,
        sectorOf: { x: zone.x, z: zone.z }
      });
    }
    function generalCommandFamily(command) {
      return command === "posture" ? "posture" : "zone";
    }
    function generalFamilyReceipt(brain, centuryId, command) {
      const map = generalCommandFamily(command) === "posture" ? brain.postureReceipts : brain.zoneReceipts;
      return map.get(centuryId) || null;
    }
    function generalReceiptKey(centuryId, command, serial) {
      return `${centuryId}|${generalCommandFamily(command)}|${serial}`;
    }
    function generalPacketReceipt(brain, centuryId, packet) {
      return brain.receiptHistory.get(
        generalReceiptKey(centuryId, packet.command, packet.serial)
      ) || null;
    }
    function zonesEquivalent(left, right, tolerance = 0.01) {
      if (!left || !right) return left === right;
      return Math.hypot(left.x - right.x, left.z - right.z) <= tolerance && Math.abs((left.radius ?? TUNING.hardZoneDefaultRadius) - (right.radius ?? TUNING.hardZoneDefaultRadius)) <= tolerance && left.enabled !== false === (right.enabled !== false);
    }
    function zoneIntentsMateriallyEqual(left, right) {
      return zonesEquivalent(left, right, 3);
    }
    function receiptMatchesPacket(receipt, packet) {
      if (!receipt || receipt.command !== packet.command || receipt.teamScope !== packet.teamScope) return false;
      if (packet.command === "posture") return receipt.posture === packet.posture;
      if (packet.command === "set-zone") return zonesEquivalent(receipt.zone, packet.zone);
      return packet.command === "clear-zone";
    }
    function receiptIsOverdue(receipt) {
      return receipt?.status === "overdue" || receipt?.status === "outbound" && Number.isFinite(receipt.expectedReturnAt) && simTime >= receipt.expectedReturnAt;
    }
    function expectedGeneralReturnAt(post, target, packet) {
      const roundTrip = distance(post, target) * 2 / TUNING.runnerSpeed;
      const deadline = simTime + Math.max(TUNING.generalOrderRetry, roundTrip + 12);
      return Math.min(packet.expiresAt, deadline);
    }
    function processGeneralCommandInbox(century) {
      const brain = century.brain;
      while (brain.commandInbox.length) {
        const packet = brain.commandInbox.shift();
        const family = generalCommandFamily(packet.command);
        if (packet.serial <= (brain.lastGeneralCommandSerial[family] || 0) || simTime > packet.expiresAt) continue;
        brain.lastGeneralCommandSerial[family] = packet.serial;
        if (packet.command === "set-zone") {
          century.holdZone = sectorZoneForCentury(century, packet.zone, packet.teamScope);
          brain.orderT = 0;
          emitObserver("hold-zone-received", { centuryId: century.id, serial: packet.serial });
          continue;
        }
        if (packet.command === "clear-zone") {
          century.holdZone = null;
          brain.orderT = 0;
          emitObserver("hold-zone-cleared", { centuryId: century.id, serial: packet.serial });
          continue;
        }
        if (packet.command !== "posture" || !postureIsValid(packet.posture)) continue;
        const mission = missionFor(
          century,
          packet.posture,
          packet.serial,
          packet.teamScope ? "team" : "single"
        );
        if (!packet.teamScope) {
          activateMission(century, mission, "general-courier");
        } else {
          const alreadyCommitted = brain.plan.status === PLAN_STATUS.COMMITTED && brain.lastCommittedMission?.missionId === mission.missionId;
          if (alreadyCommitted) continue;
          const alreadyNegotiating = brain.pendingMission?.missionId === mission.missionId && [PLAN_STATUS.RECEIVED, PLAN_STATUS.ACKNOWLEDGED].includes(brain.plan.status);
          if (alreadyNegotiating) continue;
          brain.abortedMission = null;
          brain.abortedAt = -Infinity;
          brain.pendingMission = mission;
          brain.plan = {
            ...brain.plan,
            pendingEpoch: mission.epoch,
            scope: "team",
            coordinatorId: mission.coordinatorId,
            status: century.index === 0 ? PLAN_STATUS.PROPOSED : PLAN_STATUS.WAITING,
            proposedAt: simTime,
            nextTxAt: 0,
            retries: 0
          };
          if (century.index === 1) raiseStandard(century, STANDARD_CODE.READY, 2, mission.epoch);
          emitObserver("mission-received", {
            centuryId: century.id,
            epoch: mission.epoch,
            posture: mission.posture
          });
        }
      }
    }
    function processCenturionInbox(century) {
      const brain = century.brain;
      while (brain.inbox.length) {
        const packet = brain.inbox.shift();
        const messageKey = `${packet.senderId}:${packet.serial}`;
        if (brain.seenInboxSerials.has(messageKey) || simTime > packet.expiresAt) continue;
        brain.seenInboxSerials.add(messageKey);
        brain.messagesReceived++;
        const transitAge = clamp(simTime - packet.issuedAt, 0, TUNING.runnerMessageTtl);
        let senderPoseAccepted = false;
        if (packet.payload.senderPose) {
          const pose = packet.payload.senderPose;
          senderPoseAccepted = updateAllyTrackFromObservation(century, {
            recognizedMark: pose.mark || partnerOf(century)?.standard,
            x: pose.x,
            z: pose.z,
            vx: pose.vx || 0,
            vz: pose.vz || 0,
            heading: pose.heading,
            publicState: pose.publicState || null,
            standardCode: pose.standardCode || STANDARD_CODE.NONE,
            standardEpoch: pose.standardEpoch || 0,
            positionKind: "center",
            observedAt: packet.issuedAt,
            confidence: Math.pow(0.5, transitAge / TUNING.allyMemoryHalfLife),
            source: packet.delivery
          });
        }
        if (packet.payload.contact) {
          incorporateReportedContact(
            century,
            packet.payload.contact,
            packet.payload.confidence || 0.7,
            transitAge
          );
        }
        const signalEpoch = packet.payload.senderPose?.standardEpoch;
        const signalCodeConsistent = packet.payload.senderPose?.standardCode === packet.payload.standardCode;
        const newerThanKnownSignal = packet.issuedAt >= (brain.allyTrack?.observedAt ?? -Infinity);
        if (packet.payload.standardCode === STANDARD_CODE.FIXED && signalCodeConsistent && signalEpoch === brain.plan.epoch && packet.issuedAt + 5 > simTime && senderPoseAccepted && newerThanKnownSignal && packet.issuedAt >= brain.fixSignalEvidenceAt) {
          brain.fixSignalUntil = packet.issuedAt + 5;
          brain.fixSignalEpoch = signalEpoch;
          brain.fixSignalEvidenceAt = packet.issuedAt;
        } else if (packet.payload.standardCode === STANDARD_CODE.DRAW && signalCodeConsistent && signalEpoch === brain.plan.epoch && packet.issuedAt + 5 > simTime && senderPoseAccepted && newerThanKnownSignal && packet.issuedAt >= brain.feintSignalEvidenceAt) {
          brain.feintSignalUntil = packet.issuedAt + 5;
          brain.feintSignalEpoch = signalEpoch;
          brain.feintSignalEvidenceAt = packet.issuedAt;
        } else if (packet.payload.standardCode === STANDARD_CODE.ABORT && signalCodeConsistent && signalEpoch === brain.plan.epoch && packet.issuedAt + TUNING.planReconcileGrace > simTime) {
          brain.allyAbortNotice = {
            epoch: signalEpoch,
            informationAt: packet.issuedAt,
            receivedAt: simTime,
            expiresAt: packet.issuedAt + TUNING.planReconcileGrace,
            source: packet.delivery
          };
        }
        if (packet.kind === MESSAGE_KIND.PLAN_PROPOSAL) {
          const mission = packet.payload.mission;
          const expectedCoordinator = `${century.team}-1`;
          const validTeamProposal = validTeamMission(century, mission) && packet.senderId === expectedCoordinator && century.id !== expectedCoordinator && simTime <= mission.expiresAt;
          const knownEpoch = Math.max(brain.plan.epoch, brain.pendingMission?.epoch ?? -1);
          const mayAdopt = validTeamProposal && (mission.epoch > knownEpoch || mission.epoch === brain.pendingMission?.epoch && brain.plan.status !== PLAN_STATUS.COMMITTED);
          if (mayAdopt && postureIsValid(mission.posture)) {
            brain.abortedMission = null;
            brain.abortedAt = -Infinity;
            brain.pendingMission = JSON.parse(JSON.stringify(mission));
            brain.plan = {
              ...brain.plan,
              pendingEpoch: mission.epoch,
              scope: "team",
              status: PLAN_STATUS.RECEIVED,
              coordinatorId: mission.coordinatorId,
              proposedAt: simTime,
              nextTxAt: 0,
              retries: 0
            };
            raiseStandard(century, STANDARD_CODE.READY, 2.2, mission.epoch);
          }
        } else if (packet.kind === MESSAGE_KIND.PLAN_ACK) {
          if (century.id === brain.plan.coordinatorId && brain.pendingMission && brain.pendingMission.scope === "team" && packet.senderId === partnerOf(century)?.id && packet.payload.missionId === brain.pendingMission.missionId && packet.payload.epoch === brain.pendingMission.epoch && packet.payload.missionFingerprint === missionFingerprint(brain.pendingMission) && brain.plan.status === PLAN_STATUS.PROPOSED) {
            brain.plan.status = PLAN_STATUS.ACKNOWLEDGED;
            brain.plan.nextTxAt = 0;
          }
        } else if (packet.kind === MESSAGE_KIND.PLAN_COMMIT) {
          const mission = packet.payload.mission;
          const lateReconciliation = brain.plan.status === PLAN_STATUS.ABORTED && brain.abortedMission && simTime <= brain.abortedAt + TUNING.planReconcileGrace;
          const pending = lateReconciliation ? brain.abortedMission : brain.pendingMission;
          const validCommitState = lateReconciliation || brain.plan.status === PLAN_STATUS.ACKNOWLEDGED;
          const withinCommitWindow = lateReconciliation || simTime <= mission?.expiresAt;
          const mayCommit = validTeamMission(century, mission) && pending && mission.missionId === pending.missionId && mission.epoch === pending.epoch && missionFingerprint(mission) === missionFingerprint(pending) && packet.senderId === mission.coordinatorId && century.id !== mission.coordinatorId && validCommitState && withinCommitWindow;
          if (mayCommit && postureIsValid(mission.posture)) {
            activateMission(
              century,
              mission,
              lateReconciliation ? "late-commit-reconciliation" : "ally-plan-commit"
            );
          }
        } else if (packet.kind === MESSAGE_KIND.FLANK_WARNING) {
          const expiresAt = packet.issuedAt + 5;
          if (expiresAt > simTime) {
            const supportPoint = packet.payload.supportPoint;
            brain.supportRequest = {
              kind: "flank",
              threatKind: packet.payload.threatKind || "outer-flank",
              side: packet.payload.side,
              x: Number.isFinite(supportPoint?.x) ? supportPoint.x : null,
              z: Number.isFinite(supportPoint?.z) ? supportPoint.z : null,
              threatX: Number.isFinite(packet.payload.contact?.x) ? packet.payload.contact.x + (packet.payload.contact.vx || 0) * transitAge : null,
              threatZ: Number.isFinite(packet.payload.contact?.z) ? packet.payload.contact.z + (packet.payload.contact.vz || 0) * transitAge : null,
              expiresAt
            };
          }
        } else if (packet.kind === MESSAGE_KIND.SUPPORT_REQUEST) {
          const expiresAt = packet.issuedAt + 6;
          if (expiresAt > simTime) {
            const supportPoint = packet.payload.supportPoint;
            brain.supportRequest = {
              kind: "support",
              requestKind: packet.payload.requestKind || "anchor-line",
              x: Number.isFinite(supportPoint?.x) ? supportPoint.x : Number.isFinite(packet.payload.senderPose?.x) ? packet.payload.senderPose.x + (packet.payload.senderPose.vx || 0) * transitAge : null,
              z: Number.isFinite(supportPoint?.z) ? supportPoint.z : Number.isFinite(packet.payload.senderPose?.z) ? packet.payload.senderPose.z + (packet.payload.senderPose.vz || 0) * transitAge : null,
              expiresAt
            };
          }
        } else if (packet.kind === MESSAGE_KIND.WITHDRAW) {
          const expiresAt = packet.issuedAt + 8;
          if (expiresAt > simTime) brain.supportRequest = { kind: "withdraw", expiresAt };
        }
      }
      if (brain.supportRequest && simTime > brain.supportRequest.expiresAt) {
        brain.supportRequest = null;
      }
    }
    function servicePlanCoordination(century) {
      const brain = century.brain;
      const plan = brain.plan;
      const pending = brain.pendingMission;
      if (plan.status === PLAN_STATUS.ABORTED && brain.abortedMission && simTime > brain.abortedAt + TUNING.planReconcileGrace) {
        brain.abortedMission = null;
      }
      if (brain.allyAbortNotice && simTime > brain.allyAbortNotice.expiresAt) {
        brain.allyAbortNotice = null;
      }
      if (pending?.scope === "team" && simTime > pending.expiresAt && plan.status !== PLAN_STATUS.COMMITTED) {
        const reconciliationEligible = century.id !== pending.coordinatorId && plan.status === PLAN_STATUS.ACKNOWLEDGED;
        brain.abortedMission = reconciliationEligible ? deepFreeze(JSON.parse(JSON.stringify(pending))) : null;
        brain.abortedAt = simTime;
        brain.pendingMission = null;
        plan.pendingEpoch = null;
        plan.status = PLAN_STATUS.ABORTED;
        plan.nextTxAt = Number.MAX_SAFE_INTEGER;
        raiseStandard(century, STANDARD_CODE.ABORT, 2.2, pending.epoch);
        emitObserver("mission-aborted", {
          centuryId: century.id,
          epoch: pending.epoch,
          missionId: pending.missionId,
          reason: "coordination-timeout"
        });
        return;
      }
      const observedMatchingAbort = plan.status === PLAN_STATUS.COMMITTED && brain.lastCommittedMission?.scope === "team" && brain.allyAbortNotice?.epoch === plan.epoch && simTime <= brain.allyAbortNotice.expiresAt;
      if (observedMatchingAbort && simTime >= brain.nextAbortResponseAt) {
        const sent = dispatchCenturionMessage(century, MESSAGE_KIND.PLAN_COMMIT, {
          senderPose: composeSenderPose(century),
          mission: brain.lastCommittedMission,
          standardCode: STANDARD_CODE.GO,
          reconciliation: true
        });
        brain.nextAbortResponseAt = simTime + (sent ? 3 : 0.65);
        if (sent) {
          emitObserver("mission-reconciliation-sent", {
            centuryId: century.id,
            epoch: plan.epoch,
            missionId: brain.lastCommittedMission.missionId
          });
        }
        return;
      }
      if (simTime < plan.nextTxAt) return;
      const senderPose = composeSenderPose(century);
      if (plan.status === PLAN_STATUS.PROPOSED && pending?.scope === "team") {
        const sent = dispatchCenturionMessage(century, MESSAGE_KIND.PLAN_PROPOSAL, {
          senderPose,
          mission: pending,
          standardCode: brain.standard.code
        });
        plan.nextTxAt = simTime + (sent ? 2.2 : 0.65);
        plan.retries++;
        return;
      }
      if (plan.status === PLAN_STATUS.RECEIVED && pending?.scope === "team") {
        const sent = dispatchCenturionMessage(century, MESSAGE_KIND.PLAN_ACK, {
          senderPose,
          epoch: pending.epoch,
          missionId: pending.missionId,
          missionFingerprint: missionFingerprint(pending),
          standardCode: STANDARD_CODE.READY
        });
        if (sent) plan.status = PLAN_STATUS.ACKNOWLEDGED;
        plan.nextTxAt = simTime + (sent ? 2.2 : 0.65);
        plan.retries++;
        return;
      }
      if (plan.status === PLAN_STATUS.ACKNOWLEDGED && pending?.scope === "team" && century.id === plan.coordinatorId) {
        const mission = pending;
        const sent = dispatchCenturionMessage(century, MESSAGE_KIND.PLAN_COMMIT, {
          senderPose,
          mission,
          standardCode: STANDARD_CODE.GO
        });
        if (!sent) {
          plan.nextTxAt = simTime + 0.65;
          plan.retries++;
          return;
        }
        activateMission(century, mission, "plan-acknowledged");
        brain.plan.nextTxAt = simTime + 2.2;
        return;
      }
      if (plan.status === PLAN_STATUS.COMMITTED && century.id === plan.coordinatorId && brain.lastCommittedMission?.scope === "team" && simTime - plan.committedAt < 7.5) {
        dispatchCenturionMessage(century, MESSAGE_KIND.PLAN_COMMIT, {
          senderPose,
          mission: brain.lastCommittedMission,
          standardCode: STANDARD_CODE.GO
        });
        plan.nextTxAt = simTime + 2.5;
      }
    }
    function deliverCenturionPacket(courier, receiver, delivery) {
      if (!receiver || receiver.muted || !receiver.centurion.alive || simTime > courier.expiresAt) {
        return false;
      }
      const packet = copyPacket({ ...courier.packet, delivery });
      receiver.brain.inbox.push(packet);
      logCommunication({
        event: "delivered",
        messageId: courier.id,
        senderId: courier.senderId,
        receiverId: courier.receiverId,
        kind: courier.packet.kind,
        delivery
      });
      return true;
    }
    function composeGeneralFieldReport(century) {
      const brain = century.brain;
      const center = currentCenturyCenter(century);
      const contact = bestEnemyTrack(century);
      return deepFreeze({
        centuryMark: century.standard,
        x: quantize(center.x, 3),
        z: quantize(center.z, 3),
        vx: quantize(century.centurion.seenVx || century.centurion.vx || 0, 0.5),
        vz: quantize(century.centurion.seenVz || century.centurion.vz || 0, 0.5),
        heading: quantize(century.centurion.heading, Math.PI / 12),
        perceivedStrength: Math.max(0, Math.round(brain.perceivedOwn)),
        statusBand: generalStatusBand(brain.state),
        standardCode: brain.standard.code,
        reportedAt: simTime,
        contact: contact ? {
          signature: contact.signature || null,
          x: quantize(contact.x, 3),
          z: quantize(contact.z, 3),
          vx: quantize(contact.vx, 0.5),
          vz: quantize(contact.vz, 0.5),
          heading: quantize(contact.heading, Math.PI / 12),
          strengthEstimate: Math.max(1, Math.round(contact.strengthEstimate)),
          width: quantize(contact.width || 6, 2),
          confidence: clamp(contact.confidence * 0.72, 0.05, 0.58),
          observedAt: contact.observedAt
        } : null
      });
    }
    function satisfyQueuedEquivalentCommands(brain, courier) {
      for (let index = generalCommandQueue.length - 1; index >= 0; index--) {
        const queued = generalCommandQueue[index];
        if (courier.packet.command === "posture" && courier.packet.teamScope) continue;
        if (queued.team !== courier.team || queued.receiverId !== courier.receiverId || queued.packet.serial <= courier.packet.serial || !receiptMatchesPacket(
          generalPacketReceipt(brain, queued.receiverId, queued.packet),
          courier.packet
        )) {
          continue;
        }
        const queuedReceipt = generalPacketReceipt(brain, queued.receiverId, queued.packet);
        if (!queuedReceipt || queuedReceipt.status !== "queued") continue;
        queuedReceipt.status = "satisfied";
        queuedReceipt.satisfiedAt = simTime;
        queuedReceipt.satisfiedBySerial = courier.packet.serial;
        generalCommandQueue.splice(index, 1);
      }
    }
    function acceptGeneralReturn(courier) {
      const general = generalBrains.get(courier.team);
      if (!general) return;
      const brain = general.brain;
      const lease = brain.runnerLeases.get(courier.receiverId);
      if (lease && lease.serial === courier.packet.serial && lease.family === generalCommandFamily(courier.packet.command)) {
        brain.runnerLeases.delete(courier.receiverId);
      }
      const receipt = generalPacketReceipt(brain, courier.receiverId, courier.packet);
      if (receipt) {
        receipt.status = courier.deliverySucceeded ? "acknowledged" : "failed";
        receipt.returnedAt = simTime;
        delete receipt.overdueAt;
        delete receipt.overdueReason;
        if (courier.deliverySucceeded) delete receipt.failureReason;
        else receipt.failureReason = "returned-undelivered";
      }
      const report = courier.returnPacket;
      if (!courier.deliverySucceeded || !report) return;
      const friendly = brain.friendlyTracks.get(report.centuryMark);
      if (friendly) {
        if (courier.packet.command === "posture" && courier.packet.serial >= friendly.confirmedPostureSerial) {
          friendly.confirmedPosture = courier.packet.posture;
          friendly.confirmedPostureSerial = courier.packet.serial;
        } else if (courier.packet.command === "set-zone" && courier.packet.serial >= friendly.confirmedZoneSerial) {
          friendly.confirmedZoneActive = true;
          friendly.confirmedZone = courier.packet.zone ? { ...courier.packet.zone } : null;
          friendly.confirmedZoneSerial = courier.packet.serial;
        } else if (courier.packet.command === "clear-zone" && courier.packet.serial >= friendly.confirmedZoneSerial) {
          friendly.confirmedZoneActive = false;
          friendly.confirmedZone = null;
          friendly.confirmedZoneSerial = courier.packet.serial;
        }
      }
      satisfyQueuedEquivalentCommands(brain, courier);
      const transit = Math.max(0, simTime - report.reportedAt);
      const reportConfidence = clamp(0.82 * Math.pow(
        0.5,
        transit / (TUNING.generalMemoryHalfLife * brain.traits.acumen)
      ), 0.05, 0.82);
      if (friendly && report.reportedAt > friendly.observedAt) {
        friendly.x = clamp(
          report.x + (report.vx || 0) * transit,
          -TUNING.battlefieldHalfWidth,
          TUNING.battlefieldHalfWidth
        );
        friendly.z = clamp(
          report.z + (report.vz || 0) * transit,
          -TUNING.battlefieldHalfDepth,
          TUNING.battlefieldHalfDepth
        );
        friendly.vx = report.vx || 0;
        friendly.vz = report.vz || 0;
        friendly.heading = report.heading;
        friendly.statusBand = report.statusBand;
        friendly.standardCode = report.standardCode;
        friendly.confidence = reportConfidence;
        friendly.observedAt = report.reportedAt;
        friendly.updatedAt = simTime;
        friendly.source = "runner-report";
      }
      if (friendly && report.reportedAt > friendly.strengthObservedAt) {
        friendly.strengthEstimate = report.perceivedStrength;
        friendly.strengthConfidence = reportConfidence;
        friendly.strengthObservedAt = report.reportedAt;
      }
      if (report.contact && Number.isFinite(report.contact.observedAt)) {
        const projectedContact = {
          ...report.contact,
          x: clamp(
            report.contact.x + report.contact.vx * transit,
            -TUNING.battlefieldHalfWidth,
            TUNING.battlefieldHalfWidth
          ),
          z: clamp(
            report.contact.z + report.contact.vz * transit,
            -TUNING.battlefieldHalfDepth,
            TUNING.battlefieldHalfDepth
          ),
          confidence: report.contact.confidence * Math.pow(
            0.5,
            transit / TUNING.generalMemoryHalfLife
          )
        };
        mergeGeneralEnemyObservation(
          general,
          projectedContact,
          "runner-report",
          report.contact.observedAt
        );
      }
      brain.reportsReceived++;
      logCommunication({
        event: "general-report-returned",
        messageId: courier.id,
        senderId: courier.receiverId,
        receiverId: `general-${courier.team}`,
        kind: "situation-report",
        delivery: "runner"
      });
    }
    function deliverGeneralCommand(courier, receiver) {
      if (!receiver || receiver.muted || !receiver.centurion.alive || simTime > courier.packet.expiresAt) return false;
      receiver.brain.commandInbox.push(copyPacket(courier.packet));
      courier.returnPacket = composeGeneralFieldReport(receiver);
      logCommunication({
        event: "general-order-delivered",
        messageId: courier.id,
        senderId: courier.senderId,
        receiverId: courier.receiverId,
        kind: courier.packet.command,
        delivery: "runner"
      });
      return true;
    }
    function composeSenderPose(century) {
      const center = currentCenturyCenter(century);
      return {
        mark: century.standard,
        x: quantize(center.x, 1.5),
        z: quantize(center.z, 1.5),
        vx: quantize(century.centurion.vx, 0.25),
        vz: quantize(century.centurion.vz, 0.25),
        heading: quantize(century.centurion.heading, Math.PI / 18),
        publicState: century.brain.state,
        standardCode: century.brain.standard.code,
        standardEpoch: century.brain.standard.epoch
      };
    }
    function createPhysicalRunner({
      id,
      team,
      publicMark,
      centuryId,
      senderId,
      receiverId,
      packet,
      x,
      z,
      targetX,
      targetZ,
      channel,
      originX,
      originZ
    }) {
      const unitProfile = resolveUnitProfile(
        config.unitProfiles,
        team,
        centuryId || receiverId,
        id
      );
      const profile = createActorProfile({
        seed: config.seed,
        actorKey: stableNumericKey(id),
        profileId: `profile-${id}`,
        kind: "runner",
        unitProfile
      });
      const capabilities = deriveCapabilities(profile);
      const runner = attachCondition({
        id,
        kind: "runner",
        team,
        publicMark,
        centuryId,
        senderId,
        receiverId,
        packet,
        channel,
        mode: channel === "general" ? "general-runner" : "runner",
        phase: "outbound",
        x,
        z,
        vx: 0,
        vz: 0,
        seenVx: 0,
        seenVz: 0,
        speed: 0,
        heading: headingTo({ x, z }, { x: targetX, z: targetZ }),
        radius: TUNING.bodyRadius,
        maxHp: 0.8 * capabilities.body.health,
        profile,
        capabilities,
        ratings: capabilityRatings(capabilities),
        alive: true,
        publicState: "runner",
        targetX,
        targetZ,
        originX,
        originZ,
        issuedAt: simTime,
        expiresAt: packet.expiresAt,
        deliverySucceeded: false
      }, { hp: 0.8 * capabilities.body.health, morale: 1, fatigue: 0 });
      runner.searchSerial = 0;
      runner.searchKey = [...`${senderId}|${receiverId}|${packet.serial}`].reduce((sum, character) => sum + character.charCodeAt(0), 0);
      couriers.push(runner);
      bodyById.set(runner.id, runner);
      return runner;
    }
    function dispatchCenturionMessage(sender, kind, payload) {
      if (!sender.centurion.alive || sender.muted) return false;
      const receiver = partnerOf(sender);
      if (!receiver) return false;
      const ally = sender.brain.allyTrack;
      const hasFreshAllyTrack = ally && simTime - ally.observedAt < 3.2 && ally.confidence > 0.35;
      const estimate = hasFreshAllyTrack ? ally : sender.brain.allyAssemblyPoint;
      const estimateAgeAcceptable = hasFreshAllyTrack || simTime < 5;
      const perceivedDistance = distance(sender.centurion, estimate);
      const useVoice = estimateAgeAcceptable && perceivedDistance <= TUNING.officerVoice;
      if (useVoice && simTime < sender.brain.voiceAvailableAt) {
        sender.brain.communicationState = "voice-busy";
        logCommunication({
          event: "withheld",
          senderId: sender.id,
          receiverId: receiver.id,
          kind,
          mode: "voice-busy"
        });
        return false;
      }
      const runnerLease = sender.brain.centurionRunnerLease;
      if (runnerLease && simTime >= runnerLease.expectedReturnAt) {
        sender.brain.centurionRunnerLease = null;
        sender.brain.communicationState = "runner-overdue";
      }
      if (!useVoice && sender.brain.centurionRunnerLease) {
        sender.brain.communicationState = "runner-busy";
        logCommunication({
          event: "withheld",
          senderId: sender.id,
          receiverId: receiver.id,
          kind,
          mode: "runner-busy"
        });
        return false;
      }
      const serial = sender.brain.messagesSent + 1;
      const packet = deepFreeze({
        senderId: sender.id,
        receiverId: receiver.id,
        serial,
        kind,
        issuedAt: simTime,
        expiresAt: simTime + TUNING.runnerMessageTtl,
        payload: JSON.parse(JSON.stringify(payload || {}))
      });
      sender.brain.messagesSent = serial;
      if (useVoice) {
        const inFlight = {
          id: `voice-${sender.id}-${serial}`,
          senderId: sender.id,
          receiverId: receiver.id,
          packet,
          mode: "voice",
          channel: "centurion",
          arrivalAt: simTime + TUNING.directMessageDelay + perceivedDistance / 65,
          expiresAt: packet.expiresAt,
          x: sender.centurion.x,
          z: sender.centurion.z,
          targetX: receiver.centurion.x,
          targetZ: receiver.centurion.z
        };
        couriers.push(inFlight);
        sender.brain.communicationState = "voice";
        sender.brain.voiceAvailableAt = simTime + ([MESSAGE_KIND.PLAN_PROPOSAL, MESSAGE_KIND.PLAN_COMMIT].includes(kind) ? 0.85 : 0.52);
      } else {
        createPhysicalRunner({
          id: `runner-${sender.id}-${serial}`,
          team: sender.team,
          publicMark: sender.standard,
          centuryId: sender.id,
          senderId: sender.id,
          receiverId: receiver.id,
          packet,
          x: sender.centurion.x,
          z: sender.centurion.z,
          targetX: estimate.x,
          targetZ: estimate.z,
          channel: "centurion",
          originX: sender.centurion.x,
          originZ: sender.centurion.z
        });
        sender.brain.centurionRunnerLease = {
          serial,
          expectedReturnAt: simTime + Math.min(
            TUNING.runnerMessageTtl,
            perceivedDistance * 2 / TUNING.runnerSpeed + 8
          )
        };
        sender.brain.communicationState = "runner";
      }
      logCommunication({
        event: "dispatched",
        senderId: sender.id,
        receiverId: receiver.id,
        kind,
        mode: sender.brain.communicationState
      });
      return true;
    }
    function expireGeneralRunnerLeases() {
      for (const general of generalBrains.values()) {
        const brain = general.brain;
        for (const [centuryId, lease] of brain.runnerLeases) {
          if (simTime < lease.expectedReturnAt) continue;
          const receipt = brain.receiptHistory.get(lease.receiptKey);
          if (receipt && receipt.status === "outbound") {
            receipt.status = "overdue";
            receipt.overdueAt = simTime;
            receipt.overdueReason = "missed-return-deadline";
          }
          brain.runnerLeases.delete(centuryId);
        }
      }
    }
    function serviceGeneralCommandQueue() {
      expireGeneralRunnerLeases();
      for (let index = 0; index < generalCommandQueue.length; ) {
        const queued = generalCommandQueue[index];
        const queuedBrain = generalBrains.get(queued.team)?.brain || null;
        const queuedReceipt = queuedBrain ? generalPacketReceipt(queuedBrain, queued.receiverId, queued.packet) : null;
        if (!queuedReceipt || queuedReceipt.status !== "queued") {
          generalCommandQueue.splice(index, 1);
          continue;
        }
        if (simTime > queued.packet.expiresAt) {
          queuedReceipt.status = "failed";
          queuedReceipt.returnedAt = simTime;
          queuedReceipt.failureReason = "expired-at-command-post";
          logCommunication({
            event: "expired-in-queue",
            senderId: `general-${queued.team}`,
            receiverId: queued.receiverId,
            kind: queued.packet.command,
            mode: "general-queue"
          });
          generalCommandQueue.splice(index, 1);
          continue;
        }
        if (queuedBrain.runnerLeases.has(queued.receiverId)) {
          index++;
          continue;
        }
        const receiver = centuryById(queued.receiverId);
        if (!receiver) {
          queuedReceipt.status = "failed";
          queuedReceipt.returnedAt = simTime;
          queuedReceipt.failureReason = "unknown-recipient-at-command-post";
          generalCommandQueue.splice(index, 1);
          continue;
        }
        const post = generalPosts[queued.team];
        const estimate = queued.targetEstimate || receiver.deploymentAnchor;
        const expectedReturnAt = expectedGeneralReturnAt(post, estimate, queued.packet);
        createPhysicalRunner({
          id: `runner-general-${receiver.id}-${queued.packet.serial}`,
          team: queued.team,
          publicMark: null,
          centuryId: `general-${queued.team}`,
          senderId: `general-${queued.team}`,
          receiverId: receiver.id,
          packet: queued.packet,
          x: post.x,
          z: post.z,
          targetX: estimate.x,
          targetZ: estimate.z,
          channel: "general",
          originX: post.x,
          originZ: post.z
        });
        queuedReceipt.status = "outbound";
        queuedReceipt.dispatchedAt = simTime;
        queuedReceipt.expectedReturnAt = expectedReturnAt;
        queuedBrain.runnerLeases.set(receiver.id, {
          serial: queued.packet.serial,
          family: generalCommandFamily(queued.packet.command),
          command: queued.packet.command,
          dispatchedAt: simTime,
          expectedReturnAt,
          receiptKey: generalReceiptKey(
            receiver.id,
            queued.packet.command,
            queued.packet.serial
          )
        });
        logCommunication({
          event: "general-order-dispatched",
          senderId: `general-${queued.team}`,
          receiverId: receiver.id,
          kind: queued.packet.command,
          mode: "runner"
        });
        generalCommandQueue.splice(index, 1);
      }
    }
    function removeCourier(index) {
      const courier = couriers[index];
      if (courier && courier.kind === "runner") bodyById.delete(courier.id);
      couriers.splice(index, 1);
    }
    function updateCouriers(dt) {
      for (let index = couriers.length - 1; index >= 0; index--) {
        const courier = couriers[index];
        const receiver = centuryById(courier.receiverId);
        if (simTime > courier.expiresAt || courier.kind === "runner" && !courier.alive) {
          logCommunication({
            event: "expired",
            messageId: courier.id,
            senderId: courier.senderId,
            receiverId: courier.receiverId,
            kind: courier.packet.kind || courier.packet.command,
            mode: courier.mode
          });
          removeCourier(index);
          continue;
        }
        if (courier.mode === "voice") {
          if (simTime >= courier.arrivalAt) {
            const physicallyAudible = receiver?.centurion.alive && distance(courier, receiver.centurion) <= TUNING.officerVoice + 0.8;
            if (physicallyAudible) deliverCenturionPacket(courier, receiver, "voice");
            else logCommunication({
              event: "unheard",
              messageId: courier.id,
              senderId: courier.senderId,
              receiverId: courier.receiverId,
              kind: courier.packet.kind,
              mode: "voice"
            });
            removeCourier(index);
          }
          continue;
        }
        const returningToGeneral = courier.phase === "return" && courier.channel === "general";
        const returnSender = courier.phase === "return" && courier.channel === "centurion" ? centuryById(courier.senderId) : null;
        const targetOfficer = courier.phase === "outbound" ? receiver?.centurion : returnSender?.centurion;
        const targetPost = returningToGeneral ? generalPosts[courier.team] : null;
        const runnerSight = TUNING.runnerSight;
        if (targetOfficer?.alive && distance(courier, targetOfficer) <= runnerSight) {
          courier.targetX = targetOfficer.x;
          courier.targetZ = targetOfficer.z;
        } else if (targetPost) {
          courier.targetX = targetPost.x;
          courier.targetZ = targetPost.z;
        }
        const target = { x: courier.targetX, z: courier.targetZ };
        courier.heading = headingTo(courier, target);
        const remaining = distance(courier, target);
        const stepDistance = Math.min(remaining, TUNING.runnerSpeed * dt);
        courier.vx = Math.sin(courier.heading) * (dt > 0 ? stepDistance / dt : 0);
        courier.vz = Math.cos(courier.heading) * (dt > 0 ? stepDistance / dt : 0);
        courier.x += courier.vx * dt;
        courier.z += courier.vz * dt;
        courier.speed = Math.hypot(courier.vx, courier.vz);
        courier.seenVx = courier.vx;
        courier.seenVz = courier.vz;
        if (courier.phase === "outbound" && targetOfficer?.alive && distance(courier, targetOfficer) <= 2.2) {
          courier.deliverySucceeded = courier.channel === "general" ? deliverGeneralCommand(courier, receiver) : deliverCenturionPacket(courier, receiver, "runner");
          courier.phase = "return";
          courier.mode = courier.channel === "general" ? "general-return" : "runner-return";
          courier.targetX = courier.originX;
          courier.targetZ = courier.originZ;
        } else if (courier.phase === "return") {
          const reachedReturn = returningToGeneral ? distance(courier, targetPost) <= 2.2 : targetOfficer?.alive && distance(courier, targetOfficer) <= 2.2;
          if (reachedReturn) {
            if (returningToGeneral) acceptGeneralReturn(courier);
            if (returnSender) {
              if (returnSender.brain.centurionRunnerLease?.serial === courier.packet.serial) {
                returnSender.brain.centurionRunnerLease = null;
              }
              returnSender.brain.runnerReturnedAt = simTime;
              returnSender.brain.communicationState = courier.deliverySucceeded ? "runner-returned" : "runner-failed";
            }
            removeCourier(index);
            continue;
          }
        }
        const liveTargetDistance = targetOfficer?.alive ? distance(courier, targetOfficer) : Infinity;
        if (remaining < 0.3 && liveTargetDistance > runnerSight && !targetPost) {
          const turn = 0.31 + hash01(
            config.seed,
            courier.searchKey,
            courier.searchSerial++,
            tick
          ) * 0.22;
          courier.heading = wrapAngle(courier.heading + Math.PI * turn);
          courier.targetX = courier.x + Math.sin(courier.heading) * 7;
          courier.targetZ = courier.z + Math.cos(courier.heading) * 7;
        }
      }
      serviceGeneralCommandQueue();
    }
    function usableEnemyTracks(century) {
      return [...century.brain.enemyTracks.values()].filter((track) => track.contactClass === "formation" && track.confidence >= 0.12 && simTime - track.observedAt <= 12);
    }
    function bestEnemyTrack(century, candidates = usableEnemyTracks(century)) {
      const center = currentCenturyCenter(century);
      let best = null;
      let bestScore = -Infinity;
      for (const track of candidates) {
        const range = distance(center, track);
        const score = track.confidence * 2.5 + Math.min(1, track.strengthEstimate / 20) - range / 120;
        if (score > bestScore) {
          bestScore = score;
          best = track;
        }
      }
      return best;
    }
    function mostUrgentEnemyTrack(century, candidates = usableEnemyTracks(century)) {
      const center = currentCenturyCenter(century);
      let best = null;
      let bestScore = -Infinity;
      for (const track of candidates) {
        const dx = track.x - center.x;
        const dz = track.z - center.z;
        const range = Math.max(0.1, Math.hypot(dx, dz));
        const relativeVx = (track.vx || 0) - (century.centurion.vx || 0);
        const relativeVz = (track.vz || 0) - (century.centurion.vz || 0);
        const closingSpeed = Math.max(0, -(dx * relativeVx + dz * relativeVz) / range);
        const directFresh = simTime - (track.lastDirectAt ?? -Infinity) <= TUNING.contactDirectFreshness;
        const score = track.confidence * 1.8 + (directFresh ? 0.8 : 0) + clamp((42 - range) / 32, 0, 1.25) * 1.55 + Math.min(0.55, closingSpeed * 0.35) + Math.min(0.45, (track.strengthEstimate || 0) / 60);
        if (score > bestScore) {
          bestScore = score;
          best = track;
        }
      }
      return best;
    }
    function assessFlankThreat(century, tracks, heading) {
      const center = currentCenturyCenter(century);
      const halfWidth = formationHalfWidth(century.plan);
      const targetGap = halfWidth * 2 + TUNING.centuryGap;
      const ally = century.brain.allyTrack;
      const allyAge = ally ? simTime - ally.observedAt : Infinity;
      const estimatedAlly = ally && ally.confidence >= 0.15 && allyAge < 6 ? { x: ally.x + ally.vx * allyAge, z: ally.z + ally.vz * allyAge } : null;
      const allyLocal = estimatedAlly ? localFromWorld(center, heading, estimatedAlly) : null;
      const innerSign = allyLocal && Math.abs(allyLocal.lateral) > 0.5 ? Math.sign(allyLocal.lateral) : -century.outerLateralSign;
      const outerSign = -innerSign;
      let best = null;
      let bestScore = -Infinity;
      for (const track of tracks) {
        if (track.confidence < 0.18) continue;
        if (simTime - (track.lastDirectAt ?? -Infinity) > TUNING.contactDirectFreshness) continue;
        const rawSpeed = Math.hypot(track.vx || 0, track.vz || 0);
        const velocityScale = rawSpeed > 1.8 ? 1.8 / rawSpeed : 1;
        const predictionTime = clamp(distance(center, track) / 18, 0, 1.25);
        const predicted = {
          x: track.x + (track.vx || 0) * velocityScale * predictionTime,
          z: track.z + (track.vz || 0) * velocityScale * predictionTime
        };
        const local = localFromWorld(center, heading, predicted);
        const lateralSign = Math.sign(local.lateral);
        const range = distance(center, predicted);
        const outer = lateralSign === outerSign;
        const flankAngle = Math.abs(Math.atan2(local.lateral, Math.max(0.1, local.depth)));
        const outerExposed = outer && flankAngle > 0.68 && Math.abs(local.lateral) > halfWidth + 4.5 && local.depth > -11 && local.depth < 24 && range < 30;
        const seamPenetration = lateralSign === innerSign && Math.abs(local.lateral) > halfWidth + 1.3 && Math.abs(local.lateral) < targetGap * 0.82 && local.depth > -8 && local.depth < Math.max(6.5, halfWidth + 3) && range < 25;
        const rearPenetration = local.depth < -4 && range < 21;
        if (!outerExposed && !seamPenetration && !rearPenetration) continue;
        const threatKind = rearPenetration ? "rear-penetration" : seamPenetration ? "seam-penetration" : "outer-flank";
        const score = track.confidence * 2.2 + Math.min(1.4, Math.abs(local.lateral) / 16) - range / 70 + (seamPenetration ? 0.35 : rearPenetration ? 0.55 : 0);
        if (score <= bestScore) continue;
        bestScore = score;
        best = {
          threatKind,
          side: local.lateral < 0 ? "negative-lateral" : "positive-lateral",
          lateralSign: lateralSign || century.outerLateralSign,
          x: predicted.x,
          z: predicted.z,
          confidence: track.confidence,
          range,
          trackId: track.id
        };
      }
      return best;
    }
    function composeContactPayload(century, track) {
      if (!track || track.confidence < 0.14) return null;
      return {
        x: quantize(track.x, 3),
        z: quantize(track.z, 3),
        vx: quantize(track.vx, 0.5),
        vz: quantize(track.vz, 0.5),
        heading: quantize(track.heading, Math.PI / 12),
        strengthBand: track.strengthEstimate < 10 ? "few" : track.strengthEstimate < 25 ? "body" : "many",
        width: quantize(track.width, 3),
        ageBand: simTime - track.observedAt < 2 ? "fresh" : simTime - track.observedAt < 6 ? "recent" : "stale"
      };
    }
    function perceivedSeamSupportPoint(century) {
      const center = currentCenturyCenter(century);
      const ally = century.brain.allyTrack;
      if (!ally || ally.confidence < 0.15) return center;
      const age = simTime - ally.observedAt;
      const estimated = { x: ally.x + ally.vx * age, z: ally.z + ally.vz * age };
      return {
        x: quantize((center.x + estimated.x) * 0.5, 1.5),
        z: quantize((center.z + estimated.z) * 0.5, 1.5)
      };
    }
    function sendPeriodicCenturionReport(century, track) {
      const brain = century.brain;
      brain.reportT -= TUNING.centurionThink;
      const warningTrack = brain.flankThreat ? brain.enemyTracks.get(brain.flankThreat.trackId) || null : null;
      const reportedTrack = warningTrack || track;
      const threatKey = brain.flankThreat ? `${brain.flankThreat.threatKind}:${brain.flankThreat.side}` : "none";
      const standardKey = `${brain.standard.code}:${brain.standard.epoch}`;
      const strengthBand = reportedTrack ? reportedTrack.strengthEstimate < 10 ? "few" : reportedTrack.strengthEstimate < 25 ? "body" : "many" : null;
      const contactChanged = reportedTrack ? !brain.lastReportedContact || distance(reportedTrack, brain.lastReportedContact) > 6 || strengthBand !== brain.lastReportedContact.strengthBand : brain.lastReportedContact !== null;
      const reportChanged = brain.lastReportedState !== brain.state || brain.lastReportedThreat !== threatKey || brain.lastReportedStandard !== standardKey || contactChanged;
      if (brain.reportT > 0 && !reportChanged) return;
      if (brain.communicationState === "runner-returned" && simTime - brain.runnerReturnedAt < 3 && !brain.flankThreat && brain.state !== CENTURION_STATE.WITHDRAW) {
        brain.reportT = Math.max(brain.reportT, 0.45);
        return;
      }
      const payload = {
        senderPose: composeSenderPose(century),
        state: brain.state,
        confidence: reportedTrack ? reportedTrack.confidence : 0.7,
        contact: composeContactPayload(century, reportedTrack),
        side: brain.flankThreat ? brain.flankThreat.side : null,
        threatKind: brain.flankThreat?.threatKind || null,
        supportPoint: brain.flankThreat || brain.helpRequest ? perceivedSeamSupportPoint(century) : null,
        requestKind: brain.helpRequest?.requestKind || null,
        strengthBand: brain.perceivedOwn < century.initialStrength * 0.35 ? "low" : brain.perceivedOwn < century.initialStrength * 0.72 ? "reduced" : "sound",
        cohesionBand: brain.perceivedCohesion < 0.4 ? "broken" : brain.perceivedCohesion < 0.72 ? "loose" : "formed",
        standardCode: brain.standard.code
      };
      let kind = track ? MESSAGE_KIND.CONTACT_REPORT : MESSAGE_KIND.LINE_REPORT;
      if (brain.state === CENTURION_STATE.WITHDRAW) kind = MESSAGE_KIND.WITHDRAW;
      else if (brain.flankThreat) kind = MESSAGE_KIND.FLANK_WARNING;
      else if (brain.standard.code === STANDARD_CODE.DRAW) kind = MESSAGE_KIND.FEINT_PHASE;
      else if (brain.helpRequest) kind = MESSAGE_KIND.SUPPORT_REQUEST;
      const sent = dispatchCenturionMessage(century, kind, payload);
      brain.lastReportedState = brain.state;
      brain.lastReportedThreat = threatKey;
      brain.lastReportedStandard = standardKey;
      brain.lastReportedContact = reportedTrack ? { x: reportedTrack.x, z: reportedTrack.z, strengthBand } : null;
      if (sent) {
        const tacticallyActive = ![
          CENTURION_STATE.HOLD,
          CENTURION_STATE.BAIT_WAIT,
          CENTURION_STATE.COVER_FEINT
        ].includes(brain.state);
        const baseCadence = brain.flankThreat ? 1.4 : reportedTrack ? tacticallyActive ? 4 : 12 : brain.perceivedCohesion < 0.72 || brain.state === CENTURION_STATE.SUPPORT_ALLY ? 5.5 : 11;
        const channelFloor = brain.communicationState === "runner" ? 12 : 0;
        const commandCadence = century.centurion.capabilities.command.reportCadence;
        brain.reportT = Math.max(baseCadence * commandCadence, channelFloor) + agentRandom(
          config.seed,
          century.index,
          century.team === TEAM.BLUE ? 657 : 658,
          Math.floor(simTime)
        ) * 1.2;
      } else {
        brain.reportT = 0.65;
      }
    }
    function setCenturionState(century, state, reason) {
      const brain = century.brain;
      const changed = brain.state !== state;
      brain.state = state;
      brain.lastReason = reason;
      return changed;
    }
    function publishCenturyOrder(century, movement, heading, cadence, reason) {
      if (!century.centurion.alive) return null;
      const command = century.centurion.capabilities.command;
      const packet = deepFreeze({
        centuryMark: century.standard,
        seq: ++century.orderSerial,
        kind: "century-order",
        posture: century.posture,
        movement,
        heading: wrapAngle(heading),
        cadence: clamp(cadence, 0, TUNING.soldierMarchSpeed),
        formation: {
          ranks: century.plan.ranks,
          columns: century.plan.columns,
          spacing: century.spacing
        },
        commandClarity: command.orderClarity,
        commandPresence: command.leadership,
        issuedAt: simTime,
        executeAt: simTime + 0.22 * command.orderCadence,
        expiresAt: simTime + TUNING.orderRepeat,
        reason
      });
      century.nextPublicOrder = packet;
      century.nextPublicOrderUntil = packet.expiresAt;
      century.brain.ordersIssued++;
      return packet;
    }
    function movementForState(state) {
      if ([
        CENTURION_STATE.WITHDRAW,
        CENTURION_STATE.ROUTED,
        CENTURION_STATE.FEINT_RETIRE
      ].includes(state)) return "retire";
      if ([
        CENTURION_STATE.HOLD,
        CENTURION_STATE.FORM_LINE,
        CENTURION_STATE.BAIT_WAIT,
        CENTURION_STATE.COVER_FEINT,
        CENTURION_STATE.GUARD_FLANK
      ].includes(state)) return "hold";
      if ([CENTURION_STATE.COUNTER, CENTURION_STATE.FIX_ENEMY].includes(state)) return "counter";
      return "advance";
    }
    function zoneRelation(century, center) {
      const zone = century.holdZone;
      if (!zone?.enabled) return null;
      const toZone = { x: zone.x - center.x, z: zone.z - center.z };
      const distanceToCenter = Math.hypot(toZone.x, toZone.z);
      const arrivalRadius = Math.max(1.5, zone.radius * TUNING.zoneArrivalFraction);
      return {
        zone,
        toZone,
        distanceToCenter,
        arrivalRadius,
        arrived: distanceToCenter <= arrivalRadius,
        direction: normalize2(toZone, { x: 0, z: 0 })
      };
    }
    function assessLineIntegrity(century, center, lineHeading) {
      const brain = century.brain;
      const ally = brain.allyTrack;
      const age = ally ? Math.max(0, simTime - ally.observedAt) : Infinity;
      if (!ally || ally.confidence < 0.15 || age > TUNING.allyLineMaxAge) {
        brain.lineDepthError = 0;
        brain.lineGapError = 0;
        brain.lineIntegrityBand = "unknown";
        return {
          band: "unknown",
          ally: null,
          estimated: null,
          local: null,
          depthError: 0,
          gapError: 0,
          targetGap: 0
        };
      }
      const estimated = { x: ally.x + ally.vx * age, z: ally.z + ally.vz * age };
      const local = localFromWorld(center, lineHeading, estimated);
      const targetGap = formationHalfWidth(century.plan) * 2 + TUNING.centuryGap;
      const gap = Math.abs(local.lateral);
      brain.lineDepthError = local.depth;
      brain.lineGapError = gap - targetGap;
      const band = Math.abs(brain.lineDepthError) > TUNING.lineDepthBreak || Math.abs(brain.lineGapError) > TUNING.lineGapBreak ? "broken" : Math.abs(brain.lineDepthError) > TUNING.lineDepthTolerance || Math.abs(brain.lineGapError) > TUNING.lineGapTolerance ? "strained" : "sound";
      brain.lineIntegrityBand = band;
      return {
        band,
        ally,
        estimated,
        local,
        depthError: brain.lineDepthError,
        gapError: brain.lineGapError,
        targetGap
      };
    }
    function coordinateLineAction(century, center, velocity, assessment, state) {
      const brain = century.brain;
      if (!assessment.ally || [CENTURION_STATE.WITHDRAW, CENTURION_STATE.ROUTED].includes(state)) return velocity;
      const { ally, estimated, local } = assessment;
      const lineHeading = brain.lineHeading;
      const forward = forwardOf(lineHeading);
      const lateral = lateralOf(lineHeading);
      let x = velocity.x;
      let z = velocity.z;
      const allyDetached = brain.plan.role === TACTICAL_ROLE.FIX && brain.plan.allyRole === TACTICAL_ROLE.FLANK && simTime - ally.observedAt < 3.2 && ally.publicState === CENTURION_STATE.MANEUVER_FLANK;
      if (allyDetached) {
        return { x, z };
      }
      const detachedManeuver = brain.plan.role === TACTICAL_ROLE.FLANK && brain.state === CENTURION_STATE.MANEUVER_FLANK;
      const ambushManeuver = brain.plan.role === TACTICAL_ROLE.COVER && brain.state === CENTURION_STATE.AMBUSH_STRIKE;
      if (detachedManeuver || ambushManeuver) {
        const supportDistance = distance(center, estimated);
        if (supportDistance > 31) {
          const towardAlly = normalize2({ x: estimated.x - center.x, z: estimated.z - center.z });
          const correction = clamp((supportDistance - 31) * 0.045, 0, 0.48) * ally.confidence;
          x += towardAlly.x * correction;
          z += towardAlly.z * correction;
        }
        return { x, z };
      }
      if (Math.abs(assessment.depthError) > TUNING.lineDepthTolerance) {
        const correction = clamp(assessment.depthError * 0.055, -0.42, 0.42) * ally.confidence;
        x += forward.x * correction;
        z += forward.z * correction;
      }
      if (Math.abs(assessment.gapError) > TUNING.lineGapTolerance) {
        const towardAlly = Math.sign(local.lateral) || -century.outerLateralSign;
        const correction = clamp(assessment.gapError * 0.045, -0.34, 0.34) * ally.confidence;
        x += lateral.x * towardAlly * correction;
        z += lateral.z * towardAlly * correction;
      }
      return { x, z };
    }
    function boundaryCorrection(center, velocity) {
      let x = velocity.x;
      let z = velocity.z;
      const edgeX = TUNING.battlefieldHalfWidth - 8;
      const edgeZ = TUNING.battlefieldHalfDepth - 8;
      if (Math.abs(center.x) > edgeX) x += -Math.sign(center.x) * 0.9;
      if (Math.abs(center.z) > edgeZ) z += -Math.sign(center.z) * 0.9;
      return { x, z };
    }
    function updateCenturionBrain(century, sensed, dt) {
      const officer = century.centurion;
      const brain = century.brain;
      if (!officer.alive) return;
      brain.thinkT -= dt;
      brain.orderT -= dt;
      expireStandard(century);
      if (brain.allyTrack) {
        decayTrackConfidence(brain.allyTrack, TUNING.allyMemoryHalfLife, dt);
      }
      if (brain.thinkT > 0) return;
      const mindDt = TUNING.centurionThink;
      brain.thinkT += TUNING.centurionThink * (0.9 + agentRandom(
        config.seed,
        century.index,
        century.team === TEAM.BLUE ? 673 : 674,
        tick
      ) * 0.2);
      processGeneralCommandInbox(century);
      processCenturionInbox(century);
      updateEnemyTracks(century, sensed.enemyObservations);
      updateIndividualContacts(century, sensed.individualObservations, mindDt);
      updateAllyTrackFromObservation(century, sensed.allyObservation);
      if (brain.allyTrack && simTime - brain.allyTrack.observedAt < 1 && brain.allyTrack.standardEpoch === brain.plan.epoch) {
        if (brain.allyTrack.standardCode === STANDARD_CODE.FIXED) {
          brain.fixSignalUntil = simTime + 2.5;
          brain.fixSignalEpoch = brain.allyTrack.standardEpoch;
          brain.fixSignalEvidenceAt = brain.allyTrack.observedAt;
        }
        if (brain.allyTrack.standardCode === STANDARD_CODE.DRAW) {
          brain.feintSignalUntil = simTime + 2.5;
          brain.feintSignalEpoch = brain.allyTrack.standardEpoch;
          brain.feintSignalEvidenceAt = brain.allyTrack.observedAt;
        }
        if (brain.allyTrack.standardCode === STANDARD_CODE.ABORT) {
          brain.allyAbortNotice = {
            epoch: brain.allyTrack.standardEpoch,
            informationAt: brain.allyTrack.observedAt,
            receivedAt: simTime,
            expiresAt: brain.allyTrack.observedAt + TUNING.planReconcileGrace,
            source: brain.allyTrack.source
          };
        }
      }
      servicePlanCoordination(century);
      brain.perceivedOwn = sensed.ownVisible;
      brain.perceivedCohesion = sensed.ownCohesion;
      const strengthRatio = clamp(sensed.ownVisible / century.initialStrength, 0, 1);
      brain.perceivedMorale = clamp(strengthRatio * 0.63 + sensed.ownCohesion * 0.37, 0, 1);
      const center = currentCenturyCenter(century);
      const usableTracks = usableEnemyTracks(century);
      const contact = mostUrgentEnemyTrack(century, usableTracks);
      brain.contactConfidence = contact ? contact.confidence : 0;
      const teamHeading = TEAM_DOCTRINE[century.team].forwardHeading;
      const contactHeading = contact ? headingTo(center, contact) : teamHeading;
      const contactRange = contact ? distance(center, contact) : Infinity;
      const directFreshContact = contact && contact.confidence > 0.18 && simTime - (contact.lastDirectAt ?? -Infinity) <= TUNING.contactDirectFreshness;
      const lineTargetHeading = teamHeading;
      brain.lineHeading = rotateToward(brain.lineHeading, lineTargetHeading, 0.34);
      const scanClock = ((simTime + brain.scanPhase) % TUNING.flankScanPeriod + TUNING.flankScanPeriod) % TUNING.flankScanPeriod;
      const scanningExposedSide = scanClock < TUNING.flankScanDuration && (!directFreshContact || contactRange > 13);
      brain.gazeHeading = scanningExposedSide ? wrapAngle(brain.lineHeading + century.outerLateralSign * 1.25) : contact && contact.confidence > 0.12 ? contactHeading : wrapAngle(teamHeading + Math.sin(simTime * 0.55 + brain.scanPhase) * 1.12);
      const priorFlankThreat = brain.flankThreat;
      const assessedFlankThreat = assessFlankThreat(century, usableTracks, brain.lineHeading);
      if (assessedFlankThreat) {
        brain.flankThreat = assessedFlankThreat;
        brain.flankThreatUntil = simTime + 3.2;
      } else if (priorFlankThreat && simTime < brain.flankThreatUntil) {
        const rememberedTrack = usableTracks.find((track) => track.id === priorFlankThreat.trackId);
        brain.flankThreat = rememberedTrack ? {
          ...priorFlankThreat,
          x: rememberedTrack.x,
          z: rememberedTrack.z,
          confidence: rememberedTrack.confidence
        } : { ...priorFlankThreat, confidence: priorFlankThreat.confidence * 0.94 };
      } else {
        brain.flankThreat = null;
      }
      const lineAssessment = assessLineIntegrity(century, center, brain.lineHeading);
      const zone = zoneRelation(century, center);
      const fixedKnownForFlank = brain.fixSignalEpoch === brain.plan.epoch && brain.fixSignalUntil > simTime || brain.allyTrack?.standardCode === STANDARD_CODE.FIXED && brain.allyTrack.standardEpoch === brain.plan.epoch && simTime - brain.allyTrack.observedAt < 2.5;
      const directReadyForFlank = contact && contact.confidence > 0.34 && simTime - (contact.lastDirectAt ?? -Infinity) < 3.5 && (contact.directHits || 0) >= 2;
      const flankAuthorizationReady = century.posture === POSTURE.AGGRESSIVE && brain.plan.role === TACTICAL_ROLE.FLANK && fixedKnownForFlank && directReadyForFlank;
      if (flankAuthorizationReady) brain.flankCommitEpoch = brain.plan.epoch;
      const authorizedDetachedManeuver = century.posture === POSTURE.AGGRESSIVE && brain.plan.role === TACTICAL_ROLE.FLANK && brain.state === CENTURION_STATE.MANEUVER_FLANK && brain.flankCommitEpoch === brain.plan.epoch && directFreshContact || brain.plan.role === TACTICAL_ROLE.COVER && brain.state === CENTURION_STATE.AMBUSH_STRIKE;
      const allyIsAuthorizedDetached = century.posture === POSTURE.AGGRESSIVE && brain.plan.role === TACTICAL_ROLE.FIX && brain.plan.allyRole === TACTICAL_ROLE.FLANK && brain.allyTrack && simTime - brain.allyTrack.observedAt < 3.2 && brain.allyTrack.publicState === CENTURION_STATE.MANEUVER_FLANK;
      const formationRepairTriggered = lineAssessment.band === "broken" || brain.perceivedCohesion < TUNING.formationBreakCohesion;
      const formationRepairLatched = brain.state === CENTURION_STATE.FORM_LINE && brain.doctrinePriority === "formation-survival" && (simTime < brain.doctrineCommitUntil || brain.perceivedCohesion < TUNING.formationRecoverCohesion || lineAssessment.band !== "unknown" && lineAssessment.band !== "sound");
      const formationNeedsRepair = !authorizedDetachedManeuver && !allyIsAuthorizedDetached && (formationRepairTriggered || formationRepairLatched);
      let desiredHeading = contact ? contactHeading : teamHeading;
      let desiredVelocity = { x: 0, z: 0 };
      let stateChanged = false;
      let doctrinePriority = "mission";
      const teamForward = forwardOf(teamHeading);
      const teamBack = { x: -teamForward.x, z: -teamForward.z };
      const officerNerve = officer.capabilities.morale.stability;
      const hardLoss = strengthRatio < clamp(0.24 / officerNerve, 0.2, 0.29) || !officer.alive;
      const allyWithdraw = brain.supportRequest?.kind === "withdraw";
      const withdrawalTrigger = hardLoss || brain.perceivedMorale < clamp(0.22 / officerNerve, 0.18, 0.27) || allyWithdraw;
      if (withdrawalTrigger) {
        brain.withdrawUntil = brain.state === CENTURION_STATE.WITHDRAW ? Math.max(brain.withdrawUntil, simTime + 1) : simTime + 8;
      }
      const withdrawalLatched = brain.state === CENTURION_STATE.WITHDRAW && simTime < brain.withdrawUntil;
      const recentDrawKnown = brain.feintSignalEpoch === brain.plan.epoch && brain.feintSignalUntil > simTime || brain.allyTrack?.standardCode === STANDARD_CODE.DRAW && brain.allyTrack.standardEpoch === brain.plan.epoch && simTime - brain.allyTrack.observedAt < 2.5;
      const directFreshForFeint = contact && contact.confidence > 0.3 && simTime - (contact.lastDirectAt ?? -Infinity) < 4.2;
      const coverSpringReady = century.posture === POSTURE.DEFENSIVE_FEINT && brain.plan.role === TACTICAL_ROLE.COVER && recentDrawKnown && directFreshForFeint && contactRange < 24;
      const flankWarningNeedsSupport = brain.supportRequest?.kind === "flank" && (brain.supportRequest.threatKind === "seam-penetration" || brain.plan.role !== TACTICAL_ROLE.BAIT);
      const localFixOwnsContact = century.posture === POSTURE.AGGRESSIVE && brain.plan.role === TACTICAL_ROLE.FIX && directFreshContact && contactRange < TUNING.contactHaltRange;
      const baitOwnsContact = century.posture === POSTURE.DEFENSIVE_FEINT && brain.plan.role === TACTICAL_ROLE.BAIT && directFreshContact;
      const localContactBlocksSupport = directFreshContact && contactRange < TUNING.contactHaltRange;
      const localContactRequiresLine = localContactBlocksSupport && !localFixOwnsContact && !baitOwnsContact && !coverSpringReady && !flankAuthorizationReady;
      const immediateThreatLatched = brain.doctrinePriority === "immediate-threat" && simTime < brain.doctrineCommitUntil && [
        CENTURION_STATE.FORM_LINE,
        CENTURION_STATE.COUNTER,
        CENTURION_STATE.GUARD_FLANK
      ].includes(brain.state);
      const shouldSupportAlly = !coverSpringReady && !localContactBlocksSupport && (brain.supportRequest?.kind === "support" || flankWarningNeedsSupport);
      if (withdrawalTrigger || withdrawalLatched) {
        doctrinePriority = "emergency-withdrawal";
        brain.zoneResumeAt = Math.max(brain.zoneResumeAt, simTime + TUNING.zoneResumeDelay);
        stateChanged = setCenturionState(
          century,
          CENTURION_STATE.WITHDRAW,
          hardLoss ? "perceived-heavy-loss" : allyWithdraw ? "ally-withdraw-report" : withdrawalTrigger ? "morale-collapse" : "withdrawal-commitment"
        );
        desiredHeading = wrapAngle(teamHeading + Math.PI);
        desiredVelocity = { x: teamBack.x * TUNING.withdrawSpeed, z: teamBack.z * TUNING.withdrawSpeed };
      } else if (brain.flankThreat && !coverSpringReady) {
        doctrinePriority = "immediate-threat";
        brain.doctrineCommitUntil = Math.max(
          brain.doctrineCommitUntil,
          simTime + TUNING.doctrineOverrideMin
        );
        brain.zoneResumeAt = Math.max(
          brain.zoneResumeAt,
          brain.doctrineCommitUntil + TUNING.zoneResumeDelay
        );
        const seamThreat = brain.flankThreat.threatKind === "seam-penetration";
        const rearThreat = brain.flankThreat.threatKind === "rear-penetration";
        stateChanged = setCenturionState(
          century,
          CENTURION_STATE.GUARD_FLANK,
          seamThreat ? "seam-penetration-contact" : rearThreat ? "rear-penetration-contact" : "outer-flank-contact"
        );
        const threatHeading = headingTo(center, brain.flankThreat);
        const refusalLimit = brain.flankThreat.range < 18 ? Math.PI : 1.42;
        desiredHeading = wrapAngle(brain.lineHeading + clamp(
          angleDifference(threatHeading, brain.lineHeading),
          -refusalLimit,
          refusalLimit
        ));
        if (rearThreat) {
          desiredVelocity = {
            x: teamForward.x * 0.22,
            z: teamForward.z * 0.22
          };
        } else if (seamThreat) {
          const towardThreat = normalize2({
            x: brain.flankThreat.x - center.x,
            z: brain.flankThreat.z - center.z
          });
          desiredVelocity = {
            x: towardThreat.x * 0.28 + teamBack.x * 0.08,
            z: towardThreat.z * 0.28 + teamBack.z * 0.08
          };
        } else {
          const side = lateralOf(brain.lineHeading);
          desiredVelocity = {
            x: teamBack.x * 0.16 - side.x * brain.flankThreat.lateralSign * 0.18,
            z: teamBack.z * 0.16 - side.z * brain.flankThreat.lateralSign * 0.18
          };
        }
      } else if (localContactRequiresLine || immediateThreatLatched) {
        doctrinePriority = "immediate-threat";
        if (localContactRequiresLine) {
          brain.doctrineCommitUntil = Math.max(
            brain.doctrineCommitUntil,
            simTime + TUNING.doctrineOverrideMin
          );
        }
        brain.zoneResumeAt = Math.max(
          brain.zoneResumeAt,
          brain.doctrineCommitUntil + TUNING.zoneResumeDelay
        );
        const pressure = directFreshContact ? forwardOf(contactHeading) : null;
        const counterRange = brain.state === CENTURION_STATE.COUNTER ? 16 : 13.5;
        const tacticalLeash = zone ? Math.max(zone.zone.radius, zone.arrivalRadius + 4) : Infinity;
        const pressureReturnsToZone = zone && pressure ? pressure.x * zone.direction.x + pressure.z * zone.direction.z > 0.15 : false;
        const counterRespectsZone = !zone || zone.distanceToCenter < tacticalLeash || pressureReturnsToZone;
        const counterEngaged = century.posture === POSTURE.HOLD && directFreshContact && contactRange < counterRange && counterRespectsZone && brain.perceivedCohesion >= TUNING.formationBreakCohesion;
        stateChanged = setCenturionState(
          century,
          counterEngaged ? CENTURION_STATE.COUNTER : CENTURION_STATE.FORM_LINE,
          counterEngaged ? "local-counterpressure" : zone && !counterRespectsZone ? "zone-edge-halt-face-contact" : localContactRequiresLine ? "local-contact-halt-form-line" : "threat-recovery-hold"
        );
        desiredHeading = directFreshContact ? contactHeading : brain.lineHeading;
        if (counterEngaged) {
          const speed = contactRange < 5 ? 0.08 : TUNING.counterSpeed;
          desiredVelocity = { x: pressure.x * speed, z: pressure.z * speed };
        }
      } else if (formationNeedsRepair) {
        doctrinePriority = "formation-survival";
        if (formationRepairTriggered) {
          brain.doctrineCommitUntil = Math.max(
            brain.doctrineCommitUntil,
            simTime + TUNING.doctrineOverrideMin
          );
        }
        brain.zoneResumeAt = Math.max(
          brain.zoneResumeAt,
          brain.doctrineCommitUntil + TUNING.zoneResumeDelay
        );
        stateChanged = setCenturionState(
          century,
          CENTURION_STATE.FORM_LINE,
          lineAssessment.band === "broken" ? "repair-broken-mutual-line" : "reform-own-ranks"
        );
        desiredHeading = directFreshContact ? contactHeading : brain.lineHeading;
        desiredVelocity = { x: 0, z: 0 };
      } else if (shouldSupportAlly) {
        doctrinePriority = "mutual-support";
        stateChanged = setCenturionState(century, CENTURION_STATE.SUPPORT_ALLY, "ally-request");
        const supportPoint = Number.isFinite(brain.supportRequest.x) ? brain.supportRequest : brain.allyTrack;
        if (supportPoint) {
          const toward = normalize2({ x: supportPoint.x - center.x, z: supportPoint.z - center.z });
          desiredVelocity = { x: toward.x * 0.52, z: toward.z * 0.52 };
          const reportedThreat = Number.isFinite(brain.supportRequest.threatX) ? { x: brain.supportRequest.threatX, z: brain.supportRequest.threatZ } : null;
          desiredHeading = contact ? contactHeading : reportedThreat ? headingTo(center, reportedThreat) : headingTo(center, supportPoint);
        }
      } else if (century.posture === POSTURE.AGGRESSIVE) {
        const role = brain.plan.role;
        if (role === TACTICAL_ROLE.FIX) {
          const fixRange = brain.state === CENTURION_STATE.FIX_ENEMY ? 11 : 9.5;
          if (contact && contactRange < fixRange) {
            stateChanged = setCenturionState(century, CENTURION_STATE.FIX_ENEMY, "fixing-contact");
            const pressure = forwardOf(contactHeading);
            const speed = contactRange < 4.5 ? 0.1 : 0.28;
            desiredVelocity = { x: pressure.x * speed, z: pressure.z * speed };
            if (contact.confidence > 0.42 && (contact.directHits || 0) >= 2) {
              raiseStandard(century, STANDARD_CODE.FIXED, 2.4, brain.plan.epoch);
              brain.fixSignalUntil = simTime + 2.4;
              brain.fixSignalEpoch = brain.plan.epoch;
              brain.fixSignalEvidenceAt = simTime;
            }
          } else {
            stateChanged = setCenturionState(
              century,
              CENTURION_STATE.ADVANCE,
              contact ? "fix-line-closing" : "fix-line-seek-contact"
            );
            const direction = forwardOf(contact ? contactHeading : teamHeading);
            desiredVelocity = { x: direction.x * 0.76, z: direction.z * 0.76 };
          }
        } else {
          const outward = lateralOf(teamHeading);
          const fixedKnown = fixedKnownForFlank;
          const directFresh = directReadyForFlank;
          const flankCommitted = brain.flankCommitEpoch === brain.plan.epoch;
          if (flankCommitted && directFresh) {
            stateChanged = setCenturionState(
              century,
              CENTURION_STATE.MANEUVER_FLANK,
              "fixed-signal-and-direct-track"
            );
            const flankOffset = formationHalfWidth(century.plan) + 7.5;
            const flankPoint = {
              x: contact.x + outward.x * century.outerLateralSign * flankOffset - teamForward.x * 2,
              z: contact.z + outward.z * century.outerLateralSign * flankOffset - teamForward.z * 2
            };
            const toward = normalize2({ x: flankPoint.x - center.x, z: flankPoint.z - center.z });
            desiredVelocity = { x: toward.x * 0.92, z: toward.z * 0.92 };
            desiredHeading = contactHeading;
          } else {
            stateChanged = setCenturionState(
              century,
              CENTURION_STATE.STAGE_FLANK,
              fixedKnown ? "await-direct-reacquisition" : "stage-until-fixed"
            );
            const forwardSpeed = contact ? 0.48 : 0.62;
            const ally = brain.allyTrack;
            let stageLateralSpeed = 0;
            if (ally && ally.confidence >= 0.15 && simTime - ally.observedAt <= 3.2) {
              const allyAge = simTime - ally.observedAt;
              const estimatedAlly = {
                x: ally.x + ally.vx * allyAge,
                z: ally.z + ally.vz * allyAge
              };
              const perceivedGap = Math.abs(
                localFromWorld(center, teamHeading, estimatedAlly).lateral
              );
              const stageGap = formationHalfWidth(century.plan) * 2 + TUNING.centuryGap + 5;
              stageLateralSpeed = clamp((stageGap - perceivedGap) * 0.12, -0.32, 0.32);
            }
            desiredVelocity = {
              x: teamForward.x * forwardSpeed + outward.x * century.outerLateralSign * stageLateralSpeed,
              z: teamForward.z * forwardSpeed + outward.z * century.outerLateralSign * stageLateralSpeed
            };
            desiredHeading = contact ? contactHeading : teamHeading;
          }
        }
      } else if (century.posture === POSTURE.HOLD) {
        const reportedInterception = contact && contact.confidence >= 0.24 && simTime - contact.observedAt < 6 && contactRange < 19;
        if (reportedInterception) {
          doctrinePriority = "immediate-threat";
          brain.zoneResumeAt = Math.max(
            brain.zoneResumeAt,
            simTime + TUNING.zoneResumeDelay
          );
          stateChanged = setCenturionState(
            century,
            CENTURION_STATE.FORM_LINE,
            "reported-contact-halt"
          );
          desiredHeading = contactHeading;
        } else if (zone && !zone.arrived && simTime >= brain.zoneResumeAt) {
          doctrinePriority = "zone-transit";
          brain.zonePhase = "approach";
          stateChanged = setCenturionState(
            century,
            CENTURION_STATE.MARCH_TO_ZONE,
            "controlled-zone-approach"
          );
          const remaining = Math.max(0, zone.distanceToCenter - zone.arrivalRadius);
          const speed = Math.min(TUNING.holdRepositionSpeed, remaining * 0.18);
          desiredVelocity = {
            x: zone.direction.x * speed,
            z: zone.direction.z * speed
          };
          desiredHeading = directFreshContact ? contactHeading : brain.lineHeading;
        } else if (zone && !zone.arrived) {
          doctrinePriority = "formation-survival";
          brain.zonePhase = "interrupted";
          stateChanged = setCenturionState(
            century,
            CENTURION_STATE.FORM_LINE,
            "post-contact-reform-before-zone-resume"
          );
          desiredHeading = directFreshContact ? contactHeading : brain.lineHeading;
        } else if (!zone && distance(center, century.fallbackAnchor) > 0.8) {
          doctrinePriority = "zone-transit";
          brain.zonePhase = "fallback";
          stateChanged = setCenturionState(
            century,
            CENTURION_STATE.MARCH_TO_ZONE,
            "return-to-doctrinal-anchor"
          );
          const toward = normalize2({
            x: century.fallbackAnchor.x - center.x,
            z: century.fallbackAnchor.z - center.z
          });
          const anchorDistance = distance(center, century.fallbackAnchor);
          const speed = Math.min(TUNING.holdRepositionSpeed, anchorDistance * 0.18);
          desiredVelocity = { x: toward.x * speed, z: toward.z * speed };
          desiredHeading = brain.lineHeading;
        } else {
          brain.zonePhase = zone ? "holding-area" : "holding-anchor";
          stateChanged = setCenturionState(century, CENTURION_STATE.HOLD, "hold-ground");
          desiredHeading = directFreshContact ? contactHeading : brain.lineHeading;
        }
      } else {
        const role = brain.plan.role;
        const anchor = century.holdZone?.enabled ? century.holdZone : century.fallbackAnchor;
        const directFresh = directFreshForFeint;
        if (role === TACTICAL_ROLE.BAIT) {
          const feintComplete = brain.feintCompletedEpoch === brain.plan.epoch;
          if (feintComplete) {
            stateChanged = setCenturionState(
              century,
              CENTURION_STATE.BAIT_WAIT,
              "feint-complete-hold"
            );
            const holdPoint = brain.feintHoldPoint || center;
            const toward = normalize2(
              { x: holdPoint.x - center.x, z: holdPoint.z - center.z },
              { x: 0, z: 0 }
            );
            const d = distance(center, holdPoint);
            desiredVelocity = d > 0.7 ? { x: toward.x * Math.min(0.32, d * 0.14), z: toward.z * Math.min(0.32, d * 0.14) } : { x: 0, z: 0 };
          } else if (brain.feintRetreatStart) {
            const retired = distance(center, brain.feintRetreatStart);
            stateChanged = setCenturionState(
              century,
              CENTURION_STATE.FEINT_RETIRE,
              "committed-feint-retirement"
            );
            raiseStandard(century, STANDARD_CODE.DRAW, 2.4, brain.plan.epoch);
            brain.feintSignalUntil = simTime + 2.4;
            brain.feintSignalEpoch = brain.plan.epoch;
            brain.feintSignalEvidenceAt = simTime;
            const retreat = normalize2({ x: anchor.x - center.x, z: anchor.z - center.z }, teamBack);
            const anchorDistance = distance(center, anchor);
            const finished = retired >= 8 || anchorDistance < 0.7;
            const speed = finished ? 0 : 0.72;
            desiredVelocity = { x: retreat.x * speed, z: retreat.z * speed };
            if (finished) {
              brain.feintCompletedEpoch = brain.plan.epoch;
              brain.feintHoldPoint = { ...center };
              brain.feintRetreatStart = null;
            }
          } else if (!directFresh || contactRange > 32) {
            stateChanged = setCenturionState(
              century,
              CENTURION_STATE.BAIT_WAIT,
              "bait-waits-for-perceived-contact"
            );
            const toward = normalize2({ x: anchor.x - center.x, z: anchor.z - center.z }, { x: 0, z: 0 });
            const d = distance(center, anchor);
            desiredVelocity = d > 0.8 ? { x: toward.x * Math.min(0.42, d * 0.16), z: toward.z * Math.min(0.42, d * 0.16) } : { x: 0, z: 0 };
          } else if (contactRange > 13) {
            stateChanged = setCenturionState(
              century,
              CENTURION_STATE.FEINT_OUT,
              "contact-triggered-bait-probe"
            );
            const direction = forwardOf(contactHeading);
            desiredVelocity = { x: direction.x * 0.52, z: direction.z * 0.52 };
          } else {
            if (!brain.feintRetreatStart) brain.feintRetreatStart = { ...center };
            stateChanged = setCenturionState(
              century,
              CENTURION_STATE.FEINT_RETIRE,
              "enemy-crossed-bait-trigger"
            );
            raiseStandard(century, STANDARD_CODE.DRAW, 2.4, brain.plan.epoch);
            brain.feintSignalUntil = simTime + 2.4;
            brain.feintSignalEpoch = brain.plan.epoch;
            brain.feintSignalEvidenceAt = simTime;
            const retreat = normalize2({ x: anchor.x - center.x, z: anchor.z - center.z }, teamBack);
            desiredVelocity = { x: retreat.x * 0.72, z: retreat.z * 0.72 };
          }
        } else {
          const drawKnown = recentDrawKnown;
          if (drawKnown && directFresh && contactRange < 24) {
            stateChanged = setCenturionState(
              century,
              CENTURION_STATE.AMBUSH_STRIKE,
              "draw-signal-and-direct-track"
            );
            const outward = lateralOf(teamHeading);
            const strikePoint = {
              x: contact.x + outward.x * century.outerLateralSign * 6,
              z: contact.z + outward.z * century.outerLateralSign * 6
            };
            const toward = normalize2({ x: strikePoint.x - center.x, z: strikePoint.z - center.z });
            desiredVelocity = { x: toward.x * 0.86, z: toward.z * 0.86 };
            desiredHeading = contactHeading;
          } else {
            stateChanged = setCenturionState(
              century,
              CENTURION_STATE.COVER_FEINT,
              drawKnown ? "cover-awaits-direct-contact" : "cover-holds-for-draw-signal"
            );
            const toward = normalize2({ x: anchor.x - center.x, z: anchor.z - center.z }, { x: 0, z: 0 });
            const d = distance(center, anchor);
            desiredVelocity = d > 0.8 ? { x: toward.x * Math.min(0.42, d * 0.14), z: toward.z * Math.min(0.42, d * 0.14) } : { x: 0, z: 0 };
          }
        }
      }
      brain.helpRequest = brain.perceivedCohesion < 0.45 && directFreshContact && brain.state === CENTURION_STATE.FORM_LINE ? { requestKind: "anchor-line", expiresAt: simTime + 2.5 } : null;
      desiredVelocity = coordinateLineAction(
        century,
        center,
        desiredVelocity,
        lineAssessment,
        brain.state
      );
      desiredVelocity = boundaryCorrection(center, desiredVelocity);
      let desiredSpeed = Math.hypot(desiredVelocity.x, desiredVelocity.z);
      const officerSpeedCap = TUNING.centurionMaxSpeed * officer.capabilities.movement.speed;
      const guideTetherCap = movementForState(brain.state) === "hold" ? Math.min(officerSpeedCap, TUNING.soldierDressSpeed * 0.88) : officerSpeedCap;
      if (desiredSpeed > guideTetherCap) {
        desiredVelocity.x *= guideTetherCap / desiredSpeed;
        desiredVelocity.z *= guideTetherCap / desiredSpeed;
        desiredSpeed = guideTetherCap;
      }
      brain.doctrinePriority = doctrinePriority;
      if (zone && doctrinePriority !== "zone-transit" && !["holding-area", "interrupted"].includes(brain.zonePhase)) {
        brain.zonePhase = "tactical-override";
      } else if (!zone && brain.zonePhase !== "fallback") {
        brain.zonePhase = "none";
      }
      brain.desiredHeading = desiredHeading;
      brain.desiredVelocity = desiredVelocity;
      officer.publicState = brain.state;
      sendPeriodicCenturionReport(century, bestEnemyTrack(century, usableTracks));
      if (stateChanged || brain.orderT <= 0) {
        brain.orderT = TUNING.orderCadence * officer.capabilities.command.orderCadence;
        publishCenturyOrder(
          century,
          movementForState(brain.state),
          desiredHeading,
          desiredSpeed,
          brain.lastReason
        );
      }
    }
    function integrateCenturions(dt) {
      for (const century of centuries) {
        const officer = century.centurion;
        if (!officer.alive) continue;
        const desired = century.brain.desiredVelocity;
        const acceleration = 2.4 * officer.capabilities.movement.acceleration;
        officer.vx += clamp(desired.x - officer.vx, -acceleration * dt, acceleration * dt);
        officer.vz += clamp(desired.z - officer.vz, -acceleration * dt, acceleration * dt);
        officer.heading = rotateToward(
          officer.heading,
          century.brain.desiredHeading,
          3.4 * officer.capabilities.movement.turn * dt
        );
        officer.x += officer.vx * dt;
        officer.z += officer.vz * dt;
        officer.seenVx = officer.vx;
        officer.seenVz = officer.vz;
      }
    }
    function commitCenturyOrders() {
      for (const century of centuries) {
        if (century.nextPublicOrder) {
          century.publicOrder = century.nextPublicOrder;
          century.publicOrderUntil = century.nextPublicOrderUntil;
          century.centurion.publicOrderCue = century.publicOrder;
          century.nextPublicOrder = null;
        } else if (simTime > century.publicOrderUntil) {
          century.publicOrder = null;
          century.centurion.publicOrderCue = null;
        }
      }
    }
    function updateSoldierOrderAndGuide(soldier, percept) {
      let heard = null;
      let heardGuide = null;
      for (const call of percept.heardOrders) {
        const cue = call.publicOrderCue;
        if (call.publicMark !== soldier.publicMark || !cue || simTime > cue.expiresAt || (cue.relayHops || 0) >= 8) continue;
        const relayHops = call.source === "officer-voice" ? 0 : (cue.relayHops || 0) + 1;
        if (!heard || cue.seq > heard.seq || cue.seq === heard.seq && relayHops < (heard.relayHops || 0)) {
          heard = { ...cue, relayHops };
        }
      }
      for (const observation of percept.nearby) {
        if (observation.team !== soldier.team || observation.publicMark !== soldier.publicMark) continue;
        if (observation.kind === "centurion") {
          soldier.guideTrack = {
            x: observation.x,
            z: observation.z,
            heading: observation.heading,
            confidence: 1,
            observedAt: simTime,
            relayHops: 0
          };
        }
        const canHearSemanticCue = distance(soldier, observation) <= TUNING.soldierVoice;
        if (!canHearSemanticCue) continue;
        if (observation.publicGuideCue && simTime <= observation.publicGuideCue.expiresAt && (observation.publicGuideCue.relayHops || 0) < 8 && (!heardGuide || observation.publicGuideCue.observedAt > heardGuide.observedAt)) {
          heardGuide = {
            ...observation.publicGuideCue,
            relayHops: (observation.publicGuideCue.relayHops || 0) + 1
          };
        }
      }
      if (heardGuide && simTime - heardGuide.observedAt < 2.4) {
        const prior = soldier.guideTrack;
        if (!prior || heardGuide.observedAt >= prior.observedAt) {
          soldier.guideTrack = {
            x: heardGuide.x,
            z: heardGuide.z,
            heading: heardGuide.heading,
            confidence: clamp(heardGuide.confidence * 0.88, 0, 1),
            observedAt: heardGuide.observedAt,
            relayHops: heardGuide.relayHops
          };
        }
      }
      if (heard && heard.seq > soldier.lastHeardOrder) {
        soldier.privateOrder = copyPacket(heard);
        soldier.lastHeardOrder = heard.seq;
        soldier.orderUnderstoodAt = simTime + orderReactionDelay(
          TUNING.orderComprehension,
          soldier.capabilities,
          heard.commandClarity || 1
        );
        soldier.orderCallT = 0;
      }
      if (soldier.guideTrack) {
        decayTrackConfidence(
          soldier.guideTrack,
          8.5 * soldier.capabilities.formation.guideMemory,
          TUNING.soldierThink
        );
        const deliberatelyCallsGuide = soldier.publicState !== SOLDIER_STATE.ROUTE && soldier.doctrine.relayDuty && soldier.guideTrack.relayHops < 8 && soldier.guideCallT <= 0 && soldier.privateOrder && simTime >= soldier.orderUnderstoodAt && simTime <= soldier.privateOrder.expiresAt;
        soldier.nextGuideCue = deliberatelyCallsGuide ? deepFreeze({
          kind: "guide-call",
          x: quantize(soldier.guideTrack.x, 0.25),
          z: quantize(soldier.guideTrack.z, 0.25),
          heading: quantize(soldier.guideTrack.heading, Math.PI / 36),
          confidence: soldier.guideTrack.confidence,
          observedAt: soldier.guideTrack.observedAt,
          relayHops: soldier.guideTrack.relayHops,
          expiresAt: simTime + 0.72
        }) : null;
        if (deliberatelyCallsGuide) {
          soldier.guideCallT = 0.72 * soldier.capabilities.formation.relayInterval;
        }
      } else {
        soldier.nextGuideCue = null;
      }
      const deliberatelyRepeatsOrder = soldier.publicState !== SOLDIER_STATE.ROUTE && soldier.doctrine.relayDuty && soldier.orderCallT <= 0 && simTime >= soldier.orderUnderstoodAt && soldier.privateOrder && simTime <= soldier.privateOrder.expiresAt && (soldier.privateOrder.relayHops || 0) < 8;
      soldier.nextOrderCue = deliberatelyRepeatsOrder ? copyPacket(soldier.privateOrder) : null;
      if (deliberatelyRepeatsOrder) {
        soldier.orderCallT = 0.58 * soldier.capabilities.formation.relayInterval;
      }
    }
    function updateSoldierMorale(soldier, percept, dt) {
      const moraleCapability = soldier.capabilities.morale;
      let allies = 0;
      let enemies = 0;
      let nearestEnemy = null;
      let nearestDistance = Infinity;
      for (const observed of percept.nearby) {
        if (observed.team === soldier.team) allies++;
        else {
          enemies++;
          const d = distance(soldier, observed);
          if (d < nearestDistance) {
            nearestDistance = d;
            nearestEnemy = observed;
          }
        }
      }
      const casualtyWeight = (loss) => loss.kind === "runner" ? 0.15 : 1;
      const freshLosses = percept.losses.filter((loss) => loss.fallenAt > soldier.lastLossScan);
      const freshOwnLosses = freshLosses.filter((loss) => loss.team === soldier.team).reduce((sum, loss) => sum + casualtyWeight(loss), 0);
      const freshEnemyLosses = freshLosses.filter((loss) => loss.team !== soldier.team).reduce((sum, loss) => sum + casualtyWeight(loss), 0);
      const witnessedOfficerLoss = freshLosses.some((loss) => loss.team === soldier.team && loss.kind === "centurion");
      if (freshLosses.length) {
        soldier.lastLossScan = Math.max(
          soldier.lastLossScan,
          ...freshLosses.map((loss) => loss.fallenAt)
        );
      }
      let delta = TUNING.moraleRecovery * moraleCapability.recovery * dt;
      delta += clamp((allies - enemies) * 28e-4, -0.018, 0.012) * dt;
      delta -= freshOwnLosses * 0.055 * moraleCapability.casualtyShock;
      delta += freshEnemyLosses * 0.022 / moraleCapability.casualtyShock;
      if (!soldier.privateOrder || simTime > soldier.privateOrder.expiresAt + 2.5) {
        delta -= 0.012 * moraleCapability.casualtyShock * dt;
      } else if (simTime >= soldier.orderUnderstoodAt) {
        delta += clamp((soldier.privateOrder.commandPresence || 1) - 1, -0.3, 0.4) * 6e-3 * dt;
      }
      if (witnessedOfficerLoss) delta -= 0.085 * moraleCapability.officerShock;
      soldier.morale = clamp(soldier.morale + delta, 0, 1);
      return nearestEnemy;
    }
    function formationTargetForSoldier(soldier) {
      const order = soldier.privateOrder;
      const guide = soldier.guideTrack;
      if (!order || simTime < soldier.orderUnderstoodAt || !guide || guide.confidence < 0.08) {
        return {
          x: soldier.targetX,
          z: soldier.targetZ,
          heading: simTime >= soldier.orderUnderstoodAt ? order?.heading ?? soldier.heading : soldier.heading
        };
      }
      const plan = { ranks: order.formation.ranks, columns: order.formation.columns };
      const center = centerFromGuide(guide, order.heading, plan, order.formation.spacing);
      const position = slotPosition(center, order.heading, soldier.doctrine);
      return { ...position, heading: order.heading };
    }
    function chooseVisibleEnemy(soldier, percept) {
      const order = soldier.privateOrder && simTime >= soldier.orderUnderstoodAt ? soldier.privateOrder : null;
      const candidates = percept.nearby.filter((observation) => observation.team !== soldier.team);
      let best = null;
      let bestScore = Infinity;
      const canLeavePost = soldier.doctrine.rank === 0 || candidates.some((enemy) => distance(soldier, enemy) < 2.4) || order?.movement === "counter";
      if (!canLeavePost) return null;
      for (const enemy of candidates) {
        const d = distance(soldier, enemy);
        if (d > TUNING.engageRange) continue;
        const bearingCost = Math.abs(angleDifference(headingTo(soldier, enemy), soldier.heading)) * 0.35;
        const centurionPenalty = enemy.kind === "centurion" ? 0.8 : 0;
        const score = d + bearingCost + centurionPenalty;
        if (score < bestScore) {
          bestScore = score;
          best = enemy;
        }
      }
      return best;
    }
    function advanceCombatState(soldier, visibleEnemy, dt) {
      const combat = soldier.capabilities.combat;
      const weaponReach = TUNING.weaponReach * combat.reach;
      soldier.combatAge += dt;
      if (visibleEnemy) {
        soldier.targetMemory = {
          x: visibleEnemy.x,
          z: visibleEnemy.z,
          heading: visibleEnemy.heading,
          seenAt: simTime
        };
      } else if (soldier.targetMemory && simTime - soldier.targetMemory.seenAt > 0.9 * soldier.capabilities.perception.targetMemory) {
        soldier.targetMemory = null;
      }
      const target = visibleEnemy || soldier.targetMemory;
      if (!target) {
        soldier.combatState = COMBAT_STATE.READY;
        soldier.combatAge = 0;
        return;
      }
      const range = Math.hypot(target.x - soldier.x, target.z - soldier.z);
      if (range > weaponReach * 0.92) {
        if (soldier.combatState !== COMBAT_STATE.APPROACH) soldier.combatAge = 0;
        soldier.combatState = COMBAT_STATE.APPROACH;
        return;
      }
      if ([COMBAT_STATE.READY, COMBAT_STATE.APPROACH].includes(soldier.combatState)) {
        soldier.combatState = COMBAT_STATE.GUARD;
        soldier.combatAge = 0;
      } else if (soldier.combatState === COMBAT_STATE.GUARD && soldier.combatAge >= 0.2 * combat.guardTime) {
        soldier.combatState = COMBAT_STATE.COMMIT;
        soldier.combatAge = 0;
      } else if (soldier.combatState === COMBAT_STATE.COMMIT && soldier.combatAge >= TUNING.commitTime * combat.commitTime) {
        soldier.combatState = COMBAT_STATE.STRIKE;
        soldier.combatAge = 0;
        pendingStrikes.push(deepFreeze({
          attackerId: soldier.id,
          aimHeading: headingTo(soldier, target),
          aimRange: range,
          committedAt: simTime,
          serial: ++soldier.strikeSerial
        }));
      } else if (soldier.combatState === COMBAT_STATE.STRIKE && soldier.combatAge >= TUNING.strikeTime * combat.strikeTime) {
        soldier.combatState = COMBAT_STATE.RECOVER;
        soldier.combatAge = 0;
        soldier.fatigue = clamp(soldier.fatigue + TUNING.fatiguePerStrike * soldier.capabilities.movement.fatigueCost, 0, 1);
      } else if (soldier.combatState === COMBAT_STATE.RECOVER && soldier.combatAge >= TUNING.recoverTime * combat.recoveryTime * (1 + soldier.fatigue * 0.8)) {
        soldier.combatState = COMBAT_STATE.GUARD;
        soldier.combatAge = 0;
      }
    }
    function planSoldierVelocity(soldier, percept, formationTarget, visibleEnemy, dt) {
      const movement = soldier.capabilities.movement;
      const formation = soldier.capabilities.formation;
      const weaponReach = TUNING.weaponReach * soldier.capabilities.combat.reach;
      const fatigueSpeed = 1 - soldier.fatigue * 0.12;
      let desired = { x: 0, z: 0 };
      let maxSpeed = TUNING.soldierDressSpeed * movement.speed * fatigueSpeed;
      let desiredHeading = formationTarget.heading;
      const order = soldier.privateOrder && simTime >= soldier.orderUnderstoodAt ? soldier.privateOrder : null;
      const moraleCapability = soldier.capabilities.morale;
      const closeEnemyBlocksRally = percept.nearby.some((observation) => observation.team !== soldier.team && distance(soldier, observation) <= 8);
      const remainsBroken = soldier.publicState === SOLDIER_STATE.ROUTE && (soldier.morale <= moraleCapability.rallyThreshold || closeEnemyBlocksRally);
      const rallying = soldier.publicState === SOLDIER_STATE.ROUTE && soldier.morale > moraleCapability.rallyThreshold && !closeEnemyBlocksRally;
      if (rallying) soldier.targetMemory = null;
      if (soldier.morale < moraleCapability.routeThreshold || remainsBroken) {
        soldier.nextPublicState = SOLDIER_STATE.ROUTE;
        const enemy = visibleEnemy || soldier.targetMemory;
        const away = enemy ? normalize2({ x: soldier.x - enemy.x, z: soldier.z - enemy.z }) : forwardOf(wrapAngle(TEAM_DOCTRINE[soldier.team].forwardHeading + Math.PI));
        maxSpeed = TUNING.soldierRouteSpeed * movement.speed * fatigueSpeed;
        desired = { x: away.x * maxSpeed, z: away.z * maxSpeed };
        desiredHeading = headingTo({ x: 0, z: 0 }, away);
      } else if (soldier.targetMemory) {
        soldier.nextPublicState = SOLDIER_STATE.ENGAGE;
        desiredHeading = headingTo(soldier, soldier.targetMemory);
        const d = distance(soldier, soldier.targetMemory);
        if (d > weaponReach * 0.78) {
          const toward = normalize2({
            x: soldier.targetMemory.x - soldier.x,
            z: soldier.targetMemory.z - soldier.z
          });
          const combatSpeed = TUNING.soldierCombatSpeed * movement.speed * fatigueSpeed;
          const speed = Math.min(
            combatSpeed,
            Math.max(0, d - weaponReach * 0.72) * 1.4
          );
          desired = { x: toward.x * speed, z: toward.z * speed };
        }
        maxSpeed = TUNING.soldierCombatSpeed * movement.speed * fatigueSpeed;
      } else {
        const dx = formationTarget.x - soldier.x;
        const dz = formationTarget.z - soldier.z;
        const d = Math.hypot(dx, dz);
        if (d > TUNING.postArrive * formation.arrivalTolerance) {
          const toward = normalize2({ x: dx, z: dz });
          const orderReadyAt = Math.max(order?.executeAt || 0, soldier.orderUnderstoodAt || 0);
          const orderedCadence = order && simTime >= orderReadyAt ? order.cadence : 0;
          const dressSpeed = TUNING.soldierDressSpeed * movement.speed * fatigueSpeed;
          const physicalMarch = TUNING.soldierMarchSpeed * movement.speed * fatigueSpeed;
          const speedCap = order?.movement === "hold" ? dressSpeed : Math.min(physicalMarch, Math.max(
            dressSpeed,
            orderedCadence,
            TUNING.soldierMarchSpeed * 0.72
          ));
          const speed = Math.min(speedCap, d * 1.85 * formation.postGain);
          desired = { x: toward.x * speed, z: toward.z * speed };
          maxSpeed = speedCap;
          soldier.nextPublicState = order?.movement === "hold" ? SOLDIER_STATE.FORM : SOLDIER_STATE.MARCH;
        } else {
          soldier.nextPublicState = SOLDIER_STATE.DRESS;
        }
      }
      soldier.heading = rotateToward(
        soldier.heading,
        desiredHeading,
        TUNING.soldierTurnRate * movement.turn * dt
      );
      const allies = percept.nearby.filter((observation) => observation.team === soldier.team).map((observation) => ({ ...observation, publicState: observation.publicState || SOLDIER_STATE.MARCH }));
      const self = {
        id: soldier.id,
        x: soldier.x,
        z: soldier.z,
        seenVx: soldier.seenVx,
        seenVz: soldier.seenVz,
        publicState: soldier.publicState,
        radius: soldier.radius
      };
      const solved = ORCA2D.solvePreferredVelocity(self, allies, desired, maxSpeed, {
        dt,
        timeHorizon: 1.15,
        staticTimeHorizon: 0.72,
        padding: 0.018,
        collisionRadius: (agent) => agent.radius || TUNING.bodyRadius
      });
      soldier.plannedVx = solved.x;
      soldier.plannedVz = solved.z;
    }
    function updateSoldierMind(soldier, percept, dt) {
      if (!soldier.alive) return;
      soldier.thinkT -= dt;
      soldier.orderCallT -= dt;
      soldier.guideCallT -= dt;
      soldier.nextPublicState = soldier.publicState;
      soldier.nextOrderCue = soldier.publicOrderCue;
      soldier.nextGuideCue = soldier.publicGuideCue;
      soldier.fatigue = clamp(soldier.fatigue - TUNING.fatigueRecovery * soldier.capabilities.movement.fatigueRecovery * dt, 0, 1);
      if (soldier.thinkT > 0) {
        const target2 = formationTargetForSoldier(soldier);
        const visible = chooseVisibleEnemy(soldier, percept);
        planSoldierVelocity(soldier, percept, target2, visible, dt);
        return;
      }
      soldier.thinkT += TUNING.soldierThink * (0.9 + hash01(config.seed, soldier.numericId, 689, tick) * 0.2);
      updateSoldierOrderAndGuide(soldier, percept);
      const nearestEnemy = updateSoldierMorale(soldier, percept, TUNING.soldierThink);
      const closeEnemy = nearestEnemy && distance(soldier, nearestEnemy) <= 8;
      const routingNow = soldier.morale < soldier.capabilities.morale.routeThreshold || soldier.publicState === SOLDIER_STATE.ROUTE && (soldier.morale <= soldier.capabilities.morale.rallyThreshold || closeEnemy);
      if (routingNow) {
        soldier.nextPublicState = SOLDIER_STATE.ROUTE;
        soldier.nextOrderCue = null;
        soldier.nextGuideCue = null;
        soldier.combatState = COMBAT_STATE.READY;
        soldier.combatAge = 0;
        soldier.targetMemory = null;
        const target2 = formationTargetForSoldier(soldier);
        planSoldierVelocity(soldier, percept, target2, nearestEnemy, dt);
        return;
      }
      if (soldier.publicState === SOLDIER_STATE.ROUTE) {
        soldier.nextPublicState = SOLDIER_STATE.FORM;
      }
      const visibleEnemy = chooseVisibleEnemy(soldier, percept);
      advanceCombatState(soldier, visibleEnemy, TUNING.soldierThink);
      const target = formationTargetForSoldier(soldier);
      soldier.targetX = target.x;
      soldier.targetZ = target.z;
      planSoldierVelocity(soldier, percept, target, visibleEnemy, dt);
    }
    function publishSoldierCues() {
      for (const soldier of soldiers) {
        if (!soldier.alive) continue;
        soldier.publicState = soldier.nextPublicState;
        soldier.publicOrderCue = soldier.nextOrderCue;
        soldier.publicGuideCue = soldier.nextGuideCue;
      }
    }
    function integrateSoldiers(dt) {
      for (const soldier of soldiers) {
        if (!soldier.alive) continue;
        const acceleration = 4.1 * soldier.capabilities.movement.acceleration;
        soldier.vx += clamp(soldier.plannedVx - soldier.vx, -acceleration * dt, acceleration * dt);
        soldier.vz += clamp(soldier.plannedVz - soldier.vz, -acceleration * dt, acceleration * dt);
        soldier.x += soldier.vx * dt;
        soldier.z += soldier.vz * dt;
        soldier.speed = Math.hypot(soldier.vx, soldier.vz);
      }
    }
    function segmentClearOfFriendlies(attacker, target) {
      const dx = target.x - attacker.x;
      const dz = target.z - attacker.z;
      const lengthSq = dx * dx + dz * dz;
      if (lengthSq < 1e-9) return true;
      const bodies = queryPhysicalBodies(
        attacker.x,
        attacker.z,
        Math.sqrt(lengthSq) + TUNING.bodyRadius,
        attacker
      );
      for (const body of bodies) {
        if (!body.alive || body === target || body.team !== attacker.team) continue;
        const t = clamp(((body.x - attacker.x) * dx + (body.z - attacker.z) * dz) / lengthSq, 0, 1);
        if (t < 0.18 || t > 0.92) continue;
        const px = attacker.x + dx * t;
        const pz = attacker.z + dz * t;
        if (Math.hypot(body.x - px, body.z - pz) < body.radius + 0.1) return false;
      }
      return true;
    }
    function killBody(body, attacker) {
      if (!body.alive) return;
      body.alive = false;
      body.vx = body.vz = 0;
      body.seenVx = body.seenVz = 0;
      body.publicState = body.kind === "soldier" ? SOLDIER_STATE.FALLEN : body.kind === "runner" ? "fallen" : CENTURION_STATE.ROUTED;
      fallenBodies.push(deepFreeze({
        id: body.id,
        kind: body.kind,
        team: body.team,
        centuryId: body.centuryId,
        x: body.x,
        z: body.z,
        heading: body.heading,
        fallenAt: simTime,
        attackerId: attacker?.id || null
      }));
      if (body.kind === "centurion") {
        const century = centuryById(body.centuryId);
        if (century) {
          century.brain.standard.code = STANDARD_CODE.NONE;
          century.brain.standard.until = 0;
          body.standardCode = STANDARD_CODE.NONE;
          body.nextStandardCode = STANDARD_CODE.NONE;
          body.standardEpoch = century.brain.plan.epoch;
          body.nextStandardEpoch = century.brain.plan.epoch;
          body.publicOrderCue = null;
          century.publicOrder = null;
          century.publicOrderUntil = 0;
          century.nextPublicOrder = null;
          century.nextPublicOrderUntil = 0;
          setCenturionState(century, CENTURION_STATE.ROUTED, "centurion-fallen");
          emitObserver("centurion-fallen", { centuryId: century.id });
        }
      }
    }
    function resolveStrikes() {
      if (!pendingStrikes.length) return;
      const damage = /* @__PURE__ */ new Map();
      const landed = [];
      for (const intent of pendingStrikes.splice(0)) {
        const attacker = bodyById.get(intent.attackerId);
        if (!attacker?.alive) continue;
        const weaponReach = TUNING.weaponReach * attacker.capabilities.combat.reach;
        let target = null;
        let targetScore = Infinity;
        for (const candidate of queryPhysicalBodies(
          attacker.x,
          attacker.z,
          weaponReach + 0.05,
          attacker
        )) {
          if (!candidate.alive || candidate.team === attacker.team) continue;
          const candidateRange = distance(attacker, candidate);
          const candidateAimError = Math.abs(angleDifference(
            headingTo(attacker, candidate),
            intent.aimHeading
          ));
          if (candidateAimError > 38 * Math.PI / 180) continue;
          const score = candidateAimError * 2.1 + Math.abs(candidateRange - intent.aimRange) * 0.32;
          if (score < targetScore) {
            targetScore = score;
            target = candidate;
          }
        }
        if (!target) continue;
        const range = distance(attacker, target);
        const aimError = Math.abs(angleDifference(headingTo(attacker, target), intent.aimHeading));
        if (range > weaponReach || aimError > 38 * Math.PI / 180) continue;
        if (!segmentClearOfFriendlies(attacker, target)) {
          logCombat({ event: "blocked-friendly", attackerId: attacker.id, targetId: target.id });
          continue;
        }
        const targetBearingToAttacker = headingTo(target, attacker);
        const defenseAngle = Math.abs(angleDifference(targetBearingToAttacker, target.heading));
        const flank = defenseAngle > 105 * Math.PI / 180;
        const shieldFront = defenseAngle < 72 * Math.PI / 180;
        const fatigue = attacker.fatigue || 0;
        const chance = combatHitChance({
          baseChance: TUNING.baseHitChance,
          flankBonus: TUNING.flankHitBonus,
          flank,
          shieldFront,
          attacker: attacker.capabilities,
          target: target.capabilities,
          fatigue,
          targetKind: target.kind
        });
        const attackerKey = attacker.numericId ?? [...attacker.id].reduce((sum, c) => sum + c.charCodeAt(0), 0);
        const targetKey = target.numericId ?? [...target.id].reduce((sum, c) => sum + c.charCodeAt(0), 0);
        const roll = hash01(
          config.seed,
          attackerKey,
          targetKey,
          Math.floor(intent.committedAt * 20) + intent.serial
        );
        if (roll > chance) {
          logCombat({
            event: "miss",
            attackerId: attacker.id,
            targetId: target.id,
            range,
            flank,
            shieldFront
          });
          continue;
        }
        const amount = combatDamage({
          directionalBase: flank ? 0.76 : shieldFront ? 0.45 : 0.58,
          attacker: attacker.capabilities,
          target: target.capabilities
        });
        damage.set(target.id, (damage.get(target.id) || 0) + amount);
        landed.push({ attacker, target, amount, flank, shieldFront });
      }
      for (const hit of landed) {
        logCombat({
          event: "hit",
          attackerId: hit.attacker.id,
          targetId: hit.target.id,
          damage: hit.amount,
          flank: hit.flank,
          shieldFront: hit.shieldFront
        });
      }
      for (const [targetId, amount] of damage) {
        const target = bodyById.get(targetId);
        if (!target?.alive) continue;
        target.hp -= amount;
        if (target.hp <= 0) {
          const source = landed.find((hit) => hit.target.id === targetId)?.attacker || null;
          killBody(target, source);
          logCombat({
            event: "casualty",
            targetId,
            attackerId: source?.id || null,
            team: target.team,
            centuryId: target.centuryId,
            kind: target.kind
          });
        }
      }
    }
    function bodyMobility(body) {
      if (body.kind === "centurion") return 0.28;
      if (body.publicState === SOLDIER_STATE.DRESS) return 0.18;
      if (body.publicState === SOLDIER_STATE.ENGAGE) return 0.55;
      if (body.publicState === SOLDIER_STATE.ROUTE) return 1.25;
      return 1;
    }
    function clampBodyToBattlefield(body) {
      const halfWidth = TUNING.battlefieldHalfWidth;
      const halfDepth = TUNING.battlefieldHalfDepth;
      if (body.x < -halfWidth) {
        body.x = -halfWidth;
        if (body.vx < 0) body.vx = 0;
      } else if (body.x > halfWidth) {
        body.x = halfWidth;
        if (body.vx > 0) body.vx = 0;
      }
      if (body.z < -halfDepth) {
        body.z = -halfDepth;
        if (body.vz < 0) body.vz = 0;
      } else if (body.z > halfDepth) {
        body.z = halfDepth;
        if (body.vz > 0) body.vz = 0;
      }
    }
    function resolveBodyCollisions() {
      for (const body of bodyById.values()) {
        if (body.alive) clampBodyToBattlefield(body);
      }
      for (let iteration = 0; iteration < 8; iteration++) {
        rebuildSpatial(2.2);
        const seenPairs = /* @__PURE__ */ new Set();
        for (const a of bodyById.values()) {
          if (!a.alive) continue;
          const near = queryPhysicalBodies(a.x, a.z, a.radius + 1, a);
          for (const b of near) {
            const pairKey = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
            if (seenPairs.has(pairKey)) continue;
            seenPairs.add(pairKey);
            const minimum = a.radius + b.radius + 6e-3;
            let dx = b.x - a.x;
            let dz = b.z - a.z;
            let d = Math.hypot(dx, dz);
            if (d >= minimum) continue;
            const actualDistance = d;
            if (d < 1e-8) {
              const angle = hash01(
                config.seed,
                [...a.id].reduce((sum, c) => sum + c.charCodeAt(0), 0),
                [...b.id].reduce((sum, c) => sum + c.charCodeAt(0), 0),
                tick
              ) * Math.PI * 2;
              dx = Math.cos(angle);
              dz = Math.sin(angle);
              d = 1;
            } else {
              dx /= d;
              dz /= d;
            }
            const penetration = minimum - actualDistance;
            const aMobility = bodyMobility(a);
            const bMobility = bodyMobility(b);
            const total = aMobility + bMobility || 1;
            a.x -= dx * penetration * aMobility / total;
            a.z -= dz * penetration * aMobility / total;
            b.x += dx * penetration * bMobility / total;
            b.z += dz * penetration * bMobility / total;
            const closing = (b.vx - a.vx) * dx + (b.vz - a.vz) * dz;
            if (closing < 0) {
              const impulse = -closing / total;
              a.vx -= dx * impulse * aMobility;
              a.vz -= dz * impulse * aMobility;
              b.vx += dx * impulse * bMobility;
              b.vz += dz * impulse * bMobility;
            }
            clampBodyToBattlefield(a);
            clampBodyToBattlefield(b);
          }
        }
      }
    }
    function usableGeneralEnemyTracks(general) {
      return [...general.brain.enemyTracks.values()].filter((track) => track.confidence >= 0.14 && simTime - track.observedAt <= TUNING.generalTrackMaxAge);
    }
    function chooseGeneralIntent(general) {
      const brain = general.brain;
      const friendly = [...brain.friendlyTracks.values()];
      const contacts = usableGeneralEnemyTracks(general);
      const ownEstimate = friendly.reduce((sum, track) => sum + track.strengthEstimate, 0);
      const ownInitial = friendly.reduce((sum, track) => sum + track.initialStrength, 0);
      const ownRatio = ownEstimate / Math.max(1, ownInitial);
      const ownKnowledge = friendly.reduce((sum, track) => sum + track.initialStrength * track.strengthConfidence, 0) / Math.max(1, ownInitial);
      const comparisonOwnEstimate = ownEstimate * clamp(ownKnowledge, 0.55, 1);
      const withdrawing = friendly.some((track) => ["withdrawing", "retiring"].includes(track.statusBand) && track.confidence > 0.28);
      const contact = contacts.slice().sort((left, right) => right.confidence * 2 + right.strengthEstimate / 40 - distance(general.post, right) / 120 - (left.confidence * 2 + left.strengthEstimate / 40 - distance(general.post, left) / 120))[0] || null;
      const enemyEstimate = contacts.reduce((sum, track) => sum + track.strengthEstimate * clamp(track.confidence, 0.25, 1), 0);
      if (Number.isFinite(brain.deceptionCommittedAt) && !brain.deceptionSpent) {
        if (simTime - brain.deceptionCommittedAt < 24) {
          return {
            state: GENERAL_STATE.DECEIVE,
            posture: POSTURE.DEFENSIVE_FEINT,
            reason: "maintain-committed-feint",
            zone: null
          };
        }
        brain.deceptionSpent = true;
      }
      const credibleHeavyLoss = ownRatio < 0.54 && ownKnowledge >= 0.38;
      if (withdrawing || credibleHeavyLoss) {
        const visible = friendly.filter((track) => track.confidence >= 0.25);
        const center = visible.length ? {
          x: visible.reduce((sum, track) => sum + track.x, 0) / visible.length,
          z: visible.reduce((sum, track) => sum + track.z, 0) / visible.length
        } : general.post;
        return {
          state: GENERAL_STATE.RECOVER,
          posture: POSTURE.HOLD,
          reason: withdrawing ? "reported-withdrawal" : "estimated-heavy-loss",
          zone: { x: center.x, z: center.z, radius: 18 }
        };
      }
      if (ownRatio < 0.54) {
        return {
          state: GENERAL_STATE.GUARD,
          posture: POSTURE.HOLD,
          reason: "friendly-strength-uncertain",
          zone: null
        };
      }
      if (!contact) {
        if (simTime < brain.traits.patience) {
          return {
            state: GENERAL_STATE.OBSERVE,
            posture: brain.lastOrderedPosture,
            reason: "insufficient-contact",
            zone: null
          };
        }
        return {
          state: GENERAL_STATE.PROBE,
          posture: POSTURE.AGGRESSIVE,
          reason: "reconnaissance-in-force",
          zone: null
        };
      }
      const contactRange = distance(general.post, contact);
      const radialClosing = ((contact.x - general.post.x) * contact.vx + (contact.z - general.post.z) * contact.vz) / Math.max(1, contactRange) < -0.12;
      if (!brain.deceptionSpent && brain.traits.deception >= 0.43 && radialClosing && contact.confidence >= 0.28) {
        return {
          state: GENERAL_STATE.DECEIVE,
          posture: POSTURE.DEFENSIVE_FEINT,
          reason: "bait-closing-enemy",
          zone: null
        };
      }
      if (contact.confidence >= 0.52 && enemyEstimate < comparisonOwnEstimate * 0.78) {
        return {
          state: GENERAL_STATE.PRESS,
          posture: POSTURE.AGGRESSIVE,
          reason: "exploit-estimated-advantage",
          zone: null
        };
      }
      if (contactRange < 38 && enemyEstimate >= comparisonOwnEstimate * 0.88) {
        const visible = friendly.filter((track) => track.confidence >= 0.25);
        const center = visible.length ? {
          x: visible.reduce((sum, track) => sum + track.x, 0) / visible.length,
          z: visible.reduce((sum, track) => sum + track.z, 0) / visible.length
        } : general.post;
        return {
          state: GENERAL_STATE.GUARD,
          posture: POSTURE.HOLD,
          reason: "guard-against-credible-threat",
          zone: { x: center.x, z: center.z, radius: 20 }
        };
      }
      if (brain.traits.aggression >= 0.58) {
        return {
          state: GENERAL_STATE.PRESS,
          posture: POSTURE.AGGRESSIVE,
          reason: "press-uncertain-contact",
          zone: null
        };
      }
      if (!brain.deceptionSpent && brain.traits.deception >= 0.55) {
        return {
          state: GENERAL_STATE.DECEIVE,
          posture: POSTURE.DEFENSIVE_FEINT,
          reason: "shape-uncertain-contact",
          zone: null
        };
      }
      return {
        state: GENERAL_STATE.GUARD,
        posture: POSTURE.HOLD,
        reason: "preserve-force-under-uncertainty",
        zone: null
      };
    }
    function generalPostureNeedsReconciliation(general, posture) {
      const brain = general.brain;
      for (const track of brain.friendlyTracks.values()) {
        if (track.intendedPosture !== posture) return true;
        if (track.confirmedPosture === posture) continue;
        const receipt = brain.postureReceipts.get(track.centuryId);
        if (!receipt || receipt.posture !== posture) return true;
        if (["failed", "superseded", "overdue"].includes(receipt.status) || receiptIsOverdue(receipt)) return true;
        if (["acknowledged", "satisfied"].includes(receipt.status)) return true;
      }
      return false;
    }
    function generalZoneSetNeedsReconciliation(general, zone) {
      const brain = general.brain;
      for (const track of brain.friendlyTracks.values()) {
        if (!track.intendedZoneActive || !zoneIntentsMateriallyEqual(track.intendedZone, zone)) return true;
        const receipt = brain.zoneReceipts.get(track.centuryId);
        if (receipt?.command === "set-zone" && zoneIntentsMateriallyEqual(receipt.zone, zone)) {
          if (["failed", "superseded", "overdue"].includes(receipt.status) || receiptIsOverdue(receipt)) return true;
          if (["queued", "outbound"].includes(receipt.status)) continue;
          if (["acknowledged", "satisfied"].includes(receipt.status) && track.confirmedZoneActive && zoneIntentsMateriallyEqual(track.confirmedZone, zone)) continue;
          if (["acknowledged", "satisfied"].includes(receipt.status)) return true;
        }
        if (!track.confirmedZoneActive || !zoneIntentsMateriallyEqual(track.confirmedZone, zone)) return true;
      }
      return false;
    }
    function generalZoneClearNeedsReconciliation(general) {
      const brain = general.brain;
      for (const track of brain.friendlyTracks.values()) {
        if (track.intendedZoneActive) return true;
        const receipt = brain.zoneReceipts.get(track.centuryId);
        if (receipt?.command === "clear-zone") {
          if (["failed", "superseded", "overdue"].includes(receipt.status) || receiptIsOverdue(receipt)) return true;
          if (["queued", "outbound"].includes(receipt.status)) continue;
          if (["acknowledged", "satisfied"].includes(receipt.status) && !track.confirmedZoneActive) continue;
          if (["acknowledged", "satisfied"].includes(receipt.status)) return true;
        }
        if (track.confirmedZoneActive) return true;
      }
      return false;
    }
    function updateGeneralBrain(general, percept, dt) {
      updateGeneralAwareness(general, percept, dt);
      const brain = general.brain;
      brain.thinkT -= dt;
      if (brain.thinkT > 0 || !generalAIEnabled(general.team) || matchResult) return;
      brain.thinkT += TUNING.generalThink * (0.9 + hash01(
        config.seed,
        general.team === TEAM.BLUE ? 1 : 2,
        776,
        tick
      ) * 0.2);
      if (simTime < brain.nextDecisionAt) return;
      const decision = chooseGeneralIntent(general);
      brain.state = decision.state;
      brain.reason = decision.reason;
      brain.lastDecisionAt = simTime;
      brain.decisionSerial++;
      const canOrder = simTime - brain.lastOrderAt >= TUNING.generalDecisionFloor;
      const postureChanged = decision.posture !== brain.lastOrderedPosture;
      const postureNeedsRetry = generalPostureNeedsReconciliation(general, decision.posture);
      let commandIssued = false;
      if (canOrder && (postureChanged || postureNeedsRetry)) {
        issuePosture(general.team, decision.posture);
        commandIssued = true;
        if (decision.posture === POSTURE.DEFENSIVE_FEINT) {
          brain.deceptionCommittedAt = simTime;
        }
      }
      const zoneNeedsOrder = decision.zone && generalZoneSetNeedsReconciliation(general, decision.zone);
      if (canOrder && zoneNeedsOrder && simTime - brain.zoneIssuedAt >= TUNING.generalDecisionFloor * 2) {
        setHoldZone(general.team, decision.zone);
        commandIssued = true;
      }
      const zoneClearNeedsRetry = !decision.zone && generalZoneClearNeedsReconciliation(general);
      if (canOrder && !decision.zone && (brain.zoneActive || zoneClearNeedsRetry)) {
        clearHoldZone(general.team);
        commandIssued = true;
      }
      const jitter = hash01(
        config.seed,
        general.team === TEAM.BLUE ? 1 : 2,
        777,
        brain.decisionSerial
      ) * 4;
      brain.nextDecisionAt = simTime + TUNING.generalDecisionFloor + jitter;
      emitObserver("general-ai-decision", {
        team: general.team,
        state: decision.state,
        posture: decision.posture,
        reason: decision.reason,
        commandIssued,
        decisionSerial: brain.decisionSerial
      });
    }
    function generalBearingBand(general, track) {
      const local = localFromWorld(
        general.post,
        TEAM_DOCTRINE[general.team].forwardHeading,
        track
      );
      const lateralThreshold = Math.max(8, Math.abs(local.depth) * 0.32);
      if (Math.abs(local.lateral) <= lateralThreshold) {
        return local.depth >= 0 ? "front" : "rear";
      }
      const side = local.lateral < 0 ? "left" : "right";
      return `${local.depth >= 0 ? "front" : "rear"}-${side}`;
    }
    function directSightCoversGeneralTrack(brain, track) {
      const frame2 = brain.directSight;
      if (!frame2 || Math.abs(frame2.observedAt - simTime) > 1e-9) return false;
      const visibleBodies = frame2.bodies.filter((body) => body.visualClass !== "runner");
      if (track.signature && visibleBodies.some((body) => body.visualClass === "standard" && body.recognizedMark === track.signature)) {
        return true;
      }
      const strengthBand = contactStrengthBand(track.strengthEstimate);
      const glyphRadius = strengthBand === "many" ? 11 : strengthBand === "body" ? 7 : 4.5;
      const footprintRadius = clamp((track.width || 0) * 0.55 + 2, 4.5, 12);
      const coverageRadius = Math.max(glyphRadius, footprintRadius);
      return visibleBodies.some((body) => distance(body, track) <= coverageRadius);
    }
    function generalSituation(team) {
      if (!TEAMS.includes(team)) throw new RangeError(`Unknown general team: ${String(team)}`);
      const general = generalBrains.get(team);
      if (!general) return null;
      const brain = general.brain;
      const friendly = [...brain.friendlyTracks.values()].sort((left, right) => left.centuryId.localeCompare(right.centuryId)).map((track) => {
        const receipt = [
          brain.postureReceipts.get(track.centuryId),
          brain.zoneReceipts.get(track.centuryId)
        ].filter(Boolean).sort((left, right) => right.issuedAt - left.issuedAt || right.serial - left.serial)[0] || null;
        const orderStatus = receiptIsOverdue(receipt) ? "overdue" : receipt?.status === "satisfied" ? "acknowledged" : receipt?.status || "doctrine";
        return {
          centuryId: track.centuryId,
          mark: track.mark,
          confidence: track.confidence,
          strengthConfidence: track.strengthConfidence,
          age: Math.max(0, simTime - track.observedAt),
          strengthAge: Math.max(0, simTime - track.strengthObservedAt),
          strengthBand: track.strengthConfidence < 0.18 ? "unknown" : strengthBandForEstimate(track.strengthEstimate, track.initialStrength),
          statusBand: track.statusBand,
          orderStatus,
          intendedPosture: track.intendedPosture,
          source: track.source,
          x: quantize(track.x, 1),
          z: quantize(track.z, 1)
        };
      });
      const contacts = usableGeneralEnemyTracks(general).map((track) => {
        const age = Math.max(0, simTime - track.observedAt);
        const range = distance(general.post, track);
        return {
          trackId: track.id,
          recognizedMark: track.signature,
          confidence: track.confidence,
          confidenceBand: track.confidence >= 0.66 ? "confirmed" : track.confidence >= 0.34 ? "probable" : "uncertain",
          age,
          ageBand: age < 2.5 ? "fresh" : age < 9 ? "recent" : "stale",
          strengthBand: contactStrengthBand(track.strengthEstimate),
          rangeBand: range < 30 ? "near" : range < 58 ? "middle" : "distant",
          bearingBand: generalBearingBand(general, track),
          threatBand: range < 36 && track.confidence >= 0.45 ? "high" : range < 58 && track.confidence >= 0.28 ? "watch" : "low",
          source: track.source,
          directlyVisible: directSightCoversGeneralTrack(brain, track),
          x: quantize(track.x, 2),
          z: quantize(track.z, 2)
        };
      }).sort((left, right) => {
        const threatRank = { high: 3, watch: 2, low: 1 };
        const rangeRank = { near: 3, middle: 2, distant: 1 };
        return (threatRank[right.threatBand] || 0) - (threatRank[left.threatBand] || 0) || right.confidence - left.confidence || left.age - right.age || (rangeRank[right.rangeBand] || 0) - (rangeRank[left.rangeBand] || 0) || left.trackId.localeCompare(right.trackId);
      });
      const alerts = [];
      for (const track of friendly) {
        if (track.orderStatus === "overdue") alerts.push(`${track.mark} courier overdue`);
        if (track.confidence < 0.22) alerts.push(`${track.mark} position uncertain`);
        if (["withdrawing", "retiring"].includes(track.statusBand)) {
          alerts.push(`${track.mark} reports withdrawal`);
        }
      }
      if (contacts.some((contact) => contact.threatBand === "high")) {
        alerts.push("credible enemy threat near command post");
      }
      return detachedFrozen({
        team,
        aiEnabled: generalAIEnabled(team),
        general: {
          state: brain.state,
          intent: brain.intent,
          reason: brain.reason,
          lastDecisionAt: brain.lastDecisionAt,
          ordersIssued: brain.ordersIssued,
          reportsReceived: brain.reportsReceived
        },
        friendly,
        contacts,
        directSight: brain.directSight,
        alerts
      });
    }
    function setGeneralAI(team, enabled) {
      if (!TEAMS.includes(team)) throw new RangeError(`Unknown general team: ${String(team)}`);
      if (team === TEAM.BLUE) config.generalAIBlue = Boolean(enabled);
      else config.generalAIRed = Boolean(enabled);
      const general = generalBrains.get(team);
      if (general && enabled) {
        general.brain.nextDecisionAt = Math.min(general.brain.nextDecisionAt, simTime + 0.5);
      }
      return deepFreeze({ team, enabled: generalAIEnabled(team) });
    }
    function projectMatchResult() {
      const teamStatus = {};
      for (const team of TEAMS) {
        const teamSoldiers = soldiers.filter((soldier) => soldier.team === team);
        const alive = teamSoldiers.filter((soldier) => soldier.alive).length;
        const routing = teamSoldiers.filter((soldier) => soldier.alive && soldier.publicState === SOLDIER_STATE.ROUTE).length;
        const centurionsAlive = centuries.filter((century) => century.team === team && century.centurion.alive).length;
        teamStatus[team] = { initial: teamSoldiers.length, alive, routing, centurionsAlive };
      }
      const defeated = TEAMS.filter((team) => {
        const status = teamStatus[team];
        return status.alive <= Math.max(2, Math.floor(status.initial * 0.12)) || status.centurionsAlive === 0 && status.routing >= status.alive * 0.65;
      });
      let result = null;
      if (defeated.length === 1) {
        result = { status: "victory", winner: otherTeam(defeated[0]), loser: defeated[0] };
      } else if (defeated.length === 2) {
        result = { status: "draw", winner: null, loser: null };
      } else if (simTime >= TUNING.matchTimeLimit) {
        const blue = teamStatus[TEAM.BLUE].alive;
        const red = teamStatus[TEAM.RED].alive;
        result = blue === red ? { status: "draw", winner: null, loser: null } : {
          status: "time-victory",
          winner: blue > red ? TEAM.BLUE : TEAM.RED,
          loser: blue > red ? TEAM.RED : TEAM.BLUE
        };
      }
      if (result && !matchResult) {
        matchResult = deepFreeze({ ...result, at: simTime, teamStatus });
        emitObserver("match-result", matchResult);
      }
    }
    function step(dt = TUNING.fixedDt) {
      if (!Number.isFinite(dt) || dt <= 0 || dt > 0.25) {
        throw new RangeError("step(dt) expects 0 < finite dt <= 0.25");
      }
      simTime += dt;
      tick++;
      for (const body of bodyById.values()) {
        if (!body.alive) continue;
        body.seenVx = body.vx || 0;
        body.seenVz = body.vz || 0;
      }
      rebuildSpatial();
      updateCouriers(dt);
      const generalPerceptFrames = /* @__PURE__ */ new Map();
      for (const team of TEAMS) {
        const general = generalBrains.get(team);
        generalPerceptFrames.set(team, senseGeneral(general));
      }
      for (const team of TEAMS) {
        updateGeneralBrain(generalBrains.get(team), generalPerceptFrames.get(team), dt);
      }
      const centurionPerceptFrames = /* @__PURE__ */ new Map();
      for (const century of centuries) {
        if (century.centurion.alive) {
          centurionPerceptFrames.set(century.id, senseCenturion(century));
        }
      }
      for (const century of centuries) {
        updateCenturionBrain(century, centurionPerceptFrames.get(century.id), dt);
      }
      commitCenturionSignals();
      integrateCenturions(dt);
      rebuildSpatial();
      const perceptFrames = /* @__PURE__ */ new Map();
      for (const soldier of soldiers) {
        if (soldier.alive) perceptFrames.set(soldier.id, senseSoldier(soldier));
      }
      for (const soldier of soldiers) {
        if (soldier.alive) updateSoldierMind(soldier, perceptFrames.get(soldier.id), dt);
      }
      resolveStrikes();
      integrateSoldiers(dt);
      resolveBodyCollisions();
      publishSoldierCues();
      commitCenturyOrders();
      projectMatchResult();
    }
    function centuryObserverSnapshot(century) {
      const center = currentCenturyCenter(century);
      const alive = aliveSoldiers(century).length;
      const tracks = [...century.brain.enemyTracks.values()].map((track) => deepFreeze({
        id: track.id,
        signature: track.signature,
        x: track.x,
        z: track.z,
        vx: track.vx,
        vz: track.vz,
        heading: track.heading,
        strengthEstimate: track.strengthEstimate,
        confidence: track.confidence,
        source: track.source,
        age: simTime - track.observedAt
      }));
      const individualContacts = century.brain.individualContacts.map((contact) => deepFreeze({
        contactClass: contact.contactClass,
        kind: contact.kind,
        recognizedMark: contact.recognizedMark,
        x: contact.x,
        z: contact.z,
        heading: contact.heading,
        confidence: contact.confidence,
        age: simTime - contact.observedAt
      }));
      return deepFreeze({
        id: century.id,
        standard: century.standard,
        team: century.team,
        index: century.index,
        posture: century.posture,
        state: century.brain.state,
        reason: century.brain.lastReason,
        center,
        heading: century.centurion.heading,
        alive,
        initialStrength: century.initialStrength,
        casualties: century.initialStrength - alive,
        centurionAlive: century.centurion.alive,
        holdZone: century.holdZone ? { ...century.holdZone } : null,
        perceivedOwn: century.brain.perceivedOwn,
        perceivedCohesion: century.brain.perceivedCohesion,
        perceivedMorale: century.brain.perceivedMorale,
        contactConfidence: century.brain.contactConfidence,
        flankThreat: century.brain.flankThreat ? { ...century.brain.flankThreat } : null,
        lineDepthError: century.brain.lineDepthError,
        lineGapError: century.brain.lineGapError,
        lineHeading: century.brain.lineHeading,
        lineIntegrityBand: century.brain.lineIntegrityBand,
        doctrinePriority: century.brain.doctrinePriority,
        zonePhase: century.brain.zonePhase,
        communicationState: century.brain.communicationState,
        tacticalRole: century.brain.plan.role,
        planStatus: century.brain.plan.status,
        planEpoch: century.brain.plan.epoch,
        pendingPlanEpoch: century.brain.pendingMission?.epoch ?? null,
        standardCode: century.brain.standard.code,
        messagesSent: century.brain.messagesSent,
        messagesReceived: century.brain.messagesReceived,
        ordersIssued: century.brain.ordersIssued,
        orderSerial: century.orderSerial,
        capabilitySummary: century.capabilitySummary,
        centurionRatings: century.centurion.ratings,
        training: century.deploymentProfile.training,
        equipment: century.deploymentProfile.equipment,
        tracks: config.showCognition ? tracks : [],
        individualContacts: config.showCognition ? individualContacts : []
      });
    }
    function observe() {
      const snapshot = {
        version: VERSION,
        simTime,
        tick,
        config: deepFreeze({ ...config }),
        matchResult,
        generalSituations: Object.fromEntries(TEAMS.map((team) => [team, generalSituation(team)])),
        generalCommandsQueued: generalCommandQueue.length,
        centuries: centuries.map(centuryObserverSnapshot),
        soldiers: soldiers.map((soldier) => deepFreeze({
          id: soldier.id,
          team: soldier.team,
          centuryId: soldier.centuryId,
          x: soldier.x,
          z: soldier.z,
          vx: soldier.vx,
          vz: soldier.vz,
          speed: soldier.speed,
          heading: soldier.heading,
          alive: soldier.alive,
          hp: Math.max(0, soldier.hp),
          maxHp: soldier.maxHp,
          ratings: soldier.ratings,
          state: soldier.publicState,
          combatState: soldier.combatState,
          morale: soldier.morale,
          fatigue: soldier.fatigue,
          rank: soldier.doctrine.rank,
          file: soldier.doctrine.file,
          targetX: soldier.targetX,
          targetZ: soldier.targetZ
        })),
        centurions: centuries.map((century) => deepFreeze({
          id: century.centurion.id,
          team: century.team,
          centuryId: century.id,
          standard: century.standard,
          x: century.centurion.x,
          z: century.centurion.z,
          vx: century.centurion.vx,
          vz: century.centurion.vz,
          heading: century.centurion.heading,
          alive: century.centurion.alive,
          hp: Math.max(0, century.centurion.hp),
          maxHp: century.centurion.maxHp,
          ratings: century.centurion.ratings,
          state: century.brain.state,
          gazeHeading: century.brain.gazeHeading,
          standardCode: century.centurion.standardCode,
          standardEpoch: century.centurion.standardEpoch
        })),
        couriers: config.showMessages ? couriers.map((courier) => deepFreeze({
          id: courier.id,
          mode: courier.mode,
          senderId: courier.senderId,
          receiverId: courier.receiverId,
          kind: courier.packet.kind || courier.packet.command,
          phase: courier.phase || "in-flight",
          team: courier.team || centuryById(courier.senderId)?.team || null,
          x: courier.x,
          z: courier.z,
          targetX: courier.targetX,
          targetZ: courier.targetZ
        })) : [],
        fallenBodies: fallenBodies.map((body) => body),
        recentCombatEvents: combatEvents.slice(-80),
        recentCommunicationEvents: communicationEvents.slice(-200)
      };
      return deepFreeze(snapshot);
    }
    function diagnostics() {
      let overlaps = 0;
      let nonFinite = 0;
      let minGap = Infinity;
      const aliveBodies = [...bodyById.values()].filter((body) => body.alive);
      for (let i = 0; i < aliveBodies.length; i++) {
        const a = aliveBodies[i];
        if (![a.x, a.z, a.vx, a.vz, a.heading].every(Number.isFinite)) nonFinite++;
        for (let j = i + 1; j < aliveBodies.length; j++) {
          const b = aliveBodies[j];
          const gap = distance(a, b);
          minGap = Math.min(minGap, gap);
          if (gap < a.radius + b.radius - 3e-3) overlaps++;
        }
      }
      const team = {};
      for (const teamId of TEAMS) {
        const teamSoldiers = soldiers.filter((soldier) => soldier.team === teamId);
        team[teamId] = {
          initial: teamSoldiers.length,
          alive: teamSoldiers.filter((soldier) => soldier.alive).length,
          fallen: teamSoldiers.filter((soldier) => !soldier.alive).length,
          routing: teamSoldiers.filter((soldier) => soldier.alive && soldier.publicState === SOLDIER_STATE.ROUTE).length,
          centurionsAlive: centuries.filter((century2) => century2.team === teamId && century2.centurion.alive).length
        };
      }
      const century = Object.fromEntries(centuries.map((unit) => [unit.id, {
        posture: unit.posture,
        state: unit.brain.state,
        alive: aliveSoldiers(unit).length,
        initial: unit.initialStrength,
        centurionAlive: unit.centurion.alive,
        perceivedOwn: unit.brain.perceivedOwn,
        tracks: unit.brain.enemyTracks.size,
        contactConfidence: unit.brain.contactConfidence,
        messagesSent: unit.brain.messagesSent,
        messagesReceived: unit.brain.messagesReceived,
        tacticalRole: unit.brain.plan.role,
        planStatus: unit.brain.plan.status,
        planEpoch: unit.brain.plan.epoch,
        standardCode: unit.brain.standard.code,
        ordersIssued: unit.brain.ordersIssued,
        lineDepthError: unit.brain.lineDepthError,
        lineGapError: unit.brain.lineGapError,
        holdZone: unit.holdZone ? { ...unit.holdZone } : null
      }]));
      const general = Object.fromEntries(TEAMS.map((teamId) => {
        const brain = generalBrains.get(teamId)?.brain;
        return [teamId, {
          aiEnabled: generalAIEnabled(teamId),
          state: brain?.state || null,
          intent: brain?.intent || null,
          contacts: brain?.enemyTracks.size || 0,
          ordersIssued: brain?.ordersIssued || 0,
          reportsReceived: brain?.reportsReceived || 0
        }];
      }));
      return deepFreeze({
        version: VERSION,
        simTime,
        tick,
        team,
        century,
        general,
        activeBodies: aliveBodies.length,
        fallenBodies: fallenBodies.length,
        couriers: couriers.length,
        physicalRunners: couriers.filter((courier) => courier.kind === "runner").length,
        generalCommandsQueued: generalCommandQueue.length,
        messagesDispatched: aggregateCounters.messagesDispatched,
        messagesDelivered: aggregateCounters.messagesDelivered,
        runnerDeliveries: aggregateCounters.runnerDeliveries,
        voiceDeliveries: aggregateCounters.voiceDeliveries,
        strikes: aggregateCounters.strikes,
        hits: aggregateCounters.hits,
        casualties: aggregateCounters.soldierCasualties,
        soldierCasualties: aggregateCounters.soldierCasualties,
        centurionCasualties: aggregateCounters.centurionCasualties,
        runnerLosses: aggregateCounters.runnerLosses,
        overlaps,
        nonFinite,
        minGap: Number.isFinite(minGap) ? minGap : 0,
        matchResult
      });
    }
    function resolveCommandScope(scope) {
      if (scope === "all") return centuries.slice();
      if (TEAMS.includes(scope)) return centuries.filter((century2) => century2.team === scope);
      const century = centuryById(scope);
      if (!century) {
        throw new RangeError(`Unknown command scope: ${String(scope)}`);
      }
      return [century];
    }
    function enqueueGeneralCommand(scope, command) {
      const affected = resolveCommandScope(scope);
      const serialByTeam = {};
      for (const team of new Set(affected.map((century) => century.team))) {
        serialByTeam[team] = nextGeneralCommandSerial[team]++;
      }
      const teamScope = scope === "all" || TEAMS.includes(scope);
      for (const century of affected) {
        const serial = serialByTeam[century.team];
        const general = generalBrains.get(century.team);
        const friendlyTrack = general?.brain.friendlyTracks.get(century.standard);
        if (!friendlyTrack) {
          throw new Error(`General ${century.team} lacks doctrine track for ${century.standard}`);
        }
        const guideEstimate = guideFromCenter(
          friendlyTrack,
          friendlyTrack.heading,
          friendlyTrack.doctrinePlan,
          friendlyTrack.spacing
        );
        const targetEstimate = {
          x: quantize(guideEstimate.x, 1),
          z: quantize(guideEstimate.z, 1)
        };
        const packet = copyPacket({
          serial,
          receiverId: century.id,
          command: command.command,
          posture: command.posture,
          zone: command.zone,
          teamScope,
          issuedAt: simTime,
          expiresAt: simTime + 90
        });
        for (let index = generalCommandQueue.length - 1; index >= 0; index--) {
          const queued = generalCommandQueue[index];
          if (queued.receiverId === century.id && generalCommandFamily(queued.packet.command) === generalCommandFamily(command.command)) {
            const superseded = generalPacketReceipt(
              general.brain,
              queued.receiverId,
              queued.packet
            );
            if (superseded?.status === "queued") {
              superseded.status = "superseded";
              superseded.returnedAt = simTime;
              superseded.failureReason = "superseded-at-command-post";
            }
            generalCommandQueue.splice(index, 1);
          }
        }
        generalCommandQueue.push({
          team: century.team,
          receiverId: century.id,
          packet,
          targetEstimate
        });
        const receiptRecord = {
          serial,
          command: command.command,
          posture: command.posture,
          zone: command.zone || null,
          teamScope,
          status: "queued",
          issuedAt: simTime,
          dispatchedAt: null,
          expectedReturnAt: null,
          returnedAt: null
        };
        general.brain.receiptHistory.set(
          generalReceiptKey(century.id, command.command, serial),
          receiptRecord
        );
        general.brain.orderReceipts.set(century.id, receiptRecord);
        const familyReceipts = generalCommandFamily(command.command) === "posture" ? general.brain.postureReceipts : general.brain.zoneReceipts;
        familyReceipts.set(century.id, receiptRecord);
        if (command.command === "posture") {
          friendlyTrack.intendedPosture = command.posture;
        } else if (command.command === "set-zone") {
          friendlyTrack.intendedZoneActive = true;
          friendlyTrack.intendedZone = command.zone ? { ...command.zone } : null;
        } else if (command.command === "clear-zone") {
          friendlyTrack.intendedZoneActive = false;
          friendlyTrack.intendedZone = null;
        }
      }
      for (const team of Object.keys(serialByTeam)) {
        const general = generalBrains.get(team);
        if (!general) continue;
        general.brain.ordersIssued++;
        general.brain.lastOrderAt = simTime;
        if (command.command === "posture" && teamScope) {
          general.brain.intent = command.posture;
          general.brain.lastOrderedPosture = command.posture;
        }
        if (command.command === "set-zone") general.brain.zoneIssuedAt = simTime;
        if (command.command === "set-zone" && teamScope) {
          general.brain.zoneActive = true;
          general.brain.lastZoneIntent = command.zone ? { ...command.zone } : null;
        }
        if (command.command === "clear-zone" && teamScope) {
          general.brain.zoneActive = false;
          general.brain.lastZoneIntent = null;
        }
      }
      const serialValues = Object.values(serialByTeam);
      const receipt = deepFreeze({
        serial: serialValues.length === 1 ? serialValues[0] : null,
        serialByTeam,
        command: command.command,
        recipients: affected.map((century) => century.id),
        teamScope,
        issuedAt: simTime
      });
      emitObserver("general-command-issued", receipt);
      return receipt;
    }
    function issuePosture(scope, posture) {
      if (!postureIsValid(posture)) {
        throw new RangeError(`posture must be one of: ${POSTURES.join(", ")}`);
      }
      return enqueueGeneralCommand(scope, { command: "posture", posture });
    }
    function setHoldZone(scope, zone) {
      if (!zone || !Number.isFinite(zone.x) || !Number.isFinite(zone.z)) {
        throw new TypeError("setHoldZone expects finite { x, z, radius? }");
      }
      const radiusValue = zone.radius == null ? TUNING.hardZoneDefaultRadius : Number(zone.radius);
      if (!Number.isFinite(radiusValue)) {
        throw new TypeError("setHoldZone radius must be finite when supplied");
      }
      const radius = clamp(radiusValue, 4, 32);
      const frozenZone = deepFreeze({
        x: clamp(Number(zone.x), -TUNING.battlefieldHalfWidth, TUNING.battlefieldHalfWidth),
        z: clamp(Number(zone.z), -TUNING.battlefieldHalfDepth, TUNING.battlefieldHalfDepth),
        radius,
        enabled: zone.enabled !== false,
        issuedAt: simTime
      });
      return enqueueGeneralCommand(scope, { command: "set-zone", zone: frozenZone });
    }
    function clearHoldZone(scope) {
      return enqueueGeneralCommand(scope, { command: "clear-zone" });
    }
    function setPaused(paused) {
      config.paused = Boolean(paused);
      return config.paused;
    }
    function setTimeScale(scale) {
      if (!Number.isFinite(scale)) throw new TypeError("time scale must be finite");
      config.timeScale = clamp(Number(scale), 0.1, 8);
      return config.timeScale;
    }
    function setPresentation(options2 = {}) {
      if ("showCognition" in options2) config.showCognition = Boolean(options2.showCognition);
      if ("showMessages" in options2) config.showMessages = Boolean(options2.showMessages);
      return deepFreeze({
        showCognition: config.showCognition,
        showMessages: config.showMessages
      });
    }
    function reset(options2 = {}) {
      if (Number.isFinite(options2)) options2 = { seed: Number(options2) };
      if (Number.isFinite(options2.seed)) config.seed = Number(options2.seed) >>> 0;
      if (Number.isFinite(options2.perCentury)) {
        config.perCentury = clamp(Math.round(Number(options2.perCentury)), 12, 100);
      }
      if (options2 && Object.prototype.hasOwnProperty.call(options2, "unitProfiles")) {
        config.unitProfiles = prepareUnitProfileMap(options2.unitProfiles || {});
      }
      if (options2 && Object.prototype.hasOwnProperty.call(options2, "generalAI")) {
        const option = options2.generalAI;
        config.generalAIBlue = Boolean(option === true || option?.[TEAM.BLUE]);
        config.generalAIRed = Boolean(option === true || option?.[TEAM.RED]);
      }
      initializeBattlefield();
      return observe();
    }
    function runSeconds(seconds, dt = TUNING.fixedDt) {
      if (!Number.isFinite(seconds) || seconds < 0) {
        throw new RangeError("runSeconds(seconds) expects a finite non-negative duration");
      }
      if (!Number.isFinite(dt) || dt <= 0 || dt > 0.25) {
        throw new RangeError("runSeconds dt expects 0 < finite dt <= 0.25");
      }
      const end = simTime + seconds;
      while (simTime + 1e-10 < end) step(Math.min(dt, end - simTime));
      return observe();
    }
    function observerEventsSince(index = 0) {
      const numericIndex = Number(index);
      const requested = Number.isFinite(numericIndex) ? Math.max(0, Math.floor(numericIndex)) : 0;
      const oldestIndex = observerEvents[0]?.index ?? observerEventCursor;
      const safeIndex = clamp(requested, oldestIndex, observerEventCursor);
      return deepFreeze({
        nextIndex: observerEventCursor,
        dropped: Math.max(0, oldestIndex - requested),
        events: observerEvents.slice(safeIndex - oldestIndex)
      });
    }
    function inspectActor(actorId) {
      const actor = bodyById.get(actorId);
      if (!actor?.profile || !actor.capabilities) return null;
      return detachedFrozen({
        id: actor.id,
        kind: actor.kind,
        team: actor.team,
        centuryId: actor.centuryId,
        alive: actor.alive,
        profile: actor.profile,
        capabilities: actor.capabilities,
        ratings: actor.ratings,
        condition: {
          hp: actor.hp,
          maxHp: actor.maxHp,
          morale: actor.morale,
          fatigue: actor.fatigue,
          effects: actor.condition.effects
        }
      });
    }
    function rosterSummary() {
      return detachedFrozen({
        schemaVersion: 1,
        centuries: Object.fromEntries(centuries.map((century) => [century.id, {
          team: century.team,
          index: century.index,
          equipment: century.deploymentProfile.equipment,
          training: century.deploymentProfile.training,
          experience: century.deploymentProfile.experience,
          capabilities: century.capabilitySummary,
          centurion: century.centurion.ratings
        }]))
      });
    }
    function debugSetCommunicationEnabled(centuryId, enabled) {
      const century = centuryById(centuryId);
      if (!century) throw new RangeError(`Unknown century: ${String(centuryId)}`);
      century.muted = !enabled;
      if (century.muted) {
        century.brain.inbox.length = 0;
        century.brain.commandInbox.length = 0;
      }
      return !century.muted;
    }
    function debugSetCondition(actorId, values = {}) {
      const actor = bodyById.get(actorId);
      if (!actor?.condition) throw new RangeError(`Unknown actor: ${String(actorId)}`);
      if ("hp" in values) {
        if (!Number.isFinite(values.hp)) throw new TypeError("debug condition hp must be finite");
        actor.hp = clamp(Number(values.hp), 0, actor.maxHp);
      }
      if ("morale" in values) {
        if (!Number.isFinite(values.morale)) {
          throw new TypeError("debug condition morale must be finite");
        }
        actor.morale = clamp(Number(values.morale), 0, 1);
      }
      if ("fatigue" in values) {
        if (!Number.isFinite(values.fatigue)) {
          throw new TypeError("debug condition fatigue must be finite");
        }
        actor.fatigue = clamp(Number(values.fatigue), 0, 1);
      }
      if (actor.alive && actor.hp <= 0) killBody(actor, null);
      return inspectActor(actorId)?.condition || null;
    }
    function debugTeleportCentury(centuryId, x, z, options2 = {}) {
      const century = centuryById(centuryId);
      if (!century) throw new RangeError(`Unknown century: ${String(centuryId)}`);
      if (!Number.isFinite(x) || !Number.isFinite(z)) {
        throw new TypeError("debug.teleportCentury expects finite x and z");
      }
      const center = currentCenturyCenter(century);
      const dx = clamp(
        Number(x),
        -TUNING.battlefieldHalfWidth + 4,
        TUNING.battlefieldHalfWidth - 4
      ) - center.x;
      const dz = clamp(
        Number(z),
        -TUNING.battlefieldHalfDepth + 4,
        TUNING.battlefieldHalfDepth - 4
      ) - center.z;
      century.centurion.x += dx;
      century.centurion.z += dz;
      century.centurion.vx = 0;
      century.centurion.vz = 0;
      for (const soldierId of century.soldierIds) {
        const soldier = bodyById.get(soldierId);
        if (!soldier?.alive) continue;
        soldier.x += dx;
        soldier.z += dz;
        soldier.vx = 0;
        soldier.vz = 0;
        soldier.plannedVx = 0;
        soldier.plannedVz = 0;
        soldier.guideTrack = soldier.guideTrack ? { ...soldier.guideTrack, x: soldier.guideTrack.x + dx, z: soldier.guideTrack.z + dz } : null;
        soldier.publicGuideCue = null;
        soldier.nextGuideCue = null;
        soldier.targetMemory = null;
      }
      if (options2.moveFallback !== false) {
        century.fallbackAnchor = Object.freeze({ x: center.x + dx, z: center.z + dz });
      }
      century.brain.orderT = 0;
      spatial = null;
      emitObserver("debug-teleport", { centuryId, x: center.x + dx, z: center.z + dz });
      return deepFreeze({ x: center.x + dx, z: center.z + dz });
    }
    function debugKnowledge(centuryId) {
      const century = centuryById(centuryId);
      if (!century) throw new RangeError(`Unknown century: ${String(centuryId)}`);
      const brain = century.brain;
      return deepFreeze({
        centuryId,
        state: brain.state,
        enemyTracks: [...brain.enemyTracks.values()].map((track) => ({ ...track })),
        individualContacts: brain.individualContacts.map((contact) => ({ ...contact })),
        allyTrack: brain.allyTrack ? { ...brain.allyTrack } : null,
        inbox: brain.inbox.map((packet) => JSON.parse(JSON.stringify(packet))),
        commandInbox: brain.commandInbox.map((packet) => JSON.parse(JSON.stringify(packet))),
        plan: JSON.parse(JSON.stringify(brain.plan)),
        abortedMission: brain.abortedMission ? JSON.parse(JSON.stringify(brain.abortedMission)) : null,
        standard: { ...brain.standard },
        signalMemory: {
          fixUntil: brain.fixSignalUntil,
          fixEpoch: brain.fixSignalEpoch,
          fixEvidenceAt: brain.fixSignalEvidenceAt,
          feintUntil: brain.feintSignalUntil,
          feintEpoch: brain.feintSignalEpoch,
          feintEvidenceAt: brain.feintSignalEvidenceAt,
          abortNotice: brain.allyAbortNotice ? { ...brain.allyAbortNotice } : null
        },
        supportRequest: brain.supportRequest ? { ...brain.supportRequest } : null,
        flankThreat: brain.flankThreat ? { ...brain.flankThreat } : null,
        doctrinePriority: brain.doctrinePriority,
        lineHeading: brain.lineHeading,
        lineIntegrityBand: brain.lineIntegrityBand,
        zonePhase: brain.zonePhase,
        centurionRunnerLease: brain.centurionRunnerLease ? { ...brain.centurionRunnerLease } : null,
        communicationState: brain.communicationState
      });
    }
    function debugGeneralKnowledge(team) {
      if (!TEAMS.includes(team)) throw new RangeError(`Unknown general team: ${String(team)}`);
      const general = generalBrains.get(team);
      if (!general) return null;
      const brain = general.brain;
      return detachedFrozen({
        team,
        state: brain.state,
        intent: brain.intent,
        reason: brain.reason,
        traits: brain.traits,
        nextDecisionAt: brain.nextDecisionAt,
        lastDecisionAt: brain.lastDecisionAt,
        lastOrderAt: brain.lastOrderAt,
        decisionSerial: brain.decisionSerial,
        deceptionCommittedAt: brain.deceptionCommittedAt,
        deceptionSpent: brain.deceptionSpent,
        zoneActive: brain.zoneActive,
        lastZoneIntent: brain.lastZoneIntent,
        friendlyTracks: [...brain.friendlyTracks.values()],
        enemyTracks: [...brain.enemyTracks.values()],
        orderReceipts: [...brain.orderReceipts.entries()].map(([centuryId, receipt]) => ({
          centuryId,
          ...receipt
        })),
        postureReceipts: [...brain.postureReceipts.entries()].map(([centuryId, receipt]) => ({
          centuryId,
          ...receipt
        })),
        zoneReceipts: [...brain.zoneReceipts.entries()].map(([centuryId, receipt]) => ({
          centuryId,
          ...receipt
        })),
        receiptHistory: [...brain.receiptHistory.entries()].map(([receiptKey, receipt]) => ({
          receiptKey,
          ...receipt
        })),
        runnerLeases: [...brain.runnerLeases.entries()].map(([centuryId, lease]) => ({
          centuryId,
          ...lease
        }))
      });
    }
    function debugPercept(agentId) {
      if (agentId === `general-${TEAM.BLUE}` || agentId === `general-${TEAM.RED}`) {
        return senseGeneral(generalBrains.get(agentId.slice("general-".length)));
      }
      const body = bodyById.get(agentId);
      if (!body?.alive) return null;
      if (body.kind === "centurion") return senseCenturion(centuryById(body.centuryId));
      return senseSoldier(body);
    }
    function debugDispatch(senderId, kind = MESSAGE_KIND.LINE_REPORT, payload = {}) {
      const century = centuryById(senderId);
      if (!century) throw new RangeError(`Unknown century: ${String(senderId)}`);
      if (!Object.values(MESSAGE_KIND).includes(kind)) {
        throw new RangeError(`Unknown message kind: ${String(kind)}`);
      }
      return dispatchCenturionMessage(century, kind, payload);
    }
    function architectureAudit() {
      const doctrines = soldiers.map((soldier) => soldier.doctrine);
      const brains = centuries.map((century) => century.brain);
      const generalBrainList = [...generalBrains.values()].map((general) => general.brain);
      const actors = [...bodyById.values()].filter((actor) => actor.profile && actor.capabilities && actor.condition);
      const profiles = actors.map((actor) => actor.profile);
      const capabilities = actors.map((actor) => actor.capabilities);
      const conditions = actors.map((actor) => actor.condition);
      const conditionEffects = conditions.map((condition) => condition.effects);
      const snapshot = observe();
      const fullyFrozen = (value) => {
        if (!value || typeof value !== "object") return true;
        return Object.isFrozen(value) && Object.values(value).every(fullyFrozen);
      };
      const forbiddenPerceptKey = (value) => {
        if (!value || typeof value !== "object") return false;
        if (Object.keys(value).some((key) => ["id", "centuryId", "sensorClusterKey"].includes(key))) {
          return true;
        }
        return Object.values(value).some(forbiddenPerceptKey);
      };
      const privatePerceptKey = (value) => {
        if (!value || typeof value !== "object") return false;
        if (Object.keys(value).some((key) => [
          "profile",
          "profileId",
          "capabilities",
          "condition",
          "hp",
          "maxHp",
          "morale",
          "fatigue",
          "armor",
          "attack",
          "defense",
          "damage",
          "reach"
        ].includes(key))) return true;
        return Object.values(value).some(privatePerceptKey);
      };
      const sampledPercepts = [
        soldiers.find((soldier) => soldier.alive),
        centuries.find((century) => century.centurion.alive)?.centurion
      ].filter(Boolean).map((body) => body.kind === "centurion" ? senseCenturion(centuryById(body.centuryId)) : senseSoldier(body));
      for (const general of generalBrains.values()) sampledPercepts.push(senseGeneral(general));
      return deepFreeze({
        centuryCount: centuries.length,
        soldierCount: soldiers.length,
        uniqueBrains: new Set(brains).size,
        uniqueInboxes: new Set(brains.map((brain) => brain.inbox)).size,
        uniqueEnemyTrackMaps: new Set(brains.map((brain) => brain.enemyTracks)).size,
        uniqueDoctrines: new Set(doctrines).size,
        frozenDoctrines: doctrines.filter(Object.isFrozen).length,
        uniqueCommandInboxes: new Set(brains.map((brain) => brain.commandInbox)).size,
        uniquePlanObjects: new Set(brains.map((brain) => brain.plan)).size,
        generalCount: generalBrainList.length,
        uniqueGeneralBrains: new Set(generalBrainList).size,
        uniqueGeneralFriendlyTrackMaps: new Set(
          generalBrainList.map((brain) => brain.friendlyTracks)
        ).size,
        uniqueGeneralEnemyTrackMaps: new Set(
          generalBrainList.map((brain) => brain.enemyTracks)
        ).size,
        uniqueGeneralReceiptMaps: new Set(
          generalBrainList.map((brain) => brain.orderReceipts)
        ).size,
        uniqueGeneralPostureReceiptMaps: new Set(
          generalBrainList.map((brain) => brain.postureReceipts)
        ).size,
        uniqueGeneralZoneReceiptMaps: new Set(
          generalBrainList.map((brain) => brain.zoneReceipts)
        ).size,
        uniqueGeneralReceiptHistoryMaps: new Set(
          generalBrainList.map((brain) => brain.receiptHistory)
        ).size,
        uniqueGeneralRunnerLeaseMaps: new Set(
          generalBrainList.map((brain) => brain.runnerLeases)
        ).size,
        actorCount: actors.length,
        uniqueProfiles: new Set(profiles).size,
        frozenProfiles: profiles.filter(fullyFrozen).length,
        uniqueCapabilities: new Set(capabilities).size,
        frozenCapabilities: capabilities.filter(fullyFrozen).length,
        uniqueConditions: new Set(conditions).size,
        sharedMutableStatObjects: actors.length - new Set(conditions).size,
        uniqueConditionEffects: new Set(conditionEffects).size,
        sharedMutableEffectArrays: actors.length - new Set(conditionEffects).size,
        validMoraleThresholds: capabilities.every((capability) => capability.morale.routeThreshold < capability.morale.rallyThreshold),
        frozenObserverProjection: fullyFrozen(snapshot),
        sampledPerceptsFrozen: sampledPercepts.every(fullyFrozen),
        sampledPerceptsContainEngineIds: sampledPercepts.some(forbiddenPerceptKey),
        sampledPerceptsContainPrivateFields: sampledPercepts.some(privatePerceptKey),
        activePhysicalRunners: couriers.filter((courier) => courier.kind === "runner").length
      });
    }
    initializeBattlefield();
    const debug = Object.freeze({
      setCommunicationEnabled: debugSetCommunicationEnabled,
      setCondition: debugSetCondition,
      teleportCentury: debugTeleportCentury,
      knowledge: debugKnowledge,
      generalKnowledge: debugGeneralKnowledge,
      percept: debugPercept,
      dispatch: debugDispatch,
      architectureAudit
    });
    return Object.freeze({
      version: VERSION,
      step,
      runSeconds,
      reset,
      observe,
      diagnostics,
      generalSituation,
      setGeneralAI,
      issuePosture,
      setHoldZone,
      clearHoldZone,
      setPaused,
      setTimeScale,
      setPresentation,
      observerEventsSince,
      inspectActor,
      rosterSummary,
      debug,
      get simTime() {
        return simTime;
      },
      get tick() {
        return tick;
      },
      get paused() {
        return config.paused;
      },
      get timeScale() {
        return config.timeScale;
      },
      get result() {
        return matchResult;
      }
    });
  }

  // src/renderer.js
  var clamp2 = (value, min, max) => Math.max(min, Math.min(max, value));
  var PALETTE = Object.freeze({
    blue: "#58a6ff",
    blueDark: "#173f66",
    red: "#ff6b62",
    redDark: "#672c2a",
    gold: "#efc66a",
    ink: "#071015",
    ground: "#263024",
    groundFar: "#151d18",
    grid: "rgba(225,232,205,.075)",
    corpse: "#5b4238"
  });
  function createBattlefieldRenderer(canvas2) {
    if (!canvas2) throw new Error("createBattlefieldRenderer requires a canvas");
    const ctx = canvas2.getContext("2d", { alpha: false });
    const camera = {
      target: { x: 0, y: 0, z: 0 },
      distance: 138,
      yaw: -0.16,
      pitch: 0.88,
      eye: { x: 0, y: 0, z: 0 },
      forward: { x: 0, y: 0, z: 1 },
      right: { x: 1, y: 0, z: 0 },
      up: { x: 0, y: 1, z: 0 },
      focalLength: 800
    };
    let width = 1;
    let height = 1;
    let selectedCentury = "blue-1";
    let uiMode = "gameplay";
    let placingZone = false;
    let groundClickHandler = null;
    let drag = null;
    const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
    const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
    const cross = (a, b) => ({
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    });
    const normalize = (vector) => {
      const magnitude = Math.hypot(vector.x, vector.y, vector.z) || 1;
      return { x: vector.x / magnitude, y: vector.y / magnitude, z: vector.z / magnitude };
    };
    function resize() {
      const ratio = Math.min(2, globalThis.devicePixelRatio || 1);
      width = globalThis.innerWidth || 1280;
      height = globalThis.innerHeight || 720;
      canvas2.width = Math.floor(width * ratio);
      canvas2.height = Math.floor(height * ratio);
      canvas2.style.width = `${width}px`;
      canvas2.style.height = `${height}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    function updateCamera() {
      const horizontal = Math.cos(camera.pitch);
      camera.eye.x = camera.target.x + Math.sin(camera.yaw) * horizontal * camera.distance;
      camera.eye.z = camera.target.z + Math.cos(camera.yaw) * horizontal * camera.distance;
      camera.eye.y = camera.target.y + Math.sin(camera.pitch) * camera.distance;
      camera.forward = normalize(sub(camera.target, camera.eye));
      camera.right = normalize(cross(camera.forward, { x: 0, y: 1, z: 0 }));
      camera.up = normalize(cross(camera.right, camera.forward));
      camera.focalLength = Math.min(width, height) * 1.03;
    }
    function project(x, y, z) {
      if (![x, y, z].every(Number.isFinite)) return null;
      const relative = { x: x - camera.eye.x, y: y - camera.eye.y, z: z - camera.eye.z };
      const depth = dot(relative, camera.forward);
      if (!Number.isFinite(depth) || depth < 0.25) return null;
      const scale = camera.focalLength / depth;
      const result = {
        x: width * 0.5 + dot(relative, camera.right) * scale,
        y: height * 0.51 - dot(relative, camera.up) * scale,
        scale,
        depth
      };
      return [result.x, result.y, result.scale].every(Number.isFinite) ? result : null;
    }
    function screenToGround(screenX, screenY) {
      updateCamera();
      const horizontal = (screenX - width * 0.5) / camera.focalLength;
      const vertical = (height * 0.51 - screenY) / camera.focalLength;
      const ray = {
        x: camera.forward.x + camera.right.x * horizontal + camera.up.x * vertical,
        y: camera.forward.y + camera.right.y * horizontal + camera.up.y * vertical,
        z: camera.forward.z + camera.right.z * horizontal + camera.up.z * vertical
      };
      if (Math.abs(ray.y) < 1e-6) return null;
      const t = -camera.eye.y / ray.y;
      if (t <= 0) return null;
      return { x: camera.eye.x + ray.x * t, z: camera.eye.z + ray.z * t };
    }
    function pathGroundCircle(x, z, radius, y = 0.025) {
      let began = false;
      ctx.beginPath();
      for (let index = 0; index <= 48; index++) {
        const angle = index / 48 * Math.PI * 2;
        const point = project(x + Math.cos(angle) * radius, y, z + Math.sin(angle) * radius);
        if (!point) continue;
        if (!began) {
          ctx.moveTo(point.x, point.y);
          began = true;
        } else ctx.lineTo(point.x, point.y);
      }
      ctx.closePath();
      return began;
    }
    function drawGround() {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, PALETTE.groundFar);
      gradient.addColorStop(1, PALETTE.ground);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      ctx.save();
      for (let x = -65; x <= 65; x += 5) {
        const a = project(x, 0, -72);
        const b = project(x, 0, 72);
        if (!a || !b) continue;
        ctx.strokeStyle = x === 0 ? "rgba(239,198,106,.22)" : PALETTE.grid;
        ctx.lineWidth = x === 0 ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      for (let z = -70; z <= 70; z += 5) {
        const a = project(-68, 0, z);
        const b = project(68, 0, z);
        if (!a || !b) continue;
        ctx.strokeStyle = z === 0 ? "rgba(239,198,106,.36)" : PALETTE.grid;
        ctx.lineWidth = z === 0 ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      const corners = [[-68, -72], [68, -72], [68, 72], [-68, 72], [-68, -72]];
      ctx.strokeStyle = "rgba(239,198,106,.24)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      corners.forEach(([x, z], index) => {
        const point = project(x, 0.01, z);
        if (!point) return;
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
      ctx.restore();
    }
    function drawHoldZones(snapshot) {
      for (const century of snapshot.centuries) {
        if (uiMode === "gameplay" && century.team !== "blue") continue;
        if (!century.holdZone?.enabled) continue;
        const selected = century.id === selectedCentury;
        ctx.save();
        if (pathGroundCircle(century.holdZone.x, century.holdZone.z, century.holdZone.radius)) {
          ctx.fillStyle = century.team === "blue" ? `rgba(88,166,255,${selected ? 0.14 : 0.075})` : `rgba(255,107,98,${selected ? 0.14 : 0.075})`;
          ctx.strokeStyle = century.team === "blue" ? `rgba(88,166,255,${selected ? 0.9 : 0.52})` : `rgba(255,107,98,${selected ? 0.9 : 0.52})`;
          ctx.lineWidth = selected ? 2.5 : 1.4;
          ctx.setLineDash([8, 6]);
          ctx.fill();
          ctx.stroke();
        }
        const center = project(century.holdZone.x, 0.07, century.holdZone.z);
        if (center) {
          ctx.setLineDash([]);
          ctx.fillStyle = PALETTE.gold;
          ctx.font = "700 10px ui-monospace, monospace";
          ctx.textAlign = "center";
          ctx.fillText(`${century.standard} ZONE`, center.x, center.y - 5);
        }
        ctx.restore();
      }
    }
    function drawGeneralPosts() {
      for (const post of [{ team: "blue", x: 0, z: -54 }, { team: "red", x: 0, z: 54 }]) {
        if (uiMode === "gameplay" && post.team !== "blue") continue;
        const point = project(post.x, 0.08, post.z);
        if (!point) continue;
        ctx.save();
        ctx.fillStyle = PALETTE[post.team];
        ctx.strokeStyle = "rgba(239,198,106,.7)";
        ctx.lineWidth = 1.5;
        const size = clamp2(point.scale * 0.75, 6, 18);
        ctx.beginPath();
        ctx.moveTo(point.x, point.y - size);
        ctx.lineTo(point.x + size * 0.75, point.y);
        ctx.lineTo(point.x, point.y + size);
        ctx.lineTo(point.x - size * 0.75, point.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#e7d69e";
        ctx.font = "800 8px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${post.team.toUpperCase()} GENERAL`, point.x, point.y + size + 10);
        ctx.restore();
      }
    }
    function drawTrack(track, team) {
      const point = project(track.x, 0.06, track.z);
      if (!point) return;
      const radius = clamp2((track.width || 5) * point.scale * 0.5, 5, 42);
      ctx.save();
      ctx.globalAlpha = clamp2(track.confidence, 0.12, 0.8);
      ctx.strokeStyle = team === "blue" ? "#9fd0ff" : "#ffb2ac";
      ctx.setLineDash([4, 5]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.font = "9px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        `${track.source.toUpperCase()} ${Math.round(track.confidence * 100)}%`,
        point.x,
        point.y - radius - 4
      );
      ctx.restore();
    }
    function drawIndividualContact(contact, team) {
      const point = project(contact.x, 0.08, contact.z);
      if (!point) return;
      const size = clamp2(point.scale * 0.32, 4, 10);
      ctx.save();
      ctx.globalAlpha = clamp2(contact.confidence, 0.18, 0.82);
      ctx.strokeStyle = team === "blue" ? "#9fd0ff" : "#ffb2ac";
      ctx.lineWidth = 1.4;
      if (contact.contactClass === "courier") {
        ctx.beginPath();
        ctx.moveTo(point.x, point.y - size);
        ctx.lineTo(point.x + size, point.y);
        ctx.lineTo(point.x, point.y + size);
        ctx.lineTo(point.x - size, point.y);
        ctx.closePath();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(point.x - size, point.y - size);
        ctx.lineTo(point.x + size, point.y + size);
        ctx.moveTo(point.x - size, point.y + size);
        ctx.lineTo(point.x + size, point.y - size);
        ctx.stroke();
      }
      ctx.fillStyle = ctx.strokeStyle;
      ctx.font = "8px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText(contact.contactClass.toUpperCase(), point.x, point.y - size - 3);
      ctx.restore();
    }
    function drawCognition(snapshot) {
      if (uiMode !== "debug" || !snapshot.config.showCognition) return;
      for (const century of snapshot.centuries) {
        for (const track of century.tracks) drawTrack(track, century.team);
        for (const contact of century.individualContacts) {
          drawIndividualContact(contact, century.team);
        }
      }
    }
    function drawFallen(snapshot) {
      for (const body of snapshot.fallenBodies) {
        if (uiMode === "gameplay" && body.team !== "blue") continue;
        const point = project(body.x, 0.035, body.z);
        if (!point) continue;
        const radius = clamp2(point.scale * 0.23, 2.2, 7);
        ctx.save();
        ctx.strokeStyle = body.team === "blue" ? "#315f80" : "#803e3b";
        ctx.lineWidth = Math.max(1.2, radius * 0.35);
        ctx.beginPath();
        ctx.moveTo(point.x - radius, point.y - radius * 0.45);
        ctx.lineTo(point.x + radius, point.y + radius * 0.45);
        ctx.moveTo(point.x - radius, point.y + radius * 0.45);
        ctx.lineTo(point.x + radius, point.y - radius * 0.45);
        ctx.stroke();
        ctx.restore();
      }
    }
    function drawSoldier(soldier) {
      const foot = project(soldier.x, 0, soldier.z);
      const head = project(soldier.x, 0.78, soldier.z);
      if (!foot || !head) return;
      const selected = soldier.centuryId === selectedCentury;
      const color = PALETTE[soldier.team];
      const dark = PALETTE[`${soldier.team}Dark`];
      const radius = clamp2(foot.scale * 0.25, 2.1, 7.5);
      const forward = { x: Math.sin(soldier.heading), z: Math.cos(soldier.heading) };
      const tip = project(soldier.x + forward.x * 0.45, 0.1, soldier.z + forward.z * 0.45);
      ctx.save();
      ctx.fillStyle = dark;
      ctx.strokeStyle = selected ? "#f6dc93" : color;
      ctx.lineWidth = selected ? 1.6 : 1;
      ctx.beginPath();
      ctx.arc(foot.x, foot.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (tip) {
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, radius * 0.28);
        ctx.beginPath();
        ctx.moveTo(foot.x, foot.y);
        ctx.lineTo(tip.x, tip.y);
        ctx.stroke();
      }
      if (soldier.state === "route") {
        ctx.strokeStyle = "#f3cf77";
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.arc(foot.x, foot.y, radius + 2.5, 0, Math.PI * 2);
        ctx.stroke();
      } else if (soldier.combatState === "strike") {
        ctx.strokeStyle = "#fff0b6";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(head.x, head.y, radius * 0.55, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    function drawCenturion(centurion, showSignals) {
      const base = project(centurion.x, 0, centurion.z);
      const top = project(centurion.x, 2.15, centurion.z);
      if (!base || !top) return;
      const selected = centurion.centuryId === selectedCentury;
      const color = PALETTE[centurion.team];
      ctx.save();
      ctx.strokeStyle = selected ? "#ffe9a9" : "#d7c697";
      ctx.lineWidth = selected ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(base.x, base.y);
      ctx.lineTo(top.x, top.y);
      ctx.stroke();
      const bannerWidth = clamp2(top.scale * 0.68, 7, 24);
      const bannerHeight = bannerWidth * 0.52;
      const signalRaised = showSignals && centurion.standardCode && centurion.standardCode !== "none";
      ctx.fillStyle = signalRaised ? PALETTE.gold : color;
      ctx.strokeStyle = "#f2dd9b";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(top.x + bannerWidth, top.y + bannerHeight * 0.2);
      ctx.lineTo(top.x + bannerWidth * 0.78, top.y + bannerHeight);
      ctx.lineTo(top.x, top.y + bannerHeight * 0.82);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (signalRaised) {
        ctx.fillStyle = "#171007";
        ctx.font = `800 ${clamp2(bannerHeight * 0.46, 6, 10)}px ui-monospace, monospace`;
        ctx.textAlign = "center";
        ctx.fillText(
          centurion.standardCode.toUpperCase(),
          top.x + bannerWidth * 0.46,
          top.y + bannerHeight * 0.65
        );
      }
      if (!centurion.alive) {
        ctx.strokeStyle = "#160b08";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(base.x - 7, base.y - 7);
        ctx.lineTo(base.x + 7, base.y + 7);
        ctx.stroke();
      }
      ctx.restore();
    }
    function drawCouriers(snapshot) {
      for (const courier of snapshot.couriers) {
        if (uiMode === "gameplay" && courier.team !== "blue") continue;
        const point = project(courier.x, 0.12, courier.z);
        if (!point) continue;
        ctx.save();
        ctx.fillStyle = PALETTE.gold;
        ctx.strokeStyle = "#3c2b12";
        ctx.lineWidth = 1;
        const size = clamp2(point.scale * 0.24, 3, 8);
        ctx.beginPath();
        ctx.moveTo(point.x, point.y - size);
        ctx.lineTo(point.x + size, point.y);
        ctx.lineTo(point.x, point.y + size);
        ctx.lineTo(point.x - size, point.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
    function drawCenturyLabels(snapshot) {
      for (const century of snapshot.centuries) {
        if (uiMode === "gameplay" && century.team !== "blue") continue;
        const point = project(century.center.x, 2.7, century.center.z);
        if (!point) continue;
        const selected = century.id === selectedCentury;
        const label = uiMode === "debug" ? `${century.standard} \xB7 ${century.state.toUpperCase()} \xB7 ${century.tacticalRole.toUpperCase()} \xB7 ${century.alive}/${century.initialStrength}` : century.standard;
        ctx.save();
        ctx.font = `${selected ? 800 : 650} 11px ui-monospace, monospace`;
        ctx.textAlign = "center";
        const metrics = ctx.measureText(label);
        ctx.fillStyle = "rgba(4,10,13,.78)";
        ctx.fillRect(point.x - metrics.width / 2 - 6, point.y - 11, metrics.width + 12, 17);
        ctx.fillStyle = selected ? "#ffe5a1" : PALETTE[century.team];
        ctx.fillText(label, point.x, point.y + 1);
        if (selected && pathGroundCircle(
          century.center.x,
          century.center.z,
          Math.max(3.5, Math.sqrt(century.initialStrength) * 0.78),
          0.04
        )) {
          ctx.strokeStyle = "rgba(255,229,161,.5)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 4]);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    function drawCombatFlashes(snapshot) {
      for (const event of snapshot.recentCombatEvents) {
        const age = snapshot.simTime - event.t;
        if (age < 0 || age > 0.32 || event.event !== "hit") continue;
        const target = snapshot.soldiers.find((soldier) => soldier.id === event.targetId) || snapshot.centurions.find((centurion) => centurion.id === event.targetId);
        if (!target) continue;
        if (uiMode === "gameplay" && target.team !== "blue") continue;
        const point = project(target.x, 0.5, target.z);
        if (!point) continue;
        const pulse = 1 - age / 0.32;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = "#fff0ad";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4 + 10 * (1 - pulse), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    function drawGameplayContacts(situation) {
      if (uiMode !== "gameplay" || !Array.isArray(situation?.contacts)) return;
      for (let index = 0; index < situation.contacts.length; index++) {
        const contact = situation.contacts[index];
        if (contact?.directlyVisible) continue;
        if (!Number.isFinite(contact?.x) || !Number.isFinite(contact?.z)) continue;
        const point = project(contact.x, 0.12, contact.z);
        if (!point) continue;
        const radiusMeters = contact.strengthBand === "many" ? 11 : contact.strengthBand === "body" ? 7 : 4.5;
        const radius = clamp2(radiusMeters * point.scale, 7, 34);
        const confidence = clamp2(Number(contact.confidence) || 0, 0.12, 0.85);
        const mark = /^[A-Z0-9][A-Z0-9 .-]{0,15}$/i.test(String(contact.recognizedMark || "")) ? String(contact.recognizedMark).toUpperCase() : `CONTACT ${String.fromCharCode(65 + index)}`;
        ctx.save();
        ctx.globalAlpha = confidence;
        ctx.strokeStyle = PALETTE.red;
        ctx.fillStyle = "rgba(255,107,98,.07)";
        ctx.lineWidth = 1.8;
        ctx.setLineDash(contact.ageBand === "stale" ? [3, 7] : [7, 5]);
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#ffd1cc";
        ctx.font = "750 9px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(
          `${mark} \xB7 ${String(contact.strengthBand || "unknown").toUpperCase()}`,
          point.x,
          point.y - radius - 5
        );
        ctx.restore();
      }
    }
    function drawObservedEnemy(body) {
      const base = project(body.x, 0, body.z);
      if (!base) return;
      const color = PALETTE.red;
      const dark = PALETTE.redDark;
      const radius = clamp2(base.scale * 0.25, 2.1, 7.5);
      ctx.save();
      if (body.visualClass === "standard") {
        const top = project(body.x, 2.05, body.z);
        if (top) {
          ctx.strokeStyle = "#d7c697";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(base.x, base.y);
          ctx.lineTo(top.x, top.y);
          ctx.stroke();
          const bannerWidth = clamp2(top.scale * 0.62, 7, 22);
          const bannerHeight = bannerWidth * 0.5;
          ctx.fillStyle = color;
          ctx.strokeStyle = "#f2dd9b";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(top.x, top.y);
          ctx.lineTo(top.x + bannerWidth, top.y + bannerHeight * 0.2);
          ctx.lineTo(top.x + bannerWidth * 0.78, top.y + bannerHeight);
          ctx.lineTo(top.x, top.y + bannerHeight * 0.82);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          if (/^[A-Z0-9][A-Z0-9 .-]{0,15}$/i.test(String(body.recognizedMark || ""))) {
            ctx.fillStyle = "#ffd1cc";
            ctx.font = "750 8px ui-monospace, monospace";
            ctx.textAlign = "center";
            ctx.fillText(
              String(body.recognizedMark).toUpperCase(),
              top.x + bannerWidth * 0.45,
              top.y - 4
            );
          }
        }
        ctx.restore();
        return;
      }
      if (body.visualClass === "runner") {
        const size = clamp2(base.scale * 0.24, 3, 8);
        ctx.fillStyle = dark;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(base.x, base.y - size);
        ctx.lineTo(base.x + size, base.y);
        ctx.lineTo(base.x, base.y + size);
        ctx.lineTo(base.x - size, base.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        return;
      }
      const forward = { x: Math.sin(body.heading), z: Math.cos(body.heading) };
      const tip = project(body.x + forward.x * 0.45, 0.1, body.z + forward.z * 0.45);
      ctx.fillStyle = dark;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(base.x, base.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (tip) {
        ctx.lineWidth = Math.max(1, radius * 0.28);
        ctx.beginPath();
        ctx.moveTo(base.x, base.y);
        ctx.lineTo(tip.x, tip.y);
        ctx.stroke();
      }
      ctx.restore();
    }
    function drawObservedEnemyRemains(situation) {
      if (uiMode !== "gameplay" || !Array.isArray(situation?.directSight?.remains)) return;
      for (const body of situation.directSight.remains) {
        if (!Number.isFinite(body?.x) || !Number.isFinite(body?.z)) continue;
        const point = project(body.x, 0.035, body.z);
        if (!point) continue;
        const radius = clamp2(point.scale * 0.23, 2.2, 7);
        ctx.save();
        ctx.strokeStyle = "#803e3b";
        ctx.lineWidth = Math.max(1.2, radius * 0.35);
        ctx.beginPath();
        ctx.moveTo(point.x - radius, point.y - radius * 0.45);
        ctx.lineTo(point.x + radius, point.y + radius * 0.45);
        ctx.moveTo(point.x - radius, point.y + radius * 0.45);
        ctx.lineTo(point.x + radius, point.y - radius * 0.45);
        ctx.stroke();
        ctx.restore();
      }
    }
    function render(snapshot, playerSituation = null) {
      updateCamera();
      drawGround();
      drawGeneralPosts();
      drawHoldZones(snapshot);
      drawCognition(snapshot);
      drawGameplayContacts(playerSituation);
      drawFallen(snapshot);
      drawObservedEnemyRemains(playerSituation);
      const drawables = [];
      for (const soldier of snapshot.soldiers) {
        if (!soldier.alive) continue;
        if (uiMode === "gameplay" && soldier.team !== "blue") continue;
        const p = project(soldier.x, 0, soldier.z);
        if (p) drawables.push({ depth: p.depth, kind: "soldier", value: soldier });
      }
      for (const centurion of snapshot.centurions) {
        if (uiMode === "gameplay" && centurion.team !== "blue") continue;
        const p = project(centurion.x, 0, centurion.z);
        if (p) drawables.push({ depth: p.depth, kind: "centurion", value: centurion });
      }
      if (uiMode === "gameplay" && Array.isArray(playerSituation?.directSight?.bodies)) {
        for (const body of playerSituation.directSight.bodies) {
          if (!Number.isFinite(body?.x) || !Number.isFinite(body?.z) || !["ranker", "standard", "runner"].includes(body.visualClass)) continue;
          const p = project(body.x, 0, body.z);
          if (p) drawables.push({ depth: p.depth, kind: "observed-enemy", value: body });
        }
      }
      drawables.sort((a, b) => b.depth - a.depth);
      for (const drawable of drawables) {
        if (drawable.kind === "soldier") drawSoldier(drawable.value);
        else if (drawable.kind === "centurion") {
          drawCenturion(drawable.value, snapshot.config.showMessages);
        } else {
          drawObservedEnemy(drawable.value);
        }
      }
      drawCouriers(snapshot);
      drawCombatFlashes(snapshot);
      drawCenturyLabels(snapshot);
      if (placingZone) {
        ctx.save();
        ctx.fillStyle = "rgba(239,198,106,.92)";
        ctx.font = "700 12px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText("CLICK THE BATTLEFIELD TO PLACE THE HOLD ZONE", width * 0.5, height - 24);
        ctx.restore();
      }
    }
    function setSelectedCentury(id) {
      selectedCentury = id;
    }
    function setUIMode(mode) {
      uiMode = mode === "debug" ? "debug" : "gameplay";
      return uiMode;
    }
    function setZonePlacementActive(active) {
      placingZone = Boolean(active);
      canvas2.classList.toggle("placing-zone", placingZone);
    }
    function onGroundClick(handler) {
      groundClickHandler = handler;
    }
    function resetCamera() {
      camera.target.x = 0;
      camera.target.z = 0;
      camera.distance = 138;
      camera.yaw = -0.16;
      camera.pitch = 0.88;
    }
    canvas2.addEventListener("pointerdown", (event) => {
      if (placingZone && event.button === 0) {
        const point = screenToGround(event.clientX, event.clientY);
        if (point) groundClickHandler?.(point);
        return;
      }
      drag = {
        x: event.clientX,
        y: event.clientY,
        yaw: camera.yaw,
        pitch: camera.pitch,
        targetX: camera.target.x,
        targetZ: camera.target.z,
        pan: event.button === 2 || event.shiftKey
      };
      canvas2.setPointerCapture?.(event.pointerId);
    });
    canvas2.addEventListener("pointermove", (event) => {
      if (!drag) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (drag.pan) {
        const scale = camera.distance / Math.max(260, Math.min(width, height));
        camera.target.x = drag.targetX - camera.right.x * dx * scale + camera.forward.x * dy * scale;
        camera.target.z = drag.targetZ - camera.right.z * dx * scale + camera.forward.z * dy * scale;
      } else {
        camera.yaw = drag.yaw - dx * 6e-3;
        camera.pitch = clamp2(drag.pitch + dy * 45e-4, 0.32, 1.34);
      }
    });
    const endDrag = () => {
      drag = null;
    };
    canvas2.addEventListener("pointerup", endDrag);
    canvas2.addEventListener("pointercancel", endDrag);
    canvas2.addEventListener("contextmenu", (event) => event.preventDefault());
    canvas2.addEventListener("wheel", (event) => {
      event.preventDefault();
      camera.distance = clamp2(camera.distance * Math.exp(event.deltaY * 1e-3), 24, 250);
    }, { passive: false });
    globalThis.addEventListener?.("resize", resize);
    resize();
    return Object.freeze({
      render,
      resize,
      project,
      screenToGround,
      setSelectedCentury,
      setUIMode,
      setZonePlacementActive,
      onGroundClick,
      resetCamera
    });
  }

  // src/ui.js
  var byId = (id) => document.getElementById(id);
  var setText = (id, value) => {
    const element = byId(id);
    if (element) element.textContent = String(value);
  };
  var setActive = (element, active) => element?.classList.toggle("active", Boolean(active));
  var titleCase = (value) => String(value || "\u2014").replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase());
  var UI_MODE = Object.freeze({ GAMEPLAY: "gameplay", DEBUG: "debug" });
  var FRIENDLY_CENTURIES = Object.freeze(["blue-1", "blue-2"]);
  var ENEMY_CARD_IDS = Object.freeze(["red-1", "red-2"]);
  var SAFE_BANDS = Object.freeze({
    strength: /* @__PURE__ */ new Set([
      "intact",
      "full",
      "effective",
      "strong",
      "many",
      "moderate",
      "body",
      "worn",
      "reduced",
      "attrited",
      "few",
      "weak",
      "depleted",
      "critical",
      "remnant",
      "fragmented",
      "destroyed",
      "unknown",
      "unreported"
    ]),
    status: /* @__PURE__ */ new Set([
      "deployed",
      "steady",
      "forming",
      "moving",
      "advancing",
      "holding",
      "engaged",
      "pressured",
      "retiring",
      "withdrawing",
      "disordered",
      "routing",
      "withdrawn",
      "destroyed",
      "unknown",
      "unreported"
    ]),
    order: /* @__PURE__ */ new Set([
      "none",
      "doctrine",
      "queued",
      "outbound",
      "dispatched",
      "in-transit",
      "delivered",
      "acknowledged",
      "overdue",
      "pending",
      "active",
      "complete",
      "failed",
      "unknown",
      "unreported"
    ]),
    confidence: /* @__PURE__ */ new Set([
      "none",
      "lost",
      "uncertain",
      "tentative",
      "probable",
      "credible",
      "reliable",
      "confirmed",
      "firm",
      "low",
      "medium",
      "high",
      "unknown"
    ]),
    age: /* @__PURE__ */ new Set(["live", "fresh", "recent", "aging", "stale", "lost", "unknown"]),
    range: /* @__PURE__ */ new Set([
      "close",
      "near",
      "medium",
      "middle",
      "mid",
      "far",
      "distant",
      "beyond-sight",
      "unknown"
    ]),
    bearing: /* @__PURE__ */ new Set([
      "left",
      "left-front",
      "front-left",
      "front",
      "right-front",
      "front-right",
      "right",
      "rear-left",
      "rear",
      "rear-right",
      "unknown"
    ]),
    threat: /* @__PURE__ */ new Set([
      "none",
      "low",
      "watch",
      "moderate",
      "medium",
      "high",
      "severe",
      "critical",
      "unknown"
    ]),
    source: /* @__PURE__ */ new Set([
      "doctrine",
      "visual",
      "vision",
      "sight",
      "signal",
      "runner",
      "courier",
      "report",
      "runner-report",
      "local",
      "combined",
      "unknown"
    ]),
    intent: /* @__PURE__ */ new Set([
      "aggressive",
      "advance",
      "hold",
      "stationary",
      "defensive-feint",
      "feint",
      "observe",
      "reserve",
      "withdraw",
      "unknown"
    ])
  });
  function normalizedBand(value) {
    return String(value ?? "").trim().toLowerCase().replaceAll("_", "-").replace(/\s+/g, "-");
  }
  function boundedBand(value, family, fallback = "UNKNOWN") {
    const normalized = normalizedBand(value);
    return SAFE_BANDS[family]?.has(normalized) ? normalized.replaceAll("-", " ").toUpperCase() : fallback;
  }
  function boundedConfidence(value) {
    const confidence = Number(value);
    if (!Number.isFinite(confidence)) return "CONFIDENCE UNKNOWN";
    if (confidence >= 0.8) return "FIRM CONTACT";
    if (confidence >= 0.55) return "CREDIBLE CONTACT";
    if (confidence >= 0.25) return "TENTATIVE CONTACT";
    return "UNCONFIRMED REPORT";
  }
  function boundedAge(report) {
    const band = boundedBand(report?.ageBand, "age", "");
    if (band) return band;
    const seconds = Number(report?.age);
    if (!Number.isFinite(seconds)) return "AGE UNKNOWN";
    if (seconds <= 5) return "FRESH";
    if (seconds <= 20) return "RECENT";
    if (seconds <= 60) return "AGING";
    return "STALE";
  }
  function safeMark(value, fallback) {
    const mark = String(value ?? "").trim().toUpperCase();
    return /^[A-Z0-9][A-Z0-9 .-]{0,15}$/.test(mark) ? mark : fallback;
  }
  function readGeneralSituation(simulation2, snapshot) {
    if (typeof simulation2.generalSituation === "function") {
      try {
        const projection = simulation2.generalSituation(TEAM.BLUE);
        if (projection && typeof projection === "object") return projection;
      } catch {
      }
    }
    const fallback = snapshot?.playerSituation?.blue ?? snapshot?.playerSituation;
    return fallback && typeof fallback === "object" ? fallback : null;
  }
  function createBattlefieldUI(simulation2, renderer2) {
    let selectedCentury = "blue-1";
    let uiMode = UI_MODE.GAMEPLAY;
    let applyToTeam = true;
    let placingZone = false;
    let observerIndex = 0;
    let toastUntil = 0;
    let latestSituation = null;
    const selectedTeam = () => selectedCentury.startsWith("blue") ? TEAM.BLUE : TEAM.RED;
    const commandScope = () => applyToTeam ? selectedTeam() : selectedCentury;
    function showToast(message, duration = 2300) {
      const toast = byId("toast");
      if (!toast) return;
      toast.textContent = message;
      toast.classList.add("visible");
      toastUntil = performance.now() + duration;
    }
    function selectCentury(id) {
      if (uiMode === UI_MODE.GAMEPLAY && !String(id).startsWith("blue")) {
        showToast("Enemy contacts are intelligence reports, not commandable units");
        return false;
      }
      selectedCentury = id;
      renderer2.setSelectedCentury(id);
      for (const button of document.querySelectorAll("[data-century]")) {
        setActive(button, button.dataset.century === id);
      }
      const team = selectedTeam();
      document.body.dataset.commandTeam = team;
      setText("commandTarget", applyToTeam ? `${team.toUpperCase()} TEAM` : id.toUpperCase());
      return true;
    }
    function setUIMode(mode, announce = true) {
      uiMode = mode === UI_MODE.DEBUG ? UI_MODE.DEBUG : UI_MODE.GAMEPLAY;
      renderer2.setUIMode?.(uiMode);
      document.body.dataset.uiMode = uiMode;
      setActive(byId("modeGameplay"), uiMode === UI_MODE.GAMEPLAY);
      setActive(byId("modeDebug"), uiMode === UI_MODE.DEBUG);
      byId("modeGameplay")?.setAttribute("aria-pressed", String(uiMode === UI_MODE.GAMEPLAY));
      byId("modeDebug")?.setAttribute("aria-pressed", String(uiMode === UI_MODE.DEBUG));
      for (const enemyCardId of ENEMY_CARD_IDS) {
        const enemyCard = byId(`card-${enemyCardId}`);
        if (enemyCard) enemyCard.tabIndex = uiMode === UI_MODE.DEBUG ? 0 : -1;
      }
      if (uiMode === UI_MODE.GAMEPLAY) {
        if (!selectedCentury.startsWith("blue")) selectCentury("blue-1");
        const cognition = byId("showCognition");
        if (cognition) cognition.checked = false;
        simulation2.setPresentation({ showCognition: false });
        updateGameplayScore(latestSituation);
        updateGameplaySelected(latestSituation);
        updateGameplayCenturyCards(latestSituation);
        if (announce) showToast("Gameplay UI \xB7 Blue general situation only");
      } else {
        if (announce) showToast("Debug UI \xB7 omniscient observer diagnostics visible");
      }
    }
    byId("modeGameplay")?.addEventListener("click", () => setUIMode(UI_MODE.GAMEPLAY));
    byId("modeDebug")?.addEventListener("click", () => setUIMode(UI_MODE.DEBUG));
    for (const button of document.querySelectorAll("[data-century]")) {
      button.addEventListener("click", () => selectCentury(button.dataset.century));
    }
    for (const card of document.querySelectorAll("[data-century-card]")) {
      card.addEventListener("click", () => selectCentury(card.dataset.centuryCard));
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectCentury(card.dataset.centuryCard);
        }
      });
    }
    const enemyAIToggle = byId("enemyGeneralAI");
    const canControlEnemyAI = typeof simulation2.setGeneralAI === "function";
    if (enemyAIToggle) {
      enemyAIToggle.disabled = !canControlEnemyAI;
      if (!canControlEnemyAI) enemyAIToggle.checked = false;
    }
    if (canControlEnemyAI) {
      try {
        simulation2.setGeneralAI(TEAM.RED, Boolean(enemyAIToggle?.checked));
        setText("enemyAIStatus", enemyAIToggle?.checked ? "ON" : "OFF");
      } catch {
        if (enemyAIToggle) {
          enemyAIToggle.checked = false;
          enemyAIToggle.disabled = true;
        }
        setText("enemyAIStatus", "UNAVAILABLE");
      }
    } else {
      setText("enemyAIStatus", "UNAVAILABLE");
    }
    enemyAIToggle?.addEventListener("change", (event) => {
      if (!canControlEnemyAI) return;
      try {
        simulation2.setGeneralAI(TEAM.RED, event.target.checked);
        setText("enemyAIStatus", event.target.checked ? "ON" : "OFF");
        showToast(`Enemy general AI ${event.target.checked ? "enabled" : "disabled"}`);
      } catch {
        event.target.checked = !event.target.checked;
        setText("enemyAIStatus", event.target.checked ? "ON" : "OFF");
        showToast("Enemy general AI control rejected this change");
      }
    });
    const teamToggle = byId("applyTeam");
    if (teamToggle) teamToggle.addEventListener("change", () => {
      applyToTeam = teamToggle.checked;
      setText("commandTarget", applyToTeam ? `${selectedTeam().toUpperCase()} TEAM` : selectedCentury.toUpperCase());
    });
    for (const button of document.querySelectorAll("[data-posture]")) {
      button.addEventListener("click", () => {
        const posture = button.dataset.posture;
        const scope = commandScope();
        simulation2.issuePosture(scope, posture);
        showToast(`Courier dispatched \xB7 ${String(scope).toUpperCase()}: ${titleCase(posture)}`);
      });
    }
    function cancelZonePlacement() {
      placingZone = false;
      renderer2.setZonePlacementActive(false);
      setActive(byId("btnPlaceZone"), false);
      setText("zoneHint", "optional positional tether");
    }
    byId("btnPlaceZone")?.addEventListener("click", () => {
      placingZone = !placingZone;
      renderer2.setZonePlacementActive(placingZone);
      setActive(byId("btnPlaceZone"), placingZone);
      setText("zoneHint", placingZone ? "click open ground to place" : "optional positional tether");
    });
    renderer2.onGroundClick((point) => {
      if (!placingZone) return;
      const radius = Number(byId("zoneRadius")?.value) || 14;
      const scope = commandScope();
      simulation2.setHoldZone(scope, { ...point, radius });
      showToast(`Zone order dispatched to ${String(scope).toUpperCase()}`);
      cancelZonePlacement();
    });
    byId("btnClearZone")?.addEventListener("click", () => {
      const scope = commandScope();
      simulation2.clearHoldZone(scope);
      showToast(`Clear-zone courier dispatched to ${String(scope).toUpperCase()}`);
    });
    byId("zoneRadius")?.addEventListener("input", (event) => {
      setText("zoneRadiusOut", `${event.target.value}m`);
    });
    function applyScenario(name) {
      if (name === "assault") {
        simulation2.issuePosture(TEAM.BLUE, POSTURE.AGGRESSIVE);
        simulation2.issuePosture(TEAM.RED, POSTURE.HOLD);
      } else if (name === "meeting") {
        simulation2.issuePosture(TEAM.BLUE, POSTURE.AGGRESSIVE);
        simulation2.issuePosture(TEAM.RED, POSTURE.AGGRESSIVE);
      } else if (name === "feint") {
        simulation2.issuePosture(TEAM.BLUE, POSTURE.AGGRESSIVE);
        simulation2.issuePosture(TEAM.RED, POSTURE.DEFENSIVE_FEINT);
      } else if (name === "mutual-feint") {
        simulation2.issuePosture(TEAM.BLUE, POSTURE.DEFENSIVE_FEINT);
        simulation2.issuePosture(TEAM.RED, POSTURE.DEFENSIVE_FEINT);
      }
      showToast(`${titleCase(name)} \xB7 couriers dispatched`);
    }
    for (const button of document.querySelectorAll("[data-scenario]")) {
      button.addEventListener("click", () => applyScenario(button.dataset.scenario));
    }
    byId("btnPause")?.addEventListener("click", () => simulation2.setPaused(!simulation2.paused));
    byId("btnRestart")?.addEventListener("click", () => {
      const rawSeed = byId("seed")?.value;
      const parsedSeed = rawSeed === "" ? NaN : Number(rawSeed);
      const seed = Number.isFinite(parsedSeed) ? parsedSeed : simulation2.observe().config.seed;
      const perCentury = Number(byId("strength")?.value) || 36;
      simulation2.reset({ seed, perCentury });
      cancelZonePlacement();
      showToast(`Battle reset \xB7 seed ${seed >>> 0}`);
    });
    byId("btnNewSeed")?.addEventListener("click", () => {
      const prior = simulation2.observe().config.seed;
      const seed = Math.imul(prior ^ 2654435769, 1664525) + 1013904223 >>> 0;
      if (byId("seed")) byId("seed").value = String(seed);
      simulation2.reset({ seed, perCentury: Number(byId("strength")?.value) || 36 });
      cancelZonePlacement();
      showToast(`New deterministic seed ${seed}`);
    });
    byId("btnResetCamera")?.addEventListener("click", () => renderer2.resetCamera());
    byId("tempo")?.addEventListener("input", (event) => {
      const tempo = Number(event.target.value);
      simulation2.setTimeScale(tempo);
      setText("tempoOut", `${Number.isInteger(tempo) ? tempo.toFixed(1) : String(tempo)}\xD7`);
    });
    byId("strength")?.addEventListener("input", (event) => {
      setText("strengthOut", event.target.value);
      byId("restartNote")?.classList.add("visible");
    });
    byId("showCognition")?.addEventListener("change", (event) => {
      simulation2.setPresentation({ showCognition: event.target.checked });
    });
    byId("showMessages")?.addEventListener("change", (event) => {
      simulation2.setPresentation({ showMessages: event.target.checked });
    });
    globalThis.addEventListener?.("keydown", (event) => {
      if (event.defaultPrevented || event.target?.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(event.target?.tagName)) return;
      if (event.key === " ") {
        event.preventDefault();
        simulation2.setPaused(!simulation2.paused);
      }
      if (event.key === "1") simulation2.issuePosture(commandScope(), POSTURE.AGGRESSIVE);
      if (event.key === "2") simulation2.issuePosture(commandScope(), POSTURE.HOLD);
      if (event.key === "3") simulation2.issuePosture(commandScope(), POSTURE.DEFENSIVE_FEINT);
      const centuryKeys = uiMode === UI_MODE.DEBUG ? { q: "blue-1", w: "blue-2", o: "red-1", p: "red-2" } : { q: "blue-1", w: "blue-2" };
      if (centuryKeys[event.key.toLowerCase()]) selectCentury(centuryKeys[event.key.toLowerCase()]);
      if (event.key === "Escape") cancelZonePlacement();
    });
    function writeCard(card, { label, strength, state, quality, comm, stateCode = "", noContact = false }) {
      if (!card) return;
      card.dataset.state = stateCode;
      card.classList.toggle("no-contact", noContact);
      const labelElement = card.querySelector('[data-field="label"]');
      const strengthElement = card.querySelector('[data-field="strength"]');
      const stateElement = card.querySelector('[data-field="state"]');
      const qualityElement = card.querySelector('[data-field="quality"]');
      const commElement = card.querySelector('[data-field="comm"]');
      if (labelElement) labelElement.textContent = label;
      if (strengthElement) strengthElement.textContent = strength;
      if (stateElement) stateElement.textContent = state;
      if (qualityElement) qualityElement.textContent = quality;
      if (commElement) commElement.textContent = comm;
    }
    function updateDebugCenturyCards(snapshot) {
      for (const century of snapshot.centuries) {
        const card = byId(`card-${century.id}`);
        if (!card) continue;
        card.classList.toggle("selected", century.id === selectedCentury);
        writeCard(card, {
          label: century.standard,
          strength: `${century.alive}/${century.initialStrength}`,
          state: `${titleCase(century.posture)} \xB7 ${titleCase(century.state)} \xB7 ${titleCase(century.tacticalRole)}`,
          quality: `Q ${century.capabilitySummary.mean.overall.toFixed(2)} \xB7 BASE DRL ${century.training.formation.toFixed(2)} \xB7 WPN ${century.training.weapons.toFixed(2)}`,
          comm: `${century.contactConfidence > 0.12 ? "CONTACT" : "NO CONTACT"} \xB7 ${titleCase(century.communicationState)}`,
          stateCode: century.state
        });
      }
    }
    function friendlyReport(situation, centuryId) {
      return Array.isArray(situation?.friendly) ? situation.friendly.find((report) => report?.centuryId === centuryId) ?? null : null;
    }
    function updateGameplayCenturyCards(situation) {
      for (const centuryId of FRIENDLY_CENTURIES) {
        const card = byId(`card-${centuryId}`);
        const report = friendlyReport(situation, centuryId);
        card?.classList.toggle("selected", centuryId === selectedCentury);
        if (!report) {
          writeCard(card, {
            label: centuryId === "blue-1" ? "B1" : "B2",
            strength: "REPORT PENDING",
            state: "Awaiting runner or signal",
            quality: "CONFIDENCE UNKNOWN",
            comm: "ORDER STATUS UNKNOWN",
            noContact: true
          });
          continue;
        }
        const status = boundedBand(report.statusBand, "status", "STATUS UNKNOWN");
        const strength = boundedBand(report.strengthBand, "strength", "STRENGTH UNKNOWN");
        const order = boundedBand(report.orderStatus, "order", "ORDER STATUS UNKNOWN");
        const source = boundedBand(report.source, "source", "SOURCE UNKNOWN");
        writeCard(card, {
          label: safeMark(report.mark, centuryId === "blue-1" ? "B1" : "B2"),
          strength,
          state: `${status} \xB7 ${boundedAge(report)}`,
          quality: `${boundedConfidence(report.confidence)} \xB7 ${source}`,
          comm: order,
          stateCode: normalizedBand(report.statusBand)
        });
      }
      const contacts = Array.isArray(situation?.contacts) ? situation.contacts.slice(0, 2) : [];
      for (let index = 0; index < ENEMY_CARD_IDS.length; index++) {
        const card = byId(`card-${ENEMY_CARD_IDS[index]}`);
        card?.classList.remove("selected");
        const contact = contacts[index];
        const fallbackMark = `CONTACT ${String.fromCharCode(65 + index)}`;
        if (!contact) {
          writeCard(card, {
            label: fallbackMark,
            strength: "UNKNOWN",
            state: "No confirmed contact",
            quality: "CONFIDENCE UNKNOWN",
            comm: "RANGE \xB7 BEARING UNKNOWN",
            noContact: true
          });
          continue;
        }
        const threat = boundedBand(contact.threatBand, "threat", "THREAT UNKNOWN");
        const range = boundedBand(contact.rangeBand, "range", "RANGE UNKNOWN");
        const bearing = boundedBand(contact.bearingBand, "bearing", "BEARING UNKNOWN");
        const strength = boundedBand(contact.strengthBand, "strength", "STRENGTH UNKNOWN");
        writeCard(card, {
          label: safeMark(contact.recognizedMark, fallbackMark),
          strength,
          state: `${boundedConfidence(contact.confidence)} \xB7 ${threat}`,
          quality: `${boundedBand(contact.confidenceBand, "confidence", boundedConfidence(contact.confidence))} \xB7 ${boundedAge(contact)}`,
          comm: `${range} \xB7 ${bearing}`,
          stateCode: normalizedBand(contact.threatBand)
        });
      }
    }
    function processObserverEvents() {
      const batch = simulation2.observerEventsSince(observerIndex);
      observerIndex = batch.nextIndex;
      for (const event of batch.events) {
        if (event.type === "match-result") {
          const result = event.payload;
          showToast(result.winner ? `${result.winner.toUpperCase()} VICTORY` : "DRAW", 7e3);
        }
      }
    }
    function updateDebugScore(diagnostics) {
      const blue = diagnostics.team.blue;
      const red = diagnostics.team.red;
      setText("blueStrength", `${blue.alive}/${blue.initial}`);
      setText("blueStatus", `${blue.routing} routing`);
      setText("redStrength", `${red.alive}/${red.initial}`);
      setText("redStatus", `${red.routing} routing`);
    }
    function updateDebugGenerals(snapshot, diagnostics) {
      for (const team of [TEAM.BLUE, TEAM.RED]) {
        const situation = snapshot.generalSituations?.[team];
        const general = situation?.general;
        const diagnostic = diagnostics.general?.[team];
        const target = team === TEAM.BLUE ? "blueGeneralDebug" : "redGeneralDebug";
        if (!general) {
          setText(target, "UNAVAILABLE");
          continue;
        }
        setText(
          target,
          `${titleCase(general.state)} \xB7 ${titleCase(general.intent)} \xB7 ${titleCase(general.reason)} \xB7 ${diagnostic?.contacts ?? 0} tracks \xB7 ${general.ordersIssued} orders \xB7 ${general.reportsReceived} reports`
        );
      }
    }
    function updateGameplayScore(situation) {
      const friendly = Array.isArray(situation?.friendly) ? situation.friendly : [];
      const contacts = Array.isArray(situation?.contacts) ? situation.contacts : [];
      setText("blueStrength", `${friendly.length || "NO"} REPORT${friendly.length === 1 ? "" : "S"}`);
      setText("blueStatus", friendly.length ? `${friendly.filter((report) => boundedAge(report) === "FRESH").length}/${friendly.length} reports fresh` : "field reports pending");
      setText("redStrength", contacts.length ? `${contacts.length} TRACK${contacts.length === 1 ? "" : "S"}` : "NO TRACKS");
      const leadingContact = contacts[0];
      setText("redStatus", leadingContact ? `${boundedBand(leadingContact.threatBand, "threat", "THREAT UNKNOWN")} \xB7 ${boundedConfidence(leadingContact.confidence)}` : "disposition unknown");
    }
    function updateDebugSelected(snapshot) {
      const selected = snapshot.centuries.find((century) => century.id === selectedCentury) || snapshot.centuries[0];
      if (!selected) return;
      setText("selectedName", `${selected.standard} \xB7 ${selected.team.toUpperCase()}`);
      setText("selectedPosture", titleCase(selected.posture));
      setText("selectedState", `${titleCase(selected.state)} / ${titleCase(selected.tacticalRole)}`);
      setText("selectedReason", titleCase(selected.reason));
      setText("selectedStrength", `${selected.alive}/${selected.initialStrength}`);
      setText("selectedMorale", `${Math.round(selected.perceivedMorale * 100)}% perceived`);
      setText("selectedContact", `${Math.round(selected.contactConfidence * 100)}% formation \xB7 ${selected.individualContacts.length} individual`);
      setText("selectedLine", `${selected.lineGapError.toFixed(1)}m gap \xB7 ${selected.lineDepthError.toFixed(1)}m depth`);
      const epochLabel = selected.pendingPlanEpoch == null ? `e${selected.planEpoch}` : `active e${selected.planEpoch} \u2192 pending e${selected.pendingPlanEpoch}`;
      setText("selectedOrders", `${titleCase(selected.planStatus)} ${epochLabel} \xB7 ${titleCase(selected.standardCode)} standard \xB7 ${selected.messagesSent}/${selected.messagesReceived} tx/rx`);
      setText("selectedZone", selected.holdZone ? `${selected.holdZone.x.toFixed(0)}, ${selected.holdZone.z.toFixed(0)} \xB7 r${selected.holdZone.radius.toFixed(0)}m` : "none");
      setText("selectedQuality", `Q ${selected.capabilitySummary.mean.overall.toFixed(2)} \xB7 base drill ${selected.training.formation.toFixed(2)} \xB7 base weapon ${selected.training.weapons.toFixed(2)} \xB7 actual armor ${selected.capabilitySummary.mean.armor.toFixed(2)}`);
      for (const button of document.querySelectorAll("[data-posture]")) {
        setActive(button, button.dataset.posture === selected.posture);
      }
    }
    function updateGameplaySelected(situation) {
      const report = friendlyReport(situation, selectedCentury);
      const contacts = Array.isArray(situation?.contacts) ? situation.contacts : [];
      const intent = normalizedBand(report?.intendedPosture ?? situation?.general?.intent);
      const posture = intent === "advance" ? POSTURE.AGGRESSIVE : intent === "stationary" ? POSTURE.HOLD : intent === "feint" ? POSTURE.DEFENSIVE_FEINT : intent;
      setText("selectedName", safeMark(report?.mark, selectedCentury === "blue-1" ? "B1 \xB7 BLUE" : "B2 \xB7 BLUE"));
      setText("selectedPosture", boundedBand(intent, "intent", "STANDING ORDERS"));
      setText("selectedStrength", boundedBand(report?.strengthBand, "strength", "REPORT PENDING"));
      setText("selectedMorale", boundedBand(report?.statusBand, "status", "status unknown").toLowerCase());
      setText("selectedContact", contacts.length ? `${contacts.length} enemy track${contacts.length === 1 ? "" : "s"} \xB7 ${boundedConfidence(contacts[0]?.confidence).toLowerCase()}` : "no confirmed enemy track");
      const order = boundedBand(report?.orderStatus, "order", "ORDER STATUS UNKNOWN");
      const source = boundedBand(report?.source, "source", "SOURCE UNKNOWN");
      setText("selectedReport", report ? `${order} \xB7 ${boundedAge(report)} \xB7 ${source}` : "Awaiting runner or signal");
      setText("selectedZone", "not included in current field report");
      for (const button of document.querySelectorAll("[data-posture]")) {
        setActive(button, button.dataset.posture === posture);
      }
    }
    function update(snapshot, diagnostics, frameMs) {
      const situation = readGeneralSituation(simulation2, snapshot);
      latestSituation = situation;
      setText("battleClock", `${Math.floor(snapshot.simTime / 60).toString().padStart(2, "0")}:${Math.floor(snapshot.simTime % 60).toString().padStart(2, "0")}`);
      setText("casualtiesTotal", diagnostics.casualties);
      setText("runnerLosses", diagnostics.runnerLosses);
      setText("hitCount", diagnostics.hits);
      setText("messageCount", `${diagnostics.messagesDelivered}/${diagnostics.messagesDispatched}`);
      setText("runnerCount", diagnostics.runnerDeliveries);
      setText("simPerf", `${frameMs.toFixed(1)} ms`);
      if (uiMode === UI_MODE.DEBUG) {
        updateDebugScore(diagnostics);
        updateDebugGenerals(snapshot, diagnostics);
        updateDebugSelected(snapshot);
        updateDebugCenturyCards(snapshot);
      } else {
        updateGameplayScore(situation);
        updateGameplaySelected(situation);
        updateGameplayCenturyCards(situation);
      }
      const result = snapshot.matchResult;
      const resultElement = byId("matchResult");
      if (resultElement) {
        resultElement.classList.toggle("visible", Boolean(result));
        resultElement.dataset.winner = result?.winner || "draw";
        resultElement.textContent = result ? result.winner ? `${result.winner.toUpperCase()} ${result.status.replace("-", " ").toUpperCase()}` : "DRAW" : "BATTLE IN PROGRESS";
      }
      const pause = byId("btnPause");
      if (pause) pause.textContent = snapshot.config.paused ? "RESUME" : "PAUSE";
      setActive(pause, snapshot.config.paused);
      if (byId("seed") && document.activeElement !== byId("seed")) byId("seed").value = String(snapshot.config.seed);
      if (byId("strength") && document.activeElement !== byId("strength")) {
        byId("strength").value = String(snapshot.config.perCentury);
        setText("strengthOut", snapshot.config.perCentury);
      }
      setText("commandTarget", applyToTeam ? `${selectedTeam().toUpperCase()} TEAM` : selectedCentury.toUpperCase());
      processObserverEvents();
      if (performance.now() > toastUntil) byId("toast")?.classList.remove("visible");
    }
    selectCentury(selectedCentury);
    setUIMode(UI_MODE.GAMEPLAY, false);
    return Object.freeze({ update, selectCentury, setUIMode, cancelZonePlacement });
  }

  // src/main.js
  var canvas = document.getElementById("battlefield");
  var simulation = createBattlefieldSimulation();
  var renderer = createBattlefieldRenderer(canvas);
  var ui = createBattlefieldUI(simulation, renderer);
  var last = performance.now();
  var accumulator = 0;
  function frame(now) {
    const frameStarted = performance.now();
    const elapsed = Math.min(0.075, Math.max(0, (now - last) / 1e3));
    last = now;
    if (!simulation.paused && !simulation.result) {
      accumulator += elapsed * simulation.timeScale;
      const population = simulation.observe().soldiers.length;
      const maxSteps = population > 260 ? 8 : population > 170 ? 10 : 14;
      let steps = 0;
      while (accumulator >= TUNING.fixedDt && steps < maxSteps) {
        simulation.step(TUNING.fixedDt);
        accumulator -= TUNING.fixedDt;
        steps++;
      }
      if (steps === maxSteps) accumulator = Math.min(accumulator, TUNING.fixedDt * 2);
    } else {
      accumulator = 0;
    }
    const snapshot = simulation.observe();
    renderer.render(snapshot, simulation.generalSituation(TEAM.BLUE));
    ui.update(snapshot, simulation.diagnostics(), performance.now() - frameStarted);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
