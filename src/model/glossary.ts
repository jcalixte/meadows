/**
 * UI glossary (F11, G4) — one-line definitions of the language, surfaced where a
 * newcomer meets each term: as palette tooltips before placing, and in the
 * gloss-on-selection panel after.
 *
 * CONTEXT.md is the authority for the vocabulary; these are deliberately terser
 * (a tooltip can't hold the full entry with its `Avoid:` clauses). Keep them in
 * sync with CONTEXT.md by hand — there's no test runner yet to assert it; when
 * one lands, a check that every `NodeKind` has an entry and each `term` matches a
 * CONTEXT.md heading would close the drift gap.
 */
import type { NodeKind } from "./types"

export interface GlossEntry {
  /** The canonical term, verbatim from CONTEXT.md. */
  term: string
  /** A one-sentence gloss, distilled from the CONTEXT.md definition. */
  short: string
}

export const NODE_GLOSSARY: Record<NodeKind, GlossEntry> = {
  stock: {
    term: "Stock",
    short:
      "An accumulation that holds a quantity over time — the system's memory. Only Flows can change it.",
  },
  flow: {
    term: "Flow",
    short:
      "A rate that moves quantity into or out of a Stock — the only element that can change one.",
  },
  converter: {
    term: "Converter",
    short:
      "A stateless helper value, recomputed each instant from its inputs (or a fixed constant).",
  },
  cloud: {
    term: "Source / Sink",
    short:
      "The model boundary on an open Flow end — where quantity comes from (Source) or goes (Sink).",
  },
}

export const INFO_LINK_GLOSS: GlossEntry = {
  term: "Information Link",
  short:
    "Carries one element's value to a Flow or Converter — influence only, never quantity; its sign is its Polarity.",
}
