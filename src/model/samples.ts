/**
 * Sample Models — a small, curated gallery the user can load to learn the
 * language by example (CONTEXT.md) and to have something on the canvas in one
 * click.
 *
 * The set is deliberately "simple yet exhaustive": each Model is the smallest
 * thing that makes its point, but read top to bottom they introduce the whole
 * vocabulary and both loop kinds, one new idea at a time:
 *
 *   1. Bathtub          — Stock, Flow (in/out), Source, Sink. No feedback.
 *   2. Savings account  — + Information Link, `+` polarity → a Reinforcing loop.
 *   3. Coffee cooling   — + Converter, `−` polarity → a Balancing loop.
 *   4. Population        — all of the above at once: Reinforcing *and* Balancing.
 *
 * Beyond that primer, three classic models go a step further — each adds one
 * structure the first four never show, so they read as a second tier:
 *
 *   5. Limits to growth  — a Reinforcing inflow and a Balancing outflow on one
 *                          Stock, with a Converter (crowding) relaying the density
 *                          that brakes growth: the S-curve.
 *   6. Predator and prey — two coupled Stocks whose interlocking loops oscillate.
 *   7. Epidemic          — a chain of Stocks joined by Stock→Stock Flows: no clouds.
 *
 * Last, four of Donella Meadows' system *traps* — structures that reliably misbehave
 * (Thinking in Systems, ch. 5), to contrast the healthy dynamics above:
 *
 *   8. Tragedy of the commons   — competing Reinforcing loops drain a shared Stock
 *                                 faster than its weak, shared Balancing brake reacts.
 *   9. Escalation               — a single Reinforcing loop spanning two Stocks, with
 *                                 no brake in the structure: an arms race.
 *  10. Fixes that fail          — a fix drains the symptom Stock (B) while its side
 *                                 effect refills it (R): the cure feeds the disease.
 *  11. Drift to low performance — a goal that erodes toward actual performance, so the
 *                                 effort it drives never overcomes a steady decay: a
 *                                 Reinforcing loop ratchets both downward.
 *
 * Next, the dynamic the book is named for, and the one the gallery has saved until a
 * reader knows every piece it needs:
 *
 *  12. Overshoot and collapse   — a Reinforcing harvester on a *renewable* Resource with
 *                                 an extinction threshold (an Allee floor): a fleet
 *                                 overshoots the renewal rate and pushes the fishery past
 *                                 the point of no return. The dark twin of "Limits to
 *                                 growth" — the limit doesn't hold, it collapses for good.
 *
 * Last, the language pointed at a live debate — a classic trap (Shifting the burden to
 * the intervenor, ch. 5) wearing today's clothes:
 *
 *  13. AI deskilling spiral     — handing the burden of code quality to AI atrophies the
 *                                 Expertise that holds quality up, so the team leans on AI
 *                                 harder and Technical debt spirals: addiction, not a fix.
 *
 * These are plain data built from the same tested constructors the store uses
 * (factory.ts), so every sample is a valid Model by construction. `build()`
 * mints fresh ids on each call, so loading a sample twice never collides.
 */
import { makeCloud, makeConverter, makeFlow, makeStock, midpoint, newId } from "./factory"
import {
  type InformationLink,
  type Model,
  MODEL_VERSION,
  type ModelNode,
  type Polarity,
  type SimSpec,
} from "./types"

/** A loadable example: a title and one-line blurb for the menu, plus a builder. */
export interface Sample {
  title: string
  blurb: string
  build: () => Model
}

/** Information Link between two already-built nodes, with an explicit polarity. */
function link(source: ModelNode, target: ModelNode, polarity: Polarity): InformationLink {
  return { id: newId("link"), source: source.id, target: target.id, polarity }
}

function model(
  name: string,
  nodes: ModelNode[],
  infoLinks: InformationLink[],
  sim?: SimSpec,
): Model {
  return { version: MODEL_VERSION, id: newId("model"), name, nodes, infoLinks, sim }
}

/**
 * Bathtub — the canonical first model. A Stock filled by one Flow and drained by
 * another, each open end resting on a Cloud. No Information Links, so no
 * feedback: it just shows the substrate (Stock, Flow, Source, Sink).
 */
function bathtub(): Model {
  const source = makeCloud({ x: -280, y: 0 })
  const water = makeStock({ x: 0, y: 0 }, "Water")
  water.initialValue = 20
  water.unit = "L"
  const sink = makeCloud({ x: 280, y: 0 })
  const filling = makeFlow(
    midpoint(source.position, water.position),
    "filling",
    source.id,
    water.id,
  )
  const emptying = makeFlow(midpoint(water.position, sink.position), "emptying", water.id, sink.id)
  // No Information Links, so each rate is a plain Constant. A faster inflow than
  // outflow means Water rises in a straight line — accumulation with no feedback.
  filling.rule = { kind: "constant", value: 5 }
  emptying.rule = { kind: "constant", value: 3 }
  return model("Bathtub", [source, water, sink, filling, emptying], [], {
    start: 0,
    stop: 40,
    dt: 1,
  })
}

