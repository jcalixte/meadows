/**
 * Loop engine (C8, ADR-0001) — feedback loops are *derived* from the wiring, not
 * stored, so they can never disagree with the structure.
 *
 * We build a signed directed graph and enumerate its simple cycles, classifying
 * each by the parity of its negative links: an even number of `−` is a
 * Reinforcing loop (R), an odd number is Balancing (B) — the sign of the product
 * of the loop's link polarities.
 *
 * Signed edges come from two places (ADR-0001 "every link carries polarity;
 * inflows/outflows carry inherent polarity"):
 *   - Information Links contribute their stored `+`/`−` (source → target).
 *   - A Flow contributes its inherent material polarity: `+` into the stock it
 *     fills (flow → target) and `−` out of the stock it drains (flow → source).
 * Clouds have no outgoing edges, so no cycle passes through the model boundary.
 *
 * Enumeration is Tarjan SCC (prune acyclic structure) → DFS of simple cycles
 * within each component, started from each member in id order with descendants
 * restricted to that order so every cycle is found exactly once (from its
 * minimum node). Both the result count and the search are capped (T3): pathology
 * yields "the first N loops", never a blown frame budget (F5 ⊗ F3).
 */
import type { Model, Polarity } from "./types"

export type LoopType = "R" | "B"

export interface Loop {
  /** Canonical id: the cycle's node ids in traversal order, min-id first. */
  id: string
  /** Nodes on the cycle, in order (no repeated closing node). */
  nodeIds: string[]
  /** Count of `−` links around the loop; its parity decides R vs B. */
  negatives: number
  type: LoopType
}

export interface LoopResult {
  loops: Loop[]
  /** True if the result or search cap was hit — there may be more loops. */
  capped: boolean
}

/** Max simple cycles reported before we stop (ADR-0001/T3: "+N more"). */
export const LOOP_CAP = 200
/** Hard ceiling on edge expansions, so a dense graph can't blow the frame. */
const STEP_BUDGET = 50_000

interface SignedEdge {
  to: string
  polarity: Polarity
}

function buildGraph(model: Model): Map<string, SignedEdge[]> {
  const adj = new Map<string, SignedEdge[]>()
  for (const node of model.nodes) adj.set(node.id, [])

  const add = (from: string, edge: SignedEdge): void => {
    const list = adj.get(from)
    if (list) list.push(edge)
  }

  for (const link of model.infoLinks) add(link.source, { to: link.target, polarity: link.polarity })
  for (const node of model.nodes) {
    if (node.kind !== "flow") continue
    add(node.id, { to: node.target, polarity: "+" }) // fills its target
    add(node.id, { to: node.source, polarity: "-" }) // drains its source
  }
  return adj
}

/** Tarjan's SCC — components are returned in reverse topological order. */
function stronglyConnectedComponents(adj: Map<string, SignedEdge[]>): string[][] {
  const index = new Map<string, number>()
  const low = new Map<string, number>()
  const onStack = new Set<string>()
  const stack: string[] = []
  const sccs: string[][] = []
  let counter = 0

  const connect = (v: string): void => {
    index.set(v, counter)
    low.set(v, counter)
    counter++
    stack.push(v)
    onStack.add(v)

    for (const { to } of adj.get(v) ?? []) {
      if (!index.has(to)) {
        connect(to)
        low.set(v, Math.min(low.get(v)!, low.get(to)!))
      } else if (onStack.has(to)) {
        low.set(v, Math.min(low.get(v)!, index.get(to)!))
      }
    }

    if (low.get(v) === index.get(v)) {
      const component: string[] = []
      let w: string
      do {
        w = stack.pop()!
        onStack.delete(w)
        component.push(w)
      } while (w !== v)
      sccs.push(component)
    }
  }

  for (const v of adj.keys()) if (!index.has(v)) connect(v)
  return sccs
}

export function detectLoops(model: Model): LoopResult {
  const adj = buildGraph(model)
  const components = stronglyConnectedComponents(adj).filter((c) => c.length > 1)

  const loops: Loop[] = []
  const seen = new Set<string>()
  let capped = false
  let steps = 0

  const record = (nodeIds: string[], negatives: number): void => {
    if (loops.length >= LOOP_CAP) {
      capped = true
      return
    }
    const id = nodeIds.join(">")
    if (seen.has(id)) return
    seen.add(id)
    loops.push({ id, nodeIds, negatives, type: negatives % 2 === 0 ? "R" : "B" })
  }

  for (const component of components) {
    if (capped) break
    const members = new Set(component)
    const order = [...component].sort()
    const rank = new Map(order.map((id, i) => [id, i]))

    for (let start = 0; start < order.length && !capped; start++) {
      const startId = order[start]
      const path: string[] = []
      const onPath = new Set<string>()
      const polarities: Polarity[] = []

      const walk = (v: string): void => {
        path.push(v)
        onPath.add(v)
        for (const edge of adj.get(v) ?? []) {
          if (capped) break
          if (++steps > STEP_BUDGET) {
            capped = true
            break
          }
          if (!members.has(edge.to) || rank.get(edge.to)! < start) continue
          if (edge.to === startId) {
            const negatives =
              polarities.filter((p) => p === "-").length + (edge.polarity === "-" ? 1 : 0)
            record([...path], negatives)
          } else if (!onPath.has(edge.to)) {
            polarities.push(edge.polarity)
            walk(edge.to)
            polarities.pop()
          }
        }
        path.pop()
        onPath.delete(v)
      }

      walk(startId)
    }
  }

  return { loops, capped }
}
