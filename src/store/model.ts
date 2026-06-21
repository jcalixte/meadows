/**
 * Model store (C5) — the live home of the source-of-truth Model plus undo/redo.
 *
 * Every structural write goes through an action here; the Vue Flow view is a
 * projection downstream (ADR-0002). Undo is snapshot-based (T5): we deep-clone
 * the whole Model onto a bounded history stack before each change. Models are
 * small and the data is plain, so cloning is cheap and always correct — no
 * command objects to keep in sync.
 *
 * Drags are a special case: positions change many times per gesture, so the
 * restore point is taken once on drag start (`beginInteraction`) and the
 * position writes during/after the drag don't record history.
 */
import { defineStore } from "pinia"
import { computed, ref } from "vue"
import {
  emptyModel,
  makeCloud,
  makeConverter,
  makeFlow,
  makeStock,
  midpoint,
  newId,
  nextName,
} from "@/model/factory"
import { detectLoops } from "@/model/loops"
import type {
  ConverterNode,
  Model,
  ModelNode,
  Position,
  Rule,
  SimSpec,
  StockNode,
} from "@/model/types"
import { canConnect, intentFor } from "@/model/validation"

/** Ring-buffer depth for undo (F9 target: ≥50 steps). */
const HISTORY_LIMIT = 50

