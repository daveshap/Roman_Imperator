import test from 'node:test';
import assert from 'node:assert/strict';

import { createBattlefieldSimulation } from '../src/engine.js';
import { POSTURE, TEAM, TUNING } from '../src/constants.js';

const DT = TUNING.fixedDt;

function deeplyFrozen(value, seen = new WeakSet()) {
  if (value == null || typeof value !== 'object' || seen.has(value)) return true;
  seen.add(value);
  return Object.isFrozen(value) && Object.values(value)
    .every(child => deeplyFrozen(child, seen));
}

function runUntil(simulation, predicate, maxSeconds, label) {
  const steps = Math.ceil(maxSeconds / DT);
  for (let index = 0; index < steps; index++) {
    simulation.step(DT);
    if (predicate()) return simulation.observe();
  }
  assert.fail(`${label} was not reached within ${maxSeconds}s`);
}

function teamPostures(simulation, team) {
  return simulation.observe().centuries
    .filter(century => century.team === team)
    .map(century => century.posture);
}

test('general situation is a detached, team-scoped field projection rather than world truth', () => {
  const simulation = createBattlefieldSimulation({ seed: 0x3000, perCentury: 12 });
  const initial = simulation.generalSituation(TEAM.BLUE);

  assert.ok(deeplyFrozen(initial));
  assert.equal(initial.team, TEAM.BLUE);
  assert.equal(initial.aiEnabled, false);
  assert.deepEqual(initial.friendly.map(report => report.centuryId), ['blue-1', 'blue-2']);
  assert.deepEqual(initial.friendly.map(report => report.source), ['doctrine', 'doctrine']);
  assert.equal(initial.contacts.length, 0,
    'the Blue general knew about enemies beyond its initial sight horizon');
  assert.notStrictEqual(initial, simulation.generalSituation(TEAM.BLUE),
    'generalSituation returned a shared mutable cognition object');
  assert.throws(() => simulation.generalSituation('purple'), /Unknown general team/);

  const percept = simulation.debug.percept('general-blue');
  assert.ok(deeplyFrozen(percept));
  const encodedPercept = JSON.stringify(percept);
  for (const forbidden of ['"id"', 'centuryId', 'profile', 'capabilities', 'condition',
    'maxHp', 'morale', 'fatigue']) {
    assert.equal(encodedPercept.includes(forbidden), false,
      `general percept leaked ${forbidden}`);
  }

  simulation.debug.teleportCentury('red-1', 0, -10, { moveFallback: false });
  simulation.step(DT);
  const perceived = simulation.generalSituation(TEAM.BLUE);
  assert.ok(perceived.contacts.length >= 1,
    'a nearby visible enemy formation did not become a general-owned contact track');
  for (const contact of perceived.contacts) {
    for (const forbidden of ['centuryId', 'team', 'state', 'posture', 'mode', 'reason',
      'profile', 'capabilities', 'condition', 'hp', 'morale', 'fatigue']) {
      assert.equal(forbidden in contact, false,
        `gameplay enemy contact leaked private field ${forbidden}`);
    }
    assert.equal(String(contact.trackId).includes('red-1'), false,
      'general-owned contact track exposed the engine century identity');
  }

  const mixed = createBattlefieldSimulation({ seed: 0x3010, perCentury: 12 });
  mixed.issuePosture('blue-1', POSTURE.HOLD);
  mixed.setHoldZone('blue-1', { x: -6, z: -24, radius: 12 });
  runUntil(mixed, () => {
    const knowledge = mixed.debug.generalKnowledge(TEAM.BLUE);
    const posture = knowledge.postureReceipts.find(item => item.centuryId === 'blue-1');
    const zone = knowledge.zoneReceipts.find(item => item.centuryId === 'blue-1');
    return posture?.status === 'acknowledged' && zone?.status === 'outbound';
  }, 35, 'same-tick posture return followed by zone dispatch');
  assert.equal(mixed.generalSituation(TEAM.BLUE).friendly
    .find(report => report.centuryId === 'blue-1').orderStatus, 'outbound',
  'same-time receipt projection ignored the higher command serial');

  const epochs = createBattlefieldSimulation({ seed: 0x3013, perCentury: 12 });
  const olderEpoch = epochs.issuePosture(TEAM.BLUE, POSTURE.HOLD);
  epochs.step(DT);
  const newerEpoch = epochs.issuePosture(TEAM.BLUE, POSTURE.HOLD);
  runUntil(epochs, () => epochs.debug.generalKnowledge(TEAM.BLUE).receiptHistory
    .filter(receipt => receipt.command === 'posture' && receipt.serial === olderEpoch.serial)
    .every(receipt => receipt.status === 'acknowledged'), 35,
  'older team posture epoch returning to the post');
  const latestEpochReceipts = epochs.debug.generalKnowledge(TEAM.BLUE).postureReceipts;
  assert.equal(latestEpochReceipts.every(receipt =>
    receipt.serial === newerEpoch.serial && receipt.status === 'outbound'), true,
  'an older team return incorrectly satisfied one recipient of a newer plan epoch');
});

