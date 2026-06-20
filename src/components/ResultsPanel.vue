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
 * a checklist for bringing a diagram to life. The plot itself is a uPlot canvas
 * (see SimChart) — a small, fast time-series library that earns its keep with a
 * real time axis and hover-to-read values the hand-built SVG couldn't give.
 */
import type uPlot from "uplot"
import { computed, onBeforeUnmount, onMounted } from "vue"
import SimChart from "./SimChart.vue"
import { checkSimReady } from "@/model/simulation"
import { DEFAULT_SIM_SPEC, type SimSpec, type StockNode } from "@/model/types"
import { useModelStore } from "@/store/model"
import { useSimulationStore } from "@/store/simulation"

defineEmits<{ close: [] }>()

const store = useModelStore()
const sim = useSimulationStore()

// While the panel is open the canvas shows live values; closing it returns the
// canvas to a plain diagram.
onMounted(() => sim.enable())
onBeforeUnmount(() => sim.disable())

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

// Stocks only — the system's memory, and so the trajectories worth watching. The
// run comes from the simulation store, so the chart and the canvas share one index.
const chart = computed(() => {
  const run = sim.run
  if (!run) return null
  const stocks = store.model.nodes.filter((n): n is StockNode => n.kind === "stock")
  if (stocks.length === 0 || run.times.length < 2) return null

  const data = [run.times, ...stocks.map((s) => run.series.get(s.id) ?? [])] as uPlot.AlignedData
  const series = stocks.map((s, i) => ({ label: s.name, stroke: COLORS[i % COLORS.length] }))
  return { data, series, diverged: run.diverged }
})
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

    <!-- Sim-ready: the plot, plus a transport that drives the playhead. Hover a
         point to read values; press play to watch the canvas animate in step. -->
    <template v-if="chart">
      <SimChart class="mt-2" :data="chart.data" :series="chart.series" :marker="sim.currentTime" />
      <div class="mt-2 flex items-center gap-2">
        <button
          type="button"
          class="btn btn-primary btn-xs w-8"
          :aria-label="sim.playing ? 'Pause' : 'Play'"
          @click="sim.toggle()"
        >
          {{ sim.playing ? "❚❚" : "▶" }}
        </button>
        <input
          type="range"
          class="range range-xs flex-1"
          min="0"
          :max="Math.max(0, sim.frameCount - 1)"
          :value="sim.playhead"
          aria-label="Playhead"
          @input="sim.seek(Number(($event.target as HTMLInputElement).value))"
        />
        <span class="w-14 text-right font-mono text-xs tabular-nums text-base-content/60">
          t = {{ sim.currentTime ?? 0 }}
        </span>
      </div>
    </template>

    <!-- Not sim-ready: what to fill in to bring it to life. -->
    <div v-else class="mt-2 text-sm">
      <p class="text-base-content/70">To bring this model to life, set:</p>
      <ul class="mt-1 list-inside list-disc text-base-content/60">
        <li v-for="(problem, i) in problems" :key="i">{{ problem }}</li>
      </ul>
    </div>
  </div>
</template>
