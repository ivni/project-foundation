# Orchestration state and result protocol

The parent owns `.agents/work/features/<feature-id>.orchestrator.json`; the executor alone writes
the existing feature record. Neither stores another plan. The live issue supplies ordered stages.
Use the bundled helper with an argument file (no interpolated shell snippets):

```sh
bun /absolute/run-feature/scripts/orchestrator.ts /absolute/request.json
```

A request is `{action, cwd, state_path, input}`. `cwd` is the exact checkout root; `state_path` is the
project-relative sidecar. JSON responses are persisted state; a failed guard leaves prior state
intact. Bun is required for this helper; never install it silently. Safe paths reject traversal and
escaping symlinks. Atomic sibling rename and a short exclusive directory lock serialize mutations.
A leftover lock requires inspection of the owning helper process before removal; it never expires.
An active child is separately reserved in the sidecar and must be awaited/stopped, regardless of age.

## Issue and state inputs

Normalize a just-fetched issue as `{repository, issue_url, body, open, stages}`. Keep the original
feature marker in `body`. Each ordered stage is `{id, done, contract_sha256, result?}`; `result` is
`{commit_sha, ref}` from a read-back stage result. `contract_sha256` hashes the stage's scope/criteria/
methods with checkbox state normalized, excluding progress comments. Use identical normalization
on every read. A changed hash stops dispatch/completion for inspection; reconcile a real contract
change explicitly in the existing record with an explanation, never weaken criteria for a pass.
This normalized input is transient task data, not another persisted authoritative plan. Bind it to
the actual forge read and inspect the real content; the helper is not an authenticated forge client.

- `start`: input `{feature_state_path, issue}`. Run only once after selection/preflight; an existing
  sidecar must be restored. It pins feature/repository/issue/base/checkout and assigns `run_id`.
- `dispatch`: input `{issue}`. Resume a recorded stage/checkpoint before selecting the first undone
  one. Verify earlier stage results/ancestry; reserve an attempt before spawning. A committed checkpoint
  pins `recovery_commit`; verified recovery reuses that SHA even after unrelated descendant commits.
  Inspect descendant changes and re-establish evidence if they affect the stage; never duplicate its commit. Response includes
  `stage_id`, `active.attempt_id`, `starting_head`, `run_id`, `contract_sha256`. If all stages are done,
  it returns `implemented`; the parent must also verify feature-wide criteria and evidence.
- `bind`: input `{attempt_id, handle}` after successful spawn. Save the real handle immediately.
  If dispatch/spawn outcome is uncertain, inspect actual host children before another spawn.
- `settle`: input `{result_ref, terminal: {attempt_id, handle, stopped: true}, issue?}`. The terminal
  observation must come from the real host (use handle null only after proving reserved spawn never
  created a child). `issue` is mandatory for completion. Results must be saved within the checkout.
- `stop`: input `{reason: "cancelled" | "interrupted", diagnosis}`. Persist before cancelling. Explicit cancellation takes precedence over later interruption. Active
  ownership remains until terminal observation and `settle`; do not send another worker early.
- `resume`: blocked input `{answer, sufficiency}` after the parent researches/verifies that answer;
  cancelled input `{explicit_resume: true}` only on explicit user request; interrupted input `{}`
  after reconciliation. Preserve stage identity, review and committed-result recovery.
- `review-cycle`: input `{diagnosis, approach}` after settling `review-exhausted`. Append a new run
  to the referenced ledger only after its last run is terminal exhausted/disputed/non-converged.
  Carry every finding/disposition, fix, tested state and earlier run unchanged. A task-wide ledger
  lives under `.agents/work/features/`, including its resolved symlink target, and must carry this
  `feature_id`. Existing ledgers can be adopted without losing their original fields/history. Required
  `runs` and `findings` are arrays. Runs have `run_id`, `stage_id`,
  `completed_passes`, `terminal`, `reason`. Findings have `blocking` and `disposition`. Mark a run
  terminal after a bounded stop. An exhausted run has exactly ten completed passes. Native review
  pass counts are primary-agent bookkeeping; the external wrapper also enforces its own budget.

