<!-- Early bootstrap/audit record. While status is draft, record product intent,
     applicability, routes, answers, and assumptions here. After completion, promote
     decisions into canonical artifacts; this file becomes historical context rather
     than a living authority. -->

# Foundation discovery — {{project}}

- **Status:** draft
- **Started:** {{YYYY-MM-DD}}
- **Artifact language:** {{language}}
- **Agent contract file:** {{CLAUDE.md / AGENTS.md / user-specified path}}
- **Participant profile:** {{product owner / domain expert / technical collaborator / mixed}}
- **Decision authority:** {{which product, UX, business, domain, or technical choices they own}}

## Product value

- **Primary user and buyer:** {{who receives value, who chooses or pays, and any important difference}}
- **Problem and evidence:** {{what hurts, how often or severely, and what evidence exists}}
- **Current alternative:** {{what people do today, including doing nothing}}
- **Desired outcome and value:** {{observable improvement and why it matters}}
- **Success signals:** {{observable or measurable evidence of success}}
- **Guardrails:** {{what must not worsen}}
- **Product principles:** {{non-negotiable product or experience values to promote}}

Distinguish confirmed statements from assumptions and missing evidence.

## Functional, domain, and UX contract

- **Minimum useful outcome:** {{smallest result that makes the experience worthwhile}}
- **Primary journey:** {{trigger to value in user-visible steps}}
- **Necessary capabilities:** {{functions required for the agreed outcome}}
- **Domain rules and lifecycle:** {{states, permissions, invariants, and transitions}}
- **Trust, failure, and recovery:** {{what needs explanation, confirmation, undo, or self-recovery}}
- **Relevant environment and accessibility:** {{device, network, localization, accessibility, interruption}}
- **Scope:** {{included behavior}}
- **Non-goals:** {{explicit exclusions and why}}

## Language

<!-- Terms as they are resolved during discovery, promoted to docs/glossary.md with the artifact
     core. Record the rejected synonyms: they are what stops the term drifting back. -->

| Term | Meaning in domain language | Avoid | Source |
|---|---|---|---|
| {{term}} | {{what it means}} | {{rejected synonyms}} | {{DEC-NNN / user decision}} |

## Business constraints

{{Policy, ownership, incentives, budget, timing, commercial or legal constraints, and risk tolerance
that apply to the project. Record only relevant constraints.}}

## Project shape and applicability

| Capability | Status | Evidence and product-visible constraint |
|---|---|---|
| Deployable runtime | applicable / planned / N/A | {{why and externally meaningful constraint}} |
| Persistent data | applicable / planned / N/A | {{why and externally meaningful constraint}} |
| Human authentication | applicable / planned / N/A | {{why and externally meaningful constraint}} |
| Machine authentication | applicable / planned / N/A | {{why and externally meaningful constraint}} |
| Background jobs / external delivery | applicable / planned / N/A | {{why and externally meaningful constraint}} |
| Public network exposure | applicable / planned / N/A | {{why and externally meaningful constraint}} |
| File storage | applicable / planned / N/A | {{why and externally meaningful constraint}} |
| Multiple deployable components | applicable / planned / N/A | {{why and externally meaningful constraint}} |

<!-- MUST rules apply to applicable capabilities. SHOULD defaults may be changed with
     rationale. A planned capability names a phase or register trigger. N/A needs a
     one-line rationale and is not a deviation. Derive infrastructure from product
     behavior and evidence; do not ask stakeholders to choose mechanisms by default. -->

## Routed unknowns

<!-- `Blocked by` lists the unknowns whose answers this one waits on. An unknown is takeable
     when every unknown it lists is closed; the takeable open unknowns are the frontier. Derive
     the frontier from this column — never keep a separate list of it, which would go stale on
     the first answer. Leave the column empty for an unknown that depends on nothing. -->

| ID | Lane | Unknown | Impact | Blocked by | Resolution route | Owner / source | Interim default / answer-by | Status | Canonical destination |
|---|---|---|---|---|---|---|---|---|---|
| UNK-001 | product value / functionality-domain / UX / business constraint / engineering | {{unknown}} | high / medium / low | {{UNK IDs or empty}} | stakeholder decision / agent research / user research / engineering synthesis / spike / deferred default | {{who or what can answer}} | {{default, trigger, or answer-by}} | open | {{PRD / ADR / stages / architecture / register / agent contract}} |

## Stakeholder decisions

### DEC-001 — {{decision title}}

- **Decision:** {{observable rule, priority, scope, policy, or constraint}}
- **Evidence / rationale:** {{value, user need, policy, research, or source}}
- **Consequences:** {{product, UX, business, or external-constraint effect}}
- **Rejected alternatives:** {{meaningful alternatives and why}}
- **Resolves:** {{UNK IDs}}
- **Engineering implications:** {{constraints to synthesize; not stakeholder-approved mechanisms}}
- **Canonical destination:** {{destination after promotion}}

## Engineering synthesis

| Source | Constraint or mechanism decision | Evidence / default | ADR or spike | Status / destination |
|---|---|---|---|---|
| DEC-001 / UNK-001 | {{constraint or agent-led technical result}} | {{research, capability default, or validation}} | {{ADR-NNNN / spike / none}} | {{open / contained / decided and destination}} |

## Assumptions

| ID | Assumption | Lane | Risk if wrong | Validation path | Interim default | Status |
|---|---|---|---|---|---|---|
| ASM-001 | {{assumption}} | {{lane}} | {{impact}} | {{how to verify}} | {{current rule}} | open |

## Ruled out of scope

<!-- Work consciously placed outside the goal during discovery, promoted to the out-of-scope
     register with the artifact core. Not the same as a deferred default: a deferred default is
     in scope and returns on its trigger. When an exclusion moves the product's scope boundary,
     it also belongs in the PRD non-goals. -->

| What was asked for | Why it is out of scope | What would put it back in scope | Destination |
|---|---|---|---|
| {{request, capability, or idea}} | {{reason it sits outside the goal}} | {{goal change or new evidence; "only if the goal is redrawn" is complete}} | OOS-N in registers / PRD non-goals |

## Completion

- [ ] Product value, minimum useful outcome, primary journey, scope, and non-goals are explicit
- [ ] Applicable domain, UX, and business constraints are explicit
- [ ] Every high-impact stakeholder decision is resolved
- [ ] Every remaining unknown has the correct route, owner or source, interim default, and trigger
- [ ] Every `Blocked by` entry names a real unknown, and no cycle exists among them
- [ ] Resolved terms are recorded with their rejected synonyms and promoted to the glossary
- [ ] Scope exclusions are promoted to the out-of-scope register, and PRD non-goals agree with them
- [ ] Every high-impact engineering unknown is resolved or contained with an owner and method
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
