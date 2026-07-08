"""
First-pass per-human ancient battle simulation.

This is intentionally small and inspectable rather than optimized. It models:
- each soldier as an agent with position, speed, skill, fatigue, fear, wounds, rout state
- unit commanders with delayed high-level intent, local enemy sightings, formation slots
- two Roman control policies:
    * naive: chase/attack nearest enemy mass; weak lateral line preservation
    * autonomous: mission-intent plus battle-line preservation, gap/leash logic, flank refusal
- simple melee and morale interactions

Run:
    python roman_abm_sim.py

Outputs are written next to this file unless --outdir is supplied.
"""
from __future__ import annotations

import argparse
import csv
import json
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

# matplotlib is only used for output figures; the simulation itself has no dependency on it.
import matplotlib.pyplot as plt

EPS = 1e-9


def norm(v: np.ndarray) -> np.ndarray:
    n = float(np.linalg.norm(v))
    if n < EPS:
        return np.zeros_like(v)
    return v / n


def clamp01(x: np.ndarray | float) -> np.ndarray | float:
    return np.clip(x, 0.0, 1.0)


def rotate90(v: np.ndarray) -> np.ndarray:
    return np.array([v[1], -v[0]], dtype=float)


def angle_to_vec(theta: float) -> np.ndarray:
    return np.array([math.cos(theta), math.sin(theta)], dtype=float)


@dataclass
class Intent:
    """High-level order. Units turn it into local behavior themselves."""

    kind: str
    objective: Tuple[float, float]
    preserve_line: bool
    max_gap: float = 3.0
    aggression: float = 0.55
    description: str = ""


@dataclass
class Unit:
    uid: int
    team: int
    name: str
    policy: str
    idx: np.ndarray
    rows: int
    cols: int
    anchor: np.ndarray
    front: np.ndarray
    line_offset: float
    intent: Intent
    spacing_x: float = 1.10
    spacing_y: float = 1.05
    order_delay_s: float = 0.0
    delivered: bool = False
    delivered_intent: Optional[Intent] = None
    perceived_enemy_com: Optional[np.ndarray] = None
    last_sighting_t: float = -999.0
    slot_error: float = 0.0
    events: Dict[str, int] = field(default_factory=lambda: {
        "orders_delivered": 0,
        "gap_closure": 0,
        "advance_leash": 0,
        "flank_refusal": 0,
        "lost_contact": 0,
    })
    debug: List[str] = field(default_factory=list)

    def local_slots(self) -> np.ndarray:
        """Formation-local slots centered around the unit anchor."""
        local = np.zeros((len(self.idx), 2), dtype=float)
        for k in range(len(self.idx)):
            r = k // self.cols
            c = k % self.cols
            x = (c - (self.cols - 1) / 2.0) * self.spacing_x
            y = -((r - (self.rows - 1) / 2.0) * self.spacing_y)
            # y is positive toward the unit's front for front rank, negative for rear.
            # With rows=3: front row +1.05, middle 0, rear -1.05.
            local[k] = np.array([x, y])
        return local

    def slot_positions(self) -> np.ndarray:
        right = rotate90(self.front)
        local = self.local_slots()
        return self.anchor[None, :] + local[:, 0:1] * right[None, :] + local[:, 1:2] * self.front[None, :]

    def log(self, t: float, msg: str, limit: int = 60) -> None:
        if len(self.debug) < limit:
            self.debug.append(f"t={t:6.1f}s | {self.name:18s} | {msg}")


