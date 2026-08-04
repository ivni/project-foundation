# Working with the AI agent

This method assumes the code is built by an AI agent working with (and for) a solo
engineer. That changes what documentation is *for* and adds rules that a human-only
team would not need. These rules belong in the selected agent contract (adapted), and
the agent executing this skill follows them itself.

## Docs are the agent's memory

- Chat context dies with the session; **anything worth remembering across sessions
  lives in the docs** — decisions in ADRs, state in the status line, traps in gotchas,
  open questions in blockers/registers. "I'll remember" is always false.
- When writes are authorized, record answers and decisions into artifacts **at the
  moment they land**, not in a batch "afterwards". In read-only work, retain them in
  the report without writing project files.
- During bootstrap, before canonical artifacts exist, `docs/discovery.md` is the
  landing place. Record product value, functional and UX intent, resolution routes, and derived
  engineering implications separately. Once high-impact stakeholder unknowns close and technical
  unknowns are resolved or contained with an owner, method, and interim default, promote each answer
  into its canonical destination and mark discovery complete; do not maintain it as a parallel
  authority.
- The agent contract's **status line** is the resume point: it must let a fresh
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
- Treat each source as evidence about a different layer: docs record intended behavior,
  decisions, and process; code records the current implementation; runtime observation
  records what the system actually does. When they disagree, determine the intended
  state from the brief, ADRs, tests, history, and user direction, then fix the incorrect
  layer. If intent is ambiguous or changing behavior would be risky, report the mismatch
  and ask rather than silently choosing a winner.

## Autonomy boundaries

Define these in the agent contract explicitly. These are MUST boundaries:

Proceed without asking only inside the user's agreed write scope:
- reading anything; local edits; local commits; running local verification and tests; scaffolding
  inside the agreed scope.

If the user requests read-only work, do not edit, scaffold, record artifacts, or commit;
return findings and proposed changes only.

Only on explicit instruction, each time:
- `git push` (publishing) and **tagging** (tags release, publish, or deploy);
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
- Assign every unknown a decision lane and a resolution route, per
  [decision-routing.md](decision-routing.md), before deciding whether to ask about it.
- Record what each unknown waits on, and ask only the takeable ones — those whose prerequisites
  are closed. The frontier is derived from those dependencies, never stored beside them.
- Sharpen the language as it lands. When a term the user reaches for conflicts with a recorded
  term or carries two meanings, say so in that turn and settle it — "your glossary defines
  cancellation as X, but you seem to mean Y". A term settled in conversation and not written down
  is lost with the session.
- Default to a non-technical product-owner track. Ask **one stakeholder-owned question at a time**
  through value, behavior, experience and business, then handoff gates; each question offers
  plain-language options with a recommended default.
- Ask for outcomes, observable behavior, policy, priorities, budget, timing, and risk tolerance. Do
  not ask the user to select a schema, framework, API pattern, index, migration mechanism, or other
  implementation choice unless they explicitly requested technical collaboration.
- Translate product and UX decisions into engineering constraints after the stakeholder gate. Let
  the agent research facts, apply safe reversible defaults, prepare ADRs, and propose spikes.
- Batch only trivia. Stop asking when remaining stakeholder decisions are cheap to reverse or every
  unknown has the correct route, owner or source, interim default, and revisit trigger.

## Session hygiene

- Start of session: read the agent contract, its status line, the current phase's checklist
  and blockers. End of meaningful work: status line and checklist updated, so the next
  session (or the next model) resumes cleanly.
- Long tasks: prefer finishing a subphase over leaving three half-done; a committable
  increment with updated docs beats uncommitted breadth.
