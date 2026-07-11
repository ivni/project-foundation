<!-- Template for docs/tech-stack.md. Every version verified against official
     docs — never from memory — with the verification date recorded. -->

# Tech stack — {{project}}

> Versions below verified against official documentation on {{YYYY-MM-DD}}.
> When touching anything version-sensitive, re-verify; do not invent or recall
> version numbers.

## {{Layer, e.g. Backend}}

| Component | Version | Role | Notes |
|---|---|---|---|
| {{name}} | {{pinned}} | {{what it does here}} | {{rationale if non-obvious / ADR link}} |

## Rejected alternatives

<!-- One line each: what was considered, why not. Contested decisions get a full ADR;
     link it. -->

- {{alternative}} — {{reason; ADR-NNNN if applicable}}

## Upgrade policy

{{How versions move: e.g. "pin exact; review pins at each phase close; security
patches immediately". Dependency audit runs in the QA gate.}}
