<script setup lang="ts">
/**
 * Stock — the accumulation. Drawn as a rectangle, the classic stock-and-flow
 * symbol for the one stateful element. A target handle (left) and source handle
 * (right) let Flows attach and Information Links leave.
 */
import { Handle, type NodeProps, Position } from "@vue-flow/core"
import { computed } from "vue"
import { useNodeLoopRing } from "@/composables/useLoopHighlight"
import { HANDLE_IN, HANDLE_OUT, type NodeData } from "@/model/projection"
import type { StockNode } from "@/model/types"
import { useSimulationStore } from "@/store/simulation"
import { formatValue } from "./format"
import NodeLabel from "./NodeLabel.vue"

const props = defineProps<NodeProps<NodeData>>()

// The projection guarantees a stock-typed node here.
const stock = computed(() => props.data.node as StockNode)
const loopRing = useNodeLoopRing(props.id)

// Live simulation value at the playhead (null when no run is engaged). A Stock is
// the system's memory, so it also shows a fill gauge — its level over its peak.
const sim = useSimulationStore()
const value = computed(() => sim.valueAt(props.id))
const fill = computed(() => sim.fill(props.id))
</script>

<template>
  <div
    class="relative min-w-24 rounded-md border-2 bg-base-100 px-4 py-3 text-center shadow-sm transition-colors"
    :class="[props.selected ? 'border-primary' : 'border-base-300', loopRing]"
  >
    <!-- Fill gauge: a bottom-anchored bar, behind the label, inset within the border. -->
    <div
      v-if="value !== null"
      class="pointer-events-none absolute inset-[2px] z-0 flex flex-col justify-end"
    >
      <div
        class="rounded-b bg-primary/15 transition-[height]"
        :style="{ height: fill * 100 + '%' }"
      />
    </div>
    <Handle :id="HANDLE_IN" type="target" :position="Position.Left" />
    <div class="relative z-10">
      <NodeLabel :node-id="props.id" :name="stock.name" />
      <div v-if="value !== null" class="mt-0.5 font-mono text-xs tabular-nums text-base-content/70">
        {{ formatValue(value) }}
      </div>
    </div>
    <Handle :id="HANDLE_OUT" type="source" :position="Position.Right" />
  </div>
</template>
