<script setup lang="ts">
/**
 * Editor (C1) — the Vue Flow canvas and chrome.
 *
 * The Model store is the source of truth; `nodes`/`edges` here are a derived
 * projection bound one-way into Vue Flow (ADR-0002). Vue Flow owns interaction
 * (pan/zoom/drag/select) on its internal copy; we translate the gestures we care
 * about back into store actions:
 *   - drag start → take an undo restore point
 *   - drag stop  → commit final positions
 *   - Delete/Backspace → remove selected nodes (Vue Flow's own delete is off, so
 *     it can't delete from its copy behind the Model's back)
 * After each store mutation the projection recomputes and Vue Flow reconciles by
 * id, so positions never fight.
 */
import { Background } from "@vue-flow/background"
import { Controls } from "@vue-flow/controls"
import {
  type Connection,
  ErrorCode,
  isErrorOfType,
  type OnConnectStartParams,
  useVueFlow,
  VueFlow,
  type XYPosition,
} from "@vue-flow/core"
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from "vue"
import { useAutosave } from "@/composables/useAutosave"
import { parseModel, serializeModel } from "@/model/io"
import { project } from "@/model/projection"
import { type Sample, SAMPLES } from "@/model/samples"
import { canConnect } from "@/model/validation"
import { useModelStore } from "@/store/model"
import { NODE_DND_MIME, type PlaceableKind } from "./palette-dnd"
import GlossPanel from "./GlossPanel.vue"
import LoopOverlay from "./LoopOverlay.vue"
import Palette from "./Palette.vue"
import InfoLinkEdge from "./edges/InfoLinkEdge.vue"
import CloudNode from "./nodes/CloudNode.vue"
import ConverterNode from "./nodes/ConverterNode.vue"
import FlowNode from "./nodes/FlowNode.vue"
import StockNode from "./nodes/StockNode.vue"

const store = useModelStore()

const graph = computed(() => project(store.model))
const nodes = computed(() => graph.value.nodes)
const edges = computed(() => graph.value.edges)

// Explicit shared id: useVueFlow() runs here in the parent setup, before
// <VueFlow> mounts. Pinning both to the same id guarantees they resolve to one
// store instance, so the event hooks below actually fire.
const {
  onNodeDragStart,
  onNodeDragStop,
  onConnect,
  onConnectStart,
  onConnectEnd,
  onError,
  onNodesInitialized,
  getSelectedNodes,
  getSelectedEdges,
  viewport,
  vueFlowRef,
  fitView,
} = useVueFlow("meadows")

// Restore the last document on mount and persist every change (F7). Fit the
// view once a restored model has re-projected so it lands framed.
useAutosave({ onRestore: () => fitView({ padding: 0.2 }) })

// Fit the view after a *load* (sample/import), once the freshly projected nodes
// have been measured. Vue Flow measures node dimensions a frame after they mount,
// so calling fitView straight after setModel fits to 0×0 boxes and the model
// lands jammed in the top-left; onNodesInitialized fires post-measure, so framing
// is correct. A one-shot flag keeps it scoped to loads (not every re-init).
let fitAfterInit = false
onNodesInitialized(() => {
  if (!fitAfterInit) return
  fitAfterInit = false
  fitView({ padding: 0.2 })
})

onNodeDragStart(() => store.beginInteraction())
onNodeDragStop(({ nodes: dragged }) => {
  for (const node of dragged) store.moveNode(node.id, node.position)
})

// Vue Flow measures the pane synchronously in its own onMounted, before the
// browser has flushed first layout, so the initial read is 0×0 and it emits a
// benign MISSING_VIEWPORT_DIMENSIONS error (it falls back to 500×500, then its
// ResizeObserver corrects to the real size next frame). Swallow only that one;
// registering any handler suppresses Vue Flow's default console.warn, so log
// every other error to keep genuine problems visible.
onError((err) => {
  if (isErrorOfType(err, ErrorCode.MISSING_VIEWPORT_DIMENSIONS)) return
  console.warn(err.message)
})

// --- Connecting (F2) ---
// Refuse invalid drops mid-gesture so the structure stays valid (F4, "guide,
// don't nag"). The same guard backs store.connect as defence in depth.
//
// Vue Flow runs this guard for BOTH live gestures and the edges we project. The
// projected pipe/link edges arrive as full edges (with an `id`) and are valid by
// construction — the store guards every mutation — whereas a live gesture is a
// handle-less Connection. We must only guard the gesture: the derived pipe-out
// edge is valve→stock, which is invalid *as a gesture* but a real rendered edge,
// so validating projected edges would drop every pipe-out (Vue Flow EDGE_INVALID).
function isValidConnection(connection: Connection): boolean {
  if ("id" in connection) return true
  return canConnect(store.model, connection.source, connection.target)
}