class BattleSim:
    def __init__(self, roman_policy: str, seed: int = 1, dt: float = 0.25, steps: int = 640):
        if roman_policy not in {"naive", "autonomous"}:
            raise ValueError("roman_policy must be 'naive' or 'autonomous'")
        self.roman_policy = roman_policy
        self.rng = np.random.default_rng(seed)
        self.seed = seed
        self.dt = dt
        self.steps = steps
        self.t = 0.0
        self.units: List[Unit] = []
        self.uid_to_unit: Dict[int, Unit] = {}
        self.next_uid = 0
        self._init_soldiers()
        self.metrics: List[Dict[str, float]] = []
        self.snapshots: Dict[int, Dict[str, np.ndarray]] = {}
        self.debug_lines: List[str] = []

    # ------------------------------------------------------------------
    # Setup
    # ------------------------------------------------------------------
    def _new_unit(
        self,
        team: int,
        name: str,
        policy: str,
        anchor_xy: Tuple[float, float],
        front_xy: Tuple[float, float],
        rows: int,
        cols: int,
        line_offset: float,
        intent: Intent,
        order_delay_s: float,
    ) -> Unit:
        n = rows * cols
        start = len(self.team)
        idx = np.arange(start, start + n, dtype=int)
        self.team = np.concatenate([self.team, np.full(n, team, dtype=int)])
        self.unit_id = np.concatenate([self.unit_id, np.full(n, self.next_uid, dtype=int)])
        self.slot_num = np.concatenate([self.slot_num, np.arange(n, dtype=int)])
        self.alive = np.concatenate([self.alive, np.ones(n, dtype=bool)])
        self.broken = np.concatenate([self.broken, np.zeros(n, dtype=bool)])
        self.hp = np.concatenate([self.hp, np.ones(n, dtype=float)])
        # Training and skill are related but not identical. Romans are a bit more cohesive;
        # enemy has slightly higher shock/mass in this scenario.
        if team == 0:
            training = self.rng.normal(0.72, 0.09, size=n)
            skill = self.rng.normal(0.66, 0.11, size=n)
            courage = self.rng.normal(0.66, 0.11, size=n)
        else:
            training = self.rng.normal(0.48, 0.13, size=n)
            skill = self.rng.normal(0.58, 0.15, size=n)
            courage = self.rng.normal(0.60, 0.15, size=n)
        self.training = np.concatenate([self.training, np.clip(training, 0.15, 0.95)])
        self.skill = np.concatenate([self.skill, np.clip(skill, 0.10, 0.95)])
        self.courage = np.concatenate([self.courage, np.clip(courage, 0.10, 0.95)])
        self.fatigue = np.concatenate([self.fatigue, np.zeros(n, dtype=float)])
        self.fear = np.concatenate([self.fear, self.rng.uniform(0.03, 0.12, size=n)])
        self.vel = np.concatenate([self.vel, np.zeros((n, 2), dtype=float)])
        self.home_pos = np.concatenate([self.home_pos, np.zeros((n, 2), dtype=float)])

        u = Unit(
            uid=self.next_uid,
            team=team,
            name=name,
            policy=policy,
            idx=idx,
            rows=rows,
            cols=cols,
            anchor=np.array(anchor_xy, dtype=float),
            front=norm(np.array(front_xy, dtype=float)),
            line_offset=line_offset,
            intent=intent,
            order_delay_s=order_delay_s,
        )
        slots = u.slot_positions()
        jitter = self.rng.normal(0.0, 0.08, size=slots.shape)
        self.pos = np.concatenate([self.pos, slots + jitter])
        self.home_pos[idx] = slots
        self.units.append(u)
        self.uid_to_unit[u.uid] = u
        self.next_uid += 1
        return u

    def _init_soldiers(self) -> None:
        self.team = np.empty(0, dtype=int)
        self.unit_id = np.empty(0, dtype=int)
        self.slot_num = np.empty(0, dtype=int)
        self.alive = np.empty(0, dtype=bool)
        self.broken = np.empty(0, dtype=bool)
        self.hp = np.empty(0, dtype=float)
        self.training = np.empty(0, dtype=float)
        self.skill = np.empty(0, dtype=float)
        self.courage = np.empty(0, dtype=float)
        self.fatigue = np.empty(0, dtype=float)
        self.fear = np.empty(0, dtype=float)
        self.vel = np.empty((0, 2), dtype=float)
        self.pos = np.empty((0, 2), dtype=float)
        self.home_pos = np.empty((0, 2), dtype=float)

        # Intents are purpose + constraints, not exact micro orders.
        if self.roman_policy == "autonomous":
            roman_intent = Intent(
                kind="attack_at_will",
                objective=(0.0, 5.0),
                preserve_line=True,
                max_gap=2.8,
                aggression=0.50,
                description="Advance and engage, but preserve the line and deny flank penetration.",
            )
        else:
            roman_intent = Intent(
                kind="attack_at_will",
                objective=(0.0, 5.0),
                preserve_line=False,
                max_gap=999.0,
                aggression=0.78,
                description="Attack at will; each century pursues nearest/opportune target.",
            )

        # Romans: two small centuries/maniples represented by 30 humans each.
        self._new_unit(0, "Roman Left", self.roman_policy, (-6.6, -16.0), (0.0, 1.0), 3, 10, -6.0, roman_intent, order_delay_s=4.5)
        self._new_unit(0, "Roman Right", self.roman_policy, (6.6, -16.0), (0.0, 1.0), 3, 10, 6.0, roman_intent, order_delay_s=6.5)

        # Enemy plan is fixed: a main body, a bait/skirmisher body to pull the right century out,
        # and a flanking body attacking the Roman right/rear.
        main_intent = Intent("attack_at_will", (0.0, -16.0), False, aggression=0.62, description="Fix the Roman front.")
        bait_intent = Intent("screen_bait", (22.0, -7.5), False, aggression=0.55, description="Draw the Roman right away from the line.")
        flank_intent = Intent("flank", (12.0, -17.0), False, aggression=0.72, description="Turn the Roman right flank.")
        self._new_unit(1, "Enemy Main", "enemy_line", (-2.0, 7.5), (0.0, -1.0), 2, 18, 0.0, main_intent, order_delay_s=0.0)
        self._new_unit(1, "Enemy Bait", "enemy_bait", (21.0, 3.5), (-0.4, -0.9), 2, 7, 0.0, bait_intent, order_delay_s=0.0)
        self._new_unit(1, "Enemy Flank", "enemy_flank", (30.0, -4.0), (-1.0, -0.2), 2, 12, 0.0, flank_intent, order_delay_s=0.0)

    # ------------------------------------------------------------------
    # Utility views
    # ------------------------------------------------------------------
    def alive_mask(self, team: Optional[int] = None) -> np.ndarray:
        m = self.alive.copy()
        if team is not None:
            m &= self.team == team
        return m

    def unit_alive_mask(self, u: Unit) -> np.ndarray:
        return self.alive[u.idx]

    def unit_alive_pos(self, u: Unit) -> np.ndarray:
        m = self.unit_alive_mask(u)
        return self.pos[u.idx[m]]

    def unit_center(self, u: Unit) -> np.ndarray:
        p = self.unit_alive_pos(u)
        if len(p) == 0:
            return u.anchor.copy()
        return p.mean(axis=0)

    def team_units(self, team: int) -> List[Unit]:
        return [u for u in self.units if u.team == team]

    # ------------------------------------------------------------------
    # Commander cognition + orders
    # ------------------------------------------------------------------
    def update_unit_perception(self, u: Unit) -> None:
        own = u.idx[self.alive[u.idx]]
        enemies = np.where(self.alive & (self.team != u.team))[0]
        if len(own) == 0 or len(enemies) == 0:
            return
        own_pos = self.pos[own]
        enemy_pos = self.pos[enemies]
        # Limited soldier sensing. Formation does not see omnisciently.
        diff = enemy_pos[None, :, :] - own_pos[:, None, :]
        d2 = np.sum(diff * diff, axis=2)
        sense = 16.0 if u.team == 0 else 14.0
        seen_cols = np.any(d2 < sense * sense, axis=0)
        if not np.any(seen_cols):
            # memory decay: old sightings become uncertain and have less pull.
            if u.perceived_enemy_com is not None and self.t - u.last_sighting_t > 12.0:
                u.events["lost_contact"] += 1
                if u.events["lost_contact"] <= 2:
                    u.log(self.t, "enemy contact stale; following previous intent rather than live sightings")
            return
        seen = enemies[seen_cols]
        com = self.pos[seen].mean(axis=0)
        noise_scale = 0.6 * (1.0 - float(np.mean(self.training[own])))
        noisy_com = com + self.rng.normal(0.0, noise_scale, size=2)
        if u.perceived_enemy_com is None:
            u.perceived_enemy_com = noisy_com
        else:
            # Commander belief updates gradually.
            u.perceived_enemy_com = 0.75 * u.perceived_enemy_com + 0.25 * noisy_com
        u.last_sighting_t = self.t

    def update_commanders(self) -> None:
        for u in self.units:
            # Deliver initial order after a delay for Romans; enemy starts with its plan.
            if not u.delivered and self.t >= u.order_delay_s:
                u.delivered = True
                u.delivered_intent = u.intent
                u.events["orders_delivered"] += 1
                u.log(self.t, f"received intent: {u.intent.description}")
            self.update_unit_perception(u)

        # Compute shared Roman line information once; enemy does not get this special cohesion rule.
        roman_units = self.team_units(0)
        alive_roman = [u for u in roman_units if np.any(self.alive[u.idx])]
        if alive_roman:
            roman_center = np.mean([u.anchor for u in alive_roman], axis=0)
            visible_enemy = np.vstack([self.pos[self.alive & (self.team == 1)]]) if np.any(self.alive & (self.team == 1)) else np.zeros((0, 2))
            true_enemy_com = visible_enemy.mean(axis=0) if len(visible_enemy) else np.array((0.0, 5.0))
        else:
            roman_center = np.zeros(2)
            true_enemy_com = np.zeros(2)

        for u in self.units:
            self._update_single_commander(u, roman_center, true_enemy_com)

    def _update_single_commander(self, u: Unit, roman_center: np.ndarray, true_enemy_com: np.ndarray) -> None:
        if not np.any(self.alive[u.idx]):
            return
        # Use delayed/undelivered order: before delivery, hold in place.
        intent = u.delivered_intent if u.delivered_intent is not None else Intent("hold", tuple(u.anchor), True, max_gap=2.8, aggression=0.0, description="No order yet; hold.")

        # Actual mean slot error throttles commander's willingness/ability to move the formation.
        slots = u.slot_positions()
        alive_local = self.alive[u.idx]
        if np.any(alive_local):
            err = np.linalg.norm(self.pos[u.idx[alive_local]] - slots[alive_local], axis=1)
            u.slot_error = float(np.mean(err))
        else:
            u.slot_error = 0.0
        cohesion_throttle = 1.0 / (1.0 + 0.35 * u.slot_error)

        target = np.array(intent.objective, dtype=float)
        if u.perceived_enemy_com is not None and self.t - u.last_sighting_t < 20.0:
            perceived = u.perceived_enemy_com
        else:
            perceived = target

        if u.team == 0:
            if u.policy == "naive":
                self._naive_roman_commander(u, intent, perceived, cohesion_throttle)
            else:
                self._autonomous_roman_commander(u, intent, roman_center, perceived, true_enemy_com, cohesion_throttle)
        elif u.policy == "enemy_line":
            self._enemy_line_commander(u, cohesion_throttle)
        elif u.policy == "enemy_bait":
            self._enemy_bait_commander(u, cohesion_throttle)
        elif u.policy == "enemy_flank":
            self._enemy_flank_commander(u, cohesion_throttle)

    def _naive_roman_commander(self, u: Unit, intent: Intent, perceived: np.ndarray, throttle: float) -> None:
        # Naive unit autonomy: the century treats "attack at will" as "go to the nearest/most salient enemy".
        enemy_units = [e for e in self.team_units(1) if np.any(self.alive[e.idx])]
        if enemy_units:
            centers = np.array([self.unit_center(e) for e in enemy_units])
            d = np.linalg.norm(centers - u.anchor[None, :], axis=1)
            # Right Roman is particularly susceptible to the bait: it chooses a closer/off-axis enemy.
            target = centers[int(np.argmin(d))]
        else:
            target = perceived
        desired_front = norm(target - u.anchor)
        if np.linalg.norm(desired_front) > 0:
            u.front = norm(0.85 * u.front + 0.15 * desired_front)
        speed = 0.70 * intent.aggression * throttle
        u.anchor = u.anchor + u.front * speed * self.dt

    def _autonomous_roman_commander(
        self,
        u: Unit,
        intent: Intent,
        roman_center: np.ndarray,
        perceived: np.ndarray,
        true_enemy_com: np.ndarray,
        throttle: float,
    ) -> None:
        # Mission-command style: obey purpose, preserve the line, use local initiative for flank threats.
        # Shared line: rough knowledge via centurions/signals/messengers. Here modeled as a low-bandwidth
        # center + offset, not omniscient pathfinding.
        enemy_vec = perceived - u.anchor
        if np.linalg.norm(enemy_vec) < 0.5:
            enemy_vec = np.array(intent.objective) - u.anchor
        front_to_enemy = norm(enemy_vec)
        right = rotate90(front_to_enemy)
        # Keep the two centuries on a continuous battle line.
        desired_line_anchor = roman_center + right * u.line_offset
        # Advance the center only if still coherent and not over-running the neighbor.
        advance = norm(np.array(intent.objective) - roman_center)
        if np.linalg.norm(advance) < 0.2:
            advance = front_to_enemy
        desired_line_anchor += advance * 0.55

        # Gap closure using the actual neighbor edge gap.
        gap = self.roman_gap()
        if gap > intent.max_gap:
            # Pull the two units toward each other along the current line tangent.
            direction_to_center = norm(roman_center - u.anchor)
            desired_line_anchor += direction_to_center * min(2.5, gap - intent.max_gap)
            u.events["gap_closure"] += 1
            if u.events["gap_closure"] in {1, 20, 60}:
                u.log(self.t, f"closing line gap: observed_gap={gap:.2f}m, max={intent.max_gap:.2f}m")

        # Advance leash: if unit is much farther toward enemy than its mate, pause/slide instead of chasing.
        mates = [m for m in self.team_units(0) if m.uid != u.uid and np.any(self.alive[m.idx])]
        if mates:
            mate = mates[0]
            forward_axis = norm(true_enemy_com - roman_center)
            if np.linalg.norm(forward_axis) > 0:
                own_forward = float(np.dot(u.anchor - roman_center, forward_axis))
                mate_forward = float(np.dot(mate.anchor - roman_center, forward_axis))
                if own_forward - mate_forward > 2.8:
                    desired_line_anchor -= forward_axis * min(2.0, own_forward - mate_forward - 2.8)
                    u.events["advance_leash"] += 1
                    if u.events["advance_leash"] in {1, 20, 60}:
                        u.log(self.t, f"advance leashed to keep shoulders aligned; lead={own_forward-mate_forward:.2f}m")

        # Flank refusal: if enemies appear on the side/rear of a unit, pivot its front partially toward them
        # and stop lateral chase. This is the key behavior missing from unit-token games.
        side_threat_vec, side_threat_count = self.side_threat(u, radius=13.0)
        refusing_flank = side_threat_count >= 3
        if refusing_flank:
            # Be decisive: a flank unit should hinge/refuse, not merely blend the side threat
            # with the frontal enemy mass. It also steps back a little so the new front has room
            # to form instead of being hit while rotating. This is still local initiative, not
            # player micro.
            if u.line_offset > 0:
                desired_front = norm(0.15 * front_to_enemy + 1.35 * norm(side_threat_vec))
                desired_line_anchor -= advance * 0.95
                desired_line_anchor += norm(roman_center - u.anchor) * 0.45
            else:
                desired_front = norm(0.55 * front_to_enemy + 0.45 * norm(side_threat_vec))
                desired_line_anchor -= advance * 0.25
            u.events["flank_refusal"] += 1
            if u.events["flank_refusal"] in {1, 10, 40, 100}:
                u.log(self.t, f"refusing flank: side/rear threats={side_threat_count}")
        else:
            desired_front = front_to_enemy

        if np.linalg.norm(desired_front) > 0:
            turn_rate = 0.20 if refusing_flank else 0.10
            u.front = norm((1.0 - turn_rate) * u.front + turn_rate * desired_front)
        move = desired_line_anchor - u.anchor
        max_step_speed = (0.50 * intent.aggression * throttle) * (1.8 if refusing_flank else 1.0)
        if np.linalg.norm(move) > max_step_speed * self.dt:
            move = norm(move) * max_step_speed * self.dt
        u.anchor = u.anchor + move

    def _enemy_line_commander(self, u: Unit, throttle: float) -> None:
        romans = self.pos[self.alive & (self.team == 0)]
        if len(romans):
            target = romans.mean(axis=0)
        else:
            target = np.array(u.intent.objective)
        desired_front = norm(target - u.anchor)
        if np.linalg.norm(desired_front) > 0:
            u.front = norm(0.88 * u.front + 0.12 * desired_front)
        u.anchor = u.anchor + u.front * (0.46 * u.intent.aggression * throttle) * self.dt

    def _enemy_bait_commander(self, u: Unit, throttle: float) -> None:
        # The bait body approaches just enough to draw attention, then drifts right/back.
        romans = [r for r in self.team_units(0) if np.any(self.alive[r.idx])]
        if romans:
            right_roman = max(romans, key=lambda r: r.anchor[0])
            target = self.unit_center(right_roman)
        else:
            target = np.array(u.intent.objective)
        dist_to_romans = np.linalg.norm(target - u.anchor)
        if dist_to_romans < 13.0:
            # Skirmishers refuse close melee and pull the prey outward.
            desired = np.array((26.0, -8.0))
        else:
            desired = target + np.array((6.0, 2.0))
        desired_front = norm(target - u.anchor)
        if np.linalg.norm(desired_front) > 0:
            u.front = norm(0.85 * u.front + 0.15 * desired_front)
        move = desired - u.anchor
        if np.linalg.norm(move) > 0:
            u.anchor = u.anchor + norm(move) * (0.42 * u.intent.aggression * throttle) * self.dt

    def _enemy_flank_commander(self, u: Unit, throttle: float) -> None:
        romans = [r for r in self.team_units(0) if np.any(self.alive[r.idx])]
        if romans:
            right_roman = max(romans, key=lambda r: r.anchor[0])
            target = self.unit_center(right_roman) + np.array((1.5, -3.0))
        else:
            target = np.array(u.intent.objective)
        desired_front = norm(target - u.anchor)
        if np.linalg.norm(desired_front) > 0:
            u.front = norm(0.86 * u.front + 0.14 * desired_front)
        u.anchor = u.anchor + u.front * (0.66 * u.intent.aggression * throttle) * self.dt

    # ------------------------------------------------------------------
    # Soldier behavior
    # ------------------------------------------------------------------
    def update_soldiers(self) -> None:
        n = len(self.team)
        desired = np.zeros((n, 2), dtype=float)
        slot_error = np.zeros(n, dtype=float)
        unit_front = np.zeros((n, 2), dtype=float)
        policy_is_autonomous = np.zeros(n, dtype=bool)
        for u in self.units:
            slots = u.slot_positions()
            desired[u.idx] = slots
            unit_front[u.idx] = u.front
            if u.policy == "autonomous":
                policy_is_autonomous[u.idx] = True
            local_err = np.linalg.norm(self.pos[u.idx] - slots, axis=1)
            slot_error[u.idx] = local_err

        live = self.alive
        if not np.any(live):
            return

        # Pairwise local facts.
        diff = self.pos[:, None, :] - self.pos[None, :, :]
        d2 = np.sum(diff * diff, axis=2) + np.eye(n) * 1e9
        dist = np.sqrt(d2)
        friend = (self.team[:, None] == self.team[None, :]) & self.alive[:, None] & self.alive[None, :]
        enemy = (self.team[:, None] != self.team[None, :]) & self.alive[:, None] & self.alive[None, :]

        # Friendly separation prevents unreadable pileups.
        close_friend = friend & (dist < 0.78)
        sep = np.zeros((n, 2), dtype=float)
        if np.any(close_friend):
            sep_vec = diff / (dist[:, :, None] + EPS)
            strength = np.clip((0.78 - dist) / 0.78, 0, 1)[:, :, None]
            sep = np.sum(sep_vec * strength * close_friend[:, :, None], axis=1)

        # Nearest enemy and local support.
        enemy_d = np.where(enemy, dist, 1e9)
        nearest_enemy_idx = np.argmin(enemy_d, axis=1)
        nearest_enemy_dist = enemy_d[np.arange(n), nearest_enemy_idx]
        enemy_vec = np.zeros((n, 2), dtype=float)
        has_enemy = nearest_enemy_dist < 1e8
        enemy_vec[has_enemy] = self.pos[nearest_enemy_idx[has_enemy]] - self.pos[has_enemy]
        enemy_dir = np.zeros((n, 2), dtype=float)
        enemy_dir[has_enemy] = enemy_vec[has_enemy] / (nearest_enemy_dist[has_enemy, None] + EPS)
        support_count = np.sum(friend & (dist < 2.15), axis=1)
        near_enemy_count = np.sum(enemy & (dist < 3.0), axis=1)

        # Slot discipline: trained troops stay in place; naive troops chase more.
        form_k = 0.82 + 0.85 * self.training + 0.40 * policy_is_autonomous.astype(float)
        # Broken troops ignore formation and run away from nearest enemy/own front.
        formation_force = (desired - self.pos) * form_k[:, None]
        chase_k = np.where(policy_is_autonomous, 0.22, 0.65) * (1.0 - 0.45 * self.training)
        # Engage only if enemy is close enough to be plausibly sensed/pressured.
        engage = enemy_dir * chase_k[:, None] * (nearest_enemy_dist[:, None] < 5.5)
        # In actual melee, close ranks press into contact.
        melee_press = enemy_dir * 0.40 * (nearest_enemy_dist[:, None] < 1.55)
        fear_back = -enemy_dir * (0.45 * self.fear[:, None]) * (nearest_enemy_dist[:, None] < 5.0)
        # Soldiers with high fear and poor support back up even before routing.
        isolation = np.clip((3.0 - support_count) / 3.0, 0.0, 1.0)
        fear_back += -unit_front * (0.25 * self.fear[:, None] * isolation[:, None])

        acc = formation_force + 0.95 * sep + engage + melee_press + fear_back
        # Broken troops run toward their rear away from enemies.
        broken_live = self.broken & self.alive
        if np.any(broken_live):
            acc[broken_live] = -1.8 * unit_front[broken_live] - 1.2 * enemy_dir[broken_live] + 0.3 * sep[broken_live]

        # Clamp speed. Fatigue and wounds slow movement.
        base_speed = np.where(self.team == 0, 1.35, 1.45)
        speed_cap = base_speed * (1.0 - 0.52 * self.fatigue) * (0.55 + 0.45 * self.hp)
        speed_cap = np.clip(speed_cap, 0.15, 1.55)
        raw_speed = np.linalg.norm(acc, axis=1)
        vel = np.zeros_like(acc)
        moving = raw_speed > EPS
        vel[moving] = acc[moving] / raw_speed[moving, None] * np.minimum(raw_speed[moving], speed_cap[moving])[:, None]
        vel[~self.alive] = 0.0
        self.vel = 0.65 * self.vel + 0.35 * vel
        self.pos[self.alive] += self.vel[self.alive] * self.dt

        # Fatigue rises with movement and melee pressure; recovers if idle and not in contact.
        speed_actual = np.linalg.norm(self.vel, axis=1)
        melee_pressure = (nearest_enemy_dist < 1.65).astype(float)
        self.fatigue += self.dt * (0.010 * speed_actual + 0.018 * melee_pressure - 0.006 * (speed_actual < 0.15))
        self.fatigue = np.clip(self.fatigue, 0.0, 1.0)

        # Fear dynamics.
        flank = self.flank_exposure_per_soldier(unit_front, radius=4.8)
        casualty_pressure = np.zeros(n, dtype=float)
        for u in self.units:
            dead_ratio = 1.0 - np.mean(self.alive[u.idx])
            casualty_pressure[u.idx] = dead_ratio
        formed = ((slot_error < 1.25) & (support_count >= 3) & (~self.broken)).astype(float)
        self.fear += self.dt * (
            0.010 * near_enemy_count
            + 0.115 * casualty_pressure
            + 0.028 * flank
            + 0.020 * isolation
            + 0.010 * (1.0 - self.hp)
            - 0.018 * support_count
            - 0.030 * self.training
            - 0.015 * self.courage
            - 0.030 * formed * self.training
        )
        self.fear = np.clip(self.fear, 0.0, 1.0)

        # Routing threshold is individual but strongly affected by local support and being physically in formation.
        morale = (
            self.courage
            + 0.34 * self.training
            + 0.10 * np.clip(support_count / 6.0, 0, 1)
            + 0.16 * formed * self.training
            - 0.70 * self.fear
            - 0.32 * self.fatigue
            - 0.45 * (1.0 - self.hp)
            - 0.60 * casualty_pressure
        )
        rout_roll = self.rng.random(n)
        new_broken = self.alive & (~self.broken) & (morale < 0.12) & (rout_roll < 0.06)
        self.broken |= new_broken
        # Very limited rally: trained men who broke but are back among friends and not under immediate pressure
        # can rejoin, which prevents one bad random tick from permanently removing a cohesive rear rank.
        rally = self.alive & self.broken & (self.fear < 0.28) & (support_count >= 5) & (near_enemy_count == 0) & (self.rng.random(n) < 0.015)
        self.broken[rally] = False

    # ------------------------------------------------------------------
    # Combat
    # ------------------------------------------------------------------
    def resolve_melee(self) -> None:
        n = len(self.team)
        live = self.alive
        if np.sum(live) < 2:
            return
        diff = self.pos[:, None, :] - self.pos[None, :, :]
        d2 = np.sum(diff * diff, axis=2) + np.eye(n) * 1e9
        dist = np.sqrt(d2)
        enemy = (self.team[:, None] != self.team[None, :]) & live[:, None] & live[None, :]
        pairs = np.argwhere(enemy & (dist < 1.20))
        if len(pairs) == 0:
            return
        # Avoid processing both i,j and j,i as separate pair contacts? We actually allow both to strike,
        # but sample each directed attack separately. Cap per-soldier attacks to reduce blender effects.
        self.rng.shuffle(pairs)
        attacks_used = np.zeros(n, dtype=int)
        damage = np.zeros(n, dtype=float)
        unit_front = np.zeros((n, 2), dtype=float)
        for u in self.units:
            unit_front[u.idx] = u.front
        # Friendly support near the attacker/defender.
        friend = (self.team[:, None] == self.team[None, :]) & live[:, None] & live[None, :]
        support = np.sum(friend & (dist < 2.2), axis=1)
        for i, j in pairs:
            if attacks_used[i] >= 2 or not self.alive[i] or not self.alive[j]:
                continue
            attacks_used[i] += 1
            # Attacker position relative to defender's facing: in front => defender shield helps;
            # side/rear => flank multiplier.
            v_def_to_att = norm(self.pos[i] - self.pos[j])
            front_dot = float(np.dot(v_def_to_att, unit_front[j]))
            flank_multiplier = 1.0
            if front_dot < -0.25:
                flank_multiplier = 1.85  # rear
            elif front_dot < 0.35:
                flank_multiplier = 1.35  # side
            defender_formed = (not self.broken[j]) and (self.fear[j] < 0.65)
            shield_bonus = 1.0 + (0.45 * defender_formed * max(front_dot, 0.0))
            attack_quality = self.skill[i] * (1.0 - 0.45 * self.fatigue[i]) * (1.0 - 0.30 * self.fear[i]) * (1.0 + 0.05 * min(support[i], 8))
            defense_quality = (0.50 + 0.55 * self.training[j]) * (1.0 - 0.35 * self.fatigue[j]) * shield_bonus * (0.70 + 0.30 * self.hp[j])
            p = self.dt * 0.070 * (attack_quality / (defense_quality + EPS)) * flank_multiplier
            if self.broken[j]:
                p *= 1.65
            if self.rng.random() < p:
                damage[j] += self.rng.uniform(0.18, 0.42) * (0.75 + 0.55 * self.skill[i]) * flank_multiplier
                # Close violence frightens both sides, but the receiver more.
                self.fear[j] = min(1.0, self.fear[j] + 0.05 * flank_multiplier)
                self.fear[i] = min(1.0, self.fear[i] + 0.012)
        self.hp -= damage
        died = self.hp <= 0.0
        self.alive[died] = False
        self.broken[died] = False
        self.vel[died] = 0.0

    # ------------------------------------------------------------------
    # Metrics
    # ------------------------------------------------------------------
    def roman_gap(self) -> float:
        roman = [u for u in self.team_units(0) if np.any(self.alive[u.idx])]
        if len(roman) < 2:
            return 99.0
        # Sort by actual x center; compute horizontal gap between alive bodies.
        roman = sorted(roman, key=lambda u: self.unit_center(u)[0])
        left_p = self.unit_alive_pos(roman[0])
        right_p = self.unit_alive_pos(roman[1])
        if len(left_p) == 0 or len(right_p) == 0:
            return 99.0
        return float(np.min(right_p[:, 0]) - np.max(left_p[:, 0]))

    def flank_exposure_per_soldier(self, unit_front: np.ndarray, radius: float = 5.0) -> np.ndarray:
        n = len(self.team)
        live = self.alive
        out = np.zeros(n, dtype=float)
        if np.sum(live) < 2:
            return out
        diff = self.pos[None, :, :] - self.pos[:, None, :]  # i -> j
        d2 = np.sum(diff * diff, axis=2) + np.eye(n) * 1e9
        dist = np.sqrt(d2)
        enemy = (self.team[:, None] != self.team[None, :]) & live[:, None] & live[None, :]
        dirs = diff / (dist[:, :, None] + EPS)
        dots = np.sum(dirs * unit_front[:, None, :], axis=2)
        flank = enemy & (dist < radius) & (dots < 0.25)
        out = np.sum(flank, axis=1).astype(float)
        return out

    def side_threat(self, u: Unit, radius: float = 12.0) -> Tuple[np.ndarray, int]:
        own_alive = u.idx[self.alive[u.idx]]
        enemies = np.where(self.alive & (self.team != u.team))[0]
        if len(own_alive) == 0 or len(enemies) == 0:
            return np.zeros(2), 0
        center = self.unit_center(u)
        vecs = self.pos[enemies] - center[None, :]
        ds = np.linalg.norm(vecs, axis=1)
        dirs = vecs / (ds[:, None] + EPS)
        # Side/rear relative to unit facing.
        dots = dirs @ u.front
        mask = (ds < radius) & (dots < 0.35)
        if not np.any(mask):
            return np.zeros(2), 0
        threat_vec = np.sum(vecs[mask] / (ds[mask, None] + 1.0), axis=0)
        return threat_vec, int(np.sum(mask))

    def record_metrics(self) -> None:
        unit_front = np.zeros((len(self.team), 2), dtype=float)
        for u in self.units:
            unit_front[u.idx] = u.front
        flank = self.flank_exposure_per_soldier(unit_front, radius=5.0)
        roman_alive = self.alive & (self.team == 0)
        enemy_alive = self.alive & (self.team == 1)
        roman_broken = self.broken & (self.team == 0) & self.alive
        enemy_broken = self.broken & (self.team == 1) & self.alive
        slot_errors = []
        for u in self.team_units(0):
            if np.any(self.alive[u.idx]):
                slots = u.slot_positions()
                m = self.alive[u.idx]
                slot_errors.extend(np.linalg.norm(self.pos[u.idx[m]] - slots[m], axis=1).tolist())
        mean_slot = float(np.mean(slot_errors)) if slot_errors else 0.0
        max_slot = float(np.max(slot_errors)) if slot_errors else 0.0
        self.metrics.append({
            "t": self.t,
            "policy": self.roman_policy,
            "seed": self.seed,
            "roman_alive": float(np.sum(roman_alive)),
            "enemy_alive": float(np.sum(enemy_alive)),
            "roman_dead": float(np.sum((self.team == 0) & (~self.alive))),
            "enemy_dead": float(np.sum((self.team == 1) & (~self.alive))),
            "roman_broken": float(np.sum(roman_broken)),
            "enemy_broken": float(np.sum(enemy_broken)),
            "roman_mean_slot_error": mean_slot,
            "roman_max_slot_error": max_slot,
            "roman_gap": self.roman_gap(),
            "roman_flank_exposure": float(np.mean(flank[roman_alive])) if np.any(roman_alive) else 0.0,
            "roman_mean_fear": float(np.mean(self.fear[roman_alive])) if np.any(roman_alive) else 1.0,
            "roman_mean_fatigue": float(np.mean(self.fatigue[roman_alive])) if np.any(roman_alive) else 1.0,
            "flank_refusals": float(sum(u.events["flank_refusal"] for u in self.team_units(0))),
            "gap_closures": float(sum(u.events["gap_closure"] for u in self.team_units(0))),
            "advance_leashes": float(sum(u.events["advance_leash"] for u in self.team_units(0))),
        })

    def save_snapshot(self, step: int) -> None:
        self.snapshots[step] = {
            "pos": self.pos.copy(),
            "alive": self.alive.copy(),
            "broken": self.broken.copy(),
            "team": self.team.copy(),
            "unit_id": self.unit_id.copy(),
            "hp": self.hp.copy(),
            "fear": self.fear.copy(),
            "unit_anchors": np.array([u.anchor.copy() for u in self.units]),
            "unit_fronts": np.array([u.front.copy() for u in self.units]),
            "unit_names": np.array([u.name for u in self.units]),
        }

    # ------------------------------------------------------------------
    # Run loop
    # ------------------------------------------------------------------
    def step(self, k: int) -> None:
        self.t = k * self.dt
        self.update_commanders()
        self.update_soldiers()
        self.resolve_melee()
        self.record_metrics()
        if k in {0, int(self.steps * 0.25), int(self.steps * 0.5), int(self.steps * 0.75), self.steps - 1}:
            self.save_snapshot(k)

    def run(self) -> Tuple[List[Dict[str, float]], Dict[int, Dict[str, np.ndarray]], List[str]]:
        for k in range(self.steps):
            self.step(k)
        self.debug_lines = []
        for u in self.units:
            self.debug_lines.extend(u.debug)
        return self.metrics, self.snapshots, self.debug_lines


