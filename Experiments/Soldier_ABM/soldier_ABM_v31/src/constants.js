export const VERSION = 31;

export const TEAM = Object.freeze({ BLUE: 'blue', RED: 'red' });
export const TEAMS = Object.freeze([TEAM.BLUE, TEAM.RED]);

export const POSTURE = Object.freeze({
  AGGRESSIVE: 'aggressive',
  HOLD: 'hold',
  DEFENSIVE_FEINT: 'defensive-feint'
});
export const POSTURES = Object.freeze(Object.values(POSTURE));

export const CENTURION_STATE = Object.freeze({
  ADVANCE: 'advance',
  MARCH_TO_ZONE: 'march-to-zone',
  FORM_LINE: 'form-line',
  FIX_ENEMY: 'fix-enemy',
  STAGE_FLANK: 'stage-flank',
  MANEUVER_FLANK: 'maneuver-flank',
  HOLD: 'hold',
  COUNTER: 'counter',
  BAIT_WAIT: 'bait-wait',
  FEINT_OUT: 'feint-out',
  FEINT_RETIRE: 'feint-retire',
  COVER_FEINT: 'cover-feint',
  AMBUSH_STRIKE: 'ambush-strike',
  GUARD_FLANK: 'guard-flank',
  SUPPORT_ALLY: 'support-ally',
  WITHDRAW: 'withdraw',
  ROUTED: 'routed'
});

export const SOLDIER_STATE = Object.freeze({
  FORM: 'form',
  DRESS: 'dress',
  MARCH: 'march',
  ENGAGE: 'engage',
  ROUTE: 'route',
  FALLEN: 'fallen'
});

export const COMBAT_STATE = Object.freeze({
  READY: 'ready',
  APPROACH: 'approach',
  GUARD: 'guard',
  COMMIT: 'commit',
  STRIKE: 'strike',
  RECOVER: 'recover'
});

export const GENERAL_STATE = Object.freeze({
  OBSERVE: 'observe',
  PROBE: 'probe',
  DECEIVE: 'deceive',
  PRESS: 'press',
  GUARD: 'guard',
  RECOVER: 'recover'
});

export const MESSAGE_KIND = Object.freeze({
  PLAN_PROPOSAL: 'plan-proposal',
  PLAN_ACK: 'plan-ack',
  PLAN_COMMIT: 'plan-commit',
  LINE_REPORT: 'line-report',
  CONTACT_REPORT: 'contact-report',
  FLANK_WARNING: 'flank-warning',
  SUPPORT_REQUEST: 'support-request',
  FEINT_PHASE: 'feint-phase',
  WITHDRAW: 'withdraw'
});

export const TACTICAL_ROLE = Object.freeze({
  FIX: 'fix',
  FLANK: 'flank',
  HOLD_WING: 'hold-wing',
  BAIT: 'bait',
  COVER: 'cover'
});

export const PLAN_STATUS = Object.freeze({
  DOCTRINE: 'doctrine',
  WAITING: 'waiting',
  PROPOSED: 'proposed',
  RECEIVED: 'received',
  ACKNOWLEDGED: 'acknowledged',
  COMMITTED: 'committed',
  ABORTED: 'aborted'
});

export const STANDARD_CODE = Object.freeze({
  NONE: 'none',
  READY: 'ready',
  GO: 'go',
  FIXED: 'fixed',
  DRAW: 'draw',
  ABORT: 'abort'
});

export const TUNING = Object.freeze({
  fixedDt: 1 / 30,
  defaultPerCentury: 36,
  ranks: 3,
  spacing: 1.18,
  centuryGap: 4.8,
  bodyRadius: 0.31,
  centurionRadius: 0.44,
  centurionGuideGap: 0.95,
  soldierThink: 0.10,
  centurionThink: 0.22,
  generalThink: 0.50,
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
  zoneArrivalFraction: 0.60,
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

export const TEAM_DOCTRINE = Object.freeze({
  [TEAM.BLUE]: Object.freeze({ forwardHeading: 0, deploymentZ: -34 }),
  [TEAM.RED]: Object.freeze({ forwardHeading: Math.PI, deploymentZ: 34 })
});
