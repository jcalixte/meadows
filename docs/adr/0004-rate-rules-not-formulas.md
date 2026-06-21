# Behaviour comes from rules over Information Links, not free-form formulas

_Part of [meadows](../../README.md) · see [DESIGN.md](../../DESIGN.md)._

Numeric simulation (phase 2) makes a **Model** _alive_: Stocks accumulate over
time, Flows and Converters recompute each instant. Two coupled decisions shape
how a Model carries the numbers, and both trade expressive power for **valid by
construction** — the right trade for a tool that exists to _popularise_ systems
thinking, not to compete with Vensim.

## Decision

**1. The Information Link _is_ the declared dependency.** A Flow's or Converter's
inputs are exactly the elements that link into it. There is no separate "equation
references" namespace to keep in sync — the wiring you draw _is_ the wiring the
simulator reads. The same signed graph the loop detector walks (ADR-0001) is the
graph the simulator integrates, so the loops you _see_ classified R/B are the
loops you _run_. They can never disagree.

**2. A Flow/Converter computes from a small fixed vocabulary of `Rule`s, not a
typed-in formula.** Each instantaneous element picks one rule and a plain number
or two — never an expression:

| Rule             | Value                       | Reads (via Information Links)             | Emergent behaviour         |
| ---------------- | --------------------------- | ----------------------------------------- | -------------------------- |
| **Constant**     | a fixed number              | nothing                                   | linear Stock change        |
| **Proportional** | `factor × (its `+` inputs)` | the `+`-polarity inputs                   | exponential growth / decay |
| **Gap**          | `factor × (level − target)` | the `+` input is _level_, `−` is _target_ | goal-seeking / asymptotic  |
| **Overflow**     | `max(0, factor × (level − threshold))` | the `+` input is _level_, `−` is _threshold_ | a spillway / hard ceiling |

The famous curves are _compositions_ of these over the structure — a logistic
S-curve is Proportional growth meeting a Gap-driven ceiling (limits-to-growth);
goal-seeking decay is a lone Gap (coffee cooling). The user sets up a local rule;
the global shape **emerges**. That emergence _is_ the lesson.

**Overflow is the one _declared_ limit.** Constant/Proportional/Gap are smooth and
their ceilings _emerge_ (the S-curve is two of them meeting); Overflow instead is a
threshold — `max(0, …)` that stays shut until a level crosses it, then spills the
excess down an outflow (a bathtub brimming onto the floor). It earns a rule of its
own because Gap _cannot_ stand in: Gap is signed and bidirectional (coffee re-warms
if it drops below the room), so a Gap outflow runs _backwards_ below its target, and
that clamp can't be applied to Gap globally without breaking the goal-seekers. So
Overflow is a deliberate exception to "the shape emerges" — a hard ceiling you
_declare_, for the real limit that is a wall, not a slope (and the rate-side sibling
of the non-negative-Stock floor the integrator already enforces).

**Polarity does double duty.** The `+`/`−` already captured for loop
classification (ADR-0001) also selects each operand's role: Proportional reads
its `+` inputs; Gap reads its `+` input as the level and its `−` input as the
target, and Overflow the same with its `−` input as the threshold. One gesture,
two payoffs — no new per-link data.

## Considered Options

- **Free-form expression strings** (`birth rate = Population × fertility`) —
  maximally expressive, and what `equation?: string` originally anticipated.
  Rejected: needs a parser + a sandbox (never `eval`/`new Function`), invites
  broken-formula and name-resolution errors (auto-names contain spaces), and lets
  a learner _paint_ a curve instead of discovering it from structure.
- **Pick the output curve** (label a Stock "exponential" / "logarithmic") —
  rejected: it is the answer, not the cause, and it breaks the moment feedback
  decides the shape. "Logarithmic" in particular has no honest local rule; what
  people mean by it is asymptotic approach — which _is_ the Gap rule.
- **Rules over Information Links (chosen)** — no parser, valid by construction,
  and it teaches structure → behaviour.

## Consequences

- The domain types gain a `Rule` union on Flow/Converter (replacing the unused
  `equation?: string`), an optional `initialValue` on Stock, and an optional
  `SimSpec` (`start` / `stop` / `dt`) on the Model. All optional and additive, so
  existing saved Models still load (F8); they are simply not _simulatable_ until
  equipped.
- **Algebraic loops are an error.** A cycle in the wiring is legitimate feedback
  **iff it passes through a Stock** — the Stock supplies last-step state and so
  breaks the within-step dependency. A cycle among only Flows/Converters has no
  Stock to break it: the simulator cannot order it and rejects it. The simulator
  reuses the cycle machinery to detect this; it is a new _sim-readiness_ check,
  distinct from structural validity (validation.ts).
- A reader seeing `{ kind: "gap", factor }` on a Flow and wondering where its
  operands come from should look here: they are the Flow's inbound Information
  Links, picked by Polarity.
- The vocabulary starts deliberately small (Constant / Proportional / Gap —
  enough for linear, exponential, and goal-seeking, and for the coffee and
  savings samples). Growing it is additive: a new `kind` in the union plus a case
  in the evaluator — as **Overflow** later bore out (one union member, one
  evaluator case, plus matching touch-ups to the rule validator and the
  inspector). Multi-input products (e.g. `Population × fertility`) are a later
  increment, not a phase-2 blocker.
