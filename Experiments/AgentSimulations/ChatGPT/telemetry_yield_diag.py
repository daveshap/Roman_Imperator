#!/usr/bin/env python3
"""
Diagnose brief mutual-juke: two agents approaching with cross paths / same-side peels.
Compares: id-only yield vs closer-to-target yield vs right-hand pass.
"""
from __future__ import annotations
import math, random, json
from pathlib import Path

def hypot(x, z):
    return math.hypot(x, z)

def run_pair(policy="baseline", seconds=8.0, dt=1/30, seed=0, a_closer=True):
    """
    Two men, goals cross. A is clearly closer to its goal if a_closer.
    Count frames both are 'fighting' (close + still both moving toward each other).
    """
    random.seed(seed)
    # A left, B right; goals swap (classic pass)
    if a_closer:
        # A almost at goal, B far
        ax, az, atx, atz = -0.8, 0.0, 1.2, 0.0
        bx, bz, btx, btz = 5.0, 0.15, -1.2, 0.0
    else:
        ax, az, atx, atz = -3.5, 0.0, 3.5, 0.0
        bx, bz, btx, btz = 3.5, 0.1, -3.5, 0.0

    a = {"id": 0, "x": ax, "z": az, "tx": atx, "tz": atz, "vx": 0.0, "vz": 0.0, "side": 1, "claim": 1}
    b = {"id": 1, "x": bx, "z": bz, "tx": btx, "tz": btz, "vx": 0.0, "vz": 0.0, "side": 1, "claim": 0}
    fight = 0
    swaps = 0
    steps = int(seconds / dt)
    for step in range(steps):
        agents = [a, b]
        for s in agents:
            o = b if s is a else a
            gx, gz = s["tx"] - s["x"], s["tz"] - s["z"]
            gm = hypot(gx, gz) or 1
            ux, uz = gx / gm, gz / gz if False else gz / gm
            dx, dz = o["x"] - s["x"], o["z"] - s["z"]
            d = hypot(dx, dz) or 1
            # peel
            px, pz = -uz, ux  # right of goal
            if policy == "baseline":
                # random-ish side from id + flip
                side = 1 if (s["id"] + step // 20) % 2 == 0 else -1
                peel = ((2.2 - min(d, 2.2)) / 2.2) ** 2
                vx = ux * 1.3 + px * side * peel * 1.8
                vz = uz * 1.3 + pz * side * peel * 1.8
            elif policy == "right_hand":
                peel = ((2.2 - min(d, 2.2)) / 2.2) ** 2
                vx = ux * 1.3 + px * peel * 1.8
                vz = uz * 1.3 + pz * peel * 1.8
            elif policy == "closer_keeps":
                # closer to own goal keeps straight; farther peels hard right
                my_dist = hypot(gx, gz)
                their_dist = hypot(o["tx"] - o["x"], o["tz"] - o["z"])
                peel = ((2.2 - min(d, 2.2)) / 2.2) ** 2
                if my_dist <= their_dist * 0.92:
                    # priority: go straight, slight right only if very close
                    vx = ux * 1.4 + px * peel * 0.35
                    vz = uz * 1.4 + pz * peel * 0.35
                else:
                    # yield: strong right + slow approach
                    vx = ux * 0.55 + px * peel * 2.6
                    vz = uz * 0.55 + pz * peel * 2.6
            else:
                vx, vz = ux, uz
            s["vx"], s["vz"] = vx, vz
            s["x"] += vx * dt
            s["z"] += vz * dt

        # mutual fight: close and both still far from goals and closing
        d = hypot(a["x"] - b["x"], a["z"] - b["z"])
        da = hypot(a["tx"] - a["x"], a["tz"] - a["z"])
        db = hypot(b["tx"] - b["x"], b["tz"] - b["z"])
        closing = (a["vx"] - b["vx"]) * (b["x"] - a["x"]) + (a["vz"] - b["vz"]) * (b["z"] - a["z"])
        if d < 1.6 and da > 0.4 and db > 0.4 and closing > -0.2:
            fight += 1

        # claim swap thrash (if both re-target each other's seats occasionally when close)
        if policy == "baseline" and d < 1.8 and random.random() < 0.05:
            a["tx"], b["tx"] = b["tx"], a["tx"]
            a["tz"], b["tz"] = b["tz"], a["tz"]
            swaps += 1
        if policy == "closer_keeps" and d < 1.8:
            # if cross-path, reassign farther to a free offset seat (no swap)
            da = hypot(a["tx"] - a["x"], a["tz"] - a["z"])
            db = hypot(b["tx"] - b["x"], b["tz"] - b["z"])
            if da > 0.5 and db > 0.5:
                # only reassign if mutual approach to each other's goals
                if hypot(a["x"] - b["tx"], a["z"] - b["tz"]) < 1.5 and hypot(b["x"] - a["tx"], b["z"] - a["tz"]) < 1.5:
                    loser = a if da > db else b
                    # free seat offset
                    loser["tx"] = loser["tx"] + 0.0
                    loser["tz"] = loser["tz"] + 2.5  # side seat
                    # only once
                    if not loser.get("reassigned"):
                        loser["reassigned"] = True
                        swaps += 1  # count as one resolution event not thrash

    a_arr = hypot(a["tx"] - a["x"], a["tz"] - a["z"]) < 0.5
    b_arr = hypot(b["tx"] - b["x"], b["tz"] - b["z"]) < 0.5
    return {
        "policy": policy,
        "seed": seed,
        "a_closer": a_closer,
        "fight_frames": fight,
        "swaps": swaps,
        "a_arrived": a_arr,
        "b_arrived": b_arr,
        "final_dist": hypot(a["x"] - b["x"], a["z"] - b["z"]),
    }

if __name__ == "__main__":
    rows = []
    for seed in range(12):
        for policy in ("baseline", "right_hand", "closer_keeps"):
            for a_closer in (True, False):
                rows.append(run_pair(policy=policy, seed=seed, a_closer=a_closer))

    def avg(policy, a_closer=None):
        sel = [r for r in rows if r["policy"] == policy and (a_closer is None or r["a_closer"] == a_closer)]
        return {
            "n": len(sel),
            "avg_fight": sum(r["fight_frames"] for r in sel) / len(sel),
            "avg_swaps": sum(r["swaps"] for r in sel) / len(sel),
            "arrive_rate": sum(1 for r in sel if r["a_arrived"] and r["b_arrived"]) / len(sel),
        }

    summary = {
        "baseline_all": avg("baseline"),
        "right_hand_all": avg("right_hand"),
        "closer_keeps_all": avg("closer_keeps"),
        "baseline_a_closer": avg("baseline", True),
        "closer_keeps_a_closer": avg("closer_keeps", True),
        "baseline_equal": avg("baseline", False),
        "closer_keeps_equal": avg("closer_keeps", False),
    }
    out = Path(__file__).parent / "telemetry_turn_out" / "yield_closer_compare.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps({"summary": summary, "rows": rows}, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))
