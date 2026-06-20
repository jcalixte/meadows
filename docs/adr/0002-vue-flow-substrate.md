# Vue Flow is the editor substrate; the domain Model is the source of truth

_Part of [meadows](../../README.md) · see [DESIGN.md](../../DESIGN.md)._

The editor is built on **Vue Flow** (`@vue-flow/core`) for pan/zoom, node
dragging, handles, edge-drawing, and selection, with Stocks/Flows/Converters/
Clouds as custom Vue node components. We rejected hand-rolling an SVG editor (too
slow to the friction goals F1–F3) and heavier kits (AntV X6, mxGraph — not
Vue-3-native).

The constraint that makes this safe: the **domain `Model` is the single source of
truth; the Vue Flow graph is a derived projection of it, never the reverse.** All
writes go through store actions that mutate the `Model`; the Vue Flow view is
re-derived. The future simulator reads the `Model` and has no knowledge of Vue
Flow.

## Consequences

- A **projection layer** (Model → Vue Flow nodes/edges, and Vue Flow events →
  store actions) must be built and kept thin. This is the price of the dependency.
- Swapping the rendering substrate later means rewriting only the projection +
  node/edge components, not the domain model or the simulator.
- A reader wondering "why is there a sync/projection layer instead of editing Vue
  Flow state directly?" should look here: it protects the simulate-later constraint.
