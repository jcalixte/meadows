<script setup lang="ts">
/**
 * A node's name with frictionless inline rename: double-click to edit, Enter or
 * blur to commit through the store, Escape to cancel. The `nodrag` class and
 * stopped pointer events keep Vue Flow from starting a drag while typing.
 *
 * While editing, an invisible sizer span (mirroring the draft text) holds the
 * box width and the input overlays it absolutely — so switching between display
 * and edit never reflows the node (no width jump on a Stock, no shifted circle
 * on a Converter).
 */
import { nextTick, ref } from "vue"
import { useModelStore } from "@/store/model"

const props = defineProps<{ nodeId: string; name: string }>()

const store = useModelStore()
const editing = ref(false)
const draft = ref("")
const input = ref<HTMLInputElement | null>(null)

async function begin(): Promise<void> {
  draft.value = props.name
  editing.value = true
  await nextTick()
  input.value?.focus()
  input.value?.select()
}

function commit(): void {
  if (!editing.value) return
  editing.value = false
  const trimmed = draft.value.trim()
  if (trimmed && trimmed !== props.name) store.renameNode(props.nodeId, trimmed)
}

function cancel(): void {
  editing.value = false
}
</script>

<template>
  <span class="relative inline-block min-w-[1.5ch] text-center text-sm font-medium">
    <template v-if="editing">
      <!-- Invisible sizer: defines the box width from the draft, so the input
           (absolutely positioned over it) matches the text it replaced. -->
      <span class="invisible whitespace-pre" aria-hidden="true">{{ draft || " " }}</span>
      <input
        ref="input"
        v-model="draft"
        class="nodrag absolute inset-0 w-full rounded bg-base-100 px-0 text-center text-sm font-medium outline-none ring-1 ring-primary"
        @blur="commit"
        @keydown.enter.prevent="commit"
        @keydown.esc.prevent="cancel"
        @pointerdown.stop
      />
    </template>
    <span v-else class="cursor-text whitespace-pre select-none" @dblclick.stop="begin">
      {{ name }}
    </span>
  </span>
</template>