export const useModelStore = defineStore("model", () => {
  const model = ref<Model>(emptyModel())
  const past = ref<Model[]>([])
  const future = ref<Model[]>([])

  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)
  const nodeCount = computed(() => model.value.nodes.length)

  // Feedback loops are derived from the wiring, never stored (ADR-0001). This
  // re-runs only on *structural* change: detectLoops reads ids/kinds/links, not
  // positions, so Vue's per-property reactivity skips it during node drags (F5).
  const detected = computed(() => detectLoops(model.value))
  const loops = computed(() => detected.value.loops)
  const loopsCapped = computed(() => detected.value.capped)

  function snapshot(): Model {
    // Plain, deep, proxy-immune clone. JSON is safe here precisely because the
    // Model is contractually JSON-serialisable (F8); structuredClone would choke
    // on Vue reactive proxies that array reassignments leave nested in the state.
    return JSON.parse(JSON.stringify(model.value)) as Model
  }

  /** Push a restore point before a mutation and drop the redo branch. */
  function record(): void {
    past.value.push(snapshot())
    if (past.value.length > HISTORY_LIMIT) past.value.shift()
    future.value = []
  }

  function findNode(id: string): ModelNode | undefined {
    return model.value.nodes.find((node) => node.id === id)
  }

  function addStock(position: Position): StockNode {
    record()
    const node = makeStock(position, nextName(model.value.nodes, "stock"))
    model.value.nodes.push(node)
    return node
  }

  function addConverter(position: Position): ConverterNode {
    record()
    const node = makeConverter(position, nextName(model.value.nodes, "converter"))
    model.value.nodes.push(node)
    return node
  }

  /** Take the undo restore point at the start of a drag gesture. */
  function beginInteraction(): void {
    record()
  }

  /** Commit a node's new position. No history — the drag already recorded one. */
  function moveNode(id: string, position: Position): void {
    const node = findNode(id)
    if (node) node.position = { ...position }
  }

  function renameNode(id: string, name: string): void {
    const node = findNode(id)
    if (!node || node.kind === "cloud") return
    record()
    node.name = name
  }

  /**
   * Set (or clear) a Stock's initial value — the quantity the simulator starts
   * from (ADR-0004). `undefined` un-equips it, sending the Model back to "not yet
   * simulatable". No-op when unchanged, so a blur with no edit doesn't burn undo.
   */
  function setInitialValue(id: string, value: number | undefined): void {
    const node = findNode(id)
    if (!node || node.kind !== "stock" || node.initialValue === value) return
    record()
    if (value === undefined) delete node.initialValue
    else node.initialValue = value
  }

  /** Set (or clear) a Stock's display unit (e.g. "°C"). Empty clears it. No-op when unchanged. */
  function setUnit(id: string, unit: string): void {
    const node = findNode(id)
    if (!node || node.kind !== "stock") return
    const next = unit.trim() || undefined
    if (node.unit === next) return
    record()
    if (next === undefined) delete node.unit
    else node.unit = next
  }

  /**
   * Set (or clear) the free-text description on a named node or an Information
   * Link — the "why this element exists" note surfaced on selection. Empty
   * clears it; no-op when unchanged, so a blur with no edit doesn't burn undo.
   */
  function setDescription(id: string, text: string): void {
    const next = text.trim() || undefined
    const node = findNode(id)
    if (node && node.kind !== "cloud") {
      if (node.description === next) return
      record()
      if (next === undefined) delete node.description
      else node.description = next
      return
    }
    const link = model.value.infoLinks.find((l) => l.id === id)
    if (!link || link.description === next) return
    record()
    if (next === undefined) delete link.description
    else link.description = next
  }

  /**
   * Set (or clear) how a Flow's rate or a Converter's value is computed (ADR-0004:
   * one of the fixed rules, never a formula). No-op when unchanged.
   */
  function setRule(id: string, rule: Rule | undefined): void {
    const node = findNode(id)
    if (!node || (node.kind !== "flow" && node.kind !== "converter")) return
    if (JSON.stringify(node.rule) === JSON.stringify(rule)) return
    record()
    if (rule === undefined) delete node.rule
    else node.rule = rule
  }

  /** Set the run parameters (start / stop / dt). No-op when unchanged. */
  function setSimSpec(spec: SimSpec): void {
    const current = model.value.sim
    if (
      current &&
      current.start === spec.start &&
      current.stop === spec.stop &&
      current.dt === spec.dt
    ) {
      return
    }
    record()
    model.value.sim = spec
  }

  /**
   * Create whatever source→target means under the structure guard: an
   * Information Link (default `+` polarity, F6) onto a Flow/Converter, or a Flow
   * node (valve at the midpoint) between two Stocks/Clouds. Invalid or duplicate
   * connections are silently ignored — the gesture is also guarded upstream.
   */
  function connect(sourceId: string, targetId: string): void {
    const source = findNode(sourceId)
    const target = findNode(targetId)
    if (!source || !target || !canConnect(model.value, sourceId, targetId)) return

    const intent = intentFor(source, target)
    record()
    if (intent === "info") {
      model.value.infoLinks.push({
        id: newId("link"),
        source: sourceId,
        target: targetId,
        polarity: "+",
      })
    } else if (intent === "flow") {
      const name = nextName(model.value.nodes, "flow")
      const position = midpoint(source.position, target.position)
      model.value.nodes.push(makeFlow(position, name, sourceId, targetId))
    }
  }

  /**
   * Open-ended Flow: drop a Stock's connection on empty canvas to spawn a Sink
   * Cloud there and a Flow into it (ADR-0003). Only Stocks originate boundary
   * flows for now; other sources are ignored.
   */
  function connectToNewCloud(sourceId: string, dropPosition: Position): void {
    const source = findNode(sourceId)
    if (!source || source.kind !== "stock") return
    record()
    const cloud = makeCloud({ x: dropPosition.x - 18, y: dropPosition.y - 18 })
    const name = nextName(model.value.nodes, "flow")
    model.value.nodes.push(cloud)
    model.value.nodes.push(
      makeFlow(midpoint(source.position, cloud.position), name, sourceId, cloud.id),
    )
  }

  /**
   * Remove a node and everything that would otherwise dangle: Flow nodes that
   * reference it as an end, Information Links touching any removed node, and then
   * any Cloud left unreferenced (a Cloud exists only to bound a Flow, ADR-0003).
   */
  function removeNode(id: string): void {
    record()
    const removed = new Set<string>([id])
    for (const node of model.value.nodes) {
      if (node.kind === "flow" && (node.source === id || node.target === id)) removed.add(node.id)
    }
    model.value.nodes = model.value.nodes.filter((node) => !removed.has(node.id))
    model.value.infoLinks = model.value.infoLinks.filter(
      (link) => !removed.has(link.source) && !removed.has(link.target),
    )
    pruneClouds()
  }

  /**
   * Flip an Information Link's polarity (F6). Polarity is captured on create
   * (default `+`) and toggled in one click on the edge badge; it is the loop
   * detector's only structural input (ADR-0001), so each flip is a real,
   * undoable model change.
   */
  function toggleLinkPolarity(id: string): void {
    const link = model.value.infoLinks.find((l) => l.id === id)
    if (!link) return
    record()
    link.polarity = link.polarity === "+" ? "-" : "+"
  }

  /**
   * Remove a single Information Link by id. Links are edges in the projection,
   * not nodes, so they need their own delete path (selecting a link and pressing
   * Delete). No cascade: a link touches nothing that depends on it.
   */
  function removeInfoLink(id: string): void {
    if (!model.value.infoLinks.some((link) => link.id === id)) return
    record()
    model.value.infoLinks = model.value.infoLinks.filter((link) => link.id !== id)
  }

  /** Drop Clouds no longer referenced by any Flow. */
  function pruneClouds(): void {
    const referenced = new Set<string>()
    for (const node of model.value.nodes) {
      if (node.kind === "flow") {
        referenced.add(node.source)
        referenced.add(node.target)
      }
    }
    model.value.nodes = model.value.nodes.filter(
      (node) => node.kind !== "cloud" || referenced.has(node.id),
    )
  }

  /** Replace the whole document (load / import / new). Clears history. */
  function setModel(next: Model): void {
    model.value = next
    past.value = []
    future.value = []
  }

  function undo(): void {
    if (!canUndo.value) return
    future.value.push(snapshot())
    model.value = past.value.pop() as Model
  }

  function redo(): void {
    if (!canRedo.value) return
    past.value.push(snapshot())
    model.value = future.value.pop() as Model
  }

  return {
    model,
    canUndo,
    canRedo,
    nodeCount,
    loops,
    loopsCapped,
    addStock,
    addConverter,
    connect,
    connectToNewCloud,
    beginInteraction,
    moveNode,
    renameNode,
    setInitialValue,
    setUnit,
    setDescription,
    setRule,
    setSimSpec,
    removeNode,
    removeInfoLink,
    toggleLinkPolarity,
    setModel,
    undo,
    redo,
  }
})
