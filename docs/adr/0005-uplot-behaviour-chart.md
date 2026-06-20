# uPlot draws the behaviour-over-time chart

_Part of [meadows](../../README.md) · see [DESIGN.md](../../DESIGN.md)._

The Results panel (ADR-0004's phase 2) traces each Stock's value over time. It
began as a **hand-built SVG** — a deliberate lean-substrate choice, no charting
dependency. But a polyline is all that substrate could draw: no time axis, no
gridlines, and a legend that could only show a Stock's _final_ value, never the
value under the cursor. For a tool whose whole point is reading _behaviour over
time_, "what is this Stock at t = 40?" is the question you most want to answer by
pointing at the curve.

## Decision

Adopt **uPlot** (`uplot`, ~15 KB gzip) — a small, fast canvas time-series
library — for the behaviour-over-time chart. It earns the dependency with the
three things the SVG could not give: a real **time axis** with ticks and
gridlines, and a live legend that **reads each Stock's value at the hovered
time**.

uPlot is imperative and canvas-based, so it is wrapped in **`SimChart.vue`**,
which owns its lifecycle (build on mount, `setData` on recompute, rebuild on a
track-set change, `ResizeObserver` for width, destroy on unmount). `ResultsPanel`
stays declarative: it assembles plain aligned data (Stocks only — the system's
memory, per ADR-0004) and hands it down.

## Considered Options

- **Keep the hand-built SVG** (zero deps) — rejected: re-implementing axes,
  tick placement, a hover cursor, and hit-testing _is_ rebuilding a charting
  library, badly. The lean-substrate note was a code comment, not an ADR; nothing
  prior is contradicted by spending one dependency where it clearly pays.
- **`@gouvfr/dsfr-chart`** (the original prompt) — rejected: it requires the
  entire DSFR design system (CSS + JS API) and embeds its _own_ Vue and Chart.js,
  so we would ship Vue twice and a second design language clashing with DaisyUI.
  It is built for French-government dashboards (region maps, gauges), not generic
  time series.
- **Chart.js / vue-chartjs** — viable and same engine class, but heavier; uPlot
  is lighter and faster for many series and live-updating data, which is exactly
  the simulation's shape.
- **uPlot (chosen)** — lightest credible option that gives the axis + hover.

## Consequences

- This is the project's **first runtime charting dependency**. The price, as with
  Vue Flow (ADR-0002), is a thin wrapper layer: `SimChart.vue` translates between
  reactive props and uPlot's imperative API.
- The x scale runs with **`time: false`** — x is _simulation_ time (`start…stop`),
  not wall-clock, which uPlot would otherwise format as calendar dates.
- Track colours are read from the **DaisyUI theme variables**. The app ships a
  single `light` theme, so they are resolved once at build time; a future dark
  theme would need the plot re-initialised on theme change.
- Swapping charting libraries later means rewriting only `SimChart.vue` —
  `ResultsPanel` passes plain `[times, ...tracks]` aligned data and knows nothing
  of uPlot.
