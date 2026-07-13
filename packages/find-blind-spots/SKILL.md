---
name: find-blind-spots
description: Performs a read-only blind-spot pass over a product idea, feature brief, implementation plan, or relevant code and documentation. Use when the user asks to find blind spots, unknown unknowns, hidden assumptions, missing constraints, risky gaps, or questions that should be answered before planning or implementation. Produces an evidence-backed prioritized unknowns report; does not edit files, interview the user, choose product decisions, or implement changes.
---

# Find Blind Spots

Expose consequential unknowns before they become expensive decisions or implementation defects.
Inspect the available evidence, challenge the current framing from several perspectives, and return
a compact report that another person or skill can act on.

## Preserve the boundary

- Remain read-only. Do not create or edit project files, scratch files, plans, tickets, code,
  configuration, tests, commits, or external resources.
- Do not conduct a discovery interview. Surface the questions; do not ask them one by one.
- Do not silently decide product, UX, or architecture choices for the user.
- Do not turn absence into fact. Label missing evidence, inference, assumption, contradiction, and
  confirmed fact distinctly.
- Do not expand into implementation even when the likely fix looks obvious. Hand off the unknowns.
- Use the user's language unless they request another language.

If no subject can be identified from the request or workspace, ask only for the missing brief or
artifact and stop. This is intake, not an interview.

## Establish the analysis frame

1. Identify the decision or deliverable being protected: product direction, feature scope, UX,
   architecture, rollout, or implementation plan.
2. Read the supplied brief and the smallest relevant set of project evidence. Prefer product docs,
   architecture decisions, interfaces, schemas, tests, operational docs, and recent history over a
   broad undirected scan.
3. State the scope, evidence inspected, important evidence unavailable, and confidence level.
4. Extract explicit requirements, decisions already made, constraints, assumptions, exclusions,
   contradictions, and unresolved questions before generating new concerns.

When current external facts could change the result, verify them against primary sources if tools
and user scope permit. Cite the source and verification date in the response; never rely on recalled
versions, limits, policies, or API contracts.

## Search for blind spots

Load [references/blind-spot-lenses.md](references/blind-spot-lenses.md) and apply only the lenses
relevant to the subject. Use at least three materially different perspectives. Prefer findings that
change a decision over generic completeness observations.

For every candidate unknown, determine:

- what evidence or omission exposed it;
- which product, UX, architecture, delivery, or operational decision it can change;
- the cost if the current implicit assumption is wrong;
- whether it is reversible after implementation;
- who or what can answer it;
- the latest responsible moment to answer it;
- a safe temporary default, when one exists.

Actively search for root causes. Merge several symptoms when one upstream unknown explains them.
Keep separate findings only when they have different owners, validation methods, or decision impact.

## Route each unknown

Classify the next action instead of sending every uncertainty back to the user:

- **Agent research** — answerable from code, docs, runtime observation, logs, or primary sources.
- **Stakeholder decision** — depends on product intent, risk appetite, policy, budget, or ownership.
- **User research** — requires evidence about user behavior, comprehension, or unmet needs.
- **Experiment or spike** — requires a bounded test because analysis alone cannot reduce uncertainty.
- **Deferred with default** — cheap to reverse; record a safe default and a trigger for revisiting it.

Never describe a question as stakeholder input when the available repository or official source can
answer it. Never prescribe a spike merely to postpone reasoning.

## Prioritize by decision leverage

Use qualitative priority rather than invented scores:

- **Critical** — can invalidate the product direction, primary UX, system boundary, security model,
  data model, or rollout approach; costly or dangerous to discover late.
- **High** — materially changes scope or architecture and is not cheaply reversible.
- **Medium** — affects quality or delivery but has a workable interim default.
- **Low** — local and reversible; include only when it is unusually easy to miss or has a clear
  revisit trigger.

Within a priority, rank higher when uncertainty is high, cost of error is high, reversibility is low,
and the answer unlocks several downstream decisions. Do not calculate fake numeric precision.

## Produce the report

Return the result in the response only, using this structure:

1. **Scope and confidence** — subject, evidence, missing evidence, confidence.
2. **Executive finding** — the one to three upstream uncertainties most likely to change the work.
3. **Critical and high blind spots** — for each:
   - unknown;
   - evidence or signal;
   - why it matters now;
   - decisions affected;
   - answer route and likely owner/source;
   - safe default or containment, if any;
   - answer-by point or revisit trigger.
4. **Contradictions and hidden assumptions** — only those not already covered above.
5. **Medium and deferred unknowns** — concise; group related items.
6. **Suggested handoff** — the first decision to resolve in a discovery interview, or the first
   research action if no stakeholder decision is yet needed.

Prefer a short, high-signal report over an exhaustive checklist. A finding without evidence,
decision impact, or an answer route is not ready to include.

## Self-review before returning

- Confirm that no file or external state changed.
- Remove generic observations that would apply to almost any project.
- Check that the highest item is genuinely upstream of the rest.
- Check that confirmed decisions were not reopened without contradictory evidence.
- Check that risks, implementation tasks, and unknowns are not conflated.
- Check that every critical or high item names a resolution route.
- Check that the handoff contains a decision, not a disguised solution.
