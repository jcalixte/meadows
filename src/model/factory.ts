/**
 * Pure constructors for Model pieces: id generation, a blank Model, and the
 * auto-naming that lets F1 place a node with zero dialogs. No store, no Vue —
 * just data in, data out, so it stays unit-testable.
 */
import {
  type CloudNode,
  type ConverterNode,
  type FlowNode,
  type Model,
  MODEL_VERSION,
  type ModelNode,
  type NodeKind,
  type Position,
  type StockNode,
} from "./types"

/** Short, readable, collision-resistant id. `crypto.randomUUID` is built in. */
export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

/** Human label per kind, used for auto-naming. Clouds are unnamed boundaries. */
const LABEL: Record<Exclude<NodeKind, "cloud">, string> = {
  stock: "Stock",
  flow: "Flow",
  converter: "Converter",
}

export function emptyModel(name = "Untitled model"): Model {
  return { version: MODEL_VERSION, id: newId("model"), name, nodes: [], infoLinks: [] }
}

/**
 * Next free auto-name for `kind`, e.g. "Stock 3". Picks one past the highest
 * trailing number already in use so it stays stable across deletes/renames.
 */
export function nextName(nodes: ModelNode[], kind: Exclude<NodeKind, "cloud">): string {
  const label = LABEL[kind]
  const pattern = new RegExp(`^${label} (\\d+)$`)
  let max = 0
  for (const node of nodes) {
    if (node.kind !== kind || !("name" in node)) continue
    const match = pattern.exec(node.name)
    if (match) max = Math.max(max, Number(match[1]))
  }
  return `${label} ${max + 1}`
}

export function makeStock(position: Position, name: string): StockNode {
  return { id: newId("stock"), kind: "stock", name, position }
}

export function makeConverter(position: Position, name: string): ConverterNode {
  return { id: newId("conv"), kind: "converter", name, position }
}

export function makeFlow(
  position: Position,
  name: string,
  source: string,
  target: string,
): FlowNode {
  return { id: newId("flow"), kind: "flow", name, source, target, position }
}

export function makeCloud(position: Position): CloudNode {
  return { id: newId("cloud"), kind: "cloud", position }
}

/** Midpoint between two positions — where a Flow's valve sits on its pipe. */
export function midpoint(a: Position, b: Position): Position {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}
