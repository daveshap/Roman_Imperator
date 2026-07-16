import { clamp, deepFreeze } from './math.js';
import { hash01 } from './rng.js';

export const APTITUDE_BOUNDS = deepFreeze({ min: 0.90, max: 1.10 });

export const PROFILE_BOUNDS = deepFreeze({
  training: { min: 0.70, max: 1.35 },
  experience: { min: 0.75, max: 1.35 },
  equipment: { min: 0.60, max: 1.60 },
  penetration: { min: 0, max: 0.60 },
  modifierAdd: { min: -0.50, max: 0.50 },
  modifierMultiply: { min: 0.50, max: 1.50 }
});

export const CAPABILITY_BOUNDS = deepFreeze({
  health: { min: 0.72, max: 1.45 },
  armor: { min: 0.55, max: 1.80 },
  shield: { min: 0.55, max: 1.65 },
  speed: { min: 0.72, max: 1.35 },
  acceleration: { min: 0.72, max: 1.35 },
  turn: { min: 0.75, max: 1.30 },
  stamina: { min: 0.70, max: 1.45 },
  perception: { min: 0.78, max: 1.30 },
  orderResponse: { min: 0.70, max: 1.40 },
  formation: { min: 0.70, max: 1.40 },
  reach: { min: 0.82, max: 1.22 },
  damage: { min: 0.62, max: 1.55 },
  attack: { min: 0.65, max: 1.50 },
  defense: { min: 0.65, max: 1.50 },
  morale: { min: 0.68, max: 1.45 },
  command: { min: 0.70, max: 1.45 },
  leadership: { min: 0.70, max: 1.45 },
  communication: { min: 0.72, max: 1.38 },
  routeThreshold: { min: 0.10, max: 0.24 },
  rallyThreshold: { min: 0.22, max: 0.42 }
});

const TRAINING_KEYS = Object.freeze([
  'weapons', 'defense', 'formation', 'discipline', 'conditioning',
  'awareness', 'command', 'tactics', 'leadership', 'communication'
]);
const EXPERIENCE_KEYS = Object.freeze(['battle', 'command']);
const EQUIPMENT_KEYS = Object.freeze([
  'weaponReach', 'weaponDamage', 'penetration', 'armor', 'shield', 'load'
]);
const EQUIPMENT_CLASS_KEYS = Object.freeze(['weaponClass', 'armorClass', 'shieldClass']);

export const MODIFIABLE_STATS = Object.freeze([
  'health', 'armor', 'shield', 'speed', 'acceleration', 'turn', 'stamina',
  'perception', 'orderResponse', 'formation', 'reach', 'damage', 'attack',
  'defense', 'morale', 'command', 'leadership', 'communication',
  'routeThreshold', 'rallyThreshold'
]);

