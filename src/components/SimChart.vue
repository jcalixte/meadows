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

function trackSig(): string {
  return props.series.map((s) => `${s.label}|${s.stroke}`).join(",")
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
  return {
    width,
    height: props.height,
    cursor: { y: false },
    scales: { x: { time: false } },
    // Playhead: a vertical line at the current simulation time, so the chart and
    // the animating canvas read off the same instant. Drawn after the series, and
    // redrawn whenever `marker` changes (see the watch below).
    hooks: {
      draw: [
        (u: uPlot): void => {
          if (props.marker === null) return
          const x = Math.round(u.valToPos(props.marker, "x", true))
          const { ctx } = u
          ctx.save()
          ctx.beginPath()
          ctx.lineWidth = 1
          ctx.strokeStyle = themeColor("--color-primary", "#2563eb")
          ctx.moveTo(x, u.bbox.top)
          ctx.lineTo(x, u.bbox.top + u.bbox.height)
          ctx.stroke()
          ctx.restore()
        },
      ],
    },
    series: [
      {},
      ...props.series.map(
        (s): uPlot.Series => ({
          label: s.label,
          stroke: s.stroke,
          width: 2,
          points: { show: false },
          value: (_self, raw) => fmt(raw),
        }),
      ),
    ],
    axes: [axis, { ...axis, size: 52 }],
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
}

onMounted(() => {
  build()
  observer = new ResizeObserver(() => {
    if (plot && root.value) plot.setSize({ width: root.value.clientWidth, height: props.height })
  })
  if (root.value) observer.observe(root.value)
  // The canvas paints before the web font loads and won't repaint on its own, so
  // axis labels would stick to the fallback. Redraw once the font is ready.
  document.fonts?.ready.then(() => plot?.redraw())
})

onBeforeUnmount(() => {
  observer?.disconnect()
  plot?.destroy()
})

watch(() => props.data, render)
// The playhead moves without the data changing, so nudge a redraw on its own.
watch(
  () => props.marker,
  () => plot?.redraw(),
)
</script>

<template>
  <div ref="root" class="w-full" />
</template>

<style scoped>
:deep(.u-legend) {
  font-size: 0.75rem;
  color: var(--color-base-content);
}
:deep(.u-legend .u-value) {
  font-variant-numeric: tabular-nums;
}
</style>
