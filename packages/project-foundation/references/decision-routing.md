<!-- Canonical source. Do not edit the generated copies under packages/*/references/. -->
# Decision lanes and resolution routes

Every unknown carries one decision lane and one resolution route. The lane says which kind of
judgment the unknown belongs to; the route says what actually resolves it. Assign both before
deciding whether to put the unknown to a person.

## Decision lanes

Assign exactly one primary lane.

- **Product value** — problem evidence, audience, current alternative, desired outcome, success,
  guardrails, adoption, and incentives.
- **Functionality and domain** — capabilities, business rules, lifecycle, permissions, scope, and
  non-goals.
- **User experience** — primary journey, first and repeat use, comprehension, trust, failure,
  recovery, accessibility, and environment.
- **Business constraint** — policy, ownership, budget, timing, legal or commercial constraints, and
  risk tolerance.
- **Engineering** — architecture, data representation, interfaces, infrastructure, migration, and
  local implementation choices.

## Resolution routes

- **Stakeholder decision** — depends on product intent, policy, priority, budget, ownership, or risk
  appetite, and falls within the deciding person's authority.
- **Agent research** — answerable from code, docs, runtime observation, logs, or primary sources.
  Retrieve the fact instead of asking a person for it.
- **User research** — requires evidence about user behavior, comprehension, or unmet needs. Record
  the evidence need and an interim default.
- **Engineering synthesis** — the agent chooses or recommends the mechanism from the agreed product
  constraints, normally recording a contested or hard-to-reverse result in an ADR.
- **Experiment or spike** — requires a bounded test because analysis alone cannot reduce the
  uncertainty. Record the validation need and its bound.
- **Deferred with default** — cheap to reverse. Record a safe reversible default and an observable
  trigger for revisiting it.

## Keep the premise upstream of the mechanism

When a technical mechanism depends on an unresolved product, domain, UX, or business rule, record
the upstream rule as the unknown and the mechanism as its downstream implication. Rank the premise
above the mechanism it serves; a costly engineering choice does not promote itself past the product
question it waits on.

Ask a person for the observable consequence, not the mechanism. Whether a missing value means "not
applicable", "not known yet", or "optional" is a stakeholder decision; whether that becomes a
nullable column, a subtype table, or another representation is engineering synthesis.

## Route correctly

- Route to agent research whenever the repository or an official source can answer it, and cite the
  source with its verification date.
- Route to user research rather than asking a stakeholder to guess how users behave, what they
  understand, or what they would want.
- Route to engineering synthesis rather than asking a non-technical stakeholder to select a schema,
  index, framework, API pattern, infrastructure component, or migration mechanism — including when
  the choice is expensive or hard to reverse.
- Route to a spike only when a bounded test reduces the uncertainty; a spike is not a way to
  postpone reasoning.
- Route to a deferred default only with both the default and its revisit trigger recorded. "Later",
  "TBD", and "we will see" do not resolve an unknown.
