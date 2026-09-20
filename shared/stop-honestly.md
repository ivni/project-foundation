## Stop honestly

A pass that produced no substantive edit needs no further pass. Determine its outcome from the
findings; unchanged code is not evidence of a clean result.

Return `Review: CLEAN` when the latest complete reviewer result leaves no blocking defect open, because
it reported none or because every one it reported was rejected with evidence, and no task-related edit
followed it except the inspected administrative updates allowed by **Establish the review scope**.
When validated defects were deferred instead, return `Review: CLEAN (N deferred)` and list
them: a clean line concealing fifteen accepted defects is the overclaim this loop exists to prevent.
Neither line says anything about whether tests passed.

Return `Review: BLOCKED` immediately when:

- the same unresolved finding repeats without the new evidence the contract requires;
- fixes oscillate or reviewer conclusions contradict without changed evidence;
- a repaired defect class keeps recurring, or fixes keep introducing substantial new defects, without
  a credible change of approach;
- no safe progress is possible;
- a valid defect crosses the authority boundary or cannot be fixed without expanding the surface;
- the task scope cannot be separated from unrelated work;
- an exact required capability is unavailable and no fallback is approved;
- reviewer output is invalid or cannot be obtained reliably; or
- pass 10 still returns `FINDINGS` or `BLOCKED`.

Do not start pass 11 without a new user instruction.

Judge convergence across the task, not only the current run-id. A reset, context compaction, or expired
wrapper state does not erase earlier findings or authorize repeating a failing approach. On a
convergence stop, briefly name the pattern and propose a concrete next step: simplify the construction,
split independently reviewable work, or resolve a disputed premise. Carry the relevant history into
any authorized continuation, state what changes in the approach, and keep unresolved blocking defects
blocking. If the user explicitly chooses to continue unchanged, explain that the reset does not resolve
the diagnosed problem and honor the instruction within the existing safety and authority boundaries.
Use the existing review record; create no separate convergence register.
