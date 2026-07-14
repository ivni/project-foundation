<!-- Template for docs/PRD.md. A living document: phase slices refine it. When code or
     runtime diverges, determine intent first: update the PRD only if intent changed;
     otherwise fix the implementation. Never rewrite the PRD to legitimize a defect. -->

# PRD — {{project}}

## Problem and evidence

{{What hurts today, for whom, how often or severely, and what evidence supports the problem. State
which points are confirmed, assumed, or still need user research. 2–4 paragraphs.}}

## Users, buyers, and value

{{For each important role: who they are, what job or outcome they need, what good looks like, and
whether they use, choose, pay for, operate, support, or bear risk from the product.}}

## Current alternatives and reason to adopt

{{What people do today, including doing nothing; where it fails; and why the proposed product is
valuable enough to change behavior or justify its cost.}}

## Outcomes, success, and guardrails

- **Desired outcome:** {{observable improvement for the primary user or buyer}}
- **Success signals:** {{observable or measurable evidence that the product creates value}}
- **Guardrails:** {{what must not worsen while pursuing success}}
- **Evidence plan:** {{how unvalidated value or behavior assumptions will be tested}}

## Minimum useful outcome and primary journey

- **Minimum useful outcome:** {{smallest result that makes the experience worthwhile}}
- **Trigger:** {{what starts the journey}}
- **Journey:** {{user-visible steps from trigger to value}}
- **Trust and comprehension:** {{what must be explained, previewed, confirmed, or reversible}}
- **Failure and recovery:** {{what users see and how they recover without avoidable support}}

## Functional and domain contract

{{Necessary capabilities, roles, states, lifecycle, permissions, and business rules. Express domain
semantics and observable behavior without embedding database, framework, or infrastructure choices.}}

## Product principles

Canonical list: [agent contract]({{agent_contract_path_from_docs}}#product-principles-canonical).

All product decisions and requirements in this PRD MUST conform to that list and reference
applicable `PRINC-NNN` IDs. Do not mirror principle wording here.

## Scope by phase

<!-- Feature areas mapped to phases from docs/stages.md. Sketch-level here;
     detail arrives in each phase's requirements slice. -->

### Phase 0 — releasable skeleton
{{real build/package/release path for the applicable contour, no product features}}

### Phase 1 — {{name}}
{{feature areas and the user outcome they unlock}}

## Business and delivery constraints

{{Applicable policy, ownership, incentives, budget, timing, commercial or legal constraints, risk
tolerance, rollout boundaries, and compatibility promises. Keep implementation mechanisms in the
architecture, tech stack, or ADRs.}}

## Non-goals

<!-- As load-bearing as the scope. What this product deliberately does NOT do,
     and briefly why. -->

- {{non-goal — reason}}

## Open product and validation questions

{{Pointers to unresolved value, functionality, domain, UX, or business questions. Each should also
exist as a blocker or register entry with a route, owner or source, interim default, and trigger;
never only here. Engineering mechanisms belong in technical artifacts rather than this section.}}
