# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Both review loops now derive the ship-blocking declaration instead of asking the user to confirm it.
  The areas follow from what the change touches, so the confirmation spent a turn restating the
  analysis that had just produced them, and in practice the answer was always the whole proposal. The
  three properties that made the declaration trustworthy are unchanged and now carry it alone: it is
  settled before pass 1 while no finding exists, an area that is unclear blocks rather than defers, and
  it is reported with the outcome beside every deferral it authorized. A declaration the user states
  themselves still replaces the derived one.
- Both review loops now accept an invocation from `run-subphase` as explicit consent. Their boundary
  previously admitted only a direct user invocation and rejected consent inferred from a request for
  implementation, which is exactly what a subphase executor would have looked like. The chain stays
  explicit: `run-subphase` is itself user-invoked only, and the review is a declared step of its
  contract.
- Marked the two review loops and the discovery interview user-invoked with
  `disable-model-invocation: true`, and cut their descriptions to a human-facing line. Each was
  spending roughly ninety words of permanently loaded context asking the model not to fire — a
  request, where Claude Code and Pi offer a switch that also keeps the description out of context
  entirely. The three skills now cost nothing until invoked.
- Pruned the `find-blind-spots` and `project-foundation` descriptions to their distinct triggers.
  Both restated behavior the body already defines, and a description is loaded on every turn.
- Declared `policy.allow_implicit_invocation` explicitly for every payload, and made
  `verify:skills` fail when `SKILL.md` and `agents/openai.yaml` disagree about invocation. Three
  payloads had already declared themselves user-invoked to Codex while remaining model-invocable on
  Claude Code and Pi; nothing could have caught that before.
- Gated discretionary ADRs behind all three of hard-to-reverse, surprising-without-context, and
  the-result-of-a-real-trade-off. The previous list of triggers was a disjunction, so any
  cross-cutting or hard-to-reverse choice qualified alone and the log filled with decisions nobody
  would have questioned. Deviations, spike outcomes, and retro-ADRs remain unconditional.
- Moved the decision-lane and resolution-route taxonomy to one canonical source under `shared/`,
  generated into each payload that needs it and checked for drift by `verify:skills`. The same
  normative list previously existed in several independently edited copies. Payloads still ship their
  own copy, because a user can install one skill without the others.

### Added

- A seventh skill, `run-subphase`, which fills the gap between a finished requirements slice and an
  existing diff. It takes exactly **one** subphase to done — entry gate, verification seams agreed
  before any code, vertical slices, evidence, an independent review loop, one commit — and then stops,
  naming the next invocation instead of starting it. It never loops: clearing context would destroy
  the state of the skill running the loop, and not clearing it would violate the one-window bound the
  subphase now carries. It creates no slice artifacts and edits no requirements; `project-foundation`
  keeps the phase boundaries and the artifacts.
- `shared/subphase-contract.md`, the single home for what a subphase is, how large it may be, and when
  it is done. `project-foundation` and `run-subphase` ship the same generated copy, so the agent that
  plans subphases and the agent that executes them cannot hold different definitions of done. Evidence
  in the traceability table is now explicitly a command and its result — "tested manually" and
  "verified" are named as non-evidence.
- A glossary to the artifact core — `docs/glossary.md` with a template, normative rules, and a place
  in the promotion order **before** every other artifact, because each one after it is written in
  those terms. Every entry records the synonyms it replaces; without them the term drifts back next
  session. The agent arrives with no memory of the previous session, so an unrecorded language is
  re-derived every time, named inconsistently in code, and paid for in context restating what the
  project already has one word for.
- The in-the-moment term challenge in `run-discovery-interview`: a term that conflicts with a settled
  one or carries two meanings is resolved in that turn, with the losing reading named. It counts as a
  clarification of the decision on the table, not a second question. The interview still writes only
  its own record; the glossary is promoted later.
- Naming findings that cite the glossary, in both reviewer contracts. A name contradicting a recorded
  term is checkable against something the project agreed, so it is reportable as an `ADVISORY`
  instead of being suppressed as taste — and stays suppressed where no term is recorded.
- An out-of-scope register (`OOS-N`) as the third table in `docs/registers.md`, with the reason and
  what would put the item back in scope. It is explicitly distinguished from a deferred default,
  which stays in scope and returns on its trigger, and from PRD non-goals, which declare the boundary
  — a rejection that moves the boundary updates both in the same change.
- Dependency edges on unknowns and phase blockers. An unknown is takeable when everything it waits on
  is closed, and the frontier is **derived** from those edges rather than stored beside them.
  Discovery, the interview, and phase slices now ask only takeable questions: answering one that
  rests on an open prerequisite produces a guess, and unwinding it later costs every decision built
  on top of it.