export const DEFAULT_UNIT_PROFILE = deepFreeze({
  training: Object.fromEntries(TRAINING_KEYS.map(key => [key, 1])),
  experience: Object.fromEntries(EXPERIENCE_KEYS.map(key => [key, 1])),
  equipment: {
    weaponClass: 'gladius-basic',
    armorClass: 'basic-armor',
    shieldClass: 'scutum-basic',
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
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, 80)
    : fallback;
}

function normalizedCategory(input, keys, bounds, defaults, partial = false) {
  const source = input && typeof input === 'object' ? input : {};
  const output = {};
  for (const key of keys) {
    if (partial && !(key in source)) continue;
    output[key] = bounded(source[key], bounds, defaults[key]);
  }
  return output;
}

function normalizeModifier(effect, index) {
  if (!effect || typeof effect !== 'object') {
    throw new TypeError(`modifier at index ${index} must be an object`);
  }
  const id = typeof effect.id === 'string' && effect.id.trim()
    ? effect.id.trim().slice(0, 120)
    : `modifier-${index + 1}`;
  const stat = String(effect.stat || '');
  if (!MODIFIABLE_STATS.includes(stat)) {
    throw new RangeError(`unknown modifier stat: ${stat || '(empty)'}`);
  }
  const mode = effect.mode === 'add' ? 'add' : effect.mode === 'multiply' ? 'multiply' : null;
  if (!mode) throw new RangeError(`modifier ${id} mode must be add or multiply`);
  const rawValue = Number(effect.value);
  if (!Number.isFinite(rawValue)) throw new TypeError(`modifier ${id} value must be finite`);
  const value = mode === 'add'
    ? clamp(rawValue, PROFILE_BOUNDS.modifierAdd.min, PROFILE_BOUNDS.modifierAdd.max)
    : clamp(rawValue, PROFILE_BOUNDS.modifierMultiply.min,
      PROFILE_BOUNDS.modifierMultiply.max);
  const startsAt = Number.isFinite(effect.startsAt) ? Number(effect.startsAt) : -Infinity;
  const expiresAt = Number.isFinite(effect.expiresAt) ? Number(effect.expiresAt) : Infinity;
  if (expiresAt < startsAt) throw new RangeError(`modifier ${id} expires before it starts`);
  return { id, stat, mode, value, startsAt, expiresAt };
}

function normalizeModifierList(input) {
  if (input == null) return [];
  if (!Array.isArray(input)) throw new TypeError('modifiers must be an array');
  const effects = input.map(normalizeModifier).sort((a, b) => a.id.localeCompare(b.id));
  for (let index = 1; index < effects.length; index++) {
    if (effects[index - 1].id === effects[index].id) {
      throw new RangeError(`duplicate modifier id: ${effects[index].id}`);
    }
  }
  return effects;
}

export function normalizeUnitProfileLayer(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('unit profile layer must be an object');
  }
  const output = {};
  if ('training' in input) {
    output.training = normalizedCategory(input.training, TRAINING_KEYS,
      PROFILE_BOUNDS.training, DEFAULT_UNIT_PROFILE.training, true);
  }
  if ('experience' in input) {
    output.experience = normalizedCategory(input.experience, EXPERIENCE_KEYS,
      PROFILE_BOUNDS.experience, DEFAULT_UNIT_PROFILE.experience, true);
  }
  if ('equipment' in input) {
    const source = input.equipment && typeof input.equipment === 'object'
      ? input.equipment : {};
    output.equipment = normalizedCategory(source,
      EQUIPMENT_KEYS.filter(key => key !== 'penetration'), PROFILE_BOUNDS.equipment,
      DEFAULT_UNIT_PROFILE.equipment, true);
    if ('penetration' in source) {
      output.equipment.penetration = bounded(source.penetration,
        PROFILE_BOUNDS.penetration, DEFAULT_UNIT_PROFILE.equipment.penetration);
    }
    for (const key of EQUIPMENT_CLASS_KEYS) {
      if (key in source) output.equipment[key] = safeClass(source[key],
        DEFAULT_UNIT_PROFILE.equipment[key]);
    }
  }
  if ('modifiers' in input) output.modifiers = normalizeModifierList(input.modifiers);
  return deepFreeze(output);
}

export function prepareUnitProfileMap(input = {}) {
  if (input == null) return deepFreeze({});
  if (typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('unitProfiles must be an object keyed by default, team, century, or actor');
  }
  const output = Object.create(null);
  for (const [key, layer] of Object.entries(input)) {
    output[String(key)] = normalizeUnitProfileLayer(layer);
  }
  return deepFreeze(output);
}

export function mergeUnitProfileLayers(...layers) {
  const merged = {
    training: { ...DEFAULT_UNIT_PROFILE.training },
    experience: { ...DEFAULT_UNIT_PROFILE.experience },
    equipment: { ...DEFAULT_UNIT_PROFILE.equipment },
    modifiers: []
  };
  for (const rawLayer of layers) {
    if (!rawLayer) continue;
    // Frozen is not synonymous with trusted: callers can freeze an arbitrary
    // out-of-range object before handing it to this public helper. Normalize
    // every layer so no construction path can bypass the schema bounds.
    const layer = normalizeUnitProfileLayer(rawLayer);
    Object.assign(merged.training, layer.training || {});
    Object.assign(merged.experience, layer.experience || {});
    Object.assign(merged.equipment, layer.equipment || {});
    if (layer.modifiers) merged.modifiers.push(...layer.modifiers.map(effect => ({ ...effect })));
  }
  merged.modifiers.sort((a, b) => a.id.localeCompare(b.id));
  for (let index = 1; index < merged.modifiers.length; index++) {
    if (merged.modifiers[index - 1].id === merged.modifiers[index].id) {
      throw new RangeError(`duplicate modifier id across profile layers: ${merged.modifiers[index].id}`);
    }
  }
  return deepFreeze(merged);
}

