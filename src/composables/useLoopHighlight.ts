/**
 * Shared loop-hover highlight (C11). Deliberately *not* in the Model store: this
 * is transient view state that must never be snapshotted for undo or picked up
 * by autosave (F7). The badge layer sets it on hover; nodes and Information Link
 * edges read it to light up the loop they belong to.
 *
 * A module-level ref makes it a singleton shared by every component that calls
 * the composable, without prop-drilling through Vue Flow's render tree.
 */
import { computed, type Ref, ref } from "vue"
import type { Loop, LoopType } from "@/model/loops"

interface LoopHighlight {
  nodes: Set<string>
  /** Directed `source>target` pairs of the loop's edges, for link highlighting. */
  edges: Set<string>
  type: LoopType
}

const highlighted = ref<LoopHighlight | null>(null)

export function useLoopHighlight(): {
  highlighted: Ref<LoopHighlight | null>
  highlight: (loop: Loop) => void
  clear: () => void
} {
  function highlight(loop: Loop): void {
    const ids = loop.nodeIds
    const edges = new Set<string>()
    for (let i = 0; i < ids.length; i++) edges.add(`${ids[i]}>${ids[(i + 1) % ids.length]}`)
    highlighted.value = { nodes: new Set(ids), edges, type: loop.type }
  }
  function clear(): void {
    highlighted.value = null
  }
  return { highlighted, highlight, clear }
}

/** Ring class for a node when it belongs to the hovered loop (empty otherwise). */
export function useNodeLoopRing(nodeId: string): Ref<string> {
  return computed(() => {
    const hl = highlighted.value
    if (!hl || !hl.nodes.has(nodeId)) return ""
    return hl.type === "R"
      ? "ring-2 ring-success ring-offset-2"
      : "ring-2 ring-warning ring-offset-2"
  })
}