// Remember the drag's source so releasing on empty canvas can open onto a Cloud.
let connectSource: string | null = null
let connectionMade = false

onConnectStart((params: OnConnectStartParams) => {
  connectSource = params.handleType === "source" ? (params.nodeId ?? null) : null
  connectionMade = false
})

onConnect((connection) => {
  connectionMade = true
  store.connect(connection.source, connection.target)
})

onConnectEnd((event) => {
  if (!connectionMade && connectSource && event) {
    const point = pointerPosition(event)
    if (point) store.connectToNewCloud(connectSource, screenToFlow(point.x, point.y))
  }
  connectSource = null
})

/** clientX/clientY from a mouse or touch end event. */
function pointerPosition(event: MouseEvent | TouchEvent): { x: number; y: number } | null {
  if ("clientX" in event) return { x: event.clientX, y: event.clientY }
  const touch = event.changedTouches[0]
  return touch ? { x: touch.clientX, y: touch.clientY } : null
}

/** Convert a screen point (clientX/clientY) to graph coordinates. */
function screenToFlow(clientX: number, clientY: number): XYPosition {
  const rect = vueFlowRef.value?.getBoundingClientRect()
  const { x, y, zoom } = viewport.value
  return {
    x: (clientX - (rect?.left ?? 0) - x) / zoom,
    y: (clientY - (rect?.top ?? 0) - y) / zoom,
  }
}

/** Drop a node so its top-left lands roughly centred on the given graph point. */
function placeNode(kind: PlaceableKind, at: XYPosition): void {
  const position = { x: at.x - 48, y: at.y - 24 }
  if (kind === "stock") store.addStock(position)
  else store.addConverter(position)
}

/** Click-to-add: drop at the visible pane centre, cascaded so clicks don't stack. */
function addNode(kind: PlaceableKind): void {
  const rect = vueFlowRef.value?.getBoundingClientRect()
  const centre = screenToFlow(
    (rect?.left ?? 0) + (rect?.width ?? 800) / 2,
    (rect?.top ?? 0) + (rect?.height ?? 600) / 2,
  )
  const step = (store.model.nodes.length % 8) * 22
  placeNode(kind, { x: centre.x + step, y: centre.y + step })
}

/** Drag-to-add: drop where the chip is released. */
function onDrop(event: DragEvent): void {
  event.preventDefault()
  const kind = event.dataTransfer?.getData(NODE_DND_MIME)
  if (kind !== "stock" && kind !== "converter") return
  placeNode(kind, screenToFlow(event.clientX, event.clientY))
}

function onDragOver(event: DragEvent): void {
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy"
}

/**
 * Load a sample Model (G4, the instructive goal). `setModel` replaces the whole
 * document and clears undo history, so guard real work behind a confirm — but
 * stay frictionless on the empty starting canvas. Fit the view once the
 * projection has re-derived so the loaded model lands framed.
 */
function loadSample(sample: Sample): void {
  if (store.nodeCount > 0 && !window.confirm(`Replace the current model with “${sample.title}”?`)) {
    return
  }
  fitAfterInit = true
  store.setModel(sample.build())
  // Close the DaisyUI dropdown (it stays open while the trigger keeps focus).
  ;(document.activeElement as HTMLElement | null)?.blur()
}

const fileInput = useTemplateRef<HTMLInputElement>("fileInput")

/** A filesystem-safe stem from the model name, e.g. "Coffee cooling" → "coffee-cooling". */
function fileStem(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || "model"
}