test('enemy general decisions enqueue physical orders before centuries can react', () => {
  const simulation = createBattlefieldSimulation({
    seed: 0x3001,
    perCentury: 12,
    generalAI: { [TEAM.RED]: true }
  });
  let observerCursor = 0;
  let decision = null;

  runUntil(simulation, () => {
    const batch = simulation.observerEventsSince(observerCursor);
    observerCursor = batch.nextIndex;
    decision = batch.events.find(event => event.type === 'general-ai-decision' &&
      event.payload.team === TEAM.RED && event.payload.commandIssued) || null;
    return Boolean(decision);
  }, 24, 'first enemy-general command decision');

  assert.equal(decision.payload.state, 'probe');
  assert.equal(decision.payload.posture, POSTURE.AGGRESSIVE);
  assert.deepEqual(teamPostures(simulation, TEAM.RED), [POSTURE.HOLD, POSTURE.HOLD],
    'AI decision directly changed Red century missions in its decision tick');
  assert.equal(simulation.observe().generalCommandsQueued, 2);
  assert.deepEqual(simulation.generalSituation(TEAM.RED).friendly
    .map(report => report.orderStatus), ['queued', 'queued']);

  simulation.step(DT);
  assert.deepEqual(teamPostures(simulation, TEAM.RED), [POSTURE.HOLD, POSTURE.HOLD],
    'newly dispatched runners delivered in the same tick');
  assert.deepEqual(simulation.generalSituation(TEAM.RED).friendly
    .map(report => report.orderStatus), ['outbound', 'outbound']);

  runUntil(simulation, () => teamPostures(simulation, TEAM.RED)
    .every(posture => posture === POSTURE.AGGRESSIVE), 18,
  'physical enemy order delivery and centurion plan commitment');
  assert.ok(simulation.generalSituation(TEAM.RED).friendly
    .some(report => report.orderStatus === 'outbound'),
  'order receipt was acknowledged before a runner physically returned');

  runUntil(simulation, () => simulation.generalSituation(TEAM.RED).friendly
    .every(report => report.orderStatus === 'acknowledged'), 16,
  'enemy command runners returning to the general');
  assert.equal(simulation.generalSituation(TEAM.RED).general.reportsReceived, 2);

  const distant = createBattlefieldSimulation({
    seed: 0x3001,
    perCentury: 12,
    generalAI: { [TEAM.RED]: true }
  });
  distant.debug.teleportCentury('blue-1', -50, -60);
  distant.debug.teleportCentury('blue-2', 50, -60);
  distant.debug.teleportCentury('red-1', -6, -20);
  distant.debug.teleportCentury('red-2', 6, -20);
  runUntil(distant, () => {
    const receipts = distant.debug.generalKnowledge(TEAM.RED).postureReceipts;
    return receipts.length === 2 && receipts
      .every(receipt => receipt.status === 'acknowledged');
  }, 90,
  'healthy distant general-order round trip');
  const distantPostureHistory = distant.debug.generalKnowledge(TEAM.RED).receiptHistory
    .filter(receipt => receipt.command === 'posture');
  assert.equal(distantPostureHistory.length, 2,
    'healthy long round trips caused repeated posture-order serials');
  assert.equal(distantPostureHistory.every(receipt => receipt.status === 'acknowledged'), true);
});

