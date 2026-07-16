import {
  VERSION, TEAM, TEAMS, POSTURE, POSTURES, CENTURION_STATE,
  SOLDIER_STATE, COMBAT_STATE, MESSAGE_KIND, TACTICAL_ROLE, PLAN_STATUS,
  STANDARD_CODE, TUNING, TEAM_DOCTRINE
} from './constants.js';
import {
  clamp, distance, distanceSq, wrapAngle, angleDifference, headingTo,
  forwardOf, lateralOf, dot2, normalize2, rotateToward, worldFromLocal,
  localFromWorld, quantize, deepFreeze
} from './math.js';
import { hash01, agentRandom } from './rng.js';
import { ORCA2D } from './orca.js';
import {
  prepareUnitProfileMap, resolveUnitProfile, createActorProfile,
  deriveCapabilities, capabilityRatings, summarizeCapabilities,
  orderReactionDelay, combatHitChance, combatDamage
} from './capabilities.js';

const otherTeam = team => team === TEAM.BLUE ? TEAM.RED : TEAM.BLUE;
const copyPacket = packet => deepFreeze(JSON.parse(JSON.stringify(packet)));
const stableNumericKey = value => [...String(value)].reduce(
  (hash, character) => Math.imul(hash ^ character.charCodeAt(0), 0x01000193) >>> 0,
  0x811c9dc5);

