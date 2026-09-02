## Declare what blocks shipping before pass 1

Severity describes blast radius and likelihood. It cannot describe exposure, so a defect in code no
consumer reaches yet scores the same as a defect in a permission check. Left at that, the loop spends
its whole budget on defects nobody had to fix now and stops with the ones that mattered still open.

So before pass 1, derive the areas in which a defect in this change set must block shipping, one
reason each. The areas are subject matter, not severity: access and visibility, data loss or
corruption, audit integrity, secret handling, exactly-once writes, and whatever else this particular
change can break. "Everything at `MEDIUM` and above" is not a declaration, it is the absence of one.

Derive it; do not ask. The areas follow from what the change touches, so a confirmation question
spends a turn restating the analysis that just produced them. A declaration the user states or
narrows themselves replaces the derived one.

Deriving it unilaterally is safe only because of three constraints, and none of them may be relaxed:

- **Settle it before pass 1**, while no finding exists. A declaration written before the findings
  cannot be shaped to excuse one. Fix it once; it is not widened or narrowed mid-run.
- **When it is unclear whether an area blocks, it blocks.** The uncertain call goes to fixing, never
  to deferring.
- **Report the declaration with the outcome**, beside every deferral it authorized. Nobody was asked
  in advance, so the report is where the user sees what shipped unfixed, and every deferral carries
  its register entry with fingerprint, evidence, and severity.

Without a derivable declaration every blocking defect must be fixed or escalated; a missing
declaration is not permission to defer.

The reviewer is never told any of it. A reviewer that knows which areas block
has a threshold to aim at, which is the distortion the derived verdict already exists to remove, so
the declaration is applied only by the primary agent when it dispatches a validated defect.
