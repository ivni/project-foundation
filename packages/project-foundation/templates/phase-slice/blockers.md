<!-- docs/phase-N/blockers.md — numbered unknowns and external dependencies that
     could invalidate the phase plan. High-impact stakeholder unknowns are closed
     BEFORE build; engineering unknowns are resolved or contained through research,
     synthesis, a spike, or a named default. Blockers that outlive the phase graduate
     to docs/registers.md — they never vanish. -->

# Phase {{N}} — blockers

| ID | Lane | Blocker | Why it matters | Blocked by | Resolution route | Owner / source | Default / trigger | Status |
|---|---|---|---|---|---|---|---|---|
| BLK-P{{N}}-001 | {{product value / functionality-domain / UX / business constraint / engineering / external dependency}} | {{unknown or dependency}} | {{what it can invalidate}} | {{BLK or UNK IDs, or empty}} | {{stakeholder decision / agent research / user research / engineering synthesis / spike / waiting on X / deferred default}} | {{who or what can answer}} | {{interim rule and answer-by or revisit trigger}} | open |

<!-- Statuses: open / resolved (say how) / graduated → DEBT-N or RISK-N. -->
<!-- `Blocked by` lists what this blocker waits on. A blocker is takeable when everything it
     lists is closed; work the takeable ones and leave the rest alone rather than guessing at
     answers upstream of them. Derive that set from this column; do not maintain a second list. -->
<!-- IDs use BLK-P<phase>-<sequence>, are globally unambiguous, and are never reused. -->
