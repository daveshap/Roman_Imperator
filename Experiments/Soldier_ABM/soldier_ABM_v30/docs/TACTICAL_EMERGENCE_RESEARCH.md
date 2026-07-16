# Tactical Emergence Research and Design Direction

Status: design research accompanying v30 and guiding the post-v30 battlefield simulation  
Workstream: 3A — tactical RTS depth, preparation, deception, and emergence  
Architectural constraint: **no telepathy — doctrine plus perception/communication only**

## Executive decision

The battlefield game should not become either a conventional high-APM unit controller or a passive autobattler. Its distinctive form should be **command under uncertainty**:

1. Before contact, the general studies an incomplete map, chooses an objective, assigns missions, establishes boundaries and triggers, positions a reserve, and spends finite time and labor on reconnaissance or preparation.
2. Subordinates receive an intent and a shared doctrine, not a stream of destinations. They execute autonomously from their own perceptions and communications.
3. During battle, the player interprets delayed and sometimes contradictory reports, decides which crises deserve scarce attention, commits or withholds reserves, changes priorities, authorizes pursuit, relocates command, or orders disengagement.
4. Terrain, weather, fatigue, fortifications, supply, morale, and information interact causally. They do not collapse into generic attack bonuses.
5. Deception works by creating observable evidence that may alter an enemy decision-maker's private beliefs. There is never an `enemyIsDeceived` switch.

The desired experience is not “issue the optimal formation and watch the result.” It is:

- prepare a plan that has options;
- discover which assumptions were wrong;
- recognize a developing opportunity or danger before the opponent does;
- intervene at the correct echelon and early enough for a delayed order to matter;
- live with the parts of the battle that subordinates must solve without the player.

This is compatible with the existing project. Private tracks, physical runners, raised standards, uncertain detection, doctrine-based postures, and local FSMs are already the right substrate. The next systems should increase the number of meaningful relationships among those primitives rather than add a separate omniscient strategy layer.

## What is sourced and what is proposed

This memo deliberately separates three kinds of claim:

- **Historical evidence** describes what a primary source reports or what modern scholarship argues. Ancient narrative sources are not telemetry and must not be treated as exact measurements.
- **Doctrine/research evidence** supplies useful analytical concepts. Modern U.S. Army doctrine is not evidence that an ancient army possessed a modern staff process.
- **Design inference** is a recommendation for this game. It may be historically inspired without claiming to reconstruct every ancient battle.

Source cautions matter:

- Caesar was a participant, politician, and propagandist. His *Gallic War* is excellent evidence for the operations and causal relationships a Roman commander wanted readers to understand, but not an unbiased event log.
- Polybius wrote closer to the Republican period and thought explicitly about generalship, but his narrative is still literary history.
- Frontinus collected stratagem anecdotes. The collection demonstrates a rich ancient vocabulary of deception; it does not prove that every anecdote occurred as reported.
- Vegetius is a late Roman prescriptive author. He should inform possible mechanics, not silently authenticate Republican-era practice.
- Modern doctrine provides a mature vocabulary for intent, decision points, intelligence, deception, and sustainment. Its concepts must be translated to the technology and institutions of the chosen ancient setting.
- Laboratory and sport-horse surface studies establish that footing matters to locomotion; they do not directly quantify a warhorse charge through a muddy battlefield.

## Research findings and their design consequences

### 1. Battle duration should contain pulses, lulls, and local crises

#### Evidence

