#!/usr/bin/env python3
"""
Telemetry diagnosis for v8 on-post turning oscillation.
Reimplements the critical FSM + facing + residual-desire loop from the HTML sim.
No rendering — pure decision telemetry.
"""
from __future__ import annotations
import math, random, json, csv
from pathlib import Path
from dataclasses import dataclass, field
from collections import Counter, defaultdict

# --- constants mirrored from v8 ---
SPACING = 1.55
ARRIVE = 0.30 * SPACING
LOCK = 0.36 * SPACING
MOVE_COMMIT = 0.42
MOVE_COMMIT_LOCKED = MOVE_COMMIT * 1.85
HOLD_EXIT = 0.55
FACE_ALIGN = math.radians(12)
MOVE_ALIGN = math.radians(20)
TURN_SNAP = 1.1
SETTLE_HOLD = 0.55
TURN_STAND = 3.2
FACING = 0.0  # unit faces +Z

def angdiff(a, b):
    return math.atan2(math.sin(a - b), math.cos(a - b))

def clamp(x, a, b):
    return max(a, min(b, x))

@dataclass
class Soldier:
    id: int
    x: float
    z: float
    heading: float
    state: str = "forming_up"
    state_time: float = 0.0
    face_mode: str = "travel"
    need_move: bool = True
    travel_heading: float = 0.0
    solid: bool = False
    slot_locked: bool = False
    slot_dist: float = 9.0
    near_slot_time: float = 0.0
    vx: float = 0.0
    vz: float = 0.0
    # telemetry
    want_h: float = 0.0
    mag: float = 0.0
    plant: bool = False
    bond: bool = False
    reason: str = ""

def set_state(s: Soldier, st: str):
    if s.state != st:
        s.state = st
        s.state_time = 0.0

def update_fsm(s: Soldier, dx: float, dz: float, bond: bool, shape_q: float, dt: float, force_settle_enabled=True):
    mag = math.hypot(dx, dz)
    s.mag = mag
    s.bond = bond

    arrived_now = s.slot_dist < ARRIVE or s.slot_locked
    if arrived_now and math.hypot(s.vx, s.vz) < 0.55:
        s.near_slot_time += dt
    else:
        s.near_slot_time = max(0.0, s.near_slot_time - dt * 0.5)

    force_settle = force_settle_enabled and s.near_slot_time >= SETTLE_HOLD and shape_q >= 0.40
    commit = MOVE_COMMIT_LOCKED if (s.slot_locked or force_settle) else MOVE_COMMIT

    if mag >= commit and not force_settle:
        s.travel_heading = math.atan2(dx, dz)
        s.need_move = True
    else:
        s.need_move = False

    if s.solid:
        if mag > 0.95 * 1.35 or s.slot_dist > SPACING * 1.4:
            s.solid = False
            s.near_slot_time = 0.0
    elif (bond or force_settle) and mag < HOLD_EXIT * 1.2:
        s.solid = True

    head_form = abs(angdiff(FACING, s.heading))
    head_travel = abs(angdiff(s.travel_heading, s.heading))
    face_enter = FACE_ALIGN * 1.25
    face_exit = FACE_ALIGN * 0.65

    plant = force_settle or (not s.need_move and bond) or (s.solid and (bond or force_settle))
    s.plant = plant

    if plant:
        s.face_mode = "unit"
        s.need_move = False
        if s.slot_dist < LOCK:
            s.slot_locked = True
        should_turn = (head_form > face_exit) if s.state == "turning" else (head_form > face_enter)
        if should_turn:
            set_state(s, "turning")
            s.reason = "plant_dress_turn"
        else:
            set_state(s, "holding")
            s.solid = True
            s.reason = "plant_hold"
        if s.state == "turning" and s.state_time > TURN_SNAP:
            s.heading = FACING
            set_state(s, "holding")
            s.solid = True
            s.reason = "plant_snap"
        return

    # contested kick
    if s.state == "turning" and s.slot_dist < SPACING * 0.7 and s.state_time > TURN_SNAP:
        set_state(s, "forming_up")
        s.face_mode = "travel"
        s.need_move = True
        s.reason = "kick_forming_from_turn"
        return

    if not bond and mag < commit and s.slot_dist > SPACING * 1.20 * 0.85:
        s.need_move = True
        if mag > 0.02:
            s.travel_heading = math.atan2(dx, dz)

    s.face_mode = "travel"
    if s.state in ("holding", "milling"):
        next_st = "turning" if head_travel > MOVE_ALIGN else ("adjusting" if mag < 0.90 else "forming_up")
    elif s.state == "turning":
        if head_travel <= MOVE_ALIGN:
            next_st = "adjusting" if mag < 0.90 else "forming_up"
        else:
            next_st = "turning"
        if s.state_time > 1.8:
            next_st = "forming_up"
    elif s.state == "forming_up":
        if mag < MOVE_COMMIT:
            s.need_move = False
            s.face_mode = "unit"
            next_st = "turning" if head_form > FACE_ALIGN else "holding"
        elif head_travel > MOVE_ALIGN * 1.35:
            next_st = "turning"
        elif mag < 0.90:
            next_st = "adjusting"
        else:
            next_st = "forming_up"
    else:
        next_st = s.state

    if next_st != s.state and s.state_time < 0.10:
        next_st = s.state
    set_state(s, next_st)
    s.reason = f"travel_path:{next_st}"

