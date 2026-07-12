<!-- Template for docs/architecture.md (architecture-lite). Keep two views: context
     and runtime/package topology. Delete nodes for capabilities marked not applicable;
     do not invent infrastructure to fill the template. No component-level diagrams:
     they rot. Runtime units, consumer boundaries, and integrations follow the
     same-change rule. -->

# Architecture — {{project}}

## Context

Who uses the system and what it talks to.

```mermaid
graph TB
    user["{{User role}}"]
    admin["{{Another role}}"]
    system["{{Project}}"]
    ext1["{{External system, e.g. LDAP / mail / payment}}"]

    user --> system
    admin --> system
    system --> ext1
```

{{One paragraph: the system in one breath — what it is, for whom, what it depends on.}}

## Runtime / package topology

Show the applicable execution and release boundaries: deployable units for a service;
host, artifact, and consumer for a library or CLI; platform and backend boundaries for
a client application; execution units and data flow for a data job.

```mermaid
graph TB
    consumer["{{user / host application / scheduler}}"]
    artifact["{{service / CLI / library / client app / data job}}"]
    subgraph target["{{runtime / platform / package ecosystem}}"]
        primary["{{primary runtime or packaged artifact}}"]
        supporting["{{supporting runtime, if applicable}}"]
        data[("{{persistent data, if applicable}}")]
    end
    external["{{external integration, if applicable}}"]

    consumer --> artifact
    artifact --> primary
    primary --> supporting
    primary --> data
    primary --> external
```

{{One line per shown unit or boundary: responsibility, protocol or packaging relation,
and lifecycle/scaling constraint if any. Remove every non-applicable placeholder.}}
