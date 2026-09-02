## Classify what blocks

The reviewer reports each finding as `DEFECT` or `ADVISORY` with a severity, and reports `REVIEWED` or
`BLOCKED`. It is not told which combination blocks, so it has no threshold to aim at. The verdict is
derived outside the reviewer:

- a **blocking defect** is a `DEFECT` at `CRITICAL`, `HIGH`, or `MEDIUM`;
- `FINDINGS` means at least one blocking defect exists;
- `CLEAN` means none do, whatever low defects or advisories remain;
- `BLOCKED` means the reviewer could not review reliably.

This derived verdict describes the reviewer's result, not the loop's outcome. A defect the primary
agent then defers still made its pass `FINDINGS`, and the loop can still finish.

Every validated `DEFECT` is a bug. Severity decides whether the loop must continue, not whether the
bug is real. A validated defect then reaches exactly one of three outcomes, and "quietly left undone"
is not among them:

- **`fixed`** — repaired in this run at its root cause. Any fix requires a further review pass.
- **`deferred`** — valid, outside every declared blocking area, and recorded with its fingerprint,
  evidence, and severity in the project's debt and risk register. It neither blocks a clean outcome
  nor consumes a pass.
- **`escalated`** — valid, but fixing it crosses the authority boundary above. Stop and ask the user.

A defect inside a declared blocking area can only be `fixed` or `escalated`. Deferring one narrows the
declaration after the fact, which is exactly what settling it before pass 1 is meant to prevent.

Deferral requires the register entry, or the user's explicit decision to record nothing. Without
either it is an unrecorded defect with a disposition name attached. If the project keeps no register,
ask the user where deferred defects go; filing them in an external tracker is not authorized here.

`rejected-with-evidence` is not a fourth outcome. It means the finding was not a defect.

`ADVISORY` findings never block `CLEAN` and never justify an extra pass. Carry them in the ledger and
report them at the end so the user decides. Do not edit for an advisory during the loop: an advisory
edit adds reviewable surface without removing a defect, which is how a review loop stops converging.

One class of finding is never an advisory, whatever the reviewer called it: a finding that a check does
not detect the behavior it names, where the ledger records that same check as the mechanism holding a
fix in this run. Such a finding is a defect of the mechanism, and it takes one of the three outcomes
above. The loop validates fixes by running a check red and then green, so a mechanism that cannot fail
is not a weak test to leave with the user — it is the missing half of a fix already reported as made.
