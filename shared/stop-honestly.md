## Stop honestly

A pass that produced no edit ends the loop, because a further pass would read identical code.

Return `Review: CLEAN` when the latest complete reviewer result leaves no blocking defect open, because
it reported none or because every one it reported was rejected with evidence, and no task-related edit
followed it. When validated defects were deferred instead, return `Review: CLEAN (N deferred)` and list
them: a clean line concealing fifteen accepted defects is the overclaim this loop exists to prevent.
Neither line says anything about whether tests passed.

Return `Review: BLOCKED` immediately when:

- the same unresolved finding repeats without the new evidence the contract requires;
- fixes oscillate or reviewer conclusions contradict without changed evidence;
- no safe progress is possible;
- a valid defect crosses the authority boundary or cannot be fixed without expanding the surface;
- the task scope cannot be separated from unrelated work;
- an exact required capability is unavailable and no fallback is approved;
- reviewer output is invalid or cannot be obtained reliably; or
- pass 10 still returns `FINDINGS` or `BLOCKED`.

Do not start pass 11 without a new user instruction.
