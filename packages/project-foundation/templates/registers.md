<!-- Template for docs/registers.md — debt, risk & out-of-scope registers. Known debt
     without an entry violates the standard. Review at every phase close. Phase blockers
     (BLK-P<phase>-<seq>) that outlive their phase graduate here. -->

# Registers — {{project}}

## Tech debt

| ID | Description | Origin | Owner | Review trigger | Status |
|---|---|---|---|---|---|
| DEBT-1 | {{what is knowingly imperfect and what "fixed" looks like}} | {{phase / ADR / BLK-P2-001 that created it}} | {{who}} | {{date or event: "before phase 3", "when users > 50"}} | open |

## Risks

| ID | Description | Impact if it fires | Owner | Review trigger | Mitigation / plan | Status |
|---|---|---|---|---|---|---|
| RISK-1 | {{what might go wrong}} | {{consequence}} | {{who}} | {{date or event}} | {{what we do about it}} | open |

<!-- Statuses: open / mitigated / closed / accepted (consciously living with it —
     say why). Closed entries stay in the table; history is the point. -->

## Out of scope

<!-- Requests, capabilities, and ideas consciously ruled outside the goal. Read this before
     working a new request: re-arguing a recorded rejection without new evidence is what this
     table prevents. Not the same as a deferred default, which is in scope and returns on its
     trigger. When a rejection moves the product's scope boundary, update the PRD non-goals in
     the same change and reference the OOS id here. -->

| ID | What was asked for | Why it is out of scope | Origin | What would put it back in scope | Decided | Status |
|---|---|---|---|---|---|---|
| OOS-1 | {{the request, capability, or idea}} | {{the reason it sits outside the goal}} | {{who asked / DEC-NNN / phase / issue}} | {{the goal change or new evidence that would reopen it — "only if the goal is redrawn" is a complete answer}} | {{YYYY-MM-DD}} | ruled out |

<!-- Statuses: ruled out / reopened as {{phase, DEC, or issue}}. A reopened entry stays in the
     table with the pointer; rejections are never deleted. -->
