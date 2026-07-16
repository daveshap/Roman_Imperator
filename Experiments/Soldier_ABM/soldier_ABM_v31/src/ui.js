import { POSTURE, TEAM } from './constants.js';

const byId = id => document.getElementById(id);
const setText = (id, value) => {
  const element = byId(id);
  if (element) element.textContent = String(value);
};
const setActive = (element, active) => element?.classList.toggle('active', Boolean(active));
const titleCase = value => String(value || '—').replaceAll('-', ' ')
  .replace(/\b\w/g, character => character.toUpperCase());

const UI_MODE = Object.freeze({ GAMEPLAY: 'gameplay', DEBUG: 'debug' });
const FRIENDLY_CENTURIES = Object.freeze(['blue-1', 'blue-2']);
const ENEMY_CARD_IDS = Object.freeze(['red-1', 'red-2']);
const SAFE_BANDS = Object.freeze({
  strength: new Set(['intact', 'full', 'effective', 'strong', 'many', 'moderate', 'body', 'worn',
    'reduced', 'attrited', 'few', 'weak', 'depleted', 'critical', 'remnant', 'fragmented',
    'destroyed', 'unknown', 'unreported']),
  status: new Set(['deployed', 'steady', 'forming', 'moving', 'advancing', 'holding', 'engaged',
    'pressured', 'retiring', 'withdrawing', 'disordered', 'routing', 'withdrawn', 'destroyed',
    'unknown', 'unreported']),
  order: new Set(['none', 'doctrine', 'queued', 'outbound', 'dispatched', 'in-transit', 'delivered',
    'acknowledged', 'overdue', 'pending', 'active', 'complete', 'failed', 'unknown', 'unreported']),
  confidence: new Set(['none', 'lost', 'uncertain', 'tentative', 'probable', 'credible', 'reliable',
    'confirmed', 'firm', 'low', 'medium', 'high', 'unknown']),
  age: new Set(['live', 'fresh', 'recent', 'aging', 'stale', 'lost', 'unknown']),
  range: new Set(['close', 'near', 'medium', 'middle', 'mid', 'far', 'distant', 'beyond-sight',
    'unknown']),
  bearing: new Set(['left', 'left-front', 'front-left', 'front', 'right-front', 'front-right',
    'right', 'rear-left', 'rear', 'rear-right', 'unknown']),
  threat: new Set(['none', 'low', 'watch', 'moderate', 'medium', 'high', 'severe', 'critical',
    'unknown']),
  source: new Set(['doctrine', 'visual', 'vision', 'sight', 'signal', 'runner', 'courier', 'report',
    'runner-report', 'local', 'combined', 'unknown']),
  intent: new Set(['aggressive', 'advance', 'hold', 'stationary', 'defensive-feint', 'feint',
    'observe', 'reserve', 'withdraw', 'unknown'])
});

function normalizedBand(value) {
  return String(value ?? '').trim().toLowerCase().replaceAll('_', '-').replace(/\s+/g, '-');
}

function boundedBand(value, family, fallback = 'UNKNOWN') {
  const normalized = normalizedBand(value);
  return SAFE_BANDS[family]?.has(normalized) ? normalized.replaceAll('-', ' ').toUpperCase() : fallback;
}

function boundedConfidence(value) {
  const confidence = Number(value);
  if (!Number.isFinite(confidence)) return 'CONFIDENCE UNKNOWN';
  if (confidence >= .8) return 'FIRM CONTACT';
  if (confidence >= .55) return 'CREDIBLE CONTACT';
  if (confidence >= .25) return 'TENTATIVE CONTACT';
  return 'UNCONFIRMED REPORT';
}

function boundedAge(report) {
  const band = boundedBand(report?.ageBand, 'age', '');
  if (band) return band;
  const seconds = Number(report?.age);
  if (!Number.isFinite(seconds)) return 'AGE UNKNOWN';
  if (seconds <= 5) return 'FRESH';
  if (seconds <= 20) return 'RECENT';
  if (seconds <= 60) return 'AGING';
  return 'STALE';
}