# ----------------------------------------------------------------------
# Experiment helpers
# ----------------------------------------------------------------------

def run_experiment(seeds: List[int], steps: int, dt: float) -> Tuple[List[Dict[str, float]], Dict[str, BattleSim]]:
    all_metrics: List[Dict[str, float]] = []
    reps: Dict[str, BattleSim] = {}
    for policy in ["naive", "autonomous"]:
        for seed in seeds:
            sim = BattleSim(policy, seed=seed, dt=dt, steps=steps)
            metrics, snapshots, debug = sim.run()
            all_metrics.extend(metrics)
            if seed == seeds[0]:
                reps[policy] = sim
    return all_metrics, reps


def summarize(all_metrics: List[Dict[str, float]]) -> List[Dict[str, float]]:
    # Last record per policy/seed.
    latest: Dict[Tuple[str, int], Dict[str, float]] = {}
    for row in all_metrics:
        latest[(str(row["policy"]), int(row["seed"]))] = row
    # Aggregate.
    result = []
    for policy in ["naive", "autonomous"]:
        rows = [r for (p, _), r in latest.items() if p == policy]
        if not rows:
            continue
        keys = [
            "roman_dead", "enemy_dead", "roman_broken", "enemy_broken",
            "roman_mean_slot_error", "roman_max_slot_error", "roman_gap", "roman_flank_exposure",
            "roman_mean_fear", "roman_mean_fatigue", "flank_refusals", "gap_closures", "advance_leashes",
        ]
        out = {"policy": policy, "trials": len(rows)}
        for key in keys:
            vals = np.array([r[key] for r in rows], dtype=float)
            out[f"{key}_mean"] = float(np.mean(vals))
            out[f"{key}_sd"] = float(np.std(vals, ddof=1)) if len(vals) > 1 else 0.0
        result.append(out)
    return result