/**
 * Savings account — the simplest Reinforcing loop. Interest flows in from outside
 * (a Source), and the bigger the Balance the larger the interest: Balance → [+]
 * → interest → (inflow) → Balance. Even number of `−` (zero) → Reinforcing.
 */
function savings(): Model {
  // Source up-left, Balance down-right: the interest valve lands at their
  // midpoint (above Balance), so the `Balance → interest` link arcs back up as a
  // visible Reinforcing loop instead of overlapping the inflow pipe.
  const source = makeCloud({ x: -240, y: -80 })
  const balance = makeStock({ x: 120, y: 40 }, "Balance")
  balance.initialValue = 1000
  balance.unit = "$"
  const interest = makeFlow(
    midpoint(source.position, balance.position),
    "interest",
    source.id,
    balance.id,
  )
  // interest = 5% × Balance (the `+` link). A Stock feeding its own inflow → the
  // Reinforcing loop runs as exponential growth.
  interest.rule = { kind: "proportional", factor: 0.05 }
  return model("Savings account", [source, balance, interest], [link(balance, interest, "+")], {
    start: 0,
    stop: 40,
    dt: 1,
  })
}

/**
 * Coffee cooling — the simplest Balancing loop, plus a Converter. The cup cools
 * faster the hotter it is (Coffee → [+] → cooling) but slower the warmer the room
 * (room temperature → [−] → cooling). The loop Coffee → cooling → (outflow) →
 * Coffee has one `−` → Balancing: it settles toward room temperature.
 */
function coffee(): Model {
  const coffee = makeStock({ x: -200, y: 0 }, "Coffee")
  coffee.initialValue = 90
  coffee.unit = "°C"
  const sink = makeCloud({ x: 200, y: 0 })
  const cooling = makeFlow(midpoint(coffee.position, sink.position), "cooling", coffee.id, sink.id)
  // cooling = 0.1 × (Coffee − room): the `+` input is the level, the `−` the target.
  // An outflow closing the gap to room temperature → the Balancing loop settles there.
  cooling.rule = { kind: "gap", factor: 0.1 }
  const room = makeConverter({ x: 0, y: -160 }, "room temperature")
  room.rule = { kind: "constant", value: 20 }
  return model(
    "Coffee cooling",
    [coffee, sink, cooling, room],
    [link(coffee, cooling, "+"), link(room, cooling, "-")],
    { start: 0, stop: 60, dt: 1 },
  )
}

/**
 * Population — the whole language in one model. Births add to Population and more
 * people means more births (Reinforcing); deaths remove from it and more people
 * means more deaths (Balancing). Converters feed each rate: fertility raises
 * births (`+`), life expectancy lowers deaths (`−`).
 */
function population(): Model {
  // A grid-aligned cascade (20px grid): Source and both Converters stack in the left
  // column, the Stock sits at the centre, and births → Population → deaths step down
  // toward the Sink — so every Information Link lands in open space, not on a pipe.
  // Valves are placed by hand, not at the midpoint, to hold the steps.
  const source = makeCloud({ x: -360, y: -240 })
  const fertility = makeConverter({ x: -360, y: -40 }, "fertility")
  fertility.rule = { kind: "constant", value: 0.03 }
  const lifeExpectancy = makeConverter({ x: -360, y: 240 }, "life expectancy")
  // Wired into deaths for the Balancing loop's structure, but not yet read by the
  // rate: a faithful "deaths = Population ÷ life expectancy" needs a divide rule we
  // don't have, so deaths uses a flat mortality rate below. (See the gallery notes.)
  lifeExpectancy.rule = { kind: "constant", value: 70 }
  const people = makeStock({ x: 0, y: 0 }, "Population")
  people.initialValue = 100
  people.unit = "people"
  const births = makeFlow({ x: -160, y: -160 }, "births", source.id, people.id)
  // births = fertility × Population (both `+` inputs): more people and higher
  // fertility, more births — the Reinforcing engine.
  births.rule = { kind: "proportional", factor: 1 }
  const sink = makeCloud({ x: 360, y: 240 })
  const deaths = makeFlow({ x: 160, y: 160 }, "deaths", people.id, sink.id)
  // deaths = 2% of Population each step (its `+` input) — the Balancing drain. With
  // births at 3%, the Reinforcing loop wins and the population grows exponentially.
  deaths.rule = { kind: "proportional", factor: 0.02 }
  return model(
    "Population",
    [source, people, sink, births, deaths, fertility, lifeExpectancy],
    [
      link(people, births, "+"),
      link(fertility, births, "+"),
      link(people, deaths, "+"),
      link(lifeExpectancy, deaths, "-"),
    ],
    { start: 0, stop: 100, dt: 1 },
  )
}

/**
 * Limits to growth — the S-curve, where a Reinforcing engine meets a Balancing
 * brake. Yeast multiplies the more there is of it (Yeast → [+] → growth: a
 * Reinforcing inflow), but crowding rises with the population (Yeast → [+] →
 * crowding) and drives a die-off that grows with the *square* of the Yeast
 * (Yeast, crowding → [+] → die-off → drains Yeast: a Balancing outflow). Growth
 * wins early, the die-off wins late, so Yeast settles where they balance (≈1000)
 * — the classic sigmoid, with *both* loops visible to the detector. (A named
 * "carrying capacity" would want a divide rule we don't have yet; here the ceiling
 * falls out of the growth and die-off rates.)
 */