test('general knowledge is updated by return reports, not instant command acknowledgement', () => {
  const simulation = createBattlefieldSimulation({ seed: 0x3002, perCentury: 12 });
  const receipt = simulation.issuePosture(TEAM.BLUE, POSTURE.HOLD);
  assert.ok(deeplyFrozen(receipt));
  assert.deepEqual(teamPostures(simulation, TEAM.BLUE),
    [POSTURE.AGGRESSIVE, POSTURE.AGGRESSIVE]);
  assert.deepEqual(simulation.generalSituation(TEAM.BLUE).friendly
    .map(report => report.orderStatus), ['queued', 'queued']);
  assert.equal(simulation.generalSituation(TEAM.BLUE).general.reportsReceived, 0);

  runUntil(simulation, () => teamPostures(simulation, TEAM.BLUE)
    .every(posture => posture === POSTURE.HOLD), 18,
  'Blue centurions accepting and coordinating the hold order');
  assert.deepEqual(simulation.generalSituation(TEAM.BLUE).friendly
    .map(report => report.orderStatus), ['outbound', 'outbound']);
  assert.equal(simulation.generalSituation(TEAM.BLUE).general.reportsReceived, 0,
    'the general received knowledge at delivery rather than courier return');

  runUntil(simulation, () => simulation.generalSituation(TEAM.BLUE).friendly
    .every(report => report.orderStatus === 'acknowledged'), 16,
  'Blue command runners returning with field reports');
  const situation = simulation.generalSituation(TEAM.BLUE);
  assert.equal(situation.general.reportsReceived, 2);
  assert.deepEqual(situation.friendly.map(report => report.orderStatus),
    ['acknowledged', 'acknowledged']);

  const firstDebugRead = simulation.debug.generalKnowledge(TEAM.BLUE);
  const secondDebugRead = simulation.debug.generalKnowledge(TEAM.BLUE);
  assert.ok(deeplyFrozen(firstDebugRead));
  assert.notStrictEqual(firstDebugRead, secondDebugRead);
  assert.notStrictEqual(firstDebugRead.enemyTracks, secondDebugRead.enemyTracks);
  assert.equal(firstDebugRead.orderReceipts.every(item => item.returnedAt > item.issuedAt), true);

  const stale = createBattlefieldSimulation({ seed: 0x3011, perCentury: 12 });
  stale.issuePosture('blue-1', POSTURE.HOLD);
  runUntil(stale, () => stale.observe().couriers.some(courier =>
    courier.mode === 'general-return' && courier.receiverId === 'blue-1'), 18,
  'field report beginning its physical return');
  stale.debug.teleportCentury('blue-1', 60, 30);
  runUntil(stale, () => stale.debug.generalKnowledge(TEAM.BLUE).postureReceipts
    .some(item => item.centuryId === 'blue-1' && item.status === 'acknowledged'), 20,
  'stale field report reaching the command post');
  const staleTrack = stale.debug.generalKnowledge(TEAM.BLUE).friendlyTracks
    .find(track => track.centuryId === 'blue-1');
  assert.ok(staleTrack.confidence < 0.65,
    'an old returned pose regained near-current confidence');
  assert.ok(staleTrack.strengthConfidence < 0.65,
    'an old returned strength report regained near-current confidence');
});

test('friendly visual tracks use formation centers and never infer losses from a partial footprint', () => {
  const centered = createBattlefieldSimulation({ seed: 0x3003, perCentury: 64 });
  centered.step(DT);
  const snapshot = centered.observe();
  const report = centered.generalSituation(TEAM.BLUE).friendly
    .find(item => item.centuryId === 'blue-1');
  const unit = snapshot.centuries.find(item => item.id === 'blue-1');
  const officer = snapshot.centurions.find(item => item.centuryId === 'blue-1');
  assert.ok(Math.hypot(report.x - unit.center.x, report.z - unit.center.z) < 2,
    'general stored the standard guide as the formation center');
  assert.ok(Math.hypot(report.x - officer.x, report.z - officer.z) > 8,
    'large-formation center test did not distinguish guide from center');

  const horizon = createBattlefieldSimulation({ seed: 0x3004, perCentury: 36 });
  horizon.debug.teleportCentury('blue-1', 0, 20);
  horizon.step(DT);
  const horizonTrack = horizon.debug.generalKnowledge(TEAM.BLUE).friendlyTracks
    .find(track => track.centuryId === 'blue-1');
  assert.equal(horizonTrack.strengthEstimate, 36,
    'partial visual coverage was treated as proof of casualties');
});

