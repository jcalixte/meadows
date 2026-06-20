/**
 * Structure guard (C7, F4) — decides what dragging source→target *means* and
 * whether it's allowed, from the domain rules in CONTEXT.md / ADR-0001:
 *
 *   - A Flow terminates on a Stock or Cloud; its other end is a Stock or Cloud
 *     too (never cloud→cloud, which would bound nothing).
 *   - An Information Link terminates on a Flow or Converter, never a Stock
 *     (Stocks change only via Flows). Its source is a Stock, Flow, or Converter,
 *     never a Cloud (a boundary carries no value).
 *
 * The *target* kind disambiguates the gesture: dropping on a Stock/Cloud can only
 * be a Flow; dropping on a Flow/Converter can only be an Information Link. This
 * is "guide, don't nag" (F4): the editor refuses an invalid drop mid-gesture
 * rather than erroring after the fact.
 */
import type { Model, ModelNode } from "./types"

/** What a source→target connection would create, or null if the rules forbid it. */
export type ConnectionIntent = "flow" | "info" | null

export function intentFor(source: ModelNode, target: ModelNode): ConnectionIntent {
  if (source.id === target.id) return null

  if (target.kind === "stock" || target.kind === "cloud") {
    // A Flow. Both ends must be Stocks or Clouds, and not cloud→cloud.
    if (source.kind !== "stock" && source.kind !== "cloud") return null
    if (source.kind === "cloud" && target.kind === "cloud") return null
    return "flow"
  }

  // target is a Flow or Converter → an Information Link.
  if (source.kind === "cloud") return null
  return "info"
}

/** Whether source→target is allowed *and* not a duplicate of an existing edge. */
export function canConnect(model: Model, sourceId: string, targetId: string): boolean {
  const source = model.nodes.find((node) => node.id === sourceId)
  const target = model.nodes.find((node) => node.id === targetId)
  if (!source || !target) return false

  const intent = intentFor(source, target)
  if (intent === null) return false

  if (intent === "info") {
    return !model.infoLinks.some((link) => link.source === sourceId && link.target === targetId)
  }
  return !model.nodes.some(
    (node) => node.kind === "flow" && node.source === sourceId && node.target === targetId,
  )
}
