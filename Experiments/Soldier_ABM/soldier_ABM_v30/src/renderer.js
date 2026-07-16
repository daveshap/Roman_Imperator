const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const PALETTE = Object.freeze({
  blue: '#58a6ff',
  blueDark: '#173f66',
  red: '#ff6b62',
  redDark: '#672c2a',
  gold: '#efc66a',
  ink: '#071015',
  ground: '#263024',
  groundFar: '#151d18',
  grid: 'rgba(225,232,205,.075)',
  corpse: '#5b4238'
});

export function createBattlefieldRenderer(canvas) {
  if (!canvas) throw new Error('createBattlefieldRenderer requires a canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
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
  let selectedCentury = 'blue-1';
  let uiMode = 'gameplay';
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
  const normalize = vector => {
    const magnitude = Math.hypot(vector.x, vector.y, vector.z) || 1;
    return { x: vector.x / magnitude, y: vector.y / magnitude, z: vector.z / magnitude };
  };

  function resize() {
    const ratio = Math.min(2, globalThis.devicePixelRatio || 1);
    width = globalThis.innerWidth || 1280;
    height = globalThis.innerHeight || 720;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
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
      if (!began) { ctx.moveTo(point.x, point.y); began = true; }
      else ctx.lineTo(point.x, point.y);
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
      ctx.strokeStyle = x === 0 ? 'rgba(239,198,106,.22)' : PALETTE.grid;
      ctx.lineWidth = x === 0 ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (let z = -70; z <= 70; z += 5) {
      const a = project(-68, 0, z);
      const b = project(68, 0, z);
      if (!a || !b) continue;
      ctx.strokeStyle = z === 0 ? 'rgba(239,198,106,.36)' : PALETTE.grid;
      ctx.lineWidth = z === 0 ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    const corners = [[-68, -72], [68, -72], [68, 72], [-68, 72], [-68, -72]];
    ctx.strokeStyle = 'rgba(239,198,106,.24)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    corners.forEach(([x, z], index) => {
      const point = project(x, 0.01, z);
      if (!point) return;
      if (index === 0) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    ctx.restore();
  }

  function drawHoldZones(snapshot) {
    for (const century of snapshot.centuries) {
      if (uiMode === 'gameplay' && century.team !== 'blue') continue;
      if (!century.holdZone?.enabled) continue;
      const selected = century.id === selectedCentury;
      ctx.save();
      if (pathGroundCircle(century.holdZone.x, century.holdZone.z, century.holdZone.radius)) {
        ctx.fillStyle = century.team === 'blue'
          ? `rgba(88,166,255,${selected ? .14 : .075})`
          : `rgba(255,107,98,${selected ? .14 : .075})`;
        ctx.strokeStyle = century.team === 'blue'
          ? `rgba(88,166,255,${selected ? .9 : .52})`
          : `rgba(255,107,98,${selected ? .9 : .52})`;
        ctx.lineWidth = selected ? 2.5 : 1.4;
        ctx.setLineDash([8, 6]);
        ctx.fill(); ctx.stroke();
      }
      const center = project(century.holdZone.x, 0.07, century.holdZone.z);
      if (center) {
        ctx.setLineDash([]);
        ctx.fillStyle = PALETTE.gold;
        ctx.font = '700 10px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${century.standard} ZONE`, center.x, center.y - 5);
      }
      ctx.restore();
    }
  }

  function drawGeneralPosts() {
    for (const post of [{ team: 'blue', x: 0, z: -54 }, { team: 'red', x: 0, z: 54 }]) {
      if (uiMode === 'gameplay' && post.team !== 'blue') continue;
      const point = project(post.x, .08, post.z);
      if (!point) continue;
      ctx.save();
      ctx.fillStyle = PALETTE[post.team];
      ctx.strokeStyle = 'rgba(239,198,106,.7)';
      ctx.lineWidth = 1.5;
      const size = clamp(point.scale * .75, 6, 18);
      ctx.beginPath();
      ctx.moveTo(point.x, point.y - size);
      ctx.lineTo(point.x + size * .75, point.y);
      ctx.lineTo(point.x, point.y + size);
      ctx.lineTo(point.x - size * .75, point.y);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e7d69e';
      ctx.font = '800 8px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${post.team.toUpperCase()} GENERAL`, point.x, point.y + size + 10);
      ctx.restore();
    }
  }

  function drawTrack(track, team) {
    const point = project(track.x, 0.06, track.z);
    if (!point) return;
    const radius = clamp((track.width || 5) * point.scale * 0.5, 5, 42);
    ctx.save();
    ctx.globalAlpha = clamp(track.confidence, .12, .8);
    ctx.strokeStyle = team === 'blue' ? '#9fd0ff' : '#ffb2ac';
    ctx.setLineDash([4, 5]);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = '9px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${track.source.toUpperCase()} ${Math.round(track.confidence * 100)}%`,
      point.x, point.y - radius - 4);
    ctx.restore();
  }

  function drawIndividualContact(contact, team) {
    const point = project(contact.x, 0.08, contact.z);
    if (!point) return;
    const size = clamp(point.scale * .32, 4, 10);
    ctx.save();
    ctx.globalAlpha = clamp(contact.confidence, .18, .82);
    ctx.strokeStyle = team === 'blue' ? '#9fd0ff' : '#ffb2ac';
    ctx.lineWidth = 1.4;
    if (contact.contactClass === 'courier') {
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
    ctx.font = '8px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(contact.contactClass.toUpperCase(), point.x, point.y - size - 3);
    ctx.restore();
  }

  function drawCognition(snapshot) {
    if (uiMode !== 'debug' || !snapshot.config.showCognition) return;
    for (const century of snapshot.centuries) {
      for (const track of century.tracks) drawTrack(track, century.team);
      for (const contact of century.individualContacts) {
        drawIndividualContact(contact, century.team);
      }
    }
  }

  function drawFallen(snapshot) {
    for (const body of snapshot.fallenBodies) {
      if (uiMode === 'gameplay' && body.team !== 'blue') continue;
      const point = project(body.x, 0.035, body.z);
      if (!point) continue;
      const radius = clamp(point.scale * 0.23, 2.2, 7);
      ctx.save();
      ctx.strokeStyle = body.team === 'blue' ? '#315f80' : '#803e3b';
      ctx.lineWidth = Math.max(1.2, radius * .35);
      ctx.beginPath();
      ctx.moveTo(point.x - radius, point.y - radius * .45);
      ctx.lineTo(point.x + radius, point.y + radius * .45);
      ctx.moveTo(point.x - radius, point.y + radius * .45);
      ctx.lineTo(point.x + radius, point.y - radius * .45);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawSoldier(soldier) {
    const foot = project(soldier.x, 0, soldier.z);
    const head = project(soldier.x, .78, soldier.z);
    if (!foot || !head) return;
    const selected = soldier.centuryId === selectedCentury;
    const color = PALETTE[soldier.team];
    const dark = PALETTE[`${soldier.team}Dark`];
    const radius = clamp(foot.scale * .25, 2.1, 7.5);
    const forward = { x: Math.sin(soldier.heading), z: Math.cos(soldier.heading) };
    const tip = project(soldier.x + forward.x * .45, .1, soldier.z + forward.z * .45);
    ctx.save();
    ctx.fillStyle = dark;
    ctx.strokeStyle = selected ? '#f6dc93' : color;
    ctx.lineWidth = selected ? 1.6 : 1;
    ctx.beginPath(); ctx.arc(foot.x, foot.y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (tip) {
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, radius * .28);
      ctx.beginPath(); ctx.moveTo(foot.x, foot.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
    }
    if (soldier.state === 'route') {
      ctx.strokeStyle = '#f3cf77';
      ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.arc(foot.x, foot.y, radius + 2.5, 0, Math.PI * 2); ctx.stroke();
    } else if (soldier.combatState === 'strike') {
      ctx.strokeStyle = '#fff0b6';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(head.x, head.y, radius * .55, 0, Math.PI * 2); ctx.stroke();
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
    ctx.strokeStyle = selected ? '#ffe9a9' : '#d7c697';
    ctx.lineWidth = selected ? 3 : 2;
    ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(top.x, top.y); ctx.stroke();
    const bannerWidth = clamp(top.scale * .68, 7, 24);
    const bannerHeight = bannerWidth * .52;
    const signalRaised = showSignals && centurion.standardCode &&
      centurion.standardCode !== 'none';
    ctx.fillStyle = signalRaised
      ? PALETTE.gold : color;
    ctx.strokeStyle = '#f2dd9b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(top.x + bannerWidth, top.y + bannerHeight * .2);
    ctx.lineTo(top.x + bannerWidth * .78, top.y + bannerHeight);
    ctx.lineTo(top.x, top.y + bannerHeight * .82);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (signalRaised) {
      ctx.fillStyle = '#171007';
      ctx.font = `800 ${clamp(bannerHeight * .46, 6, 10)}px ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(centurion.standardCode.toUpperCase(),
        top.x + bannerWidth * .46, top.y + bannerHeight * .65);
    }
    if (!centurion.alive) {
      ctx.strokeStyle = '#160b08';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(base.x - 7, base.y - 7); ctx.lineTo(base.x + 7, base.y + 7); ctx.stroke();
    }
    ctx.restore();
  }

  function drawCouriers(snapshot) {
    for (const courier of snapshot.couriers) {
      if (uiMode === 'gameplay' && courier.team !== 'blue') continue;
      const point = project(courier.x, .12, courier.z);
      if (!point) continue;
      ctx.save();
      ctx.fillStyle = PALETTE.gold;
      ctx.strokeStyle = '#3c2b12';
      ctx.lineWidth = 1;
      const size = clamp(point.scale * .24, 3, 8);
      ctx.beginPath();
      ctx.moveTo(point.x, point.y - size);
      ctx.lineTo(point.x + size, point.y);
      ctx.lineTo(point.x, point.y + size);
      ctx.lineTo(point.x - size, point.y);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  function drawCenturyLabels(snapshot) {
    for (const century of snapshot.centuries) {
      if (uiMode === 'gameplay' && century.team !== 'blue') continue;
      const point = project(century.center.x, 2.7, century.center.z);
      if (!point) continue;
      const selected = century.id === selectedCentury;
      const label = uiMode === 'debug'
        ? `${century.standard} · ${century.state.toUpperCase()} · ${century.tacticalRole.toUpperCase()} · ${century.alive}/${century.initialStrength}`
        : century.standard;
      ctx.save();
      ctx.font = `${selected ? 800 : 650} 11px ui-monospace, monospace`;
      ctx.textAlign = 'center';
      const metrics = ctx.measureText(label);
      ctx.fillStyle = 'rgba(4,10,13,.78)';
      ctx.fillRect(point.x - metrics.width / 2 - 6, point.y - 11, metrics.width + 12, 17);
      ctx.fillStyle = selected ? '#ffe5a1' : PALETTE[century.team];
      ctx.fillText(label, point.x, point.y + 1);
      if (selected && pathGroundCircle(century.center.x, century.center.z,
        Math.max(3.5, Math.sqrt(century.initialStrength) * .78), .04)) {
        ctx.strokeStyle = 'rgba(255,229,161,.5)';
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
      if (age < 0 || age > .32 || event.event !== 'hit') continue;
      const target = snapshot.soldiers.find(soldier => soldier.id === event.targetId) ||
        snapshot.centurions.find(centurion => centurion.id === event.targetId);
      if (!target) continue;
      if (uiMode === 'gameplay' && target.team !== 'blue') continue;
      const point = project(target.x, .5, target.z);
      if (!point) continue;
      const pulse = 1 - age / .32;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#fff0ad';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(point.x, point.y, 4 + 10 * (1 - pulse), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  function drawGameplayContacts(situation) {
    if (uiMode !== 'gameplay' || !Array.isArray(situation?.contacts)) return;
    for (let index = 0; index < situation.contacts.length; index++) {
      const contact = situation.contacts[index];
      if (!Number.isFinite(contact?.x) || !Number.isFinite(contact?.z)) continue;
      const point = project(contact.x, .12, contact.z);
      if (!point) continue;
      const radiusMeters = contact.strengthBand === 'many' ? 11
        : contact.strengthBand === 'body' ? 7 : 4.5;
      const radius = clamp(radiusMeters * point.scale, 7, 34);
      const confidence = clamp(Number(contact.confidence) || 0, .12, .85);
      const mark = /^[A-Z0-9][A-Z0-9 .-]{0,15}$/i.test(String(contact.recognizedMark || ''))
        ? String(contact.recognizedMark).toUpperCase()
        : `CONTACT ${String.fromCharCode(65 + index)}`;
      ctx.save();
      ctx.globalAlpha = confidence;
      ctx.strokeStyle = PALETTE.red;
      ctx.fillStyle = 'rgba(255,107,98,.07)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash(contact.ageBand === 'stale' ? [3, 7] : [7, 5]);
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffd1cc';
      ctx.font = '750 9px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${mark} · ${String(contact.strengthBand || 'unknown').toUpperCase()}`,
        point.x, point.y - radius - 5);
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

    const drawables = [];
    for (const soldier of snapshot.soldiers) {
      if (!soldier.alive) continue;
      if (uiMode === 'gameplay' && soldier.team !== 'blue') continue;
      const p = project(soldier.x, 0, soldier.z);
      if (p) drawables.push({ depth: p.depth, kind: 'soldier', value: soldier });
    }
    for (const centurion of snapshot.centurions) {
      if (uiMode === 'gameplay' && centurion.team !== 'blue') continue;
      const p = project(centurion.x, 0, centurion.z);
      if (p) drawables.push({ depth: p.depth, kind: 'centurion', value: centurion });
    }
    drawables.sort((a, b) => b.depth - a.depth);
    for (const drawable of drawables) {
      if (drawable.kind === 'soldier') drawSoldier(drawable.value);
      else drawCenturion(drawable.value, snapshot.config.showMessages);
    }
    drawCouriers(snapshot);
    drawCombatFlashes(snapshot);
    drawCenturyLabels(snapshot);

    if (placingZone) {
      ctx.save();
      ctx.fillStyle = 'rgba(239,198,106,.92)';
      ctx.font = '700 12px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CLICK THE BATTLEFIELD TO PLACE THE HOLD ZONE', width * .5, height - 24);
      ctx.restore();
    }
  }

  function setSelectedCentury(id) { selectedCentury = id; }
  function setUIMode(mode) {
    uiMode = mode === 'debug' ? 'debug' : 'gameplay';
    return uiMode;
  }
  function setZonePlacementActive(active) {
    placingZone = Boolean(active);
    canvas.classList.toggle('placing-zone', placingZone);
  }
  function onGroundClick(handler) { groundClickHandler = handler; }
  function resetCamera() {
    camera.target.x = 0; camera.target.z = 0;
    camera.distance = 138; camera.yaw = -0.16; camera.pitch = .88;
  }

  canvas.addEventListener('pointerdown', event => {
    if (placingZone && event.button === 0) {
      const point = screenToGround(event.clientX, event.clientY);
      if (point) groundClickHandler?.(point);
      return;
    }
    drag = { x: event.clientX, y: event.clientY, yaw: camera.yaw,
      pitch: camera.pitch, targetX: camera.target.x, targetZ: camera.target.z,
      pan: event.button === 2 || event.shiftKey };
    canvas.setPointerCapture?.(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (drag.pan) {
      const scale = camera.distance / Math.max(260, Math.min(width, height));
      camera.target.x = drag.targetX - camera.right.x * dx * scale + camera.forward.x * dy * scale;
      camera.target.z = drag.targetZ - camera.right.z * dx * scale + camera.forward.z * dy * scale;
    } else {
      camera.yaw = drag.yaw - dx * .006;
      camera.pitch = clamp(drag.pitch + dy * .0045, .32, 1.34);
    }
  });
  const endDrag = () => { drag = null; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    camera.distance = clamp(camera.distance * Math.exp(event.deltaY * .001), 24, 250);
  }, { passive: false });
  globalThis.addEventListener?.('resize', resize);
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
