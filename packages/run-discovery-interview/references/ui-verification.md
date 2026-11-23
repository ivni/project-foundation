<!-- Canonical source. Do not edit the generated copies under packages/*/references/. -->
# UI acceptance and review

Use this guidance when defining UI acceptance, reviewing mockups, or verifying implemented UI.
Planning and discovery define criteria and verification methods; they do not gain permission to
build mockups, run servers, or implement code. Execution follows its own authority and project gates.
This reference neither requires extra critics nor authorizes delegation. Preserve required reviewer
roles, independence, scope and acceptance thresholds; UI review does not replace code review.

## Agree observable completion

Translate quality goals such as "10/10" into observable criteria for the affected user journey:
clear next actions and hierarchy, correct success and recovery behavior, applicable permissions,
keyboard and focus behavior, readable layouts, and relevant themes, viewports and states. Reuse
project criteria and design-system rules; do not invent an exhaustive matrix for an unrelated change.
Record the criteria and methods in the existing discovery, issue or phase slice before review.

A score alone neither proves a defect nor proves completion. Each blocking finding needs an
observed problem, its user consequence, and the criterion it violates. Separate optional preferences
from defects. Without an explicit numerical gate, finish when required criteria are evidenced and
no blocking finding remains, rather than iterating for a critic's perfect score. If the project
requires scores or two separate critics, retain those gates until an authorized decision changes them;
do not silently reinterpret a lower score as passing or add another critic merely for reassurance.

## Prepare the evidence before dispatch

The primary agent owns the test environment, scenario scripts and results. Use the project's existing
preview, browser checks, fixtures and capture commands. For recurring checks, keep one reusable
scenario or helper within the authorized work area. Reuse a compatible environment, isolate
conflicting data and leave other tasks' processes alone. Await completion through notifications or
bounded waits.

Before dispatching any required UX/UI critic, open the evidence and check that it shows the behavior
under review. Share each scenario's results across critics. Repeat a run when the project requires
it or conflicting observations need resolving. Give critics the same factual index in the existing
work record, with links to:

- The reviewed tree including uncommitted changes, build, configuration and fixtures.
- The agreed criteria, accepted design references, relevant decisions and scope.
- Observations by scenario, role, state, viewport and theme as applicable. For visual judgments
  include labelled screenshots and existing measurements such as contrast, overflow or target size.
  For interactions show the action and
  observed outcome, for example a trace of focus before and after a dialog closes. Record commands
  for reproduction, mocked boundaries and gaps. A still image alone cannot establish a focus change.

## Assignment for each required UX/UI critic

Start each required critic in a clean context without the parent conversation. Supply a factual
excerpt or index pointing directly to artifacts, agreed decisions and open findings. Keep the
author's verdict, other critics' verdicts and past reports out of the supplied context, including
linked work logs. If the host cannot isolate the context, use an authorized independent route or
record the unmet independence requirement. Fill in the bracketed fields for each assignment.

> Assess [UX or UI] for [scope and reviewed tree] against [criteria, accepted reference and decisions].
> Use [evidence index]. Review [whole in-scope change on first pass, or changed behavior, affected
> interactions and open finding IDs on follow-up]. Cite the artifact and observed user consequence
> for each finding. Report the disposition of open IDs, new findings and the verdict or score
> required by the project. Where evidence is missing or contradictory, name the criterion, scenario
> and exact observation needed. Leave that criterion pending and assess what the evidence supports.
> Your role is to inspect the supplied results. Leave running the app, writing scripts, collecting
> captures and operating the environment to the primary agent.

For evidence requests, first check whether an existing observation answers the question. Otherwise
extend or add the scenario and share the resulting observation. Before returning it, compare
its tree, build, configuration and fixtures with those under review. For the same state, supplement
the existing assessment. If any identity changed, record the new state and apply the delta rules
below before requesting a verdict. In either case, return the evidence to every critic whose
assessment it affects, including one who already gave a score. Reconcile their updated verdicts
before closeout.

## Review fixes against the previous reviewed tree

Consolidate supported findings into one fix batch. Keep stable finding IDs and dispositions in the
existing work record. When the same defect appears in neighboring states, identify the common rule,
fix its cause and check the affected class of cases together. Resolve conflicting recommendations
against agreed behavior and design rules. Ask the stakeholder only when a decision is needed.

Keep a comparable snapshot for each reviewed tree, such as a Git tree object or a manifest of
paths and content hashes that includes staged, unstaged and relevant untracked work. Compare the
previous reviewed snapshot with the current snapshot. When both rounds share a HEAD commit, a diff
against HEAD also includes earlier rounds' work. Select scenarios for the actual delta, affected
interactions and open findings. Account for shared components, design tokens, build configuration and
fixtures. Reassess the whole affected journey when its steps, acceptance criteria or contract
change materially. Broaden the assessment when the impact is uncertain, a shared change has broad
effects or the prior snapshot cannot be verified.

Refresh affected observations and explain why retained evidence still applies. Preserve each
result's original tested identity. Reopen a resolved finding only for new evidence, a regression
or a changed criterion. Follow the project's explicit polish and scoring requirements.
If rounds stop converging, identify the recurring defect or disputed premise before the next pass.
A new critic or session alone does not require fresh captures. Before closeout, reconcile the final
tree with the evidence and run any mandatory final gate. Retain recovery evidence until acceptance
and follow the owning workflow's cleanup rules.