test('command runners target only the general private friendly track', () => {
  const hidden = createBattlefieldSimulation({ seed: 0x3005, perCentury: 12 });
  hidden.debug.teleportCentury('blue-1', 30, 20);
  hidden.issuePosture('blue-1', POSTURE.HOLD);
  hidden.step(DT);
  const hiddenRunner = hidden.observe().couriers.find(courier =>
    courier.mode === 'general-runner' && courier.receiverId === 'blue-1');
  assert.ok(hiddenRunner);

  const sensed = createBattlefieldSimulation({ seed: 0x3005, perCentury: 12 });
  sensed.debug.teleportCentury('blue-1', 30, 20);
  sensed.step(DT);
  sensed.issuePosture('blue-1', POSTURE.HOLD);
  sensed.step(DT);
  const sensedRunner = sensed.observe().couriers.find(courier =>
    courier.mode === 'general-runner' && courier.receiverId === 'blue-1');
  assert.ok(sensedRunner);
  assert.ok(Math.hypot(hiddenRunner.targetX - sensedRunner.targetX,
    hiddenRunner.targetZ - sensedRunner.targetZ) > 40,
  'an unsensed debug teleport changed the general command target');
  assert.ok(Math.hypot(sensedRunner.targetX - 30, sensedRunner.targetZ - 20) < 8,
    'a later physical sight update did not revise the general command target');

  const leased = createBattlefieldSimulation({ seed: 0x3012, perCentury: 12 });
  leased.debug.teleportCentury('red-1', -50, 60);
  leased.debug.teleportCentury('red-2', 50, 60);
  const firstOrder = leased.issuePosture('blue-1', POSTURE.HOLD);
  leased.step(DT);
  const doomedRunner = leased.observe().couriers.find(courier =>
    courier.mode === 'general-runner' && courier.receiverId === 'blue-1');
  assert.ok(doomedRunner);
  const initialLease = leased.debug.generalKnowledge(TEAM.BLUE).runnerLeases
    .find(lease => lease.centuryId === 'blue-1');
  assert.equal(initialLease.serial, firstOrder.serial);
  leased.debug.setCondition(doomedRunner.id, { hp: 0 });
  leased.setHoldZone('blue-1', { x: -6, z: -24, radius: 12 });
  leased.step(DT);
  assert.equal(leased.observe().couriers.some(courier =>
    courier.mode === 'general-runner' && courier.receiverId === 'blue-1'), false,
  'remote runner death instantly dispatched a replacement');
  assert.equal(leased.observe().generalCommandsQueued, 1);
  assert.equal(leased.debug.generalKnowledge(TEAM.BLUE).runnerLeases
    .find(lease => lease.centuryId === 'blue-1')?.serial, firstOrder.serial,
  'remote runner removal released a command-post lease');
  runUntil(leased, () => leased.debug.generalKnowledge(TEAM.BLUE).zoneReceipts
    .some(receipt => receipt.centuryId === 'blue-1' && receipt.status === 'outbound'), 40,
  'replacement dispatch after locally observable missed-return deadline');
  const replacement = leased.debug.generalKnowledge(TEAM.BLUE).zoneReceipts
    .find(receipt => receipt.centuryId === 'blue-1');
  assert.ok(replacement.dispatchedAt >= initialLease.expectedReturnAt,
    'replacement left before the command post could know its runner was missing');
  const missingReturn = leased.debug.generalKnowledge(TEAM.BLUE).receiptHistory
    .find(receipt => receipt.command === 'posture' && receipt.serial === firstOrder.serial);
  assert.equal(missingReturn.status, 'overdue');
  assert.equal(missingReturn.returnedAt, null,
    'a missed deadline fabricated a physical courier return');
  assert.ok(missingReturn.overdueAt >= initialLease.expectedReturnAt);

  const reversed = createBattlefieldSimulation({ seed: 0x7a30, perCentury: 12 });
  const postureReceipt = serial => reversed.debug.generalKnowledge(TEAM.BLUE).receiptHistory
    .find(item => item.receiptKey === `blue-1|posture|${serial}`);
  reversed.debug.teleportCentury('red-1', -60, 68);
  reversed.debug.teleportCentury('red-2', 60, 68);
  const older = reversed.issuePosture('blue-1', POSTURE.HOLD);
  reversed.step(DT);
  reversed.debug.teleportCentury('blue-1', 64, -68);
  const olderLease = reversed.debug.generalKnowledge(TEAM.BLUE).runnerLeases
    .find(item => item.centuryId === 'blue-1');
  runUntil(reversed, () => reversed.simTime >= olderLease.expectedReturnAt - 1.2,
    35, 'approach older posture lease deadline');
  const stranded = reversed.observe().couriers.find(courier =>
    courier.id === `runner-general-blue-1-${older.serial}`);
  assert.ok(stranded);
  assert.ok(Math.hypot(stranded.x, stranded.z + 68) > TUNING.runnerSight);
  reversed.debug.teleportCentury('blue-1', 0, -68);
  reversed.step(DT);
  const newer = reversed.issuePosture('blue-1', POSTURE.DEFENSIVE_FEINT);
  runUntil(reversed, () => reversed.observe().couriers.some(courier =>
    courier.id === `runner-general-blue-1-${newer.serial}` &&
      courier.phase === 'return'), 20, 'newer posture delivery');
  assert.equal(postureReceipt(older.serial).status, 'overdue');
  reversed.debug.teleportCentury('blue-1', 64, -68);
  runUntil(reversed, () => postureReceipt(newer.serial)?.status === 'acknowledged',
    20, 'newer posture return');
  const lateOlder = reversed.observe().couriers.find(courier =>
    courier.id === `runner-general-blue-1-${older.serial}`);
  assert.ok(lateOlder);
  reversed.debug.teleportCentury('blue-1', lateOlder.x, lateOlder.z);
  runUntil(reversed, () => postureReceipt(older.serial)?.status === 'acknowledged',
    40, 'late older posture return');
  const confirmed = reversed.debug.generalKnowledge(TEAM.BLUE).friendlyTracks
    .find(item => item.centuryId === 'blue-1');
  assert.ok(postureReceipt(older.serial).returnedAt > postureReceipt(newer.serial).returnedAt);
  assert.equal(confirmed.confirmedPosture, POSTURE.DEFENSIVE_FEINT);
  assert.equal(confirmed.confirmedPostureSerial, newer.serial);
  assert.equal(reversed.observe().centuries.find(item => item.id === 'blue-1').posture,
    POSTURE.DEFENSIVE_FEINT);
});

