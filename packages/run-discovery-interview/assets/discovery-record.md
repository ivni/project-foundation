# Discovery record — {{subject}}

- **Lifecycle:** active
- **Started:** {{YYYY-MM-DD HH:mm timezone}}
- **Last updated:** {{YYYY-MM-DD HH:mm timezone}}
- **Language:** {{language}}
- **Subject:** {{product, feature, or decision area}}
- **Source brief:** {{path, URL, user message, or none}}
- **Write boundary:** this file only; no implementation or canonical-document changes

## Outcome and scope

{{Current concise understanding of the problem, primary user, desired outcome, constraints, and
explicit exclusions. Distinguish confirmed statements from assumptions.}}

## Decision queue

| Priority | ID | Decision / unknown | Why it matters | Status | Default / answer-by |
|---|---|---|---|---|---|
| critical | UNK-001 | {{single unresolved decision}} | {{downstream impact}} | open | {{none or safe default}} |

Allowed statuses: `open`, `decided`, `needs-validation`, `deferred-with-default`, `superseded`.

## Decisions

### DEC-001 — {{decision title}}

- **Status:** decided / needs-validation / deferred-with-default / superseded
- **Decision:** {{unambiguous selected option or rule}}
- **User answer:** “{{concise verbatim excerpt; redact secrets and unnecessary personal data}}”
- **Rationale / evidence:** {{user need, constraint, research, or source}}
- **Consequences:** {{what this enables, constrains, or makes more expensive}}
- **Rejected alternatives:** {{meaningful alternatives and why}}
- **Assumptions:** {{ASM IDs or none}}
- **Resolves:** {{UNK IDs}}
- **Conflicts / supersedes:** {{DEC IDs or none}}
- **Validation:** {{method, source/owner, interim default, answer-by point; or N/A}}
- **Revisit trigger:** {{observable condition; or none}}
- **Recorded:** {{YYYY-MM-DD HH:mm timezone}}

## Assumptions

| ID | Assumption | Risk if wrong | Validation method / source | Interim default | Status / trigger |
|---|---|---|---|---|---|
| ASM-001 | {{proposition treated as true}} | {{impact}} | {{how it will be checked}} | {{current rule}} | open / validated / rejected |

## Contradictions and residual risks

| ID | Statement or risk | Related decisions | Resolution / containment | Status |
|---|---|---|---|---|
| RISK-001 | {{conflict or residual risk}} | {{DEC IDs}} | {{next action or guardrail}} | open / accepted / resolved |

## Applicability notes

Record only areas relevant to this subject. Mark each `applicable`, `planned`, or `N/A` with a short
rationale.

| Area | Status | Rationale / decision reference |
|---|---|---|
| Persistent or sensitive data | {{status}} | {{why / DEC ID}} |
| Human or machine identity | {{status}} | {{why / DEC ID}} |
| External integrations or delivery | {{status}} | {{why / DEC ID}} |
| Public network exposure | {{status}} | {{why / DEC ID}} |
| Background or asynchronous work | {{status}} | {{why / DEC ID}} |
| Migration or backward compatibility | {{status}} | {{why / DEC ID}} |

## Session log

Append; do not rewrite history.

- **{{timestamp}} — Opened:** {{initial scope and evidence inspected}}
- **{{timestamp}} — DEC-001:** {{answer recorded, unknowns resolved or created}}
- **{{timestamp}} — Supersession:** {{old decision, new decision, user confirmation}}

## Resume point

- **Current decision:** {{one UNK ID and decision statement, or none}}
- **Why it is next:** {{decision leverage}}
- **Last closed decision:** {{DEC ID or none}}
- **Blocking evidence:** {{missing evidence or none}}
- **Completion gate:** not ready / ready for final confirmation / ready-for-handoff

## Handoff

Complete only when the user ends discovery.

- **Lifecycle:** ready-for-handoff
- **Decisions closed:** {{DEC IDs}}
- **Needs validation:** {{DEC/ASM IDs and validation paths}}
- **Deferred with defaults:** {{IDs, defaults, triggers}}
- **Residual risks accepted:** {{IDs}}
- **Suggested next workflow:** {{requirements synthesis / architecture plan / ADR / validation spike}}
- **Implementation changes made:** none
