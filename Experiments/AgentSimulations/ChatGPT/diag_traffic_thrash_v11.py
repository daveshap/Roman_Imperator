#!/usr/bin/env python3
"""
Headless traffic thrash diagnostic for ABM drill standards.
Mirrors the FAR-FROM-SEAT forces in v10/v11 (not full PF/musical chairs):
  - goal pull (planGain * linePressure)
  - personalSpace sep
  - travelBubble + travelSepGain + closerPriority + right-hand peel
  - hard body push
  - heading-gated run (moveAlign / face gate style)
  - jam divert when slow while far

Hypothesis: parade vs combat thrash FAR from seats is dominated by
travelBubble/travelSepGain/separation/speed, NOT arrive/lock tolerances.
"""
from __future__ import annotations
import math, random, statistics
from dataclasses import dataclass, field
from typing import List, Dict, Any

DRILLS = {
    "combat": dict(
        linePressure=8.5, separation=2.6, personalSpace=1.15,
        planGain=0.42,
        travelBubble=1.55, travelSepGain=1.6, jamTime=0.45, jamSteer=3.2,
        jamSpeedFrac=0.38,
        forwardRun=4.2, forwardWalk=1.35, forwardShuffle=0.7,
        accelWalk=5.8, accelRun=4.0, brakeRun=3.2,
        moveAlignDeg=28, faceGate=0.28,
        yieldPeel=2.4, closerRatio=0.88,
        bodyR=0.48, spacing=1.55,
    ),
    "practice": dict(
        linePressure=7.5, separation=3.5, personalSpace=1.40,
        planGain=0.38,
        travelBubble=2.20, travelSepGain=2.7, jamTime=0.55, jamSteer=2.5,
        jamSpeedFrac=0.38,
        forwardRun=3.4, forwardWalk=1.35, forwardShuffle=0.7,
        accelWalk=4.4, accelRun=3.0, brakeRun=3.2,
        moveAlignDeg=15, faceGate=0.28,
        yieldPeel=2.4, closerRatio=0.88,
        bodyR=0.48, spacing=1.55,
    ),
    "parade": dict(
        linePressure=9.0, separation=3.9, personalSpace=1.50,
        planGain=0.48,
        travelBubble=2.40, travelSepGain=3.0, jamTime=0.50, jamSteer=2.2,
        jamSpeedFrac=0.38,
        forwardRun=2.8, forwardWalk=1.35, forwardShuffle=0.7,
        accelWalk=3.6, accelRun=2.4, brakeRun=3.8,
        moveAlignDeg=10, faceGate=0.28,
        yieldPeel=2.4, closerRatio=0.88,
        bodyR=0.48, spacing=1.55,
    ),
}

# Ablations: parade tolerances (arrive/lock irrelevant here — we keep seats far)
# but swap traffic pack to combat
ABLATIONS = {
    "parade_combat_traffic": dict(
        **{**DRILLS["parade"], **{
            "travelBubble": 1.55, "travelSepGain": 1.6, "separation": 2.6,
            "personalSpace": 1.15, "forwardRun": 4.2, "accelWalk": 5.8,
            "accelRun": 4.0, "moveAlignDeg": 28,
        }}
    ),
    "combat_parade_traffic": dict(
        **{**DRILLS["combat"], **{
            "travelBubble": 2.40, "travelSepGain": 3.0, "separation": 3.9,
            "personalSpace": 1.50, "forwardRun": 2.8, "accelWalk": 3.6,
            "accelRun": 2.4, "moveAlignDeg": 10,
        }}
    ),
    "parade_no_bubble": dict(
        **{**DRILLS["parade"], **{"travelBubble": 0.96, "travelSepGain": 0.0}}
    ),
    "parade_combat_bubble_only": dict(
        **{**DRILLS["parade"], **{"travelBubble": 1.55, "travelSepGain": 1.6}}
    ),
}


