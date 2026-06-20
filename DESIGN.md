# meadows — Design (QFD)

Goal-driven design for the **meadows** editor, phase 1 (diagram; numeric
simulation is a later phase). Scope: data model, canvas/rendering, interaction
model, and persistence for building stock-and-flow **Models**. It relies on
[CONTEXT.md](./CONTEXT.md) for vocabulary and
[ADR-0001](./docs/adr/0001-detected-feedback-loops.md) (loops detected from a
polarity-annotated graph, not stored). "Simulation-ready" is a constraint here,
not a goal: nothing in the data model should need a rewrite when simulation lands.
See [README.md](./README.md) for the project overview and how to run it.

Strength weights used in matrices: **9** strong, **3** medium, **1** weak, blank none.

---

## 1. Goals — the WHATs

| ID  | Goal                                          | Weight | Source                          |
|-----|-----------------------------------------------|:------:|---------------------------------|
| G1  | Build a model with near-zero friction         |   9    | original request; CONTEXT.md    |
| G2  | Feedback structure surfaces as insight (live) |   8    | original request; ADR-0001      |
| G3  | Models are safe and portable                  |   7    | original request                |

## 2. Functions — the HOWs

| ID  | Function                                                              | Dir | Target (now)                         | Target (future)        |
|-----|----------------------------------------------------------------------|:---:|--------------------------------------|------------------------|
| F1  | Place a node in one gesture (palette → canvas, auto-named)            |  ↓  | 1 click/drag, 0 dialogs              | —                      |
| F2  | Connect by direct manipulation (auto source/sink cloud on open end)   |  ↓  | 1 drag, 0 menus                      | —                      |
| F3  | Render & manipulate the canvas smoothly                               |  ↑  | 60 fps pan/zoom/drag @ ≤150 elements | ≥300 elements          |
| F4  | Enforce valid structure inline                                        |  →  | 0 invalid models persistable         | —                      |
| F5  | Detect & classify loops live (R/B) on every structural change         |  ↓  | ≤16 ms recompute @ ≤150 elements     | ≤16 ms @ ≥300          |
| F6  | Capture link polarity frictionlessly                                  |  ↓  | default on create, 1-click toggle    | —                      |
| F7  | Autosave locally, continuously                                        |  →  | debounced ≤500 ms; survive reload    | —                      |
| F8  | Round-trip Models as versioned JSON                                   |  →  | export→import identity; `version`    | schema migrations      |
| F9  | Undo/redo every model change                                          |  ↑  | ≥50 steps, all structural ops        | —                      |

## 3. Cascade — Goals → Functions → How → Components

- **G1** Build a model with near-zero friction  _W:9_
  - **F1** Place a node in one gesture  _↓ 1 click/drag_
    - **How**: Vue Flow drag-from-palette → store action creates the node
      - **Component**: C1 Vue Flow canvas · C2 custom node components · C6 projection
  - **F2** Connect by direct manipulation (auto cloud on open end)  _↓ 1 drag_
    - **How**: drag from a node handle; open end auto-spawns a Cloud
      - **Component**: C2 node handles · C3 edge components · C5 store actions · C7 structure guard
  - **F3** Render & manipulate smoothly  _↑ 60 fps @ ≤150_
    - **How**: Vue Flow viewport (GPU transforms); Model→VueFlow projection memoised
      - **Component**: C1 Vue Flow canvas · C6 projection
  - **F9** Undo/redo  _↑ ≥50 steps_
    - **How**: ring buffer of deep-cloned Model snapshots in the store
      - **Component**: C5 model store (history)
- **G2** Feedback structure surfaces as insight (live)  _W:8_
  - **F5** Detect & classify loops live  _↓ ≤16 ms @ ≤150_
    - **How**: derive directed graph → Tarjan SCC → capped Johnson → polarity product (R/B)
    - **How**: SCC-only — _rejected (loses per-loop insight), see T3_
      - **Component**: C8 loop engine · C11 loop overlay
  - **F6** Capture link polarity frictionlessly  _↓ default + toggle_
    - **How**: InfoLink defaults to `+` on create; 1-click `+/−` toggle on the edge badge
      - **Component**: C3 edge components · C5 store actions
  - **F4** Enforce valid structure inline  _→ 0 invalid persistable_
    - **How**: guard *guides* (disallow invalid handle targets) rather than erroring after
      - **Component**: C7 structure guard · C4 domain types