Ancient battles were not uniformly brief. At Alesia, Caesar describes one cavalry action continuing from midday almost to sunset, a subsequent attack running from midnight until near dawn, and the decisive day exhausting Roman troops through repeated movement to threatened sectors. He also describes exhausted attackers being relieved by fresh troops. See Caesar, *Gallic War* 7.80–88 in [Livius's text and translation](https://www.livius.org/sources/content/caesar/caesar-on-the-siege-of-alesia/).

Elsewhere Caesar reports a camp battle maintained until evening, after which the forces withdrew at sunset; this immediately follows several days of deployment and skirmishing rather than instant decisive contact. See *Gallic War* 1.48–51 in the [MIT Internet Classics Archive](https://classics.mit.edu/Caesar/gallic.1.1.html).

Philip Sabin's reconstruction of Roman infantry combat argues that many Roman clashes lasted an hour or more, while the casualty patterns and limits of endurance make continuous cheek-by-jowl sword fighting for that entire time implausible. He evaluates a model of repeated surges, pauses, advances, withdrawals, and use of fresh supporting troops rather than an unbroken melee. See [Philip Sabin, “The Face of Roman Battle,” *Journal of Roman Studies* 90 (2000)](https://doi.org/10.2307/300198).

These sources do **not** imply that every battle took all day. Some forces broke at the first shock. The relevant finding is variance: contact might collapse quickly, or an engagement might develop through long periods of indecision and repeated local effort.

#### Design inference

The simulation should support a battle lasting hours of simulated time without demanding hours of continuous real-time input.

Recommended pacing:

- Keep near-1:1 time during close contact and command crises.
- Permit `1×`, `2×`, and `4×` time while no immediate decision is pending; automatically return to `1×` only for explicitly configured events, never because the game has read the player's hidden intent.
- Treat approach, reconnaissance, skirmishing, main contact, crisis, relief, exploitation, and withdrawal as **observed phase labels**, not mandatory scripted gates.
- Make a close combat line pulse. Local groups enter, press, disengage a few paces, recover, exchange missiles, retrieve wounded where possible, or receive fresh ranks. The precise cadence should arise from fatigue, morale, space, threat, and doctrine.
- Let a stable line consume endurance slowly and a continuous press consume it rapidly. “Attack” should not mean every front-rank soldier swings every cooldown until death.
- Give reserves and relief real value. A fresh century arriving at an exhausted sector should matter because of its state and timing, not through a magical reserve bonus.
- End most battles through objective completion, withdrawal, rout, darkness, loss of command cohesion, or inability to continue—not extermination.

A useful initial target is **20–35 minutes of player time representing roughly 1–3 hours**, with shorter collapses and longer set-piece exceptions. This is a tuning target, not a historical constant.

### 2. Preparation should create options, not predetermine an autoresolve result

#### Evidence

At Cannae, Polybius has Hannibal evaluate whether the ground suited his cavalry advantage, allow time for preparation and physical recovery, attack Roman access to water, and exploit the opponent's impatience. The same narrative makes supply pressure a reason that a position could not simply be held indefinitely. See Polybius, *Histories* 3.110–112 in the [Fordham Ancient History Sourcebook](https://sourcebooks.web.fordham.edu/ancient/polybius-cannae.asp).

At Alesia, Caesar examined the site, built mutually facing defensive systems, placed camps and redoubts at strategic points, allocated fixed posts, and later moved reinforcements among threatened sectors. Preparation was powerful but costly: timber and grain parties reduced the force available to defend the works, and Gallic sorties attempted to exploit that exposure. See [Caesar on Alesia](https://www.livius.org/sources/content/caesar/caesar-on-the-siege-of-alesia/).

Modern planning doctrine offers a useful abstraction: describe who, what, when, where, and why; use boundaries, phase lines, objectives, assembly areas, strongpoints, axes, information-collection plans, known or templated enemy locations, and command posts; then test critical events through action, reaction, and counteraction. See chapters 9 and 11 of [U.S. Army FM 6-0, *Commander and Staff Organization and Operations*](https://home.army.mil/wood/application/files/8315/5751/8360/FM_6-0_I_Command_and_Staff_Organization_and_Operations.pdf).

#### Design inference

The pre-contact interface should build a **mission plan**, not let the player paint perfect future choreography. A plan may contain:

```text
mission purpose
objective or terrain to protect
main effort and supporting effort
century boundaries and permitted maneuver corridor
phase/trigger lines
fallback and rally locations
reserve identity and release authority
pursuit limit
priority information requirements
branches and contingencies
signal meanings
deception concept, if any
```

Every conditional trigger must be evaluated against the receiving actor's private belief. “Counterattack when the enemy reserve crosses Line Oak” means “when an authorized observer reports a sufficiently credible contact believed to be the enemy reserve beyond the locally understood Line Oak.” It must never query the enemy reserve's true coordinates or internal role.

Preparation should create three things:

1. **Shared expectations.** A centurion who loses contact can still act coherently because the plan specified purpose, boundaries, and contingencies.
2. **Physical changes.** Scouts move, soldiers rest or labor, works are built, supply is placed, and formations occupy ground.
3. **Opportunity costs.** Time spent digging is time not spent resting, screening, scouting, foraging, or moving. A force may be attacked before preparation is complete.

Good preparation should raise the chance of success and reduce the number of urgent interventions. It should not reveal that the battle is “already won,” because reconnaissance can be incomplete, weather can change, subordinates can misunderstand, the enemy can decline the offered fight, and the enemy has a plan too.

### 3. Terrain must be a causal field, not a decorative height map

#### Evidence

Military terrain analysis treats observation and fields of fire, avenues of approach, key terrain, obstacles, cover and concealment, and cross-country mobility as related but distinct questions. Restricted terrain slows or channels movement rather than merely applying one universal speed scalar. See [U.S. Army ATP 2-01.3, *Intelligence Preparation of the Battlefield*](https://home.army.mil/wood/application/files/8915/5751/8365/ATP_2-01.3_Intelligence_Preparation_of_the_Battlefield.pdf).

Caesar's Alesia narrative links terrain to visibility, fortification layout, frontage, reinforcement, and vulnerability. A hill too large to enclose forced a camp onto a disadvantageous slope; the attacking force first reconnoitered that weakness, then concealed its night march behind the hill and attacked around midday. The same account says defenders were disturbed by danger they could hear but not see. See [*Gallic War* 7.83–88](https://www.livius.org/sources/content/caesar/caesar-on-the-siege-of-alesia/).

Soil mobility is dynamic. The U.S. Army Engineer Research and Development Center's FASST model derives moisture, temperature, freeze/thaw, snow, and soil strength from interacting terrain and weather inputs rather than assigning a permanent “mud” label. See [Frankenstein and Koenig, *Fast All-season Soil STrength (FASST) Model*](https://erdc-library.erdc.dren.mil/handle/11681/11814). Equine research likewise finds that surface and shoe conditions change horse-body displacement and loading, while surface composition, depth, and moisture affect shear behavior; see [Horan et al. 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8610270/) and [Rohlf et al. 2023](https://doi.org/10.1016/j.tvjl.2022.105930).

#### Design inference

Represent terrain with a small set of composable physical fields:

| Field | Examples | Direct consequences |
|---|---|---|
| Geometry | elevation, slope, curvature, step/cliff, local roughness | sight lines, acceleration, footing, frontage, path choice |
| Surface | stone, packed road, turf, ploughed field, sand, loose scree | traction, energy cost, noise, dust, work rate |
| Soil | texture, depth, bearing strength, drainage, current moisture | sinkage, rutting, ditch stability, recovery after rain |
| Vegetation | grass, crop, scrub, reeds, woodland | concealment, passage width, sound, fire/fuel |
| Water | stream depth/velocity, marsh, runoff path, water source | crossing, hydration, wetness, channeling |
| Human alteration | road, terrace, wall, ditch, spoil, camp, churned ground | movement, cover, signatures, obstacles |
| Atmosphere | light, precipitation, fog, wind, heat | vision, sound, fatigue, projectiles, dust/smoke |

Avoid a flat `highGroundAttackBonus`. High ground can instead:

- extend some sight lines while creating dead ground immediately below a lip;
- reduce or increase fatigue depending on direction and grade;
- change acceleration and the ability to maintain ranks;
- let a defender conceal reserves behind a reverse slope;
- narrow usable approach lanes;
- complicate retreat, lateral reinforcement, and messenger travel.

Similarly, mud should be an interaction, not a tile curse:

```text
rain history
  × soil texture and drainage
  × traffic and churn
  × slope/runoff
  × carried mass and contact pressure
  × pace and formation density
  → energy cost, slip risk, sinkage, separation, and recovery difficulty
```

That chain can make a wet gully lethal to exhausted heavy troops or cavalry without declaring that “mud kills knights.” Firm grass after light rain may be harmless; a compacted road may remain usable; a churned exit lane may degrade during the fight. Catastrophe should usually require several adverse conditions and a bad decision.

Terrain knowledge is also information:

- A familiar local force may know a ford, drainage hollow, or goat path through doctrine/map memory.
- An unfamiliar general sees an uncertain survey layer.
- Scouts can update passability estimates.
- A route that was passable yesterday can become questionable after rain or traffic.
- The gameplay UI should show reported or surveyed terrain confidence, while debug UI may show the true fields.

### 4. Field fortification should be geometry plus labor plus knowledge

#### Evidence

Caesar describes trenches, water-filled ditches, ramparts, palisades, towers, sharpened branches, concealed pits, and iron hooks at Alesia. He also explains their intended effects: surprise protection, keeping missiles away from workers, allowing fewer men to defend a broad circuit, and stopping or delaying attackers. Attackers responded with reconnaissance, simultaneous pressure, missiles, protective equipment, earth and wattles to fill works, hooks to tear structures down, and concentration at weak points. [The account is unusually explicit about construction and countermeasure](https://www.livius.org/sources/content/caesar/caesar-on-the-siege-of-alesia/).

Vegetius, though late and prescriptive, distinguishes hasty and more permanent camps and relates ditch/rampart construction to available soil and intended duration. See the [University of Richmond selection from *De re militari*](https://facultystaff.richmond.edu/~wstevens/history331texts/Vegetius.html).

#### Design inference

Every work should have:

- a path and cross-section in world geometry;
- construction progress by segment;
- required labor, tools, and material;
- fatigue and observation costs for assigned workers;
- a visible signature such as spoil, felled timber, dust, noise, or missing troops;
- a knowledge record for friend and enemy actors;
- damage, filling, collapse, bypass, and abandonment states.

| Work | Primary effect | Cost/signature | Counterplay |
|---|---|---|---|
| Shallow ditch | breaks pace and rank alignment | labor, spoil line, drainage interaction | reconnoiter, fill, bridge, use another lane |
| Deep ditch/rampart | creates cover and a severe crossing obstacle | much more time, obvious works, fixed orientation | concentrate, undermine/fill, seize an end, force abandonment |
| Stakes/caltrops | deny a charge lane and injure unprepared movement | timber/iron, placement time, may obstruct friends | scouts, missiles, removal crews, alternate lane |
| Concealed pits | surprise and local disruption | slow to prepare; concealment can fail | probe, observe soil disturbance, mark safe lanes |
| Breastwork/shielded position | missile protection and morale shelter | fixes frontage; can mask vision | flank, fire where appropriate, close assault, bypass |
| Prepared camp | rally, supply, protected command location | labor and predictable location | isolate, threaten supply, attack before completion |
| Abatis/felled trees | blocks or channels movement | requires nearby wood; highly visible | burn, drag apart, bypass, use as cover |

Knowledge cannot be global. A trap known to the engineer is not automatically known to a returning patrol. Safe lanes must be briefed, marked, observed, or communicated. A routed friendly body can stumble into its own poorly communicated obstacle system.

Field works should delay and shape rather than simply subtract hit points. Their strongest value is buying command time, preserving frontage, and making the enemy choose an expensive lane. Their strongest counters are reconnaissance, maneuver, labor, and attacking the system that sustains them.

### 5. Fatigue, supply, and relief should shape tempo

#### Evidence

Caesar repeatedly links operations to grain, timber, foraging, water, and the need to guard supply routes. At Alesia, gathering timber and grain left works understrength. In *Gallic War* 2, Caesar selected a river-backed camp partly so supplies could arrive safely and posted a force to guard the bridge; see [Caesar, *Gallic War* 2.5–8](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Caesar/Gallic_War/2%2A.html).

Modern sustainment doctrine defines logistics as enabling freedom of action, extending reach, and prolonging endurance. This is a useful causal principle even though ancient supply methods differ radically. See the [U.S. Army Sustainment Resource Portal and ADP 4-0](https://cascom.army.mil/asrp/).

Sabin's Roman battle analysis makes fresh troops and the relief of tired formations central to explaining prolonged combat. Caesar's Alesia narrative explicitly mentions fresh troops relieving exhausted attackers and defenders losing stamina over the day. See [Sabin 2000](https://doi.org/10.2307/300198) and [Caesar 7.85–88](https://www.livius.org/sources/content/caesar/caesar-on-the-siege-of-alesia/).

#### Design inference

Use several local resources instead of one “supply” bar:

- **Acute exertion:** seconds-to-minutes; affects sprinting, close combat, climbing, pushing, and formation correction.
- **Operational fatigue:** hours-to-days; inherited from marching, digging, poor sleep, hunger, heat, and prior action; caps recovery and judgment.
- **Water/heat state:** affects endurance and recovery, especially in armor.
- **Missile inventory:** javelins, arrows, sling ammunition, and prepared defensive missiles are physical or locally counted.
- **Food/fodder:** mostly a pre-battle and campaign constraint, except during an all-day or siege operation.
- **Horse state:** fatigue, heat, footing confidence, injury, and panic are separate from the rider.
- **Tools/material:** governs engineering and repair.

The tactical loop should expose consequences, not spreadsheets. Examples:

- A centurion reports “men winded; line holding; cannot pursue,” not `fatigue = 0.73`.
- A century that rotates behind a stable line recovers acute exertion but not a sleepless night's operational fatigue.
- Repeated cavalry charges progressively reduce acceleration, control, and safe pursuit. The cavalry hammer remains powerful when fresh and correctly placed, but it is not an endlessly reusable damage ability.
- Resupply must travel through bodies, carts, pack animals, or known caches. Interception and congestion become tactical possibilities.
- Wounded and broken troops moving rearward can obstruct runners and reserves, transmit alarming local evidence, and consume care and escort capacity.

The reserve is therefore a resource with multiple uses: relief, counterattack, flank security, exploitation, rally support, or protection of the withdrawal route. Committing it should solve one problem while visibly surrendering other options.

### 6. Reconnaissance should create tracks, not reveal units

#### Evidence

Terrain/intelligence doctrine treats analysis as a continuing process of describing environmental effects, evaluating a threat, and developing possible threat courses of action—not merely removing black shroud. [ATP 2-01.3](https://home.army.mil/wood/application/files/8915/5751/8365/ATP_2-01.3_Intelligence_Preparation_of_the_Battlefield.pdf) is useful here because it connects terrain, mobility, observation, likely avenues, and uncertain enemy behavior.

Research on opponent modeling in imperfect-information RTS games treats the opponent's strategy as a classification problem under partial observations. Scouting observations support possible models; they do not expose the hidden strategy itself. See [Schadd, Bakkes, and Spronck, “Opponent Modeling in Real-Time Strategy Games”](https://sander.landofsand.com/publications/Schadd%2C_Bakkes_and_Spronck_-_Opponent_Modeling_in_Real-Time_Strategy_Games.pdf).

Ancient sources also make observation and reporting operational. Caesar refers to scouts, captives, deserters, guides, visible standards, shouts, and messengers. Frontinus's anecdotes repeatedly turn on scouts, false signals, controlled leaks, campfires, disguise, and intercepted or deliberately exposed information. See [Frontinus, *Stratagems* I](https://penelope.uchicago.edu/Thayer/e/roman/texts/frontinus/strategemata/1%2A.html) and [II](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Frontinus/Strategemata/2%2A.html).

#### Design inference

Extend the existing private enemy-track concept upward to the general. A contact record should contain something like:

```text
track key local to this observer
estimated location and uncertainty region
estimated heading/speed and uncertainty
strength interval, not exact count
classification probabilities
first/last observation time
report arrival time
source type and source chain
direct/relayed/inferred provenance
confidence and contradiction history
possible tactical roles or hypotheses
```

It should contain no true engine body ID, true century ID, hidden posture, hidden objective, or reference to another mind's live record.

Reconnaissance missions should be explicit:

- route reconnaissance;
- screen a flank;
- watch a ford or ridge;
- locate the enemy main body;
- estimate strength;
- find field works;
- maintain contact without decisive engagement;
- counter-reconnaissance and scout hunting.

The scout must travel, perceive, remember, evade, and report. A report's age is the time since observation plus return/transmission time. Killing or driving off scouts denies knowledge without deleting facts already reported. A scout who sees only baggage dust, a few skirmishers, or a deliberately conspicuous standard may form the wrong hypothesis.

The gameplay UI should present an **intelligence picture**:

- uncertain contact shape;
- source (`scout`, `centurion report`, `general's sight`, `sound`, `civilian`, `captured messenger`);
- age;
- confidence band;
- contradictions;
- what the general asked to know.

It should never show the enemy general's current FSM state, mode switch, exact morale, destination, order wording, or private confidence. Debug UI may show both sides with a conspicuous provenance view.

### 7. Autonomous subordinates should execute mission orders

#### Evidence

Modern mission-command doctrine emphasizes competence, mutual trust, shared understanding, commander's intent, mission orders, disciplined initiative, and risk acceptance. The relevant conceptual point is that a subordinate needs enough purpose and constraints to act when communication fails; it is not that an ancient centurion should reproduce a modern organization. See [U.S. Army ADP 6-0, *Mission Command*](https://armypubs.army.mil/epubs/DR_pubs/DR_a/ARN34403-ADP_6-0-000-WEB-3.pdf).

FM 6-0's planning model also distinguishes the higher commander's task/purpose and control measures from the subordinate unit's detailed formation. It uses decision points and information requirements to connect planning with later action. See [FM 6-0, chapter 9](https://home.army.mil/wood/application/files/8315/5751/8360/FM_6-0_I_Command_and_Staff_Organization_and_Operations.pdf).

#### Design inference

The game should treat doctrine as a library of interpretable mission patterns, not a script of future coordinates. A mission order should include:

- task and purpose;
- priority relative to neighboring tasks;
- assigned area, boundary, or route;
- acceptable risk and losses;
- relationship to the main effort;
- authority to deviate;
- expected signals and reports;
- branch conditions;
- withdrawal/pursuit policy;
- what to do if contact or communication is lost.

Centurion quality should affect how this is parsed and executed:

- comprehension time;
- retention of relevant details;
- quality of locally inferred geometry;
- recognition that a contingency applies;
- willingness and ability to exercise initiative;
- clarity and cadence of reports;
- risk calibration;
- ability to explain a changed situation upward.

It should not grant access to more world truth. A brilliant centurion can make a better inference from the same evidence and doctrine, but cannot know an unseen flank attack.

Use layered control rather than one giant FSM:

| Layer | Responsibility | Example states/choices |
|---|---|---|
| Mission | Why this century exists in the plan | fix, guard, screen, reserve, delay, seize, withdraw |
| Tactical task | Current way of advancing the mission | approach, probe, hold, press, relieve, refuse flank, disengage |
| Local crisis | Short override from immediate perception | evade charge, close breach, rally locally, avoid obstacle |
| Individual | Embodied behavior | follow guide, defend, strike, relay, recover, flee |

Lower layers may override higher ones for survival but cannot silently rewrite the mission. The actor should later report the deviation if able.

The human general's in-battle controls should be high leverage:

- change intent or priority;
- release, redirect, or recall a reserve;
- set or revoke pursuit authority;
- move the command post or personal standard;
- demand a report or redirect reconnaissance;
- approve a subordinate request;
- order relief, disengagement, or retreat;
- change the meaning or timing of an agreed signal.

Every control must use the same finite channel model as other orders. The player is not punished for refusing to micro soldiers; the player is punished for a poor plan, a late inference, an overloaded communication network, or an unwise command decision.

### 8. Deception must target beliefs through observables

#### Evidence

Modern military-deception doctrine supplies a particularly compatible causal model. It starts with a desired enemy action or inaction, identifies the target decision-maker and required perception, constructs a plausible and consistent story, creates observable events through available means, assesses target and conduit feedback, and plans termination. It also stresses time, cost, risk, existing beliefs, and the need for the target to actually sense the deception event. See chapter 11 of [FM 6-0](https://home.army.mil/wood/application/files/8315/5751/8360/FM_6-0_I_Command_and_Staff_Organization_and_Operations.pdf) and the Army's description of [FM 3-13.4, *Army Support to Military Deception*](https://www.army.mil/article/218036/combined_arms_center_releases_new_army_specific_military_deception_doctrine).

Frontinus's collection includes false campfires, disguised scouts, deliberately leaked letters, false deserters, apparent disorder, concealed detachments, false signals, baiting cavalry, and troops made to look more numerous. Again, these anecdotes are design evidence for a repertoire, not statistical validation. See [Frontinus I](https://penelope.uchicago.edu/Thayer/e/roman/texts/frontinus/strategemata/1%2A.html) and [Frontinus II](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Frontinus/Strategemata/2%2A.html).

#### Design inference

A deception plan needs explicit fields:

```text
friendly goal
target decision-maker or formation
desired enemy action/inaction
belief the target would need
plausible story
physical/signaling observables to create
conduits expected to carry those observables
cost and forces allocated
feedback signs available to friendly observers
abort and termination conditions
```

Execution pipeline:

1. Friendly agents physically enact observables.
2. Enemy sensors may or may not detect them.
3. Enemy reports may or may not arrive.
4. Each enemy decision-maker updates private hypotheses according to evidence, doctrine, experience, and bias.
5. The enemy may choose the desired action, another action, or delay.
6. Friendly agents infer possible success only from return reports and enemy behavior.

There is never a direct write to an enemy belief and never a success toast merely because the player pressed “feint.”

| Deception | Required capability | Cost/risk | Likely counterplay |
|---|---|---|---|
| Demonstration | visible force/signals at a secondary point | commits attention and exposes troops | maintain reserve; seek independent confirmation |
| Feigned retreat | discipline, rally point, pursuit trap, communication | can become a real rout; enemy may not pursue | pursuit limit, scouts, fresh covering force |
| False weakness/gap | credible local behavior and hidden response force | actual vulnerability if response is late | probe lightly; refuse premature commitment |
| Concealed main effort | masking terrain, screen, movement discipline | slower coordination; discovery can isolate force | flank recon, high observation, patrols |
| False camp/activity | fires, dust, sound, standards, routines | time/material; patterns can become inconsistent | compare sources; observe supply and tracks |
| Controlled leak | messenger/deserter/document or public order | conduit may fail; enemy may distrust it | authentication, corroboration, feed testing |
| False reserve commitment | conspicuous movement that resembles commitment | real reserve may be misplaced | wait for consequences; maintain own reserve |
| Baited pursuit | exposed force plus ambush/turning force | bait can be destroyed before support acts | bounded pursuit doctrine; screen route and flanks |

Feints should be difficult because they require discipline and timing. A low-discipline force ordered to retire under pressure may truly rout. A highly cautious enemy may decline bait. A successful deception should sometimes produce only delay or misallocation, not a cinematic annihilation.

Enemy inference should track multiple hypotheses—such as `main attack`, `demonstration`, `withdrawal`, `bait`, or `reorganization`—with evidence for and against each. The AI must choose under uncertainty rather than discover the player's selected label.

### 9. Counterplay and legibility are prerequisites for emergence

An interacting simulation is not automatically a good game. Hidden compound mechanics can feel arbitrary unless players can form and revise causal models.

Every strong tactic or environmental effect needs:

1. **A signature:** spoil beside a ditch, scouts disappearing, dust behind a ridge, abnormal campfires, tired horses, a sudden absence of reports.
2. **An opportunity cost:** labor, time, exposure, fatigue, force allocation, lost mobility, or reduced reconnaissance.
3. **At least two countermeasures:** direct response plus avoidance, delay, or information gathering.
4. **A failure gradient:** partial delay, disorder, fatigue, or uncertainty before rare catastrophic collapse.
5. **A reportable explanation:** soldiers and officers can describe what they saw without reading hidden scalars.

Examples:

- A ditch is powerful, but it has visible spoil, finite ends, construction cost, and fill/bypass options.
- An ambush needs concealment, patience, a target route, and communication; scouts or a changed route can defeat it.
- Heavy rain can transform a poorly drained lane, but high ground, roads, slower pace, lighter order, or waiting may mitigate it.
- A feigned retreat may draw pursuit, but a pursuit boundary, fresh scout screen, or disciplined pause creates counterplay.
- A compact heavy infantry line resists frontal attack, but it can be bypassed, screened, denied an objective, fatigued by redeployment, fixed while another point is threatened, or forced to fight on unsuitable ground.

Gameplay UI should explain friendly causality and reported enemy evidence. Debug UI should expose the full causal chain for tuning. Neither should replace observation with unexplained combat-number popups.

### 10. An autonomous battle still needs consequential player decisions

The risk of an autobattler is passivity: if preparation truly decides everything, the best live action is to watch. The opposite failure is fake agency: bombard the player with minor corrections that autonomous centurions should make.

The solution is **scarce, delayed, high-impact intervention**.

#### Recommended command loop

1. The general maintains a private situation estimate assembled from direct sight and reports.
2. The interface raises a decision cue only when evidence crosses a doctrine/player-configured threshold: a flank may be turning, the reserve is requested, a report is overdue, the pursuit limit is reached, an objective is threatened, or two sources contradict.
3. The player may act, request more information, delegate to doctrine, or deliberately wait.
4. Any order has preparation, dispatch, travel, receipt, comprehension, and execution latency.
5. The result is assessed from later evidence, not immediate UI confirmation.

Useful decisions include:

- **Commit now or preserve optionality?** A reserve can win a current sector but cannot answer the next unseen threat.
- **Trust which report?** A direct but old observation may conflict with a fresh second-hand report.
- **Press or re-form?** Continued pressure may break the enemy or exhaust one's own line.
- **Pursue or hold?** A retreat can be genuine, bait, or a chance that will vanish.
- **Move the general?** A forward position improves direct awareness and presence but increases risk and may worsen communication elsewhere.
- **Change the plan or reinforce its purpose?** Repeated detailed changes can arrive out of order and destroy shared understanding.
- **Save the army or save the objective?** Withdrawal can be a competent result.

Aim initially for roughly **4–12 major command decisions in a 20–35 minute battle**, plus optional reconnaissance and report management. Measure this rather than assuming more clicks mean more play.

### 11. Preventing a solved anvil-and-hammer metagame

Heavy infantry plus cavalry should remain historically and tactically effective where its prerequisites are present. The design problem is not that anvil-and-hammer works; it is when it works regardless of information, terrain, weather, objective, endurance, timing, or opponent response.

Make value conditional:

| Asset/doctrine | Strong when | Weak or costly when |
|---|---|---|
| Heavy infantry line | firm ground, protected flanks, limited objective, time to form, frontal enemy commitment | long redeployment, heat, deep/soft ground, broken terrain, bypass, multiple distant threats |
| Cavalry hammer | fresh horses, space, known obstacle-free lane, pinned target, secure rally route | ditches/stakes, woodland, mud, steep/rough ground, intact enemy reserve, repeated charges |
| Light infantry | screening, scouting, rough terrain, harassment, denying information | caught in close order without escape, defending a fixed open frontage |
| Deep formation | sustained pressure, replacement depth, morale support | missiles, narrow exit, mud/churn, need for rapid lateral change |
| Wide thin line | frontage, envelopment threat, observation | local breakthrough, poor communication, weak reserve |
| Prepared defense | time, useful terrain, known enemy avenue, protected supply | bypass, surprise before completion, forced time objective elsewhere |
| Aggressive pursuit | enemy genuinely broken, fresh troops, known route | bait, exhaustion, lost formation, hidden reserve, obstacle funnel |

Scenario objectives should frequently make passive frontal defense insufficient:

- delay an enemy for a time, then withdraw intact;
- seize or deny a ford before rain changes it;
- escort a supply column through a pass;
- hold two separated points with insufficient force for both;
- conduct reconnaissance in force and disengage;
- break out of encirclement;
- cover an evacuation or retreat;
- destroy or protect engineering works;
- raid baggage, water, or remounts;
- force an enemy to deploy while preserving one's own army;
- survive until darkness or reinforcements.

The opponent must also be allowed to refuse the player's preferred battle. If the Roman player builds an excellent frontal anvil on irrelevant ground, an intelligent enemy should screen it, threaten its supply or objective, demonstrate against it, or wait for a better condition.

### 12. Enemy intelligence and difficulty without cheating

#### Evidence

Adaptive-game-AI research shows that a rule base can vary and learn tactic selection while retaining authored guardrails. Spronck's dynamic-scripting work identifies speed, effectiveness, robustness, efficiency, clarity, variety, consistency, and scalability as relevant requirements; see [Spronck et al., “Adaptive Game AI with Dynamic Scripting”](https://link.springer.com/content/pdf/10.1007/s10994-006-6205-6.pdf). Research on strategic-game depth frames depth as resistance to partial solutions and a continuing ladder of heuristics and search rather than raw state-space size; see [Lantz et al., “Depth in Strategic Games”](https://cdn.aaai.org/ocs/ws/ws0340/15142-68464-1-PB.pdf).

The MDA framework is also a useful warning: mechanics matter because of the runtime dynamics and player experience they create, and interacting subsystems can produce unpredictable behavior. More simulation variables do not automatically produce challenge, discovery, or expression. See [Hunicke, LeBlanc, and Zubek, “MDA: A Formal Approach to Game Design and Game Research”](https://www.cs.northwestern.edu/~hunicke/MDA.pdf).

#### Design inference

Enemy difficulty should change the **quality of command behavior**, not hidden combat arithmetic:

- size and relevance of doctrine repertoire;
- ability to compare plausible enemy courses of action;
- planning horizon and contingency quality;
- reserve discipline;
- reconnaissance priorities;
- consistency of deception stories;
- recognition of contradictions and stale information;
- willingness to abort a failed plan;
- learning from evidence available in prior battles.

All difficulty levels must use the same sensors, reports, runner losses, terrain knowledge rules, troop capabilities, and combat resolver as the player. A more capable general makes better use of evidence; it does not receive more evidence by fiat.

Recommended architecture:

- **Belief layer:** general-local friendly status, enemy tracks, terrain estimates, report history, assumptions, and uncertainty.
- **Goal layer:** mission value, force preservation, time, positional opportunity, information needs, and political/campaign constraints.
- **Doctrine candidates:** authored plans such as fix/flank, refuse flank, probe, delay, prepared defense, double envelopment attempt, bait/cover, screened withdrawal, or supply threat.
- **Planner/arbitrator:** scores candidates against believed conditions and risk, retaining multiple hypotheses.
- **Execution FSM:** coordinates current phase, reports, reserve, and branch triggers through physical communication.
- **Learning layer:** adjusts doctrine priors only from observations and after-action evidence the faction could retain.

Do not let online learning rewrite low-level behavior freely during a battle. It can produce unreadable or degenerate play. Initially, adapt weights among tested doctrine packages and log the evidence behind every change.

Build an **information provenance ledger** in debug mode. For every AI general decision, record:

```text
decision and time
belief facts consulted
source actor/message/direct observation for each fact
age/confidence at decision time
doctrine rule or utility term used
orders actually dispatched
```

An automated audit should fail if a decision depends on true enemy state, enemy-private state, a future event, or a report not yet delivered.

### 13. Variety should come from interacting situations, not content inflation

Replayability should arise from a coherent cross-product:

```text
objective
× force composition and readiness
× commander/subordinate doctrine and traits
× terrain geometry and familiarity
× soil/weather history and forecast uncertainty
× preparation time and engineering material
× supply and approach fatigue
× reconnaissance quality and misinformation
× time of day and reinforcement window
× campaign value of casualties versus ground
```

The generator should produce historically and physically coherent bundles, not arbitrary random modifiers. A flooded stream needs weather and drainage history. A fortified choke point needs labor and time. An exhausted army needs an approach story. A local guide needs a relationship or origin.

This produces recombination without turning the game into a spreadsheet. The player sees a muddy road, late scouts, wind-blown dust, hungry horses, a nervous allied centurion, and an objective that must be held until dusk—not twelve exposed percentage modifiers.

## Concrete system specifications

### General's private situation model

The general brain should own, never share live:

```text
own embodied state and direct percept
friendly-century tracks based on reports/direct sight
enemy formation/contact tracks
terrain and route estimates
current mission plan and received acknowledgements
outstanding information requirements
message/outbox/inbox history
reserve estimate and commitment belief
objective/time estimate
current hypotheses about enemy courses of action
decision history and unresolved assumptions
```

Friendly status is not magically exact. A centurion's report can be late, a runner killed, and a formation obscured. The general may know issued orders but not whether they were received or how they are being executed unless an acknowledgement, standard, sound, or direct sight provides evidence.

### Conditional order schema

Use predicates that explicitly declare an information basis:

```js
{
  mission: 'guard-left-approach',
  purpose: 'prevent envelopment of the main effort',
  area: { polygon: 'LEFT_SECTOR', source: 'briefed-map-v3' },
  posture: 'defensive',
  constraints: {
    pursuitBeyond: 'LINE_ASH',
    minimumReserve: 0.35,
    acceptableRisk: 'moderate'
  },
  branches: [
    {
      when: {
        belief: 'hostile-formation-in-sector',
        confidenceAtLeast: 0.55,
        sourceKinds: ['direct', 'authorized-report']
      },
      then: 'refuse-flank-and-report'
    },
    {
      when: {
        belief: 'main-effort-withdrawing',
        confidenceAtLeast: 0.65
      },
      then: 'cover-withdrawal-to-RALLY_PINE'
    }
  ],
  lostContact: 'hold-key-ground-and-send-runner'
}
```

The names in this example are doctrine concepts, not engine truth. `hostile-formation-in-sector` must be computed from the centurion's own track map. `main-effort-withdrawing` must come from sight, signal, or report.

### Crisis/decision object for gameplay UI

```text
reported problem
source and report age
confidence/contradictions
why doctrine considers it important
latest useful decision time estimate
available high-level responses
communication path and estimated delay
what happens if delegated or ignored
```

The “latest useful time” is an estimate from known distance/channel conditions. It is not a guarantee based on future truth.

### Battle phase estimator

Phase is observer/general inference derived from contact density, objective progress, exertion, casualties, movement, and communication—not a global FSM forcing everyone to change behavior.

Suggested labels:

- `approach`;
- `reconnaissance`;
- `deployment`;
- `skirmish`;
- `main-contact`;
- `local-crisis`;
- `relief/reorganization`;
- `exploitation`;
- `withdrawal`;
- `aftermath`.

Different sectors may have different local phases simultaneously.

## The first playable tactical-emergence slice

Build one scenario before a general terrain sandbox: **Ridge Road**.

### Situation

- Two centuries per side, matching the current prototype scale.
- A road crosses a shallow ridge, descends through a poorly drained gully, and exits at a ford.
- Rain has recently stopped. The road is firm, the gully uncertain, and further rain is possible.
- One side must hold the road exit until a deadline and withdraw with most of its force; the other must clear the route before that deadline.
- Each side has incomplete terrain confidence and one limited reconnaissance task before main contact.

### Player planning choices

- identify main effort and reserve;
- assign a hold/delay area rather than a point destination;
- set a pursuit boundary;
- place one rally point;
- choose rest, reconnaissance, or shallow field preparation during a limited pre-contact interval;
- establish one conditional reserve trigger;
- choose command-post position.

### Emergent relationships tested

- ridge sight/dead ground;
- road versus wet-gully mobility;
- formation frontage and congestion;
- delayed reports;
- reserve commitment;
- disciplined pursuit versus bait;
- objective/time pressure;
- intact withdrawal as a valid result.

### Why this slice

It can expose whether the core game is interesting before building a campaign or a huge terrain system. It creates meaningful choices for both aggressive and defensive generals, makes a static anvil insufficient by itself, and exercises the existing runner/perception architecture.

## Prioritized mechanics roadmap

### Priority 0 — preserve the information contract

Do before adding new tactics.

1. Add a general-private belief model using only direct general perception and delivered reports.
2. Add provenance to every belief and AI decision.
3. Separate gameplay projections from omniscient debug projections.
4. Add automated no-telepathy tests for general decisions, triggers, terrain knowledge, and deception.
5. Ensure gameplay UI never reads enemy-private inference, mode, morale, order, or objective.

Acceptance:

- Killing every messenger can leave the general with stale friendly and enemy estimates.
- Reordering observer/UI polling cannot change simulation decisions.
- Every AI decision can be reconstructed from evidence available at that time.

### Priority 1 — objective, time, plan, and reserve

This is the shortest route to a game rather than a demonstration.

1. Add objective/time victory conditions and safe withdrawal.
2. Add a mission-plan schema with purpose, boundaries, rally point, pursuit limit, and one conditional branch.
3. Add a true reserve mission and physical release order.
4. Add crisis/decision cues and time compression.
5. Implement Ridge Road with static terrain fields.

Acceptance:

- Holding ground, delaying, withdrawing intact, and clearing a route can each decide a battle without annihilation.
- The reserve cannot act on a trigger it has not perceived or received.
- A good plan reduces required live orders but does not guarantee victory.

### Priority 2 — terrain, reconnaissance, and the enemy general

1. Add elevation/slope, roughness, roads, vegetation, water, cover/concealment, and static soil trafficability.
2. Add reconnaissance missions and general-level contact tracks.
3. Implement the enemy general against exactly the same percept/report API.
4. Add doctrine candidates and belief-based plan selection.
5. Add pursuit discipline, refusal, bypass, and disengagement choices.

Acceptance:

- The AI can choose not to attack a strong irrelevant position.
- Destroying or deceiving scouts changes later decisions without changing world truth.
- The same force matchup produces different sensible plans on materially different terrain/objectives.

### Priority 3 — fatigue, relief, cavalry, and tactical sustainment

1. Separate acute exertion from operational fatigue.
2. Add local recovery, line relief, and reserve freshness.
3. Add horse fatigue/footing/control independently from rider stats.
4. Add finite missiles and simple physical resupply.
5. Add water, approach fatigue, and wounded/straggler rearward flow.

Acceptance:

- Repeated charges have declining utility without arbitrary cooldowns.
- A fresh relief force can stabilize an exhausted line.
- A force can win the objective but become too exhausted or disordered to exploit.

### Priority 4 — dynamic soil/weather and field works

1. Add rainfall history, drainage, moisture, strength, and traffic churn.
2. Add uncertain forecasts and terrain reports.
3. Add segment-based ditch, stake, and breastwork construction.
4. Add work fatigue, tools/material, discovery, filling, bypass, and friendly knowledge.
5. Add night/light, wind-driven sound/dust, and visibility effects after the core is legible.

Acceptance:

- Mud severity emerges from soil/weather/traffic/load rather than a map tag.
- Works buy time and shape routes but always expose cost/signature/counterplay.
- Friendly troops can be endangered by poorly communicated works without any global trap registry in their minds.

### Priority 5 — deception and counter-deception

1. Add enemy course-of-action hypotheses with uncertainty.
2. Implement demonstration, concealed main effort, and feigned retreat as the first three deception families.
3. Require physical observables and conduit detection.
4. Add feedback assessment and abort/termination.
5. Add independent-source corroboration, probe doctrine, pursuit limits, and counter-reconnaissance.

Acceptance:

- Deception can fail because it was not seen, was inconsistent, was disbelieved, arrived too late, or was countered.
- The deceiver receives no hidden success flag.
- A feigned retreat can become a genuine rout.
- An AI general can deceive and be deceived under the same rules.

### Priority 6 — doctrine adaptation and scenario ecology

1. Run authored doctrine tournaments over terrain/objective/readiness ensembles.
2. Adjust doctrine priors from observable outcomes, not hidden player selections.
3. Persist commander tendencies and faction knowledge between battles.
4. Add coherent scenario generation and campaign-derived approach states.
5. Link preparation resources to campaign logistics only after the tactical choices are fun.

## Verification and anti-dominance program

### Causality tests

- Every general/centurion decision lists its percepts, messages, memories, doctrine, and private condition inputs.
- No gameplay DTO contains enemy-private state.
- Conditional orders cannot evaluate material world truth directly.
- Deception actions create observables only; tests reject direct enemy-belief mutation.
- Terrain familiarity and trap knowledge are actor-local immutable doctrine or acquired memories.

### Determinism tests

- Same seed plus same issued commands produces the same result regardless of rendering, selection, debug-overlay state, snapshot polling, or UI timing.
- Each stochastic terrain/combat/inference draw has a stable keyed source so adding observer queries does not consume simulation randomness.

### Tactical depth tests

Build a scenario matrix varying objective, geometry, ground, weather history, readiness, information, and doctrine. For every candidate doctrine:

- compare win/objective rate across the entire matrix;
- compare it within its intended niche;
- measure regret against the best contextual alternative;
- flag a doctrine that remains dominant across most unrelated contexts;
- retain locally strong tactics rather than flattening everything to 50/50.

A practical warning threshold: investigate any force-normalized doctrine winning above roughly 65% across a broad, adversarially selected scenario corpus. This is a diagnostic, not a balance law.

### Player-agency tests

Measure:

- number and timing of major decisions;
- fraction of orders that arrive too late to matter;
- frequency of contradictory reports;
- time spent at each speed and battle phase;
- outcomes when the player delegates all branches versus intervenes;
- whether expert players can explain why an intervention worked;
- whether repeated micro-orders outperform coherent intent because of an unintended loophole.

If optimal play becomes issuing constant tiny corrections, increase command cost/latency or improve subordinate doctrine. Do not reward APM that bypasses the premise.

### Deception tests

For each deception family, vary:

- observer position and competence;
- conduit survival and latency;
- target prior beliefs and doctrine;
- number and independence of corroborating sources;
- story consistency;
- enemy probe/reserve behavior;
- friendly discipline and execution error.

Record belief trajectories, not just final action. A robust system should produce correct belief, wrong belief, suspended judgment, and correct belief for the wrong reason across different runs.

### Pacing tests

Track simulated time versus player time, contact intensity, exertion, orders, and crisis count. Desired early shape:

- meaningful approach and reconnaissance;
- at least one lull or reorganization opportunity in prolonged battles;
- a small number of legible crises;
- a plausible route to quick collapse;
- no requirement to exterminate all bodies.

## Failure modes to reject explicitly

- **Perfect minimap with cosmetic fog:** contacts must be estimates with provenance and age.
- **Enemy cards that expose intent:** gameplay shows observed behavior and reports only.
- **Deception button:** a feint must be enacted, perceived, interpreted, and acted upon.
- **Universal terrain bonuses:** effects should follow geometry, footing, visibility, exertion, and formation.
- **Mud as instant death:** catastrophic results require interacting conditions and decisions.
- **Fortifications as extra armor:** works reshape movement, sight, frontage, labor, and time.
- **One fatigue bar:** acute exertion, operational fatigue, recovery, water, and horses have different causal roles.
- **Reserve aura:** reserve value comes from freshness, position, options, and delayed commitment.
- **AI combat buffs:** difficulty comes from planning, inference, reconnaissance, and doctrine quality.
- **AI omniscience disguised as prediction:** every prediction requires observable evidence and uncertainty.
- **Scripted cinematic genius:** Hannibal-like outcomes should be possible because systems align, not because a scenario flips to “double envelopment complete.”
- **Preparation as solved autoresolve:** plans need branches and opponents need agency.
- **Historical trivia without decisions:** a mechanic belongs only if it creates a perceivable tradeoff or consequence.
- **Spreadsheet foreground:** exact state belongs in debug/analysis; gameplay uses terrain signs, reports, behavior, and bounded estimates.
- **Randomness as emergence:** emergence comes from causal interaction. Randomness supplies variance and uncertainty, not arbitrary reversals.

## Design thesis in one sentence

**Make the player win by building and revising a sound model of a battlefield that no actor can see whole, then expressing intent through people, signals, terrain, time, and preparation whose interactions remain physically and informationally causal.**

## Annotated source list

### Ancient evidence

- [Julius Caesar, *Gallic War*, Alesia narrative 7.66–90](https://www.livius.org/sources/content/caesar/caesar-on-the-siege-of-alesia/) — terrain survey, siege works, labor/supply exposure, reconnaissance, multi-direction attacks, visibility, reinforcement, fatigue, relief, pursuit, and duration. Primary participant account with strong self-presentational incentives.
- [Julius Caesar, *Gallic War* Book I](https://classics.mit.edu/Caesar/gallic.1.1.html) — supply pressure, repeated deployment/skirmishing, camp preparation, appearance/deception, and an engagement continuing until evening.
- [Julius Caesar, *Gallic War* Book II](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Caesar/Gallic_War/2%2A.html) — scouts, river-backed camp, supply route, bridge guard, ditch/rampart, nighttime reinforcement, and cautious testing before battle.
- [Polybius, *Histories* 3.107–118, Cannae](https://sourcebooks.web.fordham.edu/ancient/polybius-cannae.asp) — ground selection, preparation, cavalry space, supply/water pressure, opponent psychology, and battle arrangement.
- [Frontinus, *Stratagems* Book I](https://penelope.uchicago.edu/Thayer/e/roman/texts/frontinus/strategemata/1%2A.html) and [Book II](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Frontinus/Strategemata/2%2A.html) — ancient repertoire of scouts, leaks, disguise, false signals, fires, bait, ambush, apparent strength/weakness, and exploitation of terrain. Anecdotal compendium, not a verified event database.
- [Vegetius selection, *De re militari*](https://facultystaff.richmond.edu/~wstevens/history331texts/Vegetius.html) — late Roman prescriptive treatment of training, logistics, signals, camps, and preparation; useful with chronological caution.

### Modern doctrine and physical research

- [U.S. Army ADP 6-0, *Mission Command*](https://armypubs.army.mil/epubs/DR_pubs/DR_a/ARN34403-ADP_6-0-000-WEB-3.pdf) — intent, mission orders, shared understanding, disciplined initiative, trust, competence, and risk.
- [U.S. Army FM 6-0, *Commander and Staff Organization and Operations*](https://home.army.mil/wood/application/files/8315/5751/8360/FM_6-0_I_Command_and_Staff_Organization_and_Operations.pdf) — course-of-action structure, control measures, decision points, action/reaction/counteraction, reserves, intelligence requirements, and deception planning.
- [U.S. Army ATP 2-01.3, *Intelligence Preparation of the Battlefield*](https://home.army.mil/wood/application/files/8915/5751/8365/ATP_2-01.3_Intelligence_Preparation_of_the_Battlefield.pdf) — terrain, weather, mobility, observation, avenues, obstacles, threat evaluation, and possible courses of action.
- [U.S. Army Sustainment Resource Portal / ADP 4-0](https://cascom.army.mil/asrp/) — sustainment as enabling freedom of action, reach, and endurance.
- [Frankenstein and Koenig, FASST](https://erdc-library.erdc.dren.mil/handle/11681/11814) — dynamic interaction of weather, moisture, temperature, snow/ice, terrain material, and soil strength.
- [Horan et al., “The effect of horseshoes and surfaces on horse and jockey centre of mass displacements”](https://pmc.ncbi.nlm.nih.gov/articles/PMC8610270/) — empirical evidence that surface/hoof conditions alter equine movement; directionally useful, not a direct warhorse model.
- [Rohlf et al., “Shear ground reaction force variation among equine arena surfaces”](https://doi.org/10.1016/j.tvjl.2022.105930) — surface depth, moisture, composition, and shear behavior.

### Game and simulation research

- [Philip Sabin, “The Face of Roman Battle”](https://doi.org/10.2307/300198) — scholarly reconstruction of battle duration, casualty patterns, movement, supporting ranks, and plausible pulse/lull combat mechanics.
- [Hunicke, LeBlanc, and Zubek, “MDA”](https://www.cs.northwestern.edu/~hunicke/MDA.pdf) — trace mechanics through runtime dynamics to desired player experience; especially relevant to interacting simulation systems.
- [Lantz et al., “Depth in Strategic Games”](https://cdn.aaai.org/ocs/ws/ws0340/15142-68464-1-PB.pdf) — strategic depth as resistance to partial solutions and an extended ladder of heuristic knowledge and search.
- [Spronck et al., “Adaptive Game AI with Dynamic Scripting”](https://link.springer.com/content/pdf/10.1007/s10994-006-6205-6.pdf) — bounded adaptive rule selection and practical requirements for adaptive game AI.
- [Schadd, Bakkes, and Spronck, “Opponent Modeling in Real-Time Strategy Games”](https://sander.landofsand.com/publications/Schadd%2C_Bakkes_and_Spronck_-_Opponent_Modeling_in_Real-Time_Strategy_Games.pdf) — opponent-strategy inference under RTS imperfect information.
