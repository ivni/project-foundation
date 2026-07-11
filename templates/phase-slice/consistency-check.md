<!-- docs/phase-N/consistency-check.md — result of checking this phase's
     requirements against existing PRD, ADRs, architecture, and code. Every
     contradiction is listed WITH its resolution. An empty check on a non-trivial
     phase is a red flag: look harder. -->

# Phase {{N}} — consistency check

**Checked against:** PRD ({{date/commit}}), ADR index, architecture.md, code areas:
{{which parts of the codebase were actually examined}}

## Contradictions found and resolved

| # | Contradiction | Where | Resolution |
|---|---|---|---|
| 1 | {{new requirement vs existing doc/ADR/behavior}} | {{file/ADR}} | {{PRD corrected / ADR-NNNN written / requirement changed}} |

## Confirmed assumptions

<!-- Things explicitly re-verified rather than assumed: invariants still hold,
     ADR decisions still apply to the new scope. -->

- {{assumption}} — holds ({{evidence}})

## Follow-ups

{{Anything discovered that belongs elsewhere: register entries filed, docs fixed
in passing, gotchas appended to CLAUDE.md.}}