- **G3** Models are safe and portable  _W:7_
  - **F7** Autosave locally, continuously  _→ ≤500 ms debounce_
    - **How**: store subscribes to Model changes → debounced `repository.save()`
      - **Component**: C5 store · C9 ModelRepository (IndexedDB/idb)
  - **F8** Round-trip Models as versioned JSON  _→ lossless_
    - **How**: serialise Model (`version` field) → download; import → validate → load
    - **How**: PouchDB/cloud sync — _deferred (needs a backend), see Tensions_
      - **Component**: C10 import/export · C4 domain types
  - **F9** (also serves G3 as a safety net) → C5 model store

## 4. House — Goals × Functions

Cells: strength 9/3/1. Importance Σ = Σ(weight × strength).

|          | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 | F9 |
|----------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| G1 (9)   | 9  | 9  | 9  | 3  | 1  | 3  | 1  |    | 3  |
| G2 (8)   |    | 3  | 1  | 3  | 9  | 9  |    |    | 1  |
| G3 (7)   |    |    |    | 1  |    |    | 9  | 9  | 9  |
| **Σ**    | 81 | 105| 89 | 58 | 81 | 99 | 72 | 63 | 98 |

**Top engineering priorities (from importance):** the matrix puts **F2 (connect, 105)**, **F6 (polarity, 99)** and **F9 (undo, 98)** above the headline detector **F5 (81)**. The lesson: loop insight is only as good as its *inputs* and *ergonomics* — getting wiring (F2) and polarity capture (F6) effortless matters as much as the detection itself, and a reliable safety net (F9) underwrites fearless building. F4 (58) is real but lowest-leverage — keep it lightweight (guide, don't nag).

## 5. Roof — Function × Function tradeoffs

`◎` strong reinforce · `○` mild reinforce · `×` mild conflict · `⊗` strong conflict.

|        | F2 | F3 | F4 | F5 | F6 | F9 |
|--------|:--:|:--:|:--:|:--:|:--:|:--:|
| **F2** | —  |    | ×  |    | ◎  |    |
| **F3** |    | —  |    | ⊗  |    | ×  |
| **F4** |    |    | —  | ○  |    |    |
| **F5** |    |    |    | —  | ◎  |    |
| **F6** |    |    |    |    | —  |    |
| **F9** |    |    |    |    |    | —  |

**Conflicts that actually shape the design:**
- **F5 ⊗ F3** — live loop enumeration on every change vs the 60 fps frame budget. The design-shaping conflict. Mitigated by the **cap** (≤200 cycles) + running detection **off the render frame** (debounce / idle callback / worker). Owned by ADR-0001 + the §7 budget.
- **F2 × F4** — guardrails can add friction to connecting. Mitigated by *guiding* the gesture (invalid handles refuse the drop) instead of erroring afterwards.
- **F3 × F9** — snapshot cloning on every change costs memory/time. Bounded by small models + a fixed-size ring buffer; revisit with structural sharing only if profiling demands.
- **F2 ◎ F6, F5 ◎ F6** — polarity is captured *in* the connect gesture and *is* the detector's input; these reinforce, so build them together.

## 6. Components & Function → Component map

| ID  | Component                                            | ADR      |
|-----|-----------------------------------------------------|----------|
| C1  | Vue Flow canvas (`@vue-flow/core` + addons)         | ADR-0002 |
| C2  | Custom node components (Stock/Flow/Converter/Cloud) | ADR-0002 |
| C3  | Custom edge components (InfoLink badge, Flow pipe)  | ADR-0002 |
| C4  | Domain `Model` + types (`model/types.ts`)           | ADR-0003 |
| C5  | Model store (Pinia) + snapshot history              | —        |
| C6  | Model ↔ Vue Flow projection (`projection.ts`)       | ADR-0002 |
| C7  | Structure guard (`validation.ts`)                   | ADR-0003 |
| C8  | Loop engine (`loops.ts`: SCC + capped Johnson)      | ADR-0001 |
| C9  | `ModelRepository` (IndexedDB via `idb`)             | —        |
| C10 | Import/Export (versioned JSON `io.ts`)              | —        |
| C11 | Loop overlay UI (R/B badges, hover highlight)       | ADR-0001 |
| C12 | Palette + chrome (DaisyUI toolbar, model list)      | —        |

|     | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | C9 | C10 | C11 | C12 |
|-----|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:---:|:---:|:---:|
| F1  | 9  | 9  |    |    | 3  | 9  |    |    |    |     |     | 9   |
| F2  | 9  | 9  | 9  |    | 9  | 3  | 9  |    |    |     |     |     |
| F3  | 9  | 3  | 3  |    |    | 9  |    |    |    |     |     |     |
| F4  |    | 1  | 1  | 3  | 3  |    | 9  |    |    |     |     |     |
| F5  |    |    |    | 3  | 1  |    |    | 9  |    |     | 9   |     |
| F6  |    |    | 9  | 3  | 3  |    |    | 1  |    |     |     |     |
| F7  |    |    |    |    | 9  |    |    |    | 9  |     |     |     |
| F8  |    |    |    | 3  |    |    |    |    | 1  | 9   |     |     |
| F9  |    |    |    |    | 9  |    |    |    |    |     |     |     |

## 7. Critical performance budget

| Rank | Function | Target                     | Watched on                          | If we miss it                                              |
|------|----------|----------------------------|-------------------------------------|-----------------------------------------------------------|
| 1    | F5       | ≤16 ms recompute @ ≤150    | bench on synthetic dense graphs     | enforce cycle cap; move detection off-frame (idle/worker); debounce |
| 2    | F3       | 60 fps pan/zoom/drag @ ≤150| frame profiling in DevTools         | memoise projection; simplify node DOM; virtualise off-screen nodes |
| 3    | F2       | 1 drag, 0 menus            | manual UX walkthrough               | simplify handle model; reduce connect steps               |
| 4    | F7       | ≤500 ms debounce, 0 loss   | reload-after-edit integration test  | flush on `visibilitychange`/`beforeunload`                |
| 5    | F8       | export→import identity     | property test (round-trip)          | pin schema; add migration on `version` bump               |

## 8. Tradeoffs — Got / Paid / ADR

| ID  | Tradeoff                                   | Got                                              | Paid                                                | ADR      |
|-----|--------------------------------------------|--------------------------------------------------|-----------------------------------------------------|----------|
| T1  | Vue Flow over hand-rolled SVG              | fast F1–F3, batteries-included editor mechanics  | a dependency owning the view layer + a Model↔VueFlow projection to maintain | ADR-0002 |
| T2  | Flow-as-node + materialised Clouds         | uniform graph for loops/render; info-links can target flows; sim-clean | Cloud lifecycle management; a node that renders as a pipe | ADR-0003 |
| T3  | Enumerate loops with a cap                 | per-loop R/B insight (G2) within the frame budget | capped completeness on pathological graphs ("+N more") | ADR-0001 |
| T4  | IndexedDB(`idb`) behind `ModelRepository`  | size headroom + swappable engine (sync later)    | async wrapper + a small dependency; no sync today   | —        |
| T5  | Snapshot undo over command pattern         | simplicity and correctness                       | memory per snapshot (bounded by ring buffer + small models) | —        |

### Tensions being watched (unresolved by design)

- **Cross-device sync / sharing.** Not built; G3 is met by local persistence + JSON export. **Trigger to revisit:** a real multi-device or collaboration need → add a `PouchdbModelRepository` or API-backed repository behind the existing interface.
- **Auto-layout.** Manual placement only in phase 1. **Trigger to revisit:** users report large models becoming unreadable → add an optional layout pass (e.g. ELK/dagre) over the projection.

## 9. Inconsistencies spotted and fixed

- **Brief vocabulary vs glossary.** The original request said "functions," "arrows," "faucets"; DESIGN uses the resolved CONTEXT.md terms verbatim — **Converter**, **Flow**/**Information Link**, faucet dropped.
- **G3 ambiguity.** "Safe and portable" initially read as possible cloud sync; clarified — G3 is satisfied by **local persistence + JSON export**, not sync (PouchDB deferred, see Tensions).
- **Storage default drift.** Initial recommendation was localStorage; resolved to **IndexedDB via `idb`**, behind a `ModelRepository` interface so the engine choice is no longer hard-to-reverse.

---

## How to keep this honest

- When a new ADR lands → add its components to §6 and re-score affected rows.
- When a spike / measurement returns numbers → update §7 `Target` / `Watched on`.
- WHATs change rarely; HOWs change with each release; matrices are recomputed when either side changes.
- If a section becomes empty after edits, delete it — empty sections lie.
