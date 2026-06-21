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
import type { ConverterNode, FlowNode, InformationLink, Rule, StockNode } from "@/model/types"
import { useModelStore } from "@/store/model"

const store = useModelStore()
const { getSelectedNodes, getSelectedEdges } = useVueFlow("meadows")

/**
 * The single selected element's id — a node directly, a Flow via its pipe edge,
 * or an Information Link via its info edge (the edge id *is* the link id).
 */
const selectedId = computed<string | null>(() => {
  const nodes = getSelectedNodes.value
  const edges = getSelectedEdges.value
  if (nodes.length === 1 && edges.length === 0) return nodes[0].id
  if (edges.length === 1 && nodes.length === 0) {
    const edge = edges[0]
    const kind = (edge.data as EdgeData | undefined)?.kind
    if (kind === "pipe") return edge.id.split("::")[0]
    if (kind === "info") return edge.id
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

/** The live Information Link behind the selection, when a link (not a node) is selected. */
const link = computed<InformationLink | null>(() => {
  const id = selectedId.value
  if (!id) return null
  return store.model.infoLinks.find((l) => l.id === id) ?? null
})

const KIND_LABEL = { stock: "Stock", flow: "Flow", converter: "Converter" } as const

/** A link's endpoints are always named nodes — it never touches a Cloud (validation.ts). */
function nodeName(id: string): string {
  const node = store.model.nodes.find((n) => n.id === id)
  return node && "name" in node ? node.name : ""
}

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

function onUnit(event: Event): void {
  const el = element.value
  if (el?.kind !== "stock") return
  store.setUnit(el.id, (event.target as HTMLInputElement).value)
}

/** Write the description for whichever element (node or link) is selected. */
function onDescription(event: Event): void {
  const id = element.value?.id ?? link.value?.id
  if (!id) return
  store.setDescription(id, (event.target as HTMLTextAreaElement).value)
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
  overflow:
    "rate = max(0, factor × (level − threshold)): spills only once the “+” level passes the “−” threshold.",
}
</script>

<template>
  <div
    v-if="element || link"
    class="absolute top-3 right-3 z-20 w-60 rounded-box border border-base-300 bg-base-100/95 p-3 shadow-md backdrop-blur"
  >
    <!-- A named node: Stock (value + unit) or Flow/Converter (rule). -->
    <template v-if="element">
      <div class="flex items-baseline gap-2">
        <span class="text-sm font-semibold">{{ element.name }}</span>
        <span class="text-xs text-base-content/50">{{ KIND_LABEL[element.kind] }}</span>
      </div>

      <!-- Stock: the quantity it starts from, and its unit. -->
      <template v-if="element.kind === 'stock'">
        <label class="mt-2 block">
          <span class="text-xs text-base-content/60">Initial value</span>
          <input
            type="number"
            class="input input-sm input-bordered mt-1 w-full"
            :value="element.initialValue ?? ''"
            placeholder="—"
            @change="onInitial"
          />
        </label>
        <label class="mt-2 block">
          <span class="text-xs text-base-content/60">Unit</span>
          <input
            type="text"
            class="input input-sm input-bordered mt-1 w-full"
            :value="element.unit ?? ''"
            placeholder="e.g. °C, people, $"
            @change="onUnit"
          />
        </label>
      </template>

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
            <option value="overflow">Overflow</option>
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
    </template>

    <!-- An Information Link: its endpoints and polarity, then its description. -->
    <template v-else-if="link">
      <div class="flex items-baseline gap-2">
        <span class="text-sm font-semibold">Information Link</span>
        <span class="text-xs text-base-content/50">{{ link.polarity === "+" ? "+" : "−" }}</span>
      </div>
      <p class="mt-1 text-xs text-base-content/60">
        {{ nodeName(link.source) }} → {{ nodeName(link.target) }}
      </p>
    </template>

    <!-- Shared across nodes and links: the "why this element is here" note (G4). -->
    <label class="mt-2 block">
      <span class="text-xs text-base-content/60">Description</span>
      <textarea
        rows="3"
        class="textarea textarea-bordered textarea-sm mt-1 w-full leading-snug"
        :value="(element ?? link)?.description ?? ''"
        placeholder="Why this element is here…"
        @change="onDescription"
      />
    </label>
  </div>
</template>
