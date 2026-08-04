<!-- docs/phase-N/checklist.md — the phase broken into subphases. Subphase N.0 is
     always the requirements slice itself. Each subphase is sized to one fresh context
     window: startable from scope.md, this file, blockers.md, and the repository alone,
     with nothing load-bearing left in the conversation. Tick items in the same commit
     that completes them; sync the agent-contract status line at meaningful completions. -->

# Phase {{N}} — checklist

- [x] {{N}}.0 Requirements slice (this document set) — scope fixed, blockers filed,
      consistency checked
- [ ] {{N}}.1 {{subphase — a coherent committable increment}} — REQ-P{{N}}-001, ...
- [ ] {{N}}.2 {{…}}

## Requirement traceability

| Requirement | Subphase | Verification method | Evidence |
|---|---|---|---|
| REQ-P{{N}}-001 | {{N}}.1 | {{test / probe / manual flow}} | {{command + result / artifact / observation; fill during build}} |

## Phase definition of done

- [ ] All subphases above complete (local verification and required CI green, tests,
      verified by running, docs updated)
- [ ] Every requirement ID maps to a completed subphase and verification evidence
- [ ] Every requirement references applicable `PRINC-NNN` IDs or explicitly records `—`;
      none contradicts a canonical product principle
- [ ] All `BLK-P{{N}}-*` resolved or graduated to the register
- [ ] PRD / stages / ADRs / architecture / agent contract agree with code and runtime;
      every mismatch resolved by correcting the wrong layer
- [ ] Debt & risk register reviewed
- [ ] Agent-contract status line rewritten: phase closed, next phase named
