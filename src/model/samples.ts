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
 *   5. Limits to growth  — two loops (R and B) fighting over a single Flow, plus a
 *                          constant Converter (carrying capacity) that feeds a loop
 *                          without being part of it.
 *   6. Predator and prey — two coupled Stocks whose interlocking loops oscillate.
 *   7. Epidemic          — a chain of Stocks joined by Stock→Stock Flows: no clouds.
 *
 * Last, two of Donella Meadows' system *traps* — structures that reliably misbehave
 * (Thinking in Systems, ch. 5), to contrast the healthy dynamics above:
 *
 *   8. Tragedy of the commons — competing Reinforcing loops drain a shared Stock
 *                               faster than its weak, shared Balancing brake reacts.
 *   9. Escalation             — a single Reinforcing loop spanning two Stocks, with
 *                               no brake in the structure: an arms race.
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

function model(name: string, nodes: ModelNode[], infoLinks: InformationLink[]): Model {
  return { version: MODEL_VERSION, id: newId("model"), name, nodes, infoLinks }
}

/**
 * Bathtub — the canonical first model. A Stock filled by one Flow and drained by
 * another, each open end resting on a Cloud. No Information Links, so no
 * feedback: it just shows the substrate (Stock, Flow, Source, Sink).
 */
function bathtub(): Model {
  const source = makeCloud({ x: -278, y: -18 })
  const water = makeStock({ x: -48, y: -20 }, "Water")
  const sink = makeCloud({ x: 242, y: -18 })
  const filling = makeFlow(
    midpoint(source.position, water.position),
    "filling",
    source.id,
    water.id,
  )
  const emptying = makeFlow(midpoint(water.position, sink.position), "emptying", water.id, sink.id)
  return model("Bathtub", [source, water, sink, filling, emptying], [])
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
  const source = makeCloud({ x: -250, y: -70 })
  const balance = makeStock({ x: 110, y: 30 }, "Balance")
  const interest = makeFlow(
    midpoint(source.position, balance.position),
    "interest",
    source.id,
    balance.id,
  )
  return model("Savings account", [source, balance, interest], [link(balance, interest, "+")])
}

/**
 * Coffee cooling — the simplest Balancing loop, plus a Converter. Heat leaves the
 * cup faster the hotter it is (Coffee → [+] → heat loss) but slower the warmer
 * the room (room temperature → [−] → heat loss). The loop Coffee → heat loss →
 * (outflow) → Coffee has one `−` → Balancing: it settles toward room temperature.
 */
function coffee(): Model {
  const coffee = makeStock({ x: -200, y: -10 }, "Coffee")
  const sink = makeCloud({ x: 190, y: -8 })
  const heatLoss = makeFlow(
    midpoint(coffee.position, sink.position),
    "heat loss",
    coffee.id,
    sink.id,
  )
  const room = makeConverter({ x: -29, y: -150 }, "room temperature")
  return model(
    "Coffee cooling",
    [coffee, sink, heatLoss, room],
    [link(coffee, heatLoss, "+"), link(room, heatLoss, "-")],
  )
}

/**
 * Population — the whole language in one model. Births add to Population and more
 * people means more births (Reinforcing); deaths remove from it and more people
 * means more deaths (Balancing). Converters feed each rate: fertility raises
 * births (`+`), life expectancy lowers deaths (`−`).
 */
function population(): Model {
  const source = makeCloud({ x: -360, y: -8 })
  const people = makeStock({ x: -48, y: -10 }, "Population")
  const sink = makeCloud({ x: 250, y: -8 })
  const births = makeFlow(
    midpoint(source.position, people.position),
    "births",
    source.id,
    people.id,
  )
  const deaths = makeFlow(midpoint(people.position, sink.position), "deaths", people.id, sink.id)
  const fertility = makeConverter({ x: -204, y: -150 }, "fertility")
  const lifeExpectancy = makeConverter({ x: 101, y: -150 }, "life expectancy")
  return model(
    "Population",
    [source, people, sink, births, deaths, fertility, lifeExpectancy],
    [
      link(people, births, "+"),
      link(fertility, births, "+"),
      link(people, deaths, "+"),
      link(lifeExpectancy, deaths, "-"),
    ],
  )
}

/**
 * Limits to growth — the S-curve, and the first model where two loops fight over
 * one Flow. Yeast multiplies the more there is of it (Yeast → [+] → growth: a
 * Reinforcing loop), but the fuller the vat the more crowding holds growth back
 * (Yeast → [+] → crowding → [−] → growth: a Balancing loop). Carrying capacity is
 * a *constant* Converter — no inputs — that sets how soon crowding bites; it feeds
 * the balancing loop without sitting on any cycle.
 */
