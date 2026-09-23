# Apply selected test proposals

Enter this mode only after a separate explicit user command selecting proposals from an existing
Analyze Tests report. Selection is authorization for those changes and their necessary local checks.
Do not ask for the same authorization again when the report, selection, and scope are clear.

1. Recover the selected IDs, evidence, dependencies, and acceptance criteria. Check the current tree
   and relevant test/CI configuration against the report's state. Preserve unrelated user changes.
   Refresh stale evidence locally. If a proposal no longer holds, report it and leave that item
   unapplied. An investigation item authorizes its described investigation, not an assumed outcome.
2. Execute in dependency order. If a selected item requires an unselected proposal or an unresolved
   policy, ask only about that missing dependency and continue independent selected work. Do not
   interpret "apply all" as permission to silently resolve open policy decisions, lower mandatory
   gates, access live data, or purchase CI capacity.
3. Establish a relevant baseline with existing checks and available timings before edits. For speed
   comparisons, preserve command, runtime, machine/resources, worker count, workload, and cache state
   except for the variable being changed. Use a small justified number of runs, report variability,
   and stop extra measurements when they will not change the conclusion. Mark unavailable baselines.
4. Make bounded, reviewable changes. Before deleting a test, verify its retired requirement or the
   retained check that detects the same failure under the relevant conditions, including environments,
   triggers, frequency, and blocking status. A loss of timely or blocking protection needs an explicitly
   selected policy tradeoff. If the requirement remains supported and this is its only protection,
   replace that protection first; a retired requirement needs no replacement test. Do not remove
   failures or weaken assertions to obtain a green or faster run.
5. Validate correctness and performance separately. Run affected checks and required repository gates.
   For parallelism, check discovery, unique resource names, cleanup, failure propagation, and combined
   results; use bounded repeat or order variation where shared-state risk warrants it. For caching or
   fixture reuse, check invalidation and state reset. Do not claim an unrun remote CI path is verified.
6. Compare like-for-like results and account for changes to test count or tested scope. If correctness
   regresses, repair within the selected scope or undo only your own failed change. If a change selected
   for speed demonstrably worsens the target metric, improve it within scope or undo it; retain that
   tradeoff only for an already agreed other benefit and explain it. Do not keep an optimization solely
   because one run was faster. Where performance evidence remains inconclusive, report that explicitly
   and distinguish implemented changes from demonstrated speedups.
7. Return selected IDs with status, changed files, retained protection, validation results, measured
   before/after results or limitations, and unresolved items. Do not apply the next unselected item,
   commit, push, or publish without separate authorization.