function limitsToGrowth(): Model {
  const source = makeCloud({ x: -280, y: 0 })
  const yeast = makeStock({ x: 40, y: 0 }, "Yeast")
  yeast.initialValue = 20
  yeast.unit = "cells"
  const growth = makeFlow(midpoint(source.position, yeast.position), "growth", source.id, yeast.id)
  // growth = 30% of Yeast (its `+` input): the Reinforcing engine.
  growth.rule = { kind: "proportional", factor: 0.3 }
  const sink = makeCloud({ x: 360, y: 0 })
  const dieOff = makeFlow(midpoint(yeast.position, sink.position), "die-off", yeast.id, sink.id)
  // die-off = factor × Yeast × crowding. With crowding ∝ Yeast it scales as Yeast²,
  // so the Balancing drain overtakes the linear growth and Yeast plateaus.
  dieOff.rule = { kind: "proportional", factor: 0.0003 }
  // crowding ≈ the population density (proportional to Yeast), what drives the die-off.
  const crowding = makeConverter({ x: 200, y: -160 }, "crowding")
  crowding.rule = { kind: "proportional", factor: 1 }
  return model(
    "Limits to growth",
    [source, yeast, growth, sink, dieOff, crowding],
    [
      link(yeast, growth, "+"),
      link(yeast, crowding, "+"),
      link(yeast, dieOff, "+"),
      link(crowding, dieOff, "+"),
    ],
    { start: 0, stop: 40, dt: 1 },
  )
}

/**
 * Predator and prey — the first model with two Stocks, coupled so each drives the
 * other (Lotka–Volterra). Rabbits breed (Reinforcing) and are thinned by predation
 * (Balancing); foxes die off on their own (Balancing). The interesting one is the
 * cross-stock loop Rabbits → fox births → Foxes → predation → Rabbits: more rabbits
 * feed more foxes, more foxes eat more rabbits — one `−` → Balancing, and the lag
 * around it is what makes the two populations oscillate.
 */
function predatorPrey(): Model {
  // Two aligned rows flowing left→right — Rabbits on top, Foxes below — each a full
  // Source → birth → Stock → outflow → Sink lane. The two coupling links (Rabbits →
  // fox births, Foxes → predation) run as clear diagonals between the rows, so the
  // cross-stock loop traces a circuit through the open centre.
  const preySource = makeCloud({ x: -480, y: -140 })
  const rabbits = makeStock({ x: -80, y: -140 }, "Rabbits")
  rabbits.initialValue = 100
  const preySink = makeCloud({ x: 320, y: -140 })
  const rabbitBirths = makeFlow(
    midpoint(preySource.position, rabbits.position),
    "rabbit births",
    preySource.id,
    rabbits.id,
  )
  // rabbits breed in proportion to themselves (Reinforcing) …
  rabbitBirths.rule = { kind: "proportional", factor: 0.08 }
  const predation = makeFlow(
    midpoint(rabbits.position, preySink.position),
    "predation",
    rabbits.id,
    preySink.id,
  )
  // … and are thinned by predation = rabbits × foxes (both `+`): the coupling term.
  predation.rule = { kind: "proportional", factor: 0.004 }
  const foxSource = makeCloud({ x: -480, y: 140 })
  const foxes = makeStock({ x: -80, y: 140 }, "Foxes")
  foxes.initialValue = 20
  const foxSink = makeCloud({ x: 320, y: 140 })
  const foxBirths = makeFlow(
    midpoint(foxSource.position, foxes.position),
    "fox births",
    foxSource.id,
    foxes.id,
  )
  // foxes are born in proportion to the rabbits available to eat …
  foxBirths.rule = { kind: "proportional", factor: 0.02 }
  const foxDeaths = makeFlow(
    midpoint(foxes.position, foxSink.position),
    "fox deaths",
    foxes.id,
    foxSink.id,
  )
  // … and die off on their own. The lag around the loop makes the two populations
  // chase each other. (Forward Euler damps the orbit — see the gallery notes.)
  foxDeaths.rule = { kind: "proportional", factor: 0.2 }
  return model(
    "Predator and prey",
    [
      preySource,
      rabbits,
      preySink,
      rabbitBirths,
      predation,
      foxSource,
      foxes,
      foxSink,
      foxBirths,
      foxDeaths,
    ],
    [
      link(rabbits, rabbitBirths, "+"),
      link(rabbits, predation, "+"),
      link(foxes, predation, "+"),
      link(rabbits, foxBirths, "+"),
      link(foxes, foxDeaths, "+"),
    ],
    { start: 0, stop: 120, dt: 0.25 },
  )
}

/**
 * Epidemic — contagion as a chain of three Stocks (Susceptible → Infected →
 * Recovered) with no model boundary: every Flow runs Stock → Stock, so no clouds
 * appear. Infection feeds on both ends at once (Susceptible → [+] and Infected →
 * [+] → infection): the more infected there are the faster it spreads — a
 * Reinforcing outbreak — until susceptibles run low (Balancing) and recovery
 * drains the infected (Balancing). Infectivity is a constant Converter setting the
 * pace; Recovered is a terminal Stock, on no loop.
 */
