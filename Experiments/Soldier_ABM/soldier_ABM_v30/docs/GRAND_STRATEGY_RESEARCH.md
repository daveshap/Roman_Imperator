# Grand-strategy research and systems proposal

Status: v30 research workstream 3B  
Scope: the campaign layer above the tactical battlefield  
Date: 2026-07-15

## Executive conclusion

The strongest direction is not “Total War with more variables.” It is a continuous, agent-based political-military world in which the player governs through doctrine, institutions, relationships, reports, and material networks.

The recommended campaign has these defining properties:

1. **Continuous simulation, intermittent command.** Time flows continuously under variable speed and pause, but the player is not expected to monitor continuously. Officials execute standing doctrine; the interface interrupts only for exceptions the player has chosen to care about.
2. **No omniscient state.** The simulation owns exact world truth. Neither human nor AI polity reads it. Each actor owns a delayed, partial, possibly biased knowledge state assembled from reports with provenance.
3. **Power travels through networks.** Armies, taxes, trade, political authority, intelligence, and orders move through roads, ports, rivers, depots, couriers, households, courts, and patronage relationships. Territory by itself is not control.
4. **Institutions are playable algorithms.** A census, provincial autonomy, tax farming, a courier service, military command, and commercial law alter who observes, decides, pays, skims, complies, and reports. They are not passive percentage bonuses.
5. **Delegation is a source of strategy.** Governors and generals have competence, doctrine, loyalty, constituencies, incentives, private knowledge, and discretion. The player sets intent and designs accountability rather than repeating every local action.
6. **Logistics creates geography.** Trade and supply follow actual routes. Roads, river crossings, harbors, fodder, harvest calendars, storage, escorts, and interdiction determine which frontiers and campaigns are viable.
7. **Diplomacy is a commitment system, not a relation score.** Agreements consist of obligations, verification, schedules, enforcement, domestic supporters, hostages or collateral, and reputational consequences.
8. **Expansion contains real counterforces.** Distance, communication latency, route exposure, administrative dilution, elite bargaining, garrison costs, local legitimacy, and balancing coalitions grow from the same simulation that produces imperial wealth. There is no arbitrary “large empire” debuff.
9. **Winning need not mean map painting.** Political settlement, acknowledged hegemony, a resilient constitutional order, commercial predominance, alliance leadership, independence, and dynastic security can all end a campaign credibly.
10. **Difficulty comes from cognition and opposition.** Better AI has better doctrine, hypothesis management, coordination, adaptation, and deception. It does not receive hidden morale, income, damage, or vision bonuses.

The project’s cardinal restriction—**no telepathy**—should become the campaign layer’s central design advantage. Most grand-strategy games use fog of war at the edge while granting perfect knowledge inside the player’s own empire. This design should model the harder and more historically fertile problem: rulers also lacked perfect knowledge of their own provinces, accounts, commanders, subjects, and agents.

## How to read the research

This document separates evidence from design inference.

- **Research finding** means the linked source directly supports the general relationship being described.
- **Historical inspiration** means a historical source or case demonstrates that a behavior or institution existed; it does not prove a particular game balance.
- **Project inference** means a proposed mechanic derived from those relationships. It is a hypothesis to prototype and test, not a claim that scholarship has already validated the game design.

This distinction matters. Historical fidelity does not automatically make a mechanic fun, and a useful mechanic does not become historically true because it feels plausible.

## 1. Design objective: make strategy the management of consequential uncertainty

The campaign should generate the experience of making commitments under incomplete knowledge:

- Which report is trustworthy?
- Which theater deserves scarce attention?
- Is an enemy mobilization an invasion, coercive signal, or bait?
- Can this governor be trusted with latitude?
- Can an army live along the intended route?
- Will an ally fulfill a promise when the cost arrives?
- Is additional conquest worth the administrative and diplomatic exposure?
- Can victory be secured without fighting this war?

This is different from optimization over a fully visible production spreadsheet. The player should understand relationships and constraints, but should rarely possess exact, current values for everything.