/** Export the current Model as versioned JSON download (F8). */
function exportModel(): void {
  const blob = new Blob([serializeModel(store.model)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `${fileStem(store.model.name)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

/** Import a Model from a JSON file: validate, confirm a destructive replace, load (F8). */
async function onImportFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // Reset first so picking the same file again still fires `change`.
  input.value = ""
  if (!file) return

  const result = parseModel(await file.text())
  if (!result.ok) {
    window.alert(`Couldn't import “${file.name}”: ${result.error}`)
    return
  }
  // Importing replaces the document and clears undo (T6 / F10×F7), so guard real work.
  if (
    store.nodeCount > 0 &&
    !window.confirm(`Replace the current model with “${result.model.name}”?`)
  ) {
    return
  }
  fitAfterInit = true
  store.setModel(result.model)
}

function isTextEntry(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return el?.tagName === "INPUT" || el?.tagName === "TEXTAREA" || el?.isContentEditable === true
}

function onKeydown(event: KeyboardEvent): void {
  if (isTextEntry(event.target)) return

  const mod = event.metaKey || event.ctrlKey
  if (mod && event.key.toLowerCase() === "z") {
    event.preventDefault()
    if (event.shiftKey) store.redo()
    else store.undo()
    return
  }

  if (event.key === "Delete" || event.key === "Backspace") {
    const nodeIds = getSelectedNodes.value.map((node) => node.id)
    // Edges are projected, not stored: a "pipe" edge stands in for its Flow node
    // (id is `${flowId}::in|out`), an "info" edge is the Information Link itself.
    const flowIds = new Set<string>()
    const linkIds = new Set<string>()
    for (const edge of getSelectedEdges.value) {
      if (edge.data?.kind === "pipe") flowIds.add(edge.id.split("::")[0])
      else if (edge.data?.kind === "info") linkIds.add(edge.id)
    }

    if (nodeIds.length === 0 && flowIds.size === 0 && linkIds.size === 0) return
    event.preventDefault()
    for (const id of nodeIds) store.removeNode(id)
    for (const id of flowIds) store.removeNode(id)
    for (const id of linkIds) store.removeInfoLink(id)
  }
}

onMounted(() => window.addEventListener("keydown", onKeydown))
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown))
</script>

<template>
  <div class="flex h-screen flex-col bg-base-200">
    <header class="flex items-center gap-3 border-b border-base-300 bg-base-100 px-4 py-2">
      <img src="/favicon.svg" alt="" class="size-6" />
      <h1 class="text-lg font-semibold">meadows</h1>
      <span class="text-sm text-base-content/50">
        {{ store.nodeCount }} {{ store.nodeCount === 1 ? "element" : "elements" }}
      </span>
      <div class="ml-auto flex items-center gap-1">
        <div class="dropdown dropdown-end">
          <button tabindex="0" class="btn btn-ghost btn-sm">Samples</button>
          <ul
            tabindex="0"
            class="dropdown-content menu z-10 mt-1 w-72 gap-1 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
          >
            <li v-for="sample in SAMPLES" :key="sample.title">
              <button class="flex flex-col items-start gap-0.5" @click="loadSample(sample)">
                <span class="font-medium">{{ sample.title }}</span>
                <span class="text-xs text-base-content/60">{{ sample.blurb }}</span>
              </button>
            </li>
          </ul>
        </div>
        <button class="btn btn-ghost btn-sm" @click="exportModel">Export</button>
        <button class="btn btn-ghost btn-sm" @click="fileInput?.click()">Import</button>
        <input
          ref="fileInput"
          type="file"
          accept="application/json,.json"
          class="hidden"
          @change="onImportFile"
        />
        <button class="btn btn-ghost btn-sm" :disabled="!store.canUndo" @click="store.undo()">
          Undo
        </button>
        <button class="btn btn-ghost btn-sm" :disabled="!store.canRedo" @click="store.redo()">
          Redo
        </button>
      </div>
    </header>

    <div class="relative min-h-0 flex-1" @drop="onDrop" @dragover="onDragOver">
      <VueFlow
        id="meadows"
        :nodes="nodes"
        :edges="edges"
        :delete-key-code="null"
        :is-valid-connection="isValidConnection"
        :connection-radius="30"
        :min-zoom="0.2"
        :max-zoom="4"
        class="size-full"
      >
        <Background :gap="20" pattern-color="#d1d5db" />
        <Controls position="bottom-left" :show-interactive="false" />

        <template #node-stock="nodeProps">
          <StockNode v-bind="nodeProps" />
        </template>
        <template #node-converter="nodeProps">
          <ConverterNode v-bind="nodeProps" />
        </template>
        <template #node-flow="nodeProps">
          <FlowNode v-bind="nodeProps" />
        </template>
        <template #node-cloud="nodeProps">
          <CloudNode v-bind="nodeProps" />
        </template>

        <template #edge-info="edgeProps">
          <InfoLinkEdge v-bind="edgeProps" />
        </template>
      </VueFlow>

      <!-- Chrome lives at this level, above the badge overlay: Vue Flow's pane is a
           z-index:0 stacking context, so a Panel inside it would be painted under
           the screen-space R/B badges (which sit on the canvas, over loop centres). -->
      <Palette class="absolute top-3 left-3 z-20" @add="addNode" />
      <LoopOverlay />
      <GlossPanel />
    </div>
  </div>
</template>