function detachedFrozen(value) {
  const clone = source => {
    if (!source || typeof source !== 'object') return source;
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
  for (const key of ['hp', 'morale', 'fatigue']) {
    Object.defineProperty(body, key, {
      enumerable: true,
      configurable: false,
      get() { return this.condition[key]; },
      set(value) { this.condition[key] = value; }
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
  return worldFromLocal(center, heading,
    -(formationHalfWidth(plan, spacing) + TUNING.centurionGuideGap),
    Math.max(0, plan.ranks - 1) * spacing * 0.5);
}

function centerFromGuide(guide, heading, plan, spacing = TUNING.spacing) {
  const offset = worldFromLocal({ x: 0, z: 0 }, heading,
    -(formationHalfWidth(plan, spacing) + TUNING.centurionGuideGap),
    Math.max(0, plan.ranks - 1) * spacing * 0.5);
  return { x: guide.x - offset.x, z: guide.z - offset.z };
}

function slotPosition(center, heading, doctrine) {
  return worldFromLocal(center, heading, doctrine.lateral, doctrine.depth);
}

function postureIsValid(posture) {
  return POSTURES.includes(posture);
}

/**
 * Build one self-contained 2v2 battlefield.
 *
 * Mutable world truth remains inside this factory. Centurion and soldier
 * decisions consume only detached sensor DTOs, copied order packets, private
 * memory, and doctrine. Rendering and diagnostics receive frozen projections.
 */
export function createBattlefieldSimulation(options = {}) {
  const unitProfiles = prepareUnitProfileMap(options.unitProfiles || {});
  const config = {
    seed: Number.isFinite(options.seed) ? Number(options.seed) >>> 0 : 0x29004004,
    perCentury: clamp(Math.round(Number(options.perCentury) || TUNING.defaultPerCentury), 12, 100),
    unitProfiles,
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
  const bodyById = new Map();
  const officerByPublicMark = new Map();
  const generalPosts = Object.freeze({
    [TEAM.BLUE]: Object.freeze({ x: 0, z: -54 }),
    [TEAM.RED]: Object.freeze({ x: 0, z: 54 })
  });

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
    if (event.event === 'dispatched') aggregateCounters.messagesDispatched++;
    if (event.event === 'delivered') {
      aggregateCounters.messagesDelivered++;
      if (event.delivery === 'runner') aggregateCounters.runnerDeliveries++;
      if (event.delivery === 'voice') aggregateCounters.voiceDeliveries++;
    }
    communicationEvents.push(deepFreeze({ t: simTime, ...event }));
    if (communicationEvents.length > 2000) {
      communicationEvents.splice(0, communicationEvents.length - 2000);
    }
  }

  function logCombat(event) {
    if (event.event === 'hit' || event.event === 'miss') aggregateCounters.strikes++;
    if (event.event === 'hit') aggregateCounters.hits++;
    if (event.event === 'casualty') {
      if (event.kind === 'soldier') aggregateCounters.soldierCasualties++;
      if (event.kind === 'centurion') aggregateCounters.centurionCasualties++;
      if (event.kind === 'runner') aggregateCounters.runnerLosses++;
    }
    combatEvents.push(deepFreeze({ t: simTime, ...event }));
    if (combatEvents.length > 3000) combatEvents.splice(0, combatEvents.length - 3000);
  }

  function centuryById(id) {
    return centuries.find(century => century.id === id) || null;
  }

  function partnerOf(century) {
    return centuries.find(other => other.team === century.team && other.id !== century.id) || null;
  }

  function aliveSoldiers(century) {
    return soldiers.filter(soldier => soldier.alive && soldier.centuryId === century.id);
  }

  function currentCenturyCenter(century) {
    return centerFromGuide(century.centurion, century.centurion.heading,
      century.plan, century.spacing);
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
      actorKey: 50000 + index,
      profileId: `profile-centurion-${id}`,
      kind: 'centurion',
      unitProfile: centurionUnitProfile
    });
    const centurionCapabilities = deriveCapabilities(centurionProfile);
    const centurion = attachCondition({
      id: centurionId,
      kind: 'centurion',
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
    centurion.publicMark = `${team === TEAM.BLUE ? 'B' : 'R'}${index + 1}`;
    officerByPublicMark.set(centurion.publicMark, centurion);
    const initialPosture = team === TEAM.BLUE ? POSTURE.AGGRESSIVE : POSTURE.HOLD;
    const century = {
      id,
      team,
      index,
      wingSign,
      outerLateralSign: wingSign,
      standard: `${team === TEAM.BLUE ? 'B' : 'R'}${index + 1}`,
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
        thinkT: agentRandom(config.seed, index + (team === TEAM.RED ? 10 : 0), 0x281) * TUNING.centurionThink,
        reportT: 0,
        lastReportedState: null,
        lastReportedThreat: null,
        lastReportedStandard: null,
        lastReportedContact: null,
        orderT: 0,
        scanPhase: agentRandom(config.seed, index, team === TEAM.BLUE ? 0x282 : 0x283) * Math.PI * 2,
        gazeHeading: heading,
        desiredHeading: heading,
        desiredVelocity: { x: 0, z: 0 },
        enemyTracks: new Map(),
        signatureTracks: new Map(),
        nextTrackSerial: 1,
        individualContacts: [],
        allyTrack: null,
        inbox: [],
        commandInbox: [],
        seenInboxSerials: new Set(),
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
          scope: 'doctrine',
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
        communicationState: 'local',
        ordersIssued: 0,
        messagesSent: 0,
        messagesReceived: 0,
        lastReason: 'deployment'
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
        const numericId = (team === TEAM.BLUE ? 0 : 10000) + index * 1000 + localIndex;
        const soldierProfile = createActorProfile({
          seed: config.seed,
          actorKey: index * 1000 + localIndex,
          profileId: `profile-${soldierId}`,
          kind: 'soldier',
          unitProfile: resolveUnitProfile(config.unitProfiles, team, id, soldierId)
        });
        const capabilities = deriveCapabilities(soldierProfile);
        const initialFatigue = agentRandom(config.seed, localIndex, 0x285, index) * 0.05;
        const initialMorale = clamp(0.92 +
          agentRandom(config.seed, localIndex, 0x286, index) * 0.07 +
          (capabilities.morale.stability - 1) * 0.12, 0.82, 0.995);
        const soldier = attachCondition({
          id: soldierId,
          numericId,
          kind: 'soldier',
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
          orderCallT: agentRandom(config.seed, localIndex, 0x287, index) * .45,
          guideCallT: agentRandom(config.seed, localIndex, 0x288, index) * .65,
          orderUnderstoodAt: 0,
          thinkT: agentRandom(config.seed, localIndex, 0x284, index) * TUNING.soldierThink,
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
      ...century.soldierIds.map(soldierId => bodyById.get(soldierId).capabilities)
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
    createCentury(TEAM.BLUE, 0);
    createCentury(TEAM.BLUE, 1);
    createCentury(TEAM.RED, 0);
    createCentury(TEAM.RED, 1);
    for (const century of centuries) {
      const partner = partnerOf(century);
      const ownCenter = currentCenturyCenter(century);
      const partnerCenter = currentCenturyCenter(partner);
      const local = localFromWorld(ownCenter, century.centurion.heading, partnerCenter);
      century.outerLateralSign = local.lateral >= 0 ? -1 : 1;
      // This is doctrine-time knowledge of the partner's deployment station,
      // not a live shared position. It remains stale until sight or a message
      // updates the centurion's private ally track.
      century.brain.allyAssemblyPoint = Object.freeze({ ...partnerCenter });
      century.brain.allyDoctrine = deepFreeze({
        plan: { ranks: partner.plan.ranks, columns: partner.plan.columns },
        spacing: partner.spacing
      });
      publishCenturyOrder(century, 'hold', century.centurion.heading, 0, 'deployment');
    }
    commitCenturyOrders();
    spatial = null;
    emitObserver('reset', { seed: config.seed, perCentury: config.perCentury });
  }

  function spatialKey(ix, iz) {
    return `${ix},${iz}`;
  }

  function rebuildSpatial(cellSize = 3.2) {
    spatialCell = cellSize;
    spatial = new Map();
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
    const error = (0.12 + range * 0.006) * clamp(errorScale, 0.70, 1.35);
    return {
      x: quantize(point.x + (hash01(config.seed, observerKey, sourceKey, epoch + salt) - 0.5) * error, 0.1),
      z: quantize(point.z + (hash01(config.seed, sourceKey, observerKey, epoch + salt + 17) - 0.5) * error, 0.1)
    };
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
      const isOwn = body.team === century.team && sameMark && body.kind === 'soldier';
      const isAllyOfficer = body.kind === 'centurion' && body.team === century.team && !sameMark;
      const isEnemy = body.team !== century.team;
      const range = distance(officer, body);
      const visible = withinSensorArc(officer, body, brain.gazeHeading,
        sightRange, fieldOfView, closeAwareness);
      // The officer deliberately checks his own formation between forward
      // scans. Readiness is estimated only from overt geometry and motion;
      // the sensor never reads a soldier's private doctrinal post error.
      const ownBearing = Math.abs(angleDifference(headingTo(officer, body), brain.gazeHeading));
      const ownVisible = isOwn && range <= 48 * perception.sight &&
        (range <= closeAwareness || ownBearing <= 150 * Math.PI / 180);
      if (ownVisible) {
        ownDetections.push({ x: body.x, z: body.z, heading: body.heading });
      }
      // A raised standard is a tall, deliberate public signal and can be
      // acquired outside the narrow enemy-search gaze.
      if (isAllyOfficer && range <= TUNING.standardSignalRange * perception.sight) {
        const p = noisyPoint(officer.id, body.id, body, range, 0x31, perception.error);
        const recognizedCode = simTime - body.standardRaisedAt >= TUNING.standardSignalDelay
          ? body.standardCode || STANDARD_CODE.NONE
          : STANDARD_CODE.NONE;
        allyObservation = deepFreeze({
          recognizedMark: body.publicMark,
          x: p.x,
          z: p.z,
          heading: quantize(body.heading, Math.PI / 180),
          publicState: body.publicState,
          standardCode: recognizedCode,
          standardEpoch: body.standardEpoch || 0,
          positionKind: 'guide',
          observedAt: simTime,
          source: 'vision'
        });
      }
      if (!isEnemy || !visible) continue;
      const p = noisyPoint(officer.id, body.id, body, range, 0x47, perception.error);
      const detection = {
        kind: body.kind,
        x: p.x,
        z: p.z,
        vx: quantize(body.seenVx || 0, 0.1),
        vz: quantize(body.seenVz || 0, 0.1),
        heading: quantize(body.heading, Math.PI / 90),
        publicMark: body.kind === 'centurion' ? body.publicMark : null
      };
      if (body.kind === 'runner') {
        individualObservations.push(deepFreeze({
          contactClass: 'courier',
          kind: 'runner',
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

    // Geometry-based connected components. No engine century key enters the
    // officer percept, so intermingled or fragmented bodies may be confused.
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
            contactClass: 'isolated',
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
      let x = 0; let z = 0; let vx = 0; let vz = 0;
      let headingsX = 0; let headingsZ = 0;
      let minX = Infinity; let maxX = -Infinity; let minZ = Infinity; let maxZ = -Infinity;
      let signature = null;
      for (const detection of component) {
        x += detection.x; z += detection.z; vx += detection.vx; vz += detection.vz;
        headingsX += Math.sin(detection.heading); headingsZ += Math.cos(detection.heading);
        minX = Math.min(minX, detection.x); maxX = Math.max(maxX, detection.x);
        minZ = Math.min(minZ, detection.z); maxZ = Math.max(maxZ, detection.z);
        if (detection.publicMark) signature = detection.publicMark;
      }
      enemyObservations.push(deepFreeze({
        contactClass: 'formation',
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
      let alignmentX = 0; let alignmentZ = 0; let neighborScore = 0;
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
    const officerVoiceRange = officer?.capabilities
      ? TUNING.officerVoice * clamp(0.94 + officer.capabilities.command.communication * 0.06,
        0.96, 1.04)
      : TUNING.officerVoice;
    if (officer?.alive && officer.publicOrderCue &&
        distance(soldier, officer) <= officerVoiceRange) {
      heardOrders.push(deepFreeze({
        source: 'officer-voice',
        publicMark: officer.publicMark,
        publicOrderCue: officer.publicOrderCue
      }));
    }
    for (const body of bodies) {
      const sameFriendlyMark = body.team === soldier.team &&
        body.publicMark === soldier.publicMark;
      if (sameFriendlyMark && body.kind === 'soldier' && body.publicOrderCue &&
          distance(soldier, body) <= TUNING.soldierVoice) {
        heardOrders.push(deepFreeze({
          source: 'soldier-relay',
          publicMark: body.publicMark,
          publicOrderCue: body.publicOrderCue
        }));
      }
      if (!withinSensorArc(soldier, body, soldier.heading,
        sightRange, TUNING.soldierFov * perception.fov,
        TUNING.soldierCloseAwareness * perception.closeAwareness)) continue;
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
        publicOrderCue: sameFriendlyMark && body.kind === 'soldier'
          ? body.publicOrderCue : null,
        publicGuideCue: sameFriendlyMark && body.kind === 'soldier'
          ? body.publicGuideCue : null
      }));
    }
    const losses = fallenBodies
      .filter(body => simTime - body.fallenAt < 12 &&
        distanceSq(soldier, body) <= (TUNING.localMoraleRadius * perception.sight) ** 2)
      .map(body => deepFreeze({
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
      // A recognized public standard is positive perceptual evidence that two
      // nearby formations are not the same remembered body. Anonymous tracks
      // may still associate geometrically and therefore remain fallible.
      if (observation.signature && track.signature &&
          observation.signature !== track.signature) continue;
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
      decayTrackConfidence(track,
        TUNING.contactMemoryHalfLife * capabilities.perception.targetMemory, propagationDt);
      track.x += track.vx * propagationDt;
      track.z += track.vz * propagationDt;
      track.updatedAt = simTime;
    }

    for (const observation of observations) {
      let track = associateEnemyTrack(century, observation);
      if (!track) {
        track = {
          id: `${century.id}-track-${brain.nextTrackSerial++}`,
          contactClass: 'formation',
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
          source: 'vision'
        };
        brain.enemyTracks.set(track.id, track);
      } else {
        const elapsed = Math.max(TUNING.centurionThink,
          observation.observedAt - (track.updatedAt ?? track.observedAt));
        const observedVx = (observation.x - track.x) / elapsed;
        const observedVz = (observation.z - track.z) / elapsed;
        track.vx = track.vx * 0.45 + observedVx * 0.35 + observation.vx * 0.20;
        track.vz = track.vz * 0.45 + observedVz * 0.35 + observation.vz * 0.20;
        track.x = observation.x;
        track.z = observation.z;
        track.heading = observation.heading;
        track.visibleStrength = observation.visibleStrength;
        track.strengthEstimate = Math.max(observation.visibleStrength,
          track.strengthEstimate * 0.72 + observation.visibleStrength * 0.28);
        track.width = observation.width;
        track.confidence = clamp(track.confidence +
          0.22 * capabilities.command.judgment, 0, 1);
        track.observedAt = observation.observedAt;
        track.updatedAt = observation.observedAt;
        track.lastDirectAt = observation.observedAt;
        track.directHits = (track.directHits || 0) + 1;
        track.source = 'vision';
      }
      if (observation.signature) {
        track.signature = observation.signature;
        brain.signatureTracks.set(observation.signature, track.id);
      }
    }

    for (const [trackId, track] of brain.enemyTracks) {
      if (track.confidence < 0.10 || simTime - track.observedAt >
          18 * capabilities.perception.targetMemory) {
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
        if (observation.recognizedMark && contact.recognizedMark &&
            observation.recognizedMark !== contact.recognizedMark) continue;
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
    brain.individualContacts = brain.individualContacts
      .filter(contact => contact.confidence >= 0.08 &&
        simTime - contact.observedAt <= 8 * memoryScale)
      .slice(-16);
  }

  function updateAllyTrackFromObservation(century, observation) {
    if (!observation) return false;
    const prior = century.brain.allyTrack;
    if (prior && (observation.observedAt < prior.observedAt ||
        (observation.observedAt === prior.observedAt && prior.source === 'vision' &&
          observation.source !== 'vision'))) return false;
    const perceivedPosition = observation.positionKind === 'guide' && century.brain.allyDoctrine
      ? centerFromGuide(observation, observation.heading,
          century.brain.allyDoctrine.plan, century.brain.allyDoctrine.spacing)
      : observation;
    const elapsed = prior ? Math.max(TUNING.centurionThink, observation.observedAt - prior.observedAt) : 1;
    const observedVx = Number.isFinite(observation.vx)
      ? observation.vx
      : prior ? (perceivedPosition.x - prior.x) / elapsed : 0;
    const observedVz = Number.isFinite(observation.vz)
      ? observation.vz
      : prior ? (perceivedPosition.z - prior.z) / elapsed : 0;
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
    const reportedStrength = contact.strengthBand === 'many' ? 32 :
      contact.strengthBand === 'body' ? 16 : 6;
    const bandAge = contact.ageBand === 'fresh' ? 0.8 :
      contact.ageBand === 'recent' ? 4 : 8;
    const reportedAge = clamp(bandAge + Math.max(0, transitAge),
      0, TUNING.runnerMessageTtl + 8);
    const evidenceAt = simTime - reportedAge;
    const reportedVx = Number.isFinite(contact.vx) ? contact.vx : 0;
    const reportedVz = Number.isFinite(contact.vz) ? contact.vz : 0;
    const estimatedContact = {
      x: contact.x + reportedVx * reportedAge,
      z: contact.z + reportedVz * reportedAge
    };
    const reportConfidence = clamp(0.36 * senderConfidence *
      Math.pow(0.5, reportedAge / TUNING.contactMemoryHalfLife), 0.01, 0.52);
    let best = null;
    let bestD = 16;
    for (const track of century.brain.enemyTracks.values()) {
      const d = distance(track, estimatedContact);
      if (d < bestD) { bestD = d; best = track; }
    }
    if (!best) {
      best = {
        id: `${century.id}-track-${century.brain.nextTrackSerial++}`,
        contactClass: 'formation',
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
        source: 'ally-report'
      };
      century.brain.enemyTracks.set(best.id, best);
    } else if (evidenceAt > best.observedAt) {
      best.x = best.x * 0.35 + estimatedContact.x * 0.65;
      best.z = best.z * 0.35 + estimatedContact.z * 0.65;
      best.vx = best.vx * 0.5 + reportedVx * 0.5;
      best.vz = best.vz * 0.5 + reportedVz * 0.5;
      best.strengthEstimate = Math.max(best.strengthEstimate * 0.75,
        reportedStrength);
      best.confidence = Math.max(best.confidence, reportConfidence);
      best.observedAt = evidenceAt;
      best.updatedAt = simTime;
      best.source = 'ally-report';
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
      const codeChanged = century.centurion.standardCode !== century.centurion.nextStandardCode ||
        century.centurion.standardEpoch !== century.centurion.nextStandardEpoch;
      if (codeChanged) century.centurion.standardRaisedAt = simTime;
      century.centurion.standardCode = century.centurion.nextStandardCode;
      century.centurion.standardEpoch = century.centurion.nextStandardEpoch;
    }
  }

  function missionFingerprint(mission) {
    if (!mission || typeof mission !== 'object') return '';
    const roles = Object.entries(mission.roles || {})
      .sort(([left], [right]) => left.localeCompare(right));
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
    return Boolean(mission && partner && mission.scope === 'team' &&
      mission.coordinatorId === `${century.team}-1` &&
      mission.missionId === `${century.team}:${mission.epoch}:team` &&
      Number.isSafeInteger(mission.epoch) && mission.epoch > 0 &&
      Number.isFinite(mission.expiresAt) && postureIsValid(mission.posture) &&
      validRoles.includes(mission.roles?.[century.id]) &&
      validRoles.includes(mission.roles?.[partner.id]));
  }

  function missionFor(century, posture, epoch, scope = 'single') {
    const normalizedScope = scope === 'team' ? 'team' : 'single';
    const roles = normalizedScope === 'team'
      ? {
          [`${century.team}-1`]: roleForPosture(posture, 0),
          [`${century.team}-2`]: roleForPosture(posture, 1)
        }
      : { [century.id]: roleForPosture(posture, century.index) };
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
      allyRole: mission.scope === 'team'
        ? mission.roles[partner?.id]
        : priorAllyRole,
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
    emitObserver('mission-committed', {
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
    const offset = century.wingSign *
      (formationHalfWidth(century.plan, century.spacing) + TUNING.centuryGap * 0.5);
    return deepFreeze({
      ...zone,
      x: clamp(zone.x + side.x * offset, -TUNING.battlefieldHalfWidth,
        TUNING.battlefieldHalfWidth),
      z: clamp(zone.z + side.z * offset, -TUNING.battlefieldHalfDepth,
        TUNING.battlefieldHalfDepth),
      enabled: true,
      issuedAt: simTime,
      sectorOf: { x: zone.x, z: zone.z }
    });
  }

  function generalCommandFamily(command) {
    return command === 'posture' ? 'posture' : 'zone';
  }

  function processGeneralCommandInbox(century) {
    const brain = century.brain;
    while (brain.commandInbox.length) {
      const packet = brain.commandInbox.shift();
      const family = generalCommandFamily(packet.command);
      if (packet.serial <= (brain.lastGeneralCommandSerial[family] || 0) ||
          simTime > packet.expiresAt) continue;
      brain.lastGeneralCommandSerial[family] = packet.serial;
      if (packet.command === 'set-zone') {
        century.holdZone = sectorZoneForCentury(century, packet.zone, packet.teamScope);
        brain.orderT = 0;
        emitObserver('hold-zone-received', { centuryId: century.id, serial: packet.serial });
        continue;
      }
      if (packet.command === 'clear-zone') {
        century.holdZone = null;
        brain.orderT = 0;
        emitObserver('hold-zone-cleared', { centuryId: century.id, serial: packet.serial });
        continue;
      }
      if (packet.command !== 'posture' || !postureIsValid(packet.posture)) continue;
      const mission = missionFor(century, packet.posture, packet.serial,
        packet.teamScope ? 'team' : 'single');
      if (!packet.teamScope) {
        activateMission(century, mission, 'general-courier');
      } else {
        const alreadyCommitted = brain.plan.status === PLAN_STATUS.COMMITTED &&
          brain.lastCommittedMission?.missionId === mission.missionId;
        if (alreadyCommitted) continue;
        const alreadyNegotiating = brain.pendingMission?.missionId === mission.missionId &&
          [PLAN_STATUS.RECEIVED, PLAN_STATUS.ACKNOWLEDGED].includes(brain.plan.status);
        if (alreadyNegotiating) continue;
        brain.abortedMission = null;
        brain.abortedAt = -Infinity;
        brain.pendingMission = mission;
        brain.plan = {
          ...brain.plan,
          pendingEpoch: mission.epoch,
          scope: 'team',
          coordinatorId: mission.coordinatorId,
          status: century.index === 0 ? PLAN_STATUS.PROPOSED : PLAN_STATUS.WAITING,
          proposedAt: simTime,
          nextTxAt: 0,
          retries: 0
        };
        if (century.index === 1) raiseStandard(century, STANDARD_CODE.READY, 2, mission.epoch);
        emitObserver('mission-received', {
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
          positionKind: 'center',
          observedAt: packet.issuedAt,
          confidence: Math.pow(0.5, transitAge / TUNING.allyMemoryHalfLife),
          source: packet.delivery
        });
      }
      if (packet.payload.contact) {
        incorporateReportedContact(century, packet.payload.contact,
          packet.payload.confidence || 0.7, transitAge);
      }
      const signalEpoch = packet.payload.senderPose?.standardEpoch;
      const signalCodeConsistent = packet.payload.senderPose?.standardCode ===
        packet.payload.standardCode;
      const newerThanKnownSignal = packet.issuedAt >=
        (brain.allyTrack?.observedAt ?? -Infinity);
      if (packet.payload.standardCode === STANDARD_CODE.FIXED &&
          signalCodeConsistent &&
          signalEpoch === brain.plan.epoch && packet.issuedAt + 5 > simTime &&
          senderPoseAccepted && newerThanKnownSignal &&
          packet.issuedAt >= brain.fixSignalEvidenceAt) {
        brain.fixSignalUntil = packet.issuedAt + 5;
        brain.fixSignalEpoch = signalEpoch;
        brain.fixSignalEvidenceAt = packet.issuedAt;
      } else if (packet.payload.standardCode === STANDARD_CODE.DRAW &&
          signalCodeConsistent &&
          signalEpoch === brain.plan.epoch && packet.issuedAt + 5 > simTime &&
          senderPoseAccepted && newerThanKnownSignal &&
          packet.issuedAt >= brain.feintSignalEvidenceAt) {
        brain.feintSignalUntil = packet.issuedAt + 5;
        brain.feintSignalEpoch = signalEpoch;
        brain.feintSignalEvidenceAt = packet.issuedAt;
      } else if (packet.payload.standardCode === STANDARD_CODE.ABORT &&
          signalCodeConsistent &&
          signalEpoch === brain.plan.epoch &&
          packet.issuedAt + TUNING.planReconcileGrace > simTime) {
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
        const validTeamProposal = validTeamMission(century, mission) &&
          packet.senderId === expectedCoordinator && century.id !== expectedCoordinator &&
          simTime <= mission.expiresAt;
        const knownEpoch = Math.max(brain.plan.epoch, brain.pendingMission?.epoch ?? -1);
        const mayAdopt = validTeamProposal && (mission.epoch > knownEpoch ||
          (mission.epoch === brain.pendingMission?.epoch &&
            brain.plan.status !== PLAN_STATUS.COMMITTED));
        if (mayAdopt && postureIsValid(mission.posture)) {
          brain.abortedMission = null;
          brain.abortedAt = -Infinity;
          brain.pendingMission = JSON.parse(JSON.stringify(mission));
          brain.plan = {
            ...brain.plan,
            pendingEpoch: mission.epoch,
            scope: 'team',
            status: PLAN_STATUS.RECEIVED,
            coordinatorId: mission.coordinatorId,
            proposedAt: simTime,
            nextTxAt: 0,
            retries: 0
          };
          raiseStandard(century, STANDARD_CODE.READY, 2.2, mission.epoch);
        }
      } else if (packet.kind === MESSAGE_KIND.PLAN_ACK) {
        if (century.id === brain.plan.coordinatorId && brain.pendingMission &&
            brain.pendingMission.scope === 'team' &&
            packet.senderId === partnerOf(century)?.id &&
            packet.payload.missionId === brain.pendingMission.missionId &&
            packet.payload.epoch === brain.pendingMission.epoch &&
            packet.payload.missionFingerprint === missionFingerprint(brain.pendingMission) &&
            brain.plan.status === PLAN_STATUS.PROPOSED) {
          brain.plan.status = PLAN_STATUS.ACKNOWLEDGED;
          brain.plan.nextTxAt = 0;
        }
      } else if (packet.kind === MESSAGE_KIND.PLAN_COMMIT) {
        const mission = packet.payload.mission;
        const lateReconciliation = brain.plan.status === PLAN_STATUS.ABORTED &&
          brain.abortedMission && simTime <= brain.abortedAt + TUNING.planReconcileGrace;
        const pending = lateReconciliation ? brain.abortedMission : brain.pendingMission;
        const validCommitState = lateReconciliation ||
          brain.plan.status === PLAN_STATUS.ACKNOWLEDGED;
        const withinCommitWindow = lateReconciliation || simTime <= mission?.expiresAt;
        const mayCommit = validTeamMission(century, mission) && pending &&
          mission.missionId === pending.missionId && mission.epoch === pending.epoch &&
          missionFingerprint(mission) === missionFingerprint(pending) &&
          packet.senderId === mission.coordinatorId && century.id !== mission.coordinatorId &&
          validCommitState && withinCommitWindow;
        if (mayCommit && postureIsValid(mission.posture)) {
          activateMission(century, mission,
            lateReconciliation ? 'late-commit-reconciliation' : 'ally-plan-commit');
        }
      } else if (packet.kind === MESSAGE_KIND.FLANK_WARNING) {
        const expiresAt = packet.issuedAt + 5;
        if (expiresAt > simTime) {
          brain.supportRequest = {
            kind: 'flank',
            threatKind: packet.payload.threatKind || 'outer-flank',
            side: packet.payload.side,
            x: Number.isFinite(packet.payload.contact?.x)
              ? packet.payload.contact.x + (packet.payload.contact.vx || 0) * transitAge
              : null,
            z: Number.isFinite(packet.payload.contact?.z)
              ? packet.payload.contact.z + (packet.payload.contact.vz || 0) * transitAge
              : null,
            expiresAt
          };
        }
      } else if (packet.kind === MESSAGE_KIND.SUPPORT_REQUEST) {
        const expiresAt = packet.issuedAt + 6;
        if (expiresAt > simTime) {
          brain.supportRequest = {
            kind: 'support',
            x: Number.isFinite(packet.payload.senderPose?.x)
              ? packet.payload.senderPose.x + (packet.payload.senderPose.vx || 0) * transitAge
              : null,
            z: Number.isFinite(packet.payload.senderPose?.z)
              ? packet.payload.senderPose.z + (packet.payload.senderPose.vz || 0) * transitAge
              : null,
            expiresAt
          };
        }
      } else if (packet.kind === MESSAGE_KIND.WITHDRAW) {
        const expiresAt = packet.issuedAt + 8;
        if (expiresAt > simTime) brain.supportRequest = { kind: 'withdraw', expiresAt };
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
    if (plan.status === PLAN_STATUS.ABORTED && brain.abortedMission &&
        simTime > brain.abortedAt + TUNING.planReconcileGrace) {
      brain.abortedMission = null;
    }
    if (brain.allyAbortNotice && simTime > brain.allyAbortNotice.expiresAt) {
      brain.allyAbortNotice = null;
    }
    if (pending?.scope === 'team' && simTime > pending.expiresAt &&
        plan.status !== PLAN_STATUS.COMMITTED) {
      const reconciliationEligible = century.id !== pending.coordinatorId &&
        plan.status === PLAN_STATUS.ACKNOWLEDGED;
      brain.abortedMission = reconciliationEligible
        ? deepFreeze(JSON.parse(JSON.stringify(pending)))
        : null;
      brain.abortedAt = simTime;
      brain.pendingMission = null;
      plan.pendingEpoch = null;
      plan.status = PLAN_STATUS.ABORTED;
      plan.nextTxAt = Number.MAX_SAFE_INTEGER;
      raiseStandard(century, STANDARD_CODE.ABORT, 2.2, pending.epoch);
      emitObserver('mission-aborted', {
        centuryId: century.id,
        epoch: pending.epoch,
        missionId: pending.missionId,
        reason: 'coordination-timeout'
      });
      return;
    }
    const observedMatchingAbort = plan.status === PLAN_STATUS.COMMITTED &&
      brain.lastCommittedMission?.scope === 'team' &&
      brain.allyAbortNotice?.epoch === plan.epoch &&
      simTime <= brain.allyAbortNotice.expiresAt;
    if (observedMatchingAbort && simTime >= brain.nextAbortResponseAt) {
      const sent = dispatchCenturionMessage(century, MESSAGE_KIND.PLAN_COMMIT, {
        senderPose: composeSenderPose(century),
        mission: brain.lastCommittedMission,
        standardCode: STANDARD_CODE.GO,
        reconciliation: true
      });
      brain.nextAbortResponseAt = simTime + (sent ? 3 : 0.65);
      if (sent) {
        emitObserver('mission-reconciliation-sent', {
          centuryId: century.id,
          epoch: plan.epoch,
          missionId: brain.lastCommittedMission.missionId
        });
      }
      return;
    }
    if (simTime < plan.nextTxAt) return;
    const senderPose = composeSenderPose(century);
    if (plan.status === PLAN_STATUS.PROPOSED && pending?.scope === 'team') {
      const sent = dispatchCenturionMessage(century, MESSAGE_KIND.PLAN_PROPOSAL, {
        senderPose,
        mission: pending,
        standardCode: brain.standard.code
      });
      plan.nextTxAt = simTime + (sent ? 2.2 : 0.65);
      plan.retries++;
      return;
    }
    if (plan.status === PLAN_STATUS.RECEIVED && pending?.scope === 'team') {
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
    if (plan.status === PLAN_STATUS.ACKNOWLEDGED && pending?.scope === 'team' &&
        century.id === plan.coordinatorId) {
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
      activateMission(century, mission, 'plan-acknowledged');
      brain.plan.nextTxAt = simTime + 2.2;
      return;
    }
    if (plan.status === PLAN_STATUS.COMMITTED && century.id === plan.coordinatorId &&
        brain.lastCommittedMission?.scope === 'team' && simTime - plan.committedAt < 7.5) {
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
      event: 'delivered',
      messageId: courier.id,
      senderId: courier.senderId,
      receiverId: courier.receiverId,
      kind: courier.packet.kind,
      delivery
    });
    return true;
  }

  function deliverGeneralCommand(courier, receiver) {
    if (!receiver || receiver.muted || !receiver.centurion.alive ||
        simTime > courier.packet.expiresAt) return false;
    receiver.brain.commandInbox.push(copyPacket(courier.packet));
    logCommunication({
      event: 'general-order-delivered',
      messageId: courier.id,
      senderId: courier.senderId,
      receiverId: courier.receiverId,
      kind: courier.packet.command,
      delivery: 'runner'
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

  function createPhysicalRunner({ id, team, publicMark, centuryId, senderId,
    receiverId, packet, x, z, targetX, targetZ, channel, originX, originZ }) {
    const unitProfile = resolveUnitProfile(config.unitProfiles, team,
      centuryId || receiverId, id);
    const profile = createActorProfile({
      seed: config.seed,
      actorKey: stableNumericKey(id),
      profileId: `profile-${id}`,
      kind: 'runner',
      unitProfile
    });
    const capabilities = deriveCapabilities(profile);
    const runner = attachCondition({
      id,
      kind: 'runner',
      team,
      publicMark,
      centuryId,
      senderId,
      receiverId,
      packet,
      channel,
      mode: channel === 'general' ? 'general-runner' : 'runner',
      phase: 'outbound',
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
      publicState: 'runner',
      targetX,
      targetZ,
      originX,
      originZ,
      issuedAt: simTime,
      expiresAt: packet.expiresAt,
      deliverySucceeded: false
    }, { hp: 0.8 * capabilities.body.health, morale: 1, fatigue: 0 });
    runner.searchSerial = 0;
    runner.searchKey = [...`${senderId}|${receiverId}|${packet.serial}`]
      .reduce((sum, character) => sum + character.charCodeAt(0), 0);
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
      sender.brain.communicationState = 'voice-busy';
      logCommunication({ event: 'withheld', senderId: sender.id,
        receiverId: receiver.id, kind, mode: 'voice-busy' });
      return false;
    }
    if (!useVoice && couriers.some(courier => courier.channel === 'centurion' &&
        courier.senderId === sender.id && courier.phase !== 'complete')) {
      sender.brain.communicationState = 'runner-busy';
      logCommunication({ event: 'withheld', senderId: sender.id,
        receiverId: receiver.id, kind, mode: 'runner-busy' });
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
        mode: 'voice',
        channel: 'centurion',
        arrivalAt: simTime + TUNING.directMessageDelay + perceivedDistance / 65,
        expiresAt: packet.expiresAt,
        x: sender.centurion.x,
        z: sender.centurion.z,
        targetX: receiver.centurion.x,
        targetZ: receiver.centurion.z
      };
      couriers.push(inFlight);
      sender.brain.communicationState = 'voice';
      sender.brain.voiceAvailableAt = simTime +
        ([MESSAGE_KIND.PLAN_PROPOSAL, MESSAGE_KIND.PLAN_COMMIT].includes(kind) ? .85 : .52);
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
        channel: 'centurion',
        originX: sender.centurion.x,
        originZ: sender.centurion.z
      });
      sender.brain.communicationState = 'runner';
    }
    logCommunication({ event: 'dispatched', senderId: sender.id,
      receiverId: receiver.id, kind, mode: sender.brain.communicationState });
    return true;
  }

  function serviceGeneralCommandQueue() {
    for (let index = 0; index < generalCommandQueue.length;) {
      const queued = generalCommandQueue[index];
      if (simTime > queued.packet.expiresAt) {
        logCommunication({ event: 'expired-in-queue',
          senderId: `general-${centuryById(queued.receiverId)?.team || 'unknown'}`,
          receiverId: queued.receiverId,
          kind: queued.packet.command,
          mode: 'general-queue' });
        generalCommandQueue.splice(index, 1);
        continue;
      }
      const active = couriers.some(courier => courier.channel === 'general' &&
        courier.receiverId === queued.receiverId && courier.phase !== 'complete');
      if (active) { index++; continue; }
      const receiver = centuryById(queued.receiverId);
      if (!receiver) { generalCommandQueue.splice(index, 1); continue; }
      const post = generalPosts[receiver.team];
      const estimate = queued.targetEstimate || receiver.deploymentAnchor;
      createPhysicalRunner({
        id: `runner-general-${receiver.id}-${queued.packet.serial}`,
        team: receiver.team,
        publicMark: null,
        centuryId: `general-${receiver.team}`,
        senderId: `general-${receiver.team}`,
        receiverId: receiver.id,
        packet: queued.packet,
        x: post.x,
        z: post.z,
        targetX: estimate.x,
        targetZ: estimate.z,
        channel: 'general',
        originX: post.x,
        originZ: post.z
      });
      logCommunication({ event: 'general-order-dispatched', senderId: `general-${receiver.team}`,
        receiverId: receiver.id, kind: queued.packet.command, mode: 'runner' });
      generalCommandQueue.splice(index, 1);
    }
  }

  function removeCourier(index) {
    const courier = couriers[index];
    if (courier && courier.kind === 'runner') bodyById.delete(courier.id);
    couriers.splice(index, 1);
  }

  function updateCouriers(dt) {
    for (let index = couriers.length - 1; index >= 0; index--) {
      const courier = couriers[index];
      const receiver = centuryById(courier.receiverId);
      if (simTime > courier.expiresAt || (courier.kind === 'runner' && !courier.alive)) {
        logCommunication({ event: 'expired', messageId: courier.id,
          senderId: courier.senderId, receiverId: courier.receiverId,
          kind: courier.packet.kind || courier.packet.command, mode: courier.mode });
        removeCourier(index);
        continue;
      }
      if (courier.mode === 'voice') {
        if (simTime >= courier.arrivalAt) {
          const physicallyAudible = receiver?.centurion.alive &&
            distance(courier, receiver.centurion) <= TUNING.officerVoice + 0.8;
          if (physicallyAudible) deliverCenturionPacket(courier, receiver, 'voice');
          else logCommunication({ event: 'unheard', messageId: courier.id,
            senderId: courier.senderId, receiverId: courier.receiverId,
            kind: courier.packet.kind, mode: 'voice' });
          removeCourier(index);
        }
        continue;
      }

      const returningToGeneral = courier.phase === 'return' && courier.channel === 'general';
      const returnSender = courier.phase === 'return' && courier.channel === 'centurion'
        ? centuryById(courier.senderId) : null;
      const targetOfficer = courier.phase === 'outbound' ? receiver?.centurion : returnSender?.centurion;
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

      if (courier.phase === 'outbound' && targetOfficer?.alive &&
          distance(courier, targetOfficer) <= 2.2) {
        courier.deliverySucceeded = courier.channel === 'general'
          ? deliverGeneralCommand(courier, receiver)
          : deliverCenturionPacket(courier, receiver, 'runner');
        courier.phase = 'return';
        courier.mode = courier.channel === 'general' ? 'general-return' : 'runner-return';
        courier.targetX = courier.originX;
        courier.targetZ = courier.originZ;
      } else if (courier.phase === 'return') {
        const reachedReturn = returningToGeneral
          ? distance(courier, targetPost) <= 2.2
          : targetOfficer?.alive && distance(courier, targetOfficer) <= 2.2;
        if (reachedReturn) {
          if (returnSender) {
            returnSender.brain.runnerReturnedAt = simTime;
            returnSender.brain.communicationState = courier.deliverySucceeded
              ? 'runner-returned' : 'runner-failed';
          }
          removeCourier(index);
          continue;
        }
      }

      const liveTargetDistance = targetOfficer?.alive ? distance(courier, targetOfficer) : Infinity;
      if (remaining < 0.3 && liveTargetDistance > runnerSight && !targetPost) {
        const turn = 0.31 + hash01(config.seed, courier.searchKey,
          courier.searchSerial++, tick) * 0.22;
        courier.heading = wrapAngle(courier.heading + Math.PI * turn);
        courier.targetX = courier.x + Math.sin(courier.heading) * 7;
        courier.targetZ = courier.z + Math.cos(courier.heading) * 7;
      }
    }
    // Dispatch queued general acts only after the prior in-flight set has
    // moved/delivered. A runner created this tick cannot also deliver in it.
    serviceGeneralCommandQueue();
  }

  function usableEnemyTracks(century) {
    return [...century.brain.enemyTracks.values()].filter(track =>
      track.contactClass === 'formation' && track.confidence >= 0.12 &&
      simTime - track.observedAt <= 12);
  }

  function bestEnemyTrack(century, candidates = usableEnemyTracks(century)) {
    const center = currentCenturyCenter(century);
    let best = null;
    let bestScore = -Infinity;
    for (const track of candidates) {
      const range = distance(center, track);
      const score = track.confidence * 2.5 + Math.min(1, track.strengthEstimate / 20) - range / 120;
      if (score > bestScore) { bestScore = score; best = track; }
    }
    return best;
  }

  function assessFlankThreat(century, tracks, heading) {
    const center = currentCenturyCenter(century);
    const halfWidth = formationHalfWidth(century.plan);
    const targetGap = halfWidth * 2 + TUNING.centuryGap;
    let best = null;
    let bestScore = -Infinity;
    for (const track of tracks) {
      if (track.confidence < 0.18) continue;
      const local = localFromWorld(center, heading, track);
      const lateralSign = Math.sign(local.lateral);
      const range = distance(center, track);
      const outer = lateralSign === century.outerLateralSign;
      const outerExposed = outer && Math.abs(local.lateral) > halfWidth + 6 &&
        local.depth > -9 && range < 42;
      const seamPenetration = lateralSign === -century.outerLateralSign &&
        Math.abs(local.lateral) > halfWidth + 1.3 &&
        Math.abs(local.lateral) < targetGap * 0.78 && local.depth > -6 && range < 28;
      if (!outerExposed && !seamPenetration) continue;
      const threatKind = seamPenetration ? 'seam-penetration' : 'outer-flank';
      const score = track.confidence * 2.2 + Math.min(1.4, Math.abs(local.lateral) / 16) -
        range / 70 + (seamPenetration ? 0.35 : 0);
      if (score <= bestScore) continue;
      bestScore = score;
      best = {
        threatKind,
        side: local.lateral < 0 ? 'negative-lateral' : 'positive-lateral',
        lateralSign: lateralSign || century.outerLateralSign,
        x: track.x,
        z: track.z,
        confidence: track.confidence,
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
      strengthBand: track.strengthEstimate < 10 ? 'few' :
        track.strengthEstimate < 25 ? 'body' : 'many',
      width: quantize(track.width, 3),
      ageBand: simTime - track.observedAt < 2 ? 'fresh' :
        simTime - track.observedAt < 6 ? 'recent' : 'stale'
    };
  }

  function sendPeriodicCenturionReport(century, track) {
    const brain = century.brain;
    brain.reportT -= TUNING.centurionThink;
    const warningTrack = brain.flankThreat
      ? brain.enemyTracks.get(brain.flankThreat.trackId) || null
      : null;
    const reportedTrack = warningTrack || track;
    const threatKey = brain.flankThreat
      ? `${brain.flankThreat.threatKind}:${brain.flankThreat.side}`
      : 'none';
    const standardKey = `${brain.standard.code}:${brain.standard.epoch}`;
    const strengthBand = reportedTrack
      ? reportedTrack.strengthEstimate < 10 ? 'few' :
        reportedTrack.strengthEstimate < 25 ? 'body' : 'many'
      : null;
    const contactChanged = reportedTrack
      ? !brain.lastReportedContact ||
        distance(reportedTrack, brain.lastReportedContact) > 6 ||
        strengthBand !== brain.lastReportedContact.strengthBand
      : brain.lastReportedContact !== null;
    const reportChanged = brain.lastReportedState !== brain.state ||
      brain.lastReportedThreat !== threatKey || brain.lastReportedStandard !== standardKey ||
      contactChanged;
    if (brain.reportT > 0 && !reportChanged) return;
    if (brain.communicationState === 'runner-returned' &&
        simTime - brain.runnerReturnedAt < 3 && !brain.flankThreat &&
        brain.state !== CENTURION_STATE.WITHDRAW) {
      brain.reportT = Math.max(brain.reportT, 0.45);
      return;
    }
    const payload = {
      senderPose: composeSenderPose(century),
      state: brain.state,
      confidence: reportedTrack ? reportedTrack.confidence : 0.7,
      contact: composeContactPayload(century, reportedTrack),
      flank: brain.flankThreat ? brain.flankThreat.side : null,
      threatKind: brain.flankThreat?.threatKind || null,
      strengthBand: brain.perceivedOwn < century.initialStrength * .35 ? 'low' :
        brain.perceivedOwn < century.initialStrength * .72 ? 'reduced' : 'sound',
      cohesionBand: brain.perceivedCohesion < .4 ? 'broken' :
        brain.perceivedCohesion < .72 ? 'loose' : 'formed',
      standardCode: brain.standard.code
    };
    let kind = track ? MESSAGE_KIND.CONTACT_REPORT : MESSAGE_KIND.LINE_REPORT;
    if (brain.flankThreat) kind = MESSAGE_KIND.FLANK_WARNING;
    else if (brain.standard.code === STANDARD_CODE.DRAW) kind = MESSAGE_KIND.FEINT_PHASE;
    else if (brain.state === CENTURION_STATE.WITHDRAW) kind = MESSAGE_KIND.WITHDRAW;
    else if (brain.state === CENTURION_STATE.SUPPORT_ALLY) kind = MESSAGE_KIND.SUPPORT_REQUEST;
    const sent = dispatchCenturionMessage(century, kind, payload);
    brain.lastReportedState = brain.state;
    brain.lastReportedThreat = threatKey;
    brain.lastReportedStandard = standardKey;
    brain.lastReportedContact = reportedTrack
      ? { x: reportedTrack.x, z: reportedTrack.z, strengthBand }
      : null;
    if (sent) {
      const tacticallyActive = ![CENTURION_STATE.HOLD, CENTURION_STATE.BAIT_WAIT,
        CENTURION_STATE.COVER_FEINT].includes(brain.state);
      const baseCadence = brain.flankThreat ? 1.4 : reportedTrack ?
        (tacticallyActive ? 4 : 12) :
        (brain.perceivedCohesion < .72 || brain.state === CENTURION_STATE.SUPPORT_ALLY) ? 5.5 : 11;
      const channelFloor = brain.communicationState === 'runner' ? 12 : 0;
      const commandCadence = century.centurion.capabilities.command.reportCadence;
      brain.reportT = Math.max(baseCadence * commandCadence, channelFloor) +
        agentRandom(config.seed, century.index,
          century.team === TEAM.BLUE ? 0x291 : 0x292, Math.floor(simTime)) * 1.2;
    } else {
      brain.reportT = 0.65;
    }
  }

  function setCenturionState(century, state, reason) {
    const brain = century.brain;
    if (brain.state === state) return false;
    brain.state = state;
    brain.lastReason = reason;
    return true;
  }

  function publishCenturyOrder(century, movement, heading, cadence, reason) {
    if (!century.centurion.alive) return null;
    const command = century.centurion.capabilities.command;
    const packet = deepFreeze({
      centuryMark: century.standard,
      seq: ++century.orderSerial,
      kind: 'century-order',
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
    if ([CENTURION_STATE.WITHDRAW, CENTURION_STATE.ROUTED,
      CENTURION_STATE.FEINT_RETIRE].includes(state)) return 'retire';
    if ([CENTURION_STATE.HOLD, CENTURION_STATE.BAIT_WAIT, CENTURION_STATE.COVER_FEINT,
      CENTURION_STATE.GUARD_FLANK].includes(state)) return 'hold';
    if ([CENTURION_STATE.COUNTER, CENTURION_STATE.FIX_ENEMY].includes(state)) return 'counter';
    return 'advance';
  }

  function constrainToZone(century, center, velocity) {
    const zone = century.holdZone;
    if (!zone || !zone.enabled) return velocity;
    const dx = center.x - zone.x;
    const dz = center.z - zone.z;
    const d = Math.hypot(dx, dz);
    const softEdge = zone.radius * 0.72;
    if (d <= softEdge) return velocity;
    const inward = normalize2({ x: -dx, z: -dz });
    const pressure = clamp((d - softEdge) / Math.max(1, zone.radius - softEdge), 0, 1.8);
    return {
      x: velocity.x + inward.x * (0.55 + pressure * 0.75),
      z: velocity.z + inward.z * (0.55 + pressure * 0.75)
    };
  }

  function applyLineCoordination(century, center, velocity) {
    const brain = century.brain;
    const ally = brain.allyTrack;
    if (!ally || ally.confidence < 0.15) {
      brain.lineDepthError = 0;
      brain.lineGapError = 0;
      return velocity;
    }
    const age = simTime - ally.observedAt;
    const estimated = { x: ally.x + ally.vx * age, z: ally.z + ally.vz * age };
    const teamHeading = TEAM_DOCTRINE[century.team].forwardHeading;
    const local = localFromWorld(center, teamHeading, estimated);
    const targetGap = formationHalfWidth(century.plan) * 2 + TUNING.centuryGap;
    const gap = Math.abs(local.lateral);
    brain.lineDepthError = local.depth;
    brain.lineGapError = gap - targetGap;
    const forward = forwardOf(teamHeading);
    const lateral = lateralOf(teamHeading);
    let x = velocity.x;
    let z = velocity.z;
    const allyDetached = brain.plan.role === TACTICAL_ROLE.FIX &&
      brain.plan.allyRole === TACTICAL_ROLE.FLANK &&
      simTime - ally.observedAt < 3.2 &&
      [CENTURION_STATE.STAGE_FLANK, CENTURION_STATE.MANEUVER_FLANK]
        .includes(ally.publicState);
    if (allyDetached) {
      return { x, z };
    }
    const detachedManeuver = brain.plan.role === TACTICAL_ROLE.FLANK &&
      [CENTURION_STATE.STAGE_FLANK, CENTURION_STATE.MANEUVER_FLANK].includes(brain.state);
    const ambushManeuver = brain.plan.role === TACTICAL_ROLE.COVER &&
      brain.state === CENTURION_STATE.AMBUSH_STRIKE;
    if (detachedManeuver || ambushManeuver) {
      const supportDistance = distance(center, estimated);
      if (supportDistance > 31) {
        const towardAlly = normalize2({ x: estimated.x - center.x, z: estimated.z - center.z });
        const correction = clamp((supportDistance - 31) * .045, 0, .48) * ally.confidence;
        x += towardAlly.x * correction;
        z += towardAlly.z * correction;
      }
      return { x, z };
    }
    if (Math.abs(brain.lineDepthError) > TUNING.lineDepthTolerance) {
      const correction = clamp(brain.lineDepthError * 0.055, -0.42, 0.42) * ally.confidence;
      x += forward.x * correction;
      z += forward.z * correction;
    }
    if (Math.abs(brain.lineGapError) > TUNING.lineGapTolerance) {
      // Positive gap error closes toward the ally; negative opens away.
      const towardAlly = Math.sign(local.lateral) || -century.outerLateralSign;
      const correction = clamp(brain.lineGapError * 0.045, -0.34, 0.34) * ally.confidence;
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
    brain.thinkT += TUNING.centurionThink *
      (0.90 + agentRandom(config.seed, century.index,
        century.team === TEAM.BLUE ? 0x2a1 : 0x2a2, tick) * 0.20);

    processGeneralCommandInbox(century);
    processCenturionInbox(century);
    updateEnemyTracks(century, sensed.enemyObservations);
    updateIndividualContacts(century, sensed.individualObservations, mindDt);
    updateAllyTrackFromObservation(century, sensed.allyObservation);
    if (brain.allyTrack && simTime - brain.allyTrack.observedAt < 1 &&
        brain.allyTrack.standardEpoch === brain.plan.epoch) {
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
    const contact = bestEnemyTrack(century, usableTracks);
    brain.contactConfidence = contact ? contact.confidence : 0;
    const teamHeading = TEAM_DOCTRINE[century.team].forwardHeading;
    const contactHeading = contact ? headingTo(center, contact) : teamHeading;
    const contactRange = contact ? distance(center, contact) : Infinity;
    brain.gazeHeading = contact && contact.confidence > 0.12
      ? contactHeading
      : wrapAngle(teamHeading + Math.sin(simTime * 0.55 + brain.scanPhase) * 1.12);
    const priorFlankThreat = brain.flankThreat;
    const assessedFlankThreat = assessFlankThreat(century, usableTracks, teamHeading);
    if (assessedFlankThreat) {
      brain.flankThreat = assessedFlankThreat;
      brain.flankThreatUntil = simTime + 3.2;
    } else if (priorFlankThreat && simTime < brain.flankThreatUntil) {
      const rememberedTrack = usableTracks.find(track => track.id === priorFlankThreat.trackId);
      brain.flankThreat = rememberedTrack
        ? { ...priorFlankThreat, x: rememberedTrack.x, z: rememberedTrack.z,
            confidence: rememberedTrack.confidence }
        : { ...priorFlankThreat, confidence: priorFlankThreat.confidence * 0.94 };
    } else {
      brain.flankThreat = null;
    }

    let desiredHeading = contact ? contactHeading : teamHeading;
    let desiredVelocity = { x: 0, z: 0 };
    let stateChanged = false;
    const teamForward = forwardOf(teamHeading);
    const teamBack = { x: -teamForward.x, z: -teamForward.z };
    const officerNerve = officer.capabilities.morale.stability;
    const hardLoss = strengthRatio < clamp(0.24 / officerNerve, 0.20, 0.29) || !officer.alive;
    const allyWithdraw = brain.supportRequest?.kind === 'withdraw';
    const withdrawalTrigger = hardLoss ||
      brain.perceivedMorale < clamp(0.22 / officerNerve, 0.18, 0.27) || allyWithdraw;
    if (withdrawalTrigger) {
      brain.withdrawUntil = brain.state === CENTURION_STATE.WITHDRAW
        ? Math.max(brain.withdrawUntil, simTime + 1)
        : simTime + 8;
    }
    const withdrawalLatched = brain.state === CENTURION_STATE.WITHDRAW &&
      simTime < brain.withdrawUntil;
    const recentDrawKnown = (brain.feintSignalEpoch === brain.plan.epoch &&
      brain.feintSignalUntil > simTime) ||
      (brain.allyTrack?.standardCode === STANDARD_CODE.DRAW &&
        brain.allyTrack.standardEpoch === brain.plan.epoch &&
        simTime - brain.allyTrack.observedAt < 2.5);
    const directFreshForFeint = contact && contact.confidence > .30 &&
      simTime - (contact.lastDirectAt ?? -Infinity) < 4.2;
    const coverSpringReady = century.posture === POSTURE.DEFENSIVE_FEINT &&
      brain.plan.role === TACTICAL_ROLE.COVER && recentDrawKnown &&
      directFreshForFeint && contactRange < 24;
    const flankWarningNeedsSupport = brain.supportRequest?.kind === 'flank' &&
      (brain.supportRequest.threatKind === 'seam-penetration' ||
        brain.plan.role !== TACTICAL_ROLE.BAIT);
    const shouldSupportAlly = !coverSpringReady &&
      (brain.supportRequest?.kind === 'support' || flankWarningNeedsSupport);

    if (withdrawalTrigger || withdrawalLatched) {
      stateChanged = setCenturionState(century, CENTURION_STATE.WITHDRAW,
        hardLoss ? 'perceived-heavy-loss' : allyWithdraw ? 'ally-withdraw-report' :
          withdrawalTrigger ? 'morale-collapse' : 'withdrawal-commitment');
      desiredHeading = wrapAngle(teamHeading + Math.PI);
      desiredVelocity = { x: teamBack.x * TUNING.withdrawSpeed, z: teamBack.z * TUNING.withdrawSpeed };
    } else if (brain.flankThreat && !coverSpringReady) {
      const seamThreat = brain.flankThreat.threatKind === 'seam-penetration';
      stateChanged = setCenturionState(century, CENTURION_STATE.GUARD_FLANK,
        seamThreat ? 'seam-penetration-contact' : 'outer-flank-contact');
      const threatHeading = headingTo(center, brain.flankThreat);
      desiredHeading = wrapAngle(teamHeading + clamp(angleDifference(threatHeading, teamHeading), -0.72, 0.72));
      if (seamThreat) {
        const towardThreat = normalize2({
          x: brain.flankThreat.x - center.x,
          z: brain.flankThreat.z - center.z
        });
        desiredVelocity = {
          x: towardThreat.x * 0.40 + teamBack.x * 0.06,
          z: towardThreat.z * 0.40 + teamBack.z * 0.06
        };
      } else {
        const outward = lateralOf(teamHeading);
        desiredVelocity = {
          x: teamBack.x * 0.16 + outward.x * brain.flankThreat.lateralSign * 0.32,
          z: teamBack.z * 0.16 + outward.z * brain.flankThreat.lateralSign * 0.32
        };
      }
    } else if (shouldSupportAlly) {
      stateChanged = setCenturionState(century, CENTURION_STATE.SUPPORT_ALLY, 'ally-request');
      const supportPoint = Number.isFinite(brain.supportRequest.x)
        ? brain.supportRequest : brain.allyTrack;
      if (supportPoint) {
        const toward = normalize2({ x: supportPoint.x - center.x, z: supportPoint.z - center.z });
        desiredVelocity = { x: toward.x * 0.52, z: toward.z * 0.52 };
        desiredHeading = contact ? contactHeading : headingTo(center, supportPoint);
      }
    } else if (century.posture === POSTURE.AGGRESSIVE) {
      const role = brain.plan.role;
      if (role === TACTICAL_ROLE.FIX) {
        const fixRange = brain.state === CENTURION_STATE.FIX_ENEMY ? 11 : 9.5;
        if (contact && contactRange < fixRange) {
          stateChanged = setCenturionState(century, CENTURION_STATE.FIX_ENEMY, 'fixing-contact');
          const pressure = forwardOf(contactHeading);
          const speed = contactRange < 4.5 ? 0.10 : 0.28;
          desiredVelocity = { x: pressure.x * speed, z: pressure.z * speed };
          if (contact.confidence > .42 && (contact.directHits || 0) >= 2) {
            raiseStandard(century, STANDARD_CODE.FIXED, 2.4, brain.plan.epoch);
            brain.fixSignalUntil = simTime + 2.4;
            brain.fixSignalEpoch = brain.plan.epoch;
            brain.fixSignalEvidenceAt = simTime;
          }
        } else {
          stateChanged = setCenturionState(century, CENTURION_STATE.ADVANCE,
            contact ? 'fix-line-closing' : 'fix-line-seek-contact');
          const direction = forwardOf(contact ? contactHeading : teamHeading);
          desiredVelocity = { x: direction.x * .76, z: direction.z * .76 };
        }
      } else {
        const outward = lateralOf(teamHeading);
        const fixedKnown = (brain.fixSignalEpoch === brain.plan.epoch &&
          brain.fixSignalUntil > simTime) ||
          (brain.allyTrack?.standardCode === STANDARD_CODE.FIXED &&
            brain.allyTrack.standardEpoch === brain.plan.epoch &&
            simTime - brain.allyTrack.observedAt < 2.5);
        const directFresh = contact && contact.confidence > .34 &&
          simTime - (contact.lastDirectAt ?? -Infinity) < 3.5 && (contact.directHits || 0) >= 2;
        if (fixedKnown && directFresh) brain.flankCommitEpoch = brain.plan.epoch;
        const flankCommitted = brain.flankCommitEpoch === brain.plan.epoch;
        if (flankCommitted && directFresh) {
          stateChanged = setCenturionState(century, CENTURION_STATE.MANEUVER_FLANK,
            'fixed-signal-and-direct-track');
          const flankOffset = formationHalfWidth(century.plan) + 7.5;
          const flankPoint = {
            x: contact.x + outward.x * century.outerLateralSign * flankOffset - teamForward.x * 2,
            z: contact.z + outward.z * century.outerLateralSign * flankOffset - teamForward.z * 2
          };
          const toward = normalize2({ x: flankPoint.x - center.x, z: flankPoint.z - center.z });
          desiredVelocity = { x: toward.x * .92, z: toward.z * .92 };
          desiredHeading = contactHeading;
        } else {
          stateChanged = setCenturionState(century, CENTURION_STATE.STAGE_FLANK,
            fixedKnown ? 'await-direct-reacquisition' : 'stage-until-fixed');
          const forwardSpeed = contact ? .48 : .62;
          const ally = brain.allyTrack;
          let stageLateralSpeed = 0;
          if (ally && ally.confidence >= .15 && simTime - ally.observedAt <= 3.2) {
            const allyAge = simTime - ally.observedAt;
            const estimatedAlly = {
              x: ally.x + ally.vx * allyAge,
              z: ally.z + ally.vz * allyAge
            };
            const perceivedGap = Math.abs(
              localFromWorld(center, teamHeading, estimatedAlly).lateral
            );
            const stageGap = formationHalfWidth(century.plan) * 2 +
              TUNING.centuryGap + 5;
            stageLateralSpeed = clamp((stageGap - perceivedGap) * .12, -.32, .32);
          }
          desiredVelocity = {
            x: teamForward.x * forwardSpeed +
              outward.x * century.outerLateralSign * stageLateralSpeed,
            z: teamForward.z * forwardSpeed +
              outward.z * century.outerLateralSign * stageLateralSpeed
          };
          desiredHeading = contact ? contactHeading : teamHeading;
        }
      }
    } else if (century.posture === POSTURE.HOLD) {
      const counterRange = brain.state === CENTURION_STATE.COUNTER ? 16 : 13.5;
      const counterEngaged = contactRange < counterRange;
      stateChanged = setCenturionState(century,
        counterEngaged ? CENTURION_STATE.COUNTER : CENTURION_STATE.HOLD,
        counterEngaged ? 'local-counterpressure' : 'hold-ground');
      const anchor = century.holdZone?.enabled ? century.holdZone : century.fallbackAnchor;
      const toAnchor = { x: anchor.x - center.x, z: anchor.z - center.z };
      const anchorDistance = Math.hypot(toAnchor.x, toAnchor.z);
      if (anchorDistance > 0.8) {
        const toward = normalize2(toAnchor);
        const speed = Math.min(TUNING.holdRepositionSpeed, anchorDistance * 0.18);
        desiredVelocity = { x: toward.x * speed, z: toward.z * speed };
      } else if (counterEngaged) {
        const pressure = forwardOf(contactHeading);
        desiredVelocity = { x: pressure.x * TUNING.counterSpeed, z: pressure.z * TUNING.counterSpeed };
      }
    } else {
      const role = brain.plan.role;
      const anchor = century.holdZone?.enabled ? century.holdZone : century.fallbackAnchor;
      const directFresh = directFreshForFeint;
      if (role === TACTICAL_ROLE.BAIT) {
        const feintComplete = brain.feintCompletedEpoch === brain.plan.epoch;
        if (feintComplete) {
          stateChanged = setCenturionState(century, CENTURION_STATE.BAIT_WAIT,
            'feint-complete-hold');
          const holdPoint = brain.feintHoldPoint || center;
          const toward = normalize2({ x: holdPoint.x - center.x, z: holdPoint.z - center.z },
            { x: 0, z: 0 });
          const d = distance(center, holdPoint);
          desiredVelocity = d > .7
            ? { x: toward.x * Math.min(.32, d * .14), z: toward.z * Math.min(.32, d * .14) }
            : { x: 0, z: 0 };
        } else if (brain.feintRetreatStart) {
          const retired = distance(center, brain.feintRetreatStart);
          stateChanged = setCenturionState(century, CENTURION_STATE.FEINT_RETIRE,
            'committed-feint-retirement');
          raiseStandard(century, STANDARD_CODE.DRAW, 2.4, brain.plan.epoch);
          brain.feintSignalUntil = simTime + 2.4;
          brain.feintSignalEpoch = brain.plan.epoch;
          brain.feintSignalEvidenceAt = simTime;
          const retreat = normalize2({ x: anchor.x - center.x, z: anchor.z - center.z }, teamBack);
          const anchorDistance = distance(center, anchor);
          const finished = retired >= 8 || anchorDistance < .7;
          const speed = finished ? 0 : .72;
          desiredVelocity = { x: retreat.x * speed, z: retreat.z * speed };
          if (finished) {
            brain.feintCompletedEpoch = brain.plan.epoch;
            brain.feintHoldPoint = { ...center };
            brain.feintRetreatStart = null;
          }
        } else if (!directFresh || contactRange > 32) {
          stateChanged = setCenturionState(century, CENTURION_STATE.BAIT_WAIT,
            'bait-waits-for-perceived-contact');
          const toward = normalize2({ x: anchor.x - center.x, z: anchor.z - center.z }, { x: 0, z: 0 });
          const d = distance(center, anchor);
          desiredVelocity = d > .8
            ? { x: toward.x * Math.min(.42, d * .16), z: toward.z * Math.min(.42, d * .16) }
            : { x: 0, z: 0 };
        } else if (contactRange > 13) {
          stateChanged = setCenturionState(century, CENTURION_STATE.FEINT_OUT,
            'contact-triggered-bait-probe');
          const direction = forwardOf(contactHeading);
          desiredVelocity = { x: direction.x * .52, z: direction.z * .52 };
        } else {
          if (!brain.feintRetreatStart) brain.feintRetreatStart = { ...center };
          stateChanged = setCenturionState(century, CENTURION_STATE.FEINT_RETIRE,
            'enemy-crossed-bait-trigger');
          raiseStandard(century, STANDARD_CODE.DRAW, 2.4, brain.plan.epoch);
          brain.feintSignalUntil = simTime + 2.4;
          brain.feintSignalEpoch = brain.plan.epoch;
          brain.feintSignalEvidenceAt = simTime;
          const retreat = normalize2({ x: anchor.x - center.x, z: anchor.z - center.z }, teamBack);
          desiredVelocity = { x: retreat.x * .72, z: retreat.z * .72 };
        }
      } else {
        const drawKnown = recentDrawKnown;
        if (drawKnown && directFresh && contactRange < 24) {
          stateChanged = setCenturionState(century, CENTURION_STATE.AMBUSH_STRIKE,
            'draw-signal-and-direct-track');
          const outward = lateralOf(teamHeading);
          const strikePoint = {
            x: contact.x + outward.x * century.outerLateralSign * 6,
            z: contact.z + outward.z * century.outerLateralSign * 6
          };
          const toward = normalize2({ x: strikePoint.x - center.x, z: strikePoint.z - center.z });
          desiredVelocity = { x: toward.x * .86, z: toward.z * .86 };
          desiredHeading = contactHeading;
        } else {
          stateChanged = setCenturionState(century, CENTURION_STATE.COVER_FEINT,
            drawKnown ? 'cover-awaits-direct-contact' : 'cover-holds-for-draw-signal');
          const toward = normalize2({ x: anchor.x - center.x, z: anchor.z - center.z }, { x: 0, z: 0 });
          const d = distance(center, anchor);
          desiredVelocity = d > .8
            ? { x: toward.x * Math.min(.42, d * .14), z: toward.z * Math.min(.42, d * .14) }
            : { x: 0, z: 0 };
        }
      }
    }

    desiredVelocity = applyLineCoordination(century, center, desiredVelocity);
    desiredVelocity = constrainToZone(century, center, desiredVelocity);
    desiredVelocity = boundaryCorrection(center, desiredVelocity);
    const desiredSpeed = Math.hypot(desiredVelocity.x, desiredVelocity.z);
    const officerSpeedCap = TUNING.centurionMaxSpeed * officer.capabilities.movement.speed;
    if (desiredSpeed > officerSpeedCap) {
      desiredVelocity.x *= officerSpeedCap / desiredSpeed;
      desiredVelocity.z *= officerSpeedCap / desiredSpeed;
    }
    brain.desiredHeading = desiredHeading;
    brain.desiredVelocity = desiredVelocity;
    officer.publicState = brain.state;

    sendPeriodicCenturionReport(century, contact);
    if (stateChanged || brain.orderT <= 0) {
      brain.orderT = TUNING.orderCadence * officer.capabilities.command.orderCadence;
      publishCenturyOrder(century, movementForState(brain.state), desiredHeading,
        desiredSpeed, brain.lastReason);
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
      officer.heading = rotateToward(officer.heading, century.brain.desiredHeading,
        3.4 * officer.capabilities.movement.turn * dt);
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
      if (call.publicMark !== soldier.publicMark || !cue || simTime > cue.expiresAt ||
          (cue.relayHops || 0) >= 8) continue;
      const relayHops = call.source === 'officer-voice'
        ? 0
        : (cue.relayHops || 0) + 1;
      if (!heard || cue.seq > heard.seq ||
          (cue.seq === heard.seq && relayHops < (heard.relayHops || 0))) {
        heard = { ...cue, relayHops };
      }
    }
    for (const observation of percept.nearby) {
      if (observation.team !== soldier.team || observation.publicMark !== soldier.publicMark) continue;
      if (observation.kind === 'centurion') {
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
      if (observation.publicGuideCue &&
          simTime <= observation.publicGuideCue.expiresAt &&
          (observation.publicGuideCue.relayHops || 0) < 8 &&
          (!heardGuide || observation.publicGuideCue.observedAt > heardGuide.observedAt)) {
        heardGuide = { ...observation.publicGuideCue,
          relayHops: (observation.publicGuideCue.relayHops || 0) + 1 };
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
        TUNING.orderComprehension, soldier.capabilities, heard.commandClarity || 1);
      soldier.orderCallT = 0;
    }
    if (soldier.guideTrack) {
      decayTrackConfidence(soldier.guideTrack,
        8.5 * soldier.capabilities.formation.guideMemory, TUNING.soldierThink);
      const deliberatelyCallsGuide = soldier.publicState !== SOLDIER_STATE.ROUTE &&
        soldier.doctrine.relayDuty &&
        soldier.guideTrack.relayHops < 8 && soldier.guideCallT <= 0 &&
        soldier.privateOrder && simTime >= soldier.orderUnderstoodAt &&
        simTime <= soldier.privateOrder.expiresAt;
      soldier.nextGuideCue = deliberatelyCallsGuide ? deepFreeze({
        kind: 'guide-call',
        x: quantize(soldier.guideTrack.x, 0.25),
        z: quantize(soldier.guideTrack.z, 0.25),
        heading: quantize(soldier.guideTrack.heading, Math.PI / 36),
        confidence: soldier.guideTrack.confidence,
        observedAt: soldier.guideTrack.observedAt,
        relayHops: soldier.guideTrack.relayHops,
        expiresAt: simTime + 0.72
      }) : null;
      if (deliberatelyCallsGuide) {
        soldier.guideCallT = .72 * soldier.capabilities.formation.relayInterval;
      }
    } else {
      soldier.nextGuideCue = null;
    }
    const deliberatelyRepeatsOrder = soldier.publicState !== SOLDIER_STATE.ROUTE &&
      soldier.doctrine.relayDuty && soldier.orderCallT <= 0 &&
      simTime >= soldier.orderUnderstoodAt &&
      soldier.privateOrder && simTime <= soldier.privateOrder.expiresAt &&
      (soldier.privateOrder.relayHops || 0) < 8;
    soldier.nextOrderCue = deliberatelyRepeatsOrder ? copyPacket(soldier.privateOrder) : null;
    if (deliberatelyRepeatsOrder) {
      soldier.orderCallT = .58 * soldier.capabilities.formation.relayInterval;
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
        if (d < nearestDistance) { nearestDistance = d; nearestEnemy = observed; }
      }
    }
    const casualtyWeight = loss => loss.kind === 'runner' ? 0.15 : 1;
    const freshLosses = percept.losses.filter(loss => loss.fallenAt > soldier.lastLossScan);
    const freshOwnLosses = freshLosses
      .filter(loss => loss.team === soldier.team)
      .reduce((sum, loss) => sum + casualtyWeight(loss), 0);
    const freshEnemyLosses = freshLosses
      .filter(loss => loss.team !== soldier.team)
      .reduce((sum, loss) => sum + casualtyWeight(loss), 0);
    const witnessedOfficerLoss = freshLosses.some(loss =>
      loss.team === soldier.team && loss.kind === 'centurion');
    if (freshLosses.length) {
      soldier.lastLossScan = Math.max(soldier.lastLossScan,
        ...freshLosses.map(loss => loss.fallenAt));
    }
    let delta = TUNING.moraleRecovery * moraleCapability.recovery * dt;
    // The local numbers effect is a rate per second. This mind runs at a
    // coarser cadence than physics, so applying the full value per thought
    // would make morale depend on cognition frequency.
    delta += clamp((allies - enemies) * 0.0028, -0.018, 0.012) * dt;
    delta -= freshOwnLosses * 0.055 * moraleCapability.casualtyShock;
    delta += freshEnemyLosses * 0.022 / moraleCapability.casualtyShock;
    if (!soldier.privateOrder || simTime > soldier.privateOrder.expiresAt + 2.5) {
      delta -= 0.012 * moraleCapability.casualtyShock * dt;
    } else if (simTime >= soldier.orderUnderstoodAt) {
      delta += clamp((soldier.privateOrder.commandPresence || 1) - 1, -0.30, 0.40) *
        0.006 * dt;
    }
    if (witnessedOfficerLoss) delta -= 0.085 * moraleCapability.officerShock;
    soldier.morale = clamp(soldier.morale + delta, 0, 1);
    return nearestEnemy;
  }

  function formationTargetForSoldier(soldier) {
    const order = soldier.privateOrder;
    const guide = soldier.guideTrack;
    if (!order || simTime < soldier.orderUnderstoodAt || !guide || guide.confidence < 0.08) {
      return { x: soldier.targetX, z: soldier.targetZ,
        heading: simTime >= soldier.orderUnderstoodAt ? order?.heading ?? soldier.heading : soldier.heading };
    }
    const plan = { ranks: order.formation.ranks, columns: order.formation.columns };
    const center = centerFromGuide(guide, order.heading, plan, order.formation.spacing);
    const position = slotPosition(center, order.heading, soldier.doctrine);
    return { ...position, heading: order.heading };
  }

  function chooseVisibleEnemy(soldier, percept) {
    const order = soldier.privateOrder && simTime >= soldier.orderUnderstoodAt
      ? soldier.privateOrder : null;
    const candidates = percept.nearby.filter(observation => observation.team !== soldier.team);
    let best = null;
    let bestScore = Infinity;
    const canLeavePost = soldier.doctrine.rank === 0 ||
      candidates.some(enemy => distance(soldier, enemy) < 2.4) ||
      order?.movement === 'counter';
    if (!canLeavePost) return null;
    for (const enemy of candidates) {
      const d = distance(soldier, enemy);
      if (d > TUNING.engageRange) continue;
      const bearingCost = Math.abs(angleDifference(headingTo(soldier, enemy), soldier.heading)) * 0.35;
      const centurionPenalty = enemy.kind === 'centurion' ? 0.8 : 0;
      const score = d + bearingCost + centurionPenalty;
      if (score < bestScore) { bestScore = score; best = enemy; }
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
    } else if (soldier.targetMemory && simTime - soldier.targetMemory.seenAt >
        0.9 * soldier.capabilities.perception.targetMemory) {
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
    } else if (soldier.combatState === COMBAT_STATE.GUARD &&
        soldier.combatAge >= 0.20 * combat.guardTime) {
      soldier.combatState = COMBAT_STATE.COMMIT;
      soldier.combatAge = 0;
    } else if (soldier.combatState === COMBAT_STATE.COMMIT &&
        soldier.combatAge >= TUNING.commitTime * combat.commitTime) {
      soldier.combatState = COMBAT_STATE.STRIKE;
      soldier.combatAge = 0;
      pendingStrikes.push(deepFreeze({
        attackerId: soldier.id,
        aimHeading: headingTo(soldier, target),
        aimRange: range,
        committedAt: simTime,
        serial: ++soldier.strikeSerial
      }));
    } else if (soldier.combatState === COMBAT_STATE.STRIKE &&
        soldier.combatAge >= TUNING.strikeTime * combat.strikeTime) {
      soldier.combatState = COMBAT_STATE.RECOVER;
      soldier.combatAge = 0;
      soldier.fatigue = clamp(soldier.fatigue + TUNING.fatiguePerStrike *
        soldier.capabilities.movement.fatigueCost, 0, 1);
    } else if (soldier.combatState === COMBAT_STATE.RECOVER &&
        soldier.combatAge >= TUNING.recoverTime * combat.recoveryTime *
          (1 + soldier.fatigue * 0.8)) {
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
    const order = soldier.privateOrder && simTime >= soldier.orderUnderstoodAt
      ? soldier.privateOrder : null;
    const moraleCapability = soldier.capabilities.morale;

    const closeEnemyBlocksRally = percept.nearby.some(observation =>
      observation.team !== soldier.team && distance(soldier, observation) <= 8);
    const remainsBroken = soldier.publicState === SOLDIER_STATE.ROUTE &&
      (soldier.morale <= moraleCapability.rallyThreshold || closeEnemyBlocksRally);
    const rallying = soldier.publicState === SOLDIER_STATE.ROUTE &&
      soldier.morale > moraleCapability.rallyThreshold && !closeEnemyBlocksRally;
    if (rallying) soldier.targetMemory = null;
    if (soldier.morale < moraleCapability.routeThreshold || remainsBroken) {
      soldier.nextPublicState = SOLDIER_STATE.ROUTE;
      const enemy = visibleEnemy || soldier.targetMemory;
      const away = enemy
        ? normalize2({ x: soldier.x - enemy.x, z: soldier.z - enemy.z })
        : forwardOf(wrapAngle(TEAM_DOCTRINE[soldier.team].forwardHeading + Math.PI));
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
        const speed = Math.min(combatSpeed,
          Math.max(0, d - weaponReach * 0.72) * 1.4);
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
        const speedCap = order?.movement === 'hold'
          ? dressSpeed
          : Math.min(physicalMarch, Math.max(dressSpeed, orderedCadence,
            TUNING.soldierMarchSpeed * 0.72));
        const speed = Math.min(speedCap, d * 1.85 * formation.postGain);
        desired = { x: toward.x * speed, z: toward.z * speed };
        maxSpeed = speedCap;
        soldier.nextPublicState = order?.movement === 'hold' ? SOLDIER_STATE.FORM : SOLDIER_STATE.MARCH;
      } else {
        soldier.nextPublicState = SOLDIER_STATE.DRESS;
      }
    }

    soldier.heading = rotateToward(soldier.heading, desiredHeading,
      TUNING.soldierTurnRate * movement.turn * dt);
    const allies = percept.nearby
      .filter(observation => observation.team === soldier.team)
      .map(observation => ({ ...observation, publicState: observation.publicState || SOLDIER_STATE.MARCH }));
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
      collisionRadius: agent => agent.radius || TUNING.bodyRadius
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
    soldier.fatigue = clamp(soldier.fatigue - TUNING.fatigueRecovery *
      soldier.capabilities.movement.fatigueRecovery * dt, 0, 1);
    if (soldier.thinkT > 0) {
      // Locomotion still replans from the frozen percept every physics tick.
      const target = formationTargetForSoldier(soldier);
      const visible = chooseVisibleEnemy(soldier, percept);
      planSoldierVelocity(soldier, percept, target, visible, dt);
      return;
    }
    soldier.thinkT += TUNING.soldierThink *
      (0.90 + hash01(config.seed, soldier.numericId, 0x2b1, tick) * 0.20);
    updateSoldierOrderAndGuide(soldier, percept);
    const nearestEnemy = updateSoldierMorale(soldier, percept, TUNING.soldierThink);
    const closeEnemy = nearestEnemy && distance(soldier, nearestEnemy) <= 8;
    const routingNow = soldier.morale < soldier.capabilities.morale.routeThreshold ||
      (soldier.publicState === SOLDIER_STATE.ROUTE &&
        (soldier.morale <= soldier.capabilities.morale.rallyThreshold || closeEnemy));
    if (routingNow) {
      soldier.nextPublicState = SOLDIER_STATE.ROUTE;
      soldier.nextOrderCue = null;
      soldier.nextGuideCue = null;
      soldier.combatState = COMBAT_STATE.READY;
      soldier.combatAge = 0;
      soldier.targetMemory = null;
      const target = formationTargetForSoldier(soldier);
      planSoldierVelocity(soldier, percept, target, nearestEnemy, dt);
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
    const bodies = queryPhysicalBodies(attacker.x, attacker.z,
      Math.sqrt(lengthSq) + TUNING.bodyRadius, attacker);
    for (const body of bodies) {
      if (!body.alive || body === target || body.team !== attacker.team) continue;
      const t = clamp(((body.x - attacker.x) * dx + (body.z - attacker.z) * dz) / lengthSq, 0, 1);
      if (t < 0.18 || t > 0.92) continue;
      const px = attacker.x + dx * t;
      const pz = attacker.z + dz * t;
      if (Math.hypot(body.x - px, body.z - pz) < body.radius + 0.10) return false;
    }
    return true;
  }

  function killBody(body, attacker) {
    if (!body.alive) return;
    body.alive = false;
    body.vx = body.vz = 0;
    body.seenVx = body.seenVz = 0;
    body.publicState = body.kind === 'soldier' ? SOLDIER_STATE.FALLEN : CENTURION_STATE.ROUTED;
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
    if (body.kind === 'centurion') {
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
        setCenturionState(century, CENTURION_STATE.ROUTED, 'centurion-fallen');
        emitObserver('centurion-fallen', { centuryId: century.id });
      }
    }
  }

  function resolveStrikes() {
    if (!pendingStrikes.length) return;
    const damage = new Map();
    const landed = [];
    for (const intent of pendingStrikes.splice(0)) {
      const attacker = bodyById.get(intent.attackerId);
      if (!attacker?.alive) continue;
      const weaponReach = TUNING.weaponReach * attacker.capabilities.combat.reach;
      let target = null;
      let targetScore = Infinity;
      for (const candidate of queryPhysicalBodies(attacker.x, attacker.z,
        weaponReach + 0.05, attacker)) {
        if (!candidate.alive || candidate.team === attacker.team) continue;
        const candidateRange = distance(attacker, candidate);
        const candidateAimError = Math.abs(angleDifference(
          headingTo(attacker, candidate), intent.aimHeading));
        if (candidateAimError > 38 * Math.PI / 180) continue;
        const score = candidateAimError * 2.1 +
          Math.abs(candidateRange - intent.aimRange) * 0.32;
        if (score < targetScore) { targetScore = score; target = candidate; }
      }
      if (!target) continue;
      const range = distance(attacker, target);
      const aimError = Math.abs(angleDifference(headingTo(attacker, target), intent.aimHeading));
      if (range > weaponReach || aimError > 38 * Math.PI / 180) continue;
      if (!segmentClearOfFriendlies(attacker, target)) {
        logCombat({ event: 'blocked-friendly', attackerId: attacker.id, targetId: target.id });
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
      const roll = hash01(config.seed, attackerKey, targetKey,
        Math.floor(intent.committedAt * 20) + intent.serial);
      if (roll > chance) {
        logCombat({ event: 'miss', attackerId: attacker.id, targetId: target.id,
          range, flank, shieldFront });
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
      logCombat({ event: 'hit', attackerId: hit.attacker.id, targetId: hit.target.id,
        damage: hit.amount, flank: hit.flank, shieldFront: hit.shieldFront });
    }
    for (const [targetId, amount] of damage) {
      const target = bodyById.get(targetId);
      if (!target?.alive) continue;
      target.hp -= amount;
      if (target.hp <= 0) {
        const source = landed.find(hit => hit.target.id === targetId)?.attacker || null;
        killBody(target, source);
        logCombat({ event: 'casualty', targetId, attackerId: source?.id || null,
          team: target.team, centuryId: target.centuryId, kind: target.kind });
      }
    }
  }

  function bodyMobility(body) {
    if (body.kind === 'centurion') return 0.28;
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
    // Treat the battlefield edge as part of the iterative constraint solve.
    // A single clamp after separation can push two edge-adjacent bodies back
    // into one another. Projecting before the solve and after every pair lets
    // later iterations transfer the blocked displacement to the body that can
    // still move inward.
    for (const body of bodyById.values()) {
      if (body.alive) clampBodyToBattlefield(body);
    }
    for (let iteration = 0; iteration < 8; iteration++) {
      rebuildSpatial(2.2);
      const seenPairs = new Set();
      for (const a of bodyById.values()) {
        if (!a.alive) continue;
        const near = queryPhysicalBodies(a.x, a.z, a.radius + 1.0, a);
        for (const b of near) {
          const pairKey = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
          if (seenPairs.has(pairKey)) continue;
          seenPairs.add(pairKey);
          const minimum = a.radius + b.radius + 0.006;
          let dx = b.x - a.x;
          let dz = b.z - a.z;
          let d = Math.hypot(dx, dz);
          if (d >= minimum) continue;
          const actualDistance = d;
          if (d < 1e-8) {
            const angle = hash01(config.seed,
              [...a.id].reduce((sum, c) => sum + c.charCodeAt(0), 0),
              [...b.id].reduce((sum, c) => sum + c.charCodeAt(0), 0), tick) * Math.PI * 2;
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

  function projectMatchResult() {
    const teamStatus = {};
    for (const team of TEAMS) {
      const teamSoldiers = soldiers.filter(soldier => soldier.team === team);
      const alive = teamSoldiers.filter(soldier => soldier.alive).length;
      const routing = teamSoldiers.filter(soldier => soldier.alive &&
        soldier.publicState === SOLDIER_STATE.ROUTE).length;
      const centurionsAlive = centuries.filter(century => century.team === team &&
        century.centurion.alive).length;
      teamStatus[team] = { initial: teamSoldiers.length, alive, routing, centurionsAlive };
    }
    const defeated = TEAMS.filter(team => {
      const status = teamStatus[team];
      return status.alive <= Math.max(2, Math.floor(status.initial * 0.12)) ||
        (status.centurionsAlive === 0 && status.routing >= status.alive * 0.65);
    });
    let result = null;
    if (defeated.length === 1) {
      result = { status: 'victory', winner: otherTeam(defeated[0]), loser: defeated[0] };
    } else if (defeated.length === 2) {
      result = { status: 'draw', winner: null, loser: null };
    } else if (simTime >= TUNING.matchTimeLimit) {
      const blue = teamStatus[TEAM.BLUE].alive;
      const red = teamStatus[TEAM.RED].alive;
      result = blue === red
        ? { status: 'draw', winner: null, loser: null }
        : { status: 'time-victory', winner: blue > red ? TEAM.BLUE : TEAM.RED,
            loser: blue > red ? TEAM.RED : TEAM.BLUE };
    }
    if (result && !matchResult) {
      matchResult = deepFreeze({ ...result, at: simTime, teamStatus });
      emitObserver('match-result', matchResult);
    }
  }

  function step(dt = TUNING.fixedDt) {
    if (!Number.isFinite(dt) || dt <= 0 || dt > 0.25) {
      throw new RangeError('step(dt) expects 0 < finite dt <= 0.25');
    }
    simTime += dt;
    tick++;

    // Physical/public frame N. No brain writes are visible through this frame.
    for (const body of bodyById.values()) {
      if (!body.alive) continue;
      body.seenVx = body.vx || 0;
      body.seenVz = body.vz || 0;
    }
    rebuildSpatial();

    // Deliver only messages already in flight before any current-tick dispatch.
    updateCouriers(dt);
    const centurionPerceptFrames = new Map();
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

    // Freeze every soldier percept before any soldier mind writes next cues.
    rebuildSpatial();
    const perceptFrames = new Map();
    for (const soldier of soldiers) {
      if (soldier.alive) perceptFrames.set(soldier.id, senseSoldier(soldier));
    }
    for (const soldier of soldiers) {
      if (soldier.alive) updateSoldierMind(soldier, perceptFrames.get(soldier.id), dt);
    }

    // All attack decisions are sealed before material validation and damage.
    resolveStrikes();
    integrateSoldiers(dt);
    resolveBodyCollisions();

    // Public buffer N+1 and officer orders become visible only now.
    publishSoldierCues();
    commitCenturyOrders();
    projectMatchResult();
  }

  function centuryObserverSnapshot(century) {
    const center = currentCenturyCenter(century);
    const alive = aliveSoldiers(century).length;
    const tracks = [...century.brain.enemyTracks.values()].map(track => deepFreeze({
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
    const individualContacts = century.brain.individualContacts.map(contact => deepFreeze({
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
      generalCommandsQueued: generalCommandQueue.length,
      centuries: centuries.map(centuryObserverSnapshot),
      soldiers: soldiers.map(soldier => deepFreeze({
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
      centurions: centuries.map(century => deepFreeze({
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
      couriers: config.showMessages ? couriers.map(courier => deepFreeze({
        id: courier.id,
        mode: courier.mode,
        senderId: courier.senderId,
        receiverId: courier.receiverId,
        kind: courier.packet.kind || courier.packet.command,
        phase: courier.phase || 'in-flight',
        team: courier.team || centuryById(courier.senderId)?.team || null,
        x: courier.x,
        z: courier.z,
        targetX: courier.targetX,
        targetZ: courier.targetZ
      })) : [],
      fallenBodies: fallenBodies.map(body => body),
      recentCombatEvents: combatEvents.slice(-80),
      recentCommunicationEvents: communicationEvents.slice(-80)
    };
    return deepFreeze(snapshot);
  }

  function diagnostics() {
    let overlaps = 0;
    let nonFinite = 0;
    let minGap = Infinity;
    const aliveBodies = [...bodyById.values()].filter(body => body.alive);
    for (let i = 0; i < aliveBodies.length; i++) {
      const a = aliveBodies[i];
      if (![a.x, a.z, a.vx, a.vz, a.heading].every(Number.isFinite)) nonFinite++;
      for (let j = i + 1; j < aliveBodies.length; j++) {
        const b = aliveBodies[j];
        const gap = distance(a, b);
        minGap = Math.min(minGap, gap);
        if (gap < a.radius + b.radius - 0.003) overlaps++;
      }
    }
    const team = {};
    for (const teamId of TEAMS) {
      const teamSoldiers = soldiers.filter(soldier => soldier.team === teamId);
      team[teamId] = {
        initial: teamSoldiers.length,
        alive: teamSoldiers.filter(soldier => soldier.alive).length,
        fallen: teamSoldiers.filter(soldier => !soldier.alive).length,
        routing: teamSoldiers.filter(soldier => soldier.alive &&
          soldier.publicState === SOLDIER_STATE.ROUTE).length,
        centurionsAlive: centuries.filter(century => century.team === teamId &&
          century.centurion.alive).length
      };
    }
    const century = Object.fromEntries(centuries.map(unit => [unit.id, {
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
    return deepFreeze({
      version: VERSION,
      simTime,
      tick,
      team,
      century,
      activeBodies: aliveBodies.length,
      fallenBodies: fallenBodies.length,
      couriers: couriers.length,
      physicalRunners: couriers.filter(courier => courier.kind === 'runner').length,
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
    if (scope === 'all') return centuries.slice();
    if (TEAMS.includes(scope)) return centuries.filter(century => century.team === scope);
    const century = centuryById(scope);
    if (!century) {
      throw new RangeError(`Unknown command scope: ${String(scope)}`);
    }
    return [century];
  }

  /**
   * High-level general's intent becomes one addressed physical courier per
   * officer. Team scope shares a command serial, but no officer's mission is
   * mutated until that courier arrives and the centurions complete their own
   * proposal/ACK/commit exchange.
   */
  function enqueueGeneralCommand(scope, command) {
    const affected = resolveCommandScope(scope);
    const serialByTeam = {};
    for (const team of new Set(affected.map(century => century.team))) {
      serialByTeam[team] = nextGeneralCommandSerial[team]++;
    }
    const teamScope = scope === 'all' || TEAMS.includes(scope);
    for (const century of affected) {
      const serial = serialByTeam[century.team];
      const generalPost = generalPosts[century.team];
      const seesStandard = century.centurion.alive &&
        distance(generalPost, century.centurion) <= TUNING.generalStandardSight;
      const targetEstimate = seesStandard
        ? {
            x: quantize(century.centurion.x +
              (hash01(config.seed, serial, century.index, tick + 0x61) - .5) * 1.2, 1),
            z: quantize(century.centurion.z +
              (hash01(config.seed, serial, century.index, tick + 0x73) - .5) * 1.2, 1)
          }
        : century.deploymentAnchor;
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
        if (queued.receiverId === century.id &&
            generalCommandFamily(queued.packet.command) === generalCommandFamily(command.command)) {
          generalCommandQueue.splice(index, 1);
        }
      }
      generalCommandQueue.push({ receiverId: century.id, packet, targetEstimate });
    }
    const serialValues = Object.values(serialByTeam);
    const receipt = deepFreeze({ serial: serialValues.length === 1 ? serialValues[0] : null,
      serialByTeam, command: command.command,
      recipients: affected.map(century => century.id), teamScope, issuedAt: simTime });
    emitObserver('general-command-issued', receipt);
    return receipt;
  }

  function issuePosture(scope, posture) {
    if (!postureIsValid(posture)) {
      throw new RangeError(`posture must be one of: ${POSTURES.join(', ')}`);
    }
    return enqueueGeneralCommand(scope, { command: 'posture', posture });
  }

  function setHoldZone(scope, zone) {
    if (!zone || !Number.isFinite(zone.x) || !Number.isFinite(zone.z)) {
      throw new TypeError('setHoldZone expects finite { x, z, radius? }');
    }
    const radiusValue = zone.radius == null
      ? TUNING.hardZoneDefaultRadius : Number(zone.radius);
    if (!Number.isFinite(radiusValue)) {
      throw new TypeError('setHoldZone radius must be finite when supplied');
    }
    const radius = clamp(radiusValue, 4, 32);
    const frozenZone = deepFreeze({
      x: clamp(Number(zone.x), -TUNING.battlefieldHalfWidth, TUNING.battlefieldHalfWidth),
      z: clamp(Number(zone.z), -TUNING.battlefieldHalfDepth, TUNING.battlefieldHalfDepth),
      radius,
      enabled: zone.enabled !== false,
      issuedAt: simTime
    });
    return enqueueGeneralCommand(scope, { command: 'set-zone', zone: frozenZone });
  }

  function clearHoldZone(scope) {
    return enqueueGeneralCommand(scope, { command: 'clear-zone' });
  }

  function setPaused(paused) {
    config.paused = Boolean(paused);
    return config.paused;
  }

  function setTimeScale(scale) {
    if (!Number.isFinite(scale)) throw new TypeError('time scale must be finite');
    config.timeScale = clamp(Number(scale), 0.1, 8);
    return config.timeScale;
  }

  function setPresentation(options = {}) {
    if ('showCognition' in options) config.showCognition = Boolean(options.showCognition);
    if ('showMessages' in options) config.showMessages = Boolean(options.showMessages);
    return deepFreeze({
      showCognition: config.showCognition,
      showMessages: config.showMessages
    });
  }

  function reset(options = {}) {
    if (Number.isFinite(options)) options = { seed: Number(options) };
    if (Number.isFinite(options.seed)) config.seed = Number(options.seed) >>> 0;
    if (Number.isFinite(options.perCentury)) {
      config.perCentury = clamp(Math.round(Number(options.perCentury)), 12, 100);
    }
    if (options && Object.prototype.hasOwnProperty.call(options, 'unitProfiles')) {
      config.unitProfiles = prepareUnitProfileMap(options.unitProfiles || {});
    }
    initializeBattlefield();
    return observe();
  }

  function runSeconds(seconds, dt = TUNING.fixedDt) {
    if (!Number.isFinite(seconds) || seconds < 0) {
      throw new RangeError('runSeconds(seconds) expects a finite non-negative duration');
    }
    if (!Number.isFinite(dt) || dt <= 0 || dt > 0.25) {
      throw new RangeError('runSeconds dt expects 0 < finite dt <= 0.25');
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
      centuries: Object.fromEntries(centuries.map(century => [century.id, {
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
    if ('hp' in values) {
      if (!Number.isFinite(values.hp)) throw new TypeError('debug condition hp must be finite');
      actor.hp = clamp(Number(values.hp), 0, actor.maxHp);
    }
    if ('morale' in values) {
      if (!Number.isFinite(values.morale)) {
        throw new TypeError('debug condition morale must be finite');
      }
      actor.morale = clamp(Number(values.morale), 0, 1);
    }
    if ('fatigue' in values) {
      if (!Number.isFinite(values.fatigue)) {
        throw new TypeError('debug condition fatigue must be finite');
      }
      actor.fatigue = clamp(Number(values.fatigue), 0, 1);
    }
    return inspectActor(actorId)?.condition || null;
  }

  function debugTeleportCentury(centuryId, x, z, options = {}) {
    const century = centuryById(centuryId);
    if (!century) throw new RangeError(`Unknown century: ${String(centuryId)}`);
    if (!Number.isFinite(x) || !Number.isFinite(z)) {
      throw new TypeError('debug.teleportCentury expects finite x and z');
    }
    const center = currentCenturyCenter(century);
    const dx = clamp(Number(x), -TUNING.battlefieldHalfWidth + 4,
      TUNING.battlefieldHalfWidth - 4) - center.x;
    const dz = clamp(Number(z), -TUNING.battlefieldHalfDepth + 4,
      TUNING.battlefieldHalfDepth - 4) - center.z;
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
      soldier.guideTrack = soldier.guideTrack
        ? { ...soldier.guideTrack, x: soldier.guideTrack.x + dx, z: soldier.guideTrack.z + dz }
        : null;
      soldier.publicGuideCue = null;
      soldier.nextGuideCue = null;
      soldier.targetMemory = null;
    }
    if (options.moveFallback !== false) {
      century.fallbackAnchor = Object.freeze({ x: center.x + dx, z: center.z + dz });
    }
    century.brain.orderT = 0;
    spatial = null;
    emitObserver('debug-teleport', { centuryId, x: center.x + dx, z: center.z + dz });
    return deepFreeze({ x: center.x + dx, z: center.z + dz });
  }

  function debugKnowledge(centuryId) {
    const century = centuryById(centuryId);
    if (!century) throw new RangeError(`Unknown century: ${String(centuryId)}`);
    const brain = century.brain;
    return deepFreeze({
      centuryId,
      state: brain.state,
      enemyTracks: [...brain.enemyTracks.values()].map(track => ({ ...track })),
      individualContacts: brain.individualContacts.map(contact => ({ ...contact })),
      allyTrack: brain.allyTrack ? { ...brain.allyTrack } : null,
      inbox: brain.inbox.map(packet => JSON.parse(JSON.stringify(packet))),
      commandInbox: brain.commandInbox.map(packet => JSON.parse(JSON.stringify(packet))),
      plan: JSON.parse(JSON.stringify(brain.plan)),
      abortedMission: brain.abortedMission
        ? JSON.parse(JSON.stringify(brain.abortedMission))
        : null,
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
      communicationState: brain.communicationState
    });
  }

  function debugPercept(agentId) {
    const body = bodyById.get(agentId);
    if (!body?.alive) return null;
    if (body.kind === 'centurion') return senseCenturion(centuryById(body.centuryId));
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
    const doctrines = soldiers.map(soldier => soldier.doctrine);
    const brains = centuries.map(century => century.brain);
    const actors = [...bodyById.values()].filter(actor =>
      actor.profile && actor.capabilities && actor.condition);
    const profiles = actors.map(actor => actor.profile);
    const capabilities = actors.map(actor => actor.capabilities);
    const conditions = actors.map(actor => actor.condition);
    const conditionEffects = conditions.map(condition => condition.effects);
    const snapshot = observe();
    const fullyFrozen = value => {
      if (!value || typeof value !== 'object') return true;
      return Object.isFrozen(value) && Object.values(value).every(fullyFrozen);
    };
    const forbiddenPerceptKey = value => {
      if (!value || typeof value !== 'object') return false;
      if (Object.keys(value).some(key => ['id', 'centuryId', 'sensorClusterKey'].includes(key))) {
        return true;
      }
      return Object.values(value).some(forbiddenPerceptKey);
    };
    const privatePerceptKey = value => {
      if (!value || typeof value !== 'object') return false;
      if (Object.keys(value).some(key => [
        'profile', 'profileId', 'capabilities', 'condition', 'hp', 'maxHp', 'morale',
        'fatigue', 'armor', 'attack', 'defense', 'damage', 'reach'
      ].includes(key))) return true;
      return Object.values(value).some(privatePerceptKey);
    };
    const sampledPercepts = [
      soldiers.find(soldier => soldier.alive),
      centuries.find(century => century.centurion.alive)?.centurion
    ].filter(Boolean).map(body => body.kind === 'centurion'
      ? senseCenturion(centuryById(body.centuryId)) : senseSoldier(body));
    return deepFreeze({
      centuryCount: centuries.length,
      soldierCount: soldiers.length,
      uniqueBrains: new Set(brains).size,
      uniqueInboxes: new Set(brains.map(brain => brain.inbox)).size,
      uniqueEnemyTrackMaps: new Set(brains.map(brain => brain.enemyTracks)).size,
      uniqueDoctrines: new Set(doctrines).size,
      frozenDoctrines: doctrines.filter(Object.isFrozen).length,
      uniqueCommandInboxes: new Set(brains.map(brain => brain.commandInbox)).size,
      uniquePlanObjects: new Set(brains.map(brain => brain.plan)).size,
      actorCount: actors.length,
      uniqueProfiles: new Set(profiles).size,
      frozenProfiles: profiles.filter(fullyFrozen).length,
      uniqueCapabilities: new Set(capabilities).size,
      frozenCapabilities: capabilities.filter(fullyFrozen).length,
      uniqueConditions: new Set(conditions).size,
      sharedMutableStatObjects: actors.length - new Set(conditions).size,
      uniqueConditionEffects: new Set(conditionEffects).size,
      sharedMutableEffectArrays: actors.length - new Set(conditionEffects).size,
      validMoraleThresholds: capabilities.every(capability =>
        capability.morale.routeThreshold < capability.morale.rallyThreshold),
      frozenObserverProjection: fullyFrozen(snapshot),
      sampledPerceptsFrozen: sampledPercepts.every(fullyFrozen),
      sampledPerceptsContainEngineIds: sampledPercepts.some(forbiddenPerceptKey),
      sampledPerceptsContainPrivateFields: sampledPercepts.some(privatePerceptKey),
      activePhysicalRunners: couriers.filter(courier => courier.kind === 'runner').length
    });
  }

  initializeBattlefield();

  const debug = Object.freeze({
    setCommunicationEnabled: debugSetCommunicationEnabled,
    setCondition: debugSetCondition,
    teleportCentury: debugTeleportCentury,
    knowledge: debugKnowledge,
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
    get simTime() { return simTime; },
    get tick() { return tick; },
    get paused() { return config.paused; },
    get timeScale() { return config.timeScale; },
    get result() { return matchResult; }
  });
}