function epidemic(): Model {
  const susceptible = makeStock({ x: -280, y: 0 }, "Susceptible")
  susceptible.initialValue = 990
  susceptible.unit = "people"
  const infected = makeStock({ x: 0, y: 0 }, "Infected")
  infected.initialValue = 10
  infected.unit = "people"
  const recovered = makeStock({ x: 280, y: 0 }, "Recovered")
  recovered.initialValue = 0
  recovered.unit = "people"
  const infection = makeFlow(
    midpoint(susceptible.position, infected.position),
    "infection",
    susceptible.id,
    infected.id,
  )
  // infection = infectivity × Susceptible × Infected (proportional reads all three
  // `+` inputs): the more carriers and the more susceptibles, the faster it spreads.
  // The non-negative-stock floor keeps Susceptible from being over-drained.
  infection.rule = { kind: "proportional", factor: 1 }
  const recovery = makeFlow(
    midpoint(infected.position, recovered.position),
    "recovery",
    infected.id,
    recovered.id,
  )
  // recovery = 15% of the Infected each step (its one `+` input).
  recovery.rule = { kind: "proportional", factor: 0.15 }
  const infectivity = makeConverter({ x: -140, y: -160 }, "infectivity")
  // Small, so infectivity × S × I stays a sane rate (R0 = infectivity·S₀/γ ≈ 2.6).
  infectivity.rule = { kind: "constant", value: 0.0004 }
  return model(
    "Epidemic",
    [susceptible, infected, recovered, infection, recovery, infectivity],
    [
      link(susceptible, infection, "+"),
      link(infected, infection, "+"),
      link(infected, recovery, "+"),
      link(infectivity, infection, "+"),
    ],
    { start: 0, stop: 60, dt: 1 },
  )
}

/**
 * Tragedy of the commons — Meadows' first system *trap*: several users sharing one
 * resource, each with a Reinforcing loop that grows its own use, and only a weak,
 * shared Balancing loop to rein them in. Each Herd breeds the more cattle it has
 * (Herd → [+] → growth: Reinforcing) and grazes the shared Pasture (Herd → [+] →
 * grazing, which drains Pasture). Less Pasture does slow each herd (Pasture → [+] →
 * growth: a Balancing loop per herd) — but that brake runs through the *one* shared
 * Stock, so in practice it is too slow to stop the herds racing each other down to
 * bare dirt. The trap is structural: each herder gains by growing, while the cost
 * falls on the commons they both depend on.
 */
function tragedyOfTheCommons(): Model {
  const pasture = makeStock({ x: 0, y: 0 }, "Pasture")
  pasture.initialValue = 1000
  // Two symmetric herds: cattle enter from a Source on the outside, grass leaves
  // the Pasture downward to a Sink. The two `Pasture → growth` links are the weak
  // brake the trap overruns.
  const sourceA = makeCloud({ x: -640, y: 0 })
  const herdA = makeStock({ x: -360, y: 0 }, "Herd A")
  herdA.initialValue = 10
  const growthA = makeFlow(
    midpoint(sourceA.position, herdA.position),
    "growth A",
    sourceA.id,
    herdA.id,
  )
  // growth = herd × Pasture (both `+`): each herd grows the more cattle it has and
  // the more grass is left — a Reinforcing loop, braked only by the shared Pasture.
  growthA.rule = { kind: "proportional", factor: 0.0003 }
  const sinkA = makeCloud({ x: -200, y: 240 })
  const grazingA = makeFlow(
    midpoint(pasture.position, sinkA.position),
    "grazing A",
    pasture.id,
    sinkA.id,
  )
  // grazing = 6% of the herd, drained from the *shared* Pasture (which never
  // regrows here): two appetites racing one stock down to bare dirt.
  grazingA.rule = { kind: "proportional", factor: 0.06 }
  const sourceB = makeCloud({ x: 640, y: 0 })
  const herdB = makeStock({ x: 360, y: 0 }, "Herd B")
  herdB.initialValue = 10
  const growthB = makeFlow(
    midpoint(sourceB.position, herdB.position),
    "growth B",
    sourceB.id,
    herdB.id,
  )
  growthB.rule = { kind: "proportional", factor: 0.0003 }
  const sinkB = makeCloud({ x: 200, y: 240 })
  const grazingB = makeFlow(
    midpoint(pasture.position, sinkB.position),
    "grazing B",
    pasture.id,
    sinkB.id,
  )
  grazingB.rule = { kind: "proportional", factor: 0.06 }
  return model(
    "Tragedy of the commons",
    [pasture, sourceA, herdA, growthA, sinkA, grazingA, sourceB, herdB, growthB, sinkB, grazingB],
    [
      link(herdA, growthA, "+"),
      link(herdA, grazingA, "+"),
      link(pasture, growthA, "+"),
      link(herdB, growthB, "+"),
      link(herdB, grazingB, "+"),
      link(pasture, growthB, "+"),
    ],
    { start: 0, stop: 60, dt: 1 },
  )
}