@dataclass
class Agent:
    id: int
    x: float
    z: float
    vx: float = 0.0
    vz: float = 0.0
    heading: float = 0.0
    tx: float = 0.0
    tz: float = 0.0
    jam_timer: float = 0.0
    jam_side: float = 1.0
    speed: float = 0.0
    # telemetry accumulators
    t_jammed: float = 0.0
    t_slow: float = 0.0
    t_turn_gate: float = 0.0
    heading_flips: int = 0
    last_travel: float = 0.0
    path_len: float = 0.0
    progress: float = 0.0  # reduction in slotDist


def clamp(x, a, b):
    return a if x < a else b if x > b else x


def angdiff(a, b):
    return math.atan2(math.sin(a - b), math.cos(a - b))


def dist(ax, az, bx, bz):
    return math.hypot(ax - bx, az - bz)


def make_slots(n: int, spacing: float, mode: str = "rect"):
    """Formation seats centered at origin, facing +Z."""
    if mode == "line":
        cols, rows = n, 1
    elif mode == "square":
        side = max(1, math.ceil(math.sqrt(n)))
        cols = rows = side
    else:
        aspect = 2.6
        cols = max(2, math.ceil(math.sqrt(n * aspect)))
        rows = max(1, math.ceil(n / cols))
    slots = []
    for r in range(rows):
        for c in range(cols):
            lat = (c - (cols - 1) * 0.5) * spacing
            dep = ((rows - 1) * 0.5 - r) * spacing
            # world: lat along X, dep along Z
            slots.append((lat, dep))
            if len(slots) >= n:
                return slots
    while len(slots) < n:
        slots.append(((len(slots) - (n - 1) * 0.5) * spacing, 0.0))
    return slots[:n]


def spawn_scattered(n: int, rng: random.Random, bound: float = 28.0):
    return [(rng.uniform(-bound, bound), rng.uniform(-bound, bound)) for _ in range(n)]


