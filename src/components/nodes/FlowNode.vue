<script setup lang="ts">
/**
 * Flow — a rate, drawn as the valve (an outlined bowtie/butterfly) sitting on
 * the pipe between source and target. The pipe segments are projected edges
 * (ADR-0003); this node is the valve and its name. Outlined (not filled) so it
 * reads as a tap rather than two arrows. Handles sit on the valve so the pipe
 * connects through it and Information Links can target/leave the rate.
 */
import { Handle, type NodeProps, Position } from "@vue-flow/core"
import { computed } from "vue"
import { useNodeLoopRing } from "@/composables/useLoopHighlight"
import { HANDLE_IN, HANDLE_OUT, type NodeData } from "@/model/projection"
import type { FlowNode } from "@/model/types"
import NodeLabel from "./NodeLabel.vue"

const props = defineProps<NodeProps<NodeData>>()

// The projection guarantees a flow-typed node here.
const flow = computed(() => props.data.node as FlowNode)
const loopRing = useNodeLoopRing(props.id)
</script>

<template>
  <div class="flex flex-col items-center gap-1">
    <div class="relative rounded-full" :class="loopRing">
      <Handle :id="HANDLE_IN" type="target" :position="Position.Left" />
      <svg
        viewBox="0 0 24 24"
        class="size-7 transition-colors"
        :class="props.selected ? 'text-primary' : 'text-base-content/60'"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linejoin="round"
      >
        <!-- Outlined bowtie valve: two hollow triangles meeting at the centre. -->
        <path d="M3 5 L12 12 L3 19 Z" />
        <path d="M21 5 L12 12 L21 19 Z" />
      </svg>
      <Handle :id="HANDLE_OUT" type="source" :position="Position.Right" />
    </div>
    <NodeLabel :node-id="props.id" :name="flow.name" />
  </div>
</template>