/**
 * Escalation — the arms-race trap: two Stocks locked in a single Reinforcing loop,
 * each building up in answer to the other. The more the Blue arsenal holds the
 * faster Red builds (Blue → [+] → Red buildup), and vice versa, so the loop
 * Red arsenal → Blue buildup → Blue arsenal → Red buildup → Red arsenal carries no
 * `−` → Reinforcing: with no brake in the structure, both grow without bound. (The
 * benign cousin is "Predator and prey", whose cross loop has one `−` and so settles
 * into oscillation instead of exploding.)
 */
function escalation(): Model {
  // Two parallel rows — Blue on top, Red below — each flowing left→right from a
  // Source to its arsenal. The two cross-coupling links span the open centre and
  // cross there, where the R badge lands, so the whole loop reads at a glance.
  const blueSource = makeCloud({ x: -560, y: -120 })
  const blueArsenal = makeStock({ x: 280, y: -120 }, "Blue arsenal")
  blueArsenal.initialValue = 10
  const blueBuildup = makeFlow(
    midpoint(blueSource.position, blueArsenal.position),
    "Blue buildup",
    blueSource.id,
    blueArsenal.id,
  )
  // Each side builds in proportion to the other's arsenal (its one `+` input), so
  // the two feed each other: a Reinforcing loop with no brake → unbounded growth.
  blueBuildup.rule = { kind: "proportional", factor: 0.1 }
  const redSource = makeCloud({ x: -560, y: 120 })
  const redArsenal = makeStock({ x: 280, y: 120 }, "Red arsenal")
  redArsenal.initialValue = 12
  const redBuildup = makeFlow(
    midpoint(redSource.position, redArsenal.position),
    "Red buildup",
    redSource.id,
    redArsenal.id,
  )
  redBuildup.rule = { kind: "proportional", factor: 0.1 }
  return model(
    "Escalation",
    [blueSource, blueArsenal, blueBuildup, redSource, redArsenal, redBuildup],
    [link(blueArsenal, redBuildup, "+"), link(redArsenal, blueBuildup, "+")],
    { start: 0, stop: 40, dt: 1 },
  )
}

/**
 * Fixes that fail — the archetype where a quick fix relieves a symptom but feeds it
 * through a side effect, so the symptom returns and the fix is reapplied for ever.
 * High Congestion prompts road building, and the new capacity drains it (Congestion
 * → [+] → road building, an outflow: a Balancing fix). But roads also induce driving
 * (road building → [+] → driving), and that extra traffic refills Congestion — the
 * loop Congestion → road building → driving → Congestion carries no `−`, so it is
 * Reinforcing: the cure feeds the disease, and you cannot build your way out of
 * traffic.
 */
function fixesThatFail(): Model {
  // Both flow valves share the left column (x = -120) so the backfire link
  // road building → driving drops as a clean vertical, not a curl. Congestion sits
  // on the right at driving's height; its road-building outflow runs up-left to the
  // valve and on to the Sink, so the Reinforcing loop reads as the left edge plus
  // the diagonal back to Congestion. Placed by hand, not midpoint, to hold the column.
  const source = makeCloud({ x: -420, y: 120 })
  const congestion = makeStock({ x: 300, y: 120 }, "Congestion")
  congestion.initialValue = 50
  const driving = makeFlow({ x: -120, y: 120 }, "driving", source.id, congestion.id)
  // driving = 1.5 × road building (its `+` input): every new road induces *more*
  // traffic than it cleared — the side effect that refills the symptom.
  driving.rule = { kind: "proportional", factor: 1.5 }
  const sink = makeCloud({ x: 300, y: -160 })
  const roadBuilding = makeFlow({ x: -120, y: -160 }, "road building", congestion.id, sink.id)
  // road building = 40% of Congestion (its `+` input), draining it: the Balancing
  // fix. But induced driving outweighs it, so the Reinforcing loop wins and
  // Congestion climbs anyway — you can't build your way out of traffic.
  roadBuilding.rule = { kind: "proportional", factor: 0.4 }
  return model(
    "Fixes that fail",
    [source, congestion, driving, sink, roadBuilding],
    [link(congestion, roadBuilding, "+"), link(roadBuilding, driving, "+")],
    { start: 0, stop: 30, dt: 1 },
  )
}

/**
 * Drift to low performance — the eroding-goals trap. Performance is under steady
 * erosion (a constant `decay` leak: entropy, wear, rising demands), and the only
 * thing fighting it is improvement, driven by the gap to the Standard you hold
 * yourself to (Standard → [+] and Performance → [−] → improvement). Were the
 * Standard fixed, improvement would find a floor — Performance would settle a little
 * below the goal (here, at 60) and hold. But the Standard is not fixed: it slips
 * toward whatever you are actually delivering (Standard → [+] and Performance → [−]
 * → slippage), so there is no floor. Every notch Performance loses, the Standard
 * follows down, weakening improvement, and decay carries Performance lower still —
 * the loop Standard → improvement → Performance → slippage → Standard, two `−` → R.
 * That R badge is the trap: both ratchet downhill in lockstep (Performance 70 → 10,
 * Standard 80 → 20), the effort forever just losing to decay.
 */