test('general force comparison aggregates contacts and separates uncertainty from casualties', () => {
  const equalFight = createBattlefieldSimulation({
    seed: 0x3000,
    perCentury: 12,
    generalAI: { [TEAM.BLUE]: true }
  });
  equalFight.debug.teleportCentury('red-1', -13, 6);
  equalFight.debug.teleportCentury('red-2', 13, 6);
  let equalDecision = null;
  runUntil(equalFight, () => {
    equalDecision = equalFight.observerEventsSince(0).events.find(event =>
      event.type === 'general-ai-decision' && event.payload.team === TEAM.BLUE) || null;
    return Boolean(equalDecision);
  }, 24, 'Blue general evaluating two equal enemy contacts');
  assert.equal(equalFight.generalSituation(TEAM.BLUE).contacts.length, 2);
  assert.notEqual(equalDecision.payload.reason, 'exploit-estimated-advantage',
    'one enemy contact was compared against the entire friendly force');

  const uncertain = createBattlefieldSimulation({ seed: 0x4000, perCentury: 12 });
  uncertain.debug.teleportCentury('blue-1', -50, 45);
  uncertain.debug.teleportCentury('blue-2', 50, 45);
  uncertain.setGeneralAI(TEAM.BLUE, true);
  let uncertaintyDecision = null;
  runUntil(uncertain, () => {
    uncertaintyDecision = uncertain.observerEventsSince(0).events.find(event =>
      event.type === 'general-ai-decision' && event.payload.team === TEAM.BLUE) || null;
    return Boolean(uncertaintyDecision);
  }, 3, 'Blue general reasoning about unseen intact friendlies');
  assert.notEqual(uncertaintyDecision.payload.state, 'recover');
  assert.notEqual(uncertaintyDecision.payload.reason, 'estimated-heavy-loss',
    'low location confidence fabricated friendly casualties');
});

test('individual intent remains per-century and does not overwrite the team AI baseline', () => {
  const simulation = createBattlefieldSimulation({ seed: 0x3006, perCentury: 12 });
  simulation.issuePosture('blue-1', POSTURE.HOLD);
  const situation = simulation.generalSituation(TEAM.BLUE);
  const b1 = situation.friendly.find(report => report.centuryId === 'blue-1');
  const b2 = situation.friendly.find(report => report.centuryId === 'blue-2');
  assert.equal(b1.intendedPosture, POSTURE.HOLD);
  assert.equal(b2.intendedPosture, POSTURE.AGGRESSIVE);
  assert.equal(situation.general.intent, POSTURE.AGGRESSIVE,
    'an individual command corrupted the general team-wide intent');
});

