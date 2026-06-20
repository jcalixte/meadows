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
]
