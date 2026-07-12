<!-- Template for docs/PRD.md. A living document: phase slices refine it. When code or
     runtime diverges, determine intent first: update the PRD only if intent changed;
     otherwise fix the implementation. Never rewrite the PRD to legitimize a defect. -->

# PRD — {{project}}

## Problem

{{What hurts today, for whom, and why existing options don't solve it. 2–4 paragraphs.}}

## Users

{{Roles/personas and the jobs they hire the product for. For each: who they are,
what they need to accomplish, what "good" looks like to them.}}

## Product principles

{{Mirror of the non-negotiables in CLAUDE.md — or a pointer to them. One list, one home.}}

## Scope by phase

<!-- Feature areas mapped to phases from docs/stages.md. Sketch-level here;
     detail arrives in each phase's requirements slice. -->

### Phase 0 — releasable skeleton
{{real build/package/release path for the applicable contour, no product features}}

### Phase 1 — {{name}}
{{feature areas}}

## Non-goals

<!-- As load-bearing as the scope. What this product deliberately does NOT do,
     and (briefly) why. -->

- {{non-goal — reason}}

## Open questions

{{Pointers to unresolved product questions — each should also exist as a blocker
or register entry, never only here.}}