function driftToLowPerformance(): Model {
  // Performance sits low-left (fed by improvement from a Source, leaked away by
  // decay to a Sink straight below it); Standard sits high-right (drained by
  // slippage to a Sink). The two long links that close the Reinforcing loop cross
  // in the open centre, where the R badge lands.
  const source = makeCloud({ x: -560, y: 120 })
  const performance = makeStock({ x: -160, y: 120 }, "Performance")
  performance.initialValue = 70
  const improvement = makeFlow(
    midpoint(source.position, performance.position),
    "improvement",
    source.id,
    performance.id,
  )
  // improvement closes the gap upward: 10% of (Standard − Performance), pulling
  // Performance toward the Standard — the one force resisting decay.
  improvement.rule = { kind: "gap", factor: 0.1 }
  // decay leaks Performance away at a steady 2/step: the ever-present downward
  // pressure the gap-driven improvement has to offset. Without it, two gap-closing
  // flows would just meet in the middle; this is what makes the goal's erosion bite.
  const decaySink = makeCloud({ x: -160, y: 400 })
  const decay = makeFlow(
    midpoint(performance.position, decaySink.position),
    "decay",
    performance.id,
    decaySink.id,
  )
  decay.rule = { kind: "constant", value: 2 }
  const standard = makeStock({ x: 160, y: -120 }, "Standard")
  standard.initialValue = 80
  const slippageSink = makeCloud({ x: 560, y: -120 })
  const slippage = makeFlow(
    midpoint(standard.position, slippageSink.position),
    "slippage",
    standard.id,
    slippageSink.id,
  )
  // slippage erodes the Standard toward actual Performance, also at 10% of the gap.
  // It is what removes the floor: the Standard sags after Performance instead of
  // holding above it, so the gap stays open at a fixed 10 while both slide down.
  slippage.rule = { kind: "gap", factor: 0.1 }
  return model(
    "Drift to low performance",
    [source, performance, improvement, decay, decaySink, standard, slippageSink, slippage],
    [
      link(standard, improvement, "+"),
      link(performance, improvement, "-"),
      link(standard, slippage, "+"),
      link(performance, slippage, "-"),
    ],
    { start: 0, stop: 60, dt: 1 },
  )
}

/**
 * Overshoot and collapse — the dark twin of "Limits to growth", on a *renewable*
 * Resource with a point of no return. A fishery (Fish) regrows on its own, but
 * reproduction needs fish to find each other: spawning scales with density
 * (spawning = factor × Fish × density, density ∝ Fish, so ~Fish²), while natural
 * deaths are merely linear (natural deaths = factor × Fish). Above a critical
 * density the quadratic births win and the stock climbs to its carrying capacity
 * (crowding deaths ~Fish³ cap it there); *below* it the linear deaths win and the
 * stock slides to an extinction it cannot climb back from — the Allee threshold,
 * the renewable resource's hidden floor.
 *
 * A fishing fleet (Boats) reinvests its catch into more boats
 * (Boats → catch → fleet growth → Boats, no `−` → Reinforcing), so the catch
 * (catch = factor × Fish × Boats) accelerates and overshoots the renewal rate,
 * dragging Fish under the threshold. Once there it is too late: even as the catch
 * starves and the fleet scraps itself (Boats → [+] → scrapping, a Balancing drain),
 * the Fish are gone for good and never recover. Contrast "Predator and prey", whose
 * prey regrows from any level and so oscillates forever — here the prey has a floor
 * it cannot climb back from, so a Reinforcing harvester collapses it permanently.
 *
 * The Allee curve is the one shape the proportional rule cannot draw alone (it needs
 * net regrowth to go negative–positive–negative), so two relays build it: `density`
 * (∝ Fish) lifts spawning to ~Fish², and `crowding` (∝ Fish²) lifts crowding deaths
 * to ~Fish³ — the same crowding trick as "Limits to growth", doubled. The gallery's
 * largest model, and the only one that needs a Converter feeding a Converter.
 */
