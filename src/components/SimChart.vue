<script setup lang="ts">
/**
 * uPlot wrapper for the behaviour-over-time plot. uPlot is an imperative canvas
 * library, so this component owns its lifecycle: build on mount, push new samples
 * with `setData` when a run recomputes, rebuild when the *set* of tracks changes
 * (a Stock renamed/added/removed), follow the container width with a
 * ResizeObserver, and destroy on unmount.
 *
 * Two deliberate settings:
 *  - `scales.x.time = false` — x is *simulation* time (0…stop), not wall-clock;
 *    uPlot would otherwise format the axis as calendar dates.
 *  - Colours are read from the DaisyUI theme variables so the chart matches the
 *    rest of the editor. The app ships a single light theme (no `data-theme`
 *    switching), so they are resolved once at build time rather than watched.
 */
import uPlot from "uplot"
import "uplot/dist/uPlot.min.css"
import { onBeforeUnmount, onMounted, ref, watch } from "vue"

/** One plotted track: its legend label and line colour. */
export interface ChartSeries {
  label: string
  stroke: string
}

const props = withDefaults(
  defineProps<{
    /** uPlot aligned data: `[times, ...one value track per series]`. */
    data: uPlot.AlignedData
    /** Track metadata, in the same order as `data[1…]`. */
    series: ChartSeries[]
    /** Canvas height in CSS pixels (the legend sits below it). */
    height?: number
    /** Simulation time of the playhead, drawn as a vertical line (null = none). */
    marker?: number | null
  }>(),
  { height: 160, marker: null },
)

const root = ref<HTMLDivElement>()
let plot: uPlot | undefined
let observer: ResizeObserver | undefined
/** Signature of the current plot's tracks; a change means the shape changed. */
let builtSig = ""

// Playhead as a DOM overlay (CSS px), not a canvas line: a moving line drawn by
// redrawing the whole uPlot canvas every frame flickers, so the line slides over
// the canvas instead and the canvas is only redrawn when the data changes.
const markerX = ref<number | null>(null)
const markerTop = ref(0)
const markerHeight = ref(0)

function syncMarker(): void {
  if (!plot || props.marker === null) {
    markerX.value = null
    return
  }
  // bbox is in device pixels; the overlay is laid out in CSS pixels.
  const ratio = window.devicePixelRatio || 1
  // valToPos (CSS px) is relative to the plot area's left edge, but the overlay
  // is positioned against the canvas, so add the left gutter (the y-axis width).
  markerX.value = plot.bbox.left / ratio + plot.valToPos(props.marker, "x")
  markerTop.value = plot.bbox.top / ratio
  markerHeight.value = plot.bbox.height / ratio
}

/** Compact axis/legend numbers (7039.99 → "7040", 0.42 → "0.42", idle → "--"). */
function fmt(value: number | null): string {
  if (value === null) return "--"
  return Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2)
}

/** A DaisyUI theme colour, with a light-theme fallback if the var is unset. */
function themeColor(name: string, fallback: string): string {
  const value = root.value ? getComputedStyle(root.value).getPropertyValue(name).trim() : ""
  return value || fallback
}

/**
 * Peak |value| of a track as an order of magnitude (log10), or null when the
 * track is empty or flat-zero — there is no magnitude to compare.
 */
function magnitude(track: (number | null)[]): number | null {
  let peak = 0
  for (const v of track) {
    if (v !== null && Number.isFinite(v)) {
      const a = Math.abs(v)
      if (a > peak) peak = a
    }
  }
  return peak > 0 ? Math.log10(peak) : null
}

// Split tracks onto a second y-axis once they span more than this many orders of
// magnitude: below it a single shared axis reads fine; above it the smaller track
// is flattened against the baseline by the larger one.
const SPLIT_DECADES = 1

/**
 * Assign each series a y-scale: "y" (left axis) or "y2" (right axis). Tracks are
 * split at their widest magnitude gap when that gap exceeds SPLIT_DECADES, with the
 * smaller-magnitude tracks moving to "y2"; otherwise every track stays on "y".
 * Flat-zero tracks have no magnitude, so they stay on the primary axis.
 */