def run_sim(
    drill_name: str,
    params: Dict[str, Any],
    n: int,
    seconds: float = 18.0,
    dt: float = 1 / 30,
    seed: int = 1,
    form: str = "rect",
) -> Dict[str, Any]:
    rng = random.Random(seed)
    P = params
    slots = make_slots(n, P["spacing"], form)
    spawns = spawn_scattered(n, rng)
    agents: List[Agent] = []
    for i in range(n):
        x, z = spawns[i]
        tx, tz = slots[i]
        agents.append(
            Agent(
                id=i,
                x=x,
                z=z,
                heading=rng.uniform(-math.pi, math.pi),
                tx=tx,
                tz=tz,
                last_travel=math.atan2(tx - x, tz - z),
            )
        )

    steps = int(seconds / dt)
    body_min = P["bodyR"] * 2
    bubble = P["travelBubble"]
    sense = 18.0

    # running averages
    sum_speed = 0.0
    sum_jammed = 0.0
    sum_cross = 0.0  # opposing goal vectors among near pairs
    sum_sep_dom = 0.0  # |travelSep| / (|goal|+eps) mean
    samples = 0

    for step in range(steps):
        # desires
        desires = []
        for s in agents:
            slot_d = dist(s.x, s.z, s.tx, s.tz)
            # goal pull (mind pull magnitude ~ planGain * linePressure * direction * dist-ish)
            gx, gz = s.tx - s.x, s.tz - s.z
            gl = math.hypot(gx, gz) or 1.0
            press = P["linePressure"]
            plan_k = press * P["planGain"] * 0.55  # roughly mid-field strength
            mind_x, mind_z = (gx / gl) * plan_k * min(gl, 8.0) / 4.0, (gz / gl) * plan_k * min(gl, 8.0) / 4.0
            # normalize-ish: match order of ABM desire units
            mind_x = gx * plan_k * 0.08
            mind_z = gz * plan_k * 0.08

            sep_x = sep_z = 0.0
            travel_x = travel_z = 0.0
            near_dense = 0
            for o in agents:
                if o is s:
                    continue
                dx, dz = o.x - s.x, o.z - s.z
                d = math.hypot(dx, dz)
                if d < 1e-4 or d > sense:
                    continue
                soft = max(P["personalSpace"], body_min + 0.35)
                if d < soft:
                    stren = (soft - d) / soft
                    close = 2.2 if d < body_min + 0.15 else 1.0
                    sep_x += -(dx / d) * stren * stren * close
                    sep_z += -(dz / d) * stren * stren * close
                # everyone is "traveling" far from seat (slot_d >> arrive)
                if d < bubble:
                    stren = (bubble - d) / bubble
                    away_x, away_z = -(dx / d), -(dz / d)
                    my_d = slot_d
                    their_d = dist(o.x, o.z, o.tx, o.tz)
                    ra = P["closerRatio"]
                    if my_d <= their_d * ra:
                        peel = 0.28
                    elif their_d <= my_d * ra:
                        peel = P["yieldPeel"]
                    else:
                        peel = 1.0
                    travel_x += away_x * stren * stren * peel
                    travel_z += away_z * stren * stren * peel
                    # right-hand when neighbor ahead
                    hf, hz = math.sin(s.heading), math.cos(s.heading)
                    rf, rz = math.cos(s.heading), -math.sin(s.heading)
                    ahead = dx * hf + dz * hz
                    if ahead > 0.15 and d < bubble * 0.95:
                        rh = (1.15 if peel >= 1 else 0.35) * peel
                        travel_x += rf * stren * rh
                        travel_z += rz * stren * rh
                if d < P["spacing"] * 0.95:
                    near_dense += 1

            dx = mind_x + sep_x * P["separation"] * 0.70
            dz = mind_z + sep_z * P["separation"] * 0.70
            dx += travel_x * P["separation"] * P["travelSepGain"]
            dz += travel_z * P["separation"] * P["travelSepGain"]

            # jam divert
            expect = clamp(slot_d * 1.1, 0.55, P["forwardWalk"] * 1.05)
            jammed = slot_d > P["spacing"] * 0.65 and s.speed < expect * P["jamSpeedFrac"] and near_dense >= 1
            if jammed:
                s.jam_timer = min(2.5, s.jam_timer + dt)
                s.t_jammed += dt
            else:
                s.jam_timer = max(0.0, s.jam_timer - dt * 0.85)
            if s.jam_timer >= P["jamTime"]:
                gm = gl or 1.0
                rx, rz = gz / gm, -gx / gm  # right of goal
                free = 1.0
                dx += rx * press * P["jamSteer"] * 0.14 * free
                dz += rz * press * P["jamSteer"] * 0.14 * free

            mag = math.hypot(dx, dz)
            gmag = math.hypot(mind_x, mind_z) or 1e-6
            tmag = math.hypot(travel_x * P["separation"] * P["travelSepGain"],
                              travel_z * P["separation"] * P["travelSepGain"])
            desires.append((dx, dz, mag, slot_d, gmag, tmag, near_dense))

        # integrate
        for s, (dx, dz, mag, slot_d0, gmag, tmag, near_dense) in zip(agents, desires):
            sum_sep_dom += tmag / (gmag + 0.15)
            # travel heading from desire
            if mag > 0.05:
                travel = math.atan2(dx, dz)
                # count flips
                if abs(angdiff(travel, s.last_travel)) > math.radians(75):
                    s.heading_flips += 1
                s.last_travel = travel
            else:
                travel = s.last_travel

            # turn body toward travel
            err = angdiff(travel, s.heading)
            turn_rate = 2.2  # rad/s mid
            step_a = turn_rate * dt
            if abs(err) <= step_a:
                s.heading = travel
            else:
                s.heading += clamp(err, -step_a, step_a)

            # intent speed gated by alignment (mirrors loco face gate)
            align = math.cos(angdiff(travel, s.heading))
            intent = clamp(mag * 1.55, P["forwardShuffle"], P["forwardRun"])
            if mag < 2.2:
                intent = min(intent, P["forwardWalk"])
            if align < P["faceGate"]:
                intent *= 0.25
                s.t_turn_gate += dt
            else:
                intent *= max(0.0, (align - P["faceGate"]) / (1 - P["faceGate"]))

            # move along body heading
            hf, hz = math.sin(s.heading), math.cos(s.heading)
            dvx, dvz = hf * intent * max(0.0, align), hz * intent * max(0.0, align)
            # accel toward desired
            a_max = P["accelRun"] if intent > P["forwardWalk"] else P["accelWalk"]
            if math.hypot(dvx, dvz) < s.speed - 0.05:
                a_max = P["brakeRun"]
            ex, ez = dvx - s.vx, dvz - s.vz
            em = math.hypot(ex, ez)
            md = a_max * dt
            if em > md and em > 1e-8:
                s.vx += ex / em * md
                s.vz += ez / em * md
            else:
                s.vx, s.vz = dvx, dvz

            prev_x, prev_z = s.x, s.z
            prev_d = slot_d0
            s.x += s.vx * dt
            s.z += s.vz * dt
            s.speed = math.hypot(s.vx, s.vz)
            s.path_len += dist(prev_x, prev_z, s.x, s.z)
            new_d = dist(s.x, s.z, s.tx, s.tz)
            s.progress += prev_d - new_d
            if s.speed < 0.35 and prev_d > 3.0:
                s.t_slow += dt

            sum_speed += s.speed
            samples += 1

        # hard collisions (simple)
        for i in range(n):
            for j in range(i + 1, n):
                a, b = agents[i], agents[j]
                dx, dz = b.x - a.x, b.z - a.z
                d2 = dx * dx + dz * dz
                min_d = body_min
                if d2 >= min_d * min_d or d2 < 1e-12:
                    continue
                d = math.sqrt(d2)
                dx /= d
                dz /= d
                half = (min_d - d) * 0.5
                a.x -= dx * half
                a.z -= dz * half
                b.x += dx * half
                b.z += dz * half

        # opposing traffic sample mid-run
        if step % 10 == 0:
            for i in range(n):
                a = agents[i]
                ga = (a.tx - a.x, a.tz - a.z)
                for j in range(i + 1, n):
                    b = agents[j]
                    d = dist(a.x, a.z, b.x, b.z)
                    if d > bubble * 1.1 or d < 1e-4:
                        continue
                    gb = (b.tx - b.x, b.tz - b.z)
                    # approach if relative motion toward each other
                    ga_n = math.hypot(*ga) or 1
                    gb_n = math.hypot(*gb) or 1
                    # do goals cross (agents want to pass through each other)?
                    mid = ((b.x - a.x) / d, (b.z - a.z) / d)
                    a_towards = (ga[0] * mid[0] + ga[1] * mid[1]) / ga_n
                    b_towards = -(gb[0] * mid[0] + gb[1] * mid[1]) / gb_n
                    if a_towards > 0.2 and b_towards > 0.2:
                        sum_cross += 1.0

    # metrics
    final_slot = [dist(s.x, s.z, s.tx, s.tz) for s in agents]
    arrived = sum(1 for d in final_slot if d < P["spacing"] * 0.5)
    far = [s for s in agents if dist(s.x, s.z, s.tx, s.tz) > 4.0]
    efficiency = []
    for s in agents:
        straight = dist(spawns[s.id][0], spawns[s.id][1], s.tx, s.tz)
        efficiency.append(straight / max(s.path_len, 0.01))

    return {
        "drill": drill_name,
        "n": n,
        "form": form,
        "avg_speed": sum_speed / max(samples, 1),
        "jam_frac": sum(s.t_jammed for s in agents) / (n * seconds),
        "slow_far_frac": sum(s.t_slow for s in agents) / (n * seconds),
        "turn_gate_frac": sum(s.t_turn_gate for s in agents) / (n * seconds),
        "heading_flips_per_agent": statistics.mean(s.heading_flips for s in agents),
        "path_efficiency": statistics.mean(efficiency),
        "mean_final_slot": statistics.mean(final_slot),
        "p50_final_slot": statistics.median(final_slot),
        "arrived_frac": arrived / n,
        "sep_over_goal": sum_sep_dom / max(samples, 1),
        "cross_encounters": sum_cross,
        "far_still_frac": len(far) / n,
        "mean_progress": statistics.mean(s.progress for s in agents),
        "bubble": bubble,
        "travelSepGain": P["travelSepGain"],
        "separation": P["separation"],
        "forwardRun": P["forwardRun"],
        "moveAlignDeg": P["moveAlignDeg"],
    }


