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
import NodeLabel from "./NodeLabel.vue"

const props = defineProps<NodeProps<NodeData>>()

// The projection guarantees a stock-typed node here.
const stock = computed(() => props.data.node as StockNode)
const loopRing = useNodeLoopRing(props.id)
</script>

<template>
  <div
    class="min-w-24 rounded-md border-2 bg-base-100 px-4 py-3 text-center shadow-sm transition-colors"
    :class="[props.selected ? 'border-primary' : 'border-base-300', loopRing]"
  >
    <Handle :id="HANDLE_IN" type="target" :position="Position.Left" />
    <NodeLabel :node-id="props.id" :name="stock.name" />
    <Handle :id="HANDLE_OUT" type="source" :position="Position.Right" />
  </div>
</template>
