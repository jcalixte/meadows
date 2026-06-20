/**
 * Simulation store (phase 2) — the single source of *playback* truth, the way
 * the model store is the single source of structural truth. It owns one run and
 * one playhead, so the behaviour chart and the canvas animate off the same index:
 * drag the scrubber and every Stock on the canvas jumps to that instant.
 *
 * The run is derived from the Model (recomputed when the Model changes, like the
 * loop detector), so editing a rule and reopening re-runs. Playback itself — the
 * clock that advances the playhead — lives in a composable (`usePlayback`), since
 * timers need component lifecycle; this store only holds state and pure actions.
 */
import { defineStore } from "pinia"
import { computed, ref, watch } from "vue"
import { checkSimReady, type Run, simulate } from "@/model/simulation"
import { useModelStore } from "./model"

export const useSimulationStore = defineStore("simulation", () => {
  const modelStore = useModelStore()

  /** A Model is runnable only once every Stock has a value and every rate a rule. */
  const ready = computed(() => checkSimReady(modelStore.model).length === 0)

  /** The current run, or null when the Model isn't runnable. Recomputes on edit. */
  const run = computed<Run | null>(() => {
    if (!ready.value) return null
    try {
      return simulate(modelStore.model)
    } catch {
      // checkSimReady already rejects algebraic loops; this is belt-and-braces.
      return null
    }
  })

  const frameCount = computed(() => run.value?.times.length ?? 0)

  /** Whether the canvas should show live values: the panel is open and a run exists. */
  const enabled = ref(false)
  const playing = ref(false)
  const playhead = ref(0)

  const active = computed(() => enabled.value && frameCount.value > 0)
  const atEnd = computed(() => playhead.value >= frameCount.value - 1)
  const currentTime = computed(() => run.value?.times[playhead.value] ?? null)

  /** Per-element peak magnitude across the run, for the Stock fill gauge. */
  const peaks = computed(() => {
    const map = new Map<string, number>()
    const r = run.value
    if (r) {
      for (const [id, series] of r.series) {
        let max = 0
        for (const v of series) if (Number.isFinite(v)) max = Math.max(max, Math.abs(v))
        map.set(id, max)
      }
    }
    return map
  })

  // Keep the playhead in range when the run shrinks (e.g. a shorter stop time).
  watch(frameCount, (n) => {
    if (playhead.value > n - 1) playhead.value = Math.max(0, n - 1)
  })

  /** A node's value at the current playhead, or null when there's nothing to show. */
  function valueAt(id: string): number | null {
    if (!active.value) return null
    const value = run.value?.series.get(id)?.[playhead.value]
    return value === undefined || !Number.isFinite(value) ? null : value
  }

  /** A Stock's fill level in 0…1 (value over its peak), for the gauge. */
  function fill(id: string): number {
    const value = valueAt(id)
    const peak = peaks.value.get(id) ?? 0
    if (value === null || peak <= 0) return 0
    return Math.min(1, Math.max(0, value / peak))
  }

  function seek(index: number): void {
    playhead.value = Math.min(Math.max(0, Math.round(index)), Math.max(0, frameCount.value - 1))
  }

  function play(): void {
    if (frameCount.value === 0) return
    if (atEnd.value) playhead.value = 0 // replay from the start
    playing.value = true
  }

  function pause(): void {
    playing.value = false
  }

  function toggle(): void {
    if (playing.value) pause()
    else play()
  }

  /** Advance one frame; stop at the end. Called by the playback clock. */
  function tick(): void {
    if (atEnd.value) {
      playing.value = false
      return
    }
    playhead.value++
  }

  /** Engage playback (panel opened): show values, start from the beginning. */
  function enable(): void {
    enabled.value = true
    playhead.value = 0
  }

  /** Disengage (panel closed): the canvas returns to a plain diagram. */
  function disable(): void {
    enabled.value = false
    playing.value = false
    playhead.value = 0
  }

  return {
    run,
    ready,
    frameCount,
    enabled,
    playing,
    playhead,
    active,
    atEnd,
    currentTime,
    valueAt,
    fill,
    seek,
    play,
    pause,
    toggle,
    tick,
    enable,
    disable,
  }
})
