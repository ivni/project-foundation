<!-- Template for docs/tech-stack.md. Record constraints and lifecycle evidence from
     official sources — never from memory. -->

# Tech stack — {{project}}

> When touching anything version-sensitive, re-verify against the linked official
> source; do not invent or recall versions, channels, API levels, or EOL dates.

## {{Layer, e.g. Backend}}

| Component | Constraint type | Constraint | Role | Official source | Verified | Lifecycle / EOL | Notes |
|---|---|---|---|---|---|---|---|
| {{name}} | {{exact pin / compatible range / managed channel / API version / unversioned}} | {{value}} | {{what it does here}} | {{official URL}} | {{YYYY-MM-DD}} | {{supported / EOL date / provider-managed}} | {{rationale / compatibility / ADR}} |

## Rejected alternatives

<!-- One line each: what was considered, why not. Contested decisions get a full ADR;
     link it. -->

- {{alternative}} — {{reason; ADR-NNNN if applicable}}

## Upgrade policy

{{How each constraint type moves; compatibility policy; review trigger; response to EOL
and security advisories. Dependency audit runs in local verification and CI.}}