The foundational simulation approach is well aligned with agent-based modeling. Epstein’s generative formulation asks whether macroscopic regularities can be grown from specified local agents and interactions rather than asserted from above; agent-based computational economics similarly models economies as evolving interactions among heterogeneous autonomous agents ([Epstein 1999](https://legacy.econ.tuwien.ac.at/lva/compeco.se/artikel/principles_agent_based_computational_models_and_generative_social_science.pdf); [Tesfatsion 2003](https://faculty.sites.iastate.edu/tesfatsi/archive/tesfatsi/aintro.htm)).

**Project inference:** prosperity, trade corridors, shortages, coalitions, corruption, rebellions, and imperial overstretch should be outcomes of interacting households, settlements, merchants, officials, armies, routes, and institutions—not event modifiers injected solely to keep the campaign dramatic.

### Seven design doctrines

1. **Truth belongs to the simulation; knowledge belongs to actors.**
2. **Every action requires a channel.** Money, messages, force, and influence cannot jump across the map.
3. **Every delegated actor has an objective function.** Divergence must have an intelligible cause, not a random betrayal roll.
4. **Every advantage should expose something.** Concentration leaves another place weak; a fast march consumes endurance and supply; central control creates information and processing burdens.
5. **Systems should share primitives.** The same road carries grain, tax revenue, merchants, orders, rumors, and spies. This is where recombination and emergence come from.
6. **The primary interface shows decisions, not databases.** Exact tables remain available in archives and debug tools, not as the default play surface.
7. **Success should change the job.** A growing polity moves the player from direct action toward institutional design, appointments, doctrine, and exceptional intervention.

### Target player experience

The desired reward cycle is not primarily “number rises, collect reward.” It is:

1. **Form a model.** Read terrain, reports, relationships, routes, and incentives.
2. **Make a commitment.** Choose an intent and accept opportunity cost before the outcome is certain.
3. **Observe consequences.** Receive evidence through the same channels the decision depended on.
4. **Experience legible surprise.** Another actor, hidden constraint, or system interaction changes the situation for a reason the player can investigate.
5. **Adapt.** Revise doctrine, bargain, redirect means, or accept a loss without needing a canned solution.
6. **Learn.** Carry a better mental model into the next problem, while different combinations keep that model from becoming a fixed build order.

This aims at several complementary forms of engagement:

- **competence:** learning to diagnose a real causal system;
- **autonomy and expression:** developing a personal command and institutional style;
- **discovery:** inferring what is happening rather than revealing a predetermined event chain;
- **dramatic consequence:** remembering the governor, failed treaty, exposed route, or well-timed reserve that changed a campaign;
- **mastery without rote execution:** better preparation reduces risk, but never removes all adaptation because other agents also learn and act.

**Project inference:** every proposed subsystem should pass five questions before it earns implementation: What decision does it create? What evidence supports that decision? What does commitment expose? How can another actor counter it? How does the player understand the result? A subsystem that only adds upkeep clicks or an isolated bonus should be removed or folded into an existing primitive.

## 2. Continuous time versus turns

### Research finding

Real-time environments create time pressure, and workload depends not only on action complexity but on how long attention is captured relative to time available ([Sevcenko et al. 2021](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.572437/full)). Human-factors research also warns that poorly designed automation can increase monitoring workload and reduce situation awareness instead of relieving it ([Endsley and Kiris 1995 discussion](https://maritimesafetyinnovationlab.org/wp-content/uploads/2019/12/Automation-and-Situation-Awareness-Endsley.pdf); [Parasuraman, Sheridan, and Wickens 2000](https://pubmed.ncbi.nlm.nih.gov/11760769/)).

These findings do not establish that continuous or turn-based strategy is universally superior. They establish that a continuous game must control attention and automation carefully.

### Comparison

| Model | Strategic strengths | Structural risks |
|---|---|---|
| Alternating turns | Unlimited deliberation; clean save/replay; simple UI batching | Artificial global synchronization; turn-boundary exploits; implausible instantaneous coordination; repetitive “process every province” rounds |
| Simultaneous fixed turns | Better simultaneity; planning emphasis | Resolution opacity; still creates pulses; difficult mid-turn reactions and courier timing |
| Unpausable real time | Natural simultaneity; meaningful timing | Rewards vigilance and input speed; punishes accessibility; encourages automation monitoring and missed events |
| Real time with pause and speed | Simultaneity plus deliberation; natural delayed orders; supports seasons and travel | Can devolve into constant pause/pop-up management unless delegation and alert policy are first-class systems |

### Recommendation: continuous simulation, intermittent command

Use a continuous event-driven simulation with:

- pause;
- several forward speeds;
- a player-configurable auto-pause/auto-slow policy;
- scheduled briefings rather than indiscriminate popups;
- standing orders and delegated doctrine;
- commands that enter the world only when time resumes;
- messages and orders that require simulated transit;
- systems updating at appropriate cadences rather than every rendering frame.

The grand map need not numerically integrate every process every millisecond. “Continuous” means events retain real ordering and duration, not that all subsystems share one tiny tick.

Suggested cadences:

| Process | Typical simulation cadence |
|---|---|
| Courier, army, caravan, and fleet motion | Continuous/event based |
| Army consumption and local foraging | Several times per day or daily |
| Settlement inventory and prices | Daily or on material events |
| Political sentiment | Event driven plus weekly consolidation |
| Wages, rents, taxes, and contracts | Scheduled calendar dates |
| Agricultural production | Weather and seasonal phases |
| Strategic AI reconsideration | Event driven with bounded periodic review |

### Attention policy

The player defines which conditions deserve interruption:

- hostile army newly confirmed inside a protected region;
- supply reserve projected below a doctrine threshold;
- treaty breach supported by sufficiently reliable evidence;
- governor request outside delegated authority;
- informant network compromised;
- harvest forecast crosses a risk threshold;
- battle begins or a commander requests reinforcement.

Everything else accumulates into the next briefing.

**Project inference:** continuous time should create simultaneity, travel time, seasonal opportunity, and overlapping crises. It should not create a requirement to “constantly manage spies.” Networks should operate under doctrine, and the player should intervene when the strategic meaning changes.

### Single-player and multiplayer

- In single-player, unrestricted pause is compatible with a thinking game. Pausing should not alter information or let an order travel.
- In multiplayer, use negotiated pauses, planning windows, or server-configured minimum speed. Do not change the underlying simulation model.
- Difficulty should not be defined by removing pause. That measures time-pressure tolerance more than strategic competence.

## 3. The knowledge model: imperfect information inside and outside the state

Endsley’s situation-awareness model distinguishes perception, comprehension, and projection in dynamic decision making ([Endsley 1995](https://journals.sagepub.com/doi/10.1518/001872095779049543)). That distinction maps unusually well onto the project:

1. **Observation:** a merchant saw carts moving north.
2. **Interpretation:** the carts may be provisioning an army.
3. **Projection:** an offensive across the northern ford may be possible within a week.

These must remain separate. A source can observe accurately while an analyst interprets badly; a sound interpretation can still produce an uncertain forecast.

### Core data contract

Every report should be an immutable packet resembling:

```text
ReportPacket
  reportId
  claimType
  subjectRef or anonymousSubjectDescriptor
  observedAt
  observedArea
  createdAt
  receivedAt
  sourceType
  sourceRefKnownToReceiver
  chainOfCustody[]
  rawObservation
  estimateDistribution or categoricalClaim
  sourceConfidence
  observationConfidence
  transmissionIntegrity
  suspectedMotive
  classification
  supersedes[]
```

The receiver’s dossier stores reports and inferred hypotheses. It does not copy the world object.

```text
KnowledgeDossier
  subjectHypotheses[]
  supportingReportIds[]
  contradictingReportIds[]
  currentEstimate
  estimateAsOf
  confidenceDimensions
  analystRef
  doctrineUsed
  nextCollectionRequirements[]
```

Confidence should be multidimensional:

- source reliability;
- access quality;
- age;
- corroboration;
- transmission integrity;
- analytical confidence;
- known incentive to misrepresent.

Collapsing all of these into one “74% accurate” number destroys useful counterplay.

### Information decay

Old information does not merely fade to black. Different claims decay at different rates:

- bridge location: slow;
- army location: fast;
- unit identity: medium;
- commander temperament: slow but revisable;
- stored grain: seasonal and event sensitive;
- diplomatic intention: fast and strategically manipulable;
- road condition: weather sensitive.

### No hidden falsehood flag

The report object may be generated from a true or deceptive act, but the receiving polity cannot read a `false` field. It only sees evidence and provenance available through its channels. Debug mode may inspect generation truth.

### Intelligence requirements instead of map clicking

The player assigns collection priorities to an intelligence network, such as:

- warn of army movement toward three named passes;
- estimate whether a rival can sustain a six-week campaign;
- identify factions favoring a treaty;
- monitor grain purchase anomalies;
- trace leakage of one operational plan;
- assess whether an ally intends to honor a mobilization clause.

Agents decide how to collect within access, risk, budget, and doctrine.

## 4. Ancient accounting without turning ignorance into noise

### Historical findings

Ancient administrations could keep sophisticated local records, but information was periodic, geographically uneven, and institutionally mediated. Roman Egypt’s provincial census operated on a fourteen-year cycle for a long documented period ([Bagnall 1991](https://grbs.library.duke.edu/index.php/grbs/article/download/3811/5657/15553)). Roman taxation also shifted between decentralized tax farming and more hierarchical census-based administration, illustrating that collection method changed transaction costs, control, and incentives ([Gutiérrez and Martínez-Esteller 2022](https://link.springer.com/article/10.1007/s10602-021-09355-5)). Modern scholars themselves must reconstruct aggregate Roman population and output from contested evidence and proxies ([Scheidel 2007](https://homepages.uc.edu/~martinj/Latin/Roman_Population/Scheildel%20-%20Roman%20population%20Size.pdf); [Scheidel and Friesen 2009](https://piketty.pse.ens.fr/files/Scheidel2009.pdf)).

The last point does not prove precisely what every ancient ruler knew. It does caution against presenting a ruler with modern national accounts as though they were an ordinary ancient administrative artifact.

### Recommendation: three fiscal realities

For each resource, distinguish:

1. **Physical reality:** what is actually present in stores, fields, households, purses, and flows.
2. **Administrative account:** what collectors, quartermasters, governors, and merchants record as owned, owed, collected, or dispatched.
3. **Ruler’s estimate:** reports received and reconciled by the player’s administration.

Example:

```text
Granary at Ariminum
  last physical count: 8,100–8,500 measures, 18 days ago
  book balance: 9,240 measures
  scheduled claims: -2,000 army issue, +1,400 tax delivery
  current central estimate: 6,700–8,900
  confidence: moderate
  discrepancy concern: rising
```

This is more playable than either perfect truth or random error. The player knows why uncertainty exists and what can reduce it.

### Ways to improve knowledge

- conduct a census or land survey;
- standardize weights and measures;
- fund clerks and archives;
- count a treasury or granary physically;
- cross-audit collector, merchant, temple, and military records;
- rotate collectors;
- create an independent inspectorate;
- require seals and duplicate manifests;
- improve roads and courier relays;
- grant local self-assessment in exchange for fixed obligations;
- farm taxes for predictable central revenue while accepting extraction and agency risks.

Each method carries costs and political effects. A census consumes staff, creates resistance, exposes taxable wealth, and becomes stale. Aggressive audits can recover funds while damaging trust. Central clerks improve comparability but slow adaptation. Tax farming reduces state processing while strengthening private contractors.

### Interface rules

- Show ranges, categories, dates, and provenance—not fake decimal precision.
- Make exact counted assets possible where causally justified, but date the count.
- Show a forecast as scenarios: expected, adverse, and favorable.
- Put complete ledgers in an optional archive.
- Keep the main map focused on constraints: “two months of grain at normal issue,” not twelve unrelated resource bars.
- Let debug UI reveal physical truth and error decomposition.

**Project inference:** improving administrative knowledge is itself a strategic investment. Information should compete with roads, soldiers, patronage, and reserves for resources.

## 5. Informant networks, espionage, counterintelligence, and deception

### Historical inspiration

Sun Tzu’s intelligence chapter distinguishes local, internal, converted, sacrificial, and surviving spies and explicitly treats planted information as a means of deception ([The Art of War, chapter 13](https://classics.mit.edu/Tzu/artwar.html)). Frontinus catalogued concealment, reconnaissance, diversion, ambush, false weakness, and environmental stratagems as concrete command practices ([Frontinus, *Stratagems*, Book I](https://en.wikisource.org/wiki/Stratagems/Book_1); [Book III](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Frontinus/Strategemata/3%2A.html)). Caesar’s own narrative repeatedly depends on scouts, messengers, hostages, local allies, deserters, and intercepted intentions ([Caesar, *Gallic War*](https://classics.mit.edu/Caesar/gallic.html)).

These sources are evidence that intelligence and deception belong in an ancient strategy game. They are not balance specifications.

### Network model, not collectible super-agents

An intelligence capability is a graph of access relationships:

```text
IntelligenceNetwork
  sponsor
  handlerCells[]
  contacts[]
  communicationEdges[]
  collectionDoctrine
  reportingCadence
  budgetEnvelope
  compartmentationPolicy
  compromiseState
```

A contact has:

- location and social access;
- cover role;
- observed reliability history;
- loyalty and motive;
- handler relationship;
- communication method;
- exposure risk;
- topics it can plausibly observe;
- knowledge of other network members.

Village headmen, innkeepers, merchants, drovers, ferrymen, garrison clerks, camp followers, slaves, courtiers, envoys, moneylenders, and deserters provide different access. A road network may warn about mass movement without revealing the enemy plan. A court source may reveal intent but not whether the army can execute it.

### Building a network

The player chooses:

- target region or institution;
- cover and recruitment channel;
- collection priority;
- acceptable exposure;
- funding reliability;
- compartmentation;
- reporting urgency.

The network develops through local action and time. It does not instantly illuminate a province.

### Counterintelligence as a trade space

Useful actions include:

- compartment plans by role;
- restrict access to march tables and supply contracts;
- vary courier routes and reporting schedules;
- require seals, countersigns, and paired confirmation;
- investigate unexplained enemy anticipation;
- audit handlers and payment trails;
- turn a discovered agent;
- feed different itineraries to suspected leak channels;
- protect key bridge, depot, and council personnel;
- increase local trust so residents report suspicious outsiders.

Security should never be a single slider with only upside:

- compartmentation reduces leakage but harms shared understanding;
- aggressive vetting can remove spies but reduce initiative and loyalty;
- secret orders conceal intent but arrive with less context;
- frequent code changes reduce interception value but increase friendly error;
- centralized intelligence improves synthesis but creates a high-value hub.

Network research shows why hubs create both efficiency and vulnerability: heterogeneous networks can tolerate many random failures yet remain highly exposed to targeted removal of central nodes ([Albert, Jeong, and Barabási 2000](https://arxiv.org/abs/cond-mat/0008064)).

### Deception must alter observables

There should be no magic “deceive enemy” roll. The player or AI performs costly acts that other actors can observe:

- construct a false camp;
- light excess fires;
- stage public requisitions on one road;
- move empty wagons;
- leak a dated itinerary to a selected channel;
- send a genuine diplomatic demand whose rejection supports mobilization;
- split a force behind a screen;
- conceal bridge material in merchant traffic;
- announce a levy but delay assembly;
- let a turned agent transmit curated truth plus one decisive falsehood;
- fortify visibly in one theater while building depots in another.

Each deception has:

- preparation and opportunity cost;
- a set of observable signatures;
- channels likely to carry those signatures;
- consistency requirements;
- risk of friendly confusion;
- consequences if exposed;
- a target belief or behavior, not a guaranteed result.

### The receiving side

Both human and AI analysts maintain competing hypotheses:

```text
H1: northern invasion
H2: coercive mobilization to improve treaty terms
H3: demonstration masking an eastern march
H4: genuine preparation later canceled by supply failure
```

Collection orders seek discriminating evidence. The system should reward asking “what observation would separate these explanations?” rather than merely purchasing more vision radius.

### Information can be cheap talk or a costly signal

Strategic communication is less informative when sender and receiver interests diverge; Crawford and Sobel formalize how bias can coarsen information even without explicit lying ([Crawford and Sobel 1982](https://econweb.ucsd.edu/~vcrawfor/CrawfordSobel82EMT.pdf)). Cost can improve credibility, but modern experimental work warns that receivers do not automatically interpret sunk costs as signalers expect ([Quek 2016](https://papers.ssrn.com/sol3/Delivery.cfm/SSRN_ID2783685_code1635991.pdf?abstractid=2256528&mirid=1&type=2)).

**Project inference:** AI assessment must model the receiver’s doctrine, prior beliefs, and interpretation—not treat “signal cost” as a universal credibility bonus.

## 6. Logistics, supply, and trade as one contested material network

### Historical findings

Roman military logistics centered heavily on food, fodder, fuel, transport, foraging, storage, operational bases, and supply routes. Erdkamp’s study emphasizes both the scale of forward planning and the interaction between military supply and the civilian economy ([review and chapter summary](https://bmcr.brynmawr.edu/1999/1999.11.01/); [book contents](https://external.dandelon.com/download/attachments/dandelon/ids/DE006F8FA6D7A43FA992DC1257A3600443008.pdf)). The Roman state courier infrastructure facilitated official travel and urgent communication, but was not a modern universal mail system and was not itself sufficient for mass army provisioning ([Kolb, “Transport and Communication in the Roman State”](https://sites.lsa.umich.edu/paul-in-athens/wp-content/uploads/sites/1400/2025/03/Kolb-2001-compressed.pdf)).

Historical trade research also supports making political fragmentation, tolls, insecurity, and protection costs matter to route viability rather than treating a trade agreement as an abstract income switch ([Blaydes and Paik 2021](https://blaydes.people.stanford.edu/sites/g/files/sbiybj24621/files/media/file/silk2.pdf)).

### One physical graph

Use common nodes and edges for civilian and military movement:

**Nodes**

- farms and pastoral zones;
- villages and towns;
- markets;
- river landings and ports;
- mines and workshops;
- granaries and depots;
- forts and camps;
- bridges, fords, and passes.

**Edges**

- roads and tracks;
- navigable rivers;
- coastal and open-sea routes;
- mountain paths;
- seasonal corridors.

Each edge has capacity, travel time, weather response, security belief, tolls, maintenance, animal suitability, and current congestion.

### Flows, not teleportation

At a useful aggregation level, model:

- grain/food;
- fodder/animal condition;
- water access where operationally constraining;
- pay/coin/credit;
- weapons and replacement equipment;
- recruits/replacements;
- high-value trade goods;
- messages and officials.

Do not create dozens of resources solely for flavor. A resource deserves explicit simulation when it produces a distinct strategic decision or counterplay.

### Army supply behavior

An army owns stores, animals, servants, contracts, requisition authority, and a consumption forecast. Supply condition degrades continuously rather than switching from “supplied” to “attrition.”

Possible consequences by stage:

1. reduce ration quality and training;
2. increase foraging radius and local price pressure;
3. consume draft/pack animal condition;
4. slow march and abandon heavy stores;
5. reduce cohesion, health, morale, and obedience;
6. increase desertion, theft, disease, and civilian hostility;
7. halt, disperse, or retreat under commander doctrine.

Different force compositions create different logistical footprints. Heavy cavalry can be dominant on suitable ground while becoming a liability when fodder, roads, or animal recovery fail. This is a material answer to universal “best army” templates.

### Foraging and requisition

Foraging transfers a problem; it does not delete it.

- It feeds the army now.
- It depletes local stores and seed reserves.
- It changes prices and migration.
- It can damage legitimacy and intelligence cooperation.
- It may reveal the army’s size and intended route.
- It can deny resources to a pursuing enemy.
- Discipline and payment policy change the political cost.

### Trade routes should emerge

Merchants choose expected-profit routes from:

- local supply and demand;
- transport capacity and cost;
- tolls and tariffs;
- piracy/bandit/interdiction risk as merchants perceive it;
- legal reliability and contract enforcement;
- seasonal closure;
- credit and trusted partners;
- war and embargo restrictions.

A trade treaty changes access, tariffs, liability, dispute resolution, convoy rights, and confidence. It does not create trade from nothing.

### Player actions

- patrol or escort a corridor;
- fortify a bridge or harbor;
- subsidize a depot;
- maintain a road;
- charter a market or merchant association;
- guarantee losses on a strategic route;
- negotiate transit and resupply rights;
- establish convoy doctrine;
- contract local supply;
- ration army issue;
- pre-position stores;
- destroy, evacuate, or poison stores during retreat;
- raid a route, seize shipping, or pressure insurers and lenders.

### Route governance can be polycentric

A road, harbor, pasture, irrigation system, or convoy corridor need not be owned and operated by one sovereign menu. Cities, villages, merchants, temples, landholders, clients, and military officials can share provision and protection through negotiated rules. Ostrom’s research on durable common-pool institutions emphasizes legible boundaries, participation in rule-making, monitoring, graduated sanctions, accessible conflict resolution, and nested governance rather than assuming that only pure central control or pure privatization can work ([Ostrom 1990](https://www.actu-environnement.com/media/pdf/ostrom_1990.pdf); [Ostrom 2008 summary](https://www.conservation-strategy.org/sites/default/files/field-files/Ostrom_Challenge_of_Common_Pool_Resources_Environment_JulyAug_2008_1.pdf)).

**Project inference:** a route compact can specify which communities maintain each segment, who patrols, who pays after a raid, which tolls are lawful, how disputes are heard, and when the army may requisition transport. A locally legitimate compact may outperform direct administration but be harder to redirect instantly. This creates economic institution-building without a settlement build-tree.

### Why this creates emergent play

The same route that enriches a frontier also:

- feeds its garrison;
- carries tax remittances;
- attracts migrants and informants;
- reveals commercial anomalies;
- creates a vulnerable bridge or port;
- gives an invader a prepared axis;
- gives the ruler a reason to protect a formally independent client.

Network interdiction is strategically rich because attacking an edge can disrupt the attacker too, directly or through lost trade and alternative routing. Formal interdiction models likewise treat defense and disruption as coupled choices rather than a free attack on supply ([Hong 2010](https://ideas.repec.org/p/van/wpaper/1010.html); [contested logistics model, 2024](https://www.mit.edu/~gfarina/2024/2024_gamesec_contested_logistics/2024_gamesec_contested_logistics.pdf)).

## 7. The polity is a multi-agent coalition

### Research finding

Principal-agent theory studies delegation when the principal cannot perfectly observe or align the agent’s action. It highlights adverse selection, moral hazard, monitoring, incentives, and institutional mediation ([Gailmard 2012](https://www.law.berkeley.edu/archive/files/csls/Gailmard_-_Accountability_and_Principal-Agent_Models%282%29.pdf)). Agent-based organization research similarly treats organizational performance as emerging from communication, information-processing allocation, decision rights, and incentives among agents ([Chang and Harrington 2006 overview](https://joeharrington5201922.github.io/pdf/HCE-12.05.pdf)).

### Recommendation: offices, not obedient menus

A polity contains agents and organized constituencies such as:

- ruler or magistrates;
- council, senate, assembly, or court;
- provincial governors;
- tax collectors and contractors;
- generals and garrison commanders;
- cities and local elites;
- temples and religious authorities;
- merchant groups;
- landholders and creditors;
- soldiers and veterans;
- subject communities, allies, and clients.

Each actor has:

- material interests;
- status and legitimacy needs;
- relationships and obligations;
- beliefs based on its own reports;
- competence and doctrine;
- risk tolerance;
- authority and resources;
- memory of promises, rewards, harms, and precedent.

### Offices as contracts

An appointment specifies:

- jurisdiction;
- goals and priorities;
- delegated powers;
- budget and revenue rights;
- reporting duties;
- tenure and removal rules;
- performance measures;
- legal immunities;
- patronage expectations;
- audit exposure;
- emergency discretion.

This makes appointments genuine strategy. A brilliant, locally connected governor may be effective but hard to control. A loyal novice produces clean reports and poor outcomes. A tax farmer provides predictable central remittance while having incentives to extract more than the center sees.

### Divergence without random treachery

An agent should depart from intent because one or more of these is true:

- it received different information;
- the order was delayed, ambiguous, or obsolete;
- local doctrine authorized initiative;
- its constituency would punish compliance;
- promised resources did not arrive;
- it expects the center to break its bargain;
- private gain exceeds expected sanction;
- it is incompetent or overwhelmed;
- it believes disobedience better serves the stated strategic end.

The player receives evidence of causes, not a hidden “disloyalty proc.”

### Doctrine is the scalable control surface

Possible provincial doctrine:

```text
Primary intent: keep the northern road open and avoid general revolt.
Tax posture: collect assessed obligation; defer arrears after verified crop failure.
Security posture: patrol roads; do not enter temple precincts without civil request.
Military authority: mobilize local levy only on confirmed incursion.
Diplomatic latitude: may renew existing client compacts; new tribute requires approval.
Reporting: weekly summary; immediate report for border force above cohort estimate.
Risk tolerance: preserve force over defending unwalled villages.
```

The doctrine gives a competent agent room to adapt. U.S. Army mission-command doctrine is modern rather than ancient evidence, but its principles—competence, trust, shared understanding, intent, mission orders, disciplined initiative, and accepted risk—provide a useful formal vocabulary for this interaction ([ADP 6-0](https://armypubs.army.mil/epubs/DR_pubs/DR_a/ARN34403-ADP_6-0-000-WEB-3.pdf)).

### Accountability tools

- regular accounts;
- independent inspectors;
- overlapping civil and military reports;
- local petitions;
- term limits or rotation;
- bonds, hostages, sureties, and family ties;
- revenue sharing;
- public law and appeals;
- performance-based discretion;
- deliberate redundancy in high-risk offices.

Every tool has a cost. More oversight consumes scarce capable people, slows action, and can make agents optimize reported measures instead of real outcomes.

## 8. Diplomacy, credible commitments, and strategic bargaining

### Research findings

Fearon’s rationalist account identifies private information with incentives to misrepresent and commitment problems as central reasons costly wars can occur even when bargains exist that both sides would prefer to war ([Fearon 1995](https://slantchev.ucsd.edu/courses/pdf/fearon-io1995v49n3.pdf)). North and Weingast show how institutions that constrain opportunism can make commitments more credible and thereby support investment ([North and Weingast 1989](https://www.cambridge.org/core/journals/journal-of-economic-history/article/constitutions-and-commitment-the-evolution-of-institutions-governing-public-choice-in-seventeenthcentury-england/2E0D2B2D3490BE5C556D836ACB096362)). Repeated-game research shows how continued interaction, reciprocity, and the prospect of future encounters can support cooperation under some conditions ([Axelrod and Hamilton 1981](https://pubmed.ncbi.nlm.nih.gov/7466396/)).

These theories do not imply that every repeated relationship becomes peaceful. They provide mechanics for why monitoring, future value, incentives, and enforceability matter.

### Replace the relation scalar

Maintain separate beliefs about another actor:

- alignment of interests;
- honesty of reports;
- reliability in fulfilling obligations;
- capacity to fulfill obligations;
- resolve;
- propensity for opportunism;
- grievance and fear;
- domestic freedom of action;
- personal relationships between decision makers;
- precedent in particular domains.

An ally can be honest but incapable, reliable in trade but not war, friendly but politically constrained, or hostile yet credible.

### Treaties are executable contracts

A treaty contains clauses:

```text
TreatyClause
  obligors[]
  beneficiaries[]
  requiredAction
  triggerCondition
  performanceWindow
  verificationMethod
  exceptions[]
  collateralOrHostage
  guarantorsOrWitnesses[]
  breachConsequences
  terminationRule
  publicity
```

Examples:

- transit access for named forces on named roads;
- grain delivery at a port by a date range;
- mutual defense against specified aggressors;
- arbitration by a temple or neutral city;
- hostage exchange;
- marriage and succession recognition;
- tariff ceiling and merchant liability;
- fixed tribute with protection obligations;
- border demilitarization verified by patrol access;
- prisoner return and ransom schedules;
- intelligence sharing limited to one theater.

### Credibility can be built materially

- put money or hostages at risk;
- make reciprocal investments;
- grant monitoring access;
- involve domestic groups that benefit from compliance;
- publish an oath or law that raises political cost of defection;
- transfer control of a fort or crossing;
- sequence performance in small reciprocal steps;
- use a third-party guarantor;
- make the promise narrow enough to be feasible.

### AI bargaining

AI should estimate:

- peaceful bargaining range;
- beliefs about strength and resolve;
- commitment risk after relative power shifts;
- domestic constraints on both sides;
- likelihood that an offer is deception;
- value of time, delay, and mobilization;
- enforceability of each clause;
- reputational effects with third parties.

War should sometimes result from misperception or inability to commit, not because a hidden aggression meter filled. Peace should remain strategically meaningful when war is unnecessary.

## 9. Political and economic victory

### Problem

If every victory condition ultimately requires conquest, diplomacy and economics are support systems for one military game. That makes alternative victory labels cosmetic.

### Recommendation: campaigns have a constitutional project

At campaign start—or through an early political settlement—the player commits to a broad historical project. It may evolve, but changing it has constituency and legitimacy consequences.

Possible end states:

#### Secure commonwealth

- homeland and core partners are safe from credible conquest;
- public order and succession/constitutional continuity are durable;
- key constituencies accept the settlement;
- fiscal obligations can be met without emergency extraction;
- rivals recognize borders or lack a viable revisionist coalition.

#### Acknowledged hegemony

- major powers accept arbitration, tribute, alliance leadership, or strategic limits;
- the player can mobilize partners without occupying them;
- principal routes and frontier systems are defensible;
- recognition persists across a succession or leadership transition.

#### Commercial commonwealth

- a large share of valuable trade uses routes and legal institutions the polity protects;
- merchants and partner cities voluntarily maintain the system;
- credit and contract reputation survive a major shock;
- economic predominance does not require direct annexation.

#### Republican or constitutional settlement

- offices transfer according to accepted rules;
- no single army or magnate can cheaply seize the state;
- disputes are resolved through institutions under stress;
- fiscal and military capacity coexist with meaningful constraints.

#### Independence or liberation

- external tribute and garrisons are removed;
- domestic coalition survives retaliation;
- allies or terrain create a durable deterrent;
- the new order is recognized or self-sustaining.

#### Dynastic security

- succession is recognized by decisive domestic and foreign actors;
- marriage, hostage, client, and military networks support continuity;
- rivals lack a plausible claimant coalition;
- the treasury and army can survive transition.

### Victory is recognition of a durable equilibrium

Avoid progress-bar victory where “1000 commerce points” instantly ends history. A victory should be offered when the simulation detects a robust settlement and relevant actors acknowledge it.

The player may:

- accept the settlement and receive an epilogue;
- continue in legacy mode;
- reject it and pursue a more ambitious project, accepting new risk.

### Ending before mop-up

Once no opponent or coalition has a plausible path to contest the chosen project, require proof through one stress test—succession, failed harvest, frontier invasion, or alliance dispute—rather than conquering every minor settlement. The game should know when its strategic question has been answered.

## 10. Anti-snowball dynamics without rubber-banding

### Research findings

State capacity is not free or instantaneous; fiscal and legal capabilities are investments that condition what policy can actually accomplish ([Besley and Persson 2009](https://www.aeaweb.org/articles?id=10.1257%2Faer.99.4.1218); [Dincecco and Wang 2022](https://yuhuawang.scholars.harvard.edu/file_url/245)). Structural-demographic work models instability as the interaction of popular pressure, elite competition, and state fiscal distress rather than as a random collapse event ([Turchin 2013](https://escholarship.org/content/qt6qp8x28p/qt6qp8x28p.pdf)). International-relations research also suggests that states often align against perceived threats based on power, proximity, capability, and apparent intention rather than automatically against the largest actor ([Walt 1985](https://www.rochelleterman.com/ir/sites/default/files/walt%201985.pdf)).

These literatures are contested and should inspire mechanisms, not be treated as deterministic laws.

### Causal counterforces to expansion

| Success creates | Strategic exposure | Player mitigation | Cost/tradeoff |
|---|---|---|---|
| More territory | Longer message and reinforcement time | Roads, relays, delegated authority | Maintenance, local burdens, agent autonomy |
| More revenue claims | More collectors, concealment, and arrears | Census, audit, standardized law | Resistance, bureaucracy, political intrusion |
| Longer frontier | More crossings, garrisons, and warning needs | Clients, forts, mobile reserves | Dependence, fixed costs, exposed routes |
| Larger army | More food, fodder, pay, and loyalty concentration | Depots, rotation, multiple commands | Expense, slower coordination, rivalry |
| More elites | More claims on offices and spoils | Broader coalition, rules, honors | Diluted control, fiscal commitments |
| More subject communities | More heterogeneous legitimacy and law | Autonomy, citizenship, negotiated obligations | Reduced extraction, precedent |
| More trade concentration | More wealth and route dependence | Redundancy, naval protection, stockpiles | Lower efficiency, ongoing patrol cost |
| More visible power | Greater perceived threat | Restraint, guarantees, clients, transparency | Foregone conquest, commitments |
| More centralized intelligence | Better synthesis but vulnerable hubs | Compartmented redundancy | Duplication and slower sharing |

### No generic empire-size penalty

Every burden should be traceable to actual entities and channels:

- a distant province is difficult because its courier route takes time and its governor has discretion, not because it is the twenty-first province;
- a rebellion is possible because grievances connect to organizers, resources, elite sponsors, and an opportunity, not because unrest exceeded 100;
- a coalition forms because neighboring actors perceive capability and intention as threatening, not because the player crossed a score threshold;
- armies fail because their routes, stores, animals, pay, and commanders fail, not because they crossed an invisible attrition border.

### Success must still matter

Anti-snowballing should not erase earned advantage. A wealthy, well-governed empire should be stronger. The challenge is that strength creates a new class of decisions:

- direct rule versus federated clients;
- central standards versus local adaptation;
- one decisive army versus resilient theater forces;
- efficient hub routes versus redundant networks;
- extraction now versus legitimacy and capacity later;
- intimidating rivals versus reassuring them.

### Internal crisis should be legible and preventable

Model crisis formation through:

```text
grievance + organization + resources + elite sponsorship
+ permissive security conditions + triggering event
```

The player can act on different terms: address grievance, split organizers, co-opt sponsors, secure routes, remove a trigger, or repress. Each choice affects future institutional trust. Avoid repetitive, ownerless rebel stacks.

## 11. Strategic depth through interacting constraints

The goal is not maximum component count. It is a small set of systems whose outputs become one another’s inputs.

The MDA framework usefully distinguishes authored mechanics from the dynamics they generate and the player experience those dynamics create ([Hunicke, LeBlanc, and Zubek 2004](https://www.cs.northwestern.edu/~hunicke/MDA.pdf)). Self-determination research finds autonomy, competence, and relatedness predictive of game enjoyment and continued play ([Ryan, Rigby, and Przybylski 2006](https://selfdeterminationtheory.org/SDT/documents/2006_RyanRigbyPrzybylski_MandE.pdf)).

**Project inference:** systemic mechanics should generate understandable surprise and multiple viable responses, while the interface preserves the player’s sense of authorship and learning.

### Shared primitives with high recombination value

Prioritize:

- terrain and weather;
- routes and transport capacity;
- local inventories and production;
- actors and relationships;
- message/report packets;
- authority and doctrine;
- legitimacy by constituency;
- enforceable contracts;
- beliefs and hypotheses.

Avoid adding isolated minigames that do not alter these primitives.

### Interaction examples

| Player action | Immediate effect | Indirect consequences | Counterplay |
|---|---|---|---|
| Build a road | Faster movement and lower transport cost | More trade, taxation, migration, intelligence traffic, invasion access | Fort crossings, patrol, alternative route |
| Conduct a census | Better tax and manpower assessment | Resistance, elite exposure, bureaucratic load, future recruitment knowledge | Hide assets, bargain exemptions, corrupt clerks |
| Fortify a pass | Stronger denial and early warning | Draws trade and garrison demand; signals strategic concern | Bypass, blockade, infiltrate, force another theater |
| Requisition grain | Sustains army immediately | Raises prices, harms seed stocks and legitimacy, reveals route | Evacuate stores, sabotage records, mobilize local opposition |
| Grant provincial autonomy | Reduces central workload and may improve legitimacy | Less direct revenue/control; empowers local elite | Hostages, audits, shared institutions, rival patronage |
| Guarantee a trade route | Encourages merchants and credit | Creates protection obligation and predictable patrols | Raid elsewhere, stage false attacks, raise insurance cost |
| Publicly mobilize | Improves readiness and may deter | Costs money, reveals intent, frightens neighbors | Countermobilize, bargain, feint, wait out expense |
| Compartment a war plan | Reduces leak surface | Slows coordination and weakens subordinate understanding | Infer through logistics, target couriers, provoke early decision |
| Forgive tax arrears | Relieves distress and builds legitimacy | Reduces treasury and may create precedent | Demand proof, target relief, offer rival patronage |
| Appoint a powerful local | Gains competence and networks | Raises autonomy and succession risk | Split authority, marry/hostage bond, term limit, integrate heirs |

### Geography should alter feasible plans

The map must model more than movement multipliers:

- water access constrains camps and routes;
- mud affects animal condition, carts, formation, disease, and resupply;
- slopes, bluffs, riverbanks, woods, and gorges create observation and battle-preparation options;
- harvest season changes local stores and labor availability;
- river and sea transport can transform supply economics;
- winter quarters, depots, and bridge material make some campaigns possible;
- destroying a crossing can save a frontier while isolating friendly trade.

The strategic layer should pass material conditions into the tactical battle: arrival fatigue, provisions, weather, prepared works, local guides, intelligence quality, terrain familiarity, reinforcement timing, and escape routes.

## 12. Avoiding spreadsheet play

### Research foundation

Ecological interface design argues for making the constraints and relationships of a complex work domain perceptually available so people can adapt even to unanticipated situations ([Vicente and Rasmussen 1992](https://backend.orbit.dtu.dk/ws/files/158017888/SMC.PDF); [open MIT overview](https://direct.mit.edu/books/oa-monograph/chapter-pdf/2246883/c003900_9780262369886.pdf)). Automation research distinguishes information acquisition, analysis, decision selection, and action implementation, allowing different degrees of assistance at each stage rather than one global automation setting ([Parasuraman, Sheridan, and Wickens 2000](https://pubmed.ncbi.nlm.nih.gov/11760769/)).

### Primary interface: a map of commitments and constraints

The default campaign screen should answer:

1. What changed?
2. Why might it matter?
3. How sure are we?
4. Who is responsible?
5. What doctrine will govern the response if I do nothing?
6. Which commitment or threshold requires my decision?

### Information layers

#### Layer 1: command view

- current strategic projects;
- protected regions and routes;
- active commitments;
- unresolved exceptions;
- confidence-coded threat areas;
- supply endurance and timing at decision scale;
- delegated agents and their intent.

#### Layer 2: dossiers and route views

- report timeline and provenance;
- competing hypotheses;
- treaty obligations;
- route capacity, risk, and dependencies;
- governor/commander doctrine and discretion;
- uncertainty ranges.

#### Layer 3: archive and analysis

- full ledgers;
- historical charts;
- price and harvest series;
- accounts and audits;
- decision traces;
- counterfactual replay where permitted.

#### Debug layer

- world truth;
- actor private state;
- error decomposition;
- AI plan and doctrine trace;
- provenance audit;
- system health metrics.

### Use dispatches, not omniscient notifications

A message should read like an actionable report:

> Two independent merchants report unusually large grain purchases at Narnia over the last nine days. A road contact saw military wagons northbound three days ago. The governor assesses a northern concentration as plausible but cannot distinguish invasion from winter provisioning. Existing doctrine will reinforce the ford watch and avoid mobilizing the levy unless a formed unit is observed.

The interface may summarize this, but it should retain source, age, uncertainty, and delegated response.

### Management by exception

Routine operations continue under:

- budget envelopes;
- doctrine thresholds;
- appointment authority;
- recurring contracts;
- logistics policies;
- report schedules;
- alert rules.

The player’s recurring verbs are:

- **set intent**;
- **allocate means**;
- **appoint/delegate**;
- **investigate uncertainty**;
- **commit or bargain**;
- **revise doctrine after evidence**.

They should not be “click every farm,” “renew every trader,” or “move every spy.”

### Automation must remain inspectable

Automation should expose:

- what it is trying to preserve;
- what it may spend;
- which evidence it uses;
- when it will ask;
- what it did since the last review;
- why it deviated.

Otherwise a late-game empire becomes either a click burden or a machine the player merely watches. Human-factors work specifically warns that highly autonomous systems can create poor monitoring and “automation surprise” when state and rationale are opaque ([FAA Human Factors Design Standard, automation chapter](https://hf.tc.faa.gov/hfds/download-hfds/hfds_pdfs/Ch3_Automation.pdf)).

## 13. Grand-strategic AI: coherent plans without omniscience

The target is not an AI that always finds a globally optimal move. It is an AI whose actions form a recognizable, adaptive strategy under the same information and communication constraints as the player.

### Truth firewall

Every AI decision must be auditable:

```text
DecisionTrace
  actorId
  decidedAt
  goalContext
  reportsRead[]
  dossiersRead[]
  doctrineRulesFired[]
  hypothesesConsidered[]
  coursesOfAction[]
  selectedAction
  expectedEffects
  riskAssessment
  authoritySource
  ordersEmitted[]
```

An automated test should fail if a non-material AI planning function reads hidden world state, enemy private state, or a debug truth field.

### Do not build one giant polity FSM

Use concurrent, hierarchical agents and FSMs:

#### Polity strategic stance

- recover;
- consolidate;
- compete;
- coerce;
- prepare war;
- wage limited war;
- wage regime-threatening war;
- exploit settlement;
- seek accommodation.

#### Theater plan per frontier

- observe;
- reassure;
- deter;
- screen;
- raid;
- defend in depth;
- concentrate;
- invade;
- disengage.

#### Fiscal/institutional plan

- conserve reserve;
- build capacity;
- fund mobilization;
- relieve distress;
- restore credit;
- audit leakage.

#### Intelligence plan

- early warning;
- capability estimate;
- intent assessment;
- deception support;
- counterintelligence;
- diplomatic influence.

These processes negotiate for means through institutions. A polity can reassure one frontier, raid another, audit a province, and court a third power simultaneously without an incoherent single “aggressive mode.”

### Doctrine library

A strategic doctrine contains:

```text
StrategicDoctrine
  purpose
  applicableConditions
  assumptions
  indicators
  desiredEffects
  protectedAssets
  acceptableCosts
  authorityRules
  coursesOfAction[]
  commitmentThresholds
  abortThresholds
  branches[]
  sequels[]
  reportingRequirements
  deceptionOpportunities
```

Examples:

- Fabian delay against a materially superior invader;
- deterrence by visible reserve and defensible route;
- isolate a target diplomatically before mobilization;
- force an enemy army to consume a devastated corridor;
- support a client without triggering a balancing coalition;
- threaten one theater to secure concessions in another;
- trade autonomy for reliable frontier defense;
- raid supply and avoid decisive battle.

### AI planning loop

1. Receive reports.
2. Update dossiers and competing hypotheses.
3. Detect violated assumptions or thresholds.
4. Review relevant doctrine.
5. Generate feasible courses of action from believed—not true—resources and routes.
6. Ask subordinate actors for feasibility reports when time permits.
7. Estimate reactions of other actors.
8. Select an action based on goals, risk, legitimacy, commitments, and agent authority.
9. Emit actual orders through communication channels.
10. Monitor indicators and revise when reports arrive.

### Deception-aware but not paranoid

The AI should:

- maintain more than one hypothesis where evidence supports it;
- assign collection tasks to reduce decision-relevant uncertainty;
- evaluate consistency across logistics, diplomacy, and movement;
- understand that some observables are costly to fake;
- learn opponent habits without treating history as certainty;
- sometimes accept calculated risk instead of waiting for perfect information.

### Difficulty settings without cheats

Difficulty may alter:

- breadth and quality of doctrine library;
- number of hypotheses retained;
- planning horizon and branch depth;
- quality of source evaluation;
- coordination and staff competence within simulated bounds;
- ability to learn opponent patterns;
- deception repertoire and consistency checking;
- willingness to revisit a failing plan;
- institutional adaptation;
- initial strategic situation, disclosed to the player.

Difficulty should not alter:

- hidden income multipliers;
- combat damage or morale;
- free units;
- instant orders;
- exact knowledge of player state;
- immunity to supply, politics, or treaty constraints;
- target selection from hidden unit IDs or private intentions.

An adversarial starting scenario is legitimate if disclosed: the enemy may genuinely have more population, wealth, allies, or veteran forces. The objection is to invisible rules that make identical actors behave differently solely because one belongs to the AI.

## 14. Boredom, scale, and the late game

### Diagnosis

Late-game boredom usually combines:

- solved opposition;
- positive feedback from prior success;
- growing object count;
- unchanged decision granularity;
- repetitive operations;
- delayed formal victory;
- automation that either does too little or hides too much.

The answer is not merely stronger endgame enemies. A scripted crisis can briefly raise numbers while leaving the underlying strategic problem solved.

### Principle: scale changes the player’s role

Early campaign:

- know individual officials and routes;
- negotiate local coalitions;
- inspect a few critical stores;
- command one main theater closely.

Middle campaign:

- establish provincial doctrines;
- design tax, military, and intelligence institutions;
- manage alliance systems and multiple routes;
- appoint and compare agents.

Late campaign:

- choose constitutional and imperial structure;
- allocate attention among theaters;
- resolve exceptions and succession risks;
- shape external order through clients, guarantees, law, and trade;
- decide when the political project is complete.

### Automation as an earned institution

The player does not unlock a magical “auto-manage” button. Reliable delegation emerges from:

- competent agents;
- clear doctrine;
- trustworthy reports;
- aligned incentives;
- bounded authority;
- effective audits;
- institutional memory;
- trained replacements.

This connects training, leadership, and administration to reduced micromanagement—a powerful intrinsic reward.

### Preserve consequential exceptions

As the polity grows, routine event count should be summarized more aggressively, while genuinely novel interactions remain prominent:

- a governor interprets autonomy in an unexpected but defensible way;
- two trade protections conflict;
- a client’s local war activates treaty ambiguity;
- an informant network reveals that a trusted audit channel is compromised;
- a succession changes how rivals interpret prior commitments;
- a new road solves supply but frightens a neighbor.

### Chapters and closure

Organize campaigns around strategic chapters with explicit questions:

- Can the coalition survive?
- Can the state finance defense without destroying legitimacy?
- Can the frontier system become self-sustaining?
- Can victory be converted into a durable peace?
- Can succession occur without civil war?

When a question is answered, change the strategic scale or offer closure. Do not make the player repeat the proof across fifty provinces.

## 15. Integrated gameplay loops

### Loop A: protected trade corridor

1. Merchants discover a profitable route through three politically distinct regions.
2. Trade raises local prices, tax potential, migration, and bandit opportunity.
3. The player guarantees passage and appoints patrol responsibility.
4. A partner demands toll rights; another fears military access.
5. A rival can raid, bribe a crossing official, circulate threat rumors, or offer safer passage.
6. Informants embedded in inns and depots report anomalies with varying reliability.
7. The player can militarize the route, federate its protection, diversify it, or accept risk.
8. Commercial victory becomes a maintained political network, not a treaty checkbox.

### Loop B: army preparation and deception

1. A campaign plan identifies the harvest window, depot chain, bridge requirement, and diplomatic isolation needed.
2. Requisitions and contracts produce observable signatures.
3. Counterintelligence limits who sees the plan but cannot hide all material preparation.
4. A false public concentration and genuine secondary supply purchase create competing enemy hypotheses.
5. The enemy commissions discriminating reports and may counter-deceive.
6. The player commits based on the opponent’s believed reaction, not a “deception success” notification.
7. Tactical battle conditions reflect who controlled timing, route, terrain preparation, and intelligence.

### Loop C: provincial governance

1. A province owes grain, troops, and road security.
2. Crop failure creates conflict among obligation, army supply, and local survival.
3. The governor delays remittance under doctrine and reports an estimate.
4. A contractor alleges concealment; local petitions allege collector abuse.
5. The player can audit, grant relief, replace officials, borrow, requisition elsewhere, or accept military risk.
6. The choice updates legitimacy, credit, elite expectations, and future reporting incentives.

### Loop D: peace without naivety

1. Two states prefer peace but expect relative power to change.
2. Neither trusts a bare non-aggression promise.
3. They construct a staged agreement: hostage exchange, border observation, scheduled grain trade, third-party arbitration, and limits on one fort.
4. Domestic groups gain from compliance and report breaches.
5. A false alarm tests whether the institutions can prevent escalation.
6. Political victory can come from making peace credible, not from eliminating the other state.

## 16. Proposed strategic architecture

### Simulation domains

```text
StrategicWorldTruth
├── Physical geography and weather
├── Settlements, populations, production, and inventories
├── Routes, vehicles, ships, and flows
├── Armies and material readiness
├── Persons, households, offices, and organizations
├── Polities, laws, jurisdictions, and authority
├── Treaties, contracts, debts, and obligations
├── Reports, messages, couriers, and interceptions
└── Events and immutable history
```

Each actor receives a private projection:

```text
ActorPrivateState
├── Beliefs and dossiers
├── Relationships and memories
├── Goals and values
├── Authority and obligations
├── Doctrine and standing plans
├── Private resources and secrets
└── Incoming/outgoing message queues
```

### Material action boundary

Only material resolvers read world truth:

- movement resolver;
- production/consumption resolver;
- market matching/flow resolver;
- combat/battle handoff resolver;
- detection/observation resolver;
- message transit/interception resolver;
- contract performance resolver;
- health/demography/environment resolver.

Cognition reads observations, reports, memories, doctrine, and private state. This mirrors the battlefield architecture’s no-telepathy boundary.

### Essential schemas for the first prototype

#### Route edge

```text
RouteEdge
  endpoints
  mode
  distance
  baseCapacity
  condition
  seasonalModifiers
  jurisdictionSegments[]
  tollRules[]
  patrolPresence[]
  observedRiskByActor{}
```

#### Office

```text
Office
  holder
  jurisdiction
  powers[]
  obligations[]
  budgetEnvelope
  revenueRights[]
  doctrineRef
  reportingSchedule
  auditRules[]
  tenureRule
```

#### Obligation

```text
Obligation
  parties[]
  trigger
  performance
  dueWindow
  verification
  exceptions[]
  securityOrCollateral
  breachProcedure
```

#### Strategic plan

```text
StrategicPlan
  intent
  assumptions[]
  desiredEffects[]
  protectedAssets[]
  phases[]
  assignedActors[]
  resourcesCommitted[]
  indicators[]
  decisionPoints[]
  branches[]
  abortCriteria[]
```

### Determinism and replay

- Seed all stochastic observation, travel, behavior, and environmental processes.
- Keep immutable event and report logs.
- Separate observer polling from simulation mutation.
- Make AI reconsideration deterministic for a given seed, message history, and doctrine.
- Record decision traces so a surprising outcome can be explained.
- Never let opening a chart, dossier, or debug panel alter simulation order.

## 17. Prioritized systems roadmap

This roadmap deliberately starts with a small headless strategic sandbox. Building a huge ancient world before validating information, delegation, and logistics would make the central design impossible to isolate.

### G0 — Grand-strategy invariants and audit harness

Priority: immediate foundation

Build:

- world-truth/private-knowledge boundary;
- immutable `ReportPacket` and `MessagePacket`;
- provenance and timestamp requirements;
- actor decision trace;
- deterministic event queue;
- architecture audit forbidding cognitive access to truth/private enemy fields.

Acceptance criteria:

- every AI decision lists the reports and doctrines it used;
- a test fails on direct hidden-state reads;
- two runs with the same seed and commands are identical;
- observer/debug polling cannot change outcomes.

### G1 — Continuous-time command kernel

Priority: first playable substrate

Build:

- pause and speed control;
- scheduled/event-based subsystem cadences;
- delayed messages and orders;
- standing doctrine;
- alert and briefing policy;
- no-retroactive-action behavior while paused.

Acceptance criteria:

- the player can leave routine actors alone for a simulated season;
- urgent reports arrive through real routes;
- time controls do not change material results;
- default alert policy produces manageable interruptions.

### G2 — Five-node logistics and trade vertical slice

Priority: first emergent system

Build:

- five settlements, two polities, two alternate corridors, one river/port route;
- food, fodder/animal condition, coin/credit, and one trade good;
- local stores, prices, route capacity, merchants, armies, depots, patrols, raids;
- treaty access and tariffs;
- supply forecast with uncertainty.

Acceptance criteria:

- trade routes emerge rather than being assigned;
- an army can fail without combat for understandable material reasons;
- protecting or interdicting a route has civilian, fiscal, intelligence, and military effects;
- at least three viable responses exist to a route disruption.

### G3 — Offices, delegation, and imperfect accounts

Priority: replaces province micromanagement

Build:

- governor, collector, commander, merchant, and inspector agents;
- office contracts and authority;
- book accounts versus physical stocks;
- audit, census, petition, relief, and replacement actions;
- competence, incentives, loyalty, and local constituency.

Acceptance criteria:

- delegated actors can adapt correctly without player orders;
- divergence has a visible causal trace;
- more oversight improves some information while costing time/resources/trust;
- player workload grows slower than polity size.

### G4 — Diplomacy as executable obligation

Priority: makes non-war strategy real

Build:

- clause-based treaties;
- monitoring, triggers, performance windows, breach and repair;
- multidimensional reputation and actor-specific beliefs;
- hostages/collateral/guarantors;
- bargaining AI using private information and commitment risk.

Acceptance criteria:

- materially different contracts can solve the same dispute;
- an AI can prefer enforceable compromise to war;
- breach attribution depends on reports and verification;
- allies may be willing but unable without being labeled treacherous.

### G5 — Informant networks and counterintelligence

Priority: builds uncertainty gameplay

Build:

- contact graph and access types;
- collection requirements;
- delayed reports and corroboration;
- source compromise, double agents, route interception;
- compartmentation and leak investigation;
- competing hypotheses for human and AI.

Acceptance criteria:

- information quality depends on topology and mission, not a vision radius;
- deception modifies actual observables;
- neither player nor AI receives a success/failure truth flag;
- a canary-style leak investigation can identify a channel probabilistically.

### G6 — Strategic plans, threat balancing, and non-cheating AI

Priority: coherent opposition

Build:

- concurrent polity/theater/institutional FSMs;
- doctrine library with assumptions, indicators, branches, and abort criteria;
- opponent modeling and learning;
- threat perception and coalition bargaining;
- planning under believed logistics.

Acceptance criteria:

- AI actions over a campaign can be summarized as a coherent plan;
- AI abandons a plan when its own indicators fail;
- AI can feint, bargain, deter, raid supply, and decline battle;
- difficulty changes reasoning and doctrine, not material rules.

### G7 — Political projects, anti-snowballing, and closure

Priority: validates full campaign arc

Build:

- constituency legitimacy;
- succession/constitutional stress;
- causal expansion burdens;
- external balancing based on perceived threat;
- political, commercial, hegemonic, independence, and dynastic settlements;
- victory recognition and continue option.

Acceptance criteria:

- at least three genuinely different strategic projects can win;
- conquest is not required for at least two;
- expansion creates traceable challenges without arbitrary size penalties;
- a dominant campaign ends before repetitive map cleanup.

### G8 — Player-facing command interface and archives

Priority: developed alongside every stage, finalized after systems stabilize

Build:

- map-first command view;
- briefing and exception inbox;
- provenance-aware dossiers;
- route and obligation overlays;
- doctrine editor at appropriate abstraction;
- archive charts and full ledgers;
- gameplay/debug separation.

Acceptance criteria:

- a player can explain why a key warning appeared;
- uncertainty is visible without numerical overload;
- common strategic actions require intent-level decisions, not bulk clicking;
- debug truth never leaks into gameplay UI.

## 18. Minimal grand-strategy vertical slice

Before a continent-scale campaign, build one scenario:

### Map

- five settlements;
- two alternate land corridors;
- one river or coastal route;
- one mountain pass;
- one politically disputed border market.

### Actors

- two polities;
- one semi-autonomous client;
- two governors;
- three commanders;
- merchants and local notables;
- one collector and one inspector per polity;
- small informant networks.

### Strategic problem

A poor harvest is forecast in one region while both powers contest a trade corridor and suspect the other is preparing war. The player can:

- negotiate monitored passage;
- pre-position stores;
- mobilize and risk frightening the rival;
- subsidize an alternate route;
- pressure the client;
- investigate purchases and movements;
- stage a feint;
- grant relief and accept military shortage;
- requisition and risk local opposition.

### Valid endings

- enforceable trade settlement;
- acknowledged client autonomy under joint guarantee;
- limited war and negotiated peace;
- decisive campaign enabled by preparation;
- internal political failure caused by extraction;
- route collapse and strategic withdrawal.

This slice exercises time, information, trade, supply, delegation, diplomacy, deception, and political consequences without needing hundreds of settlements.

## 19. Research and playtest program

### A/B prototypes

#### Time model

- continuous with pause and briefing policy;
- simultaneous weekly planning pulses over the same event kernel.

Measure:

- perceived strategic control;
- interruption burden;
- idle waiting;
- missed critical events;
- decision quality;
- preference by player style.

#### Information precision

- exact dashboard values;
- ranges with provenance and audit actions.

Measure:

- confidence calibration;
- quality of decisions;
- perceived fairness;
- time spent in tables;
- whether uncertainty creates planning or mere frustration.

#### Delegation

- direct local control;
- doctrine plus exception handling;
- opaque automation.

Measure:

- meaningful decisions per hour;
- repetitive actions per simulated year;
- player understanding of delegated outcomes;
- willingness to trust and revise doctrine.

#### Logistics

- binary supply radius;
- shared route/flow system.

Measure:

- diversity of campaign plans;
- value of terrain and preparation;
- frequency of no-win starvation traps;
- counterplay after disruption.

### Simulation metrics

- **Truth-access violations:** must remain zero.
- **Decision provenance completeness:** percentage of AI decisions with full evidence trace.
- **Report calibration:** observed reliability versus confidence category over many runs.
- **Strategic diversity:** distribution of winning plans across seeds and AI doctrines.
- **Route concentration:** how dependent a polity becomes on its highest-flow edges.
- **Administrative span:** number of meaningful decisions per player hour as polity size grows.
- **Snowball elasticity:** how a marginal conquest changes revenue, security cost, route exposure, and coalition threat.
- **Late-game repetition:** repeated equivalent actions per year after dominance.
- **Mop-up interval:** time between practical strategic victory and formal campaign end.
- **Non-military viability:** share of successful campaigns ending through political/economic settlements.
- **AI fairness audit:** identical material resolver behavior for player and AI actors.

### Player questions

Ask after play, not only through telemetry:

- Did you understand what you knew versus what you suspected?
- Could you explain why your official acted as they did?
- Did you feel deceived by an opponent or cheated by the game?
- Did logistics create plans or chores?
- Did you have credible ways to recover from surprise?
- Did success give you new decisions or merely more objects?
- Could you win without following one universal army/economy template?
- Did the formal ending arrive when the strategic question felt resolved?

## 20. Failure modes to guard against

### “Fog of spreadsheet”

Replacing exact numbers with noisy numbers while keeping the same dashboards only makes optimization irritating.

**Guardrail:** uncertainty must have provenance, causal remedies, and decision relevance.

### Spy whack-a-mole

Networks that demand constant manual recruitment and movement reproduce agent micromanagement at a finer scale.

**Guardrail:** the player sets access goals, risk, and budget; handlers operate locally.

### Corruption as random tax

If officials simply steal a random percentage, delegation feels punitive rather than strategic.

**Guardrail:** incentives, opportunity, detection, relationships, and accounts must explain divergence.

### Logistics as attrition aura

If supply is merely a distance penalty, roads and preparation remain cosmetic.

**Guardrail:** actual stores, flows, capacity, modes, and consumption produce the effect.

### AI theater

An AI may display reports while secretly choosing actions from truth.

**Guardrail:** architectural separation and automated provenance audits, not UI claims.

### Rubber-band coalition

If every neighbor attacks the leader automatically, diplomacy becomes fake.

**Guardrail:** actors balance perceived threat, proximity, capability, intention, and available bargains; reassurance and restraint can work.

### Permanent crisis treadmill

Success that merely spawns revolts and invasions forever denies achievement.

**Guardrail:** institutions can solve recurring classes of problems, and campaigns can end in durable settlements.

### Automation spectator mode

If late-game delegation handles every important choice, the player loses authorship.

**Guardrail:** automate execution and routine analysis while preserving goal selection, commitments, appointments, doctrine, and exceptional judgment.

### More systems, same optimum

Adding mechanics can still leave one dominant heavy-infantry/cavalry/economy template.

**Guardrail:** every force and institution has context-dependent logistics, terrain, political, and information requirements; balance by opportunity landscape rather than symmetric stats.

### Historical determinism

Using historical facts as scripted events can turn the player into an actor following a known plot.

**Guardrail:** encode causal conditions and actor incentives; let events emerge differently when conditions change.

## 21. Explicit non-goals

- Simulating every individual household across a continent from the first prototype.
- Making obscurity itself a difficulty setting.
- Requiring the player to maintain constant real-time vigilance.
- Giving every commodity its own resource bar.
- Treating historical theories as uncontested laws.
- Building an unrestricted learning AI before doctrine and auditability work.
- Solving balance with hidden AI modifiers.
- Making conquest impossible or success self-canceling.
- Replacing human-readable doctrine with opaque numerical optimization.
- Making every internal disagreement become civil war.

## 22. Recommended immediate decisions

1. Adopt **continuous simulation with pause, variable speed, scheduled briefings, and doctrine-based exception handling** as the working hypothesis. Prototype it against simultaneous planning pulses before locking it permanently.
2. Extend the **no-telepathy invariant** to campaign administration: no actor, including the player’s state, receives global internal truth.
3. Define `ReportPacket`, `KnowledgeDossier`, `DecisionTrace`, and delayed `MessagePacket` before building campaign AI.
4. Make **routes** the shared substrate for logistics, trade, tax, couriers, officials, intelligence, and migration.
5. Model a polity as **offices and agents with contracts**, not a single player-owned organism.
6. Build treaties from **executable clauses and verification**, replacing the single relation scalar.
7. Begin with the five-settlement vertical slice and validate meaningful uncertainty before expanding the map.
8. Treat **management-by-exception** as a measurable performance requirement: player workload should grow sublinearly with polity size.
9. Define at least three non-conquest durable settlements before designing the full campaign economy.
10. Make every difficulty level pass the same **material-rules and information-access audit**.

## 23. Source notes and limits

### Agent-based emergence and game design

- Joshua Epstein, “Agent-Based Computational Models and Generative Social Science” develops the generative approach to explaining macro-patterns from local specifications ([paper](https://legacy.econ.tuwien.ac.at/lva/compeco.se/artikel/principles_agent_based_computational_models_and_generative_social_science.pdf)).
- Leigh Tesfatsion surveys agent-based computational economics as evolving systems of interacting autonomous agents, including endogenous trade networks and institutions ([overview](https://faculty.sites.iastate.edu/tesfatsi/archive/tesfatsi/aintro.htm)).
- Hunicke, LeBlanc, and Zubek’s MDA framework distinguishes authored mechanics, runtime dynamics, and player experience ([paper](https://www.cs.northwestern.edu/~hunicke/MDA.pdf)).
- Ryan, Rigby, and Przybylski find autonomy, competence, and relatedness associated with enjoyment and continued play; this supports preserving agency and legibility but does not dictate a strategy-game ruleset ([paper](https://selfdeterminationtheory.org/SDT/documents/2006_RyanRigbyPrzybylski_MandE.pdf)).

### Situation awareness, automation, and interface design

- Endsley’s situation-awareness framework analyzes perception, comprehension, and projection in dynamic systems ([paper page](https://journals.sagepub.com/doi/10.1518/001872095779049543)).
- Parasuraman, Sheridan, and Wickens distinguish automation across information acquisition, analysis, decision selection, and implementation ([PubMed record](https://pubmed.ncbi.nlm.nih.gov/11760769/)).
- Ecological interface design focuses on exposing system constraints and relationships to support adaptation ([Vicente and Rasmussen paper](https://backend.orbit.dtu.dk/ws/files/158017888/SMC.PDF)).
- The FAA Human Factors Design Standard summarizes risks of opaque automation, poor interruption timing, and monitoring failures; it is an aviation source used here by analogy, not direct game evidence ([automation chapter](https://hf.tc.faa.gov/hfds/download-hfds/hfds_pdfs/Ch3_Automation.pdf)).

### Ancient administration, communication, and logistics

- Bagnall documents the fourteen-year provincial census cycle in Roman Egypt over a long period; Egypt should not be assumed to represent every province identically ([paper](https://grbs.library.duke.edu/index.php/grbs/article/download/3811/5657/15553)).
- Gutiérrez and Martínez-Esteller analyze Roman transition from tax farming toward more hierarchical census-based collection through institutional economics ([article](https://link.springer.com/article/10.1007/s10602-021-09355-5)).
- Erdkamp’s Roman logistics study, summarized in the Bryn Mawr review, covers supply needs, transport, foraging, lines, bases, storage, and infrastructure ([review](https://bmcr.brynmawr.edu/1999/1999.11.01/)).
- Kolb clarifies the official-travel role and material limits of the Roman transport/communication system ([chapter](https://sites.lsa.umich.edu/paul-in-athens/wp-content/uploads/sites/1400/2025/03/Kolb-2001-compressed.pdf)).
- Sun Tzu and Frontinus are primary historical inspirations for intelligence and stratagem, not empirical game-design research ([Sun Tzu](https://classics.mit.edu/Tzu/artwar.html); [Frontinus](https://en.wikisource.org/wiki/Stratagems/Book_1)).

### Political economy, organization, diplomacy, and networks

- Gailmard provides an overview of principal-agent problems in political institutions ([paper](https://www.law.berkeley.edu/archive/files/csls/Gailmard_-_Accountability_and_Principal-Agent_Models%282%29.pdf)).
- Fearon’s rationalist theory of war emphasizes private information, incentives to misrepresent, and commitment problems ([paper](https://slantchev.ucsd.edu/courses/pdf/fearon-io1995v49n3.pdf)).
- North and Weingast connect institutional constraint and credible commitment to investment, although their historical interpretation has a large critical literature ([article](https://www.cambridge.org/core/journals/journal-of-economic-history/article/constitutions-and-commitment-the-evolution-of-institutions-governing-public-choice-in-seventeenthcentury-england/2E0D2B2D3490BE5C556D836ACB096362)).
- Crawford and Sobel formalize strategic information transmission when sender and receiver interests differ ([paper](https://econweb.ucsd.edu/~vcrawfor/CrawfordSobel82EMT.pdf)).
- Albert, Jeong, and Barabási study network robustness and targeted vulnerability; applying this to courier and informant networks is a project inference ([paper](https://arxiv.org/abs/cond-mat/0008064)).
- Besley and Persson model legal and fiscal state capacity as accumulated investment rather than an automatic property of sovereignty ([article](https://www.aeaweb.org/articles?id=10.1257%2Faer.99.4.1218)).
- Walt’s balance-of-threat argument informs perceived-threat coalition behavior, but balancing is not mechanically inevitable ([paper](https://www.rochelleterman.com/ir/sites/default/files/walt%201985.pdf)).
- Ostrom’s work on durable common-pool institutions emphasizes monitoring, graduated sanctions, conflict resolution, local participation, and nested governance; the project can use these as design inspiration for roads, water, pasture, and shared security without treating them as universal recipes ([*Governing the Commons*](https://www.actu-environnement.com/media/pdf/ostrom_1990.pdf); [2008 summary](https://www.conservation-strategy.org/sites/default/files/field-files/Ostrom_Challenge_of_Common_Pool_Resources_Environment_JulyAug_2008_1.pdf)).

### Research limit

No cited source demonstrates that this complete design will be fun. The proposal combines supported relationships, historical examples, human-factors constraints, and project-specific hypotheses. Its validity depends on the staged prototypes and measurements above.
