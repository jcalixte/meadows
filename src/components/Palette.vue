<script setup lang="ts">
/**
 * Palette (C12) — place a node either way (F1, "1 click/drag"): click to drop at
 * the viewport centre, or drag a chip onto the canvas to drop where you release.
 * The Editor owns placement; this just signals the kind (via event on click, via
 * dataTransfer on drag). Flows aren't placed here — they're drawn by connecting
 * two nodes (F2, next).
 */
import { NODE_GLOSSARY } from "@/model/glossary"
import { NODE_DND_MIME, type PlaceableKind } from "./palette-dnd"

const emit = defineEmits<{ add: [kind: PlaceableKind] }>()

function onDragStart(event: DragEvent, kind: PlaceableKind): void {
  if (!event.dataTransfer) return
  event.dataTransfer.setData(NODE_DND_MIME, kind)
  event.dataTransfer.effectAllowed = "copy"
}
</script>

<template>
  <div
    class="flex flex-col gap-1 rounded-box border border-base-300 bg-base-100/90 p-2 shadow-md backdrop-blur"
  >
    <span
      class="px-2 pt-1 pb-0.5 text-xs font-semibold tracking-wide text-base-content/50 uppercase"
    >
      Add
    </span>
    <button
      class="btn btn-ghost btn-sm tooltip tooltip-right cursor-grab justify-start gap-2 active:cursor-grabbing"
      draggable="true"
      :data-tip="NODE_GLOSSARY.stock.short"
      :aria-label="`Stock — ${NODE_GLOSSARY.stock.short}`"
      @click="emit('add', 'stock')"
      @dragstart="onDragStart($event, 'stock')"
    >
      <span class="inline-block size-3.5 rounded-sm border-2 border-current" />
      Stock
    </button>
    <button
      class="btn btn-ghost btn-sm tooltip tooltip-right cursor-grab justify-start gap-2 active:cursor-grabbing"
      draggable="true"
      :data-tip="NODE_GLOSSARY.converter.short"
      :aria-label="`Converter — ${NODE_GLOSSARY.converter.short}`"
      @click="emit('add', 'converter')"
      @dragstart="onDragStart($event, 'converter')"
    >
      <span class="inline-block size-3.5 rounded-full border-2 border-current" />
      Converter
    </button>
  </div>
</template>
