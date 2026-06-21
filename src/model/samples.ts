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
 * (Thinking in Systems, ch. 5), to contrast the healthy dynamics above — and, paired
 * with the first, the cure that escapes it:
 *
 *   8. Tragedy of the commons   — two Reinforcing herds overgraze a *renewable* shared
 *                                 Stock to bare dirt, then starve with it: all ruined.
 *   9. …commons, fixed          — the same renewable commons, but stocking is regulated
 *                                 against an agreed reserve: it holds, and the herds end
 *                                 *larger* than the trap's boom leaves alive.
 *  10. Escalation               — a single Reinforcing loop spanning two Stocks, with
 *                                 no brake in the structure: an arms race.
 *  11. Fixes that fail          — a fix drains the symptom Stock (B) while its side
 *                                 effect refills it (R): the cure feeds the disease.
 *  12. Drift to low performance — a goal that erodes toward actual performance, so the
 *                                 effort it drives never overcomes a steady decay: a
 *                                 Reinforcing loop ratchets both downward.
 *
 * Next, the dynamic the book is named for, and the one the gallery has saved until a
 * reader knows every piece it needs:
 *
 *  13. Overshoot and collapse   — a Reinforcing harvester on a *renewable* Resource with
 *                                 an extinction threshold (an Allee floor): a fleet
 *                                 overshoots the renewal rate and pushes the fishery past
 *                                 the point of no return. The dark twin of "Limits to
 *                                 growth" — the limit doesn't hold, it collapses for good.
 *
 * Last, the language pointed at a live debate — a classic trap (Shifting the burden to
 * the intervenor, ch. 5) wearing today's clothes:
 *
 *  14. AI deskilling spiral     — handing the burden of code quality to AI atrophies the
 *                                 Expertise that holds quality up, so the team leans on AI
 *                                 harder and Technical debt spirals: addiction, not a fix.
 *
 * And a mechanical coda — the gallery's one *hard* ceiling, to contrast the emergent
 * ones (above all "Limits to growth"):
 *
 *  15. Bathtub with an overflow — the tap runs flat out (a Constant inflow that never
 *                                 reads the level) and a spillway carries whatever rises
 *                                 past the brim into a second Stock, the floor. The only
 *                                 model on the `overflow` rule — a one-sided Gap, the
 *                                 threshold the smooth rules can't draw — so here the
 *                                 ceiling is *declared*, not emergent.
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

/**
 * Information Link between two already-built nodes, with an explicit polarity and
 * an optional why-note — the per-link half of each sample's selection tour (G4).
 */
