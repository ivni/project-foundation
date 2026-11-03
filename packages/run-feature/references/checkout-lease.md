<!-- Canonical source. Do not edit the generated copies under packages/*/references/. -->
# Checkout writer lease

All four updated workflows use `scripts/checkout-lease.ts` from their own installed payload. Each
copy implements the same checkout-wide protocol. It reserves one canonical checkout across phases,
features and direct execution, not merely one sidecar. Installation does not upgrade other existing
skill installations; update all four before relying on mutual exclusion. Standalone skills, old skill
versions and external tools do not participate. Inspect and stop any such writer separately.

Call the helper using Bun and a private JSON request file; do not interpolate task text into a shell
command. It accepts `{action, cwd, run_id, mode, state_path, owner?}`. `cwd` is the exact checkout
root, `run_id` a stable unique run ID, `mode` the exact skill name, and `state_path` the checkout-relative
sidecar of this run. For `claim`, `owner` identifies the real host session/process that owns the run,
not a timestamp or invented worker. Use the actual host lifecycle for later observation.

```text
bun <this-skill-root>/scripts/checkout-lease.ts <absolute-request.json>
```

Before any task implementation, sidecar reservation, worker spawn or remote update, `claim` the lease.
The sole exception is `run-feature`'s `start`: it creates its initial inactive sidecar to generate the
run ID, then must claim before `dispatch`. A claim creates `.agents/work/checkout-lease/owner.json`
under an atomic directory reservation; concurrent claims cannot both succeed. An existing directory,
including a partial one without owner data, is never replaced or expired. `assert` validates identity
without changing it. `run-feature`'s dispatch helper verifies its lease and holds the common guard
through the sidecar reservation. The other workflows hold the lease throughout their work, including
all attempts, verification and continuation; never substitute a per-sidecar lock for this lease.

After claiming and before working, inspect phase/feature orchestrator and direct sidecars for older
or unmanaged owners, including the selected run's earlier owner. A matching run ID alone does not
prove that a previous session or its children stopped. If any owner may still be active, retain the
lease and reconcile its real host status; await or stop and await the owner before proceeding. Do not
modify or discard its work. An older workflow that never took this lease must be stopped separately.
Do not let two copies of the same run use one lease concurrently. A resumed session may assert an
existing matching lease only after verifying the prior owner and owned children are terminal, or when
it is the same still-live owner recovering from context compaction. A different run cannot take over
an existing lease. Identity or state uncertainty is a blocker, never a reason to reset.

Keep the lease while any worker, command, review or task mutation remains active, including between
subphases/stages. Before `release`, persist the appropriate completed, interrupted, cancelled or
awaiting-input status, stop and await any owned executor and its descendants, and reconcile effects.
Release only the exact matching run/mode/sidecar. The helper rejects release when the sidecar is
missing, malformed, has a different run ID or an unknown status, or reports an active owner. A crash
before sidecar creation therefore needs the verified incomplete-reservation recovery below. A later
resume acquires a new lease, then repeats legacy/owner reconciliation before work. If process/session
state cannot be established, preserve the lease and report the exact blocker.
Never use age, lack of UI activity or a failed command as proof of termination.

The helper serializes claim, release and dispatch reservations using
`.agents/work/checkout-lease.guard`. A crash can leave that guard, a partial lease, or a lease whose
owner disappeared. Its `owner.json` records the helper PID when initialization succeeds; a PID alone
does not prove identity after reuse. If a live helper owns the guard, wait for it to finish and retry.
Do not automatically remove any leftover guard or lease. Inspect the actual owner and all child
processes/host sessions and preserve sidecars first; only after establishing terminal state may the
appropriate owner perform the recorded release or a safe recovery remove an incomplete
lease or leftover guard. Preserve evidence; never recursively clean unrelated metadata. These paths
are workflow metadata: inspect and exclude only these exact administrative files where permitted;
never exclude implementation, tests or authored requirements. Do not change shared ignore rules.
