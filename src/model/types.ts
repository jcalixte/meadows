/**
 * The domain Model — the single source of truth for a meadows document.
 *
 * The Vue Flow graph is a derived projection of this (ADR-0002); the future
 * simulator reads this and knows nothing of the view layer. Everything here is
 * plain, serialisable data (no class instances, no functions) so it round-trips
 * as JSON (F8) and deep-clones cheaply for undo snapshots (F9).
 *
 * Vocabulary follows CONTEXT.md. Structural rules follow the ADRs:
 *  - A Flow is a *node* with `source`/`target` references, not an edge (ADR-0003).
 *  - Source/Sink boundaries are materialised Cloud nodes, so no end is ever null.
 *  - The only stored edge type is the Information Link; loops are detected, never
 *    stored (ADR-0001).
 */

/** Schema version stamped on every Model for round-trip migrations (F8). */
export const MODEL_VERSION = 1

/** The four node kinds. A `kind` field discriminates the `ModelNode` union. */
export type NodeKind = "stock" | "flow" | "converter" | "cloud"

/**
 * The sign on an Information Link (and inherent to a Flow): `+` when more cause
 * means more effect, `−` when more cause means less effect. The input that lets
 * loops be classified Reinforcing/Balancing.
 */
export type Polarity = "+" | "-"

export interface Position {
  x: number
  y: number
}

/**
 * How a Flow's rate or a Converter's value is computed — a small fixed
 * vocabulary, *not* a free-form formula, so a Model stays valid by construction
 * and teaches structure → behaviour (ADR-0004). Operands are read from the
 * element's inbound Information Links; Polarity selects each operand's role.
 *
 *  - `constant`     — a fixed number; reads nothing. (→ linear Stock change)
 *  - `proportional` — `factor ×` the product of its `+`-polarity inputs.
 *                     (→ exponential growth/decay)
 *  - `gap`          — `factor × (level − target)`, where the `+` input is the
 *                     level and the `−` input the target. (→ goal-seeking)
 */
export type Rule =
  | { kind: "constant"; value: number }
  | { kind: "proportional"; factor: number }
  | { kind: "gap"; factor: number }

/**
 * The run parameters for a simulation: integrate from `start` to `stop` in steps
 * of `dt` (forward Euler). Optional on a Model; absent means the diagram phase or
 * a not-yet-simulated Model — the engine falls back to `DEFAULT_SIM_SPEC`.
 */
export interface SimSpec {
  start: number
  stop: number
  dt: number
}

/** Sensible default run when a Model carries no `sim` of its own. */
export const DEFAULT_SIM_SPEC: SimSpec = { start: 0, stop: 100, dt: 1 }

interface BaseNode {
  id: string
  position: Position
}

/**
 * An accumulation that holds a quantity over time — the system's memory and the
 * only stateful element. Changes only through Flows.
 */
export interface StockNode extends BaseNode {
  kind: "stock"
  name: string
  /** Initial accumulated quantity. Optional in the diagram phase; the simulator reads it. */
  initialValue?: number
}

/**
 * A rate that moves quantity between two ends. A Flow is a node (ADR-0003): the
 * pipe-with-valve you see is rendered from `source`/`target`. Inflow/outflow is
 * relative to a given Stock, not a separate type — a stock→stock Flow is an
 * outflow for `source` and an inflow for `target`.
 */
export interface FlowNode extends BaseNode {
  kind: "flow"
  name: string
  /** Node id of the Stock or Cloud the Flow draws from. */
  source: string
  /** Node id of the Stock or Cloud the Flow feeds into. */
  target: string
  /** How its rate is computed each instant (ADR-0004). Optional in the diagram phase. */
  rule?: Rule
}

/**
 * A stateless helper value, recomputed each instant from its inputs (or a fixed
 * constant). Feeds Flows or other Converters via Information Links.
 */
export interface ConverterNode extends BaseNode {
  kind: "converter"
  name: string
  /** How its value is computed each instant (ADR-0004). Optional in the diagram phase. */
  rule?: Rule
}

/**
 * A model boundary (Source/Sink) on an open Flow end — drawn as a cloud.
 * Auto-managed: spawned when a Flow is left open-ended, removed when the Flow
 * attaches to a Stock (ADR-0003). Carries no name and no value.
 */
export interface CloudNode extends BaseNode {
  kind: "cloud"
}

export type ModelNode = StockNode | FlowNode | ConverterNode | CloudNode

/**
 * Shows that one element's value influences a Flow's or Converter's value.
 * Carries a Polarity; carries no quantity and never targets a Stock (a Stock
 * changes only via Flows).
 */
export interface InformationLink {
  id: string
  /** Source node id — a Stock, Flow, or Converter (the value being read). */
  source: string
  /** Target node id — a Flow or Converter, never a Stock (ADR-0001). */
  target: string
  polarity: Polarity
}

/** One saved document: the unit of save / export / reopen. */
export interface Model {
  version: number
  id: string
  name: string
  nodes: ModelNode[]
  infoLinks: InformationLink[]
  /** Run parameters for simulation (ADR-0004). Optional; absent → not yet simulated. */
  sim?: SimSpec
}
