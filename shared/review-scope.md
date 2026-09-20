## Establish the review scope

Before pass 1:

1. Read the original task, acceptance criteria, applicable repository instructions, and current
   implementation status.
2. Inspect `git status`, staged changes, unstaged changes, and untracked paths without mutating them.
3. Include every staged, unstaged, and untracked change that belongs to the original task. Let the
   reviewer inspect unchanged surrounding code needed to judge interactions.
4. Identify unrelated pre-existing user work, preserve it, and list it as excluded. If interleaved
   changes make that boundary unsafe to determine, return `BLOCKED` and ask for scope.
5. Identify derived artifacts: files a tool generates and a command reproduces, such as schema
   snapshots, lock files, build output, and generated clients. List them as a second, separate
   exclusion category, and for each path name the generator and the command that reproduces it, then
   run that command to confirm the committed artifact is what the generator produces. An artifact
   excluded without a reproducing command that actually ran is verified by nobody, so it stays in scope.
6. Record the baseline status of relevant tests or checks. Reuse current trustworthy evidence or run
   appropriate already-available checks in the primary agent. The reviewer never runs them.

Refresh the scope snapshot before every pass. The first pass assesses the complete task change.
Later passes focus on the fixes, their consequences, and interactions with the rest of the change.
Keep the complete current task diff and necessary unchanged code available: focus is not an exclusion
of previously reviewed code, and the reviewer chooses where to investigate. Renew the full assessment
when the fixes change core assumptions, architecture, contracts, or have broad or uncertain impact.

An edit to code, tests, configuration, acceptance criteria, contracts, or operational instructions
requires another independent pass. A purely administrative update may follow a clean result without
one: a completion checkbox, a link to existing evidence, or a factual summary of the review. The primary
agent must inspect that delta and confirm it changes no behavior, instruction, decision, acceptance
criterion, or verification claim beyond accurately recording an existing result. Recording a finding's
disposition already permitted by **Classify what blocks** is administrative; changing scope, policy,
acceptance criteria, or which risks the user accepts is not. If uncertain, request a pass. Report
administrative changes separately from the content the reviewer actually inspected; never claim the final bytes were reviewed.

Excluding derived content is not that kind of narrowing. Generated output is judged by regenerating it,
and a reviewer re-reading eleven thousand generated lines on every pass spends attention the authored
code needs. The exclusion covers the contents of the artifact and never the fact that it changed: the
reviewer still sees which artifacts moved and judges the generator change that moved them, so a snapshot
edited by hand past its generator stays visible.
