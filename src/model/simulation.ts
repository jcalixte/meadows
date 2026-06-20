/**
 * Simulation engine (ADR-0004) — what makes a Model *alive*. Pure data in, time
 * series out; it knows nothing of Vue or the canvas, so it is trivially testable
 * and runs off any reactive frame.
 *
 * The system-dynamics loop, one step of `dt`:
 *   1. Evaluate the instantaneous network — every Converter and Flow — in
 *      dependency order, reading the *current* Stock values. A Converter/Flow
 *      depends on the elements that link into it (ADR-0004: the Information Link
 *      *is* the dependency); Stocks are state, available without ordering.
 *   2. Integrate every Stock *simultaneously* (forward Euler):
 *      `stock += dt × (Σ inflow rates − Σ outflow rates)`. All net rates are read
 *      from the same pre-update state, so updating one Stock never feeds another
 *      within the same step.
 *
 * A cycle in the wiring is legitimate feedback only if it passes through a Stock
 * (the Stock supplies last-step state and breaks the within-step dependency). A
 * cycle among only Converters/Flows is an **algebraic loop** — unorderable, and
 * rejected by `evaluationOrder` / surfaced by `checkSimReady`.
 */
import {
  type ConverterNode,
  DEFAULT_SIM_SPEC,
  type FlowNode,
  type InformationLink,
  type Model,
  type Rule,
  type SimSpec,
} from "./types"

/** Thrown when a Model cannot be simulated as wired (e.g. an algebraic loop). */
export class SimulationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SimulationError"
  }
}

/** A completed run: aligned `times` and per-element value tracks. */
export interface Run {
  /** The time at each recorded sample, `start … stop` in steps of `dt`. */
  times: number[]
  /** nodeId → its value at each time index (Stocks, Flows, Converters; not Clouds). */
  series: Map<string, number[]>
  /** True if the run ran past representable numbers and stopped early (see below). */
  diverged: boolean
}

/** A Converter or Flow — the stateless, instantaneous elements an order applies to. */
type Instant = ConverterNode | FlowNode

/**
 * Order the instantaneous network so each element is computed after everything
 * it reads. Throws `SimulationError` on an algebraic loop (a Converter/Flow cycle
 * with no Stock to break it). Stocks are excluded — they are state, not computed.
 */
export function evaluationOrder(model: Model): Instant[] {
  const instant = model.nodes.filter(
    (node): node is Instant => node.kind === "flow" || node.kind === "converter",
  )
  const ids = new Set(instant.map((node) => node.id))

  // deps[x] = the instantaneous elements x reads (links from another Flow/Converter).
  const deps = new Map<string, Set<string>>(instant.map((node) => [node.id, new Set<string>()]))
  for (const link of model.infoLinks) {
    if (ids.has(link.source) && ids.has(link.target)) deps.get(link.target)?.add(link.source)
  }

  const order: Instant[] = []
  const resolved = new Set<string>()
  while (order.length < instant.length) {
    const next = instant.find(
      (node) =>
        !resolved.has(node.id) && [...(deps.get(node.id) ?? [])].every((d) => resolved.has(d)),
    )
    if (!next) {
      const names = instant
        .filter((node) => !resolved.has(node.id))
        .map((node) => node.name)
        .join(", ")
      throw new SimulationError(
        `Algebraic loop: ${names} depend on each other with no Stock to break the cycle.`,
      )
    }
    resolved.add(next.id)
    order.push(next)
  }
  return order
}

/** Evaluate one Rule given a way to read the values feeding in via `links`. */
function evalRule(rule: Rule, links: InformationLink[], valueOf: (id: string) => number): number {
  switch (rule.kind) {
    case "constant":
      return rule.value
    case "proportional": {
      // factor × the product of every `+`-polarity input (one input → factor × it).
      let value = rule.factor
      for (const link of links) if (link.polarity === "+") value *= valueOf(link.source)
      return value
    }
    case "gap": {
      // factor × (level − target): the `+` input is the level, the `−` the target.
      const level = links.find((link) => link.polarity === "+")
      const target = links.find((link) => link.polarity === "-")
      return (
        rule.factor * ((level ? valueOf(level.source) : 0) - (target ? valueOf(target.source) : 0))
      )
    }
  }
}

/**
 * Run the Model and return aligned time series. Assumes a sim-ready Model
 * (see `checkSimReady`); a missing rule evaluates to 0 and a missing initial
 * value to 0 rather than throwing, so a half-built Model still produces a plot.
 * Throws `SimulationError` only on an algebraic loop, which has no defined order.
 */
