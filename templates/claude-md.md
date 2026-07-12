<!-- Template for the project's CLAUDE.md. Translate headings into the artifact
     language. Delete guidance comments after instantiating. -->

# CLAUDE.md

Engineering guide for **{{project}}** — {{one-line description}}. This file is the
authoritative contract for how we intend to build. Code records implementation and
runtime checks record actual behavior. Product details live in [docs/PRD.md](docs/PRD.md),
stack in [docs/tech-stack.md](docs/tech-stack.md), build order in
[docs/stages.md](docs/stages.md), architecture sketch in
[docs/architecture.md](docs/architecture.md), decisions in [docs/adr/](docs/adr/README.md).
Foundation discovery and its historical rationale live in
[docs/discovery.md](docs/discovery.md).

> Status: {{what is implemented — by phase/subphase; what is in progress; what is
> next. Rewrite at every phase/subphase completion, in the same commit. A fresh
> session must be able to resume from this paragraph alone.}}

## Product principles (non-negotiable)

<!-- 5–7 principles from discovery, phrased so a violation is detectable.
     These shape every feature. Violating them is a bug, not a style choice. -->

- **{{Principle}}.** {{One sentence of what it means in practice.}}

## Project shape & applicability

<!-- Current capability classification promoted from docs/discovery.md. This section,
     not completed discovery, is the living summary. Planned items link to stages or
     a register trigger. -->

| Capability | Status | Evidence / destination |
|---|---|---|
| {{deployable runtime / persistent data / human auth / ...}} | applicable / planned / not applicable | {{why, phase, or register link}} |

## Repository layout

```
{{annotated tree — top two levels, one comment per entry}}
```

## Tech stack (pinned; verify via docs, never from memory)

{{One line per layer with pinned versions. Full detail + verification dates in
docs/tech-stack.md. Keep the rule inline: when touching anything version-sensitive,
confirm against official docs; do not invent or recall version numbers.}}

## Commands

```bash
{{build / lint / typecheck / test commands}}
{{single local verification command: lint + format + typecheck + fast tests + audit,
e.g. bash scripts/qa.sh}}
{{slow / integration test command}}
```

## Git & release workflow

<!-- Choose one profile. Protected trunk is the default when the remote supports
     required checks; solo-fast accepts that main may briefly be red. -->

- Workflow profile: {{protected trunk / solo-fast}}.
- Protected trunk: short-lived branches, PR merge, required CI, no direct push to `main`.
- Solo-fast: local verification before direct push; release refuses commits without
  green CI. Remove the profile that does not apply.
- No long-lived branches.
- Commit messages in {{language}}, present tense, naming phase/subphase when one applies.
- **Push and tag only on explicit instruction** — tags release.
- Release is by version tag only. When deployment and schema migrations apply, backup
  runs automatically before migration. Rollback or withdrawal runbook:
  [docs/runbooks/](docs/runbooks/).

## Documentation must stay current

- Any change that alters behavior, structure, or conventions updates the affected
  docs **in the same change**. Stale docs are bugs.
- Never leave a doc describing planned behavior as implemented, or vice versa.

## Domain rules that code MUST enforce

<!-- Business invariants that make the product correct, each testable.
     Get these wrong and the product is wrong. -->

- {{invariant}}

## Security & platform rules

<!-- The applicable answers to references/platform.md for this project: auth channels
     and no-bypass rule, revocation, delegated and workload identities, tamper-evidence
     anchor when required, idempotency, outbox, time handling, files, and secrets. -->

- {{rule}}

## Observability rules

- {{structured logging, correlation id, health endpoints, error tracking,
     audit-vs-telemetry separation — as decided}}

## Gotchas / easy mistakes

<!-- Living list of traps discovered while building. Append as they are found. -->

- {{gotcha}}
