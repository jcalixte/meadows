<script setup lang="ts">
/**
 * Converter — a stateless helper value. Drawn as a circle, the classic
 * auxiliary/converter symbol, with its name beneath. Handles let Information
 * Links arrive (target) and leave (source).
 */
import { Handle, type NodeProps, Position } from "@vue-flow/core"
import { computed } from "vue"
import { useNodeLoopRing } from "@/composables/useLoopHighlight"
import { HANDLE_IN, HANDLE_OUT, type NodeData } from "@/model/projection"
import type { ConverterNode } from "@/model/types"
import { useSimulationStore } from "@/store/simulation"
import { formatValue } from "./format"
import NodeLabel from "./NodeLabel.vue"

const props = defineProps<NodeProps<NodeData>>()

// The projection guarantees a converter-typed node here.
const converter = computed(() => props.data.node as ConverterNode)
const loopRing = useNodeLoopRing(props.id)

const sim = useSimulationStore()
const value = computed(() => sim.valueAt(props.id))
</script>

<template>
  <div class="flex flex-col items-center gap-1">
    <div
      class="relative size-12 rounded-full border-2 bg-base-100 shadow-sm transition-colors"
      :class="[props.selected ? 'border-primary' : 'border-base-300', loopRing]"
    >
      <Handle :id="HANDLE_IN" type="target" :position="Position.Left" />
      <span
        v-if="value !== null"
        class="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-xs tabular-nums text-base-content/70"
      >
        {{ formatValue(value) }}
      </span>
      <Handle :id="HANDLE_OUT" type="source" :position="Position.Right" />
    </div>
    <NodeLabel :node-id="props.id" :name="converter.name" />
  </div>
</template>
