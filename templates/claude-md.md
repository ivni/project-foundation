<!-- Template for the project's CLAUDE.md. Translate headings into the artifact
     language. Delete guidance comments after instantiating. -->

# CLAUDE.md

Engineering guide for **{{project}}** — {{one-line description}}. This file is the
source of truth for how we build. Product details live in [docs/PRD.md](docs/PRD.md),
stack in [docs/tech-stack.md](docs/tech-stack.md), build order in
[docs/stages.md](docs/stages.md), architecture sketch in
[docs/architecture.md](docs/architecture.md), decisions in [docs/adr/](docs/adr/README.md).

> Status: {{what is implemented — by phase/subphase; what is in progress; what is
> next. Rewrite at every phase/subphase completion, in the same commit. A fresh
> session must be able to resume from this paragraph alone.}}

## Product principles (non-negotiable)

<!-- 5–7 principles from discovery, phrased so a violation is detectable.
     These shape every feature. Violating them is a bug, not a style choice. -->

- **{{Principle}}.** {{One sentence of what it means in practice.}}

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
{{single QA entry point, e.g.: bash scripts/qa.sh}}
```

## Git & release workflow

<!-- Branching model, commit-message language, deploy trigger, and agent autonomy
     boundaries. Solo defaults shown; adapt. -->

- Trunk-based: commit directly to `main`; no long-lived branches.
- Commit messages in {{language}}, present tense, naming phase/subphase when one applies.
- **Push and tag only on explicit instruction** — tags deploy.
- Deploy is by semver tag only; backup runs automatically before migrations;
  rollback runbook: [docs/runbooks/](docs/runbooks/).

## Documentation must stay current

- Any change that alters behavior, structure, or conventions updates the affected
  docs **in the same change**. Stale docs are bugs.
- Never leave a doc describing planned behavior as implemented, or vice versa.

## Domain rules that code MUST enforce

<!-- Business invariants that make the product correct, each testable.
     Get these wrong and the product is wrong. -->

- {{invariant}}

## Security & platform rules

<!-- The answers to references/platform.md for this project: auth channels,
     revocation, idempotency, outbox, time handling, files, secrets. -->

- {{rule}}

## Observability rules

- {{structured logging, correlation id, health endpoints, error tracking,
     audit-vs-telemetry separation — as decided}}

## Gotchas / easy mistakes

<!-- Living list of traps discovered while building. Append as they are found. -->

- {{gotcha}}