function link(
  source: ModelNode,
  target: ModelNode,
  polarity: Polarity,
  description?: string,
): InformationLink {
  return {
    id: newId("link"),
    source: source.id,
    target: target.id,
    polarity,
    ...(description !== undefined && { description }),
  }
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
  water.description =
    "The water level — the one thing that accumulates here. It rises or falls only as the two flows differ."
  const sink = makeCloud({ x: 280, y: 0 })
  const filling = makeFlow(
    midpoint(source.position, water.position),
    "filling",
    source.id,
    water.id,
  )
  filling.description =
    "A constant 5 L/step from the tap (the Source cloud). Nothing reads the level, so it never reacts — pure inflow."
  const emptying = makeFlow(midpoint(water.position, sink.position), "emptying", water.id, sink.id)
  emptying.description =
    "A constant 3 L/step to the drain (the Sink). Slower than filling, so the level climbs in a straight line."
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
  balance.description = "The money in the account — the stock that interest compounds on."
  const interest = makeFlow(
    midpoint(source.position, balance.position),
    "interest",
    source.id,
    balance.id,
  )
  // interest = 5% × Balance (the `+` link). A Stock feeding its own inflow → the
  // Reinforcing loop runs as exponential growth.
  interest.rule = { kind: "proportional", factor: 0.05 }
  interest.description =
    "5% of the Balance paid in each step. Because it scales with the Balance, more money earns more — the loop's engine."
  return model(
    "Savings account",
    [source, balance, interest],
    [
      link(
        balance,
        interest,
        "+",
        "More Balance → more interest. This + feeds the Stock back into its own inflow, closing the Reinforcing loop: exponential growth.",
      ),
    ],
    {
      start: 0,
      stop: 40,
      dt: 1,
    },
  )
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
  coffee.description = "The cup's temperature — the level that cools over time toward the room."
  const sink = makeCloud({ x: 200, y: 0 })
  const cooling = makeFlow(midpoint(coffee.position, sink.position), "cooling", coffee.id, sink.id)
  // cooling = 0.1 × (Coffee − room): the `+` input is the level, the `−` the target.
  // An outflow closing the gap to room temperature → the Balancing loop settles there.
  cooling.rule = { kind: "gap", factor: 0.1 }
  cooling.description =
    "Heat leaving the cup, 10% of the gap to the room each step. The bigger the gap the faster it cools — and it stops once they match."
  const room = makeConverter({ x: 0, y: -160 }, "room temperature")
  room.rule = { kind: "constant", value: 20 }
  room.description =
    "Room temperature, a fixed 20 °C: the target the coffee settles toward, never changed by the model."
  return model(
    "Coffee cooling",
    [coffee, sink, cooling, room],
    [
      link(
        coffee,
        cooling,
        "+",
        "Hotter coffee → faster cooling. Coffee is the `+` input (the level) in the gap rule.",
      ),
      link(
        room,
        cooling,
        "-",
        "A warmer room → slower cooling. Room is the `−` input (the target); this lone minus makes the loop Balancing.",
      ),
    ],
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
  fertility.description =
    "Births per person per step (a fixed rate). Higher fertility lifts the birth rate."
  const lifeExpectancy = makeConverter({ x: -360, y: 240 }, "life expectancy")
  // Wired into deaths for the Balancing loop's structure, but not yet read by the
  // rate: a faithful "deaths = Population ÷ life expectancy" needs a divide rule we
  // don't have, so deaths uses a flat mortality rate below. (See the gallery notes.)
  lifeExpectancy.rule = { kind: "constant", value: 70 }
  lifeExpectancy.description =
    "How long people live (a fixed 70). Longer lives mean fewer deaths — wired in for the loop's shape, though the flat death rate here doesn't yet read it."
  const people = makeStock({ x: 0, y: 0 }, "Population")
  people.initialValue = 100
  people.unit = "people"
  people.description =
    "The population — births add to it, deaths drain it; everything else here just sets those two rates."
  const births = makeFlow({ x: -160, y: -160 }, "births", source.id, people.id)
  // births = fertility × Population (both `+` inputs): more people and higher
  // fertility, more births — the Reinforcing engine.
  births.rule = { kind: "proportional", factor: 1 }
  births.description =
    "New people arriving, fertility × Population. More people make more births — the Reinforcing inflow."
  const sink = makeCloud({ x: 360, y: 240 })
  const deaths = makeFlow({ x: 160, y: 160 }, "deaths", people.id, sink.id)
  // deaths = 2% of Population each step (its `+` input) — the Balancing drain. With
  // births at 3%, the Reinforcing loop wins and the population grows exponentially.
  deaths.rule = { kind: "proportional", factor: 0.02 }
  deaths.description =
    "People leaving, 2% of the population each step. More people make more deaths too — the Balancing outflow."
  return model(
    "Population",
    [source, people, sink, births, deaths, fertility, lifeExpectancy],
    [
      link(
        people,
        births,
        "+",
        "More people → more births: the + that makes the birth loop Reinforcing.",
      ),
      link(fertility, births, "+", "Higher fertility → more births."),
      link(
        people,
        deaths,
        "+",
        "More people → more deaths: the + that makes the death loop Balancing.",
      ),
      link(lifeExpectancy, deaths, "-", "Longer life expectancy → fewer deaths (the − input)."),
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
  yeast.description =
    "The yeast population — it multiplies on itself early, then a crowding die-off catches up and holds it at a ceiling."
  const growth = makeFlow(midpoint(source.position, yeast.position), "growth", source.id, yeast.id)
  // growth = 30% of Yeast (its `+` input): the Reinforcing engine.
  growth.rule = { kind: "proportional", factor: 0.3 }
  growth.description =
    "New cells, 30% of the population each step. More yeast → more growth — the Reinforcing engine that wins while the colony is small."
  const sink = makeCloud({ x: 360, y: 0 })
  const dieOff = makeFlow(midpoint(yeast.position, sink.position), "die-off", yeast.id, sink.id)
  // die-off = factor × Yeast × crowding. With crowding ∝ Yeast it scales as Yeast²,
  // so the Balancing drain overtakes the linear growth and Yeast plateaus.
  dieOff.rule = { kind: "proportional", factor: 0.0003 }
  dieOff.description =
    "Cells dying, scaled by Yeast × crowding (≈ Yeast²). It overtakes the linear growth as the colony fills up — the Balancing brake."
  // crowding ≈ the population density (proportional to Yeast), what drives the die-off.
  const crowding = makeConverter({ x: 200, y: -160 }, "crowding")
  crowding.rule = { kind: "proportional", factor: 1 }
  crowding.description =
    "Population density (∝ Yeast): the relay that lets the die-off grow with the square of the population, so a ceiling emerges."
  return model(
    "Limits to growth",
    [source, yeast, growth, sink, dieOff, crowding],
    [
      link(yeast, growth, "+", "More yeast → more growth: the Reinforcing +."),
      link(yeast, crowding, "+", "More yeast → more crowding (density rises with the population)."),
      link(yeast, dieOff, "+", "More yeast → more dying."),
      link(
        crowding,
        dieOff,
        "+",
        "More crowding → more dying. With yeast this makes the die-off ≈ Yeast² — the brake that caps growth.",
      ),
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
  rabbits.description =
    "The prey population — breeds on its own and is thinned by foxes; half of the oscillating pair."
  const preySink = makeCloud({ x: 320, y: -140 })
  const rabbitBirths = makeFlow(
    midpoint(preySource.position, rabbits.position),
    "rabbit births",
    preySource.id,
    rabbits.id,
  )
  // rabbits breed in proportion to themselves (Reinforcing) …
  rabbitBirths.rule = { kind: "proportional", factor: 0.08 }
  rabbitBirths.description =
    "Rabbits breeding, 8% of themselves each step — the Reinforcing growth the foxes keep in check."
  const predation = makeFlow(
    midpoint(rabbits.position, preySink.position),
    "predation",
    rabbits.id,
    preySink.id,
  )
  // … and are thinned by predation = rabbits × foxes (both `+`): the coupling term.
  predation.rule = { kind: "proportional", factor: 0.004 }
  predation.description =
    "Rabbits eaten, scaled by Rabbits × Foxes — the coupling term that ties the two populations together."
  const foxSource = makeCloud({ x: -480, y: 140 })
  const foxes = makeStock({ x: -80, y: 140 }, "Foxes")
  foxes.initialValue = 20
  foxes.description =
    "The predator population — fed by eating rabbits and dying off on its own; the other half of the pair."
  const foxSink = makeCloud({ x: 320, y: 140 })
  const foxBirths = makeFlow(
    midpoint(foxSource.position, foxes.position),
    "fox births",
    foxSource.id,
    foxes.id,
  )
  // foxes are born in proportion to the rabbits available to eat …
  foxBirths.rule = { kind: "proportional", factor: 0.02 }
  foxBirths.description =
    "New foxes, in proportion to the rabbits available to eat: more prey → more predators."
  const foxDeaths = makeFlow(
    midpoint(foxes.position, foxSink.position),
    "fox deaths",
    foxes.id,
    foxSink.id,
  )
  // … and die off on their own. The lag around the loop makes the two populations
  // chase each other. (Forward Euler damps the orbit — see the gallery notes.)
  foxDeaths.rule = { kind: "proportional", factor: 0.2 }
  foxDeaths.description =
    "Foxes dying off on their own — the drain that thins the predators once the rabbits they feed on run low."
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
      link(
        rabbits,
        rabbitBirths,
        "+",
        "More rabbits → more rabbit births: the prey's Reinforcing loop.",
      ),
      link(rabbits, predation, "+", "More rabbits → more of them get eaten."),
      link(
        foxes,
        predation,
        "+",
        "More foxes → more predation. With rabbits, this product is the kill rate.",
      ),
      link(rabbits, foxBirths, "+", "More rabbits → more foxes born (food drives the predators)."),
      link(foxes, foxDeaths, "+", "More foxes → more fox deaths."),
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
  susceptible.description =
    "People who can still catch it — the pool the outbreak draws from, draining as it spreads."
  const infected = makeStock({ x: 0, y: 0 }, "Infected")
  infected.initialValue = 10
  infected.unit = "people"
  infected.description =
    "People currently carrying and spreading it — rises in the outbreak, then drains as they recover."
  const recovered = makeStock({ x: 280, y: 0 }, "Recovered")
  recovered.initialValue = 0
  recovered.unit = "people"
  recovered.description =
    "People past the illness and immune — a terminal Stock on no loop; it only ever fills."
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
  infection.description =
    "New cases, ∝ infectivity × Susceptible × Infected: it needs both a carrier and someone to infect, so it speeds up as Infected grows, then starves as Susceptible runs out."
  const recovery = makeFlow(
    midpoint(infected.position, recovered.position),
    "recovery",
    infected.id,
    recovered.id,
  )
  // recovery = 15% of the Infected each step (its one `+` input).
  recovery.rule = { kind: "proportional", factor: 0.15 }
  recovery.description =
    "People recovering, 15% of the Infected each step — the Balancing drain that ends the outbreak."
  const infectivity = makeConverter({ x: -140, y: -160 }, "infectivity")
  // Small, so infectivity × S × I stays a sane rate (R0 = infectivity·S₀/γ ≈ 2.6).
  infectivity.rule = { kind: "constant", value: 0.0004 }
  infectivity.description =
    "How contagious it is (a fixed rate): the dial that sets R₀ and the overall pace of the outbreak."
  return model(
    "Epidemic",
    [susceptible, infected, recovered, infection, recovery, infectivity],
    [
      link(susceptible, infection, "+", "More susceptibles → faster spread."),
      link(
        infected,
        infection,
        "+",
        "More carriers → faster spread: the Reinforcing arm of the outbreak.",
      ),
      link(infected, recovery, "+", "More infected → more recoveries."),
      link(infectivity, infection, "+", "Higher infectivity → faster spread."),
    ],
    { start: 0, stop: 60, dt: 1 },
  )
}

/**
 * Tragedy of the commons — Meadows' first system *trap*, and the bleakest: several users
 * sharing one *renewable* resource, each breeding its own herd heedless of the commons'
 * condition, until they overshoot it and all lose. The Pasture grows back like a
 * population — fastest at mid-levels, but bare ground barely regrows (regrowth ∝
 * Pasture × headroom, where headroom = capacity − Pasture). Each Herd breeds the more
 * cattle it has (Herd → [+] → growth: a Reinforcing engine) and grazes the shared
 * Pasture; cattle also die off naturally (Herd → [−] → deaths). The one restraint, the
 * Pasture → [+] → growth link, runs through the *shared* Stock and only *speeds* breeding
 * — it never stops it, so two herds racing each other overshoot the renewal rate. They
 * graze the commons to bare dirt; with no grass to regrow from, the Pasture stays dead,
 * and with nothing to eat the herds starve and crash too. Resource and users ruined
 * together. The trap is structural: each herder gains privately by breeding, while the
 * cost of overgrazing falls on the commons they all depend on. ("…commons, fixed" keeps
 * this exact renewable Pasture and only regulates the herds — the cure is regulation,
 * not regrowth.)
 */
function tragedyOfTheCommons(): Model {
  const pasture = makeStock({ x: 0, y: 0 }, "Pasture")
  pasture.initialValue = 1000
  pasture.description =
    "The shared grass — a renewable commons that grows back like a population: fastest at mid-levels, barely at all once it is bare. Here two herds graze it to nothing."
  // Renewal on top: regrowth ∝ Pasture × headroom (logistic) — it needs existing grass
  // *and* room to grow, so a meadow grazed to bare dirt cannot come back.
  const renewSource = makeCloud({ x: 0, y: -360 })
  const regrowth = makeFlow({ x: 0, y: -180 }, "regrowth", renewSource.id, pasture.id)
  // regrowth = factor × Pasture × headroom: grass from grass (the `+` Pasture input)
  // capped by headroom. Zero when the Pasture is bare — the floor the trap falls through.
  regrowth.rule = { kind: "proportional", factor: 0.000075 }
  regrowth.description =
    "Grass growing back, ∝ Pasture × headroom: it needs both standing grass and room to spread. Bare ground (Pasture ≈ 0) regrows nothing — so the collapse is final."
  const capacity = makeConverter({ x: -320, y: -260 }, "capacity")
  capacity.rule = { kind: "constant", value: 1000 }
  capacity.description =
    "The meadow's full grass cover (a constant) — the ceiling growth runs into."
  const headroom = makeConverter({ x: 320, y: -260 }, "headroom")
  // headroom = capacity − Pasture (a Gap): the room left to grow, which throttles regrowth
  // as the meadow fills. Pasture × headroom makes regrowth the classic logistic curve.
  headroom.rule = { kind: "gap", factor: 1 }
  headroom.description =
    "Room left to grow, capacity − Pasture (a Gap). Multiplied into regrowth it makes the renewal logistic — peaking mid-way, vanishing at empty and full."
  // Two symmetric herds: cattle breed in from a Source, die off to one Sink, and their
  // grazing drains the shared Pasture to another. Nothing reads the Pasture to *restrain*
  // breeding — the missing feedback that makes this a trap.
  const sourceA = makeCloud({ x: -760, y: 0 })
  const herdA = makeStock({ x: -380, y: 0 }, "Herd A")
  herdA.initialValue = 10
  herdA.description =
    "Herd A's cattle — breeds on itself, grazes the shared Pasture, and starves once the grass is gone."
  const growthA = makeFlow(
    midpoint(sourceA.position, herdA.position),
    "growth A",
    sourceA.id,
    herdA.id,
  )
  // growth = factor × herd × Pasture (both `+`): the Reinforcing breeding engine. It
  // reads the Pasture, but only to speed up — never to stop — so it overshoots.
  growthA.rule = { kind: "proportional", factor: 0.00018 }
  growthA.description =
    "Herd A breeding, ∝ herd × Pasture: more cattle and more grass both speed it — the Reinforcing engine that overshoots the commons."
  const deathSinkA = makeCloud({ x: -560, y: 220 })
  const deathsA = makeFlow({ x: -470, y: 120 }, "deaths A", herdA.id, deathSinkA.id)
  // deaths = 8% of the herd: ordinary mortality. Harmless while grass is plentiful; once
  // the Pasture is grazed out, breeding stalls (∝ Pasture → 0) and this drain wins.
  deathsA.rule = { kind: "proportional", factor: 0.08 }
  deathsA.description =
    "Cattle A dying, 8% of the herd. Once the Pasture is gone and breeding stalls, this linear drain starves the herd to nothing."
  const grazeSinkA = makeCloud({ x: -180, y: 300 })
  const grazingA = makeFlow(
    midpoint(pasture.position, grazeSinkA.position),
    "grazing A",
    pasture.id,
    grazeSinkA.id,
  )
  grazingA.rule = { kind: "proportional", factor: 0.06 }
  grazingA.description =
    "Grass eaten by Herd A, 6% of the herd, drained from the shared Pasture — one of two appetites racing the renewal rate."
  const sourceB = makeCloud({ x: 760, y: 0 })
  const herdB = makeStock({ x: 380, y: 0 }, "Herd B")
  herdB.initialValue = 10
  herdB.description =
    "Herd B's cattle — identical to A, racing it for the same grass and starving with it."
  const growthB = makeFlow(
    midpoint(sourceB.position, herdB.position),
    "growth B",
    sourceB.id,
    herdB.id,
  )
  growthB.rule = { kind: "proportional", factor: 0.00018 }
  growthB.description = "Herd B breeding, the same Reinforcing rule as A on the shared Pasture."
  const deathSinkB = makeCloud({ x: 560, y: 220 })
  const deathsB = makeFlow({ x: 470, y: 120 }, "deaths B", herdB.id, deathSinkB.id)
  deathsB.rule = { kind: "proportional", factor: 0.08 }
  deathsB.description =
    "Cattle B dying, 8% of the herd — the drain that starves the herd once the grass is gone."
  const grazeSinkB = makeCloud({ x: 180, y: 300 })
  const grazingB = makeFlow(
    midpoint(pasture.position, grazeSinkB.position),
    "grazing B",
    pasture.id,
    grazeSinkB.id,
  )
  grazingB.rule = { kind: "proportional", factor: 0.06 }
  grazingB.description = "Grass eaten by Herd B — the second appetite draining the same Stock."
  return model(
    "Tragedy of the commons",
    [
      pasture,
      renewSource,
      regrowth,
      capacity,
      headroom,
      sourceA,
      herdA,
      growthA,
      deathSinkA,
      deathsA,
      grazeSinkA,
      grazingA,
      sourceB,
      herdB,
      growthB,
      deathSinkB,
      deathsB,
      grazeSinkB,
      grazingB,
    ],
    [
      link(capacity, headroom, "+", "More capacity → more room to grow."),
      link(pasture, headroom, "-", "More Pasture → less room left: headroom = capacity − Pasture."),
      link(
        pasture,
        regrowth,
        "+",
        "More Pasture → more regrowth: grass grows from grass (zero when bare).",
      ),
      link(
        headroom,
        regrowth,
        "+",
        "More room → more regrowth; with Pasture this makes renewal logistic.",
      ),
      link(herdA, growthA, "+", "More cattle in A → more breeding: A's Reinforcing engine."),
      link(
        pasture,
        growthA,
        "+",
        "More Pasture → faster breeding for A: the weak shared brake that only speeds growth, never stops it.",
      ),
      link(herdA, deathsA, "+", "More cattle in A → more deaths."),
      link(herdA, grazingA, "+", "More cattle in A → more grazing off the commons."),
      link(herdB, growthB, "+", "More cattle in B → more breeding: B's Reinforcing engine."),
      link(
        pasture,
        growthB,
        "+",
        "More Pasture → faster breeding for B: the same shared brake, too weak to stop the race.",
      ),
      link(herdB, deathsB, "+", "More cattle in B → more deaths."),
      link(herdB, grazingB, "+", "More cattle in B → more grazing off the commons."),
    ],
    // The two Reinforcing herds overshoot the renewal rate: cattle boom to ~400 by t≈50
    // while the Pasture is grazed 1000 → 0 by t≈75. With no grass to regrow from, the
    // commons stays dead and the herds starve back toward 0 — resource and users ruined.
    { start: 0, stop: 150, dt: 1 },
  )
}

/**
 * Tragedy of the commons, fixed — the companion to the trap above, sharing its *exact*
 * renewable Pasture: the same logistic regrowth toward the same capacity. The one change
 * is the cure Donella Meadows prescribes: regulate the commons. The herds no longer breed
 * unchecked — the trap's Reinforcing breeding engine is gone — instead each herd's
 * *stocking* is governed by the shared Pasture against an agreed *reserve* (stocking ∝
 * Pasture − reserve): put cattle on while there is surplus grass, cull as the Pasture is
 * drawn down to the reserve. That closes a Balancing loop per herd (Pasture → stocking →
 * Herd → grazing → Pasture), restoring the feedback the trap was missing. So the same
 * grass the trap grazed to bare dirt now holds near the reserve, and both herds settle at
 * a sustainable size — *more* cattle than the trap's boom leaves alive once it starves,
 * on a commons that survives. Same renewable resource, same two users: the difference is
 * regulation, not regrowth — and it is the difference between everyone losing and lasting.
 */
function tragedyOfTheCommonsFixed(): Model {
  const pasture = makeStock({ x: 0, y: 0 }, "Pasture")
  pasture.initialValue = 1000
  pasture.description =
    "The shared grass — the same renewable commons as the trap, with the same logistic regrowth. Here the quota holds it near its reserve instead of letting it be grazed to dirt."
  // Renewal on top: regrowth ∝ Pasture × headroom (logistic) — identical to the trap.
  // What changes below is how the herds decide, not how the grass grows.
  const renewSource = makeCloud({ x: 0, y: -360 })
  const regrowth = makeFlow({ x: 0, y: -180 }, "regrowth", renewSource.id, pasture.id)
  // regrowth = factor × Pasture × headroom: the same logistic renewal as the trap. What
  // differs is that regulated stocking never overshoots it, so the grass is never wiped out.
  regrowth.rule = { kind: "proportional", factor: 0.000075 }
  regrowth.description =
    "Grass growing back, ∝ Pasture × headroom: the same logistic renewal as the trap. What differs is that regulated stocking never overshoots it."
  const capacity = makeConverter({ x: -320, y: -260 }, "capacity")
  capacity.rule = { kind: "constant", value: 1000 }
  capacity.description =
    "The meadow's full grass cover (a constant) — the ceiling growth runs into."
  const headroom = makeConverter({ x: 320, y: -260 }, "headroom")
  // headroom = capacity − Pasture (a Gap): the room left to grow, which throttles regrowth
  // as the meadow fills — the same logistic machinery the trap uses.
  headroom.rule = { kind: "gap", factor: 1 }
  headroom.description =
    "Room left to grow, capacity − Pasture (a Gap). Multiplied into regrowth it makes the renewal logistic — the same as in the trap."
  // The agreed quota target, shared by both herds: stocking stops once the Pasture is
  // grazed down to here. The single number that turns the trap into a managed commons.
  const reserve = makeConverter({ x: 0, y: 360 }, "reserve")
  reserve.rule = { kind: "constant", value: 600 }
  reserve.description =
    "The floor both herders agree to protect (a constant) — the quota target. As the Pasture nears it, stocking falls to zero."
  // Two symmetric herds: cattle enter from a Source, grass leaves the Pasture downward to
  // a Sink. The herd's inflow is now a quota, not self-breeding — and with no breeding
  // there is no herd to starve, so the trap's mortality outflow is gone too.
  const sourceA = makeCloud({ x: -760, y: 0 })
  const herdA = makeStock({ x: -380, y: 0 }, "Herd A")
  herdA.initialValue = 10
  herdA.description =
    "Herd A's cattle — no longer breeding on themselves; its size is set by the quota, which reads the shared Pasture."
  const stockingA = makeFlow(
    midpoint(sourceA.position, herdA.position),
    "stocking A",
    sourceA.id,
    herdA.id,
  )
  // stocking = factor × (Pasture − reserve): a Gap rule. Add cattle while there is
  // surplus grass above the reserve, taper to zero as the Pasture nears it — the
  // restored feedback, resource condition governing the decision.
  stockingA.rule = { kind: "gap", factor: 0.003 }
  stockingA.description =
    "Cattle A puts on the commons, ∝ (Pasture − reserve): stock up while grass is above the reserve, taper to nothing as it nears it. The restored feedback."
  const sinkA = makeCloud({ x: -230, y: 300 })
  const grazingA = makeFlow(
    midpoint(pasture.position, sinkA.position),
    "grazing A",
    pasture.id,
    sinkA.id,
  )
  // grazing = 6% of the herd, drained from the shared Pasture — the same appetite as
  // the trap, but now matched by regrowth instead of racing it to bare dirt.
  grazingA.rule = { kind: "proportional", factor: 0.06 }
  grazingA.description =
    "Grass eaten by Herd A, 6% of the herd, drained from the shared Pasture — the same appetite as the trap, now matched by regrowth."
  const sourceB = makeCloud({ x: 760, y: 0 })
  const herdB = makeStock({ x: 380, y: 0 }, "Herd B")
  herdB.initialValue = 10
  herdB.description =
    "Herd B's cattle — identical to A and under the same shared quota: both users governed by the commons' condition."
  const stockingB = makeFlow(
    midpoint(sourceB.position, herdB.position),
    "stocking B",
    sourceB.id,
    herdB.id,
  )
  stockingB.rule = { kind: "gap", factor: 0.003 }
  stockingB.description =
    "Cattle B puts on, the same quota rule as A — both stockings read the one shared Pasture against the one reserve."
  const sinkB = makeCloud({ x: 230, y: 300 })
  const grazingB = makeFlow(
    midpoint(pasture.position, sinkB.position),
    "grazing B",
    pasture.id,
    sinkB.id,
  )
  grazingB.rule = { kind: "proportional", factor: 0.06 }
  grazingB.description =
    "Grass eaten by Herd B — the second appetite, held in check by the same regulating loop."
  return model(
    "Tragedy of the commons, fixed",
    [
      pasture,
      renewSource,
      regrowth,
      capacity,
      headroom,
      reserve,
      sourceA,
      herdA,
      stockingA,
      sinkA,
      grazingA,
      sourceB,
      herdB,
      stockingB,
      sinkB,
      grazingB,
    ],
    [
      link(capacity, headroom, "+", "More capacity → more room to grow."),
      link(pasture, headroom, "-", "More Pasture → less room left: headroom = capacity − Pasture."),
      link(
        pasture,
        regrowth,
        "+",
        "More Pasture → more regrowth: grass grows from grass (zero when bare).",
      ),
      link(
        headroom,
        regrowth,
        "+",
        "More room → more regrowth; with Pasture this makes renewal logistic.",
      ),
      link(
        pasture,
        stockingA,
        "+",
        "More Pasture above the reserve → more stocking for A: resource condition now drives the decision.",
      ),
      link(
        reserve,
        stockingA,
        "-",
        "The reserve is the target stocking defends — as the Pasture nears it, A's stocking falls to zero.",
      ),
      link(herdA, grazingA, "+", "More cattle in A → more grazing off the commons."),
      link(
        pasture,
        stockingB,
        "+",
        "More Pasture above the reserve → more stocking for B: the same restored feedback.",
      ),
      link(
        reserve,
        stockingB,
        "-",
        "The same reserve governs B — both herds back off as the Pasture approaches it.",
      ),
      link(herdB, grazingB, "+", "More cattle in B → more grazing off the commons."),
    ],
    // The Pasture eases 1000 → ~580 (near the reserve) and holds; both herds climb from
    // 10 and level off (~150) at the size the renewal can feed — far more than the trap's
    // boom leaves alive. A sustainable equilibrium where the trap collapsed for good.
    { start: 0, stop: 350, dt: 1 },
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
  blueArsenal.description = "Blue's weapons — built up purely in answer to Red's."
  const blueBuildup = makeFlow(
    midpoint(blueSource.position, blueArsenal.position),
    "Blue buildup",
    blueSource.id,
    blueArsenal.id,
  )
  // Each side builds in proportion to the other's arsenal (its one `+` input), so
  // the two feed each other: a Reinforcing loop with no brake → unbounded growth.
  blueBuildup.rule = { kind: "proportional", factor: 0.1 }
  blueBuildup.description =
    "Blue arming, 10% of Red's arsenal each step — it reacts only to the other side, never to itself."
  const redSource = makeCloud({ x: -560, y: 120 })
  const redArsenal = makeStock({ x: 280, y: 120 }, "Red arsenal")
  redArsenal.initialValue = 12
  redArsenal.description =
    "Red's weapons — built up purely in answer to Blue's; the mirror of Blue."
  const redBuildup = makeFlow(
    midpoint(redSource.position, redArsenal.position),
    "Red buildup",
    redSource.id,
    redArsenal.id,
  )
  redBuildup.rule = { kind: "proportional", factor: 0.1 }
  redBuildup.description = "Red arming, 10% of Blue's arsenal each step — the symmetric response."
  return model(
    "Escalation",
    [blueSource, blueArsenal, blueBuildup, redSource, redArsenal, redBuildup],
    [
      link(blueArsenal, redBuildup, "+", "More Blue → more Red buildup."),
      link(
        redArsenal,
        blueBuildup,
        "+",
        "More Red → more Blue buildup. With the other +, the loop has no minus → Reinforcing: both grow without bound.",
      ),
    ],
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
  congestion.description =
    "Traffic congestion — the symptom. Road building drains it, but the induced driving keeps refilling it."
  const driving = makeFlow({ x: -120, y: 120 }, "driving", source.id, congestion.id)
  // driving = 1.5 × road building (its `+` input): every new road induces *more*
  // traffic than it cleared — the side effect that refills the symptom.
  driving.rule = { kind: "proportional", factor: 1.5 }
  driving.description =
    "Traffic pouring in, 1.5× the road building — every new road induces more driving than it cleared: the backfiring side effect."
  const sink = makeCloud({ x: 300, y: -160 })
  const roadBuilding = makeFlow({ x: -120, y: -160 }, "road building", congestion.id, sink.id)
  // road building = 40% of Congestion (its `+` input), draining it: the Balancing
  // fix. But induced driving outweighs it, so the Reinforcing loop wins and
  // Congestion climbs anyway — you can't build your way out of traffic.
  roadBuilding.rule = { kind: "proportional", factor: 0.4 }
  roadBuilding.description =
    "Capacity added, 40% of the Congestion — the quick fix that drains the symptom (a Balancing outflow)."
  return model(
    "Fixes that fail",
    [source, congestion, driving, sink, roadBuilding],
    [
      link(
        congestion,
        roadBuilding,
        "+",
        "More congestion → more road building: the fix responding to the symptom.",
      ),
      link(
        roadBuilding,
        driving,
        "+",
        "More roads → more driving. This + closes the Reinforcing loop that refills congestion — you can't build your way out of traffic.",
      ),
    ],
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
  performance.description =
    "Actual performance — pushed up by improvement, leaked away by decay, and forever chasing a Standard that keeps sinking under it."
  const improvement = makeFlow(
    midpoint(source.position, performance.position),
    "improvement",
    source.id,
    performance.id,
  )
  // improvement closes the gap upward: 10% of (Standard − Performance), pulling
  // Performance toward the Standard — the one force resisting decay.
  improvement.rule = { kind: "gap", factor: 0.1 }
  improvement.description =
    "Effort closing the gap up to the Standard, 10% per step — the one force resisting decay."
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
  decay.description =
    "Steady erosion, 2/step (wear, rising demands): the ever-present downward pressure improvement has to offset."
  const standard = makeStock({ x: 160, y: -120 }, "Standard")
  standard.initialValue = 80
  standard.description =
    "The goal you hold yourself to — but it slips toward whatever you're actually delivering, so it never holds a floor."
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
  slippage.description =
    "The Standard eroding toward actual Performance, 10% of the gap — what removes the floor and lets both slide down together."
  return model(
    "Drift to low performance",
    [source, performance, improvement, decay, decaySink, standard, slippageSink, slippage],
    [
      link(
        standard,
        improvement,
        "+",
        "Standard is the level in improvement's gap: a higher Standard opens a wider gap → more improvement.",
      ),
      link(
        performance,
        improvement,
        "-",
        "Performance is the target: the closer it climbs to the Standard, the less improvement is needed (the − input).",
      ),
      link(
        standard,
        slippage,
        "+",
        "Standard is the level in slippage's gap: the higher it sits above Performance, the faster it sags.",
      ),
      link(
        performance,
        slippage,
        "-",
        "Performance is the target slippage drags the Standard toward (the − input). Two minuses round the loop → Reinforcing: both ratchet downhill.",
      ),
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
  fish.description =
    "The fishery — a renewable resource that regrows by spawning but has a floor (the Allee threshold) below which it can't recover."
  // density ∝ Fish: how easily fish meet to spawn. Relays Fish into the births term so
  // spawning reads as ~Fish² — the Allee mechanism (sparse fish breed slowly).
  const density = makeConverter({ x: -700, y: -80 }, "density")
  density.rule = { kind: "proportional", factor: 1 }
  density.description =
    "How easily fish meet to spawn (∝ Fish). Relays the stock into spawning so births scale with ≈ Fish² — sparse fish breed slowly."
  // crowding ∝ Fish² (Fish × density): the overcrowding pressure that lifts crowding
  // deaths to ~Fish³, so the stock plateaus at its carrying capacity. A Converter read
  // by a Converter — the only such wiring in the gallery.
  const crowding = makeConverter({ x: -700, y: 80 }, "crowding")
  crowding.rule = { kind: "proportional", factor: 1 }
  crowding.description =
    "Overcrowding pressure (∝ Fish²). Lifts crowding deaths to ≈ Fish³ so a healthy stock plateaus at carrying capacity. A Converter read by a Converter."
  const spawnSource = makeCloud({ x: -420, y: -320 })
  const spawning = makeFlow({ x: -420, y: -160 }, "spawning", spawnSource.id, fish.id)
  // spawning = factor × Fish × density (~Fish²): the Reinforcing birth engine that
  // needs a crowd — it falls away faster than deaths as the Fish thin out.
  spawning.rule = { kind: "proportional", factor: 0.00036 }
  spawning.description =
    "Births, ∝ Fish × density (≈ Fish²): the Reinforcing engine that needs a crowd — it falls away faster than deaths as the Fish thin out."
  const deathSink = makeCloud({ x: -720, y: 280 })
  const naturalDeaths = makeFlow({ x: -580, y: 180 }, "natural deaths", fish.id, deathSink.id)
  // natural deaths = factor × Fish (linear): the Balancing drain that *wins* below the
  // Allee threshold, where ~Fish² spawning can no longer keep up — and extinction follows.
  naturalDeaths.rule = { kind: "proportional", factor: 0.01 }
  naturalDeaths.description =
    "Ordinary mortality, linear in Fish. Below the Allee threshold this linear drain beats ≈ Fish² spawning, and extinction follows."
  const crowdSink = makeCloud({ x: -420, y: 320 })
  const crowdingDeaths = makeFlow({ x: -420, y: 160 }, "crowding deaths", fish.id, crowdSink.id)
  // crowding deaths = factor × Fish × crowding (~Fish³): the steep Balancing ceiling
  // that holds the healthy stock at carrying capacity.
  crowdingDeaths.rule = { kind: "proportional", factor: 3e-7 }
  crowdingDeaths.description =
    "Deaths from overcrowding, ≈ Fish³: the steep Balancing ceiling that holds a healthy stock at carrying capacity."
  const catchSink = makeCloud({ x: -90, y: 220 })
  const catching = makeFlow({ x: -255, y: 90 }, "catch", fish.id, catchSink.id)
  // catch = factor × Fish × Boats (both `+`): more boats and more fish both lift the
  // haul. This is what overshoots the renewal rate and pulls Fish under the threshold.
  catching.rule = { kind: "proportional", factor: 0.0004 }
  catching.description =
    "The catch, ∝ Fish × Boats: more boats and more fish both lift the haul. This is what overshoots renewal and drags Fish under the threshold."
  const boats = makeStock({ x: 420, y: 0 }, "Boats")
  boats.initialValue = 5
  boats.description =
    "The fishing fleet — reinvests its catch into more boats, so it compounds and overshoots, then scraps itself once the fish are gone."
  const fleetSource = makeCloud({ x: 420, y: -320 })
  const fleetGrowth = makeFlow({ x: 420, y: -160 }, "fleet growth", fleetSource.id, boats.id)
  // fleet growth = factor × catch (its one `+` input): the revenue reinvested — a Flow
  // feeding a Flow, the edge that closes the Reinforcing loop through Boats.
  fleetGrowth.rule = { kind: "proportional", factor: 0.5 }
  fleetGrowth.description =
    "New boats bought from revenue, ∝ catch — a Flow feeding a Flow; the edge that closes the Reinforcing loop through Boats."
  const scrapSink = makeCloud({ x: 420, y: 320 })
  const scrapping = makeFlow({ x: 420, y: 160 }, "scrapping", boats.id, scrapSink.id)
  // scrapping = factor × Boats (its `+` input): the Balancing drain that takes the fleet
  // down once the catch can no longer feed fleet growth.
  scrapping.rule = { kind: "proportional", factor: 0.04 }
  scrapping.description =
    "Boats retired, linear in Boats — the Balancing drain that shrinks the fleet once the catch can no longer feed growth."
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
      link(fish, density, "+", "More Fish → higher density (easier to meet and spawn)."),
      link(fish, crowding, "+", "More Fish → more crowding pressure."),
      link(density, crowding, "+", "Density feeds crowding, so crowding tracks ≈ Fish²."),
      link(fish, spawning, "+", "More Fish → more spawning."),
      link(
        density,
        spawning,
        "+",
        "Higher density → more spawning. With Fish this makes births ≈ Fish² — the Allee mechanism.",
      ),
      link(fish, naturalDeaths, "+", "More Fish → more natural deaths (linear)."),
      link(fish, crowdingDeaths, "+", "More Fish → more crowding deaths."),
      link(
        crowding,
        crowdingDeaths,
        "+",
        "More crowding → more crowding deaths. With Fish this makes deaths ≈ Fish³ — the carrying-capacity ceiling.",
      ),
      link(fish, catching, "+", "More Fish → a bigger catch."),
      link(
        boats,
        catching,
        "+",
        "More Boats → a bigger catch: the coupling that overfishes the stock.",
      ),
      link(
        catching,
        fleetGrowth,
        "+",
        "A bigger catch → more boats bought: the + that makes the fleet loop Reinforcing.",
      ),
      link(boats, scrapping, "+", "More Boats → more scrapping (the Balancing drain)."),
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
  skillCeiling.description =
    "The team's potential skill (a fixed 100): the ceiling learning pulls Expertise back toward."
  const learningSource = makeCloud({ x: -540, y: -120 })
  const expertise = makeStock({ x: -180, y: -120 }, "Expertise")
  expertise.initialValue = 70
  expertise.description =
    "The team's skill — built by learning, drained by atrophy as work is offloaded to AI. Read its inverse as lead time."
  const learning = makeFlow({ x: -360, y: -120 }, "learning", learningSource.id, expertise.id)
  // learning = factor × (skill ceiling − Expertise): practice pulls skill back up — the
  // Balancing brake. The further from mastery, the harder you study.
  learning.rule = { kind: "gap", factor: 0.04 }
  learning.description =
    "Practice closing the gap up to the skill ceiling, 4% per step — the Balancing brake, tuned here to lose to the spiral."
  const atrophySink = makeCloud({ x: 300, y: -120 })
  const atrophy = makeFlow({ x: 80, y: -120 }, "atrophy", expertise.id, atrophySink.id)
  // atrophy = factor × AI reliance: the more you offload to AI, the faster unused skills
  // lapse — the side effect that makes this an addiction, not a fix.
  atrophy.rule = { kind: "proportional", factor: 0.6 }
  atrophy.description =
    "Skills lapsing, ∝ AI reliance: the more you offload to AI, the faster unused skills fade — the side effect that makes this an addiction."
  const accrualSource = makeCloud({ x: -540, y: 120 })
  const debt = makeStock({ x: -180, y: 120 }, "Technical debt")
  debt.initialValue = 20
  debt.description =
    "Technical debt — grows as AI emits unreviewed code, paid down by refactoring. Read its inverse as code quality."
  const accrual = makeFlow({ x: -360, y: 120 }, "debt accrual", accrualSource.id, debt.id)
  // debt accrual = factor × AI reliance: AI emits plausible code faster than anyone
  // reviews it, so debt grows the more you lean on it.
  accrual.rule = { kind: "proportional", factor: 0.9 }
  accrual.description =
    "Debt added, ∝ AI reliance: AI writes plausible code faster than anyone reviews it."
  const refactorSink = makeCloud({ x: 300, y: 120 })
  const refactoring = makeFlow({ x: 80, y: 120 }, "refactoring", debt.id, refactorSink.id)
  // refactoring = factor × Expertise × Technical debt: skilled teams pay debt down in
  // proportion to how much there is — the Balancing payoff the spiral starves.
  refactoring.rule = { kind: "proportional", factor: 0.0009 }
  refactoring.description =
    "Debt paid down, ∝ Expertise × Technical debt: skilled teams clear it in proportion to how much there is — the Balancing payoff the spiral starves."
  const reliance = makeConverter({ x: -180, y: 0 }, "AI reliance")
  // AI reliance = factor × Technical debt: the factor is how cheap and available models
  // are — lower model price, higher reliance per unit of debt.
  reliance.rule = { kind: "proportional", factor: 0.1 }
  reliance.description =
    "How hard the team leans on AI, ∝ Technical debt. The factor is how cheap and available models are — lower price, higher reliance."
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
      link(
        skillCeiling,
        learning,
        "+",
        "Skill ceiling is the level in learning's gap: the higher it sits above current skill, the more you study.",
      ),
      link(
        expertise,
        learning,
        "-",
        "Expertise is the target: the closer to mastery, the less there is left to learn (the − input).",
      ),
      link(reliance, atrophy, "+", "More AI reliance → faster atrophy of skills."),
      link(
        debt,
        reliance,
        "+",
        "More debt → more AI reliance: the pressure that drives the offloading.",
      ),
      link(reliance, accrual, "+", "More AI reliance → more debt accrued."),
      link(
        expertise,
        refactoring,
        "+",
        "More Expertise → more refactoring (skilled teams pay debt down).",
      ),
      link(
        debt,
        refactoring,
        "+",
        "More debt → more refactoring. With Expertise, this is the Balancing payoff that weakens as skills fade.",
      ),
    ],
    // Expertise slides 70 → ~6 and Technical debt spirals 20 → ~150 over the window —
    // the Reinforcing loop clearly taking off, stopped (like "Escalation") before it
    // runs away off-chart.
    { start: 0, stop: 50, dt: 1 },
  )
}

/**
 * Bathtub with an overflow — the bathtub given a hard ceiling the honest way. The tap
 * keeps running flat out (filling stays a Constant; it never reads the level), and a
 * spillway carries off whatever rises past the brim: overflow = max(0, factor ×
 * (Water − capacity)). That `overflow` rule is a one-sided Gap — shut until Water passes
 * the `−` threshold (capacity), then draining the excess into a second Stock, the Floor.
 * The loop Water → overflow → Water carries one `−` (the outflow) → Balancing, so Water
 * climbs in a straight line, then plateaus just above the brim — a weir needs a little
 * head of water to discharge — while the Floor goes on filling. The equilibrium comes
 * from the *spill*, not from the inflow easing off: the counterpoint to a float valve,
 * which throttles the inflow instead, and to "Limits to growth", whose ceiling emerges.
 */
function bathtubOverflow(): Model {
  const source = makeCloud({ x: -280, y: 0 })
  const water = makeStock({ x: 0, y: 0 }, "Water")
  water.initialValue = 20
  water.unit = "L"
  water.description =
    "The water level — the tap fills it in a straight line, then it holds just above the brim as the overflow carries off everything extra."
  const filling = makeFlow(
    midpoint(source.position, water.position),
    "filling",
    source.id,
    water.id,
  )
  // A constant tap — it never reads the level, so it keeps pouring even at the brim.
  // The ceiling comes from the overflow below, not from the inflow easing off.
  filling.rule = { kind: "constant", value: 5 }
  filling.description =
    "A constant 5 L/step from the tap (the Source cloud), running flat out. It never throttles — the ceiling is the overflow's doing, not the tap's."
  const floor = makeStock({ x: 0, y: 240 }, "Floor")
  floor.initialValue = 0
  floor.unit = "L"
  floor.description =
    "Water spilled onto the floor — the second Stock the overflow collects in. Empty until the tub brims, then it fills at the spill rate."
  const overflow = makeFlow(
    midpoint(water.position, floor.position),
    "overflow",
    water.id,
    floor.id,
  )
  // overflow = max(0, 1 × (Water − capacity)): shut below the brim, spilling the excess
  // above it. factor 1 at dt 1 settles in a step without oscillating; the level rides a
  // touch over capacity — the head a spillway needs to discharge its inflow.
  overflow.rule = { kind: "overflow", factor: 1 }
  overflow.description =
    "The spillway, max(0, Water − capacity): nothing while the tub is below the brim, then it carries off the excess — the Balancing drain that holds the level."
  const capacity = makeConverter({ x: 240, y: 120 }, "capacity")
  capacity.rule = { kind: "constant", value: 100 }
  capacity.description =
    "The tub's brim (a fixed 100 L) — the threshold the overflow opens above; the level holds just over it."
  return model(
    "Bathtub with an overflow",
    [source, water, filling, floor, overflow, capacity],
    [
      link(
        water,
        overflow,
        "+",
        "Water is the level in the overflow rule: the higher it rises past the brim, the harder it spills. With the outflow, this closes the Balancing loop that holds the level.",
      ),
      link(
        capacity,
        overflow,
        "-",
        "Capacity is the threshold the spill opens above (the − input): a higher brim → less spill at the same level.",
      ),
    ],
    { start: 0, stop: 40, dt: 1 },
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
    blurb: "Two Reinforcing herds overgraze a renewable Stock, then starve with it: a system trap.",
    build: tragedyOfTheCommons,
  },
  {
    title: "Tragedy of the commons, fixed",
    blurb: "Regulate the same renewable commons with a reserve: it holds, and the herds last.",
    build: tragedyOfTheCommonsFixed,
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
  {
    title: "Bathtub with an overflow",
    blurb: "A flat-out tap and a spillway: the excess spills to a second Stock and the level holds.",
    build: bathtubOverflow,
  },
]
