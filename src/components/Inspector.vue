<script setup lang="ts">
/**
 * Inspector (phase 2, ADR-0004) — equips the *selected* element with the numbers
 * a simulation needs, so a Model becomes more than samples: a Stock gets its
 * initial value, a Flow/Converter its rule. Editing is deliberately small —
 * choose a rule from the fixed vocabulary and type one or two numbers; there is
 * no formula box, so the Model stays valid by construction.
 *
 * It reads selection from the shared Vue Flow instance (as GlossPanel does), then
 * resolves the *live* domain node from the store so edits round-trip through
 * undoable store actions. Operands for a rule are the element's inbound
 * Information Links picked by Polarity — set those by wiring, not here.
 */
import { useVueFlow } from "@vue-flow/core"
import { computed } from "vue"
import type { EdgeData } from "@/model/projection"
import type { ConverterNode, FlowNode, Rule, StockNode } from "@/model/types"
import { useModelStore } from "@/store/model"

const store = useModelStore()
const { getSelectedNodes, getSelectedEdges } = useVueFlow("meadows")

/** The single selected element's id — a node directly, or a Flow via its pipe edge. */
const selectedId = computed<string | null>(() => {
  const nodes = getSelectedNodes.value
  const edges = getSelectedEdges.value
  if (nodes.length === 1 && edges.length === 0) return nodes[0].id
  if (edges.length === 1 && nodes.length === 0) {
    const edge = edges[0]
    if ((edge.data as EdgeData | undefined)?.kind === "pipe") return edge.id.split("::")[0]
  }
  return null
})

/** The live, editable domain node behind the selection (Clouds are not editable). */
const element = computed<StockNode | FlowNode | ConverterNode | null>(() => {
  const id = selectedId.value
  if (!id) return null
  const node = store.model.nodes.find((n) => n.id === id)
  if (node?.kind === "stock" || node?.kind === "flow" || node?.kind === "converter") return node
  return null
})

const KIND_LABEL = { stock: "Stock", flow: "Flow", converter: "Converter" } as const

/** Every rule carries exactly one number (a value or a factor); read it uniformly. */
function ruleNumber(rule?: Rule): number {
  if (!rule) return 0
  return rule.kind === "constant" ? rule.value : rule.factor
}

function buildRule(kind: Rule["kind"], n: number): Rule {
  return kind === "constant" ? { kind, value: n } : { kind, factor: n }
}

function onInitial(event: Event): void {
  const el = element.value
  if (el?.kind !== "stock") return
  const raw = (event.target as HTMLInputElement).value.trim()
  if (raw === "") return store.setInitialValue(el.id, undefined)
  const n = Number(raw)
  if (Number.isFinite(n)) store.setInitialValue(el.id, n)
}

function onKind(event: Event): void {
  const el = element.value
  if (el?.kind !== "flow" && el?.kind !== "converter") return
  const kind = (event.target as HTMLSelectElement).value as Rule["kind"] | ""
  if (!kind) return
  // Carry the existing number across a kind change; default a fresh rule sensibly.
  const n = el.rule ? ruleNumber(el.rule) : kind === "constant" ? 0 : 1
  store.setRule(el.id, buildRule(kind, n))
}

function onParam(event: Event): void {
  const el = element.value
  if ((el?.kind !== "flow" && el?.kind !== "converter") || !el.rule) return
  const n = Number((event.target as HTMLInputElement).value)
  store.setRule(el.id, buildRule(el.rule.kind, Number.isFinite(n) ? n : 0))
}

/** One-line reminder of where a rule reads its operands (they come from links). */
const RULE_HINT: Record<Rule["kind"], string> = {
  constant: "A fixed number — no inputs.",
  proportional: "rate = factor × its “+” inputs.",
  gap: "rate = factor × (level − target): the “+” input is the level, the “−” the target.",
}
</script>

<template>
  <div
    v-if="element"
    class="absolute top-3 right-3 z-20 w-60 rounded-box border border-base-300 bg-base-100/95 p-3 shadow-md backdrop-blur"
  >
    <div class="flex items-baseline gap-2">
      <span class="text-sm font-semibold">{{ element.name }}</span>
      <span class="text-xs text-base-content/50">{{ KIND_LABEL[element.kind] }}</span>
    </div>

    <!-- Stock: the quantity it starts from. -->
    <label v-if="element.kind === 'stock'" class="mt-2 block">
      <span class="text-xs text-base-content/60">Initial value</span>
      <input
        type="number"
        class="input input-sm input-bordered mt-1 w-full"
        :value="element.initialValue ?? ''"
        placeholder="—"
        @change="onInitial"
      />
    </label>

    <!-- Flow / Converter: pick a rule, then its number. -->
    <template v-else>
      <label class="mt-2 block">
        <span class="text-xs text-base-content/60">Rule</span>
        <select
          class="select select-sm select-bordered mt-1 w-full"
          :value="element.rule?.kind ?? ''"
          @change="onKind"
        >
          <option value="" disabled>Choose a rule…</option>
          <option value="constant">Constant</option>
          <option value="proportional">Proportional</option>
          <option value="gap">Gap</option>
        </select>
      </label>

      <label v-if="element.rule" class="mt-2 block">
        <span class="text-xs text-base-content/60">
          {{ element.rule.kind === "constant" ? "Value" : "Factor" }}
        </span>
        <input
          type="number"
          step="any"
          class="input input-sm input-bordered mt-1 w-full"
          :value="ruleNumber(element.rule)"
          @change="onParam"
        />
      </label>

      <p v-if="element.rule" class="mt-2 text-xs leading-snug text-base-content/50">
        {{ RULE_HINT[element.rule.kind] }}
      </p>
    </template>
  </div>
</template>