function limitsToGrowth(): Model {
  const source = makeCloud({ x: -300, y: 0 })
  const yeast = makeStock({ x: 40, y: 0 }, "Yeast")
  const growth = makeFlow(midpoint(source.position, yeast.position), "growth", source.id, yeast.id)
  // crowding rides above the pipe; carrying capacity sits to its right so the
  // `capacity → crowding` link is a short horizontal hop along the top.
  const crowding = makeConverter({ x: -40, y: -150 }, "crowding")
  const capacity = makeConverter({ x: 170, y: -150 }, "carrying capacity")
  return model(
    "Limits to growth",
    [source, yeast, growth, crowding, capacity],
    [
      link(yeast, growth, "+"),
      link(yeast, crowding, "+"),
      link(crowding, growth, "-"),
      link(capacity, crowding, "-"),
    ],
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
  // Rabbits run along the top row, foxes along a lower row, so the two long
  // coupling links cross in the open space between the rows.
  const preySource = makeCloud({ x: -520, y: 0 })
  const rabbits = makeStock({ x: -260, y: 0 }, "Rabbits")
  const preySink = makeCloud({ x: 0, y: 0 })
  const rabbitBirths = makeFlow(
    midpoint(preySource.position, rabbits.position),
    "rabbit births",
    preySource.id,
    rabbits.id,
  )
  const predation = makeFlow(
    midpoint(rabbits.position, preySink.position),
    "predation",
    rabbits.id,
    preySink.id,
  )
  const foxSource = makeCloud({ x: 120, y: 220 })
  const foxes = makeStock({ x: 380, y: 220 }, "Foxes")
  const foxSink = makeCloud({ x: 640, y: 220 })
  const foxBirths = makeFlow(
    midpoint(foxSource.position, foxes.position),
    "fox births",
    foxSource.id,
    foxes.id,
  )
  const foxDeaths = makeFlow(
    midpoint(foxes.position, foxSink.position),
    "fox deaths",
    foxes.id,
    foxSink.id,
  )
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
  const infected = makeStock({ x: 0, y: 0 }, "Infected")
  const recovered = makeStock({ x: 280, y: 0 }, "Recovered")
  const infection = makeFlow(
    midpoint(susceptible.position, infected.position),
    "infection",
    susceptible.id,
    infected.id,
  )
  const recovery = makeFlow(
    midpoint(infected.position, recovered.position),
    "recovery",
    infected.id,
    recovered.id,
  )
  const infectivity = makeConverter({ x: -140, y: -150 }, "infectivity")
  return model(
    "Epidemic",
    [susceptible, infected, recovered, infection, recovery, infectivity],
    [
      link(susceptible, infection, "+"),
      link(infected, infection, "+"),
      link(infected, recovery, "+"),
      link(infectivity, infection, "+"),
    ],
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
  // Two symmetric herds: cattle enter from a Source on the outside, grass leaves
  // the Pasture downward to a Sink. The two `Pasture → growth` links are the weak
  // brake the trap overruns.
  const sourceA = makeCloud({ x: -620, y: 0 })
  const herdA = makeStock({ x: -360, y: 0 }, "Herd A")
  const growthA = makeFlow(
    midpoint(sourceA.position, herdA.position),
    "growth A",
    sourceA.id,
    herdA.id,
  )
  const sinkA = makeCloud({ x: -180, y: 220 })
  const grazingA = makeFlow(
    midpoint(pasture.position, sinkA.position),
    "grazing A",
    pasture.id,
    sinkA.id,
  )
  const sourceB = makeCloud({ x: 620, y: 0 })
  const herdB = makeStock({ x: 360, y: 0 }, "Herd B")
  const growthB = makeFlow(
    midpoint(sourceB.position, herdB.position),
    "growth B",
    sourceB.id,
    herdB.id,
  )
  const sinkB = makeCloud({ x: 180, y: 220 })
  const grazingB = makeFlow(
    midpoint(pasture.position, sinkB.position),
    "grazing B",
    pasture.id,
    sinkB.id,
  )
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
  // Both arsenals sit inboard with their Sources outside; the two links crossing
  // the centre are the escalation loop.
  const redSource = makeCloud({ x: -520, y: 0 })
  const redArsenal = makeStock({ x: -260, y: 0 }, "Red arsenal")
  const redBuildup = makeFlow(
    midpoint(redSource.position, redArsenal.position),
    "Red buildup",
    redSource.id,
    redArsenal.id,
  )
  const blueSource = makeCloud({ x: 520, y: 0 })
  const blueArsenal = makeStock({ x: 260, y: 0 }, "Blue arsenal")
  const blueBuildup = makeFlow(
    midpoint(blueSource.position, blueArsenal.position),
    "Blue buildup",
    blueSource.id,
    blueArsenal.id,
  )
  return model(
    "Escalation",
    [redSource, redArsenal, redBuildup, blueSource, blueArsenal, blueBuildup],
    [link(blueArsenal, redBuildup, "+"), link(redArsenal, blueBuildup, "+")],
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
]