def write_csv(path: Path, rows: List[Dict[str, float]]) -> None:
    if not rows:
        return
    with path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def write_summary_csv(path: Path, rows: List[Dict[str, float]]) -> None:
    if not rows:
        return
    keys = sorted(set(k for r in rows for k in r.keys()))
    keys.remove("policy")
    keys = ["policy"] + keys
    with path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        writer.writerows(rows)


def plot_metrics(all_metrics: List[Dict[str, float]], out_path: Path) -> None:
    # Plot representative mean over seeds for four measures. Use separate figures as requested by chart guidelines.
    # Here we create a single combined debug dashboard image for convenience, not using seaborn/styles.
    import pandas as pd
    df = pd.DataFrame(all_metrics)
    grouped = df.groupby(["policy", "t"], as_index=False).agg({
        "roman_dead": "mean",
        "enemy_dead": "mean",
        "roman_gap": "mean",
        "roman_flank_exposure": "mean",
        "roman_mean_slot_error": "mean",
        "roman_broken": "mean",
    })
    fig, axes = plt.subplots(3, 1, figsize=(9, 10), sharex=True)
    for policy in ["naive", "autonomous"]:
        g = grouped[grouped["policy"] == policy]
        axes[0].plot(g["t"], g["roman_gap"], label=f"{policy} gap")
        axes[1].plot(g["t"], g["roman_flank_exposure"], label=f"{policy} flank exposure")
        axes[2].plot(g["t"], g["roman_dead"], label=f"{policy} Roman dead")
        axes[2].plot(g["t"], g["enemy_dead"], linestyle="--", label=f"{policy} enemy dead")
    axes[0].axhline(2.8, linestyle=":", linewidth=1, label="autonomous max-gap intent")
    axes[0].set_ylabel("Roman unit gap (m)")
    axes[1].set_ylabel("Side/rear enemies per Roman")
    axes[2].set_ylabel("Dead")
    axes[2].set_xlabel("Time (s)")
    for ax in axes:
        ax.grid(True, alpha=0.3)
        ax.legend(loc="best", fontsize=8)
    fig.suptitle("Per-human battle ABM: naive attack vs autonomous line-aware intent")
    fig.tight_layout()
    fig.savefig(out_path, dpi=170)
    plt.close(fig)


