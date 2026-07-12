<!-- Early bootstrap/audit record. While status is draft, record applicability,
     answers, and assumptions here. After completion, promote decisions into canonical
     artifacts; this file becomes historical context rather than a living authority. -->

# Foundation discovery — {{project}}

- **Status:** draft
- **Started:** {{YYYY-MM-DD}}
- **Artifact language:** {{language}}
- **Agent contract file:** {{CLAUDE.md / AGENTS.md / user-specified path}}

## Brief

{{What is being built, for whom, and under which constraints.}}

## Project shape and applicability

| Capability | Status | Rationale / evidence |
|---|---|---|
| Deployable runtime | applicable / planned / N/A | {{why}} |
| Persistent data | applicable / planned / N/A | {{why}} |
| Human authentication | applicable / planned / N/A | {{why}} |
| Machine authentication | applicable / planned / N/A | {{why}} |
| Background jobs / external delivery | applicable / planned / N/A | {{why}} |
| Public network exposure | applicable / planned / N/A | {{why}} |
| File storage | applicable / planned / N/A | {{why}} |
| Multiple deployable components | applicable / planned / N/A | {{why}} |

<!-- MUST rules apply to applicable capabilities. SHOULD defaults may be changed with
     rationale. A planned capability names a phase or register trigger. N/A needs a
     one-line rationale and is not a deviation. -->

## Unknowns

| ID | Question | Impact | Recommended default | Answer / evidence | Status | Canonical destination |
|---|---|---|---|---|---|---|
| UNK-001 | {{question}} | high / medium / low | {{default}} | — | open | {{PRD / ADR / stages / architecture / register / agent contract}} |

## Assumptions

| ID | Assumption | Risk if wrong | Validation path | Status |
|---|---|---|---|---|
| ASM-001 | {{assumption}} | {{impact}} | {{how to verify}} | open |

## Completion

- [ ] Every high-impact unknown is resolved
- [ ] Every remaining unknown has a default and resolution path
- [ ] The applicability matrix is complete
- [ ] The agent contract path is selected and recorded
- [ ] Every planned capability names a phase or register trigger
- [ ] Confirmed product principles are promoted to the agent contract with stable
      `PRINC-NNN` IDs; discovery keeps provenance, not a parallel editable list
- [ ] Decisions are promoted into canonical artifacts and destinations recorded above
- [ ] Status changed to complete

<!-- Once complete, do not maintain this file as current project documentation.
     Correct historical mistakes if necessary; make current changes in the canonical
     destination instead. -->