def loco_heading(s: Soldier, dt: float):
    want = s.travel_heading if (s.face_mode == "travel" and s.need_move) else FACING
    s.want_h = want
    turn_rate = TURN_STAND * 1.15 if s.state == "turning" else TURN_STAND
    err = angdiff(want, s.heading)
    s.heading += clamp(err, -turn_rate * dt, turn_rate * dt)
    s.state_time += dt

def residual_desire(s: Soldier, t: float, neighbors: list[Soldier], noise_amp=0.15, sep_amp=2.5):
    """Synthetic residual forces like near-post separation + micro slot pull + noise."""
    mx, mz = s.slot_x - s.x, s.slot_z - s.z
    dist = math.hypot(mx, mz)
    s.slot_dist = dist
    # strong near-post pull so mag can stay above commit when not deadzoned
    pull = 1.4 if dist > ARRIVE else 0.9
    dx = mx * pull
    dz = mz * pull
    for o in neighbors:
        if o.id == s.id:
            continue
        ox, oz = s.x - o.x, s.z - o.z
        d = math.hypot(ox, oz)
        if 1e-4 < d < 2.0:
            stren = ((2.0 - d) / 2.0) ** 2 * sep_amp
            dx += ox / d * stren
            dz += oz / d * stren
    # flipping residual (separation + frame noise) — candidate cause of travelHeading thrash
    dx += noise_amp * math.sin(t * 11.0 + s.id * 1.7)
    dz += noise_amp * math.cos(t * 9.0 + s.id * 2.1)
    # occasional large lateral flip
    if int(t * 3 + s.id) % 7 == 0:
        dx += noise_amp * 3.0 * (1 if (int(t * 5) + s.id) % 2 == 0 else -1)
    return dx, dz

