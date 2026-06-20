<script setup lang="ts">
/**
 * Gloss-on-selection (F11, G4) — when exactly one element is selected, name it
 * and define it in a small corner card. Selection is deliberate and singular, so
 * the canvas stays pixel-clean and silent until you ask — no passive hover noise
 * on a dense model. Self-contained: reads selection straight from the shared Vue
 * Flow instance, so it drops into the Editor as one tag.
 *
 * A pipe edge stands in for its Flow node, so selecting one glosses the Flow; an
 * info edge glosses the Information Link. Anything else (nothing, or a multi-
 * selection) hides the card.
 */
import { useVueFlow } from "@vue-flow/core"
import { computed } from "vue"
import { type GlossEntry, INFO_LINK_GLOSS, NODE_GLOSSARY } from "@/model/glossary"
import type { EdgeData, NodeData } from "@/model/projection"

const { getSelectedNodes, getSelectedEdges } = useVueFlow("meadows")

const gloss = computed<GlossEntry | null>(() => {
  const nodes = getSelectedNodes.value
  const edges = getSelectedEdges.value

  if (nodes.length === 1 && edges.length === 0) {
    const node = (nodes[0].data as NodeData | undefined)?.node
    return node ? NODE_GLOSSARY[node.kind] : null
  }
  if (edges.length === 1 && nodes.length === 0) {
    const kind = (edges[0].data as EdgeData | undefined)?.kind
    if (kind === "info") return INFO_LINK_GLOSS
    if (kind === "pipe") return NODE_GLOSSARY.flow
  }
  return null
})
</script>

<template>
  <div
    v-if="gloss"
    class="pointer-events-none absolute right-3 bottom-3 z-10 max-w-xs rounded-box border border-base-300 bg-base-100/90 p-3 shadow-md backdrop-blur"
  >
    <div class="text-sm font-semibold">{{ gloss.term }}</div>
    <p class="mt-0.5 text-xs leading-snug text-base-content/70">{{ gloss.short }}</p>
  </div>
</template>
