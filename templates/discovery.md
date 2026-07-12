<!-- Early bootstrap/audit record. While status is draft, record applicability,
     answers, and assumptions here. After completion, promote decisions into canonical
     artifacts; this file becomes historical context rather than a living authority. -->

# Foundation discovery — {{project}}

- **Status:** draft
- **Started:** {{YYYY-MM-DD}}
- **Artifact language:** {{language}}

## Brief

{{What is being built, for whom, and under which constraints.}}

## Project shape and applicability

| Capability | Status | Rationale / evidence |
|---|---|---|
| Deployable runtime | applicable / planned / not applicable | {{why}} |
| Persistent data | applicable / planned / not applicable | {{why}} |
| Human authentication | applicable / planned / not applicable | {{why}} |
| Machine authentication | applicable / planned / not applicable | {{why}} |
| Background jobs / external delivery | applicable / planned / not applicable | {{why}} |
| Public network exposure | applicable / planned / not applicable | {{why}} |
| File storage | applicable / planned / not applicable | {{why}} |
| Multiple deployable components | applicable / planned / not applicable | {{why}} |

<!-- A hard default is mandatory only for an applicable capability. A planned
     capability must name a phase or register trigger. Not applicable needs a one-line
     rationale; it is not a deviation and does not require an ADR. -->

## Unknowns

| ID | Question | Impact | Recommended default | Answer / evidence | Status | Canonical destination |
|---|---|---|---|---|---|---|
| UNK-001 | {{question}} | high / medium / low | {{default}} | — | open | {{PRD / ADR / stages / architecture / register / CLAUDE.md}} |

## Assumptions

| ID | Assumption | Risk if wrong | Validation path | Status |
|---|---|---|---|---|
| ASM-001 | {{assumption}} | {{impact}} | {{how to verify}} | open |

## Completion

- [ ] Every high-impact unknown is resolved
- [ ] Every remaining unknown has a default and resolution path
- [ ] The applicability matrix is complete
- [ ] Every planned capability names a phase or register trigger
- [ ] Decisions are promoted into canonical artifacts and destinations recorded above
- [ ] Status changed to complete

<!-- Once complete, do not maintain this file as current project documentation.
     Correct historical mistakes if necessary; make current changes in the canonical
     destination instead. -->