def run(n=40, seconds=25.0, dt=1/30, seed=1, bond_mode="partial", force_settle_enabled=True, noise_amp=0.35):
    random.seed(seed)
    # square-ish slots
    side = math.ceil(math.sqrt(n))
    soldiers = []
    for i in range(n):
        c, r = i % side, i // side
        sx = (c - (side - 1) / 2) * SPACING
        sz = ((side - 1) / 2 - r) * SPACING
        # start near slot with random offset + random heading
        s = Soldier(
            id=i,
            x=sx + random.uniform(-0.8, 0.8),
            z=sz + random.uniform(-0.8, 0.8),
            heading=random.uniform(-math.pi, math.pi),
        )
        s.slot_x, s.slot_z = sx, sz
        s.slot_dist = math.hypot(s.x - sx, s.z - sz)
        soldiers.append(s)

    rows = []
    turn_hist = []
    t = 0.0
    steps = int(seconds / dt)
    # shape improves over time
    for step in range(steps):
        t = step * dt
        shape_q = min(0.95, 0.35 + t * 0.04)
        # bond: partial = some soldiers never get bondGood even on post (shape/role gates)
        for s in soldiers:
            dx, dz = residual_desire(s, t, soldiers, noise_amp=noise_amp)
            on_post = s.slot_dist < ARRIVE or s.slot_locked
            if bond_mode == "always":
                bond = on_post
            elif bond_mode == "never":
                bond = False
            else:  # partial — 25% chronically fail bond even on post (score gates)
                bond = on_post and shape_q >= 0.48 and (s.id % 4 != 0)
            update_fsm(s, dx, dz, bond, shape_q, dt, force_settle_enabled=force_settle_enabled)
            loco_heading(s, dt)
            # crude position integration toward slot if need_move
            if s.need_move and s.state in ("forming_up", "adjusting"):
                sp = 1.0
                s.vx = math.sin(s.heading) * sp * 0.5
                s.vz = math.cos(s.heading) * sp * 0.5
            else:
                s.vx *= 0.85
                s.vz *= 0.85
            s.x += s.vx * dt
            s.z += s.vz * dt

        n_turn = sum(1 for s in soldiers if s.state == "turning")
        n_hold = sum(1 for s in soldiers if s.state == "holding")
        n_on = sum(1 for s in soldiers if s.slot_dist < ARRIVE)
        n_plant = sum(1 for s in soldiers if s.plant)
        n_travel_turn = sum(
            1 for s in soldiers
            if s.state == "turning" and s.face_mode == "travel"
        )
        n_unit_turn = sum(
            1 for s in soldiers
            if s.state == "turning" and s.face_mode == "unit"
        )
        turn_hist.append({
            "t": round(t, 3),
            "n_turn": n_turn,
            "n_hold": n_hold,
            "n_on_post": n_on,
            "n_plant": n_plant,
            "n_travel_turn": n_travel_turn,
            "n_unit_turn": n_unit_turn,
        })

        # detailed log every 0.5s for chronic turners
        if step % 15 == 0:
            for s in soldiers:
                if s.state == "turning" or (s.slot_dist < ARRIVE and s.state != "holding"):
                    want = s.travel_heading if (s.face_mode == "travel" and s.need_move) else FACING
                    rows.append({
                        "t": round(t, 3),
                        "id": s.id,
                        "state": s.state,
                        "state_time": round(s.state_time, 3),
                        "face_mode": s.face_mode,
                        "need_move": int(s.need_move),
                        "plant": int(s.plant),
                        "bond": int(s.bond),
                        "solid": int(s.solid),
                        "slot_dist": round(s.slot_dist, 3),
                        "slot_locked": int(s.slot_locked),
                        "mag": round(s.mag, 3),
                        "heading_deg": round(math.degrees(s.heading) % 360, 1),
                        "want_deg": round(math.degrees(want) % 360, 1),
                        "travel_deg": round(math.degrees(s.travel_heading) % 360, 1),
                        "unit_err_deg": round(math.degrees(abs(angdiff(FACING, s.heading))), 1),
                        "travel_err_deg": round(math.degrees(abs(angdiff(s.travel_heading, s.heading))), 1),
                        "reason": s.reason,
                    })

    out = Path(__file__).parent / "telemetry_turn_out"
    out.mkdir(exist_ok=True)
    detail = out / f"detail_{bond_mode}.csv"
    summary = out / f"summary_{bond_mode}.csv"
    with detail.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()) if rows else ["t"])
        w.writeheader()
        w.writerows(rows)
    with summary.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(turn_hist[0].keys()))
        w.writeheader()
        w.writerows(turn_hist)

    # analyze chronic turners in last 5s
    late = [r for r in rows if r["t"] >= seconds - 5]
    by_id = defaultdict(list)
    for r in late:
        if r["state"] == "turning":
            by_id[r["id"]].append(r)

    print(f"\n=== bond_mode={bond_mode} ===")
    print(f"detail log: {detail}")
    print(f"summary log: {summary}")
    # final second averages
    last = [h for h in turn_hist if h["t"] >= seconds - 2]
    avg_turn = sum(h["n_turn"] for h in last) / max(1, len(last))
    avg_travel_turn = sum(h["n_travel_turn"] for h in last) / max(1, len(last))
    avg_unit_turn = sum(h["n_unit_turn"] for h in last) / max(1, len(last))
    avg_on = sum(h["n_on_post"] for h in last) / max(1, len(last))
    avg_plant = sum(h["n_plant"] for h in last) / max(1, len(last))
    print(f"last 2s avg: turners={avg_turn:.1f} travel_turn={avg_travel_turn:.1f} unit_turn={avg_unit_turn:.1f} on_post={avg_on:.1f} plant={avg_plant:.1f}")

    chronic = sorted(by_id.items(), key=lambda kv: -len(kv[1]))[:8]
    print("chronic turners (last 5s samples):")
    for sid, samples in chronic:
        reasons = Counter(s["reason"] for s in samples)
        face = Counter(s["face_mode"] for s in samples)
        need = sum(s["need_move"] for s in samples) / len(samples)
        plant = sum(s["plant"] for s in samples) / len(samples)
        bond = sum(s["bond"] for s in samples) / len(samples)
        avg_dist = sum(s["slot_dist"] for s in samples) / len(samples)
        # heading swing
        heads = [s["heading_deg"] for s in samples]
        swing = max(heads) - min(heads) if heads else 0
        # travel heading swing
        trav = [s["travel_deg"] for s in samples]
        tswing = max(trav) - min(trav) if trav else 0
        print(f"  id={sid} n={len(samples)} dist={avg_dist:.2f} plant%={plant:.0%} bond%={bond:.0%} need_move%={need:.0%} face={dict(face)} reasons={dict(reasons)} head_swing={swing:.0f}deg travel_swing={tswing:.0f}deg")

    return {
        "bond_mode": bond_mode,
        "avg_turn": avg_turn,
        "avg_travel_turn": avg_travel_turn,
        "avg_unit_turn": avg_unit_turn,
        "avg_on_post": avg_on,
        "avg_plant": avg_plant,
    }

if __name__ == "__main__":
    results = []
    configs = [
        ("always", True, 0.35),
        ("partial", True, 0.35),
        ("partial", False, 0.55),  # no forceSettle safety net — exposes plant miss
        ("never", False, 0.55),
        ("partial", False, 1.2),   # high residual mag (above commit even near)
    ]
    for mode, fs, noise in configs:
        print(f"\n######## mode={mode} force_settle={fs} noise={noise}")
        r = run(bond_mode=mode, force_settle_enabled=fs, noise_amp=noise)
        r["force_settle"] = fs
        r["noise"] = noise
        results.append(r)
    Path(__file__).parent.joinpath("telemetry_turn_out", "compare.json").write_text(
        json.dumps(results, indent=2), encoding="utf-8"
    )
    print("\nWrote compare.json")