def plot_snapshot(sim: BattleSim, out_path: Path) -> None:
    # Show snapshots at five times in a single figure for spatial debug.
    steps_sorted = sorted(sim.snapshots.keys())
    fig, axes = plt.subplots(1, len(steps_sorted), figsize=(4.2 * len(steps_sorted), 4.4), sharex=True, sharey=True)
    if len(steps_sorted) == 1:
        axes = [axes]
    for ax, step in zip(axes, steps_sorted):
        snap = sim.snapshots[step]
        pos = snap["pos"]
        alive = snap["alive"]
        broken = snap["broken"]
        team = snap["team"]
        # Alive Romans, alive enemy, broken, dead.
        dead = ~alive
        ax.scatter(pos[(team == 0) & alive & (~broken), 0], pos[(team == 0) & alive & (~broken), 1], s=12, marker="o", label="Romans" if step == steps_sorted[0] else None)
        ax.scatter(pos[(team == 1) & alive & (~broken), 0], pos[(team == 1) & alive & (~broken), 1], s=12, marker="x", label="Enemy" if step == steps_sorted[0] else None)
        ax.scatter(pos[alive & broken, 0], pos[alive & broken, 1], s=16, marker="^", label="Routing" if step == steps_sorted[0] else None)
        ax.scatter(pos[dead, 0], pos[dead, 1], s=8, marker=".", alpha=0.4, label="Dead" if step == steps_sorted[0] else None)
        # Command anchors and fronts.
        anchors = snap["unit_anchors"]
        fronts = snap["unit_fronts"]
        ax.quiver(anchors[:, 0], anchors[:, 1], fronts[:, 0], fronts[:, 1], angles="xy", scale_units="xy", scale=0.28, width=0.006)
        ax.set_title(f"{sim.roman_policy} t={step*sim.dt:.0f}s")
        ax.set_xlim(-16, 36)
        ax.set_ylim(-24, 12)
        ax.grid(True, alpha=0.25)
        ax.set_aspect("equal", adjustable="box")
    axes[0].legend(loc="lower left", fontsize=8)
    fig.tight_layout()
    fig.savefig(out_path, dpi=170)
    plt.close(fig)


