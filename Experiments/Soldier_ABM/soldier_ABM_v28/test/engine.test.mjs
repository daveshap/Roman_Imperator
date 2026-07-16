import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createBattlefieldSimulation } from '../src/engine.js';
import {
  TEAM, POSTURE, CENTURION_STATE, SOLDIER_STATE, COMBAT_STATE,
  MESSAGE_KIND, TACTICAL_ROLE, PLAN_STATUS, STANDARD_CODE, TUNING
} from '../src/constants.js';

const FIXED_DT = TUNING.fixedDt;

function deepFrozen(value, seen = new WeakSet()) {
  if (value == null || typeof value !== 'object' || seen.has(value)) return true;
  seen.add(value);
  return Object.isFrozen(value) && Object.keys(value)
    .every(key => deepFrozen(value[key], seen));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function century(snapshot, id) {
  const value = snapshot.centuries.find(item => item.id === id);
  assert.ok(value, `missing century ${id}`);
  return value;
}

function centurion(snapshot, centuryId) {
  const value = snapshot.centurions.find(item => item.centuryId === centuryId);
  assert.ok(value, `missing centurion for ${centuryId}`);
  return value;
}

function assertStable(sim, label = 'simulation') {
  const diagnostics = sim.diagnostics();
  assert.equal(diagnostics.nonFinite, 0, `${label}: non-finite physical values`);
  assert.equal(diagnostics.overlaps, 0, `${label}: overlapping active bodies`);
  return diagnostics;
}

function runSteps(sim, count, { checkEvery = 0, afterStep = null } = {}) {
  for (let index = 0; index < count; index++) {
    sim.step(FIXED_DT);
    afterStep?.(sim, index);
    if (checkEvery && (index + 1) % checkEvery === 0) {
      assertStable(sim, `tick ${sim.tick}`);
    }
  }
  return sim.observe();
}

function runUntil(sim, predicate, {
  maxSeconds = 20,
  label = 'condition',
  checkEvery = 30,
  afterStep = null
} = {}) {
  const maximumSteps = Math.ceil(maxSeconds / FIXED_DT);
  for (let index = 0; index < maximumSteps; index++) {
    sim.step(FIXED_DT);
    afterStep?.(sim, index);
    if (predicate(sim)) return sim.observe();
    if (checkEvery && (index + 1) % checkEvery === 0) {
      assertStable(sim, `${label} at tick ${sim.tick}`);
    }
  }
  assert.fail(`${label} was not reached within ${maxSeconds}s`);
}

function observerEvents(sim, type) {
  return sim.observerEventsSince(0).events.filter(event => event.type === type);
}

function blueProjection(sim) {
  const snapshot = sim.observe();
  return {
    centuries: snapshot.centuries.filter(item => item.team === TEAM.BLUE),
    soldiers: snapshot.soldiers.filter(item => item.team === TEAM.BLUE),
    centurions: snapshot.centurions.filter(item => item.team === TEAM.BLUE),
    knowledge: ['blue-1', 'blue-2'].map(id => sim.debug.knowledge(id))
  };
}

function combatTeam(attackerId) {
  if (attackerId?.startsWith('blue-')) return TEAM.BLUE;
  if (attackerId?.startsWith('red-')) return TEAM.RED;
  return null;
}

function assertNoEngineIdentifiers(percept, label) {
  const forbiddenKeys = new Set([
    'id', 'bodyId', 'centuryId', 'senderId', 'receiverId', 'targetEnemyId'
  ]);
  const visit = (value, path = label) => {
    if (value == null || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      assert.equal(forbiddenKeys.has(key), false,
        `${path} leaked engine identifier field ${key}`);
      visit(child, `${path}.${key}`);
    }
  };
  visit(percept);

  const encoded = JSON.stringify(percept);
  for (const internalId of [
    'blue-1', 'blue-2', 'red-1', 'red-2',
    'centurion-blue-1', 'centurion-blue-2',
    'centurion-red-1', 'centurion-red-2'
  ]) {
    assert.equal(encoded.includes(internalId), false,
      `${label} leaked internal identity ${internalId}`);
  }
  assert.equal(/(?:blue|red)-[12]-s\d+/.test(encoded), false,
    `${label} leaked a soldier body identity`);
}

function runToTerminal(sim) {
  const maximumSteps = Math.ceil(TUNING.matchTimeLimit / FIXED_DT) + 2;
  for (let index = 0; index < maximumSteps && !sim.result; index++) {
    sim.step(FIXED_DT);
    if ((index + 1) % 30 === 0) assertStable(sim, `terminal run tick ${sim.tick}`);
  }
  assert.ok(sim.result, `match did not terminate within ${TUNING.matchTimeLimit}s`);
  return { snapshot: sim.observe(), diagnostics: assertStable(sim, 'terminal state') };
}

test('public facade is sealed and perception DTOs expose public marks, not engine identities', () => {
  const sim = createBattlefieldSimulation({ seed: 0x2801, perCentury: 12 });
  assert.equal(sim.version, 28);
  assert.ok(Object.isFrozen(sim));
  assert.ok(Object.isFrozen(sim.debug));
  assert.equal('soldiers' in sim, false, 'live soldier collection leaked on public API');
  assert.equal('centuries' in sim, false, 'live century collection leaked on public API');

  const snapshot = sim.observe();
  assert.ok(deepFrozen(snapshot), 'observer snapshot is not deeply frozen');
  assert.equal(snapshot.centuries.length, 4);
  assert.equal(snapshot.centurions.length, 4);
  assert.equal(snapshot.soldiers.length, 48);
  assert.deepEqual(snapshot.centuries.map(item => item.id).sort(),
    ['blue-1', 'blue-2', 'red-1', 'red-2']);
  for (const unit of snapshot.centuries) {
    assert.equal(unit.initialStrength, 12);
    assert.equal(unit.alive, 12);
    assert.equal(snapshot.soldiers.filter(soldier => soldier.centuryId === unit.id).length, 12);
  }
  assert.equal(new Set(snapshot.soldiers.map(soldier => soldier.id)).size, 48);
  assert.equal(new Set(snapshot.centurions.map(officer => officer.id)).size, 4);

  const audit = sim.debug.architectureAudit();
  assert.ok(deepFrozen(audit));
  assert.deepEqual(audit, {
    centuryCount: 4,
    soldierCount: 48,
    uniqueBrains: 4,
    uniqueInboxes: 4,
    uniqueEnemyTrackMaps: 4,
    uniqueDoctrines: 48,
    frozenDoctrines: 48,
    uniqueCommandInboxes: 4,
    uniquePlanObjects: 4,
    frozenObserverProjection: true,
    sampledPerceptsFrozen: true,
    sampledPerceptsContainEngineIds: false,
    activePhysicalRunners: 0
  });

  const knowledgeA = sim.debug.knowledge('blue-1');
  const knowledgeB = sim.debug.knowledge('blue-1');
  assert.ok(deepFrozen(knowledgeA), 'private knowledge audit is not deeply frozen');
  assert.notStrictEqual(knowledgeA, knowledgeB, 'private audit returned a live shared object');
  assert.notStrictEqual(knowledgeA.enemyTracks, knowledgeB.enemyTracks,
    'private track array identity leaked between audits');

  const soldierPercept = sim.debug.percept('blue-1-s1');
  assert.ok(soldierPercept.nearby.length > 0, 'soldier received an empty local percept');
  assert.ok(deepFrozen(soldierPercept), 'soldier percept DTO is not deeply frozen');
  assertNoEngineIdentifiers(soldierPercept, 'soldier percept');
  assert.ok(soldierPercept.nearby.some(observation => observation.publicMark === 'B1'),
    'soldier did not perceive its formation through a public standard mark');

  const centurionPercept = sim.debug.percept('centurion-blue-1');
  assert.ok(deepFrozen(centurionPercept), 'centurion percept DTO is not deeply frozen');
  assertNoEngineIdentifiers(centurionPercept, 'centurion percept');
  assert.equal(centurionPercept.allyObservation.recognizedMark, 'B2');
  assert.ok(centurionPercept.enemyObservations.length > 0,
    'centurion received no geometric enemy observations');

  const originalX = snapshot.soldiers[0].x;
  assert.throws(() => { snapshot.soldiers[0].x = 9999; }, TypeError);
  assert.equal(sim.observe().soldiers[0].x, originalX);
  assert.ok(deepFrozen(sim.observerEventsSince(0)), 'observer event view is not deeply frozen');
  assertStable(sim, 'initial battlefield');
});

test('observer event cursor remains monotonic across trimming, new events, and reset', () => {
  const sim = createBattlefieldSimulation({ seed: 0x28e1, perCentury: 12 });
  const initial = sim.observerEventsSince(0);
  assert.ok(deepFrozen(initial));
  assert.equal(initial.dropped, 0);
  assert.equal(initial.events.length, 1);
  assert.equal(initial.events[0].type, 'reset');
  assert.equal(initial.events[0].index, 0);
  assert.equal(initial.nextIndex, 1);
  const staleCursor = initial.nextIndex;

  // Command issuance emits observer events without advancing simulation time.
  // Replacing the same queued posture family also keeps this inexpensive.
  for (let index = 0; index < 320; index++) {
    sim.issuePosture('blue-1', index % 2 ? POSTURE.HOLD : POSTURE.AGGRESSIVE);
  }
  assert.equal(sim.simTime, 0);
  const trimmed = sim.observerEventsSince(staleCursor);
  assert.ok(deepFrozen(trimmed));
  assert.equal(trimmed.nextIndex, 321);
  assert.equal(trimmed.dropped, 20,
    'stale cursor did not report events removed by the 300-event retention cap');
  assert.equal(trimmed.events.length, 300);
  assert.equal(trimmed.events[0].index, 21);
  assert.equal(trimmed.events.at(-1).index, 320);
  assert.ok(trimmed.events.every((event, index) =>
    event.index === trimmed.events[0].index + index),
  'retained observer indices are not contiguous');

  const priorNextIndex = trimmed.nextIndex;
  sim.setHoldZone('blue-1', { x: -4, z: -30, radius: 8 });
  const newlyEmitted = sim.observerEventsSince(priorNextIndex);
  assert.equal(newlyEmitted.dropped, 0);
  assert.equal(newlyEmitted.events.length, 1);
  assert.equal(newlyEmitted.events[0].index, priorNextIndex);
  assert.equal(newlyEmitted.events[0].type, 'general-command-issued');
  assert.equal(newlyEmitted.events[0].payload.command, 'set-zone');
  assert.equal(newlyEmitted.nextIndex, priorNextIndex + 1);

  const cursorBeforeReset = newlyEmitted.nextIndex;
  sim.reset({ seed: 0x28e2, perCentury: 12 });
  const acrossReset = sim.observerEventsSince(cursorBeforeReset);
  assert.ok(deepFrozen(acrossReset));
  assert.equal(acrossReset.dropped, 0);
  assert.equal(acrossReset.events.length, 1);
  assert.equal(acrossReset.events[0].index, cursorBeforeReset,
    'reset reused an earlier observer event index');
  assert.equal(acrossReset.events[0].type, 'reset');
  assert.equal(acrossReset.events[0].payload.seed, 0x28e2);
  assert.equal(acrossReset.nextIndex, cursorBeforeReset + 1);

  const postResetCursor = acrossReset.nextIndex;
  sim.clearHoldZone('blue-1');
  const postResetEvent = sim.observerEventsSince(postResetCursor);
  assert.equal(postResetEvent.dropped, 0);
  assert.equal(postResetEvent.events.length, 1);
  assert.equal(postResetEvent.events[0].index, postResetCursor);
  assert.equal(postResetEvent.events[0].payload.command, 'clear-zone');
  assert.equal(postResetEvent.nextIndex, postResetCursor + 1);
});

test('same seed and inputs stay deterministic despite asymmetric observer polling', () => {
  const seed = 0x2802;
  const a = createBattlefieldSimulation({ seed, perCentury: 12 });
  const b = createBattlefieldSimulation({ seed, perCentury: 12 });

  const applyScheduledInputs = (sim, tick) => {
    if (tick === 0) sim.issuePosture(TEAM.BLUE, POSTURE.HOLD);
    if (tick === 120) sim.setHoldZone('red-2', { x: 8, z: 29, radius: 8 });
    if (tick === 300) sim.issuePosture('red-1', POSTURE.DEFENSIVE_FEINT);
  };

  for (let tick = 0; tick < 600; tick++) {
    applyScheduledInputs(a, tick);
    applyScheduledInputs(b, tick);

    b.observe();
    b.diagnostics();
    b.debug.knowledge('blue-1');
    b.debug.knowledge('red-2');
    b.debug.percept('blue-1-s1');
    b.observerEventsSince(0);

    a.step(FIXED_DT);
    b.step(FIXED_DT);
    if ((tick + 1) % 30 === 0) {
      assert.equal(JSON.stringify(b.observe()), JSON.stringify(a.observe()),
        `same-seed worlds diverged at tick ${tick + 1}`);
      assert.deepEqual(b.diagnostics(), a.diagnostics());
    }
  }
  assertStable(a, 'deterministic world A');
  assertStable(b, 'deterministic world B');

  const otherSeed = createBattlefieldSimulation({ seed: seed + 1, perCentury: 12 });
  assert.notEqual(JSON.stringify(otherSeed.observe().soldiers),
    JSON.stringify(createBattlefieldSimulation({ seed, perCentury: 12 }).observe().soldiers),
    'changing the seed did not change seeded agent variation');
});

test('team posture travels by general runners and activates only through proposal, ACK, and COMMIT', () => {
  const sim = createBattlefieldSimulation({ seed: 0x0abc, perCentury: 12 });
  const receipt = sim.issuePosture(TEAM.BLUE, POSTURE.HOLD);
  assert.ok(deepFrozen(receipt));
  assert.deepEqual(receipt, {
    serial: 1,
    serialByTeam: { blue: 1 },
    command: 'posture',
    recipients: ['blue-1', 'blue-2'],
    teamScope: true,
    issuedAt: 0
  });

  let snapshot = sim.observe();
  assert.equal(snapshot.generalCommandsQueued, 2);
  assert.equal(snapshot.couriers.length, 0, 'queued intent materialized before a simulation step');
  for (const id of ['blue-1', 'blue-2']) {
    assert.equal(century(snapshot, id).posture, POSTURE.AGGRESSIVE,
      'general intent mutated a century immediately');
    assert.equal(century(snapshot, id).planStatus, PLAN_STATUS.DOCTRINE);
  }

  sim.step(FIXED_DT);
  snapshot = sim.observe();
  const generalRunners = snapshot.couriers.filter(courier =>
    courier.senderId === 'general-blue' && courier.mode === 'general-runner');
  assert.equal(generalRunners.length, 2, 'team command did not dispatch one physical runner per officer');
  assert.deepEqual(new Set(generalRunners.map(runner => runner.receiverId)),
    new Set(['blue-1', 'blue-2']));
  assert.equal(sim.diagnostics().physicalRunners, 2);
  for (const id of ['blue-1', 'blue-2']) {
    assert.equal(century(snapshot, id).posture, POSTURE.AGGRESSIVE);
  }

  snapshot = runUntil(sim, current => observerEvents(current, 'mission-received').length === 2, {
    maxSeconds: 16,
    label: 'both physical general orders delivered',
    afterStep: current => {
      for (const id of ['blue-1', 'blue-2']) {
        assert.equal(century(current.observe(), id).posture, POSTURE.AGGRESSIVE,
          `${id} activated team intent before coordination`);
      }
    }
  });
  assert.equal(century(snapshot, 'blue-1').planStatus, PLAN_STATUS.PROPOSED);
  assert.equal(century(snapshot, 'blue-2').planStatus, PLAN_STATUS.WAITING);

  snapshot = runUntil(sim, current => ['blue-1', 'blue-2'].every(id => {
    const unit = century(current.observe(), id);
    return unit.posture === POSTURE.HOLD && unit.planStatus === PLAN_STATUS.COMMITTED;
  }), { maxSeconds: 8, label: 'team plan commit' });
  for (const id of ['blue-1', 'blue-2']) {
    const unit = century(snapshot, id);
    assert.equal(unit.posture, POSTURE.HOLD);
    assert.equal(unit.tacticalRole, TACTICAL_ROLE.HOLD_WING);
    assert.equal(unit.state, CENTURION_STATE.HOLD);
  }

  const communication = snapshot.recentCommunicationEvents;
  const generalDeliveries = communication.filter(event =>
    event.event === 'general-order-delivered' && event.kind === 'posture' &&
    event.senderId === 'general-blue');
  assert.equal(generalDeliveries.length, 2);
  const proposalSent = communication.find(event =>
    event.event === 'dispatched' && event.kind === MESSAGE_KIND.PLAN_PROPOSAL);
  const proposalDelivered = communication.find(event =>
    event.event === 'delivered' && event.kind === MESSAGE_KIND.PLAN_PROPOSAL);
  const ackSent = communication.find(event =>
    event.event === 'dispatched' && event.kind === MESSAGE_KIND.PLAN_ACK);
  const ackDelivered = communication.find(event =>
    event.event === 'delivered' && event.kind === MESSAGE_KIND.PLAN_ACK);
  const commitSent = communication.find(event =>
    event.event === 'dispatched' && event.kind === MESSAGE_KIND.PLAN_COMMIT);
  const commitDelivered = communication.find(event =>
    event.event === 'delivered' && event.kind === MESSAGE_KIND.PLAN_COMMIT);
  for (const [name, event] of Object.entries({
    proposalSent, proposalDelivered, ackSent, ackDelivered, commitSent, commitDelivered
  })) assert.ok(event, `missing ${name} event`);
  assert.ok(proposalSent.t >= Math.max(...generalDeliveries.map(event => event.t)));
  assert.ok(proposalDelivered.t > proposalSent.t);
  assert.ok(ackSent.t >= proposalDelivered.t);
  assert.ok(ackDelivered.t > ackSent.t);
  assert.ok(commitSent.t >= ackDelivered.t);
  assert.ok(commitDelivered.t > commitSent.t);

  const committed = observerEvents(sim, 'mission-committed');
  const coordinatorCommit = committed.find(event => event.payload.centuryId === 'blue-1');
  const followerCommit = committed.find(event => event.payload.centuryId === 'blue-2');
  assert.ok(coordinatorCommit.t >= commitSent.t,
    'coordinator committed before receiving an ACK and sending COMMIT');
  assert.ok(followerCommit.t >= commitDelivered.t,
    'follower committed before physically receiving COMMIT');
  assertStable(sim, 'team posture protocol');
});

test('follower rejects a tampered COMMIT even when coordinator, mission ID, and epoch match', () => {
  const sim = createBattlefieldSimulation({ seed: 0x28b1, perCentury: 12 });
  sim.issuePosture(TEAM.BLUE, POSTURE.HOLD);

  // Let the real proposal and ACK complete. As soon as the coordinator sends
  // its valid COMMIT, mute the follower before that finite voice signal can
  // arrive. This leaves the follower with the exact mission it acknowledged.
  let snapshot = runUntil(sim, current => {
    const currentSnapshot = current.observe();
    return century(currentSnapshot, 'blue-1').posture === POSTURE.HOLD &&
      century(currentSnapshot, 'blue-1').planStatus === PLAN_STATUS.COMMITTED &&
      century(currentSnapshot, 'blue-2').posture === POSTURE.AGGRESSIVE &&
      century(currentSnapshot, 'blue-2').planStatus === PLAN_STATUS.ACKNOWLEDGED;
  }, { maxSeconds: 16, label: 'coordinator commit before follower delivery' });
  const coordinatorCommit = observerEvents(sim, 'mission-committed')
    .find(event => event.payload.centuryId === 'blue-1');
  assert.ok(coordinatorCommit);
  sim.debug.setCommunicationEnabled('blue-2', false);

  // Coordinator retransmission is intentionally allowed to exhaust while the
  // follower is partitioned, so the only later COMMIT is the crafted packet.
  runUntil(sim, current => current.simTime >= coordinatorCommit.t + 8 &&
    !current.observe().couriers.some(courier =>
      courier.senderId === 'blue-1' && courier.kind === MESSAGE_KIND.PLAN_COMMIT), {
    maxSeconds: 10,
    label: 'valid COMMIT retransmission window',
    afterStep: current => {
      const follower = century(current.observe(), 'blue-2');
      assert.equal(follower.posture, POSTURE.AGGRESSIVE);
      assert.equal(follower.planStatus, PLAN_STATUS.ACKNOWLEDGED);
    }
  });
  sim.debug.setCommunicationEnabled('blue-2', true);

  const coordinatorReceipt = observerEvents(sim, 'mission-received')
    .find(event => event.payload.centuryId === 'blue-1');
  assert.ok(coordinatorReceipt);
  const acknowledgedEpoch = century(sim.observe(), 'blue-2').pendingPlanEpoch;
  assert.equal(acknowledgedEpoch, 1);
  const originalExpiry = coordinatorReceipt.t + TUNING.planCommitWindow;
  const alteredMission = {
    missionId: `blue:${acknowledgedEpoch}:team`,
    epoch: acknowledgedEpoch,
    posture: POSTURE.DEFENSIVE_FEINT,
    scope: 'team',
    expiresAt: originalExpiry + 3,
    coordinatorId: 'blue-1',
    roles: {
      'blue-1': TACTICAL_ROLE.BAIT,
      'blue-2': TACTICAL_ROLE.COVER
    }
  };
  assert.equal(alteredMission.missionId, `blue:${acknowledgedEpoch}:team`);
  assert.notEqual(alteredMission.posture, POSTURE.HOLD);
  assert.notEqual(alteredMission.roles['blue-1'], TACTICAL_ROLE.HOLD_WING);
  assert.notEqual(alteredMission.roles['blue-2'], TACTICAL_ROLE.HOLD_WING);
  assert.notEqual(alteredMission.expiresAt, originalExpiry);

  let tamperedDispatchTime = null;
  const dispatchTamperedCommit = () => {
    const sent = sim.debug.dispatch('blue-1', MESSAGE_KIND.PLAN_COMMIT, {
      mission: alteredMission,
      standardCode: STANDARD_CODE.GO
    });
    if (sent) tamperedDispatchTime = sim.simTime;
    return sent;
  };
  if (!dispatchTamperedCommit()) {
    snapshot = runUntil(sim, dispatchTamperedCommit, {
      maxSeconds: 2,
      label: 'tampered COMMIT dispatch'
    });
  } else {
    snapshot = sim.observe();
  }
  const tamperedCourier = snapshot.couriers.find(courier =>
    courier.senderId === 'blue-1' && courier.receiverId === 'blue-2' &&
    courier.kind === MESSAGE_KIND.PLAN_COMMIT);
  assert.ok(tamperedCourier, 'tampered COMMIT did not enter the finite channel');
  assert.equal(tamperedCourier.mode, 'voice');
  const followerMessagesBefore = century(snapshot, 'blue-2').messagesReceived;

  snapshot = runUntil(sim, current => current.observe().recentCommunicationEvents.some(event =>
    event.event === 'delivered' && event.messageId === tamperedCourier.id &&
    event.senderId === 'blue-1' && event.receiverId === 'blue-2' &&
    event.kind === MESSAGE_KIND.PLAN_COMMIT), {
    maxSeconds: 1,
    label: 'tampered COMMIT physical delivery'
  });
  const tamperedDelivery = snapshot.recentCommunicationEvents.find(event =>
    event.event === 'delivered' && event.messageId === tamperedCourier.id);
  assert.ok(tamperedDelivery.t - tamperedDispatchTime >= TUNING.directMessageDelay,
    'tampered COMMIT bypassed finite delivery');
  runUntil(sim, current => century(current.observe(), 'blue-2').messagesReceived >
    followerMessagesBefore, { maxSeconds: 1, label: 'tampered COMMIT inbox processing' });

  const follower = century(sim.observe(), 'blue-2');
  const followerPlan = sim.debug.knowledge('blue-2').plan;
  assert.equal(follower.posture, POSTURE.AGGRESSIVE,
    'follower activated altered COMMIT content');
  assert.equal(follower.planStatus, PLAN_STATUS.ACKNOWLEDGED);
  assert.equal(follower.pendingPlanEpoch, acknowledgedEpoch);
  assert.equal(followerPlan.posture, POSTURE.AGGRESSIVE);
  assert.equal(followerPlan.role, TACTICAL_ROLE.FLANK);
  assert.equal(observerEvents(sim, 'mission-committed')
    .some(event => event.payload.centuryId === 'blue-2'), false,
  'rejected COMMIT emitted a follower mission-committed event');
  assertStable(sim, 'tampered COMMIT rejection');
});

test('coordinator waits for a busy COMMIT channel before activating acknowledged intent', () => {
  const sim = createBattlefieldSimulation({ seed: 0x28b2, perCentury: 12 });
  sim.issuePosture(TEAM.BLUE, POSTURE.HOLD);

  // Once the follower's real ACK is physically in flight, occupy the
  // coordinator voice channel with a long-form invalid proposal. The invalid
  // payload cannot alter the follower plan, but its finite transmission keeps
  // the subsequent COMMIT attempt busy.
  let busyDispatchTime = null;
  let snapshot = runUntil(sim, current => {
    const ackInFlight = current.observe().couriers.some(courier =>
      courier.senderId === 'blue-2' && courier.receiverId === 'blue-1' &&
      courier.kind === MESSAGE_KIND.PLAN_ACK);
    if (!ackInFlight) return false;
    const sent = current.debug.dispatch('blue-1', MESSAGE_KIND.PLAN_PROPOSAL, {
      marker: 'occupy-commit-channel'
    });
    if (sent) busyDispatchTime = current.simTime;
    return sent;
  }, { maxSeconds: 16, label: 'ACK in flight with coordinator channel occupied' });
  assert.ok(busyDispatchTime != null);
  assert.equal(snapshot.couriers.some(courier =>
    courier.senderId === 'blue-1' && courier.kind === MESSAGE_KIND.PLAN_PROPOSAL &&
    courier.mode === 'voice'), true);
  assert.equal(century(snapshot, 'blue-1').posture, POSTURE.AGGRESSIVE);

  snapshot = runUntil(sim, current => current.observe().recentCommunicationEvents.some(event =>
    event.event === 'withheld' && event.senderId === 'blue-1' &&
    event.kind === MESSAGE_KIND.PLAN_COMMIT && event.mode === 'voice-busy' &&
    event.t >= busyDispatchTime), {
    maxSeconds: 2,
    label: 'COMMIT withheld by occupied channel',
    afterStep: current => {
      const commitSent = current.observe().recentCommunicationEvents.some(event =>
        event.event === 'dispatched' && event.senderId === 'blue-1' &&
        event.kind === MESSAGE_KIND.PLAN_COMMIT && event.t >= busyDispatchTime);
      if (!commitSent) {
        assert.equal(century(current.observe(), 'blue-1').posture, POSTURE.AGGRESSIVE,
          'coordinator activated before any COMMIT dispatch');
      }
    }
  });
  const withheld = snapshot.recentCommunicationEvents.find(event =>
    event.event === 'withheld' && event.senderId === 'blue-1' &&
    event.kind === MESSAGE_KIND.PLAN_COMMIT && event.t >= busyDispatchTime);
  const ackDelivery = snapshot.recentCommunicationEvents.find(event =>
    event.event === 'delivered' && event.senderId === 'blue-2' &&
    event.receiverId === 'blue-1' && event.kind === MESSAGE_KIND.PLAN_ACK);
  assert.ok(ackDelivery);
  assert.ok(withheld.t >= ackDelivery.t);
  assert.equal(century(snapshot, 'blue-1').posture, POSTURE.AGGRESSIVE);
  assert.equal(century(snapshot, 'blue-1').planStatus, PLAN_STATUS.ACKNOWLEDGED);
  assert.equal(observerEvents(sim, 'mission-committed').length, 0,
    'withheld COMMIT produced a mission activation event');

  snapshot = runUntil(sim, current => current.observe().recentCommunicationEvents.some(event =>
    event.event === 'dispatched' && event.senderId === 'blue-1' &&
    event.receiverId === 'blue-2' && event.kind === MESSAGE_KIND.PLAN_COMMIT &&
    event.t > withheld.t), {
    maxSeconds: 3,
    label: 'COMMIT retry after channel availability',
    afterStep: current => {
      const commitSent = current.observe().recentCommunicationEvents.some(event =>
        event.event === 'dispatched' && event.senderId === 'blue-1' &&
        event.kind === MESSAGE_KIND.PLAN_COMMIT && event.t > withheld.t);
      if (!commitSent) {
        assert.equal(century(current.observe(), 'blue-1').posture, POSTURE.AGGRESSIVE,
          'coordinator changed posture while COMMIT remained withheld');
      }
    }
  });
  const commitDispatch = snapshot.recentCommunicationEvents.find(event =>
    event.event === 'dispatched' && event.senderId === 'blue-1' &&
    event.kind === MESSAGE_KIND.PLAN_COMMIT && event.t > withheld.t);
  assert.ok(commitDispatch);
  assert.equal(century(snapshot, 'blue-1').posture, POSTURE.HOLD);
  assert.equal(century(snapshot, 'blue-1').planStatus, PLAN_STATUS.COMMITTED);
  const coordinatorCommit = observerEvents(sim, 'mission-committed')
    .find(event => event.payload.centuryId === 'blue-1');
  assert.ok(coordinatorCommit.t >= commitDispatch.t,
    'coordinator committed before its successful COMMIT dispatch');

  runUntil(sim, current => {
    const follower = century(current.observe(), 'blue-2');
    return follower.posture === POSTURE.HOLD &&
      follower.planStatus === PLAN_STATUS.COMMITTED;
  }, { maxSeconds: 2, label: 'follower receives retried COMMIT' });
  assertStable(sim, 'busy COMMIT retry protocol');
});

test('observed follower ABORT accepts only an exact late COMMIT within reconciliation grace', () => {
  const sim = createBattlefieldSimulation({ seed: 0x28d2, perCentury: 12 });
  sim.issuePosture(TEAM.RED, POSTURE.DEFENSIVE_FEINT);

  // Lose every ordinary COMMIT after the real proposal/ACK exchange. The
  // coordinator activates, but the partitioned follower retains its prior
  // HOLD posture until its acknowledged mission expires.
  runUntil(sim, current => {
    const snapshot = current.observe();
    return century(snapshot, 'red-1').posture === POSTURE.DEFENSIVE_FEINT &&
      century(snapshot, 'red-1').planStatus === PLAN_STATUS.COMMITTED &&
      century(snapshot, 'red-2').posture === POSTURE.HOLD &&
      century(snapshot, 'red-2').planStatus === PLAN_STATUS.ACKNOWLEDGED;
  }, { maxSeconds: 14, label: 'red coordinator commit before follower delivery' });
  sim.debug.setCommunicationEnabled('red-2', false);

  let snapshot = runUntil(sim, current => {
    const follower = century(current.observe(), 'red-2');
    return follower.planStatus === PLAN_STATUS.ABORTED;
  }, {
    maxSeconds: TUNING.planCommitWindow + 3,
    label: 'follower coordination timeout',
    afterStep: current => {
      assert.equal(century(current.observe(), 'red-2').posture, POSTURE.HOLD,
        'lost COMMIT changed the follower active posture');
    }
  });
  const abortEvent = observerEvents(sim, 'mission-aborted')
    .find(event => event.payload.centuryId === 'red-2');
  assert.ok(abortEvent);
  assert.equal(abortEvent.payload.missionId, 'red:1:team');
  assert.equal(century(snapshot, 'red-2').standardCode, STANDARD_CODE.ABORT);
  const exactMission = sim.debug.knowledge('red-2').abortedMission;
  assert.ok(exactMission, 'follower discarded the mission required for reconciliation');

  // Red-1 comes before Red-2 in the mind-update barrier, so muting it now
  // prevents an automatic response on the aborting tick. It must first acquire
  // Red-2's public ABORT standard through physical vision.
  sim.debug.setCommunicationEnabled('red-1', false);
  runUntil(sim, current => {
    const ally = current.debug.knowledge('red-1').allyTrack;
    return ally?.recognizedMark === 'R2' && ally.standardCode === STANDARD_CODE.ABORT &&
      ally.standardEpoch === exactMission.epoch && ally.source === 'vision';
  }, { maxSeconds: 2, label: 'coordinator observes follower ABORT standard' });
  const observedAbort = sim.debug.knowledge('red-1').allyTrack;
  assert.equal(observedAbort.standardCode, STANDARD_CODE.ABORT);
  assert.ok(sim.simTime - observedAbort.observedAt < 1);
  assert.equal(observerEvents(sim, 'mission-reconciliation-sent').length, 0,
    'muted coordinator somehow transmitted a reconciliation');

  // First deliver a same-ID/epoch late COMMIT whose posture, roles, and expiry
  // differ from the acknowledged mission. Occupying the channel with this
  // packet also postpones the coordinator's automatic exact response.
  sim.debug.setCommunicationEnabled('red-2', true);
  const alteredMission = JSON.parse(JSON.stringify(exactMission));
  alteredMission.posture = POSTURE.AGGRESSIVE;
  alteredMission.roles = {
    'red-1': TACTICAL_ROLE.FIX,
    'red-2': TACTICAL_ROLE.FLANK
  };
  alteredMission.expiresAt += 1;
  assert.equal(alteredMission.missionId, exactMission.missionId);
  assert.equal(alteredMission.epoch, exactMission.epoch);
  assert.notEqual(alteredMission.posture, exactMission.posture);
  assert.notDeepEqual(alteredMission.roles, exactMission.roles);
  assert.notEqual(alteredMission.expiresAt, exactMission.expiresAt);

  let alteredDispatchTime = null;
  const attemptAlteredCommit = () => {
    sim.debug.setCommunicationEnabled('red-1', true);
    const sent = sim.debug.dispatch('red-1', MESSAGE_KIND.PLAN_COMMIT, {
      mission: alteredMission,
      standardCode: STANDARD_CODE.GO
    });
    if (sent) {
      alteredDispatchTime = sim.simTime;
    } else {
      // Keep automatic reconciliation disabled between deterministic retries.
      sim.debug.setCommunicationEnabled('red-1', false);
    }
    return sent;
  };
  if (!attemptAlteredCommit()) {
    snapshot = runUntil(sim, attemptAlteredCommit, {
      maxSeconds: 2,
      label: 'altered late COMMIT dispatch'
    });
  } else {
    snapshot = sim.observe();
  }
  const alteredCourier = snapshot.couriers.find(courier =>
    courier.senderId === 'red-1' && courier.receiverId === 'red-2' &&
    courier.kind === MESSAGE_KIND.PLAN_COMMIT);
  assert.ok(alteredCourier);
  assert.equal(alteredCourier.mode, 'voice');
  snapshot = runUntil(sim, current => current.observe().recentCommunicationEvents.some(event =>
    event.event === 'delivered' && event.messageId === alteredCourier.id &&
    event.kind === MESSAGE_KIND.PLAN_COMMIT), {
    maxSeconds: 1,
    label: 'altered late COMMIT delivery'
  });
  assert.ok(snapshot.recentCommunicationEvents.find(event =>
    event.event === 'delivered' && event.messageId === alteredCourier.id).t -
    alteredDispatchTime >= TUNING.directMessageDelay);
  runSteps(sim, Math.ceil(.3 / FIXED_DT));
  assert.equal(century(sim.observe(), 'red-2').posture, POSTURE.HOLD,
    'altered late COMMIT reconciled the follower');
  assert.equal(century(sim.observe(), 'red-2').planStatus, PLAN_STATUS.ABORTED);
  assert.equal(observerEvents(sim, 'mission-committed')
    .some(event => event.payload.centuryId === 'red-2'), false);

  // With the channel free again and the ABORT standard still public, the
  // committed coordinator automatically re-sends its exact stored mission.
  snapshot = runUntil(sim, current => observerEvents(current,
    'mission-reconciliation-sent').some(event =>
      event.payload.centuryId === 'red-1' &&
      event.payload.missionId === exactMission.missionId), {
    maxSeconds: 2,
    label: 'exact COMMIT reconciliation dispatch'
  });
  const exactCourier = snapshot.couriers.find(courier =>
    courier.senderId === 'red-1' && courier.receiverId === 'red-2' &&
    courier.kind === MESSAGE_KIND.PLAN_COMMIT && courier.id !== alteredCourier.id);
  assert.ok(exactCourier, 'reconciliation event had no finite COMMIT in flight');
  const reconciliationEvent = observerEvents(sim, 'mission-reconciliation-sent')[0];

  snapshot = runUntil(sim, current => {
    const follower = century(current.observe(), 'red-2');
    return follower.posture === POSTURE.DEFENSIVE_FEINT &&
      follower.planStatus === PLAN_STATUS.COMMITTED;
  }, { maxSeconds: 2, label: 'exact late COMMIT reconciliation delivery' });
  const exactDelivery = snapshot.recentCommunicationEvents.find(event =>
    event.event === 'delivered' && event.messageId === exactCourier.id);
  assert.ok(exactDelivery, 'exact reconciliation COMMIT was not physically delivered');
  const followerCommit = observerEvents(sim, 'mission-committed')
    .find(event => event.payload.centuryId === 'red-2');
  assert.equal(followerCommit.payload.source, 'late-commit-reconciliation');
  assert.ok(reconciliationEvent.t >= abortEvent.t);
  assert.ok(followerCommit.t <= abortEvent.t + TUNING.planReconcileGrace,
    'exact reconciliation arrived outside the allowed grace period');
  assert.equal(sim.debug.knowledge('red-2').abortedMission, null);
  assertStable(sim, 'ABORT reconciliation protocol');
});

test('unacknowledged WAITING follower discards timed-out intent and rejects an exact late COMMIT', () => {
  const sim = createBattlefieldSimulation({ seed: 0x28f3, perCentury: 12 });
  let sawAckDispatch = false;
  const captureAckDispatch = current => {
    sawAckDispatch ||= current.observe().recentCommunicationEvents.some(event =>
      event.event === 'dispatched' && event.kind === MESSAGE_KIND.PLAN_ACK &&
      event.senderId === 'red-2');
  };

  sim.issuePosture(TEAM.RED, POSTURE.DEFENSIVE_FEINT);
  runUntil(sim, current => century(current.observe(), 'red-2').planStatus ===
      PLAN_STATUS.WAITING, {
    maxSeconds: 12,
    label: 'follower receives its general order',
    afterStep: captureAckDispatch
  });
  const receipt = observerEvents(sim, 'mission-received')
    .find(event => event.payload.centuryId === 'red-2');
  assert.ok(receipt, 'WAITING follower has no record of its physically delivered order');
  const exactMission = {
    missionId: 'red:1:team',
    epoch: 1,
    posture: POSTURE.DEFENSIVE_FEINT,
    scope: 'team',
    expiresAt: receipt.t + TUNING.planCommitWindow,
    coordinatorId: 'red-1',
    roles: {
      'red-1': TACTICAL_ROLE.BAIT,
      'red-2': TACTICAL_ROLE.COVER
    }
  };

  // The follower has intent from its own general runner, but cannot receive
  // the proposal or transmit an ACK while this local communication channel is muted.
  sim.debug.setCommunicationEnabled('red-2', false);
  let snapshot = runUntil(sim, current => century(current.observe(), 'red-2').planStatus ===
      PLAN_STATUS.ABORTED, {
    maxSeconds: TUNING.planCommitWindow + 3,
    label: 'unacknowledged WAITING follower timeout',
    afterStep: current => {
      captureAckDispatch(current);
      const follower = century(current.observe(), 'red-2');
      if (follower.planStatus !== PLAN_STATUS.ABORTED) {
        assert.equal(follower.planStatus, PLAN_STATUS.WAITING,
          'muted follower left WAITING without receiving or acknowledging a proposal');
      }
      assert.equal(follower.posture, POSTURE.HOLD,
        'uncommitted team intent changed the follower posture');
    }
  });
  const abortEvent = observerEvents(sim, 'mission-aborted')
    .find(event => event.payload.centuryId === 'red-2');
  assert.ok(abortEvent, 'WAITING timeout emitted no mission-aborted event');
  assert.deepEqual(abortEvent.payload, {
    centuryId: 'red-2',
    epoch: exactMission.epoch,
    missionId: exactMission.missionId,
    reason: 'coordination-timeout'
  });
  assert.equal(sawAckDispatch, false,
    'follower successfully dispatched PLAN_ACK before its timeout');
  assert.equal(sim.debug.knowledge('red-2').abortedMission, null,
    'unacknowledged intent was retained as reconciliation authority');

  // Reconstruct the exact pending mission and send it through the ordinary
  // finite channel. Matching ID and epoch cannot revive discarded intent.
  sim.debug.setCommunicationEnabled('red-2', true);
  const dispatchLateCommit = current => {
    captureAckDispatch(current);
    return current.debug.dispatch('red-1', MESSAGE_KIND.PLAN_COMMIT, {
      mission: exactMission,
      standardCode: STANDARD_CODE.GO
    });
  };
  if (!dispatchLateCommit(sim)) {
    snapshot = runUntil(sim, dispatchLateCommit, {
      maxSeconds: 2,
      label: 'exact unacknowledged late COMMIT dispatch',
      afterStep: captureAckDispatch
    });
  } else {
    snapshot = sim.observe();
  }
  const lateCourier = snapshot.couriers.find(courier =>
    courier.senderId === 'red-1' && courier.receiverId === 'red-2' &&
    courier.kind === MESSAGE_KIND.PLAN_COMMIT);
  assert.ok(lateCourier, 'late COMMIT bypassed the finite communication channel');
  assert.ok(['voice', 'runner'].includes(lateCourier.mode));

  snapshot = runUntil(sim, current => current.observe().recentCommunicationEvents.some(event =>
    event.event === 'delivered' && event.messageId === lateCourier.id &&
    event.kind === MESSAGE_KIND.PLAN_COMMIT), {
    maxSeconds: 2,
    label: 'exact unacknowledged late COMMIT delivery',
    afterStep: captureAckDispatch
  });
  const delivery = snapshot.recentCommunicationEvents.find(event =>
    event.event === 'delivered' && event.messageId === lateCourier.id);
  assert.ok(delivery.t > exactMission.expiresAt,
    'test COMMIT was not actually late relative to the discarded mission');
  runSteps(sim, Math.ceil(.3 / FIXED_DT), { afterStep: captureAckDispatch });
  const follower = century(sim.observe(), 'red-2');
  assert.equal(follower.posture, POSTURE.HOLD,
    'exact same-ID/epoch late COMMIT revived unacknowledged intent');
  assert.equal(follower.planStatus, PLAN_STATUS.ABORTED);
  assert.equal(sim.debug.knowledge('red-2').abortedMission, null);
  assert.equal(observerEvents(sim, 'mission-committed')
    .some(event => event.payload.centuryId === 'red-2'), false);
  assert.equal(sawAckDispatch, false);
  assertStable(sim, 'unacknowledged timeout and late COMMIT rejection');
});

test('general-post delivery envelope still defers a newly dispatched runner until the next tick', () => {
  const sim = createBattlefieldSimulation({ seed: 0x28f2, perCentury: 12 });
  const generalPost = { x: 0, z: -54 };
  let snapshot = sim.observe();
  const initialCenter = century(snapshot, 'blue-1').center;
  const initialOfficer = centurion(snapshot, 'blue-1');
  const targetCenter = {
    x: generalPost.x + initialCenter.x - initialOfficer.x,
    z: generalPost.z + initialCenter.z - initialOfficer.z
  };
  sim.debug.teleportCentury('blue-1', targetCenter.x, targetCenter.z);
  snapshot = sim.observe();
  assert.ok(distance(centurion(snapshot, 'blue-1'), generalPost) < 1e-9,
    'century officer was not placed inside the general-post delivery envelope');

  sim.issuePosture('blue-1', POSTURE.HOLD);
  assert.equal(sim.observe().generalCommandsQueued, 1);
  sim.step(FIXED_DT);
  snapshot = sim.observe();
  const dispatchTick = sim.simTime;
  const generalEvents = snapshot.recentCommunicationEvents.filter(event =>
    event.senderId === 'general-blue' && event.receiverId === 'blue-1');
  const dispatch = generalEvents.find(event =>
    event.event === 'general-order-dispatched' && event.kind === 'posture');
  assert.ok(dispatch, 'first tick did not dispatch the queued general runner');
  assert.equal(dispatch.t, dispatchTick);
  assert.equal(generalEvents.some(event => event.event === 'general-order-delivered'), false,
    'runner delivered in the same tick in which it was created');
  const runner = snapshot.couriers.find(courier =>
    courier.senderId === 'general-blue' && courier.receiverId === 'blue-1' &&
    courier.kind === 'posture');
  assert.ok(runner, 'dispatch event had no physical runner');
  assert.equal(runner.mode, 'general-runner');
  assert.equal(runner.phase, 'outbound');
  assert.equal(century(snapshot, 'blue-1').posture, POSTURE.AGGRESSIVE);
  assert.equal(century(snapshot, 'blue-1').planStatus, PLAN_STATUS.DOCTRINE);
  assert.equal(sim.debug.knowledge('blue-1').commandInbox.length, 0);
  assert.equal(observerEvents(sim, 'mission-committed')
    .some(event => event.payload.centuryId === 'blue-1'), false);

  snapshot = runUntil(sim, current => {
    const events = current.observe().recentCommunicationEvents;
    const delivered = events.some(event => event.event === 'general-order-delivered' &&
      event.messageId === runner.id);
    const applied = observerEvents(current, 'mission-committed')
      .some(event => event.payload.centuryId === 'blue-1');
    return delivered && applied;
  }, { maxSeconds: .5, label: 'following-tick general order delivery and application' });
  const delivery = snapshot.recentCommunicationEvents.find(event =>
    event.event === 'general-order-delivered' && event.messageId === runner.id);
  const application = observerEvents(sim, 'mission-committed')
    .find(event => event.payload.centuryId === 'blue-1');
  assert.ok(delivery.t >= dispatchTick + FIXED_DT - 1e-10,
    'general runner delivered before the tick following dispatch');
  assert.ok(application.t >= dispatchTick + FIXED_DT - 1e-10,
    'general order applied before the tick following dispatch');
  assert.ok(application.t >= delivery.t,
    'posture applied before its general runner delivered');
  assert.equal(century(snapshot, 'blue-1').posture, POSTURE.HOLD);
  assert.equal(century(snapshot, 'blue-1').planStatus, PLAN_STATUS.COMMITTED);
  assertStable(sim, 'general-post dispatch barrier');
});

test('pre-step posture and zone commands deliver FIFO and retain independent watermarks', () => {
  const sim = createBattlefieldSimulation({ seed: 0x28d3, perCentury: 12 });
  const postureReceipt = sim.issuePosture('blue-1', POSTURE.HOLD);
  const requestedZone = { x: -4, z: -26, radius: 7 };
  const zoneReceipt = sim.setHoldZone('blue-1', requestedZone);
  assert.equal(postureReceipt.serial, 1);
  assert.equal(zoneReceipt.serial, 2);
  assert.equal(postureReceipt.issuedAt, 0);
  assert.equal(zoneReceipt.issuedAt, 0);

  let snapshot = sim.observe();
  assert.equal(snapshot.generalCommandsQueued, 2);
  assert.equal(snapshot.couriers.length, 0);
  assert.equal(century(snapshot, 'blue-1').posture, POSTURE.AGGRESSIVE);
  assert.equal(century(snapshot, 'blue-1').holdZone, null);

  sim.step(FIXED_DT);
  snapshot = sim.observe();
  assert.equal(snapshot.generalCommandsQueued, 1);
  assert.deepEqual(snapshot.couriers.filter(courier =>
    courier.senderId === 'general-blue' && courier.receiverId === 'blue-1')
    .map(courier => courier.kind), ['posture'],
  'later zone command overtook the queued posture command');

  snapshot = runUntil(sim, current => {
    const unit = century(current.observe(), 'blue-1');
    return unit.posture === POSTURE.HOLD && unit.planStatus === PLAN_STATUS.COMMITTED;
  }, {
    maxSeconds: 15,
    label: 'first FIFO posture delivery',
    afterStep: current => {
      assert.equal(century(current.observe(), 'blue-1').holdZone, null,
        'zone applied before the earlier posture command');
    }
  });
  assert.equal(snapshot.generalCommandsQueued, 1,
    'zone left the queue before the posture runner returned');
  assert.equal(sim.debug.knowledge('blue-1').plan.scope, 'single');

  snapshot = runUntil(sim, current => century(current.observe(), 'blue-1').holdZone !== null, {
    maxSeconds: 25,
    label: 'second FIFO zone delivery',
    afterStep: current => {
      const active = current.observe().couriers.filter(courier =>
        courier.senderId === 'general-blue' && courier.receiverId === 'blue-1');
      assert.ok(active.length <= 1, 'general dispatched concurrent commands to one officer');
    }
  });
  const unit = century(snapshot, 'blue-1');
  assert.equal(unit.posture, POSTURE.HOLD,
    'higher zone serial suppressed the posture-family watermark');
  assert.equal(unit.planStatus, PLAN_STATUS.COMMITTED);
  assert.equal(unit.holdZone.x, requestedZone.x);
  assert.equal(unit.holdZone.z, requestedZone.z);
  assert.equal(unit.holdZone.radius, requestedZone.radius);
  assert.equal(snapshot.generalCommandsQueued, 0);
  assert.equal(sim.debug.knowledge('blue-1').commandInbox.length, 0);

  const generalEvents = snapshot.recentCommunicationEvents.filter(event =>
    event.senderId === 'general-blue' && event.receiverId === 'blue-1' &&
    ['general-order-dispatched', 'general-order-delivered'].includes(event.event));
  const postureDispatch = generalEvents.find(event =>
    event.event === 'general-order-dispatched' && event.kind === 'posture');
  const postureDelivery = generalEvents.find(event =>
    event.event === 'general-order-delivered' && event.kind === 'posture');
  const zoneDispatch = generalEvents.find(event =>
    event.event === 'general-order-dispatched' && event.kind === 'set-zone');
  const zoneDelivery = generalEvents.find(event =>
    event.event === 'general-order-delivered' && event.kind === 'set-zone');
  for (const [name, event] of Object.entries({
    postureDispatch, postureDelivery, zoneDispatch, zoneDelivery
  })) assert.ok(event, `missing ${name}`);
  assert.ok(postureDispatch.t < postureDelivery.t);
  assert.ok(postureDelivery.t < zoneDispatch.t,
    'zone runner dispatched before posture completed its FIFO journey');
  assert.ok(zoneDispatch.t < zoneDelivery.t);

  const postureCommit = observerEvents(sim, 'mission-committed')
    .find(event => event.payload.centuryId === 'blue-1');
  const zoneApplied = observerEvents(sim, 'hold-zone-received')
    .find(event => event.payload.centuryId === 'blue-1');
  assert.equal(postureCommit.payload.epoch, postureReceipt.serial);
  assert.equal(zoneApplied.payload.serial, zoneReceipt.serial);
  assert.ok(postureCommit.t >= postureDelivery.t);
  assert.ok(zoneApplied.t >= zoneDelivery.t);
  assertStable(sim, 'general FIFO and family watermarks');
});

test('individual-century posture stays local and emits no team-plan traffic', () => {
  const sim = createBattlefieldSimulation({ seed: 0x28c1, perCentury: 12 });
  const partnerPlanBefore = sim.debug.knowledge('blue-2').plan;
  const receipt = sim.issuePosture('blue-1', POSTURE.HOLD);
  assert.ok(deepFrozen(receipt));
  assert.deepEqual(receipt, {
    serial: 1,
    serialByTeam: { blue: 1 },
    command: 'posture',
    recipients: ['blue-1'],
    teamScope: false,
    issuedAt: 0
  });

  let snapshot = sim.observe();
  assert.equal(snapshot.generalCommandsQueued, 1);
  assert.equal(century(snapshot, 'blue-1').posture, POSTURE.AGGRESSIVE,
    'single-century intent bypassed its physical courier');
  assert.equal(century(snapshot, 'blue-2').posture, POSTURE.AGGRESSIVE);
  sim.step(FIXED_DT);
  snapshot = sim.observe();
  assert.equal(snapshot.couriers.filter(courier =>
    courier.senderId === 'general-blue' && courier.receiverId === 'blue-1' &&
    courier.mode === 'general-runner' && courier.kind === 'posture').length, 1);
  assert.equal(snapshot.couriers.some(courier =>
    courier.senderId === 'general-blue' && courier.receiverId === 'blue-2'), false,
  'local command dispatched a courier to the partner');

  const teamPlanKinds = new Set([
    MESSAGE_KIND.PLAN_PROPOSAL,
    MESSAGE_KIND.PLAN_ACK,
    MESSAGE_KIND.PLAN_COMMIT
  ]);
  let sawTeamPlanTraffic = false;
  const auditIsolation = current => {
    const currentSnapshot = current.observe();
    if (currentSnapshot.recentCommunicationEvents.some(event =>
      teamPlanKinds.has(event.kind))) sawTeamPlanTraffic = true;
    assert.equal(century(currentSnapshot, 'blue-2').posture, POSTURE.AGGRESSIVE,
      'single-century mission changed its partner posture');
    assert.deepEqual(current.debug.knowledge('blue-2').plan, partnerPlanBefore,
      'single-century mission changed its partner plan');
  };

  snapshot = runUntil(sim, current => {
    const unit = century(current.observe(), 'blue-1');
    const plan = current.debug.knowledge('blue-1').plan;
    return unit.posture === POSTURE.HOLD && unit.planStatus === PLAN_STATUS.COMMITTED &&
      plan.scope === 'single';
  }, {
    maxSeconds: 16,
    label: 'individual general-courier delivery',
    afterStep: auditIsolation
  });
  runSteps(sim, Math.ceil(4 / FIXED_DT), {
    checkEvery: 30,
    afterStep: auditIsolation
  });

  assert.equal(sawTeamPlanTraffic, false,
    'individual mission emitted proposal, ACK, or COMMIT traffic');
  assert.equal(century(snapshot, 'blue-1').tacticalRole, TACTICAL_ROLE.HOLD_WING);
  assert.equal(century(sim.observe(), 'blue-2').tacticalRole, TACTICAL_ROLE.FLANK);
  assert.deepEqual(sim.debug.knowledge('blue-2').plan, partnerPlanBefore);
  const commits = observerEvents(sim, 'mission-committed');
  assert.equal(commits.length, 1);
  assert.deepEqual(commits[0].payload, {
    centuryId: 'blue-1',
    epoch: 1,
    posture: POSTURE.HOLD,
    role: TACTICAL_ROLE.HOLD_WING,
    scope: 'single',
    source: 'general-courier'
  });
  assertStable(sim, 'individual-century command isolation');
});

test('team hold-zone intent travels physically and is divided into distinct doctrinal sectors', () => {
  const sim = createBattlefieldSimulation({ seed: 0x0abc, perCentury: 12 });
  const requested = { x: 2, z: -27, radius: 11 };
  const receipt = sim.setHoldZone(TEAM.BLUE, requested);
  assert.ok(deepFrozen(receipt));
  assert.equal(receipt.command, 'set-zone');
  assert.deepEqual(receipt.recipients, ['blue-1', 'blue-2']);

  let snapshot = sim.observe();
  assert.equal(century(snapshot, 'blue-1').holdZone, null);
  assert.equal(century(snapshot, 'blue-2').holdZone, null);
  assert.equal(snapshot.generalCommandsQueued, 2);
  sim.step(FIXED_DT);
  assert.equal(sim.observe().couriers.filter(courier =>
    courier.senderId === 'general-blue' && courier.mode === 'general-runner' &&
    courier.kind === 'set-zone').length, 2);
  assert.equal(century(sim.observe(), 'blue-1').holdZone, null);
  assert.equal(century(sim.observe(), 'blue-2').holdZone, null);

  snapshot = runUntil(sim, current => ['blue-1', 'blue-2'].every(id =>
    century(current.observe(), id).holdZone !== null), {
    maxSeconds: 16,
    label: 'team hold-zone courier delivery'
  });
  const left = century(snapshot, 'blue-1').holdZone;
  const right = century(snapshot, 'blue-2').holdZone;
  assert.deepEqual(left.sectorOf, { x: requested.x, z: requested.z });
  assert.deepEqual(right.sectorOf, { x: requested.x, z: requested.z });
  assert.equal(left.radius, requested.radius);
  assert.equal(right.radius, requested.radius);
  assert.notDeepEqual({ x: left.x, z: left.z }, { x: right.x, z: right.z },
    'team zone was telepathically shared as one point instead of split into sectors');
  assert.ok(left.x < requested.x && right.x > requested.x,
    'blue doctrinal wings received the wrong zone sectors');
  assert.equal((left.x + right.x) / 2, requested.x);
  assert.equal(left.z, requested.z);
  assert.equal(right.z, requested.z);
  assert.equal(observerEvents(sim, 'hold-zone-received').length, 2);
  assertStable(sim, 'team hold-zone protocol');
});

test('public-standard acquisition enables finite voice, while a muted partition blocks receipt', () => {
  const sim = createBattlefieldSimulation({ seed: 0x1234, perCentury: 12 });
  assert.equal(sim.debug.knowledge('blue-1').allyTrack, null);
  runUntil(sim, current => current.debug.knowledge('blue-1').allyTrack?.recognizedMark === 'B2', {
    maxSeconds: 1,
    label: 'public-standard acquisition'
  });
  runUntil(sim, current => current.simTime >= 1, {
    maxSeconds: 1,
    label: 'initial voice channel availability'
  });

  const beforeVoice = sim.diagnostics().century['blue-2'].messagesReceived;
  const dispatchVoice = () => sim.debug.dispatch('blue-1', MESSAGE_KIND.FEINT_PHASE,
    { marker: 'finite-voice' });
  if (!dispatchVoice()) {
    runUntil(sim, () => dispatchVoice(), { maxSeconds: 2, label: 'finite voice dispatch' });
  }
  const voiceDispatchTime = sim.simTime;
  let snapshot = sim.observe();
  const voiceCourier = snapshot.couriers.find(courier =>
    courier.senderId === 'blue-1' && courier.kind === MESSAGE_KIND.FEINT_PHASE);
  assert.ok(voiceCourier, 'voice dispatch created no finite in-flight signal');
  assert.equal(voiceCourier.mode, 'voice');

  snapshot = runUntil(sim, current => current.observe().recentCommunicationEvents.some(event =>
    event.event === 'delivered' && event.kind === MESSAGE_KIND.FEINT_PHASE &&
    event.t >= voiceDispatchTime), {
    maxSeconds: 1,
    label: 'finite voice delivery'
  });
  const voiceDelivery = snapshot.recentCommunicationEvents.find(event =>
    event.event === 'delivered' && event.kind === MESSAGE_KIND.FEINT_PHASE &&
    event.t >= voiceDispatchTime);
  assert.equal(voiceDelivery.delivery, 'voice');
  assert.ok(voiceDelivery.t - voiceDispatchTime >= TUNING.directMessageDelay - 1e-9,
    'voice arrived before its finite transmission delay');
  runUntil(sim, current => current.diagnostics().century['blue-2'].messagesReceived > beforeVoice, {
    maxSeconds: 1,
    label: 'voice inbox processing'
  });

  runUntil(sim, current => !current.observe().couriers.some(courier =>
    courier.senderId === 'blue-1' && courier.mode === 'voice'), {
    maxSeconds: 1,
    label: 'voice signal completion'
  });
  const beforePartition = sim.diagnostics().century['blue-2'].messagesReceived;
  sim.debug.setCommunicationEnabled('blue-2', false);
  const dispatchPartitioned = () => sim.debug.dispatch('blue-1', MESSAGE_KIND.FEINT_PHASE,
    { marker: 'partitioned' });
  if (!dispatchPartitioned()) {
    runUntil(sim, () => dispatchPartitioned(), {
      maxSeconds: 2,
      label: 'partitioned voice dispatch'
    });
  }
  const partitionDispatchTime = sim.simTime;
  assert.equal(sim.observe().couriers.find(courier =>
    courier.senderId === 'blue-1' && courier.kind === MESSAGE_KIND.FEINT_PHASE)?.mode, 'voice');
  runSteps(sim, Math.ceil(1 / FIXED_DT), { checkEvery: 15 });
  assert.equal(sim.diagnostics().century['blue-2'].messagesReceived, beforePartition,
    'muted receiver accepted a message');
  assert.equal(sim.debug.knowledge('blue-2').inbox.length, 0);
  assert.equal(sim.observe().recentCommunicationEvents.some(event =>
    event.event === 'delivered' && event.kind === MESSAGE_KIND.FEINT_PHASE &&
    event.t >= partitionDispatchTime), false,
  'muted partition logged a successful delivery');

  sim.debug.setCommunicationEnabled('blue-1', false);
  assert.equal(sim.debug.dispatch('blue-1', MESSAGE_KIND.LINE_REPORT, {}), false,
    'muted sender still dispatched a message');
  assertStable(sim, 'voice and partition scenario');
});

test('far communication uses one physical runner for the outbound and return journey',
  { timeout: 30_000 }, () => {
    const sim = createBattlefieldSimulation({ seed: 0x5151, perCentury: 12 });
    sim.debug.setCommunicationEnabled('red-1', false);
    sim.debug.teleportCentury('red-2', 30, 34);
    runUntil(sim, current => {
      const ally = current.debug.knowledge('red-1').allyTrack;
      const officer = centurion(current.observe(), 'red-1');
      return ally && distance(ally, officer) > TUNING.officerVoice + 2;
    }, { maxSeconds: 2, label: 'far public-standard track' });
    sim.debug.setCommunicationEnabled('red-1', true);

    assert.equal(sim.debug.dispatch('red-1', MESSAGE_KIND.FEINT_PHASE,
      { marker: 'physical-runner' }), true);
    let snapshot = sim.observe();
    const outbound = snapshot.couriers.find(courier =>
      courier.senderId === 'red-1' && courier.kind === MESSAGE_KIND.FEINT_PHASE &&
      courier.mode === 'runner');
    assert.ok(outbound, 'far dispatch did not create a physical runner');
    const runnerId = outbound.id;
    assert.equal(outbound.phase, 'outbound');
    assert.equal(sim.debug.dispatch('red-1', MESSAGE_KIND.FEINT_PHASE,
      { marker: 'must-be-withheld' }), false,
    'a second runner was dispatched while the first was active');
    assert.ok(sim.observe().recentCommunicationEvents.some(event =>
      event.event === 'withheld' && event.senderId === 'red-1' &&
      event.kind === MESSAGE_KIND.FEINT_PHASE && event.mode === 'runner-busy'));

    const phases = new Set();
    snapshot = runUntil(sim, current => current.observe().couriers.some(courier =>
      courier.id === runnerId && courier.phase === 'return'), {
      maxSeconds: 22,
      label: 'physical runner outbound delivery',
      afterStep: current => {
        const relevant = current.observe().couriers.filter(courier =>
          courier.senderId === 'red-1' && ['runner', 'runner-return'].includes(courier.mode));
        assert.ok(relevant.length <= 1, 'sender materialized concurrent physical runners');
        if (relevant[0]) phases.add(relevant[0].phase);
      }
    });
    const returning = snapshot.couriers.find(courier => courier.id === runnerId);
    assert.equal(returning.mode, 'runner-return');
    assert.equal(returning.phase, 'return');
    phases.add(returning.phase);
    assert.ok(snapshot.recentCommunicationEvents.some(event =>
      event.event === 'delivered' && event.messageId === runnerId &&
      event.delivery === 'runner'));

    // Prevent an unrelated periodic report from departing after this runner
    // returns; muting does not remove or teleport the physical body.
    sim.debug.setCommunicationEnabled('red-1', false);
    runUntil(sim, current => !current.observe().couriers.some(courier => courier.id === runnerId), {
      maxSeconds: 22,
      label: 'physical runner return',
      afterStep: current => {
        const relevant = current.observe().couriers.filter(courier =>
          courier.senderId === 'red-1' && ['runner', 'runner-return'].includes(courier.mode));
        assert.ok(relevant.length <= 1, 'return journey duplicated the runner body');
        if (relevant[0]) {
          assert.equal(relevant[0].id, runnerId);
          phases.add(relevant[0].phase);
        }
      }
    });
    assert.deepEqual(phases, new Set(['outbound', 'return']));
    assert.equal(sim.debug.knowledge('red-1').communicationState, 'runner-returned');
  assertStable(sim, 'physical runner round trip');
});

test('runner evidence keeps its issuance age, causal order, and semantic expiry',
  { timeout: 20_000 }, () => {
    const allCenturyIds = ['blue-1', 'blue-2', 'red-1', 'red-2'];
    const setupDistantBluePair = seed => {
      const sim = createBattlefieldSimulation({ seed, perCentury: 12 });
      sim.debug.teleportCentury('blue-1', -64, -68);
      sim.debug.teleportCentury('blue-2', 64, -68);
      for (const id of allCenturyIds) sim.debug.setCommunicationEnabled(id, false);
      return sim;
    };
    const teleportOfficerOnto = (sim, centuryId, point) => {
      const snapshot = sim.observe();
      const center = century(snapshot, centuryId).center;
      const officer = centurion(snapshot, centuryId);
      sim.debug.teleportCentury(centuryId,
        point.x + center.x - officer.x,
        point.z + center.z - officer.z);
    };
    const exposeAndProcessRunner = (sim, runnerId, receiverId) => {
      const exposed = sim.observe().couriers.find(courier => courier.id === runnerId);
      assert.ok(exposed, `missing outbound runner ${runnerId}`);
      assert.equal(exposed.mode, 'runner');
      assert.equal(exposed.phase, 'outbound');
      teleportOfficerOnto(sim, receiverId, exposed);
      sim.debug.setCommunicationEnabled(receiverId, true);
      let delivery = null;
      const snapshot = runUntil(sim, current => {
        delivery ||= current.observe().recentCommunicationEvents.find(event =>
          event.event === 'delivered' && event.messageId === runnerId);
        return delivery && current.debug.knowledge(receiverId).inbox.length === 0;
      }, { maxSeconds: 1, label: `${runnerId} delivery and inbox processing` });
      return { snapshot, delivery };
    };

    // A report that spends nine seconds on foot remains nine seconds old. Its
    // pose is stale, and its propagated contact stays below tactical confidence.
    const delayed = setupDistantBluePair(0x2e13);
    delayed.debug.setCommunicationEnabled('blue-1', true);
    const delayedIssuedAt = delayed.simTime;
    assert.equal(delayed.debug.dispatch('blue-1', MESSAGE_KIND.CONTACT_REPORT, {
      senderPose: {
        mark: 'B1', x: -30, z: -40, vx: 0, vz: 0,
        heading: 0, publicState: 'old-report',
        standardCode: STANDARD_CODE.NONE, standardEpoch: 0
      },
      confidence: 1,
      contact: {
        x: 10, z: 10, vx: 1, vz: 0, heading: Math.PI,
        strengthBand: 'body', width: 8, ageBand: 'fresh'
      }
    }), true);
    let snapshot = delayed.observe();
    const delayedRunner = snapshot.couriers.find(courier =>
      courier.senderId === 'blue-1' && courier.receiverId === 'blue-2' &&
      courier.kind === MESSAGE_KIND.CONTACT_REPORT);
    assert.ok(delayedRunner);
    assert.equal(delayedRunner.mode, 'runner');
    delayed.debug.setCommunicationEnabled('blue-1', false);
    delayed.debug.teleportCentury('blue-1', -64, 68);
    runSteps(delayed, Math.round(9 / FIXED_DT), { checkEvery: 90 });
    const delayedResult = exposeAndProcessRunner(delayed, delayedRunner.id, 'blue-2');
    const delayedDelivery = delayedResult.delivery;
    const delayedKnowledge = delayed.debug.knowledge('blue-2');
    assert.equal(delayedDelivery.delivery, 'runner');
    assert.ok(delayedDelivery.t - delayedIssuedAt >= 9,
      'runner report did not accumulate the intended physical transit age');
    assert.equal(delayedKnowledge.allyTrack.observedAt, delayedIssuedAt,
      'old runner pose was restamped as a fresh observation');
    assert.equal(delayedKnowledge.allyTrack.source, 'runner');
    assert.ok(delayed.simTime - delayedKnowledge.allyTrack.observedAt > 3.2,
      'old runner pose remained tactically fresh');
    assert.equal(delayedKnowledge.enemyTracks.length, 1);
    const delayedTrack = delayedKnowledge.enemyTracks[0];
    assert.equal(delayedTrack.source, 'ally-report');
    assert.ok(Math.abs(delayedTrack.observedAt - (delayedIssuedAt - .8)) < 1e-9,
      'reported contact was restamped at runner arrival');
    assert.equal(delayedTrack.directHits, 0);
    assert.ok(delayedTrack.confidence < .12,
      'long-delayed contact retained actionable tactical confidence');
    assert.equal(century(delayedResult.snapshot, 'blue-2').contactConfidence, 0);
    assert.equal(century(delayedResult.snapshot, 'blue-2').state,
      CENTURION_STATE.STAGE_FLANK);
    assertStable(delayed, 'long-delayed runner evidence');

    // An older physical runner is already outbound when a later voice packet
    // arrives. Move the speaker after dispatch so the applied pose can only
    // have come from that finite voice packet, not a simultaneous visual fix.
    const ordered = setupDistantBluePair(0x2e14);
    ordered.debug.setCommunicationEnabled('blue-1', true);
    const oldIssuedAt = ordered.simTime;
    assert.equal(ordered.debug.dispatch('blue-1', MESSAGE_KIND.LINE_REPORT, {
      senderPose: {
        mark: 'B1', x: -31, z: -41, vx: 0, vz: 0,
        heading: 0, publicState: 'older-runner',
        standardCode: STANDARD_CODE.NONE, standardEpoch: 0
      }
    }), true);
    snapshot = ordered.observe();
    const oldRunner = snapshot.couriers.find(courier =>
      courier.senderId === 'blue-1' && courier.kind === MESSAGE_KIND.LINE_REPORT);
    assert.ok(oldRunner);
    assert.equal(oldRunner.mode, 'runner');
    ordered.debug.setCommunicationEnabled('blue-1', false);
    ordered.debug.setCommunicationEnabled('blue-2', true);
    ordered.debug.teleportCentury('blue-1', 0, -20);
    ordered.debug.teleportCentury('blue-2', 0, 4);
    runUntil(ordered, current => {
      const ally = current.debug.knowledge('blue-1').allyTrack;
      return ally?.source === 'vision' && current.simTime - ally.observedAt < .3;
    }, { maxSeconds: 1, label: 'fresh close ally fix for voice dispatch' });
    ordered.debug.setCommunicationEnabled('blue-1', true);
    const newerIssuedAt = ordered.simTime;
    const newerPose = {
      mark: 'B1', x: 21, z: 22, vx: .5, vz: -.25,
      heading: .3, publicState: 'newer-voice',
      standardCode: STANDARD_CODE.NONE, standardEpoch: 0
    };
    assert.ok(newerIssuedAt > oldIssuedAt);
    assert.equal(ordered.debug.dispatch('blue-1', MESSAGE_KIND.LINE_REPORT,
      { senderPose: newerPose }), true);
    snapshot = ordered.observe();
    const newerVoice = snapshot.couriers.find(courier =>
      courier.senderId === 'blue-1' && courier.kind === MESSAGE_KIND.LINE_REPORT &&
      courier.mode === 'voice');
    assert.ok(newerVoice, 'newer pose did not enter the finite voice channel');
    ordered.debug.teleportCentury('blue-1', 64, 68);
    let voiceDelivery = null;
    runUntil(ordered, current => {
      voiceDelivery ||= current.observe().recentCommunicationEvents.find(event =>
        event.event === 'delivered' && event.messageId === newerVoice.id);
      const ally = current.debug.knowledge('blue-2').allyTrack;
      return voiceDelivery && ally?.source === 'voice' &&
        ally.observedAt === newerIssuedAt && ally.publicState === 'newer-voice';
    }, { maxSeconds: 1, label: 'newer voice pose application' });
    const allyBeforeOldRunner = ordered.debug.knowledge('blue-2').allyTrack;
    const receivedBeforeOldRunner = century(ordered.observe(), 'blue-2').messagesReceived;
    const oldResult = exposeAndProcessRunner(ordered, oldRunner.id, 'blue-2');
    const allyAfterOldRunner = ordered.debug.knowledge('blue-2').allyTrack;
    const causalFields = [
      'recognizedMark', 'x', 'z', 'vx', 'vz', 'heading', 'publicState',
      'observedAt', 'source', 'standardCode', 'standardEpoch'
    ];
    assert.ok(voiceDelivery.t < oldResult.delivery.t,
      'old runner did not actually arrive after the newer voice');
    assert.equal(oldResult.delivery.delivery, 'runner');
    assert.equal(century(oldResult.snapshot, 'blue-2').messagesReceived,
      receivedBeforeOldRunner + 1, 'older runner was not physically received and processed');
    assert.deepEqual(Object.fromEntries(causalFields.map(field =>
      [field, allyAfterOldRunner[field]])),
    Object.fromEntries(causalFields.map(field => [field, allyBeforeOldRunner[field]])),
    'older runner overwrote a newer voice observation');
    assert.equal(allyAfterOldRunner.source, 'voice');
    assert.equal(allyAfterOldRunner.publicState, 'newer-voice');
    assertStable(ordered, 'voice-before-runner causal ordering');

    const semanticCases = [
      { kind: MESSAGE_KIND.FLANK_WARNING, ttl: 5, request: 'flank',
        activeState: CENTURION_STATE.SUPPORT_ALLY,
        extra: { threatKind: 'seam-penetration', side: 'positive-lateral' } },
      { kind: MESSAGE_KIND.SUPPORT_REQUEST, ttl: 6, request: 'support',
        activeState: CENTURION_STATE.SUPPORT_ALLY, extra: {} },
      { kind: MESSAGE_KIND.WITHDRAW, ttl: 8, request: 'withdraw',
        activeState: CENTURION_STATE.WITHDRAW, extra: {} }
    ];
    for (const [caseIndex, semantic] of semanticCases.entries()) {
      for (const fresh of [true, false]) {
        const sim = setupDistantBluePair(0x2e20 + caseIndex * 2 + Number(!fresh));
        sim.debug.setCommunicationEnabled('blue-1', true);
        const officer = centurion(sim.observe(), 'blue-1');
        const issuedAt = sim.simTime;
        assert.equal(sim.debug.dispatch('blue-1', semantic.kind, {
          senderPose: {
            mark: 'B1', x: officer.x, z: officer.z, vx: 0, vz: 0,
            heading: officer.heading, publicState: officer.state,
            standardCode: STANDARD_CODE.NONE, standardEpoch: 0
          },
          ...semantic.extra
        }), true);
        const runner = sim.observe().couriers.find(courier =>
          courier.senderId === 'blue-1' && courier.kind === semantic.kind);
        assert.ok(runner);
        assert.equal(runner.mode, 'runner');
        sim.debug.setCommunicationEnabled('blue-1', false);
        const delay = semantic.ttl + (fresh ? -.5 : .5);
        runSteps(sim, Math.round(delay / FIXED_DT), { checkEvery: 90 });
        const result = exposeAndProcessRunner(sim, runner.id, 'blue-2');
        const ageAtDelivery = result.delivery.t - issuedAt;
        assert.equal(result.delivery.delivery, 'runner');
        assert.equal(century(result.snapshot, 'blue-2').messagesReceived, 1);
        const knowledge = sim.debug.knowledge('blue-2');
        if (fresh) {
          assert.ok(ageAtDelivery < semantic.ttl,
            `${semantic.kind} fresh control arrived after semantic expiry`);
          assert.equal(knowledge.supportRequest?.kind, semantic.request,
            `${semantic.kind} fresh control did not apply`);
          assert.equal(knowledge.supportRequest.expiresAt, issuedAt + semantic.ttl);
          assert.equal(knowledge.state, semantic.activeState);
          runUntil(sim, current => current.debug.knowledge('blue-2').supportRequest === null, {
            maxSeconds: 2,
            label: `${semantic.kind} issuance-relative expiry`
          });
          assert.ok(sim.simTime > issuedAt + semantic.ttl);
        } else {
          assert.ok(ageAtDelivery > semantic.ttl,
            `${semantic.kind} stale control arrived before semantic expiry`);
          assert.equal(knowledge.supportRequest, null,
            `${semantic.kind} gained fresh semantics at runner arrival`);
          assert.notEqual(knowledge.state, semantic.activeState,
            `${semantic.kind} stale semantics changed tactical state`);
        }
        assertStable(sim, `${semantic.kind} ${fresh ? 'fresh' : 'stale'} runner`);
      }
    }
  });

test('a lone visible enemy courier remains an individual contact and cannot drive formation tactics', () => {
  const sim = createBattlefieldSimulation({ seed: 0x28c0, perCentury: 12 });

  // First create one real enemy runner along a route that will cross the blue
  // officers' view. Move its sender away after departure so the courier is the
  // only enemy body that can become visible; the muted partner cannot launch a
  // second runner.
  sim.debug.teleportCentury('red-1', -64, 34);
  sim.debug.teleportCentury('red-2', 64, 34);
  sim.debug.setCommunicationEnabled('red-2', false);
  let snapshot = runUntil(sim, current => current.observe().couriers.some(courier =>
    courier.senderId === 'red-1' && courier.team === TEAM.RED &&
    courier.mode === 'runner' && courier.phase === 'outbound'), {
    maxSeconds: 1,
    label: 'lone enemy courier departure'
  });
  const runner = snapshot.couriers.find(courier =>
    courier.senderId === 'red-1' && courier.mode === 'runner');
  assert.ok(runner);
  assert.equal(snapshot.couriers.filter(courier =>
    courier.team === TEAM.RED && ['runner', 'runner-return'].includes(courier.mode)).length, 1);
  sim.debug.teleportCentury('red-1', -64, 68);

  snapshot = runUntil(sim, current => {
    const percept = current.debug.percept('centurion-blue-1');
    return percept.enemyObservations.length === 0 &&
      percept.individualObservations.some(observation =>
        observation.contactClass === 'courier');
  }, {
    maxSeconds: 7,
    label: 'lone enemy courier visual acquisition',
    afterStep: current => {
      for (const id of ['blue-1', 'blue-2']) {
        assert.equal(current.debug.knowledge(id).enemyTracks.length, 0,
          `${id} promoted the courier into a formation track`);
      }
    }
  });
  const percept = sim.debug.percept('centurion-blue-1');
  assert.equal(percept.enemyObservations.length, 0,
    'lone courier appeared in the formation-observation channel');
  assert.equal(percept.individualObservations.length, 1,
    'another enemy body contaminated the lone-courier scenario');
  assert.deepEqual({
    contactClass: percept.individualObservations[0].contactClass,
    kind: percept.individualObservations[0].kind,
    recognizedMark: percept.individualObservations[0].recognizedMark
  }, {
    contactClass: 'courier',
    kind: 'runner',
    recognizedMark: 'R1'
  });
  assertNoEngineIdentifiers(percept, 'lone-courier centurion percept');

  runUntil(sim, current => current.debug.knowledge('blue-1').individualContacts.some(contact =>
    contact.contactClass === 'courier' && contact.kind === 'runner'), {
    maxSeconds: 1,
    label: 'individual courier memory'
  });
  runSteps(sim, Math.ceil(1 / FIXED_DT), {
    checkEvery: 15,
    afterStep: current => {
      const currentSnapshot = current.observe();
      for (const id of ['blue-1', 'blue-2']) {
        const unit = century(currentSnapshot, id);
        const knowledge = current.debug.knowledge(id);
        assert.equal(knowledge.enemyTracks.length, 0,
          `${id} formed an enemy formation track from a courier`);
        assert.equal(unit.contactConfidence, 0);
        assert.equal(unit.flankThreat, null);
      }
      assert.notEqual(century(currentSnapshot, 'blue-1').state,
        CENTURION_STATE.FIX_ENEMY, 'fix doctrine treated a courier as a formation');
      assert.notEqual(century(currentSnapshot, 'blue-1').standardCode,
        STANDARD_CODE.FIXED, 'courier contact raised the FIXED formation signal');
      assert.notEqual(century(currentSnapshot, 'blue-2').state,
        CENTURION_STATE.MANEUVER_FLANK, 'flank doctrine maneuvered against a courier');
    }
  });
  const courierMemory = sim.debug.knowledge('blue-1').individualContacts
    .filter(contact => contact.contactClass === 'courier');
  assert.ok(courierMemory.length > 0, 'visible courier was not retained as an individual contact');
  assert.equal(sim.debug.knowledge('blue-1').enemyTracks.length, 0);
  assertStable(sim, 'lone enemy courier classification');
});

test('hidden-enemy counterfactuals remain causally identical without command-created runners', () => {
  const seed = 0x2804;
  const leftHidden = createBattlefieldSimulation({ seed, perCentury: 12 });
  const rightHidden = createBattlefieldSimulation({ seed, perCentury: 12 });

  leftHidden.debug.teleportCentury('red-1', -50, 68);
  leftHidden.debug.teleportCentury('red-2', -35, 68);
  rightHidden.debug.teleportCentury('red-1', 35, 68);
  rightHidden.debug.teleportCentury('red-2', 50, 68);

  for (let tick = 0; tick < 120; tick++) {
    leftHidden.step(FIXED_DT);
    rightHidden.step(FIXED_DT);
    for (const world of [leftHidden, rightHidden]) {
      assert.equal(world.observe().couriers.some(courier =>
        courier.team === TEAM.RED && ['runner', 'runner-return',
          'general-runner', 'general-return'].includes(courier.mode)), false,
      'hidden enemy materialized a physical runner');
    }
    if ((tick + 1) % 30 === 0) {
      for (const id of ['blue-1', 'blue-2']) {
        assert.equal(leftHidden.debug.knowledge(id).enemyTracks.length, 0,
          `${id} acquired a hidden enemy track`);
        assert.equal(rightHidden.debug.knowledge(id).enemyTracks.length, 0,
          `${id} acquired an alternate hidden enemy track`);
      }
      assert.equal(JSON.stringify(blueProjection(leftHidden)),
        JSON.stringify(blueProjection(rightHidden)),
      `friendly causal projection depends on hidden enemy placement at tick ${tick + 1}`);
    }
  }
  for (const world of [leftHidden, rightHidden]) {
    assert.equal(observerEvents(world, 'general-command-issued').length, 0,
      'counterfactual issued a general command and contaminated perception');
  }
  const blindPercept = leftHidden.debug.percept('blue-1-s1');
  assert.equal(blindPercept.nearby.some(body => body.team === TEAM.RED), false,
    'soldier percept contained an out-of-range enemy');

  const blueCenter = century(leftHidden.observe(), 'blue-1').center;
  leftHidden.debug.teleportCentury('red-1', blueCenter.x, blueCenter.z + 7);
  const revealedPercept = leftHidden.debug.percept('blue-1-s1');
  assert.ok(revealedPercept.nearby.some(body => body.team === TEAM.RED),
    'soldier failed to see a physically revealed enemy inside sensor range');
  runUntil(leftHidden, current => current.debug.knowledge('blue-1').enemyTracks.some(track =>
    track.source === 'vision'), { maxSeconds: 1, label: 'legal visual contact' });
  assertStable(leftHidden, 'revealed-contact scenario');
  assertStable(rightHidden, 'hidden counterfactual scenario');
});

test('defensive-feint doctrine waits for direct contact instead of probing unseen enemies', () => {
  const sim = createBattlefieldSimulation({ seed: 0x28f1, perCentury: 12 });
  sim.debug.teleportCentury('red-1', -50, 68);
  sim.debug.teleportCentury('red-2', -35, 68);
  sim.issuePosture(TEAM.BLUE, POSTURE.DEFENSIVE_FEINT);
  runUntil(sim, current => ['blue-1', 'blue-2'].every(id => {
    const unit = century(current.observe(), id);
    return unit.posture === POSTURE.DEFENSIVE_FEINT &&
      unit.planStatus === PLAN_STATUS.COMMITTED;
  }), { maxSeconds: 18, label: 'defensive-feint team commit' });

  let snapshot = sim.observe();
  assert.equal(century(snapshot, 'blue-1').tacticalRole, TACTICAL_ROLE.BAIT);
  assert.equal(century(snapshot, 'blue-2').tacticalRole, TACTICAL_ROLE.COVER);
  const forbidden = new Set([
    CENTURION_STATE.FEINT_OUT,
    CENTURION_STATE.FEINT_RETIRE,
    CENTURION_STATE.AMBUSH_STRIKE
  ]);
  runSteps(sim, Math.ceil(6 / FIXED_DT), {
    checkEvery: 30,
    afterStep: current => {
      const currentSnapshot = current.observe();
      const bait = century(currentSnapshot, 'blue-1');
      const cover = century(currentSnapshot, 'blue-2');
      assert.equal(bait.state, CENTURION_STATE.BAIT_WAIT);
      assert.equal(cover.state, CENTURION_STATE.COVER_FEINT);
      assert.equal(forbidden.has(bait.state) || forbidden.has(cover.state), false,
        'defensive feint probed or struck without a fresh direct track');
      assert.equal(current.debug.knowledge('blue-1').enemyTracks.length, 0);
      assert.equal(current.debug.knowledge('blue-2').enemyTracks.length, 0);
    }
  });
  snapshot = sim.observe();
  assert.equal(century(snapshot, 'blue-1').reason, 'bait-waits-for-perceived-contact');
  assert.equal(century(snapshot, 'blue-2').reason, 'cover-holds-for-draw-signal');
  assertStable(sim, 'defensive-feint no-contact scenario');
});

test('aggressive flank doctrine requires both FIXED provenance and a fresh direct track', () => {
  const sim = createBattlefieldSimulation({ seed: 0x28a6, perCentury: 12 });
  let snapshot = sim.observe();
  assert.equal(century(snapshot, 'blue-1').posture, POSTURE.AGGRESSIVE);
  assert.equal(century(snapshot, 'blue-1').tacticalRole, TACTICAL_ROLE.FIX);
  assert.equal(century(snapshot, 'blue-2').posture, POSTURE.AGGRESSIVE);
  assert.equal(century(snapshot, 'blue-2').tacticalRole, TACTICAL_ROLE.FLANK);

  sim.debug.teleportCentury('red-1', -50, 68);
  sim.debug.teleportCentury('red-2', -35, 68);
  runSteps(sim, Math.ceil(.8 / FIXED_DT), { checkEvery: 12 });
  assert.equal(century(sim.observe(), 'blue-2').state, CENTURION_STATE.STAGE_FLANK);
  assert.equal(century(sim.observe(), 'blue-2').reason, 'stage-until-fixed');

  const blueOne = century(sim.observe(), 'blue-1').center;
  sim.debug.teleportCentury('red-1', blueOne.x, blueOne.z + 8);
  let sawFreshBeforeFixed = false;
  let sawFixedProvenance = false;
  runUntil(sim, current => century(current.observe(), 'blue-2').state ===
      CENTURION_STATE.MANEUVER_FLANK, {
    maxSeconds: 4,
    label: 'FIXED-gated flank maneuver',
    checkEvery: 15,
    afterStep: current => {
      const unit = century(current.observe(), 'blue-2');
      const knowledge = current.debug.knowledge('blue-2');
      const freshDirect = knowledge.enemyTracks.some(track =>
        track.source === 'vision' && (track.directHits || 0) >= 2 &&
        current.simTime - track.lastDirectAt < 3.5);
      const fixedVisible = knowledge.allyTrack?.standardCode === STANDARD_CODE.FIXED;
      if (fixedVisible) sawFixedProvenance = true;
      if (freshDirect && !sawFixedProvenance) {
        sawFreshBeforeFixed = true;
        assert.notEqual(unit.state, CENTURION_STATE.MANEUVER_FLANK,
          'flank maneuver began before FIXED provenance arrived');
      }
      if (unit.state === CENTURION_STATE.MANEUVER_FLANK) {
        assert.ok(sawFixedProvenance, 'maneuver lacks observed FIXED provenance');
        assert.ok(freshDirect, 'maneuver lacks a fresh direct enemy track');
      }
    }
  });
  assert.ok(sawFreshBeforeFixed, 'scenario never isolated fresh contact before FIXED');
  assert.ok(sawFixedProvenance, 'flank officer never observed the fixer standard');

  sim.debug.teleportCentury('red-1', -50, 68);
  sim.debug.teleportCentury('red-2', -35, 68);
  snapshot = runUntil(sim, current => {
    const unit = century(current.observe(), 'blue-2');
    const knowledge = current.debug.knowledge('blue-2');
    return unit.state === CENTURION_STATE.STAGE_FLANK &&
      unit.reason === 'await-direct-reacquisition' &&
      knowledge.allyTrack?.standardCode === STANDARD_CODE.FIXED;
  }, {
    maxSeconds: 7,
    label: 'stale-track flank withdrawal',
    checkEvery: 15
  });
  const staleKnowledge = sim.debug.knowledge('blue-2');
  const freshestDirectAge = Math.min(...staleKnowledge.enemyTracks
    .filter(track => Number.isFinite(track.lastDirectAt))
    .map(track => sim.simTime - track.lastDirectAt), Infinity);
  assert.ok(freshestDirectAge >= 3.5,
    'flank stopped maneuvering before its direct track became stale');
  assert.equal(century(snapshot, 'blue-2').state, CENTURION_STATE.STAGE_FLANK,
    'FIXED signal bypassed the fresh-direct-track gate');
  assertStable(sim, 'aggressive FIXED/direct-track gating');
});

test('physical FIXED and DRAW standards cannot authorize tactics across plan epochs', () => {
  const fixed = createBattlefieldSimulation({ seed: 0x2e01, perCentury: 12 });
  const flankReceipt = fixed.issuePosture('blue-2', POSTURE.AGGRESSIVE);
  runUntil(fixed, current => {
    const flanker = century(current.observe(), 'blue-2');
    return flanker.planStatus === PLAN_STATUS.COMMITTED &&
      flanker.planEpoch === flankReceipt.serial;
  }, { maxSeconds: 15, label: 'newer individual flank plan' });
  assert.equal(century(fixed.observe(), 'blue-1').planEpoch, 0);
  const fixerCenter = century(fixed.observe(), 'blue-1').center;
  fixed.debug.teleportCentury('red-1', fixerCenter.x, fixerCenter.z + 8);
  fixed.debug.teleportCentury('red-2', 60, 68);

  let sawOldFixed = false;
  let sawFreshFlankContact = false;
  let sawFixEnemy = false;
  runSteps(fixed, Math.ceil(5 / FIXED_DT), {
    checkEvery: 30,
    afterStep: current => {
      const snapshot = current.observe();
      const fixer = century(snapshot, 'blue-1');
      const flanker = century(snapshot, 'blue-2');
      const knowledge = current.debug.knowledge('blue-2');
      sawFixEnemy ||= fixer.state === CENTURION_STATE.FIX_ENEMY;
      const directFresh = knowledge.enemyTracks.some(track =>
        track.source === 'vision' && (track.directHits || 0) >= 2 &&
        current.simTime - track.lastDirectAt < 1);
      sawFreshFlankContact ||= directFresh;
      const oldFixed = knowledge.allyTrack?.standardCode === STANDARD_CODE.FIXED &&
        knowledge.allyTrack.standardEpoch === 0;
      if (oldFixed) {
        sawOldFixed = true;
        const physicalFixer = centurion(snapshot, 'blue-1');
        const physicalFlanker = centurion(snapshot, 'blue-2');
        assert.equal(physicalFixer.standardCode, STANDARD_CODE.FIXED);
        assert.equal(physicalFixer.standardEpoch, 0);
        assert.ok(distance(physicalFixer, physicalFlanker) <=
          TUNING.standardSignalRange,
        'old FIXED was not inside the physical standard-observation channel');
        assert.equal(knowledge.allyTrack.recognizedMark, 'B1');
        assert.equal(knowledge.allyTrack.source, 'vision');
        assert.ok(current.simTime - knowledge.allyTrack.observedAt < .3);
        assert.equal(knowledge.plan.epoch, flankReceipt.serial);
        assert.ok(directFresh, 'old FIXED was not tested alongside fresh direct contact');
        assert.notEqual(knowledge.signalMemory.fixEpoch, knowledge.plan.epoch,
          'old FIXED entered the newer plan epoch signal cache');
      }
      assert.notEqual(flanker.state, CENTURION_STATE.MANEUVER_FLANK,
        'old-epoch FIXED authorized a newer-epoch flank maneuver');
    }
  });
  assert.ok(sawFixEnemy, 'epoch test never made Blue-1 physically raise FIXED');
  assert.ok(sawFreshFlankContact, 'epoch test never gave Blue-2 a fresh direct track');
  assert.ok(sawOldFixed, 'Blue-2 never perceived Blue-1 old-epoch FIXED standard');
  assertStable(fixed, 'old-epoch FIXED rejection');

  const drawn = createBattlefieldSimulation({ seed: 0x2e02, perCentury: 12 });
  const baitReceipt = drawn.issuePosture('blue-1', POSTURE.DEFENSIVE_FEINT);
  const coverReceipt = drawn.issuePosture('blue-2', POSTURE.DEFENSIVE_FEINT);
  runUntil(drawn, current => {
    const snapshot = current.observe();
    return century(snapshot, 'blue-1').planStatus === PLAN_STATUS.COMMITTED &&
      century(snapshot, 'blue-1').planEpoch === baitReceipt.serial &&
      century(snapshot, 'blue-2').planStatus === PLAN_STATUS.COMMITTED &&
      century(snapshot, 'blue-2').planEpoch === coverReceipt.serial;
  }, { maxSeconds: 16, label: 'different-epoch bait and cover plans' });
  assert.ok(baitReceipt.serial < coverReceipt.serial);
  assert.equal(century(drawn.observe(), 'blue-1').tacticalRole, TACTICAL_ROLE.BAIT);
  assert.equal(century(drawn.observe(), 'blue-2').tacticalRole, TACTICAL_ROLE.COVER);
  const baitCenter = century(drawn.observe(), 'blue-1').center;
  drawn.debug.teleportCentury('red-1', baitCenter.x, baitCenter.z + 8);
  drawn.debug.teleportCentury('red-2', 60, 68);

  let sawOldDraw = false;
  let sawPhysicalDraw = false;
  let sawFreshCoverContact = false;
  let sawFeintRetire = false;
  runSteps(drawn, Math.ceil(5 / FIXED_DT), {
    checkEvery: 30,
    afterStep: current => {
      const snapshot = current.observe();
      const bait = century(snapshot, 'blue-1');
      const cover = century(snapshot, 'blue-2');
      const knowledge = current.debug.knowledge('blue-2');
      sawFeintRetire ||= bait.state === CENTURION_STATE.FEINT_RETIRE;
      const physicalBait = centurion(snapshot, 'blue-1');
      sawPhysicalDraw ||= physicalBait.standardCode === STANDARD_CODE.DRAW &&
        physicalBait.standardEpoch === baitReceipt.serial;
      const directFresh = knowledge.enemyTracks.some(track =>
        track.source === 'vision' && (track.directHits || 0) >= 2 &&
        current.simTime - track.lastDirectAt < 1);
      sawFreshCoverContact ||= directFresh;
      const oldDraw = knowledge.allyTrack?.standardCode === STANDARD_CODE.DRAW &&
        knowledge.allyTrack.standardEpoch === baitReceipt.serial;
      if (oldDraw) {
        sawOldDraw = true;
        const physicalCover = centurion(snapshot, 'blue-2');
        assert.ok(distance(physicalBait, physicalCover) <=
          TUNING.standardSignalRange,
        'old DRAW was not inside the physical standard-observation channel');
        assert.equal(knowledge.allyTrack.recognizedMark, 'B1');
        assert.equal(knowledge.allyTrack.source, 'vision');
        assert.ok(current.simTime - knowledge.allyTrack.observedAt < .3);
        assert.equal(knowledge.plan.epoch, coverReceipt.serial);
        assert.ok(directFresh, 'old DRAW was not tested alongside fresh direct contact');
        assert.notEqual(knowledge.signalMemory.feintEpoch, knowledge.plan.epoch,
          'old DRAW entered the newer plan epoch signal cache');
      }
      assert.notEqual(cover.state, CENTURION_STATE.AMBUSH_STRIKE,
        'old-epoch DRAW sprung a newer-epoch cover ambush');
    }
  });
  assert.ok(sawFeintRetire, 'epoch test never made Blue-1 physically raise DRAW');
  assert.ok(sawPhysicalDraw, 'Blue-1 never published its old-epoch DRAW standard');
  assert.ok(sawFreshCoverContact, 'epoch test never gave Blue-2 a fresh direct track');
  assert.ok(sawOldDraw, 'Blue-2 never perceived Blue-1 old-epoch DRAW standard');
  assertStable(drawn, 'old-epoch DRAW rejection');
});

test('seed 0x2c12 preserves distinct recognized formations through FIX and flank maneuver',
  { timeout: 15_000 }, () => {
    const sim = createBattlefieldSimulation({ seed: 0x2c12, perCentury: 12 });
    const steps = Math.round(90 / FIXED_DT);
    let recognizedTrackIds = null;
    let firstFixAt = null;
    let firstManeuverAt = null;

    for (let index = 0; index < steps; index++) {
      sim.step(FIXED_DT);
      const snapshot = sim.observe();
      const fixer = century(snapshot, 'blue-1');
      const flanker = century(snapshot, 'blue-2');
      if (firstFixAt === null && fixer.state === CENTURION_STATE.FIX_ENEMY) {
        firstFixAt = sim.simTime;
      }
      if (firstManeuverAt === null &&
          flanker.state === CENTURION_STATE.MANEUVER_FLANK) {
        firstManeuverAt = sim.simTime;
      }
      if (firstFixAt === null) {
        assert.notEqual(fixer.state, CENTURION_STATE.GUARD_FLANK,
          `blue-1 guarded its flank before first FIX at t=${sim.simTime}`);
        assert.notEqual(flanker.state, CENTURION_STATE.GUARD_FLANK,
          `blue-2 guarded its flank before first FIX at t=${sim.simTime}`);
      }

      const tracks = sim.debug.knowledge('blue-1').enemyTracks;
      const r1Tracks = tracks.filter(track => track.signature === 'R1');
      const r2Tracks = tracks.filter(track => track.signature === 'R2');
      if (!recognizedTrackIds && r1Tracks.length && r2Tracks.length) {
        recognizedTrackIds = { r1: r1Tracks[0].id, r2: r2Tracks[0].id };
      }
      if (recognizedTrackIds) {
        assert.equal(r1Tracks.length, 1,
          `blue-1 lost or duplicated recognized R1 at t=${sim.simTime}`);
        assert.equal(r2Tracks.length, 1,
          `blue-1 lost or duplicated recognized R2 at t=${sim.simTime}`);
        assert.notEqual(r1Tracks[0].id, r2Tracks[0].id,
          'recognized enemy standards collapsed into one formation track');
        assert.equal(r1Tracks[0].id, recognizedTrackIds.r1,
          'R1 percept was reassigned to a different formation track');
        assert.equal(r2Tracks[0].id, recognizedTrackIds.r2,
          'R2 percept was reassigned to a different formation track');
        assert.equal(r1Tracks[0].source, 'vision');
        assert.equal(r2Tracks[0].source, 'vision');
      }
    }

    assert.ok(recognizedTrackIds,
      'blue-1 never maintained recognized tracks for both R1 and R2');
    assert.ok(firstFixAt !== null, 'blue-1 never entered FIX_ENEMY by t=90');
    assert.ok(firstManeuverAt !== null, 'blue-2 never entered MANEUVER_FLANK by t=90');
    assertStable(sim, '0x2c12 recognized-signature tactical replay');
  });

test('publicly routed relay soldiers neither strike nor publish relay cues before valid rally',
  { timeout: 20_000 }, () => {
    const sim = createBattlefieldSimulation({ seed: 0x2e35, perCentury: 12 });
    const initial = sim.observe();
    const maxFile = Math.max(...initial.soldiers.map(soldier => soldier.file));
    let routed = null;
    const routeSnapshot = runUntil(sim, current => {
      routed = current.observe().soldiers.find(soldier => soldier.alive &&
        soldier.state === SOLDIER_STATE.ROUTE &&
        (soldier.file % 3 === 0 || soldier.file === maxFile));
      return Boolean(routed);
    }, {
      maxSeconds: 135,
      label: 'living relay-duty soldier publicly routes',
      checkEvery: 300
    });
    routed = routeSnapshot.soldiers.find(soldier => soldier.id === routed.id);
    const routedAt = sim.simTime;
    assert.equal(routed.state, SOLDIER_STATE.ROUTE);
    assert.equal(routed.combatState, COMBAT_STATE.READY);
    assert.ok(routed.file % 3 === 0 || routed.file === maxFile,
      'selected routed soldier was not doctrinally eligible to relay');
    assert.ok(routed.morale < TUNING.routeMorale);

    let routeTicks = 0;
    let rally = null;
    const maximumRallySteps = Math.ceil(25 / FIXED_DT);
    for (let index = 0; index < maximumRallySteps; index++) {
      sim.step(FIXED_DT);
      const snapshot = sim.observe();
      const soldier = snapshot.soldiers.find(item => item.id === routed.id);
      assert.ok(soldier?.alive, 'routed relay soldier died before the rally check');
      if (soldier.state !== SOLDIER_STATE.ROUTE) {
        rally = soldier;
        break;
      }
      routeTicks++;
      assert.equal(soldier.combatState, COMBAT_STATE.READY,
        `routed soldier re-entered combat at t=${sim.simTime}`);
      const postRouteStrikes = snapshot.recentCombatEvents.filter(event =>
        event.attackerId === routed.id && event.t > routedAt &&
        ['hit', 'miss', 'blocked-friendly'].includes(event.event));
      assert.equal(postRouteStrikes.length, 0,
        `publicly routed soldier emitted a strike at t=${sim.simTime}`);
      if ((index + 1) % 300 === 0) assertStable(sim, `routed relay t=${sim.simTime}`);
    }
    assert.ok(routeTicks >= Math.round(5 / FIXED_DT),
      'route interval was too brief to exercise sustained suppression');
    assert.ok(rally, 'routed relay soldier did not reach a rally decision');
    assert.equal(rally.state, SOLDIER_STATE.FORM);
    assert.ok(rally.morale > TUNING.rallyMorale,
      'soldier left ROUTE without recovering rally morale');
    const rallyPercept = sim.debug.percept(routed.id);
    assert.equal(rallyPercept.nearby.some(observation =>
      observation.team !== rally.team && distance(rally, observation) <= 8), false,
    'soldier left ROUTE while a close enemy still blocked rally');

    // Public snapshots intentionally do not expose semantic relay payloads.
    // Complete that behavioral strike/rally replay with a narrow static audit
    // of the two cue gates and the public cue publication barrier.
    const engineSource = readFileSync(new URL('../src/engine.js', import.meta.url), 'utf8');
    const relaySource = engineSource.slice(
      engineSource.indexOf('function updateSoldierOrderAndGuide'),
      engineSource.indexOf('function updateSoldierMorale'));
    assert.equal((relaySource.match(
      /soldier\.publicState !== SOLDIER_STATE\.ROUTE/g) || []).length, 2,
    'order and guide relays are not independently gated by public ROUTE');
    const mindSource = engineSource.slice(
      engineSource.indexOf('function updateSoldierMind'),
      engineSource.indexOf('function publishSoldierCues'));
    const routingBranch = mindSource.slice(
      mindSource.indexOf('if (routingNow)'),
      mindSource.indexOf('if (soldier.publicState === SOLDIER_STATE.ROUTE)'));
    for (const required of [
      'soldier.nextOrderCue = null',
      'soldier.nextGuideCue = null',
      'soldier.combatState = COMBAT_STATE.READY',
      'soldier.targetMemory = null',
      'return;'
    ]) assert.ok(routingBranch.includes(required),
      `routing branch no longer enforces ${required}`);
    assert.equal(routingBranch.includes('advanceCombatState'), false,
      'routing branch can still advance into a new strike');
    const publishSource = engineSource.slice(
      engineSource.indexOf('function publishSoldierCues'),
      engineSource.indexOf('function integrateSoldiers'));
    assert.ok(publishSource.includes('soldier.publicOrderCue = soldier.nextOrderCue'));
    assert.ok(publishSource.includes('soldier.publicGuideCue = soldier.nextGuideCue'));
    assertStable(sim, 'routed relay valid-rally replay');
  });

test('full-scale 0x3636 edge collision remains stable through t=160.1',
  { timeout: 60_000 }, () => {
    const sim = createBattlefieldSimulation({ seed: 0x3636, perCentury: 36 });
    const targetTime = 160.1;
    const steps = Math.round(targetTime / FIXED_DT);
    const sampledSeconds = [];
    let sawFixEnemy = false;
    let sawManeuverFlank = false;

    for (let index = 0; index < steps; index++) {
      sim.step(FIXED_DT);
      if ((index + 1) % Math.round(1 / FIXED_DT) !== 0) continue;
      const expectedSecond = (index + 1) * FIXED_DT;
      assert.ok(Math.abs(sim.simTime - expectedSecond) < 1e-8,
        `one-second diagnostic sample drifted at tick ${sim.tick}`);
      const diagnostics = sim.diagnostics();
      assert.equal(diagnostics.overlaps, 0,
        `full-scale edge collision overlap at t=${sim.simTime}`);
      assert.equal(diagnostics.nonFinite, 0,
        `full-scale non-finite body at t=${sim.simTime}`);
      const tacticalStates = Object.values(diagnostics.century)
        .map(unit => unit.state);
      sawFixEnemy ||= tacticalStates.includes(CENTURION_STATE.FIX_ENEMY);
      sawManeuverFlank ||= tacticalStates.includes(CENTURION_STATE.MANEUVER_FLANK);
      sampledSeconds.push(Math.round(expectedSecond));
    }

    assert.equal(sampledSeconds.length, 160);
    assert.equal(sampledSeconds[0], 1);
    assert.equal(sampledSeconds.at(-1), 160,
      'regression did not sample diagnostics at the escaped t=160 boundary');
    assert.ok(sim.simTime >= targetTime - 1e-8,
      `regression stopped before t=${targetTime}`);
    assert.equal(sim.tick, steps);
    assert.ok(sawFixEnemy, 'full-scale replay never observed FIX_ENEMY');
    assert.ok(sawManeuverFlank, 'full-scale replay never observed MANEUVER_FLANK');
    assertStable(sim, 'full-scale edge collision at t=160.1');
  });

test('seeded combat stays overlap-free and emits one terminal result',
  { timeout: 60_000 }, () => {
    const sim = createBattlefieldSimulation({ seed: 0x2810, perCentury: 12 });
    const { snapshot, diagnostics } = runToTerminal(sim);
    assert.ok(['victory', 'draw', 'time-victory'].includes(sim.result.status));
    assert.ok(sim.result.at <= TUNING.matchTimeLimit + FIXED_DT);
    assert.ok(Object.isFrozen(sim.result), 'terminal result is mutable');
    assert.ok(diagnostics.strikes > 0, 'terminal match produced no strike resolutions');
    assert.ok(diagnostics.hits > 0, 'terminal match produced no hits');
    assert.ok(diagnostics.casualties > 0, 'terminal match produced no casualties');
    assert.ok(diagnostics.team.blue.fallen > 0 && diagnostics.team.red.fallen > 0,
      'combat was one-sided without reciprocal physical losses');

    const attackEvents = snapshot.recentCombatEvents
      .filter(event => ['hit', 'miss', 'blocked-friendly'].includes(event.event));
    assert.deepEqual(new Set(attackEvents.map(event => combatTeam(event.attackerId))),
      new Set([TEAM.BLUE, TEAM.RED]), 'both teams did not resolve combat actions');
    // Routed soldiers now stop generating strikes immediately. That can move
    // the last bilateral action tick outside the retained 80-event replay
    // window, so this terminal seed asserts reciprocal actions and physical
    // losses without treating retention as resolver simultaneity evidence.

    const matchEvents = observerEvents(sim, 'match-result');
    assert.equal(matchEvents.length, 1, 'match emitted duplicate terminal events');
    const stableResult = sim.result;
    runSteps(sim, 60, { checkEvery: 10 });
    assert.strictEqual(sim.result, stableResult, 'terminal decision changed after further stepping');
    assert.equal(observerEvents(sim, 'match-result').length, 1,
      'post-terminal stepping emitted another result');
    assertStable(sim, 'post-terminal state');
  });
