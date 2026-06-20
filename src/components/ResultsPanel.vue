<script setup lang="ts">
/**
 * Results panel (phase 2, ADR-0004) — what makes the Model *alive*: it runs the
 * simulation and traces each Stock's value over time. Stocks are the system's
 * memory, so their trajectories are the behaviour worth watching (the savings
 * balance snowballs; the coffee settles toward room temperature).
 *
 * It reads the source-of-truth Model straight from the store and recomputes
 * reactively, so editing a rule and reopening re-runs. When the Model is not yet
 * sim-ready, it shows what is missing instead of a plot — the gap list doubles as
 * a checklist for bringing a diagram to life. No charting dependency: the plot is
 * a hand-built SVG (the same lean-substrate choice as the rest of the editor).
 */
import { computed } from "vue"
import { checkSimReady, simulate } from "@/model/simulation"
import { DEFAULT_SIM_SPEC, type SimSpec, type StockNode } from "@/model/types"
import { useModelStore } from "@/store/model"

defineEmits<{ close: [] }>()

const store = useModelStore()

const problems = computed(() => checkSimReady(store.model))

/** The current run window; falls back to the default until the Model carries one. */
const spec = computed<SimSpec>(() => store.model.sim ?? DEFAULT_SIM_SPEC)

function onSpec(key: keyof SimSpec, event: Event): void {
  const n = Number((event.target as HTMLInputElement).value)
  if (!Number.isFinite(n) || (key === "dt" && n <= 0)) return
  store.setSimSpec({ ...spec.value, [key]: n })
}

/** Distinct, legible track colours; cycled if a Model has more Stocks than these. */
const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed", "#0891b2"]

// SVG canvas in its own coordinate space; it stretches to the panel width, and
// non-scaling strokes keep lines crisp under that non-uniform scale.
const W = 600
const H = 200
const PAD = 12

const chart = computed(() => {
  if (problems.value.length > 0) return null
  const run = simulate(store.model)
  const stocks = store.model.nodes.filter((n): n is StockNode => n.kind === "stock")
  const all = stocks.flatMap((s) => run.series.get(s.id) ?? [])
  if (all.length === 0 || run.times.length < 2) return null

  let min = Math.min(...all)
  let max = Math.max(...all)
  if (min === max) {
    // A flat trajectory: pad so the line lands mid-panel instead of on an edge.
    min -= 1
    max += 1
  }
  const n = run.times.length
  const x = (i: number) => PAD + (i / (n - 1)) * (W - 2 * PAD)
  const y = (v: number) => PAD + (1 - (v - min) / (max - min)) * (H - 2 * PAD)

  const lines = stocks.map((s, i) => {
    const values = run.series.get(s.id) ?? []
    return {
      id: s.id,
      name: s.name,
      color: COLORS[i % COLORS.length],
      points: values.map((v, j) => `${x(j).toFixed(1)},${y(v).toFixed(1)}`).join(" "),
      last: values[values.length - 1] ?? 0,
    }
  })

  return { lines, min, max, t0: run.times[0], t1: run.times[n - 1], diverged: run.diverged }
})

/** Compact numbers for axis ticks and the legend (e.g. 7039.99 → "7040"). */
function fmt(value: number): string {
  return Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2)
}
</script>

<template>
  <div
    class="absolute inset-x-3 bottom-3 z-30 rounded-box border border-base-300 bg-base-100/95 p-3 shadow-lg backdrop-blur"
  >
    <div class="flex items-center gap-2">
      <span class="text-sm font-semibold">Behaviour over time</span>
      <span class="truncate text-xs text-base-content/50">{{ store.model.name }}</span>
      <div class="ml-auto flex items-center gap-2 text-xs text-base-content/60">
        <label class="flex items-center gap-1">
          from
          <input
            type="number"
            class="input input-xs input-bordered w-16"
            :value="spec.start"
            @change="onSpec('start', $event)"
          />
        </label>
        <label class="flex items-center gap-1">
          to
          <input
            type="number"
            class="input input-xs input-bordered w-16"
            :value="spec.stop"
            @change="onSpec('stop', $event)"
          />
        </label>
        <label class="flex items-center gap-1">
          step
          <input
            type="number"
            step="any"
            min="0"
            class="input input-xs input-bordered w-16"
            :value="spec.dt"
            @change="onSpec('dt', $event)"
          />
        </label>
        <button
          type="button"
          class="btn btn-circle btn-ghost btn-xs"
          aria-label="Close"
          @click="$emit('close')"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Stopped early because values ran past what a float can hold. -->
    <p v-if="chart?.diverged" class="mt-2 text-xs text-warning">
      ⚠ Values grew beyond what can be plotted and the run stopped early — try a smaller step, a
      smaller factor, or a Balancing loop to rein it in.
    </p>

    <!-- Sim-ready: the plot, with a legend of final values. -->
    <div v-if="chart" class="mt-2 flex items-stretch gap-3">
      <svg
        :viewBox="`0 0 ${W} ${H}`"
        preserveAspectRatio="none"
        class="h-40 flex-1 rounded-md bg-base-200/40"
        role="img"
        aria-label="Stock values over time"
      >
        <text :x="PAD" :y="PAD" class="fill-base-content/40 text-[10px]">{{ fmt(chart.max) }}</text>
        <text :x="PAD" :y="H - PAD / 2" class="fill-base-content/40 text-[10px]">
          {{ fmt(chart.min) }}
        </text>
        <polyline
          v-for="line in chart.lines"
          :key="line.id"
          :points="line.points"
          fill="none"
          :stroke="line.color"
          stroke-width="2"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke"
        />
      </svg>
      <ul class="flex w-44 flex-col gap-1 self-center text-xs">
        <li v-for="line in chart.lines" :key="line.id" class="flex items-center gap-2">
          <span class="size-2.5 shrink-0 rounded-full" :style="{ backgroundColor: line.color }" />
          <span class="truncate">{{ line.name }}</span>
          <span class="ml-auto font-mono text-base-content/60">{{ fmt(line.last) }}</span>
        </li>
      </ul>
    </div>

    <!-- Not sim-ready: what to fill in to bring it to life. -->
    <div v-else class="mt-2 text-sm">
      <p class="text-base-content/70">To bring this model to life, set:</p>
      <ul class="mt-1 list-inside list-disc text-base-content/60">
        <li v-for="(problem, i) in problems" :key="i">{{ problem }}</li>
      </ul>
    </div>
  </div>
</template>
