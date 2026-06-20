<script setup lang="ts">
/**
 * Flow pipe edge (C3) — the source→valve and valve→target segments of a Flow.
 *
 * The pipe leaves the source on the right and docks square into the target's
 * left edge (horizontal tangents both ends), so the arrowhead always enters the
 * stock straight-on. Vue Flow's default bezier does the same — but it sizes the
 * horizontal "flatten" arm from the *horizontal* gap alone, so when the valve
 * sits nearly above the stock that arm collapses to ~zero: the curve stays steep
 * and snaps flat only in its final pixels, leaving the arrowhead on a stub of
 * horizontal line while the visible stroke arrives steep — the head detaches.
 *
 * Sizing the arm from the vertical drop too keeps a real horizontal run before
 * the stock at any approach angle, so the arrowhead sits on the line and still
 * docks square. BaseEdge draws the stroke (same .vue-flow__edge-path class, so
 * theme stroke/width are unchanged) and carries the markerEnd through.
 */
import { BaseEdge, type EdgeProps } from "@vue-flow/core"
import { computed } from "vue"
import type { EdgeData } from "@/model/projection"

const props = defineProps<EdgeProps<EdgeData>>()

const path = computed(() => {
  const { sourceX: sx, sourceY: sy, targetX: tx, targetY: ty } = props
  const arm = Math.min(120, Math.max(30, Math.abs(tx - sx) * 0.5, Math.abs(ty - sy) * 0.45))
  // Cubic with horizontal control points: out the source's right, into the
  // target's left. `arm` is the run over which each end stays horizontal.
  return `M ${sx},${sy} C ${sx + arm},${sy} ${tx - arm},${ty} ${tx},${ty}`
})
</script>

<template>
  <BaseEdge :id="props.id" :path="path" :marker-end="props.markerEnd" :style="props.style" />
</template>
