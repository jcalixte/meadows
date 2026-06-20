/**
 * Model → Vue Flow projection (C6, ADR-0002).
 *
 * One-directional and pure: the domain Model in, the `{ nodes, edges }` Vue Flow
 * renders out. Writes never flow this way — Vue Flow events call store actions
 * that mutate the Model, and this re-derives. Keeping it pure means it is cheap
 * to memoise (the F3 escape hatch) and trivial to reason about.
 *
 * Edges are derived, never stored. A Flow node contributes two "pipe" edges
 * (source→valve, valve→target) so the classic pipe-with-valve renders from the
 * Flow's references (ADR-0003); each Information Link contributes one "info"
 * edge carrying its polarity.
 */
import type { Edge, Node } from "@vue-flow/core"
import type { Model, ModelNode, Polarity } from "./types"

/** Payload carried on every projected Vue Flow node: the domain node itself. */
export interface NodeData {
  node: ModelNode
}

/** Payload on a projected edge — which kind, and (for info links) its polarity. */
export interface EdgeData {
  kind: "pipe" | "info"
  polarity?: Polarity
}

export type FlowGraphNode = Node<NodeData>
export type FlowGraphEdge = Edge<EdgeData>

/**
 * Stable handle ids every node renders (target on the left, source on the
 * right). Edges name them explicitly so Vue Flow always resolves the right
 * anchor — without ids, an edge whose source is the small two-handle valve fails
 * to render (the "pipe-out" bug).
 */
export const HANDLE_IN = "in"
export const HANDLE_OUT = "out"

export function projectNodes(model: Model): FlowGraphNode[] {
  return model.nodes.map((node) => ({
    id: node.id,
    type: node.kind,
    position: node.position,
    data: { node },
  }))
}

export function projectEdges(model: Model): FlowGraphEdge[] {
  const edges: FlowGraphEdge[] = []

  for (const node of model.nodes) {
    if (node.kind !== "flow") continue
    // Pipe in: source → valve. No arrowhead — the valve is the visual midpoint.
    edges.push({
      id: `${node.id}::in`,
      type: "pipe",
      source: node.source,
      sourceHandle: HANDLE_OUT,
      target: node.id,
      targetHandle: HANDLE_IN,
      data: { kind: "pipe" },
      style: { strokeWidth: "2.5px" },
    })
    // Pipe out: valve → target. Arrowhead carries the flow direction.
    edges.push({
      id: `${node.id}::out`,
      type: "pipe",
      source: node.id,
      sourceHandle: HANDLE_OUT,
      target: node.target,
      targetHandle: HANDLE_IN,
      data: { kind: "pipe" },
      style: { strokeWidth: "2.5px" },
      markerEnd: "arrow",
    })
  }

  // Information Links: thin, dashed, arrow at the influenced end. The custom
  // "info" edge type renders the dashed pipe plus the clickable polarity badge.
  for (const link of model.infoLinks) {
    edges.push({
      id: link.id,
      type: "info",
      source: link.source,
      sourceHandle: HANDLE_OUT,
      target: link.target,
      targetHandle: HANDLE_IN,
      data: { kind: "info", polarity: link.polarity },
      style: { strokeDasharray: "5 4" },
      markerEnd: "arrow",
    })
  }

  return edges
}

export function project(model: Model): { nodes: FlowGraphNode[]; edges: FlowGraphEdge[] } {
  return { nodes: projectNodes(model), edges: projectEdges(model) }
}
