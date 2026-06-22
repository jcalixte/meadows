<script setup lang="ts">
/**
 * Sample browser — a modal gallery of the curated example models, laid out as a
 * card grid sectioned by pedagogical tier (Primer → … → Mechanics & capstone).
 * As the gallery grows this beats the old narrow dropdown: the whole set stays
 * scannable in one scroll and the tiers show how the samples relate.
 *
 * Presentational only — it never touches the Model store. Picking a card emits
 * `select`; the Editor owns the confirm/replace/fit logic (one place for it).
 * Built on the native <dialog> so Esc, the backdrop click and focus-trapping come
 * for free; `open` drives showModal()/close() and the native close event keeps the
 * parent's state in sync.
 */
import { computed, useTemplateRef, watch } from "vue"
import { type Sample, SAMPLE_CATEGORIES, SAMPLES } from "@/model/samples"

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ "update:open": [boolean]; select: [Sample] }>()

const dialog = useTemplateRef<HTMLDialogElement>("dialog")

// Mirror the `open` prop onto the native dialog (showModal gives us the focus trap
// and inert backdrop a plain div can't).
watch(
  () => props.open,
  (open) => {
    const el = dialog.value
    if (!el) return
    if (open && !el.open) el.showModal()
    else if (!open && el.open) el.close()
  },
)

// Fired by Esc, the backdrop form, the ✕, or our own close() — fold them all into
// one update:open so the parent's state can't drift from the dialog's.
function onClose(): void {
  if (props.open) emit("update:open", false)
}

// The categories in display order, each with its samples (SAMPLES is already in
// pedagogical order, so first-appearance order is preserved). Empty tiers drop out.
const sections = computed(() =>
  SAMPLE_CATEGORIES.map((category) => ({
    category,
    samples: SAMPLES.filter((sample) => sample.category === category),
  })).filter((section) => section.samples.length > 0),
)
</script>

<template>
  <dialog ref="dialog" class="modal" @close="onClose">
    <div class="modal-box w-11/12 max-w-3xl">
      <div class="mb-4 flex items-center gap-2">
        <h3 class="text-base font-semibold">Browse samples</h3>
        <span class="text-xs text-base-content/50">{{ SAMPLES.length }} models</span>
        <form method="dialog" class="ml-auto">
          <button class="btn btn-circle btn-ghost btn-sm" aria-label="Close">✕</button>
        </form>
      </div>

      <section v-for="section in sections" :key="section.category" class="mb-5 last:mb-0">
        <h4 class="mb-2 text-xs font-semibold tracking-wide text-base-content/50 uppercase">
          {{ section.category }}
        </h4>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            v-for="sample in section.samples"
            :key="sample.title"
            type="button"
            class="flex flex-col gap-1 rounded-box border border-base-300 bg-base-100 p-3 text-left transition hover:border-primary hover:shadow-md"
            @click="emit('select', sample)"
          >
            <span class="font-medium">{{ sample.title }}</span>
            <span class="text-xs text-base-content/60">{{ sample.blurb }}</span>
          </button>
        </div>
      </section>
    </div>

    <!-- Click outside the box to dismiss (submits the dialog → fires @close). -->
    <form method="dialog" class="modal-backdrop">
      <button aria-label="Close">close</button>
    </form>
  </dialog>
</template>
