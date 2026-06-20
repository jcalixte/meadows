/**
 * Import/Export (C10, F8) — round-trip a Model as versioned JSON.
 *
 * Export is just pretty JSON: the Model is contractually plain, serialisable
 * data (see types.ts), so `serializeModel` is lossless and human-readable.
 * Import is the trust boundary — a file may be hand-edited, truncated, or from a
 * future version — so `parseModel` validates shape, types, the schema version,
 * and referential integrity before handing back a typed Model. It never throws;
 * it returns a discriminated result so callers can surface a clear message.
 *
 * The validator deliberately does not re-implement the full structural guard
 * (validation.ts): our own exports are valid by construction, and checking that
 * every reference resolves is enough to keep the projection and loop detector
 * from tripping over a dangling id.
 */
import {
  type InformationLink,
  type Model,
  MODEL_VERSION,
  type ModelNode,
  type NodeKind,
  type Polarity,
  type Position,
  type Rule,
  type SimSpec,
} from "./types"

/** Pretty JSON so an exported Model is human-readable and diff-friendly (F8). */
export function serializeModel(model: Model): string {
  return JSON.stringify(model, null, 2)
}

/** The outcome of an import: a validated Model, or a reason it was rejected. */
export type ParseResult = { ok: true; model: Model } | { ok: false; error: string }

const NODE_KINDS: readonly NodeKind[] = ["stock", "flow", "converter", "cloud"]

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isPosition(value: unknown): value is Position {
  return isObject(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y)
}

function isPolarity(value: unknown): value is Polarity {
  return value === "+" || value === "-"
}

/** A Rule must be one of the fixed kinds with its numeric parameter (ADR-0004). */
function isRule(value: unknown): value is Rule {
  if (!isObject(value)) return false
  if (value.kind === "constant") return isFiniteNumber(value.value)
  if (value.kind === "proportional" || value.kind === "gap") return isFiniteNumber(value.factor)
  return false
}

function isSimSpec(value: unknown): value is SimSpec {
  return (
    isObject(value) &&
    isFiniteNumber(value.start) &&
    isFiniteNumber(value.stop) &&
    isFiniteNumber(value.dt) &&
    value.dt > 0
  )
}

/** Validate one node by kind, returning an error string or null when valid. */
function nodeError(value: unknown, index: number): string | null {
  if (!isObject(value)) return `nodes[${index}] is not an object`
  const at = `nodes[${index}]`
  if (typeof value.id !== "string" || value.id === "") return `${at}.id must be a non-empty string`
  if (typeof value.kind !== "string" || !NODE_KINDS.includes(value.kind as NodeKind)) {
    return `${at}.kind must be one of ${NODE_KINDS.join(", ")}`
  }
  if (!isPosition(value.position)) return `${at}.position must be {x, y} numbers`

  const kind = value.kind as NodeKind
  if (kind !== "cloud" && typeof value.name !== "string") return `${at}.name must be a string`
  if (kind === "flow") {
    if (typeof value.source !== "string") return `${at}.source must be a string`
    if (typeof value.target !== "string") return `${at}.target must be a string`
  }
  // Simulation fields (ADR-0004) are optional, but if present must be well-formed.
  if (kind === "stock" && value.initialValue !== undefined && !isFiniteNumber(value.initialValue)) {
    return `${at}.initialValue must be a finite number`
  }
  if (kind === "stock" && value.unit !== undefined && typeof value.unit !== "string") {
    return `${at}.unit must be a string`
  }
  if (
    (kind === "flow" || kind === "converter") &&
    value.rule !== undefined &&
    !isRule(value.rule)
  ) {
    return `${at}.rule must be a valid rule (constant/proportional/gap)`
  }
  return null
}

/** Validate one Information Link, returning an error string or null when valid. */
function linkError(value: unknown, index: number): string | null {
  if (!isObject(value)) return `infoLinks[${index}] is not an object`
  const at = `infoLinks[${index}]`
  if (typeof value.id !== "string" || value.id === "") return `${at}.id must be a non-empty string`
  if (typeof value.source !== "string") return `${at}.source must be a string`
  if (typeof value.target !== "string") return `${at}.target must be a string`
  if (!isPolarity(value.polarity)) return `${at}.polarity must be "+" or "-"`
  return null
}

/**
 * Parse and validate JSON text into a Model. Returns `{ok:false, error}` for
 * anything that isn't a well-formed, current-version Model with resolvable
 * references — never throws.
 */
export function parseModel(text: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: "Not valid JSON" }
  }

  if (!isObject(data)) return { ok: false, error: "Top level must be an object" }
  if (data.version !== MODEL_VERSION) {
    return {
      ok: false,
      error: `Unsupported model version ${String(data.version)} (expected ${MODEL_VERSION})`,
    }
  }
  if (typeof data.id !== "string" || data.id === "")
    return { ok: false, error: "id must be a non-empty string" }
  if (typeof data.name !== "string") return { ok: false, error: "name must be a string" }
  if (!Array.isArray(data.nodes)) return { ok: false, error: "nodes must be an array" }
  if (!Array.isArray(data.infoLinks)) return { ok: false, error: "infoLinks must be an array" }
  if (data.sim !== undefined && !isSimSpec(data.sim)) {
    return { ok: false, error: "sim must be {start, stop, dt} numbers with dt > 0" }
  }

  for (let i = 0; i < data.nodes.length; i++) {
    const error = nodeError(data.nodes[i], i)
    if (error) return { ok: false, error }
  }
  for (let i = 0; i < data.infoLinks.length; i++) {
    const error = linkError(data.infoLinks[i], i)
    if (error) return { ok: false, error }
  }

  // References must resolve, or the projection and loop detector would dangle.
  const nodes = data.nodes as ModelNode[]
  const ids = new Set(nodes.map((node) => node.id))
  for (const node of nodes) {
    if (node.kind !== "flow") continue
    if (!ids.has(node.source))
      return { ok: false, error: `flow ${node.id} references missing source ${node.source}` }
    if (!ids.has(node.target))
      return { ok: false, error: `flow ${node.id} references missing target ${node.target}` }
  }
  const links = data.infoLinks as InformationLink[]
  for (const link of links) {
    if (!ids.has(link.source))
      return { ok: false, error: `link ${link.id} references missing source ${link.source}` }
    if (!ids.has(link.target))
      return { ok: false, error: `link ${link.id} references missing target ${link.target}` }
  }

  return {
    ok: true,
    model: {
      version: MODEL_VERSION,
      id: data.id,
      name: data.name,
      nodes,
      infoLinks: links,
      ...(data.sim !== undefined && { sim: data.sim as SimSpec }),
    },
  }
}
