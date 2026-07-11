# Working with the AI agent

This method assumes the code is built by an AI agent working with (and for) a solo
engineer. That changes what documentation is *for* and adds rules that a human-only
team would not need. These rules belong in every project's `CLAUDE.md` (adapted), and
the agent executing this skill follows them itself.

## Docs are the agent's memory

- Chat context dies with the session; **anything worth remembering across sessions
  lives in the docs** — decisions in ADRs, state in the status line, traps in gotchas,
  open questions in blockers/registers. "I'll remember" is always false.
- Record answers and decisions into artifacts **at the moment they land**, not in a
  batch "afterwards" — afterwards is after the context is gone.
- The `CLAUDE.md` **status line** is the agent's resume point: it must let a fresh
  session reconstruct where the project stands without re-reading history.

## Truth discipline

- **Never invent or recall version numbers, API signatures, or config keys.** Verify
  against official documentation at the moment of use; record the verification date in
  `tech-stack.md`. This is the single most common way an agent silently corrupts a
  project.
- **Verify by running, not by inference.** Tests and typecheck passing is not evidence
  that the feature works; exercise the real flow (run the app, hit the endpoint, click
  the screen) before claiming "done". Report failures faithfully — a red test reported
  as red is progress; a red test glossed over is sabotage.
- When a doc contradicts the code, the code is the fact and the doc is the bug — fix
  the doc, and check what else trusted it.

## Autonomy boundaries

Define these in `CLAUDE.md` explicitly. The hard defaults:

Proceed without asking:
- reading anything; local edits; local commits; running QA and tests; scaffolding
  inside the agreed scope.

Only on explicit instruction, each time:
- `git push` (publishing) and **tagging** (tags deploy);
- deploys, migrations against real data, destructive operations;
- any external side effect (sending, posting, creating resources outside the repo).

One approval is not a standing approval. When in doubt, the action is external.

## Subagents

- Use cheap/fast subagents for **inventory and scouting**: file mapping, occurrence
  hunting, doc reading in audit mode. Design, synthesis, and writing stay with the
  main agent — a gap analysis is judgment, not grep.
- Give subagents self-contained prompts (they see no chat history) and treat their
  output as leads to verify, not facts.

## Discovery technique

- Absorb first (brief, code, docs), interrogate second.
- Maintain an explicit unknowns list; ask **one question at a time**, most impactful
  first; each question offers concrete options with a recommended default.
- Batch only trivia. Stop asking when remaining unknowns are cheap to reverse — park
  those as blockers/register entries with a named default instead.

## Session hygiene

- Start of session: read `CLAUDE.md`, the status line, the current phase's checklist
  and blockers. End of meaningful work: status line and checklist updated, so the next
  session (or the next model) resumes cleanly.
- Long tasks: prefer finishing a subphase over leaving three half-done; a committable
  increment with updated docs beats uncommitted breadth.
