# Practices and ideas for the current decision

Research should make the interview more useful: show the participant a well-considered way their
product could work, not a list of famous products or a generic catalogue of best practices.

## Find relevant evidence

- Start from the known user problem, journey, and constraints. Search internationally, including
  English-language sources where useful, rather than limiting the scan to the interview language or
  local competitors. Consider adjacent domains when they solve the same underlying problem.
- Use available web search and retrieval tools to inspect current sources. Prefer first-party
  product documentation, published design systems, standards, research, and documented case studies.
  Read the supporting page; a search snippet or remembered example is not verification.
- Compare a small, relevant set of approaches. Stop when more searching is unlikely to change the
  options or recommendation. Scale effort to the decision; do not run a market survey by default.
- Record the source link, date checked, and the precise observation it supports. A vendor's claim
  or a product's existence does not establish effectiveness, universal adoption, or fit here.
- If web research is unavailable or the user forbids it, say so, record the limitation, and continue
  with available evidence and clearly labeled hypotheses. Do not invent citations or describe
  remembered patterns as freshly verified practices. Route a consequential evidence gap explicitly.
- Keep searches free of confidential project details; describe the general problem instead.

## Select and adapt

For each promising approach, judge its fit to the actual audience, frequency of use, product stage,
existing behavior, accessibility, operating constraints, budget, and agreed scope. Use the relevant
criteria rather than turning this list into more questions.

Distinguish three things: what the source demonstrates, what you infer from it, and what you propose
for this task. Original combinations and creative ideas are welcome; label them as proposals or
hypotheses rather than claiming they are established practice. Explain what evidence would validate
their value. External examples do not substitute for evidence about this product's own users.

Translate a selected idea into a short, tangible scenario: who encounters it, when, what they see or
do, and how it helps. Name the meaningful downside, added work, or condition under which it would
not fit. Prefer the smallest useful adaptation over copying another product's entire feature set.
Keep engineering mechanisms out of the product track.

## Weave ideas into the interview

Usually present one or two strong ideas relevant to the decision at hand. This is a guide to keeping
the turn readable, not a quota. Explain each in the participant's language, with a source link near
the supported observation. For example, use this shape without inventing a real-world attribution:

> **Useful idea for this task:** when someone returns after an interrupted form, show their saved
> draft, when it was saved, and a clear choice to continue or start over. This could reduce repeated
> entry for your field staff. The trade-off is retaining unfinished data and making its lifetime clear.
> **Basis:** [inspected source and its actual observation]; the scenario above is our adaptation.

Fold the idea into the current options and their single conditional recommendation. Do not tack on
“shall we also add this?” as a second question. If an idea requires a separate stakeholder decision,
record it as proposed and route it through the existing gates when its prerequisites are known.
Respect rejections and non-goals; novelty or a famous precedent alone does not justify reopening them.

## Preserve evidence without turning suggestions into scope

Use the record's practices-and-ideas section; add it in place when resuming an older record. Give
ideas stable `IDEA-NNN` IDs, preserve source observations and adaptations separately, and record their
disposition. Only explicit acceptance or delegation to the stated recommendation makes an idea part
of a `DEC-NNN`. Rejected and deferred ideas retain their rationale or revisit trigger.

At handoff, keep adopted ideas traceable to decisions and sources. Leave useful unaccepted ideas
clearly optional, with no implementation obligation. Do not keep interviewing merely to dispose of
every inspiration item; route consequential uncertainty using the normal closure rules.