export function resolveUnitProfile(profileMap, team, centuryId, actorId = null) {
  const map = profileMap || {};
  return mergeUnitProfileLayers(map.default, map[team], map[centuryId],
    actorId ? map[actorId] : null);
}

function centeredTriangular(seed, actorKey, salt, lane = 0) {
  return hash01(seed, actorKey, salt, lane) +
    hash01(seed, actorKey, salt ^ 0x5bd1e995, lane + 17) - 1;
}

function aptitude(seed, actorKey, salt, latent, span = 0.08) {
  const specific = centeredTriangular(seed, actorKey, salt, 1);
  return clamp(1 + (latent * 0.58 + specific * 0.42) * span,
    APTITUDE_BOUNDS.min, APTITUDE_BOUNDS.max);
}

function copyDevelopment(unitProfile) {
  return {
    training: { ...unitProfile.training },
    experience: { ...unitProfile.experience },
    equipment: { ...unitProfile.equipment },
    modifiers: unitProfile.modifiers.map(effect => ({ ...effect }))
  };
}

export function createActorProfile({ seed, actorKey, profileId, kind, unitProfile }) {
  if (!['soldier', 'centurion', 'runner'].includes(kind)) {
    throw new RangeError('actor profile kind must be soldier, centurion, or runner');
  }
  const physical = centeredTriangular(seed, actorKey, 0x7101);
  const coordination = centeredTriangular(seed, actorKey, 0x7102);
  const temperament = centeredTriangular(seed, actorKey, 0x7103);
  const aptitudes = {
    stature: aptitude(seed, actorKey, 0x7111, physical, 0.065),
    strength: aptitude(seed, actorKey, 0x7112, physical, 0.085),
    agility: aptitude(seed, actorKey, 0x7113, coordination, 0.080),
    endurance: aptitude(seed, actorKey, 0x7114, physical, 0.080),
    perception: aptitude(seed, actorKey, 0x7115, coordination, 0.075),
    cognition: aptitude(seed, actorKey, 0x7116, coordination, 0.075),
    nerve: aptitude(seed, actorKey, 0x7117, temperament, 0.090)
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

export function resolveModifierStack(base, modifiers, stat, bounds, now = 0) {
  const ordered = (modifiers || [])
    .filter(effect => effect.stat === stat && now >= effect.startsAt && now <= effect.expiresAt)
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));
  let additive = 0;
  let logMultiplier = 0;
  for (const effect of ordered) {
    if (!Number.isFinite(effect.value)) continue;
    if (effect.mode === 'add') additive += effect.value;
    // Normalized multiply modifiers are strictly positive. Summing their
    // logarithms preserves very large finite stacks without intermediate
    // overflow turning a max-bound result back into the neutral fallback.
    else if (effect.mode === 'multiply' && effect.value > 0) {
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

export function deriveCapabilities(profile, now = 0) {
  const a = profile.aptitudes;
  const t = profile.training;
  const e = profile.experience;
  const q = profile.equipment;
  const effects = profile.modifiers;
  const apply = (stat, base) => resolveModifierStack(base, effects, stat,
    CAPABILITY_BOUNDS[stat], now);

  const stamina = apply('stamina', weighted([
    [a.endurance, 0.48], [t.conditioning, 0.38], [e.battle, 0.14]
  ]));
  const speed = apply('speed', weighted([
    [a.agility, 0.38], [a.endurance, 0.20], [t.conditioning, 0.32],
    [1 / Math.sqrt(q.load), 0.10]
  ]));
  const perception = apply('perception', weighted([
    [a.perception, 0.50], [a.cognition, 0.14], [t.awareness, 0.28], [e.battle, 0.08]
  ]));
  const formation = apply('formation', weighted([
    [a.cognition, 0.20], [a.nerve, 0.10], [t.formation, 0.42],
    [t.discipline, 0.23], [e.battle, 0.05]
  ]));
  const orderResponse = apply('orderResponse', weighted([
    [a.cognition, 0.30], [a.nerve, 0.10], [t.formation, 0.25],
    [t.discipline, 0.28], [e.battle, 0.07]
  ]));
  const attack = apply('attack', weighted([
    [a.agility, 0.22], [a.perception, 0.12], [t.weapons, 0.43], [e.battle, 0.23]
  ]));
  const defense = apply('defense', weighted([
    [a.agility, 0.30], [a.perception, 0.13], [t.defense, 0.40], [e.battle, 0.17]
  ]));
  const morale = apply('morale', weighted([
    [a.nerve, 0.43], [t.discipline, 0.34], [e.battle, 0.18], [t.leadership, 0.05]
  ]));
  const promoted = profile.kind === 'centurion' ? 1.06 : 1;
  const command = apply('command', weighted([
    [a.cognition, 0.24], [a.nerve, 0.11], [t.command, 0.31],
    [t.tactics, 0.16], [e.command, 0.18]
  ]) * promoted);
  const leadership = apply('leadership', weighted([
    [a.nerve, 0.31], [a.cognition, 0.14], [t.leadership, 0.35],
    [t.discipline, 0.08], [e.command, 0.12]
  ]) * promoted);
  const communication = apply('communication', weighted([
    [a.cognition, 0.21], [t.communication, 0.42], [t.command, 0.20],
    [e.command, 0.17]
  ]) * (profile.kind === 'centurion' ? 1.03 : 1));
  const routeThreshold = apply('routeThreshold', 0.16 / morale);
  const rallyRaw = apply('rallyThreshold', 0.34 / Math.sqrt(morale * orderResponse));
  const rallyThreshold = clamp(rallyRaw, routeThreshold + 0.12,
    CAPABILITY_BOUNDS.rallyThreshold.max);

  return deepFreeze({
    body: {
      health: apply('health', weighted([
        [a.endurance, 0.48], [a.strength, 0.30], [t.conditioning, 0.22]
      ])),
      armor: apply('armor', q.armor),
      shield: apply('shield', q.shield)
    },
    movement: {
      speed,
      acceleration: apply('acceleration', weighted([
        [a.agility, 0.48], [t.conditioning, 0.30], [1 / Math.sqrt(q.load), 0.22]
      ])),
      turn: apply('turn', weighted([[a.agility, 0.68], [t.defense, 0.20],
        [1 / Math.sqrt(q.load), 0.12]])),
      stamina,
      fatigueCost: clamp(q.load / stamina, 0.65, 1.55),
      fatigueRecovery: clamp(stamina / Math.sqrt(q.load), 0.68, 1.50)
    },
    perception: {
      quality: perception,
      sight: clamp(0.88 + perception * 0.12, 0.93, 1.08),
      fov: clamp(0.92 + perception * 0.08, 0.95, 1.06),
      closeAwareness: clamp(0.90 + perception * 0.10, 0.95, 1.06),
      error: clamp(1 / perception, 0.78, 1.28),
      targetMemory: clamp(0.70 + perception * 0.30, 0.88, 1.16)
    },
    formation: {
      quality: formation,
      orderResponse,
      reaction: clamp(1 / orderResponse, 0.70, 1.40),
      postGain: clamp(formation, 0.70, 1.40),
      arrivalTolerance: clamp(1 / formation, 0.72, 1.38),
      guideMemory: clamp(weighted([[formation, 0.55], [perception, 0.45]]), 0.72, 1.38),
      relayInterval: clamp(1 / weighted([[formation, 0.55], [communication, 0.45]]),
        0.72, 1.38)
    },
    combat: {
      reach: apply('reach', q.weaponReach * (1 + (a.stature - 1) * 0.36)),
      damage: apply('damage', q.weaponDamage * weighted([
        [a.strength, 0.32], [t.weapons, 0.43], [e.battle, 0.25]
      ])),
      penetration: q.penetration,
      attack,
      defense,
      guardTime: clamp(1 / weighted([[attack, 0.65], [perception, 0.35]]), 0.70, 1.35),
      commitTime: clamp(1 / weighted([[attack, 0.72], [a.agility, 0.28]]), 0.70, 1.35),
      strikeTime: clamp(1 / weighted([[attack, 0.60], [a.agility, 0.40]]), 0.72, 1.32),
      recoveryTime: clamp(q.load / weighted([[attack, 0.38], [stamina, 0.62]]), 0.68, 1.45)
    },
    morale: {
      stability: morale,
      routeThreshold,
      rallyThreshold,
      recovery: clamp(morale * 0.62 + t.discipline * 0.38, 0.70, 1.45),
      casualtyShock: clamp(1 / morale, 0.68, 1.48),
      officerShock: clamp(1 / weighted([[morale, 0.65], [leadership, 0.35]]), 0.68, 1.48)
    },
    command: {
      quality: command,
      leadership,
      communication,
      judgment: clamp(weighted([[command, 0.42], [t.tactics, 0.38],
        [perception, 0.20]]), 0.70, 1.45),
      orderCadence: clamp(1 / command, 0.70, 1.40),
      orderClarity: clamp(weighted([[command, 0.60], [communication, 0.40]]), 0.72, 1.40),
      reportCadence: clamp(1 / weighted([[command, 0.55], [communication, 0.45]]),
        0.72, 1.40)
    },
    equipment: {
      weaponClass: q.weaponClass,
      armorClass: q.armorClass,
      shieldClass: q.shieldClass,
      load: q.load
    }
  });
}

export function capabilityRatings(capabilities) {
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
    [causal.attack, 0.17], [causal.defense, 0.14], [causal.morale, 0.15],
    [causal.formation, 0.16], [causal.orderResponse, 0.12], [causal.health, 0.08],
    [causal.speed, 0.06], [causal.perception, 0.06], [causal.command, 0.06]
  ]);
  return deepFreeze({ ...causal, overall });
}

export function summarizeCapabilities(capabilityList) {
  const ratings = capabilityList.map(capabilityRatings);
  if (!ratings.length) return deepFreeze({ count: 0, mean: {}, min: {}, max: {} });
  const keys = Object.keys(ratings[0]);
  const mean = {};
  const min = {};
  const max = {};
  for (const key of keys) {
    const values = ratings.map(rating => rating[key]);
    mean[key] = values.reduce((sum, value) => sum + value, 0) / values.length;
    min[key] = Math.min(...values);
    max[key] = Math.max(...values);
  }
  return deepFreeze({ count: ratings.length, mean, min, max });
}

export function orderReactionDelay(baseDelay, capabilities, commandClarity = 1) {
  return clamp(baseDelay * capabilities.formation.reaction /
    clamp(commandClarity, 0.72, 1.40), 0.05, 0.80);
}

export function combatHitChance({
  baseChance, flankBonus, flank, shieldFront, attacker, target, fatigue = 0,
  targetKind = 'soldier'
}) {
  const defenseExposure = flank ? 0.22 : shieldFront ? 1 : 0.62;
  return clamp(baseChance + (flank ? flankBonus : 0) +
    (attacker.combat.attack - 1) * 0.26 -
    (target.combat.defense - 1) * 0.24 * defenseExposure -
    (shieldFront ? 0.19 * target.body.shield : 0) -
    clamp(fatigue, 0, 1) * 0.18 +
    (targetKind === 'centurion' ? -0.05 : 0), 0.08, 0.88);
}

export function combatDamage({ directionalBase, attacker, target }) {
  const effectiveArmor = target.body.armor > 1
    ? 1 + (target.body.armor - 1) * (1 - attacker.combat.penetration)
    : target.body.armor;
  return clamp(directionalBase * attacker.combat.damage / Math.max(0.45, effectiveArmor),
    0.15, 1.25);
}
