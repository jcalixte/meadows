# meadows

The ubiquitous language for **meadows** — a web app for building systems-thinking
models (stock-and-flow diagrams with feedback loops) in the spirit of Donella
Meadows' *Thinking in Systems*. The diagram is the product now; numeric simulation
is a planned later phase, so the language is chosen to be simulation-ready.

## Language

**System**:
The real-world thing being studied — an interconnected set of elements producing
a behaviour over time. It is the *referent*, never the artifact in the app.
_Avoid_: model, diagram, map (those are the artifact, not the real thing).

**Model**:
One saved document — a simplified representation of a System, made of Stocks,
Flows, Converters, and Information Links. The unit of save / export / reopen.
_Avoid_: system, diagram, map, canvas, sheet, project.

**Stock**:
An accumulation that holds a quantity over time — the system's memory (e.g. water
in a bathtub, money in an account, a population).
_Avoid_: Box, level, container, node.

**Flow**:
A rate that moves quantity into (**inflow**) or out of (**outflow**) a Stock —
the only element that can change a Stock's value; drawn as a pipe with a valve.
Inflow/outflow is one Flow's direction relative to a given Stock, not a separate
element type (a stock→stock Flow is an outflow for one and an inflow for the
other). _Avoid_: faucet, drain, pipe, rate (that's the Flow's value), arrow.

**Converter**:
A stateless helper value, recomputed each instant from its inputs (or a fixed
constant), that feeds Flows or other Converters via Information Links — e.g.
`birth rate = fertility × 0.01`. A constant is a Converter with no inputs.
_Avoid_: variable (Stocks and Flows are variables too), function, auxiliary,
parameter, node.

**Information Link**:
A connector showing that one element's value influences a Flow's or Converter's
value; carries no quantity, never changes a Stock. _Avoid_: arrow, dependency,
edge, connector.

**Source** / **Sink**:
The model boundary on an open Flow end — a **Source** is where a Flow originates
outside the model (unlimited supply), a **Sink** is where it disappears. Drawn as
a cloud, auto-rendered when a Flow has no Stock at one end. _Avoid_: cloud (that's
the symbol, not the term), external, environment.

**Polarity**:
The sign on an Information Link (and inherent to a Flow): `+` when more cause
means more effect, `−` when more cause means less effect. The input that lets
loops be classified. _Avoid_: sign, direction (direction is inflow/outflow),
weight.

**Feedback Loop**:
A closed cycle in the wiring (Stock → … → Flow → same Stock); **detected** from
structure, never stored or hand-drawn. Classified by the product of polarities
around the cycle. _Avoid_: cycle (internal term), circle, circuit.

**Reinforcing**:
A Feedback Loop with an even number of `−` polarities — it amplifies change (the
snowball); labelled `R`. _Avoid_: positive, self-reinforcing, vicious/virtuous.

**Balancing**:
A Feedback Loop with an odd number of `−` polarities — it counteracts change and
seeks a goal (the thermostat); labelled `B`. _Avoid_: negative, stabilizing,
goal-seeking.

## Relationships

- A **Stock** is the only stateful element — it accumulates (∫ flows) and has
  memory; it changes **only** through **Flows**.
- A **Flow** and a **Converter** are stateless — recomputed each instant from
  their inputs; neither has memory.
- An **Information Link** feeds a **Stock**, **Flow**, or **Converter** value
  into a **Flow** or **Converter** (never into a Stock — Stocks change only via
  Flows), and carries a **Polarity**.
- A **Feedback Loop** is a detected cycle in the wiring; it is **Reinforcing**
  when it has an even number of `−` polarities, **Balancing** when odd.

## Example dialogue

> **Dev:** "For a population model, **Population** is a **Stock**, and **births**
> is a **Flow** into it — an inflow. Where do the births come from?"
> **Modeller:** "From outside the model — so the Flow's other end is a **Source**
> cloud. Same with **deaths**: an outflow from Population to a **Sink**."
> **Dev:** "And births depend on how many people there are?"
> **Modeller:** "Right — an **Information Link** from Population to the births
> Flow, with `+` **Polarity**: more people, more births. That closes a cycle, so
> the app detects a **Feedback Loop**. Even number of `−` links — zero here — so
> it's **Reinforcing**."
> **Dev:** "And `birth rate = fertility × 0.01`?"
> **Modeller:** "That's a **Converter** — stateless, recomputed each step. The
> Population Stock is the only thing that remembers."

## Flagged ambiguities

- "arrow" was used for two distinct things — resolved into **Flow** (moves
  material, changes a Stock) and **Information Link** (carries influence only).
- "function" was the user's word for the stateless helper — resolved to
  **Converter** (avoids collision with programming "function" and with the
  stateful Stock).
- "positive / negative feedback" — resolved to **Reinforcing** / **Balancing**
  (Meadows' preferred terms; `+/−` is reserved for link **Polarity**).
