# Decision-question quality

Use this reference to prepare and review each turn. The user should understand the decision and its
trade-offs without needing hidden context.

## Frame one decision

A strong question changes one rule, boundary, or preference. It may have several consequences but it
must not require several independent choices.

Good frames:

- Who is the first release optimized for?
- What happens when the primary action partially succeeds?
- Which system owns the authoritative status?
- What consistency guarantee does the user-visible workflow require?

Compound frames to split:

- Who is the user, what is the pricing model, and which platform launches first?
- Should we use a queue and how should retries and monitoring work?
- What data do we collect, how long do we retain it, and who can access it?

Use “why now” to expose the dependency: “This determines whether onboarding and permissions are
self-service or administrator-led.” Do not justify a question only by saying it is important.

## Design viable options

Offer two to four options that are:

- mutually intelligible and at the same abstraction level;
- materially different in behavior or trade-off;
- feasible under known constraints;
- specific enough to become a decision rule;
- neutral in wording.

Do not include a strawman. If an option is unacceptable, omit it and state the constraint. Avoid a
false binary when a deliberate hybrid is common. A custom answer may be invited, but “Other” does not
replace the obligation to present useful alternatives.

For every option include context-specific:

- **Pros:** the outcomes, risks, or constraints it handles better.
- **Cons:** the cost, limitation, operational burden, or future restriction it introduces.

Do not repeat generic claims such as “simple but less flexible” without saying what becomes simpler
and which flexibility is lost.

## Make one conditional recommendation

Recommend exactly one option. The recommendation is advice under current evidence, not a claim of
objective truth.

Use this form:

> **Recommended — Option B**, given `<known constraints>`, because `<decision-specific reasons>`.
> This assumes `<assumptions>`. I would switch to Option A if `<observable new fact>`.

Prefer recommendations that preserve optionality when evidence is weak and the cost of delay is low.
Prefer decisive constraints when ambiguity itself would spread through UX or architecture. Never
recommend an option merely because it is familiar to the agent.

## Present the turn

Use a compact structure:

```text
Decision: <one decision>
Why now: <downstream choices unlocked>

A. <option>
Pros: ...
Cons: ...

B. <option>
Pros: ...
Cons: ...

Recommended — B: <why, assumptions, switch condition>

Which option should we adopt? You may also modify one option.
```

Use a table only when it makes comparison easier and remains readable in the current interface.
Never hide trade-offs in a collapsed control.

## Interpret the answer

Translate the response into a testable rule. Examples:

- Weak: “Probably teams first.”
- Interpreted: “Release 1 optimizes onboarding, permissions, and billing for teams of 5–25; solo use
  remains possible but does not drive UX decisions.”

- Weak: “Eventual consistency is fine.”
- Interpreted: “The command may take up to 60 seconds to appear complete, but the UI must immediately
  show a pending state and prevent an accidental duplicate command.”

Ask the user to confirm the interpretation when it adds a boundary they did not state. Do not smuggle
new product decisions into clarification text.

## Check closure

Before advancing, be able to answer:

1. What exact rule did the user choose?
2. Why does it fit the user need or constraint?
3. Which meaningful alternative was rejected, and why?
4. What changes downstream because of this choice?
5. Does it conflict with an earlier decision?
6. If uncertain, what default applies and what triggers review?

If any answer is missing for a consequential decision, remain on the current topic.

## Avoid interview failure modes

- **Checklist dumping:** many questions at once optimize agent throughput, not user reasoning.
- **Premature technical choice:** choosing components before outcome, UX, and boundaries are clear.
- **Recommendation theater:** labeling an option recommended without assumptions or a switch condition.
- **Consensus by ambiguity:** accepting “both”, “it depends”, or “later” without defining the rule.
- **Silent contradiction:** updating the latest answer while leaving incompatible earlier decisions.
- **End-of-session transcription:** delaying the record update until context and rationale are lost.
- **Infinite discovery:** continuing after remaining choices are cheap to reverse.
- **Research outsourcing:** asking the user for facts available in the repository or primary docs.
- **Implementation leakage:** using a prototype or code edit to answer a question during a no-code
  discovery phase.
