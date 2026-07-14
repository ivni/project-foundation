# Discovery record — {{subject}}

- **Lifecycle:** active
- **Started:** {{YYYY-MM-DD HH:mm timezone}}
- **Last updated:** {{YYYY-MM-DD HH:mm timezone}}
- **Language:** {{language}}
- **Subject:** {{product, feature, or decision area}}
- **Source brief:** {{path, URL, user message, or none}}
- **Participant profile:** {{product owner / domain expert / technical collaborator / mixed}}
- **Decision authority:** {{which product, UX, business, domain, or technical choices they own}}
- **Track:** product / technical
- **Write boundary:** this file only; no implementation or canonical-document changes

## Product value

- **Primary user and buyer:** {{who receives value, who chooses or pays, and any important difference}}
- **Problem and evidence:** {{what hurts, how often or severely, and what evidence exists}}
- **Current alternative:** {{what people do today, including doing nothing}}
- **Desired outcome and value:** {{observable improvement and why it matters}}
- **Success signals:** {{observable or measurable evidence of success}}
- **Guardrails:** {{what must not worsen}}
- **Product principles:** {{non-negotiable product or experience values}}

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

## Business constraints

{{Policy, ownership, incentives, budget, timing, commercial or legal constraints, and risk tolerance
that apply to the subject. Record only relevant constraints.}}

## Routed unknowns

| Priority | ID | Lane | Unknown | Resolution route | Owner / source | Interim default / answer-by | Status |
|---|---|---|---|---|---|---|---|
| critical | UNK-001 | product value / functionality-domain / UX / business constraint / engineering | {{unknown}} | stakeholder decision / agent research / user research / engineering synthesis / experiment-spike / deferred-with-default | {{who or what can answer}} | {{default, trigger, or answer-by}} | open |

Allowed statuses: `open`, `decided`, `needs-validation`, `deferred-with-default`, `superseded`,
`routed-for-handoff`.

## Stakeholder decision queue

Include only stakeholder-owned decisions appropriate to the active track. Technical mechanisms do
not enter a product-track queue.

| Order | ID | Decision | Why it belongs to this participant | Why now | Status |
|---|---|---|---|---|---|
| 1 | UNK-001 | {{one stakeholder-owned decision}} | {{authority and basis}} | {{product, UX, business, or constraint dependency}} | open |

## Decisions

### DEC-001 — {{decision title}}

- **Status:** decided / needs-validation / deferred-with-default / superseded
- **Lane:** product value / functionality-domain / UX / business constraint / engineering
- **Decision:** {{unambiguous selected option or observable rule}}
- **User answer:** “{{concise verbatim excerpt; redact secrets and unnecessary personal data}}”
- **Rationale / evidence:** {{user value, constraint, policy, research, or source}}
- **Product / UX / business consequences:** {{what this enables, constrains, or makes more expensive}}
- **Rejected alternatives:** {{meaningful alternatives and why}}
- **Assumptions:** {{ASM IDs or none}}
- **Resolves:** {{UNK IDs}}
- **Conflicts / supersedes:** {{DEC IDs or none}}
- **Validation:** {{method, source or owner, interim default, answer-by point; or N/A}}
- **Revisit trigger:** {{observable condition; or none}}
- **Recorded:** {{YYYY-MM-DD HH:mm timezone}}

## Engineering implications

Derived implications are not mechanisms approved by the stakeholder. Preserve the originating
decision and route the actual mechanism to agent research, engineering synthesis, an ADR, or a spike.

| Source | Constraint or implication | Route | Default / validation | Status |
|---|---|---|---|---|
| DEC-001 | {{behavior or quality the implementation must support}} | engineering synthesis / agent research / ADR / spike | {{safe default or method}} | open |

## Assumptions

| ID | Assumption | Lane | Risk if wrong | Validation method / source | Interim default | Status / trigger |
|---|---|---|---|---|---|---|
| ASM-001 | {{proposition treated as true}} | {{lane}} | {{impact}} | {{how it will be checked}} | {{current rule}} | open / validated / rejected |

## Contradictions and residual risks

| ID | Statement or risk | Related decisions | Resolution / containment | Status |
|---|---|---|---|---|
| RISK-001 | {{conflict or residual risk}} | {{DEC IDs}} | {{next action or guardrail}} | open / accepted / resolved |

## Applicability notes

Record only areas relevant to the subject. Mark each `applicable`, `planned`, or `N/A` with a short
rationale. Capture the product-visible constraint here; route implementation mechanisms to
engineering implications.

| Area | Status | Product-visible constraint / rationale / decision reference |
|---|---|---|
| Persistent or sensitive data | {{status}} | {{why / constraint / DEC ID}} |
| Human or machine identity | {{status}} | {{why / constraint / DEC ID}} |
| External integrations or delivery | {{status}} | {{why / constraint / DEC ID}} |
| Public network exposure | {{status}} | {{why / constraint / DEC ID}} |
| Background or asynchronous work | {{status}} | {{why / constraint / DEC ID}} |
| Migration or backward compatibility | {{status}} | {{why / constraint / DEC ID}} |

## Session log

Append; do not rewrite history.

- **{{timestamp}} — Opened:** {{initial scope, profile, track, and evidence inspected}}
- **{{timestamp}} — DEC-001:** {{answer recorded, unknowns resolved, created, or rerouted}}
- **{{timestamp}} — Routing:** {{unknown moved to research, synthesis, validation, or default}}
- **{{timestamp}} — Supersession:** {{old decision, new decision, user confirmation}}

## Resume point

- **Current stakeholder decision:** {{one UNK ID and decision statement, or none}}
- **Active gate:** value / behavior / experience-business / handoff / technical
- **Why it is next:** {{decision leverage within the active or earlier gate}}
- **Last closed decision:** {{DEC ID or none}}
- **Blocking evidence:** {{missing evidence or none}}
- **Routed work:** {{agent research, user research, engineering synthesis, ADR, or spike items}}
- **Completion gate:** not ready / ready for final confirmation / ready-for-handoff

## Handoff

Complete only when the user ends discovery.

- **Lifecycle:** ready-for-handoff
- **Track completed:** product / technical
- **Value and outcome:** {{concise product-value summary}}
- **Functional and UX contract:** {{concise behavior summary}}
- **Decisions closed:** {{DEC IDs}}
- **Needs validation:** {{DEC/ASM/UNK IDs and validation paths}}
- **Deferred with defaults:** {{IDs, defaults, triggers}}
- **Engineering implications:** {{items and routes; not stakeholder-approved mechanisms}}
- **Residual risks accepted:** {{IDs}}
- **Suggested next workflow:** {{requirements or PRD synthesis / project-foundation technical synthesis / ADR / validation spike}}
- **Implementation changes made:** none
