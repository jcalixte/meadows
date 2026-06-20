/**
 * Autosave (F7) — the binding between the Model store (C5) and the repository
 * (C9). It restores the last document on mount, then persists every change with
 * a short debounce so a burst of edits costs one write, well inside the ≤500 ms
 * budget. The debounce window is the only data-loss risk, so pending edits are
 * also flushed when the tab is hidden or closed.
 *
 * It lives in a composable, not the store: persistence needs component lifecycle
 * (mount/unmount) and browser globals, which keep the store pure and testable.
 * The repository is injected (defaulting to IndexedDB) so it stays swappable.
 */
import { nextTick, onBeforeUnmount, onMounted, watch } from "vue"
import { createRepository, type ModelRepository } from "@/model/repository"
import { useModelStore } from "@/store/model"

/** Coalesce a burst of edits into one write; comfortably under the 500 ms budget. */
const DEBOUNCE_MS = 400

interface AutosaveOptions {
  repository?: ModelRepository
  /** Called once after a saved Model is restored (e.g. to fit the view). */
  onRestore?: () => void
}

export function useAutosave(options: AutosaveOptions = {}): { flush: () => void } {
  const repository = options.repository ?? createRepository()
  const store = useModelStore()
  // Armed only after the initial load, so restoring a document doesn't echo back
  // a redundant save of what we just read.
  let ready = false
  let timer: ReturnType<typeof setTimeout> | null = null

  async function save(): Promise<void> {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    if (!ready) return
    // Plain, proxy-free clone: idb structured-clones on put and would choke on
    // the Vue reactive proxy (the same reason undo snapshots use JSON).
    await repository.save(JSON.parse(JSON.stringify(store.model)) as typeof store.model)
  }

  function schedule(): void {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => void save(), DEBOUNCE_MS)
  }

  function flush(): void {
    if (timer !== null) void save()
  }

  function onVisibilityChange(): void {
    if (document.visibilityState === "hidden") flush()
  }

  watch(
    () => store.model,
    () => {
      if (ready) schedule()
    },
    { deep: true },
  )

  onMounted(async () => {
    const saved = await repository.load()
    if (saved) store.setModel(saved)
    // Let the watch tick from setModel pass before arming, so it isn't re-saved.
    await nextTick()
    if (saved) options.onRestore?.()
    ready = true
    document.addEventListener("visibilitychange", onVisibilityChange)
    window.addEventListener("beforeunload", flush)
  })

  onBeforeUnmount(() => {
    document.removeEventListener("visibilitychange", onVisibilityChange)
    window.removeEventListener("beforeunload", flush)
    flush()
  })

  return { flush }
}
