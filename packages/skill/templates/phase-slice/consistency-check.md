<!-- docs/phase-N/consistency-check.md — result of checking this phase's
     requirements against existing PRD, ADRs, architecture, and code. Every
     contradiction is listed WITH its resolution. An empty check on a non-trivial
     phase is a red flag: look harder. -->

# Phase {{N}} — consistency check

**Requirements checked:** REQ-P{{N}}-001, REQ-P{{N}}-002, ...

**Canonical principles:** [agent contract]({{agent_contract_path_from_phase_slice}}#product-principles-canonical)

**Principles checked:** PRINC-001, PRINC-002, ... / none applicable

**Checked against:** canonical product principles, PRD ({{date/commit}}), ADR index,
architecture.md, code areas: {{which parts of the codebase were actually examined}}

## Contradictions found and resolved

| Requirement | Principles | Contradiction | Where | Resolution |
|---|---|---|---|---|
| REQ-P{{N}}-001 | {{PRINC-001 / —}} | {{new requirement vs principle/doc/ADR/behavior}} | {{principle / file / ADR}} | {{requirement changed / doc corrected / ADR-NNNN written}} |

## Confirmed assumptions

<!-- Things explicitly re-verified rather than assumed: invariants still hold,
     ADR decisions still apply to the new scope. -->

- {{assumption}} — holds ({{evidence}})

## Follow-ups

{{Anything discovered that belongs elsewhere: register entries filed, docs fixed
in passing, gotchas appended to the agent contract.}}
