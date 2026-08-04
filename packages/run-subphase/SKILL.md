---
name: run-subphase
description: Take exactly one phase subphase to done — built, verified, independently reviewed, committed — then stop.
disable-model-invocation: true
---

# Run Subphase

Take **one** subphase from a phase requirements slice to done, then stop. One invocation, one
subphase, one context window.

This skill does not loop. It never starts a second subphase, because the boundary it respects is the
reason the subphase exists: a subphase is sized to one fresh context window, and an agent carrying two
of them in one window is degraded exactly where this standard demands the most rigor. The last thing
this skill does is name the next invocation. Running that invocation is the user's action.

The contract this skill executes is not its own: [references/subphase-contract.md](references/subphase-contract.md)
defines what a subphase is and when it is done, and the project's foundation skill ships the same copy.
Read it before starting.

## What this reads

- `docs/phase-N/checklist.md` — the subphase list and the requirement traceability table.
- `docs/phase-N/scope.md` — the `REQ-P{N}-*` rows this subphase carries. **They are its whole scope.**
- `docs/phase-N/blockers.md` — open `BLK-P{N}-*`.
- `docs/glossary.md` — the language everything written here is named in.
- The agent contract — `PRINC-NNN` product principles, domain rules, the single local verification
  entry point, the recorded git profile, and the status line.
- ADRs covering the area being touched.

It does not open `docs/stages.md`. The phase is named by the user; this skill works inside it. If the
project keeps its artifacts elsewhere, take the paths from the agent contract rather than guessing.

## 1. Select the subphase

Take the lowest-numbered unticked subphase, or the one the user named. Never reorder silently.

Subphases carry no dependency edges — the number is the order. If the user names a subphase whose
predecessor is unticked, say so and ask; skipping may be deliberate, but it is not yours to decide.

## 2. Entry gate

Do not touch code until every condition below holds. A failed condition is a finding, not an obstacle
to work around: report it and stop. Building past an open condition is the exact failure the standard
forbids — unknowns are resolved before build, not discovered during it.

- `N.0` is ticked: the requirements slice exists.
- Every `REQ-P{N}-*` in scope has acceptance criteria and a planned verification method. A requirement
  with an empty verification column is not build-ready.
- No open `BLK-P{N}-*` gates this subphase.
- Every term the subphase needs is in `docs/glossary.md`. A term invented mid-build is a name nobody
  agreed to, and it will reach identifiers, tests, and commit messages before anyone notices.
- The working tree is clean, or the user has declared what to exclude. The review in step 6 reads the
  uncommitted change set, so unrelated uncommitted work would silently enter its scope.

## 3. Agree the seams before writing code

For each requirement in scope, state where its behavior will be observed, taking the seam from the
`Planned verification` column rather than inventing one. State all of them before the first line of
code: what gets tested is a decision, and deciding it while implementing means testing whatever turned
out to be easy to reach.

If a requirement's planned verification is not achievable at any real seam, that is the finding. Say
so, record it, and stop. Do not weaken the assertion to fit the seam available — a test that cannot
fail on the behavior it names is worse than a missing one, because it reports success.

## 4. Build in vertical slices

One seam, one failing test, the minimal implementation that passes it, then the next slice. Never all
tests first and all implementation after: tests written in bulk verify imagined behavior, commit you to
a test structure before you understand the implementation, and go insensitive to real change.

The requirement rows in scope are the whole scope. Something worth doing that is not among them becomes
a `BLK-P{N}-*`, a debt entry, or an out-of-scope entry — never a silent extra commit. Refactoring
adjacent code is not part of this loop; it belongs to review.

## 5. Verify

Run the project's single local verification entry point. The agent contract records it; do not assemble
your own command list, and do not stop at the subset that happens to be fast.

Then verify the change by actually running it. Passing tests and a clean typecheck are evidence about
the tests and the types.

Fill the traceability table as required by the subphase contract. Evidence is a command and its result.

## 6. Independent review

Hand the change set to an installed review loop, naming it by its exact skill identifier:

- Both loops installed: prefer the one whose reviewer runtime is not the primary host's own vendor —
  on a Claude Code host use `run-codex-review-loop`, on a Codex host use `run-claude-review-loop`. On
  Pi, OpenCode, or Hermes either is independent of the host; use `run-codex-review-loop`.
- One installed: that one.
- Neither installed: say so and stop before committing.

Invoke it however this host invokes a skill. This skill deliberately does not prescribe that syntax:
it differs per host, and a guessed invocation form fails silently.

No other review satisfies this step — not the host's own review command, not a review skill from
another suite, and not your own re-reading of the diff. Both loops are user-invoked only, so they are
the two capabilities here you cannot reach for by accident, which is why this step names them instead
of describing what they do. **A review you could have started without being told to is not the
independent review this step requires.**

The loop owns its own passes, dispositions, and derived verdict. You do not overrule that verdict and
you do not re-classify a finding to change what happens to it.

## 7. Commit

Commit only when the derived verdict permits it. A deferred defect enters the project's debt and risk
register **in the same commit**: a deferral that exists only in the loop's report is known debt without
a register entry, which violates the standard.

Follow the git profile recorded in the agent contract; do not choose a branching model here. Write the
commit message in the project's artifact language, naming the phase and subphase. Never push and never
tag — a tag may trigger a release, and releases are not part of a subphase.

## 8. Close out and stop

Tick `checklist.md`, and rewrite the agent-contract status line if this completion is externally
meaningful. Then report, in five lines:

1. what was built, by requirement ID;
2. the verification evidence, as commands and results;
3. the review outcome: passes used, findings by disposition, and the declaration the loop derived;
4. what was deferred and where it is recorded;
5. the next subphase, named — and that running it is a separate invocation.

Then stop. Do not begin it.

## When to stop early

| What happened | What to do |
|---|---|
| An unknown appeared that the slice does not carry | Record `BLK-P{N}-*` with an owner and a resolution route; stop. Do not close it by guessing |
| No correct seam exists for a requirement | Record it as a finding; stop. Do not weaken the verification to fit |
| The scope turned out to differ from `scope.md` | Stop. Requirements belong to the slice's owner, not to the executor |
| The review loop returned `BLOCKED` | Report the missing capability or context; do not commit |
| Context is filling up before done | The subphase was two. Split it per the subphase contract, commit the coherent green part, report, and stop |
| Local verification cannot pass for a reason outside this subphase | Report it with evidence; do not commit a red tree and do not disable the check |
| No review loop is installed | Say so and stop before committing |

## What this skill never does

- Open or close a phase, or create any requirements-slice file.
- Edit requirements, acceptance criteria, or planned verification in `scope.md`.
- Review its own work.
- Commit with a deferred defect that is not in the register.
- Push, tag, or release.
- Start the next subphase.