- `bun run sync:shared`, which regenerates payload copies of the canonical files under `shared/`.
- A sixth skill, `teach`, standing outside the engineering flow: the current directory becomes a
  stateful learning workspace with a mission, curated high-trust sources, a glossary, learning
  records, and lessons. It shares no artifacts with the other skills and does not touch a software
  project's docs. User-invoked, and preselected in the installer like the rest.
- A context-window bound on subphases. A subphase must be startable from `scope.md`,
  `checklist.md`, `blockers.md`, and the repository alone, with no conversational history, and
  finishable inside one window. The two existing sizing rules measured calendar time and commit
  count, so neither caught a slice that only a long, degraded session could finish — the case where
  the standard demands the most rigor and the agent has the least. Because a subphase is now one
  window, the twelve-subphase phase limit reads in the same unit, and the two limits cross-check.

## [1.5.0] - 2026-07-31

### Changed

- Gave a validated defect exactly three outcomes in both review-loop skills — fixed, deferred, or
  escalated — and named them in one place. Text that promised every defect gets fixed while also
  telling the loop to stop editing after a clean verdict no longer contradicts itself, and "quietly
  left undone" is explicitly not an outcome.
- Required the ship-blocking areas to be declared and user-confirmed before pass 1. Severity describes
  blast radius and likelihood and cannot describe exposure, so a defect outside every declared area is
  now deferred to the debt register instead of spending the pass budget. A defect inside a declared
  area can only be fixed or escalated, and the reviewer is never told the declaration.
- Required every fix to name the invariant it establishes and the mechanism that holds it — a test,
  type, assertion, or schema constraint. A patch that repairs N places without leaving anything that
  fails for the N+1st is now called a symptom fix regardless of its width, and a test or assertion that
  pins the invariant is exempt from the ban on adding new files and abstractions.
- Excluded derived artifacts from review contents while keeping the fact of their change in scope. Each
  excluded path must name its generator and a reproducing command that actually ran, so a generated
  snapshot no longer consumes reviewer attention on every pass while a hand-edited one stays visible.
- Removed the pass ordinal and the pass budget from the reviewer prompt. Neither is needed to review,
  and both invite holding a finding back near the end or padding an otherwise empty pass. The pass
  number remains in the result envelope as audit data.
- Removed the confirmed-clean inventory from the context packet and the reviewer contract. It was
  written by the author of the defects and told a nominally independent reviewer where not to look, so
  a wrong boundary suppressed attention exactly where the author had erred. The finding ledger and the
  fix-path list carry judgment continuity instead, and both are checkable against git history.
- Banned review provenance in code comments. Comments explain the code to a reader who never saw the
  review; the pass and finding live in git history, the phase record, and the test name.
- Made `--run-id` optional and derived it from the repository path and current commit, so passes over
  one working tree accumulate against one budget without caller discipline. Run state moved from the
  temporary directory to `$XDG_STATE_HOME/project-foundation`, expires after a day of inactivity, and
  records each pass with a working-tree digest. `SKILL.md` now states that the limit is self-applying
  and auditable rather than tamper-proof.

### Added

- Added a working-tree digest to each recorded pass. The envelope reports whether the tree changed
  since the previous pass, which makes a pass spent without an edit visible instead of silent, and
  states that the digest covers status entries and tracked-content changes only.

## [1.4.0] - 2026-07-30

### Changed

- Reworked the fix step of both review-loop skills around root causes instead of the smallest
  symptom patch. A fix must now name the root cause separately from the reported symptom, enumerate
  and record the callers, implementers, serialized forms, and tests that depend on the behavior being
  changed, and remove the cause for every dependent. Fixes may no longer add a file, public
  interface, dependency, or abstraction; a finding that needs one is escalated to the user.
- Split reviewer findings into `DEFECT` and `ADVISORY` classes. Every validated defect is fixed at
  any severity, while missing tests and maintainability concerns are reported and left to the user
  instead of driving edits that grow the reviewed surface without removing a defect. A defect at
  `CRITICAL`, `HIGH`, or `MEDIUM` blocks a clean result.
- Withheld the clean-or-findings verdict from the reviewer. Reviewers now report only `REVIEWED` or
  `BLOCKED` plus classified findings, and the wrapper derives the verdict, so the reviewer no longer
  knows which severity blocks and cannot classify to clear or trip that threshold.
- Kept full-diff re-review on every pass but added judgment continuity. The context packet now
  carries a confirmed-clean inventory and the paths each earlier fix touched, and the reviewer
  contract requires materially new evidence before re-reporting code an earlier pass cleared,
  while still re-reading it for regressions introduced through dependencies.
- Raised `schema_version` to 2 in both structured-output schemas for the new status set and the
  required finding `class`.

### Added