function overshootAndCollapse(): Model {
  // Fish (left) carries the whole renewal engine: a spawning inflow from the top, and
  // three drains — natural deaths, crowding deaths, and the catch. Boats (right) runs a
  // Source → fleet growth → Boats → scrapping → Sink column. The two coupling links —
  // Boats → catch and catch → fleet growth — cross the open centre, where the R badge lands.
  const fish = makeStock({ x: -420, y: 0 }, "Fish")
  fish.initialValue = 1000
  fish.unit = "tonnes"
  // density ∝ Fish: how easily fish meet to spawn. Relays Fish into the births term so
  // spawning reads as ~Fish² — the Allee mechanism (sparse fish breed slowly).
  const density = makeConverter({ x: -700, y: -80 }, "density")
  density.rule = { kind: "proportional", factor: 1 }
  // crowding ∝ Fish² (Fish × density): the overcrowding pressure that lifts crowding
  // deaths to ~Fish³, so the stock plateaus at its carrying capacity. A Converter read
  // by a Converter — the only such wiring in the gallery.
  const crowding = makeConverter({ x: -700, y: 80 }, "crowding")
  crowding.rule = { kind: "proportional", factor: 1 }
  const spawnSource = makeCloud({ x: -420, y: -320 })
  const spawning = makeFlow({ x: -420, y: -160 }, "spawning", spawnSource.id, fish.id)
  // spawning = factor × Fish × density (~Fish²): the Reinforcing birth engine that
  // needs a crowd — it falls away faster than deaths as the Fish thin out.
  spawning.rule = { kind: "proportional", factor: 0.00036 }
  const deathSink = makeCloud({ x: -720, y: 280 })
  const naturalDeaths = makeFlow({ x: -580, y: 180 }, "natural deaths", fish.id, deathSink.id)
  // natural deaths = factor × Fish (linear): the Balancing drain that *wins* below the
  // Allee threshold, where ~Fish² spawning can no longer keep up — and extinction follows.
  naturalDeaths.rule = { kind: "proportional", factor: 0.01 }
  const crowdSink = makeCloud({ x: -420, y: 320 })
  const crowdingDeaths = makeFlow({ x: -420, y: 160 }, "crowding deaths", fish.id, crowdSink.id)
  // crowding deaths = factor × Fish × crowding (~Fish³): the steep Balancing ceiling
  // that holds the healthy stock at carrying capacity.
  crowdingDeaths.rule = { kind: "proportional", factor: 3e-7 }
  const catchSink = makeCloud({ x: -90, y: 220 })
  const catching = makeFlow({ x: -255, y: 90 }, "catch", fish.id, catchSink.id)
  // catch = factor × Fish × Boats (both `+`): more boats and more fish both lift the
  // haul. This is what overshoots the renewal rate and pulls Fish under the threshold.
  catching.rule = { kind: "proportional", factor: 0.0004 }
  const boats = makeStock({ x: 420, y: 0 }, "Boats")
  boats.initialValue = 5
  const fleetSource = makeCloud({ x: 420, y: -320 })
  const fleetGrowth = makeFlow({ x: 420, y: -160 }, "fleet growth", fleetSource.id, boats.id)
  // fleet growth = factor × catch (its one `+` input): the revenue reinvested — a Flow
  // feeding a Flow, the edge that closes the Reinforcing loop through Boats.
  fleetGrowth.rule = { kind: "proportional", factor: 0.5 }
  const scrapSink = makeCloud({ x: 420, y: 320 })
  const scrapping = makeFlow({ x: 420, y: 160 }, "scrapping", boats.id, scrapSink.id)
  // scrapping = factor × Boats (its `+` input): the Balancing drain that takes the fleet
  // down once the catch can no longer feed fleet growth.
  scrapping.rule = { kind: "proportional", factor: 0.04 }
  return model(
    "Overshoot and collapse",
    [
      fish,
      density,
      crowding,
      spawnSource,
      spawning,
      deathSink,
      naturalDeaths,
      crowdSink,
      crowdingDeaths,
      catchSink,
      catching,
      boats,
      fleetSource,
      fleetGrowth,
      scrapSink,
      scrapping,
    ],
    [
      link(fish, density, "+"),
      link(fish, crowding, "+"),
      link(density, crowding, "+"),
      link(fish, spawning, "+"),
      link(density, spawning, "+"),
      link(fish, naturalDeaths, "+"),
      link(fish, crowdingDeaths, "+"),
      link(crowding, crowdingDeaths, "+"),
      link(fish, catching, "+"),
      link(boats, catching, "+"),
      link(catching, fleetGrowth, "+"),
      link(boats, scrapping, "+"),
    ],
    // Fish drift up toward carrying capacity (~1170) while the fleet compounds, then the
    // catch overshoots the renewal rate and pulls them past the Allee threshold (~30) at
    // t≈43, after which they go extinct and stay there; Boats overshoot to ~700 (t≈37)
    // and collapse back near their start by t=150.
    { start: 0, stop: 150, dt: 1 },
  )
}

/**
 * AI deskilling spiral — a classic trap in today's clothes: "Shifting the burden to
 * the intervenor" (Thinking in Systems, ch. 5), where leaning on an outside fixer
 * atrophies your own capacity to solve the problem, so you depend on the fixer ever
 * more. Here the intervenor is AI. Technical debt drives reliance on it (the more cruft
 * and delivery pressure, the more you reach for the model: Technical debt → [+] → AI
 * reliance); AI churns out plausible code that adds debt (AI reliance → [+] → debt
 * accrual) and lets skills lapse (AI reliance → [+] → atrophy, draining Expertise); and
 * a thinner-skilled team refactors less (Expertise → [+] → refactoring, the Balancing
 * payoff that now weakens). The loop Technical debt → AI reliance → atrophy → Expertise
 * → refactoring → Technical debt carries two `−` (the two outflows) → Reinforcing: the
 * spiral. The hopeful brake is learning — practice pulling Expertise back toward its
 * ceiling (skill ceiling → [+], Expertise → [−] → learning: a Balancing loop) — but
 * tuned here it loses to the spiral. (Code quality and lead time aren't nodes: quality
 * reads as the inverse of Technical debt, lead time as the inverse of Expertise;
 * "model price" lives in the AI-reliance factor — cheaper models, higher reliance.)
 */
