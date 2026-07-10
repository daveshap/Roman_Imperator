"""
Headless late-form packing probe (not full HTML physics).
Compares seat-pick policies for last seekers when core is mostly planted.
"""
from __future__ import annotations
import math
import random
from dataclasses import dataclass, field

SP = 1.55
ARRIVE = 0.32 * SP
OCCUPY = 0.58 * SP
SEED = 7


def formation(n: int, shape: str = "triple"):
    if shape == "square":
        side = max(1, math.ceil(math.sqrt(n)))
        cols, rows = side, side
    elif shape == "rect":
        aspect = 2.4
        cols = max(2, math.ceil(math.sqrt(n * aspect)))
        rows = max(1, math.ceil(n / cols))
    else:
        rows = 3
        cols = max(1, math.ceil(n / rows))
    while cols * rows < n:
        if shape == "triple":
            cols += 1
        elif rows <= cols:
            rows += 1
        else:
            cols += 1
    seats = []
    for r in range(rows):
        for c in range(cols):
            lat = (c - (cols - 1) * 0.5) * SP
            dep = ((rows - 1) * 0.5 - r) * SP
            seats.append((lat, dep, c, r))
    return seats, cols, rows


@dataclass
class Agent:
    id: int
    x: float
    z: float
    belief: int = -1
    planted: bool = False
    claim_t: float = 0.0
    thrash: int = 0
    stuck_t: float = 0.0


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def world(seat):
    # facing 0: lat = +x, dep = +z
    lat, dep, _, _ = seat
    return (lat, dep)


def occupied(seats, agents, seeker, si, sense=16.0):
    """Seat taken if another agent planted/claiming closer near it."""
    sx, sz = world(seats[si])
    me = (seeker.x, seeker.z)
    dme = dist(me, (sx, sz))
    for o in agents:
        if o is seeker:
            continue
        d = dist((o.x, o.z), (sx, sz))
        if d > sense:
            continue
        if o.planted and d <= OCCUPY and dme + 1e-6 >= d:
            return True
        if o.belief == si and not o.planted and d + 0.1 * SP < dme:
            return True
        if d <= OCCUPY and dme + 1e-6 >= d and (o.planted or o.belief == si):
            return True
    return False


def free_list(seats, agents, seeker):
    free = []
    for si in range(len(seats)):
        if occupied(seats, agents, seeker, si):
            continue
        free.append(si)
    return free


def pick_nearest(seats, agents, seeker):
    free = free_list(seats, agents, seeker)
    if not free:
        return -1
    free.sort(key=lambda si: dist((seeker.x, seeker.z), world(seats[si])))
    # closest-claimant among first 12
    for si in free[:12]:
        sx, sz = world(seats[si])
        dme = dist((seeker.x, seeker.z), (sx, sz))
        ok = True
        for o in agents:
            if o is seeker or o.planted:
                continue
            if dist((o.x, o.z), (sx, sz)) + 0.06 * SP < dme:
                ok = False
                break
        if ok:
            return si
    return free[0]


def planted_com(seats, agents):
    xs, zs, c = 0.0, 0.0, 0
    for a in agents:
        if not a.planted:
            continue
        if a.belief < 0:
            continue
        x, z = world(seats[a.belief])
        xs += x
        zs += z
        c += 1
    if c == 0:
        return (0.0, 0.0)
    return (xs / c, zs / c)


def pick_edge_free(seats, agents, seeker):
    """Free seat maximizing distance from planted COM (open wing), then nearer to me as tiebreak."""
    free = free_list(seats, agents, seeker)
    if not free:
        return -1
    com = planted_com(seats, agents)
    free.sort(
        key=lambda si: (
            -dist(world(seats[si]), com),  # farther from solid body first
            dist((seeker.x, seeker.z), world(seats[si])),
        )
    )
    for si in free[:16]:
        sx, sz = world(seats[si])
        dme = dist((seeker.x, seeker.z), (sx, sz))
        ok = True
        for o in agents:
            if o is seeker or o.planted:
                continue
            if dist((o.x, o.z), (sx, sz)) + 0.06 * SP < dme:
                ok = False
                break
        if ok:
            return si
    return free[0]