- Added `introduced_by_pass` to the finding ledger and a fix-regression ratio to the reported
  outcome, distinguishing fixes that create new defects from a reviewer re-deciding settled code.
- Added a required `--run-id` to both review wrappers with pass state recorded outside the
  repository, so the eight-pass budget is enforced across invocations instead of validated only as
  an argument value. Passes are admitted in sequence and a ninth pass is refused.

## [1.3.2] - 2026-07-29

### Fixed

- Declared the integer type explicitly for `schema_version` in both review-loop result schemas so
  strict structured-output validators accept them, with regression coverage for both packaged
  skills.

## [1.3.1] - 2026-07-23

### Changed

- Raised the maximum completed reviewer passes for both review-loop skills from five to eight,
  including host adapters, wrapper validation, terminal-state contracts, and boundary tests.

## [1.3.0] - 2026-07-20

### Added

- Added `run-codex-review-loop` with an explicit-invocation workflow contract, an independent Codex
  Sol/xhigh reviewer, bounded fix authority, primary-agent testing, a five-pass clean-or-blocked
  loop, host-specific enforcement notes, a deterministic Bun wrapper, and structured results.
- Added `run-claude-review-loop` with the same bounded workflow, an actual Claude Fable/xhigh
  reviewer, a Claude-tool-surface-enforced read-only and test-free allowlist, profile preflight,
  host adapters, a deterministic Bun wrapper, and structured results.

## [1.2.0] - 2026-07-14

### Changed

- Reworked Discovery Interview around a non-technical product-owner track with hard value, behavior,
  experience, business, and handoff gates; technical mechanisms now route to agent research,
  engineering synthesis, ADRs, or bounded spikes.
- Added decision lanes, resolution ownership, product value, functional and UX contracts, and
  separate engineering implications to the discovery records and Project Foundation workflow.
- Expanded the PRD contract with problem evidence, current alternatives, desired value, success
  signals, guardrails, the minimum useful outcome, primary journey, trust, recovery, and business
  constraints.

## [1.1.1] - 2026-07-13

### Fixed

- Included every registered skill's `agents`, `assets`, `references`, `scripts`, and `templates`
  resources in the npm package with npm-compatible recursive file patterns.
- Aligned package verification with the `npm pack` manifest used by the release workflow, preventing
  Bun and npm glob differences from producing a false successful release check.
- Allowed updates to repair a managed installation when its receipt payload differs from the
  packaged payload at the same version.

## [1.1.0] - 2026-07-13

### Added

- Added the read-only `find-blind-spots` skill with evidence-based prioritization and explicit
  resolution routing.
- Added the no-code `run-discovery-interview` skill with one-question decision closure and a single
  scratch-record template.
- Added suite-level rollback tests and coverage for independent skill targets and optional payload
  resources.

### Changed

- Extended the installer to select, install, update, and remove any combination of the three packaged
  skills through one registry-driven architecture.
- Standardized every payload on `packages/<skill-id>`, every managed store on
  `store/skills/<skill-id>`, and every receipt on schema 2 with a required `skillId`.
- Added an outer compensating transaction for multi-skill confirmations and scoped backup retention
  by skill, agent, and installation scope.

### Removed

- Removed schema 1 receipt support and the special `project-foundation` managed-store path. Older
  installations are treated as unmanaged content and require an explicit install conflict decision.

## [1.0.2] - 2026-07-13

### Added

- Automated verification for public Markdown links, structure, changelog state, release notes, and
  npm package documentation.

### Changed

- Migrated the GitHub Actions release workflow to npm trusted publishing with short-lived OIDC
  credentials.
- Refreshed agent compatibility sources and documented managed-link evidence separately from skill
  path support.

### Fixed

- Included the complete `docs/` directory in the npm package.
- Corrected Windows directory-junction guidance and the private security reporting channel.

## [1.0.1] - 2026-07-13

### Added

- Initial public release of the interactive Bun installer for Codex, Claude Code, Pi, OpenCode, and
  Hermes Agent.
- User and project scopes with copy and managed-link strategies.
- Transactional install, update, and remove operations with conflict previews and backups.
- Cross-platform filesystem adapters for Windows, macOS, and Linux.

### Fixed

- Canonical path handling for managed-link migrations on macOS and Windows.

[Unreleased]: https://github.com/ivni/project-foundation/compare/v1.5.0...HEAD
[1.5.0]: https://github.com/ivni/project-foundation/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/ivni/project-foundation/compare/v1.3.2...v1.4.0
[1.3.2]: https://github.com/ivni/project-foundation/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/ivni/project-foundation/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/ivni/project-foundation/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/ivni/project-foundation/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/ivni/project-foundation/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/ivni/project-foundation/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/ivni/project-foundation/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/ivni/project-foundation/releases/tag/v1.0.1