function aiDeskillingSpiral(): Model {
  // Two lanes — Expertise on top, Technical debt below — each a full Source → inflow →
  // Stock → outflow → Sink. The AI reliance Converter sits between them, reading the
  // debt below and feeding both atrophy (top lane) and debt accrual: the couplings that
  // close the Reinforcing spiral cross the open centre.
  const skillCeiling = makeConverter({ x: -360, y: -300 }, "skill ceiling")
  skillCeiling.rule = { kind: "constant", value: 100 }
  const learningSource = makeCloud({ x: -540, y: -120 })
  const expertise = makeStock({ x: -180, y: -120 }, "Expertise")
  expertise.initialValue = 70
  const learning = makeFlow({ x: -360, y: -120 }, "learning", learningSource.id, expertise.id)
  // learning = factor × (skill ceiling − Expertise): practice pulls skill back up — the
  // Balancing brake. The further from mastery, the harder you study.
  learning.rule = { kind: "gap", factor: 0.04 }
  const atrophySink = makeCloud({ x: 300, y: -120 })
  const atrophy = makeFlow({ x: 80, y: -120 }, "atrophy", expertise.id, atrophySink.id)
  // atrophy = factor × AI reliance: the more you offload to AI, the faster unused skills
  // lapse — the side effect that makes this an addiction, not a fix.
  atrophy.rule = { kind: "proportional", factor: 0.6 }
  const accrualSource = makeCloud({ x: -540, y: 120 })
  const debt = makeStock({ x: -180, y: 120 }, "Technical debt")
  debt.initialValue = 20
  const accrual = makeFlow({ x: -360, y: 120 }, "debt accrual", accrualSource.id, debt.id)
  // debt accrual = factor × AI reliance: AI emits plausible code faster than anyone
  // reviews it, so debt grows the more you lean on it.
  accrual.rule = { kind: "proportional", factor: 0.9 }
  const refactorSink = makeCloud({ x: 300, y: 120 })
  const refactoring = makeFlow({ x: 80, y: 120 }, "refactoring", debt.id, refactorSink.id)
  // refactoring = factor × Expertise × Technical debt: skilled teams pay debt down in
  // proportion to how much there is — the Balancing payoff the spiral starves.
  refactoring.rule = { kind: "proportional", factor: 0.0009 }
  const reliance = makeConverter({ x: -180, y: 0 }, "AI reliance")
  // AI reliance = factor × Technical debt: the factor is how cheap and available models
  // are — lower model price, higher reliance per unit of debt.
  reliance.rule = { kind: "proportional", factor: 0.1 }
  return model(
    "AI deskilling spiral",
    [
      skillCeiling,
      learningSource,
      expertise,
      learning,
      atrophySink,
      atrophy,
      accrualSource,
      debt,
      accrual,
      refactorSink,
      refactoring,
      reliance,
    ],
    [
      link(skillCeiling, learning, "+"),
      link(expertise, learning, "-"),
      link(reliance, atrophy, "+"),
      link(debt, reliance, "+"),
      link(reliance, accrual, "+"),
      link(expertise, refactoring, "+"),
      link(debt, refactoring, "+"),
    ],
    // Expertise slides 70 → ~6 and Technical debt spirals 20 → ~150 over the window —
    // the Reinforcing loop clearly taking off, stopped (like "Escalation") before it
    // runs away off-chart.
    { start: 0, stop: 50, dt: 1 },
  )
}

/** The gallery, ordered simplest first. */
export const SAMPLES: Sample[] = [
  { title: "Bathtub", blurb: "A stock filled and drained — no feedback yet.", build: bathtub },
  {
    title: "Savings account",
    blurb: "Interest on a balance: a Reinforcing loop.",
    build: savings,
  },
  {
    title: "Coffee cooling",
    blurb: "Settling toward room temperature: a Balancing loop.",
    build: coffee,
  },
  {
    title: "Population",
    blurb: "Births and deaths: Reinforcing and Balancing together.",
    build: population,
  },
  {
    title: "Limits to growth",
    blurb: "Growth into a ceiling: a Reinforcing and a Balancing loop on one Flow.",
    build: limitsToGrowth,
  },
  {
    title: "Predator and prey",
    blurb: "Two coupled Stocks whose loops make them oscillate.",
    build: predatorPrey,
  },
  {
    title: "Epidemic",
    blurb: "Susceptible → Infected → Recovered: a chain of Stocks, no clouds.",
    build: epidemic,
  },
  {
    title: "Tragedy of the commons",
    blurb: "Two Reinforcing appetites drain one shared Stock: a system trap.",
    build: tragedyOfTheCommons,
  },
  {
    title: "Escalation",
    blurb: "An arms race: one Reinforcing loop spanning two Stocks.",
    build: escalation,
  },
  {
    title: "Fixes that fail",
    blurb: "Road building eases congestion (B) but induces the traffic that refills it (R).",
    build: fixesThatFail,
  },
  {
    title: "Drift to low performance",
    blurb: "An eroding goal leaves steady decay no floor: both slide downhill.",
    build: driftToLowPerformance,
  },
  {
    title: "Overshoot and collapse",
    blurb: "A fleet overfishes past the point of no return: the stock collapses for good.",
    build: overshootAndCollapse,
  },
  {
    title: "AI deskilling spiral",
    blurb: "Leaning on AI to hold quality erodes the expertise that holds it: shifting the burden.",
    build: aiDeskillingSpiral,
  },
]