function scaleKeys(): ("y" | "y2")[] {
  const tracks = props.data.slice(1) as (number | null)[][]
  const mags = tracks.map(magnitude)
  const known = mags.filter((m): m is number => m !== null).sort((a, b) => a - b)
  if (known.length < 2) return tracks.map(() => "y")
  // The widest gap between adjacent magnitudes is the natural cut between "big" and
  // "small" tracks; its midpoint is the threshold each track is measured against.
  let gap = 0
  let cut = 0
  for (let i = 1; i < known.length; i++) {
    if (known[i] - known[i - 1] > gap) {
      gap = known[i] - known[i - 1]
      cut = (known[i] + known[i - 1]) / 2
    }
  }
  if (gap < SPLIT_DECADES) return tracks.map(() => "y")
  return mags.map((m) => (m !== null && m < cut ? "y2" : "y"))
}

function trackSig(): string {
  const scales = scaleKeys()
  return props.series.map((s, i) => `${s.label}|${s.stroke}|${scales[i]}`).join(",")
}

function options(width: number): uPlot.Options {
  // Follow the app's --font-sans (resolved on the element) rather than naming a
  // family here, so the chart tracks the theme font without a second source.
  const family = root.value
    ? getComputedStyle(root.value).fontFamily
    : "ui-sans-serif, system-ui, sans-serif"
  const axis: uPlot.Axis = {
    stroke: themeColor("--color-base-content", "#1f2937"),
    grid: { stroke: themeColor("--color-base-300", "#e5e7eb"), width: 1 },
    ticks: { stroke: themeColor("--color-base-300", "#e5e7eb"), width: 1 },
    font: `11px ${family}`,
  }
  const scales = scaleKeys()
  const split = scales.includes("y2")
  return {
    width,
    height: props.height,
    // No y crosshair, and no click-drag-to-zoom (uPlot's drag.setScale defaults
    // on): the chart is a read-only readout — the playhead drives time, not a
    // drag-selected zoom region.
    cursor: { y: false, drag: { x: false, y: false } },
    scales: { x: { time: false } },
    series: [
      // x is simulation time, so the live legend's first column reads "Time"
      // rather than uPlot's default "Value".
      { label: "Time" },
      ...props.series.map(
        (s, i): uPlot.Series => ({
          label: s.label,
          scale: scales[i],
          stroke: s.stroke,
          width: 2,
          points: { show: false },
          value: (_self, raw) => fmt(raw),
        }),
      ),
    ],
    // When tracks span orders of magnitude the small ones move to a right-hand
    // axis ("y2"); its grid is suppressed so the two grids don't clash.
    axes: split
      ? [
          axis,
          { ...axis, size: 52 },
          { ...axis, scale: "y2", side: 1, size: 52, grid: { show: false } },
        ]
      : [axis, { ...axis, size: 52 }],
  }
}

function build(): void {
  if (!root.value) return
  plot?.destroy()
  builtSig = trackSig()
  plot = new uPlot(options(root.value.clientWidth), props.data, root.value)
}

/** Cheap on every recompute; only a shape change forces a full rebuild. */
function render(): void {
  if (!plot || trackSig() !== builtSig) build()
  else plot.setData(props.data)
  syncMarker() // the plot area may have shifted; keep the overlay aligned
}

onMounted(() => {
  build()
  observer = new ResizeObserver(() => {
    if (plot && root.value) {
      plot.setSize({ width: root.value.clientWidth, height: props.height })
      syncMarker()
    }
  })
  if (root.value) observer.observe(root.value)
  syncMarker()
  // The canvas paints before the web font loads and won't repaint on its own, so
  // axis labels would stick to the fallback. Redraw once the font is ready.
  document.fonts?.ready.then(() => {
    plot?.redraw()
    syncMarker()
  })
})

onBeforeUnmount(() => {
  observer?.disconnect()
  plot?.destroy()
})

watch(() => props.data, render)
// The playhead just slides the overlay — no canvas redraw, so playback stays smooth.
watch(() => props.marker, syncMarker)
</script>

<template>
  <div ref="root" class="relative w-full">
    <div
      v-if="markerX !== null"
      class="pointer-events-none absolute w-px bg-primary"
      :style="{ left: `${markerX}px`, top: `${markerTop}px`, height: `${markerHeight}px` }"
    />
  </div>
</template>

<style scoped>
:deep(.u-legend) {
  font-size: 0.75rem;
  color: var(--color-base-content);
}
:deep(.u-legend .u-value) {
  font-variant-numeric: tabular-nums;
}
/* Each track row toggles its line on click (⌘/Ctrl-click isolates it); the first
   row is the Time readout and has no such handler. */
:deep(.u-legend .u-series) {
  cursor: pointer;
}
:deep(.u-legend .u-series:first-child) {
  cursor: default;
}
</style>