def simulate(n=80, shape="triple", policy="nearest", seed=SEED, T=90.0, dt=0.05, leftover=12):
    random.seed(seed)
    seats, cols, rows = formation(n, shape)
    agents = []
    seats_by_center = sorted(range(len(seats)), key=lambda si: seats[si][0] ** 2 + seats[si][1] ** 2)
    plant_n = n - leftover
    for i in range(n):
        if i < plant_n:
            si = seats_by_center[i]
            x, z = world(seats[si])
            a = Agent(i, x + random.uniform(-0.05, 0.05), z + random.uniform(-0.05, 0.05), belief=si, planted=True)
        else:
            a = Agent(
                i,
                random.uniform(-SP * 1.2, SP * 1.2),
                random.uniform(-SP * 1.0, SP * 1.0),
                belief=-1,
                planted=False,
            )
        agents.append(a)

    thrash = 0
    t = 0.0
    while t < T:
        seekers = [a for a in agents if not a.planted]
        if not seekers:
            break
        for a in seekers:
            # pick
            if a.belief < 0 or occupied(seats, agents, a, a.belief):
                if policy == "nearest":
                    nb = pick_nearest(seats, agents, a)
                elif policy == "edge_always":
                    nb = pick_edge_free(seats, agents, a)
                else:  # stuck_edge: nearest until stuck, then edge
                    a.stuck_t += dt
                    if a.stuck_t > 2.5 or a.thrash >= 3:
                        nb = pick_edge_free(seats, agents, a)
                        a.stuck_t = 0.0
                    else:
                        nb = pick_nearest(seats, agents, a)
                if nb != a.belief and a.belief >= 0:
                    a.thrash += 1
                    thrash += 1
                a.belief = nb
            if a.belief < 0:
                continue
            tx, tz = world(seats[a.belief])
            # move toward seat (simple)
            dx, dz = tx - a.x, tz - a.z
            d = math.hypot(dx, dz) or 1
            # soft push from planted bodies
            for o in agents:
                if o is a:
                    continue
                ox, oz = a.x - o.x, a.z - o.z
                od = math.hypot(ox, oz)
                soft = 2 * 0.42 + 0.35
                if 1e-4 < od < soft:
                    tstr = (soft - od) / soft
                    dx += (ox / od) * tstr * tstr * 2.0
                    dz += (oz / od) * tstr * tstr * 2.0
            d2 = math.hypot(dx, dz) or 1
            speed = 1.4 if d > SP else 0.55
            a.x += (dx / d2) * speed * dt
            a.z += (dz / d2) * speed * dt
            # plant
            if dist((a.x, a.z), (tx, tz)) < ARRIVE and not occupied(seats, agents, a, a.belief):
                a.planted = True
                a.x, a.z = tx, tz
            elif dist((a.x, a.z), (tx, tz)) > ARRIVE * 1.2:
                a.claim_t += dt
                if a.claim_t > 3.6:
                    a.claim_t = 0
                    a.belief = -1  # force re-pick
                    a.thrash += 1
                    thrash += 1
        t += dt

    planted = sum(1 for a in agents if a.planted)
    # front rank holes: rank 0 seats free while total planted high
    front_free = 0
    for si, s in enumerate(seats):
        if s[3] != 0:
            continue
        if any(a.planted and a.belief == si for a in agents):
            continue
        # seat exists in first n center seats plan
        front_free += 1
    return {
        "policy": policy,
        "planted": planted,
        "n": n,
        "time": t,
        "thrash": thrash,
        "seekers_left": n - planted,
        "ok": planted == n and t < T,
    }


def main():
    print("Late-form packing probe (seekers jammed in core, rest planted)\n")
    for shape, n, left in (("triple", 80, 12), ("triple", 120, 16), ("square", 100, 14)):
        print(f"=== {shape} N={n} leftover={left} ===")
        for pol in ("nearest", "stuck_edge", "edge_always"):
            rows = [simulate(n, shape, pol, seed=s, leftover=left) for s in range(16)]
            ok = sum(1 for r in rows if r["ok"])
            avg_t = sum(r["time"] for r in rows) / len(rows)
            avg_th = sum(r["thrash"] for r in rows) / len(rows)
            avg_left = sum(r["seekers_left"] for r in rows) / len(rows)
            # edge quality: among free seats at t=0 plant, final seekers planted with high |lat|
            print(
                f"  {pol:12s}  ok={ok}/16  avgT={avg_t:5.1f}s  thrash={avg_th:5.1f}  left={avg_left:.2f}"
            )
        print()


if __name__ == "__main__":
    main()
