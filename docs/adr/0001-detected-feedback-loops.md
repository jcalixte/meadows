# Feedback loops are detected from a polarity-annotated graph, not stored

A **Feedback Loop** in a **Model** is a cycle in the wiring (Stock → Information
Link(s)/Flow → same Stock). We chose to **derive** loops by detecting cycles and
classifying each as **Reinforcing** (even number of `−` polarities) or
**Balancing** (odd), rather than storing them as first-class objects the user
hand-labels. This makes loops *discovered insight* that can never disagree with
the actual structure — the point of a systems-thinking tool.

## Considered Options

- **Hand-labeled annotation** — user drops a loop badge and tags it R/B. Simplest,
  but the label carries no structural truth and can contradict the wiring.
- **Hybrid** — app detects the cycle exists; user assigns R/B. Removes the
  inconsistency risk only partially and makes the user do reasoning the app can do.
- **Detected from structure (chosen)** — app finds cycles and classifies them.

## Consequences

- Every **Information Link** must carry a **Polarity** (`+`/`−`); inflows/outflows
  carry inherent polarity. This is a required field from the diagram phase on.
- There is **no `Loop` entity** in the data model — loops are computed, not
  persisted. A future reader seeing polarity on every link and no stored loop
  should look here.
- Requires cycle-detection + sign-product logic. The same polarity data is
  reused when numeric simulation is added later.