def write_debug(path: Path, reps: Dict[str, BattleSim], summary_rows: List[Dict[str, float]]) -> None:
    with path.open("w") as f:
        f.write("Per-human Roman battle ABM debug report\n")
        f.write("=" * 48 + "\n\n")
        f.write("Scenario: two Roman centuries receive high-level attack intent against a main enemy body,\n")
        f.write("while an enemy bait detachment pulls rightward and a flanking detachment attacks the Roman right/rear.\n\n")
        f.write("Aggregate final summary over stochastic trials:\n")
        for row in summary_rows:
            f.write(json.dumps(row, indent=2) + "\n")
        f.write("\nRepresentative commander event logs:\n")
        for policy, sim in reps.items():
            f.write(f"\n--- {policy.upper()} seed={sim.seed} ---\n")
            lines = []
            for u in sim.units:
                lines.extend(u.debug)
            for line in lines[:140]:
                f.write(line + "\n")
            final = sim.metrics[-1]
            f.write("Final metrics: " + json.dumps(final, indent=2) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--outdir", default="/mnt/data", help="Output directory")
    parser.add_argument("--trials", type=int, default=12, help="Number of random seeds per policy")
    parser.add_argument("--steps", type=int, default=640, help="Simulation steps")
    parser.add_argument("--dt", type=float, default=0.25, help="Seconds per step")
    args = parser.parse_args()

    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    seeds = list(range(10, 10 + args.trials))
    all_metrics, reps = run_experiment(seeds, steps=args.steps, dt=args.dt)
    summary_rows = summarize(all_metrics)

    write_csv(outdir / "battle_abm_timeseries.csv", all_metrics)
    write_summary_csv(outdir / "battle_abm_summary.csv", summary_rows)
    plot_metrics(all_metrics, outdir / "battle_abm_metrics.png")
    for policy, sim in reps.items():
        plot_snapshot(sim, outdir / f"battle_abm_{policy}_snapshots.png")
    write_debug(outdir / "battle_abm_debug.txt", reps, summary_rows)

    print("Wrote:")
    for p in [
        outdir / "battle_abm_timeseries.csv",
        outdir / "battle_abm_summary.csv",
        outdir / "battle_abm_metrics.png",
        outdir / "battle_abm_naive_snapshots.png",
        outdir / "battle_abm_autonomous_snapshots.png",
        outdir / "battle_abm_debug.txt",
    ]:
        print(f"  {p}")
    print("\nSummary:")
    for row in summary_rows:
        print(json.dumps(row, indent=2))


if __name__ == "__main__":
    main()
