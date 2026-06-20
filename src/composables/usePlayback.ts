/**
 * Playback clock — the wall-clock that advances the simulation playhead while
 * `playing`. It lives in a composable (mounted once, in the Editor) because it
 * needs `requestAnimationFrame` and component teardown; the simulation store
 * stays pure state + actions.
 *
 * A run plays over a fixed wall-clock window regardless of how many samples it
 * has, so a 40-step model and a 480-step one feel the same speed. Elapsed time is
 * accumulated and drained in whole frames, so a slow tab catches up rather than
 * drifting.
 */
import { onBeforeUnmount, watch } from "vue"
import { useSimulationStore } from "@/store/simulation"

/** Target wall-clock duration for a whole run, in milliseconds. */
const RUN_DURATION_MS = 6000

export function usePlayback(): void {
  const sim = useSimulationStore()
  let raf = 0
  let last = 0
  let carry = 0

  function frame(now: number): void {
    if (!sim.playing) return
    carry += now - last
    last = now
    const msPerFrame = Math.max(16, RUN_DURATION_MS / Math.max(1, sim.frameCount))
    while (carry >= msPerFrame && sim.playing) {
      carry -= msPerFrame
      sim.tick()
    }
    raf = requestAnimationFrame(frame)
  }

  watch(
    () => sim.playing,
    (playing) => {
      cancelAnimationFrame(raf)
      if (playing) {
        last = performance.now()
        carry = 0
        raf = requestAnimationFrame(frame)
      }
    },
  )

  onBeforeUnmount(() => cancelAnimationFrame(raf))
}
