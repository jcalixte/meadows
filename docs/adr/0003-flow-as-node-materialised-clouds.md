# A Flow is a node; Source/Sink clouds are materialised nodes

In the domain `Model`, a **Flow** is a *node* carrying `source` and `target`
references (each to a Stock or Cloud), not an edge. The pipe you see is *rendered*
from those references. The **Source/Sink** boundary is a **materialised Cloud
node**, so every Flow connects node→node uniformly — no `null` ends.

We rejected modelling a Flow as an edge (it breaks "an Information Link targets a
Flow," since edges can't be edge endpoints, and it muddies the simulator) and
rejected `null`-ended flows (special-casing in every graph walk and in rendering).

## Consequences

- The only stored edge type is the **Information Link**. Flows and Clouds are
  nodes. A reader seeing a "node that renders as a pipe" and "phantom cloud nodes"
  should look here.
- **Cloud lifecycle** must be auto-managed: spawn a Cloud when a Flow is left
  open-ended; remove it when the Flow attaches to a Stock; never leave orphans.
- Loop detection and the future simulator both walk a uniform node graph
  (info-links + flow→stock edges), with no boundary special cases.
