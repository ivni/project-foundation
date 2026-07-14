# Decision-question quality

Use this reference to prepare and review each turn. The participant should be able to decide from
their product, domain, UX, business, or explicitly requested technical expertise without hidden
context or an implementation lesson.

## Check whether the question belongs to the participant

Ask a question only when every statement below is true:

1. The answer depends on intent, policy, priority, budget, timing, risk tolerance, or another choice
   within the participant's authority.
2. Available code, documents, runtime evidence, research, or primary sources cannot answer it.
3. A safe reversible default would not close it well enough.
4. The answer changes value, observable behavior, business rules, UX, external constraints, or an
   explicitly requested technical direction.
5. The viable options can be understood at the participant's decision level.

If any statement is false, route the unknown to agent research, user research, engineering
synthesis, a future spike, or a deferred default. Do not reward a question for being technically
consequential when the participant should not own the mechanism.

## Frame one decision

A strong question changes one stakeholder-owned rule, boundary, priority, or preference. It may have
several consequences but must not require several independent choices.

Good product-track frames:

- Who is the first release optimized for, and which audience is secondary?
- What minimum result makes the first use worthwhile?
- What should a person see and be able to do after a partial failure?
- Does a missing domain value mean “not applicable,” “unknown yet,” or “optional”?
- Which outcome signals success, and what must not worsen while pursuing it?

Frames to route away from a non-technical participant:

- Should the missing value use a nullable column or a subtype table?
- Should retries use a queue or an in-process loop?
- Which database, framework, index, component boundary, or migration pattern should we use?
- What consistency mechanism should enforce the workflow?

Ask about the observable requirement behind those mechanisms. For example, replace “Which
consistency model?” with “May a completed action appear pending for up to 60 seconds, and what must
the user see during that time?” Let engineering select the mechanism later.

Compound frames to split:

- Who is the user, what is the pricing model, and which platform launches first?
- What can an editor change, who approves it, and how long is history retained?
- What data do we collect, how long do we retain it, and who can access it?

Use “why now” to expose a stakeholder dependency: “This determines whether onboarding and
permissions are self-service or administrator-led.” Do not justify a question only by naming the
schema, API, or migration it will unlock.

## Match the participant's decision level

- Default to plain product and domain language. Do not infer technical fluency from repository access
  or the user's ability to repeat an identifier.
- Name the user-visible, operational, cost, timing, or risk consequence before any mechanism.
- Keep option titles free of implementation patterns in the product track.
- Explain an unavoidable technical term in one sentence and show its observable consequence.
- Use technical options only in an explicitly requested technical track and only after the product
  and UX constraints they serve are clear.
- If the participant says “I am not technical,” treat that as a routing constraint, not a request for
  a longer technical explanation.

## Design viable options

Offer two to four options that are:

- mutually intelligible and at the same stakeholder decision level;
- materially different in behavior, value, policy, scope, cost, timing, or risk;
- feasible under known constraints;
- specific enough to become a decision rule;
- neutral in wording.

Do not include a strawman. If an option is unacceptable, omit it and state the constraint. Avoid a
false binary when a deliberate hybrid is common. A custom answer may be invited, but “Other” does
not replace the obligation to present useful alternatives.

For every option include context-specific:

- **Pros:** the user or business outcomes, risks, or constraints it handles better.
- **Cons:** the lost value, added burden, policy consequence, cost, delay, or future restriction it
  introduces.

Do not repeat generic claims such as “simple but less flexible” without saying what becomes simpler,
for whom, and which future behavior becomes harder.

## Make one conditional recommendation

Recommend exactly one option. The recommendation is advice under current evidence, not a claim of
objective truth.

Use this form:

> **Recommended — Option B**, given `<known evidence and constraints>`, because
> `<decision-specific reasons>`. This assumes `<assumptions>`. I would switch to Option A if
> `<observable new fact>`.

Prefer recommendations that preserve optionality when evidence is weak and the cost of delay is low.
Prefer decisive product rules when ambiguity itself would spread through behavior or UX. Never
recommend an option merely because it makes the implementation familiar or convenient.

## Present the turn

Use a compact structure:

```text
Decision: <one stakeholder-owned decision>
Why now: <product, UX, business, or external-constraint choices unlocked>

A. <option in participant language>
Pros: ...
Cons: ...

B. <option in participant language>
Pros: ...
Cons: ...

Recommended — B: <why, assumptions, switch condition>

Which option should we adopt? You may modify one option or delegate to the recommendation.
```

Use a table only when it makes comparison easier and remains readable in the current interface.
Never hide trade-offs in a collapsed control.

## Interpret the answer

Translate the response into a testable product, UX, business, or domain rule without inventing an
implementation choice.

Examples:

- Weak: “Probably teams first.”
- Interpreted: “Release 1 optimizes onboarding, permissions, and billing for teams of 5–25; solo use
  remains possible but does not drive UX decisions.”

- Weak: “A little delay is fine.”
- Interpreted: “The action may take up to 60 seconds to appear complete, but the UI must immediately
  show a pending state and prevent an accidental duplicate action.”

- Weak: “SFP has no index.”
- Interpreted: “For the SFP scheme, an index is not applicable rather than temporarily unknown; users
  never enter or see it, and integrations must reject one if supplied.”

Record database, API, migration, or infrastructure consequences under engineering implications, not
inside the stakeholder's decision. Ask the user to confirm an interpretation when it adds a boundary
they did not state.

## Check closure

Before advancing, be able to answer:

1. What exact observable rule, priority, or boundary did the participant choose?
2. Why does it fit the user value, evidence, policy, or constraint?
3. Which meaningful alternative was rejected, and why?
4. What changes downstream for the product, UX, or business?
5. Which engineering implications were derived but not presented as stakeholder-approved mechanisms?
6. Does the decision conflict with an earlier decision?
7. If uncertain, what default applies and what triggers review?

If a stakeholder-owned answer is missing, remain on the topic. If the missing answer belongs to
research or engineering, reroute it instead of extending the interview.

## Avoid interview failure modes

- **Checklist dumping:** many questions at once optimize agent throughput, not user reasoning.
- **Technical gravity:** a costly engineering choice outranks unresolved product value or UX.
- **Mechanism delegation:** the participant is asked to choose a schema, framework, API pattern, or
  migration rather than the rule it must satisfy.
- **Jargon translation theater:** technical options stay unchanged but receive longer explanations.
- **Opinion as research:** a stakeholder is asked to guess user behavior, comprehension, or demand.
- **Premature technical choice:** components are chosen before outcomes, UX, and boundaries are clear.
- **Recommendation theater:** an option is labeled recommended without assumptions or a switch
  condition.
- **Consensus by ambiguity:** “both,” “it depends,” or “later” is accepted without defining a rule.
- **Silent contradiction:** the latest answer overwrites an incompatible earlier decision.
- **End-of-session transcription:** record updates wait until context and rationale are lost.
- **Infinite discovery:** questions continue after remaining choices are cheap to reverse or correctly
  routed.
- **Research outsourcing:** the participant is asked for facts available in the repository or primary
  sources.
- **Implementation leakage:** a prototype or code edit is used during a no-code discovery phase.