def main():
    print("=" * 78)
    print("TRAFFIC THRASH DIAG — combat / practice / parade / ablations")
    print("Far-from-seat forces only (no arrive/lock/musical chairs).")
    print("=" * 78)

    cases = []
    for name, p in DRILLS.items():
        cases.append((name, p))
    for name, p in ABLATIONS.items():
        cases.append((name, p))

    configs = [
        (40, "rect"),
        (80, "rect"),
        (120, "rect"),
        (80, "line"),
        (180, "rect"),
    ]

    rows = []
    for n, form in configs:
        print(f"\n--- N={n} form={form} t=18s ---")
        for name, p in cases:
            # average 2 seeds for stability
            r1 = run_sim(name, p, n, seconds=18, seed=7, form=form)
            r2 = run_sim(name, p, n, seconds=18, seed=19, form=form)
            keys = [
                "avg_speed", "jam_frac", "slow_far_frac", "turn_gate_frac",
                "heading_flips_per_agent", "path_efficiency", "mean_final_slot",
                "arrived_frac", "sep_over_goal", "cross_encounters", "far_still_frac",
            ]
            avg = {k: 0.5 * (r1[k] + r2[k]) for k in keys}
            avg.update({
                "drill": name, "n": n, "form": form,
                "bubble": p["travelBubble"], "tSep": p["travelSepGain"],
                "sep": p["separation"], "run": p["forwardRun"],
            })
            rows.append(avg)
            print(
                f"  {name:28s}  speed={avg['avg_speed']:.2f}  jam={avg['jam_frac']:.3f}  "
                f"slowFar={avg['slow_far_frac']:.3f}  flips={avg['heading_flips_per_agent']:.1f}  "
                f"eff={avg['path_efficiency']:.2f}  slot={avg['mean_final_slot']:.1f}  "
                f"arr={avg['arrived_frac']:.2f}  sep/goal={avg['sep_over_goal']:.2f}"
            )

    # Summary deltas combat vs parade
    print("\n" + "=" * 78)
    print("COMBAT vs PARADE delta (parade - combat) by N")
    print("=" * 78)
    for n, form in configs:
        c = next(r for r in rows if r["drill"] == "combat" and r["n"] == n and r["form"] == form)
        p = next(r for r in rows if r["drill"] == "parade" and r["n"] == n and r["form"] == form)
        print(
            f"  N={n:3d} {form:5s}  d_jam={p['jam_frac']-c['jam_frac']:+.3f}  "
            f"d_speed={p['avg_speed']-c['avg_speed']:+.2f}  "
            f"d_flips={p['heading_flips_per_agent']-c['heading_flips_per_agent']:+.1f}  "
            f"d_eff={p['path_efficiency']-c['path_efficiency']:+.2f}  "
            f"d_sep/goal={p['sep_over_goal']-c['sep_over_goal']:+.2f}"
        )

    print("\n" + "=" * 78)
    print("ABLATION (N=80 rect): does parade thrash follow traffic pack?")
    print("=" * 78)
    base_c = next(r for r in rows if r["drill"] == "combat" and r["n"] == 80 and r["form"] == "rect")
    base_p = next(r for r in rows if r["drill"] == "parade" and r["n"] == 80 and r["form"] == "rect")
    for name in [
        "parade_combat_traffic",
        "combat_parade_traffic",
        "parade_no_bubble",
        "parade_combat_bubble_only",
    ]:
        r = next(x for x in rows if x["drill"] == name and x["n"] == 80 and x["form"] == "rect")
        print(
            f"  {name:28s} jam={r['jam_frac']:.3f} (c={base_c['jam_frac']:.3f} p={base_p['jam_frac']:.3f})  "
            f"speed={r['avg_speed']:.2f}  flips={r['heading_flips_per_agent']:.1f}  "
            f"sep/goal={r['sep_over_goal']:.2f}"
        )

    print("\nKEY READ:")
    print("  If parade_combat_traffic ≈ combat jam, thrash is TRAFFIC not seat tolerances.")
    print("  If combat_parade_traffic ≈ parade jam, same conclusion.")
    print("  sep/goal >> 1 means travel bubble dominates goal pull (mid-field dance).")


if __name__ == "__main__":
    main()
