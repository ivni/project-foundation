<!-- Template for docs/architecture.md (C4-lite). Exactly two diagrams — context and
     containers. No component-level diagrams: they rot. Falls under the same-change
     rule: a new container or integration updates this file in the same commit. -->

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

## Containers

Deployable units and the protocols between them.

```mermaid
graph TB
    subgraph host["{{deployment target}}"]
        app["{{app/API}}"]
        worker["{{background worker}}"]
        db[("{{database}}")]
        cache[("{{cache/queue}}")]
        storage[("{{object storage}}")]
    end
    spa["{{client, if separate}}"]

    spa -->|HTTPS| app
    app --> db
    app --> cache
    worker --> db
    worker --> cache
    app -->|presigned URLs| storage
```

{{One line per container: responsibility, scaling constraint if any (e.g. "scheduler —
single instance, must never run twice").}}
