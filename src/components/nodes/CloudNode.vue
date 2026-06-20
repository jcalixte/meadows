<script setup lang="ts">
/**
 * Cloud — the model boundary (Source/Sink) on an open Flow end. Auto-materialised
 * (ADR-0003), never placed by hand, carries no name. Drawn as the conventional
 * cloud symbol, with handles so a Flow can terminate on it either way.
 */
import { Handle, type NodeProps, Position } from "@vue-flow/core"
import { HANDLE_IN, HANDLE_OUT, type NodeData } from "@/model/projection"

defineProps<NodeProps<NodeData>>()
</script>

<template>
  <div class="relative">
    <Handle :id="HANDLE_IN" type="target" :position="Position.Left" />
    <svg
      viewBox="0 0 24 24"
      class="size-9 text-base-content/40"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M6.5 19a4.5 4.5 0 0 1 0-9 5.5 5.5 0 0 1 10.5-1.5 4 4 0 0 1 1 7.9" />
    </svg>
    <Handle :id="HANDLE_OUT" type="source" :position="Position.Right" />
  </div>
</template>
