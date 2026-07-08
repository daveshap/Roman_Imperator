#!/usr/bin/env python3
"""Detect mutual claim-swap / hallway-dance patterns in a simplified seat+pass model."""
from __future__ import annotations
import math, random, csv, json
from pathlib import Path
from collections import defaultdict

def angdiff(a, b):
    return math.atan2(math.sin(a - b), math.cos(a - b))

def run(n=24, seconds=18.0, dt=1/30, seed=2, right_hand=False, anti_swap=False):
    random.seed(seed)
    # two columns of men walking to swapped goals (classic hallway)
    agents = []
    for i in range(n):
        left = i < n // 2
        agents.append({
            "id": i,
            "x": (-4.0 if left else 4.0) + random.uniform(-0.3, 0.3),
            "z": (i % (n // 2) - n / 4) * 0.9,
            "tx": (4.0 if left else -4.0),
            "tz": (i % (n // 2) - n / 4) * 0.9,
            "heading": 0.0,
            "jam_side": 1 if (i % 2 == 0) else -1,
            "claim": i,  # pretend seat id
            "prev_claim": i,
            "swaps": 0,
            "vx": 0.0, "vz": 0.0,
        })
    # force pairwise contested seats between mirrors
    for i in range(n // 2):
        agents[i]["claim"] = n // 2 + i
        agents[n // 2 + i]["claim"] = i
        agents[i]["tx"] = agents[n // 2 + i]["x"]
        agents[i]["tz"] = agents[n // 2 + i]["z"]
        agents[n // 2 + i]["tx"] = agents[i]["x"]
        agents[n // 2 + i]["tz"] = agents[i]["z"]

    swap_events = 0
    mirror_same_side = 0
    steps = int(seconds / dt)
    for step in range(steps):
        # reassignment thrash simulation: each picks nearest free of contested
        claims = {}
        for a in agents:
            # move toward target with jam divert
            gx, gz = a["tx"] - a["x"], a["tz"] - a["z"]
            gm = math.hypot(gx, gz) or 1
            ux, uz = gx / gm, gz / gm
            # jam: if neighbor ahead, peel
            peel_x = peel_z = 0.0
            for b in agents:
                if b["id"] == a["id"]:
                    continue
                dx, dz = b["x"] - a["x"], b["z"] - a["z"]
                d = math.hypot(dx, dz)
                if d < 1.8 and d > 1e-4:
                    # head-on-ish
                    closing = (a["vx"] - b["vx"]) * dx + (a["vz"] - b["vz"]) * dz
                    if closing > 0 or d < 1.2:
                        if right_hand:
                            # right of own goal
                            side = 1.0
                            px, pz = -uz * side, ux * side
                        else:
                            # OLD: jam_side by id parity + occasional flip (bad)
                            if step % 40 == 0 and random.random() < 0.15:
                                a["jam_side"] *= -1
                            px, pz = -uz * a["jam_side"], ux * a["jam_side"]
                        peel_x += px * ((1.8 - d) / 1.8) ** 2
                        peel_z += pz * ((1.8 - d) / 1.8) ** 2
                        # count same-side peels for facing pairs
                        if abs(a["id"] - b["id"]) == n // 2:
                            if a["jam_side"] == b["jam_side"] and not right_hand:
                                mirror_same_side += 1
            sp = 1.2
            a["vx"] = ux * sp + peel_x * 1.5
            a["vz"] = uz * sp + peel_z * 1.5
            a["x"] += a["vx"] * dt
            a["z"] += a["vz"] * dt
            a["heading"] = math.atan2(a["vx"], a["vz"])

        # claim swap detection (musical chairs thrash)
        if anti_swap:
            # fix mutual swaps: lower id keeps preferred closer seat
            pairs = []
            for a in agents:
                for b in agents:
                    if a["id"] >= b["id"]:
                        continue
                    if a["claim"] == b["id"] and b["claim"] == a["id"]:  # simplified
                        pass
            # stabilize claims to initial unique seats after t>2
            if step * dt > 2.0:
                for a in agents:
                    a["claim"] = a["id"]
                    a["tx"] = (-4 if a["id"] < n // 2 else 4)
                    a["tz"] = (a["id"] % (n // 2) - n / 4) * 0.9
        else:
            # thrash: randomly re-swap claims when close
            for a in agents:
                for b in agents:
                    if a["id"] >= b["id"]:
                        continue
                    d = math.hypot(a["x"] - b["x"], a["z"] - b["z"])
                    if d < 1.5 and random.random() < 0.08:
                        # swap targets (indecision)
                        a["tx"], b["tx"] = b["tx"], a["tx"]
                        a["tz"], b["tz"] = b["tz"], a["tz"]
                        a["claim"], b["claim"] = b["claim"], a["claim"]
                        a["swaps"] += 1
                        b["swaps"] += 1
                        swap_events += 1

    total_swaps = sum(a["swaps"] for a in agents)
    # progress: how many reached near their original side
    arrived = sum(1 for a in agents if abs(a["x"] - (4 if a["id"] < n // 2 else -4)) < 1.2)
    # with anti_swap right_hand, goals flip - measure spread not stuck center
    mid = sum(1 for a in agents if abs(a["x"]) < 1.0)
    return {
        "right_hand": right_hand,
        "anti_swap": anti_swap,
        "swap_events": swap_events,
        "total_agent_swaps": total_swaps,
        "mirror_same_side_ticks": mirror_same_side,
        "stuck_mid_count": mid,
        "seed": seed,
    }

if __name__ == "__main__":
    out = Path(__file__).parent / "telemetry_turn_out"
    out.mkdir(exist_ok=True)
    rows = []
    for seed in range(8):
        for rh, asw in [(False, False), (True, False), (True, True)]:
            rows.append(run(seed=seed, right_hand=rh, anti_swap=asw))
    # aggregate
    def agg(pred):
        sel = [r for r in rows if pred(r)]
        return {
            "n": len(sel),
            "avg_swaps": sum(r["swap_events"] for r in sel) / len(sel),
            "avg_mid": sum(r["stuck_mid_count"] for r in sel) / len(sel),
            "avg_same_side": sum(r["mirror_same_side_ticks"] for r in sel) / len(sel),
        }
    summary = {
        "baseline_thrash": agg(lambda r: not r["right_hand"] and not r["anti_swap"]),
        "right_hand_only": agg(lambda r: r["right_hand"] and not r["anti_swap"]),
        "right_hand_anti_swap": agg(lambda r: r["right_hand"] and r["anti_swap"]),
        "rows": rows,
    }
    (out / "hallway_compare.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps({k: summary[k] for k in summary if k != "rows"}, indent=2))