function safeMark(value, fallback) {
  const mark = String(value ?? '').trim().toUpperCase();
  return /^[A-Z0-9][A-Z0-9 .-]{0,15}$/.test(mark) ? mark : fallback;
}

function readGeneralSituation(simulation, snapshot) {
  if (typeof simulation.generalSituation === 'function') {
    try {
      const projection = simulation.generalSituation(TEAM.BLUE);
      if (projection && typeof projection === 'object') return projection;
    } catch {
      // A missing projection must reduce knowledge, never unlock observer data.
    }
  }
  const fallback = snapshot?.playerSituation?.blue ?? snapshot?.playerSituation;
  return fallback && typeof fallback === 'object' ? fallback : null;
}

export function createBattlefieldUI(simulation, renderer) {
  let selectedCentury = 'blue-1';
  let uiMode = UI_MODE.GAMEPLAY;
  let applyToTeam = true;
  let placingZone = false;
  let observerIndex = 0;
  let toastUntil = 0;
  let latestSituation = null;

  const selectedTeam = () => selectedCentury.startsWith('blue') ? TEAM.BLUE : TEAM.RED;
  const commandScope = () => applyToTeam ? selectedTeam() : selectedCentury;

  function showToast(message, duration = 2300) {
    const toast = byId('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    toastUntil = performance.now() + duration;
  }

  function selectCentury(id) {
    if (uiMode === UI_MODE.GAMEPLAY && !String(id).startsWith('blue')) {
      showToast('Enemy contacts are intelligence reports, not commandable units');
      return false;
    }
    selectedCentury = id;
    renderer.setSelectedCentury(id);
    for (const button of document.querySelectorAll('[data-century]')) {
      setActive(button, button.dataset.century === id);
    }
    const team = selectedTeam();
    document.body.dataset.commandTeam = team;
    setText('commandTarget', applyToTeam ? `${team.toUpperCase()} TEAM` : id.toUpperCase());
    return true;
  }

  function setUIMode(mode, announce = true) {
    uiMode = mode === UI_MODE.DEBUG ? UI_MODE.DEBUG : UI_MODE.GAMEPLAY;
    renderer.setUIMode?.(uiMode);
    document.body.dataset.uiMode = uiMode;
    setActive(byId('modeGameplay'), uiMode === UI_MODE.GAMEPLAY);
    setActive(byId('modeDebug'), uiMode === UI_MODE.DEBUG);
    byId('modeGameplay')?.setAttribute('aria-pressed', String(uiMode === UI_MODE.GAMEPLAY));
    byId('modeDebug')?.setAttribute('aria-pressed', String(uiMode === UI_MODE.DEBUG));
    for (const enemyCardId of ENEMY_CARD_IDS) {
      const enemyCard = byId(`card-${enemyCardId}`);
      if (enemyCard) enemyCard.tabIndex = uiMode === UI_MODE.DEBUG ? 0 : -1;
    }
    if (uiMode === UI_MODE.GAMEPLAY) {
      if (!selectedCentury.startsWith('blue')) selectCentury('blue-1');
      const cognition = byId('showCognition');
      if (cognition) cognition.checked = false;
      simulation.setPresentation({ showCognition: false });
      // Scrub observer-only card text synchronously; do not leave a one-frame
      // flash of Red internals when returning from debug mode.
      updateGameplayScore(latestSituation);
      updateGameplaySelected(latestSituation);
      updateGameplayCenturyCards(latestSituation);
      if (announce) showToast('Gameplay UI · Blue general situation only');
    } else {
      if (announce) showToast('Debug UI · omniscient observer diagnostics visible');
    }
  }

  byId('modeGameplay')?.addEventListener('click', () => setUIMode(UI_MODE.GAMEPLAY));
  byId('modeDebug')?.addEventListener('click', () => setUIMode(UI_MODE.DEBUG));

  for (const button of document.querySelectorAll('[data-century]')) {
    button.addEventListener('click', () => selectCentury(button.dataset.century));
  }
  for (const card of document.querySelectorAll('[data-century-card]')) {
    card.addEventListener('click', () => selectCentury(card.dataset.centuryCard));
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectCentury(card.dataset.centuryCard);
      }
    });
  }

  const enemyAIToggle = byId('enemyGeneralAI');
  const canControlEnemyAI = typeof simulation.setGeneralAI === 'function';
  if (enemyAIToggle) {
    enemyAIToggle.disabled = !canControlEnemyAI;
    if (!canControlEnemyAI) enemyAIToggle.checked = false;
  }
  if (canControlEnemyAI) {
    try {
      simulation.setGeneralAI(TEAM.RED, Boolean(enemyAIToggle?.checked));
      setText('enemyAIStatus', enemyAIToggle?.checked ? 'ON' : 'OFF');
    } catch {
      if (enemyAIToggle) {
        enemyAIToggle.checked = false;
        enemyAIToggle.disabled = true;
      }
      setText('enemyAIStatus', 'UNAVAILABLE');
    }
  } else {
    setText('enemyAIStatus', 'UNAVAILABLE');
  }
  enemyAIToggle?.addEventListener('change', event => {
    if (!canControlEnemyAI) return;
    try {
      simulation.setGeneralAI(TEAM.RED, event.target.checked);
      setText('enemyAIStatus', event.target.checked ? 'ON' : 'OFF');
      showToast(`Enemy general AI ${event.target.checked ? 'enabled' : 'disabled'}`);
    } catch {
      event.target.checked = !event.target.checked;
      setText('enemyAIStatus', event.target.checked ? 'ON' : 'OFF');
      showToast('Enemy general AI control rejected this change');
    }
  });

  const teamToggle = byId('applyTeam');
  if (teamToggle) teamToggle.addEventListener('change', () => {
    applyToTeam = teamToggle.checked;
    setText('commandTarget', applyToTeam ? `${selectedTeam().toUpperCase()} TEAM` : selectedCentury.toUpperCase());
  });

  for (const button of document.querySelectorAll('[data-posture]')) {
    button.addEventListener('click', () => {
      const posture = button.dataset.posture;
      const scope = commandScope();
      simulation.issuePosture(scope, posture);
      showToast(`Courier dispatched · ${String(scope).toUpperCase()}: ${titleCase(posture)}`);
    });
  }

  function cancelZonePlacement() {
    placingZone = false;
    renderer.setZonePlacementActive(false);
    setActive(byId('btnPlaceZone'), false);
    setText('zoneHint', 'optional positional tether');
  }

  byId('btnPlaceZone')?.addEventListener('click', () => {
    placingZone = !placingZone;
    renderer.setZonePlacementActive(placingZone);
    setActive(byId('btnPlaceZone'), placingZone);
    setText('zoneHint', placingZone ? 'click open ground to place' : 'optional positional tether');
  });

  renderer.onGroundClick(point => {
    if (!placingZone) return;
    const radius = Number(byId('zoneRadius')?.value) || 14;
    const scope = commandScope();
    simulation.setHoldZone(scope, { ...point, radius });
    showToast(`Zone order dispatched to ${String(scope).toUpperCase()}`);
    cancelZonePlacement();
  });

  byId('btnClearZone')?.addEventListener('click', () => {
    const scope = commandScope();
    simulation.clearHoldZone(scope);
    showToast(`Clear-zone courier dispatched to ${String(scope).toUpperCase()}`);
  });

  byId('zoneRadius')?.addEventListener('input', event => {
    setText('zoneRadiusOut', `${event.target.value}m`);
  });

  function applyScenario(name) {
    if (name === 'assault') {
      simulation.issuePosture(TEAM.BLUE, POSTURE.AGGRESSIVE);
      simulation.issuePosture(TEAM.RED, POSTURE.HOLD);
    } else if (name === 'meeting') {
      simulation.issuePosture(TEAM.BLUE, POSTURE.AGGRESSIVE);
      simulation.issuePosture(TEAM.RED, POSTURE.AGGRESSIVE);
    } else if (name === 'feint') {
      simulation.issuePosture(TEAM.BLUE, POSTURE.AGGRESSIVE);
      simulation.issuePosture(TEAM.RED, POSTURE.DEFENSIVE_FEINT);
    } else if (name === 'mutual-feint') {
      simulation.issuePosture(TEAM.BLUE, POSTURE.DEFENSIVE_FEINT);
      simulation.issuePosture(TEAM.RED, POSTURE.DEFENSIVE_FEINT);
    }
    showToast(`${titleCase(name)} · couriers dispatched`);
  }

  for (const button of document.querySelectorAll('[data-scenario]')) {
    button.addEventListener('click', () => applyScenario(button.dataset.scenario));
  }

  byId('btnPause')?.addEventListener('click', () => simulation.setPaused(!simulation.paused));
  byId('btnRestart')?.addEventListener('click', () => {
    const rawSeed = byId('seed')?.value;
    const parsedSeed = rawSeed === '' ? NaN : Number(rawSeed);
    const seed = Number.isFinite(parsedSeed) ? parsedSeed : simulation.observe().config.seed;
    const perCentury = Number(byId('strength')?.value) || 36;
    simulation.reset({ seed, perCentury });
    cancelZonePlacement();
    showToast(`Battle reset · seed ${seed >>> 0}`);
  });
  byId('btnNewSeed')?.addEventListener('click', () => {
    const prior = simulation.observe().config.seed;
    const seed = (Math.imul(prior ^ 0x9e3779b9, 1664525) + 1013904223) >>> 0;
    if (byId('seed')) byId('seed').value = String(seed);
    simulation.reset({ seed, perCentury: Number(byId('strength')?.value) || 36 });
    cancelZonePlacement();
    showToast(`New deterministic seed ${seed}`);
  });
  byId('btnResetCamera')?.addEventListener('click', () => renderer.resetCamera());

  byId('tempo')?.addEventListener('input', event => {
    const tempo = Number(event.target.value);
    simulation.setTimeScale(tempo);
    setText('tempoOut', `${Number.isInteger(tempo) ? tempo.toFixed(1) : String(tempo)}×`);
  });
  byId('strength')?.addEventListener('input', event => {
    setText('strengthOut', event.target.value);
    byId('restartNote')?.classList.add('visible');
  });
  byId('showCognition')?.addEventListener('change', event => {
    simulation.setPresentation({ showCognition: event.target.checked });
  });
  byId('showMessages')?.addEventListener('change', event => {
    simulation.setPresentation({ showMessages: event.target.checked });
  });

  globalThis.addEventListener?.('keydown', event => {
    if (event.defaultPrevented || event.target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(event.target?.tagName)) return;
    if (event.key === ' ') {
      event.preventDefault();
      simulation.setPaused(!simulation.paused);
    }
    if (event.key === '1') simulation.issuePosture(commandScope(), POSTURE.AGGRESSIVE);
    if (event.key === '2') simulation.issuePosture(commandScope(), POSTURE.HOLD);
    if (event.key === '3') simulation.issuePosture(commandScope(), POSTURE.DEFENSIVE_FEINT);
    const centuryKeys = uiMode === UI_MODE.DEBUG
      ? { q: 'blue-1', w: 'blue-2', o: 'red-1', p: 'red-2' }
      : { q: 'blue-1', w: 'blue-2' };
    if (centuryKeys[event.key.toLowerCase()]) selectCentury(centuryKeys[event.key.toLowerCase()]);
    if (event.key === 'Escape') cancelZonePlacement();
  });

  function writeCard(card, { label, strength, state, quality, comm, stateCode = '', noContact = false }) {
    if (!card) return;
    card.dataset.state = stateCode;
    card.classList.toggle('no-contact', noContact);
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
      card.classList.toggle('selected', century.id === selectedCentury);
      writeCard(card, {
        label: century.standard,
        strength: `${century.alive}/${century.initialStrength}`,
        state: `${titleCase(century.posture)} · ${titleCase(century.state)} · ${titleCase(century.tacticalRole)}`,
        quality: `Q ${century.capabilitySummary.mean.overall.toFixed(2)} · BASE DRL ${century.training.formation.toFixed(2)} · WPN ${century.training.weapons.toFixed(2)}`,
        comm: `${century.contactConfidence > .12 ? 'CONTACT' : 'NO CONTACT'} · ${titleCase(century.communicationState)}`,
        stateCode: century.state
      });
    }
  }

  function friendlyReport(situation, centuryId) {
    return Array.isArray(situation?.friendly)
      ? situation.friendly.find(report => report?.centuryId === centuryId) ?? null
      : null;
  }

  function updateGameplayCenturyCards(situation) {
    for (const centuryId of FRIENDLY_CENTURIES) {
      const card = byId(`card-${centuryId}`);
      const report = friendlyReport(situation, centuryId);
      card?.classList.toggle('selected', centuryId === selectedCentury);
      if (!report) {
        writeCard(card, {
          label: centuryId === 'blue-1' ? 'B1' : 'B2',
          strength: 'REPORT PENDING',
          state: 'Awaiting runner or signal',
          quality: 'CONFIDENCE UNKNOWN',
          comm: 'ORDER STATUS UNKNOWN',
          noContact: true
        });
        continue;
      }
      const status = boundedBand(report.statusBand, 'status', 'STATUS UNKNOWN');
      const strength = boundedBand(report.strengthBand, 'strength', 'STRENGTH UNKNOWN');
      const order = boundedBand(report.orderStatus, 'order', 'ORDER STATUS UNKNOWN');
      const source = boundedBand(report.source, 'source', 'SOURCE UNKNOWN');
      writeCard(card, {
        label: safeMark(report.mark, centuryId === 'blue-1' ? 'B1' : 'B2'),
        strength,
        state: `${status} · ${boundedAge(report)}`,
        quality: `${boundedConfidence(report.confidence)} · ${source}`,
        comm: order,
        stateCode: normalizedBand(report.statusBand)
      });
    }

    const contacts = Array.isArray(situation?.contacts) ? situation.contacts.slice(0, 2) : [];
    for (let index = 0; index < ENEMY_CARD_IDS.length; index++) {
      const card = byId(`card-${ENEMY_CARD_IDS[index]}`);
      card?.classList.remove('selected');
      const contact = contacts[index];
      const fallbackMark = `CONTACT ${String.fromCharCode(65 + index)}`;
      if (!contact) {
        writeCard(card, {
          label: fallbackMark,
          strength: 'UNKNOWN',
          state: 'No confirmed contact',
          quality: 'CONFIDENCE UNKNOWN',
          comm: 'RANGE · BEARING UNKNOWN',
          noContact: true
        });
        continue;
      }
      const threat = boundedBand(contact.threatBand, 'threat', 'THREAT UNKNOWN');
      const range = boundedBand(contact.rangeBand, 'range', 'RANGE UNKNOWN');
      const bearing = boundedBand(contact.bearingBand, 'bearing', 'BEARING UNKNOWN');
      const strength = boundedBand(contact.strengthBand, 'strength', 'STRENGTH UNKNOWN');
      writeCard(card, {
        label: safeMark(contact.recognizedMark, fallbackMark),
        strength,
        state: `${boundedConfidence(contact.confidence)} · ${threat}`,
        quality: `${boundedBand(contact.confidenceBand, 'confidence', boundedConfidence(contact.confidence))} · ${boundedAge(contact)}`,
        comm: `${range} · ${bearing}`,
        stateCode: normalizedBand(contact.threatBand)
      });
    }
  }

  function processObserverEvents() {
    const batch = simulation.observerEventsSince(observerIndex);
    observerIndex = batch.nextIndex;
    for (const event of batch.events) {
      if (event.type === 'match-result') {
        const result = event.payload;
        showToast(result.winner ? `${result.winner.toUpperCase()} VICTORY` : 'DRAW', 7000);
      }
    }
  }

  function updateDebugScore(diagnostics) {
    const blue = diagnostics.team.blue;
    const red = diagnostics.team.red;
    setText('blueStrength', `${blue.alive}/${blue.initial}`);
    setText('blueStatus', `${blue.routing} routing`);
    setText('redStrength', `${red.alive}/${red.initial}`);
    setText('redStatus', `${red.routing} routing`);
  }

  function updateDebugGenerals(snapshot, diagnostics) {
    for (const team of [TEAM.BLUE, TEAM.RED]) {
      const situation = snapshot.generalSituations?.[team];
      const general = situation?.general;
      const diagnostic = diagnostics.general?.[team];
      const target = team === TEAM.BLUE ? 'blueGeneralDebug' : 'redGeneralDebug';
      if (!general) {
        setText(target, 'UNAVAILABLE');
        continue;
      }
      setText(target,
        `${titleCase(general.state)} · ${titleCase(general.intent)} · ` +
        `${titleCase(general.reason)} · ${diagnostic?.contacts ?? 0} tracks · ` +
        `${general.ordersIssued} orders · ${general.reportsReceived} reports`);
    }
  }

  function updateGameplayScore(situation) {
    const friendly = Array.isArray(situation?.friendly) ? situation.friendly : [];
    const contacts = Array.isArray(situation?.contacts) ? situation.contacts : [];
    setText('blueStrength', `${friendly.length || 'NO'} REPORT${friendly.length === 1 ? '' : 'S'}`);
    setText('blueStatus', friendly.length
      ? `${friendly.filter(report => boundedAge(report) === 'FRESH').length}/${friendly.length} reports fresh`
      : 'field reports pending');
    setText('redStrength', contacts.length ? `${contacts.length} TRACK${contacts.length === 1 ? '' : 'S'}` : 'NO TRACKS');
    const leadingContact = contacts[0];
    setText('redStatus', leadingContact
      ? `${boundedBand(leadingContact.threatBand, 'threat', 'THREAT UNKNOWN')} · ${boundedConfidence(leadingContact.confidence)}`
      : 'disposition unknown');
  }

  function updateDebugSelected(snapshot) {
    const selected = snapshot.centuries.find(century => century.id === selectedCentury) || snapshot.centuries[0];
    if (!selected) return;
    setText('selectedName', `${selected.standard} · ${selected.team.toUpperCase()}`);
    setText('selectedPosture', titleCase(selected.posture));
    setText('selectedState', `${titleCase(selected.state)} / ${titleCase(selected.tacticalRole)}`);
    setText('selectedReason', titleCase(selected.reason));
    setText('selectedStrength', `${selected.alive}/${selected.initialStrength}`);
    setText('selectedMorale', `${Math.round(selected.perceivedMorale * 100)}% perceived`);
    setText('selectedContact', `${Math.round(selected.contactConfidence * 100)}% formation · ${selected.individualContacts.length} individual`);
    setText('selectedLine', `${selected.lineGapError.toFixed(1)}m gap · ${selected.lineDepthError.toFixed(1)}m depth`);
    const epochLabel = selected.pendingPlanEpoch == null
      ? `e${selected.planEpoch}`
      : `active e${selected.planEpoch} → pending e${selected.pendingPlanEpoch}`;
    setText('selectedOrders', `${titleCase(selected.planStatus)} ${epochLabel} · ${titleCase(selected.standardCode)} standard · ${selected.messagesSent}/${selected.messagesReceived} tx/rx`);
    setText('selectedZone', selected.holdZone
      ? `${selected.holdZone.x.toFixed(0)}, ${selected.holdZone.z.toFixed(0)} · r${selected.holdZone.radius.toFixed(0)}m`
      : 'none');
    setText('selectedQuality', `Q ${selected.capabilitySummary.mean.overall.toFixed(2)} · base drill ${selected.training.formation.toFixed(2)} · base weapon ${selected.training.weapons.toFixed(2)} · actual armor ${selected.capabilitySummary.mean.armor.toFixed(2)}`);
    for (const button of document.querySelectorAll('[data-posture]')) {
      setActive(button, button.dataset.posture === selected.posture);
    }
  }

  function updateGameplaySelected(situation) {
    const report = friendlyReport(situation, selectedCentury);
    const contacts = Array.isArray(situation?.contacts) ? situation.contacts : [];
    const intent = normalizedBand(report?.intendedPosture ?? situation?.general?.intent);
    const posture = intent === 'advance' ? POSTURE.AGGRESSIVE
      : intent === 'stationary' ? POSTURE.HOLD
        : intent === 'feint' ? POSTURE.DEFENSIVE_FEINT : intent;
    setText('selectedName', safeMark(report?.mark, selectedCentury === 'blue-1' ? 'B1 · BLUE' : 'B2 · BLUE'));
    setText('selectedPosture', boundedBand(intent, 'intent', 'STANDING ORDERS'));
    setText('selectedStrength', boundedBand(report?.strengthBand, 'strength', 'REPORT PENDING'));
    setText('selectedMorale', boundedBand(report?.statusBand, 'status', 'status unknown').toLowerCase());
    setText('selectedContact', contacts.length
      ? `${contacts.length} enemy track${contacts.length === 1 ? '' : 's'} · ${boundedConfidence(contacts[0]?.confidence).toLowerCase()}`
      : 'no confirmed enemy track');
    const order = boundedBand(report?.orderStatus, 'order', 'ORDER STATUS UNKNOWN');
    const source = boundedBand(report?.source, 'source', 'SOURCE UNKNOWN');
    setText('selectedReport', report ? `${order} · ${boundedAge(report)} · ${source}` : 'Awaiting runner or signal');
    setText('selectedZone', 'not included in current field report');
    for (const button of document.querySelectorAll('[data-posture]')) {
      setActive(button, button.dataset.posture === posture);
    }
  }

  function update(snapshot, diagnostics, frameMs) {
    const situation = readGeneralSituation(simulation, snapshot);
    latestSituation = situation;
    setText('battleClock', `${Math.floor(snapshot.simTime / 60).toString().padStart(2, '0')}:${Math.floor(snapshot.simTime % 60).toString().padStart(2, '0')}`);
    setText('casualtiesTotal', diagnostics.casualties);
    setText('runnerLosses', diagnostics.runnerLosses);
    setText('hitCount', diagnostics.hits);
    setText('messageCount', `${diagnostics.messagesDelivered}/${diagnostics.messagesDispatched}`);
    setText('runnerCount', diagnostics.runnerDeliveries);
    setText('simPerf', `${frameMs.toFixed(1)} ms`);
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
    const resultElement = byId('matchResult');
    if (resultElement) {
      resultElement.classList.toggle('visible', Boolean(result));
      resultElement.dataset.winner = result?.winner || 'draw';
      resultElement.textContent = result
        ? result.winner ? `${result.winner.toUpperCase()} ${result.status.replace('-', ' ').toUpperCase()}` : 'DRAW'
        : 'BATTLE IN PROGRESS';
    }
    const pause = byId('btnPause');
    if (pause) pause.textContent = snapshot.config.paused ? 'RESUME' : 'PAUSE';
    setActive(pause, snapshot.config.paused);
    if (byId('seed') && document.activeElement !== byId('seed')) byId('seed').value = String(snapshot.config.seed);
    if (byId('strength') && document.activeElement !== byId('strength')) {
      byId('strength').value = String(snapshot.config.perCentury);
      setText('strengthOut', snapshot.config.perCentury);
    }
    setText('commandTarget', applyToTeam ? `${selectedTeam().toUpperCase()} TEAM` : selectedCentury.toUpperCase());
    processObserverEvents();
    if (performance.now() > toastUntil) byId('toast')?.classList.remove('visible');
  }

  selectCentury(selectedCentury);
  setUIMode(UI_MODE.GAMEPLAY, false);
  return Object.freeze({ update, selectCentury, setUIMode, cancelZonePlacement });
}
