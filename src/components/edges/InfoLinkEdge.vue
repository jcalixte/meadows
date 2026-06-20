<script setup lang="ts">
/**
 * Information Link edge (C3) — the dashed influence arrow plus a clickable
 * polarity badge at its midpoint. Polarity is captured on create (default `+`,
 * F6) and flipped in one click here; it is the loop detector's only structural
 * input (ADR-0001), so it lives right on the link. The bezier pipe is drawn by
 * BaseEdge; the badge is portalled over the viewport by EdgeLabelRenderer so it
 * stays pinned to the path under pan/zoom.
 */
import { BaseEdge, type EdgeProps, EdgeLabelRenderer, getBezierPath } from "@vue-flow/core"
import { computed } from "vue"
import { useLoopHighlight } from "@/composables/useLoopHighlight"
import type { EdgeData } from "@/model/projection"
import { useModelStore } from "@/store/model"

const props = defineProps<EdgeProps<EdgeData>>()
const store = useModelStore()
const { highlighted } = useLoopHighlight()

// [path, labelX, labelY, ...] — labelX/Y is the path centre, in flow coords.
const path = computed(() =>
  getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  }),
)

const polarity = computed(() => props.data.polarity ?? "+")
// Display the typographic minus (the model stores ASCII "-").
const glyph = computed(() => (polarity.value === "+" ? "+" : "−"))

// Light up when this link is an edge of the hovered loop (C11).
const inLoop = computed(
  () => highlighted.value?.edges.has(`${props.source}>${props.target}`) ?? false,
)
const edgeStyle = computed(() =>
  inLoop.value
    ? {
        ...props.style,
        stroke: highlighted.value?.type === "R" ? "var(--color-success)" : "var(--color-warning)",
        strokeWidth: "2.5px",
      }
    : props.style,
)
</script>

<template>
  <BaseEdge :id="props.id" :path="path[0]" :marker-end="props.markerEnd" :style="edgeStyle" />
  <EdgeLabelRenderer>
    <button
      class="nodrag nopan absolute flex size-5 items-center justify-center rounded-full border text-xs font-bold leading-none shadow-sm transition-colors"
      :class="
        polarity === '+'
          ? 'border-primary/40 bg-base-100 text-primary hover:bg-primary/10'
          : 'border-error/50 bg-base-100 text-error hover:bg-error/10'
      "
      :style="{
        transform: `translate(-50%, -50%) translate(${path[1]}px, ${path[2]}px)`,
        pointerEvents: 'all',
      }"
      :title="`Polarity ${glyph} — click to toggle`"
      @click="store.toggleLinkPolarity(props.id)"
    >
      {{ glyph }}
    </button>
  </EdgeLabelRenderer>
</template>
