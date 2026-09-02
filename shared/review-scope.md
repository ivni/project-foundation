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

Refresh the scope snapshot before every pass. The current complete task diff is always reviewed, not
only the files changed by the last fix. Narrowing the reviewed surface would hide the regressions this
loop exists to catch.

Excluding derived content is not that kind of narrowing. Generated output is judged by regenerating it,
and a reviewer re-reading eleven thousand generated lines on every pass spends attention the authored
code needs. The exclusion covers the contents of the artifact and never the fact that it changed: the
reviewer still sees which artifacts moved and judges the generator change that moved them, so a snapshot
edited by hand past its generator stays visible.
