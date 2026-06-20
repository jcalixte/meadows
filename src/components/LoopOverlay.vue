<script setup lang="ts">
/**
 * Loop overlay (C11, ADR-0001) — an R/B badge floating at each detected loop's
 * centre, Reinforcing in green and Balancing in amber. Loops are derived live
 * from the wiring (store getter), so badges appear, vanish and reclassify as you
 * wire, toggle polarity, or delete. Hovering a badge lights up that loop's nodes
 * and links via the shared highlight.
 *
 * Badges live in screen space: each loop's centroid (the mean of its nodes'
 * live centres, read straight from Vue Flow) is mapped through the viewport
 * transform, so a badge tracks pan, zoom, and dragging a member node — the store
 * only commits positions on drop, so reading it would lag a drag. Colliding
 * badges are stacked so overlapping loops stay legible (the cost of on-canvas
 * badges).
 */
import { useVueFlow } from "@vue-flow/core"
import { computed } from "vue"
import { useLoopHighlight } from "@/composables/useLoopHighlight"
import type { Loop } from "@/model/loops"
import { useModelStore } from "@/store/model"

const store = useModelStore()
const { viewport, getNodes } = useVueFlow("meadows")
const { highlight, clear } = useLoopHighlight()

const nameOf = computed(() => {
  const map = new Map<string, string>()
  for (const node of store.model.nodes) if (node.kind !== "cloud") map.set(node.id, node.name)
  return map
})

interface Badge {
  loop: Loop
  x: number
  y: number
}

const badges = computed<Badge[]>(() => {
  // Live node centres from Vue Flow (computedPosition updates during a drag).
  const centres = new Map(
    getNodes.value.map((n) => [
      n.id,
      {
        x: n.computedPosition.x + n.dimensions.width / 2,
        y: n.computedPosition.y + n.dimensions.height / 2,
      },
    ]),
  )
  const { x: vx, y: vy, zoom } = viewport.value
  const placed: Badge[] = []

  for (const loop of store.loops) {
    let sx = 0
    let sy = 0
    let count = 0
    for (const id of loop.nodeIds) {
      const c = centres.get(id)
      if (c) {
        sx += c.x
        sy += c.y
        count++
      }
    }
    if (count === 0) continue
    const x = (sx / count) * zoom + vx
    let y = (sy / count) * zoom + vy
    while (placed.some((b) => Math.abs(b.x - x) < 26 && Math.abs(b.y - y) < 26)) y += 26
    placed.push({ loop, x, y })
  }
  return placed
})

function title(loop: Loop): string {
  const kind = loop.type === "R" ? "Reinforcing" : "Balancing"
  const names = loop.nodeIds.map((id) => nameOf.value.get(id) ?? "·").join(" → ")
  return `${kind} loop · ${names}`
}
</script>

<template>
  <div class="pointer-events-none absolute inset-0 overflow-hidden">
    <button
      v-for="badge in badges"
      :key="badge.loop.id"
      class="pointer-events-auto absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-xs font-bold shadow transition-transform hover:scale-125"
      :class="
        badge.loop.type === 'R'
          ? 'border-success/60 bg-success text-success-content'
          : 'border-warning/60 bg-warning text-warning-content'
      "
      :style="{ left: `${badge.x}px`, top: `${badge.y}px` }"
      :title="title(badge.loop)"
      @mouseenter="highlight(badge.loop)"
      @mouseleave="clear()"
      @focus="highlight(badge.loop)"
      @blur="clear()"
    >
      {{ badge.loop.type }}
    </button>
  </div>
</template>
