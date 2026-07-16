import { POSTURE, TEAM } from './constants.js';

const byId = id => document.getElementById(id);
const setText = (id, value) => {
  const element = byId(id);
  if (element) element.textContent = String(value);
};
const setActive = (element, active) => element?.classList.toggle('active', Boolean(active));
const titleCase = value => String(value || '—').replaceAll('-', ' ')
  .replace(/\b\w/g, character => character.toUpperCase());

export function createBattlefieldUI(simulation, renderer) {
  let selectedCentury = 'blue-1';
  let applyToTeam = true;
  let placingZone = false;
  let observerIndex = 0;
  let toastUntil = 0;

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
    selectedCentury = id;
    renderer.setSelectedCentury(id);
    for (const button of document.querySelectorAll('[data-century]')) {
      setActive(button, button.dataset.century === id);
    }
    const team = selectedTeam();
    document.body.dataset.commandTeam = team;
    setText('commandTarget', applyToTeam ? `${team.toUpperCase()} TEAM` : id.toUpperCase());
  }

  for (const button of document.querySelectorAll('[data-century]')) {
    button.addEventListener('click', () => selectCentury(button.dataset.century));
  }

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
    if (['INPUT', 'TEXTAREA'].includes(event.target?.tagName)) return;
    if (event.key === ' ') {
      event.preventDefault();
      simulation.setPaused(!simulation.paused);
    }
    if (event.key === '1') simulation.issuePosture(commandScope(), POSTURE.AGGRESSIVE);
    if (event.key === '2') simulation.issuePosture(commandScope(), POSTURE.HOLD);
    if (event.key === '3') simulation.issuePosture(commandScope(), POSTURE.DEFENSIVE_FEINT);
    const centuryKeys = { q: 'blue-1', w: 'blue-2', o: 'red-1', p: 'red-2' };
    if (centuryKeys[event.key.toLowerCase()]) selectCentury(centuryKeys[event.key.toLowerCase()]);
    if (event.key === 'Escape') cancelZonePlacement();
  });

  function updateCenturyCards(snapshot) {
    for (const century of snapshot.centuries) {
      const card = byId(`card-${century.id}`);
      if (!card) continue;
      card.dataset.state = century.state;
      card.classList.toggle('selected', century.id === selectedCentury);
      const strength = card.querySelector('[data-field="strength"]');
      const state = card.querySelector('[data-field="state"]');
      const quality = card.querySelector('[data-field="quality"]');
      const comm = card.querySelector('[data-field="comm"]');
      if (strength) strength.textContent = `${century.alive}/${century.initialStrength}`;
      if (state) state.textContent = `${titleCase(century.posture)} · ${titleCase(century.state)} · ${titleCase(century.tacticalRole)}`;
      if (quality) quality.textContent = `Q ${century.capabilitySummary.mean.overall.toFixed(2)} · BASE DRL ${century.training.formation.toFixed(2)} · WPN ${century.training.weapons.toFixed(2)}`;
      if (comm) comm.textContent = `${century.contactConfidence > .12 ? 'CONTACT' : 'NO CONTACT'} · ${titleCase(century.communicationState)}`;
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

  function update(snapshot, diagnostics, frameMs) {
    const blue = diagnostics.team.blue;
    const red = diagnostics.team.red;
    setText('battleClock', `${Math.floor(snapshot.simTime / 60).toString().padStart(2, '0')}:${Math.floor(snapshot.simTime % 60).toString().padStart(2, '0')}`);
    setText('blueStrength', `${blue.alive}/${blue.initial}`);
    setText('redStrength', `${red.alive}/${red.initial}`);
    setText('blueRout', blue.routing);
    setText('redRout', red.routing);
    setText('casualtiesTotal', diagnostics.casualties);
    setText('runnerLosses', diagnostics.runnerLosses);
    setText('hitCount', diagnostics.hits);
    setText('messageCount', `${diagnostics.messagesDelivered}/${diagnostics.messagesDispatched}`);
    setText('runnerCount', diagnostics.runnerDeliveries);
    setText('simPerf', `${frameMs.toFixed(1)} ms`);

    const selected = snapshot.centuries.find(century => century.id === selectedCentury) || snapshot.centuries[0];
    if (selected) {
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
    updateCenturyCards(snapshot);
    processObserverEvents();
    if (performance.now() > toastUntil) byId('toast')?.classList.remove('visible');
  }

  selectCentury(selectedCentury);
  return Object.freeze({ update, selectCentury, cancelZonePlacement });
}
