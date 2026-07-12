<!-- Template for docs/adr/NNNN-slug.md. Sequential numbers, never renumbered.
     Add a line to docs/adr/README.md using templates/adr-index.md
     in the same commit. A mini-ADR for a cross-cutting SHOULD deviation may be three
     sentences; a MUST deviation needs explicit approval plus risk and compensating
     control, but both use this same file format. -->

# ADR-{{NNNN}}: {{decision title}}

- **Status:** {{proposed | accepted | accepted (retroactive) | rejected | superseded by ADR-NNNN}}
- **Date:** {{YYYY-MM-DD}}

## Context

{{The forces at play: the problem, the constraints, what made this decision
necessary now. Written so a reader two years later understands why this was
not obvious.}}

## Decision

{{What was decided, stated actively: "We use X", "We store Y as Z". Include the
rejected alternatives and one line each on why not.}}

## Consequences

{{What becomes easier, what becomes harder, what we are now committed to.
For a MUST deviation, state the accepted risk, explicit approver, and compensating
control. Include follow-ups (register entries, migrations) if the decision creates them.}}