## Fresh worker packet

Provide: delegation authorized by the current user-started `run-feature`; pinned `schema: 1`, feature/
repository/issue/base/checkout, `run_id`, `attempt_id`, selected `stage_id`, exact stage and review skill
paths, sidecar/feature-record paths, result destination, existing review/checkpoint pointers, narrower
user/repository constraints and explicit fallback approvals. Include an answer if one was verified.
Do not copy earlier implementation conversation, stage lists, full logs or suspected reviewer findings.
The worker loads prior findings from the actual ledger and gives neutral task context to the reviewer.

Read `run-feature-stage` and execute exactly this stage. Recovery of an existing committed-awaiting-
issue checkpoint consumes the worker's stage; publish only missing operations with marker/SHA lookup
and verified readback. No duplicate commit, implementation, upload or comment. Standalone stage
invocation keeps its one-stage stop. An orchestrated executor returns to the parent after one stage
or a bounded review stop; the parent decides continuation, never the child skipping to another stage.

## Result and evidence

Persist a JSON result before returning its short path/summary:

```json
{
  "schema": 1,
  "feature_id": "example-feature-1234",
  "repository": "https://forge.example/group/repo",
  "issue_url": "https://forge.example/group/repo/issues/1",
  "base_commit": "0000000000000000000000000000000000000000",
  "checkout": "/absolute/checkout",
  "run_id": "parent-run-id",
  "attempt_id": "reserved-attempt-id",
  "stage_id": "S1",
  "outcome": "stage-complete",
  "commit_sha": "1111111111111111111111111111111111111111",
  "checks_ref": ".agents/work/features/S1-checks.json",
  "review_ref": ".agents/work/features/S1-review.json",
  "review_run_id": "review-run-id",
  "issue_result_ref": "persisted-stage-result-reference"
}
```

Checks evidence: `{tree, passed: true, commands: [...], log: projectRelativePath}`. Review evidence:
`{tree, verdict: "CLEAN", run_id, passes, ledger: projectRelativePath}`. `tree` is the staged tree from
`git write-tree` after all authored changes are staged; it must equal the resulting commit tree.
Stage only agreed paths. Capture check/review applicability before commit; staging is not proof that
checks or review happened. Save actual command logs and reviewer envelopes referenced by the ledger.
For a deferred finding, preserve its fingerprint and attach `deferral` with
`outside_blocking_areas: true`, a concrete `reason`, `record_ref` and `readback_verified: true` after
actual verification. For a local register also attach the exact relevant `entry` text, including
its fingerprint: that entry must occur in both the stage commit and current register. Unrelated
register additions do not invalidate recovery; inspect consequential entry changes. Issue/register
URLs retain comment/note fragments and require the parent's actual readback. An impermissible or unrecorded deferral
cannot pass. The parent inspects these artifacts, coverage, deferrals and contract applicability; booleans alone
are insufficient. Record permitted deferrals in the project register/feature issue as required by
review policy; extra ledger history survives continuation. Administrative state changes may follow
clean review only under the existing loop rule.

Other outcomes use the same identity fields, `outcome`, and `diagnosis`:
`retryable-error`; `review-exhausted` also has `review_ledger`; `needs-user-input` has `question` and
`sources_checked`; `interrupted`. Preserve remaining work and evidence pointers in the feature
checkpoint. A diagnosis explains what happened and side effects; a required question explains why
available sources cannot provide the fact. Do not convert an invalid reviewer result to clean.

If the result is missing/malformed/stale or completion guards reject it, preserve the original output,
inspect host/Git/feature/issue and create a factual `retryable-error` result for the reserved identity.
The parent may normalize an observed failure, never fabricate checks, commit or completion evidence.
Then settle the terminal owner and diagnose a fresh attempt of the same stage. A real missing fact
uses `needs-user-input`. Review budget/dispute/no progress alone uses review continuation.

Re-read the sidecar after parent compaction instead of relying on memory. Resume any active owner
before touching selection. Carry only the fixed identity, current action/stage, short result and
review pointers. The active-feature pointer cannot silently retarget this run.