export function simulate(model: Model, spec: SimSpec = model.sim ?? DEFAULT_SIM_SPEC): Run {
  const order = evaluationOrder(model)
  const nodeById = new Map(model.nodes.map((node) => [node.id, node]))

  const inbound = new Map<string, InformationLink[]>()
  for (const link of model.infoLinks) {
    const list = inbound.get(link.target)
    if (list) list.push(link)
    else inbound.set(link.target, [link])
  }

  const stocks = model.nodes.filter((node) => node.kind === "stock")
  const flows = model.nodes.filter((node): node is FlowNode => node.kind === "flow")

  const stockValues = new Map<string, number>(stocks.map((s) => [s.id, s.initialValue ?? 0]))

  const times: number[] = []
  const series = new Map<string, number[]>()
  for (const node of model.nodes) if (node.kind !== "cloud") series.set(node.id, [])
  let diverged = false

  // dt ≤ 0 would never advance (and 0 diverges); a non-positive step means no run.
  const steps = spec.dt > 0 ? Math.max(0, Math.floor((spec.stop - spec.start) / spec.dt)) : 0
  for (let i = 0; i <= steps; i++) {
    // A run-away Reinforcing loop over a long horizon can exceed what a float
    // holds. Stop at the last valid sample and flag it rather than plotting NaN.
    if (!stocks.every((s) => Number.isFinite(stockValues.get(s.id) ?? 0))) {
      diverged = true
      break
    }

    // 1. Evaluate the instantaneous network from the current Stock values.
    const computed = new Map<string, number>()
    const valueOf = (id: string): number => {
      const node = nodeById.get(id)
      if (!node) return 0
      if (node.kind === "stock") return stockValues.get(id) ?? 0
      if (node.kind === "cloud") return 0
      return computed.get(id) ?? 0
    }
    for (const node of order) {
      computed.set(
        node.id,
        node.rule ? evalRule(node.rule, inbound.get(node.id) ?? [], valueOf) : 0,
      )
    }

    // Record this sample (Stocks at their current value, Flows/Converters as just computed).
    times.push(spec.start + i * spec.dt)
    for (const s of stocks) series.get(s.id)?.push(stockValues.get(s.id) ?? 0)
    for (const node of order) series.get(node.id)?.push(computed.get(node.id) ?? 0)

    if (i >= steps) break

    // 2. Integrate every Stock simultaneously (forward Euler) — but with
    // non-negative stocks: an outflow can't drain more than its source holds this
    // step. Scale a stock's competing outflows together if they would overdraw,
    // and apply the scaled rate to both ends so quantity is conserved. You can't
    // infect more people than are susceptible — and that floor is exactly what
    // stops a bilinear model (S × I) from flipping sign and diverging.
    const rate = new Map<string, number>(flows.map((f) => [f.id, computed.get(f.id) ?? 0]))
    for (const s of stocks) {
      const available = stockValues.get(s.id) ?? 0
      const drains = flows.filter((f) => f.source === s.id && (rate.get(f.id) ?? 0) > 0)
      const totalOut = drains.reduce((sum, f) => sum + (rate.get(f.id) ?? 0), 0)
      if (totalOut * spec.dt > available) {
        const scale = available / (totalOut * spec.dt)
        for (const f of drains) rate.set(f.id, (rate.get(f.id) ?? 0) * scale)
      }
    }

    const next = new Map(stockValues)
    for (const s of stocks) {
      let net = 0
      for (const flow of flows) {
        const r = rate.get(flow.id) ?? 0
        if (flow.target === s.id) net += r // an inflow fills it
        if (flow.source === s.id) net -= r // an outflow drains it
      }
      next.set(s.id, (stockValues.get(s.id) ?? 0) + spec.dt * net)
    }
    for (const [id, value] of next) stockValues.set(id, value)
  }

  return { times, series, diverged }
}

/**
 * What stands between this Model and a run, as human-readable lines (empty array
 * = ready). Distinct from structural validity (validation.ts): a Model can be a
 * perfectly valid diagram yet not carry the numbers a simulation needs.
 */
export function checkSimReady(model: Model): string[] {
  const problems: string[] = []
  for (const node of model.nodes) {
    if (node.kind === "stock" && node.initialValue === undefined) {
      problems.push(`${node.name} has no initial value.`)
    }
    if ((node.kind === "flow" || node.kind === "converter") && !node.rule) {
      problems.push(`${node.name} has no rule yet.`)
    }
  }
  try {
    evaluationOrder(model)
  } catch (error) {
    if (error instanceof SimulationError) problems.push(error.message)
    else throw error
  }
  return problems
}