test('enemy AI clears obsolete zones and retries a failed physical posture order', () => {
  const zones = createBattlefieldSimulation({ seed: 0x3007, perCentury: 12 });
  zones.debug.teleportCentury('blue-1', -50, -60);
  zones.debug.teleportCentury('blue-2', 50, -60);
  zones.setHoldZone(TEAM.RED, { x: 0, z: 25, radius: 15 });
  runUntil(zones, () => zones.observe().centuries.filter(century => century.team === TEAM.RED)
    .every(century => century.holdZone), 16, 'initial AI-owned Red hold zone delivery');
  runUntil(zones, () => zones.debug.generalKnowledge(TEAM.RED).zoneReceipts
    .every(receipt => receipt.status === 'acknowledged'), 16,
  'initial Red zone command acknowledgement');
  zones.debug.setCommunicationEnabled('red-2', false);
  zones.setGeneralAI(TEAM.RED, true);
  runUntil(zones, () => zones.observerEventsSince(0).events.some(event =>
    event.type === 'general-command-issued' && event.payload.command === 'clear-zone'),
  18, 'AI clear-zone transition');
  runUntil(zones, () => zones.debug.generalKnowledge(TEAM.RED).zoneReceipts
    .some(receipt => receipt.centuryId === 'red-2' && receipt.status === 'failed'),
  45, 'failed Red clear-zone runner return');
  assert.equal(zones.observe().centuries.find(century => century.id === 'red-1').holdZone,
    null);
  assert.ok(zones.observe().centuries.find(century => century.id === 'red-2').holdZone,
    'muted Red century somehow received its clear-zone order');
  zones.debug.setCommunicationEnabled('red-2', true);
  runUntil(zones, () => zones.observerEventsSince(0).events.filter(event =>
    event.type === 'general-command-issued' && event.payload.command === 'clear-zone').length >= 2,
  24, 'AI clear-zone reconciliation order');
  zones.setGeneralAI(TEAM.RED, false);
  zones.debug.teleportCentury('red-1', -6, 40);
  zones.debug.teleportCentury('red-2', 6, 40);
  runUntil(zones, () => zones.observe().centuries.filter(century => century.team === TEAM.RED)
    .every(century => !century.holdZone), 50, 'physical clearing of obsolete AI zones');
  runUntil(zones, () => zones.debug.generalKnowledge(TEAM.RED).zoneReceipts
    .every(receipt => receipt.status === 'acknowledged'), 40,
  'reconciled clear-zone acknowledgements');
  assert.equal(zones.debug.generalKnowledge(TEAM.RED).zoneActive, false);

  const retry = createBattlefieldSimulation({
    seed: 0x3001,
    perCentury: 12,
    generalAI: { [TEAM.RED]: true }
  });
  retry.debug.teleportCentury('blue-1', -50, -60);
  retry.debug.teleportCentury('blue-2', 50, -60);
  retry.debug.setCommunicationEnabled('red-2', false);
  runUntil(retry, () => retry.debug.generalKnowledge(TEAM.RED).postureReceipts
    .some(receipt => receipt.centuryId === 'red-2' && receipt.status === 'failed'),
  40, 'failed Red posture runner return');
  retry.debug.setCommunicationEnabled('red-2', true);
  runUntil(retry, () => retry.observerEventsSince(0).events.filter(event =>
    event.type === 'general-command-issued' && event.payload.command === 'posture').length >= 2,
  30, 'AI posture reconciliation order');
  retry.setGeneralAI(TEAM.RED, false);
  retry.debug.teleportCentury('red-1', -6, 40);
  retry.debug.teleportCentury('red-2', 6, 40);
  runUntil(retry, () => teamPostures(retry, TEAM.RED)
    .every(posture => posture === POSTURE.AGGRESSIVE), 45,
  'reconciled Red posture after communication recovery');
  runUntil(retry, () => retry.debug.generalKnowledge(TEAM.RED).postureReceipts
    .every(receipt => receipt.status === 'acknowledged'), 40,
  'reconciled Red posture acknowledgements');
});
