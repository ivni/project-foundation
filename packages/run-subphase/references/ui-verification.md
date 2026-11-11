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

## Review changes without restarting the assessment

The primary agent checks the agreed criteria before requesting independent review. The first review
assesses the complete in-scope UI change. Consolidate valid findings into a coherent fix batch and
keep their dispositions in the existing work record, with evidence and a stable finding identity.
Resolve contradictory recommendations against agreed behavior and design rules before editing;
ask only when resolving them needs a stakeholder decision. Do not alternate implementations to
satisfy incompatible preferences.

After fixes, reviewers focus on changed behavior, its consequences, unresolved findings and affected
interactions. Keep the complete current change and prior evidence available; the reviewer may expand
inspection when a concrete concern warrants it. Renew the full assessment when the journey, contract,
shared component or design tokens change broadly, the impact is uncertain, or the baseline is invalid.
A new reviewer or session alone is not a reason to repeat every screenshot and machine check.

Reopen a resolved finding for new evidence, a regression, or a changed criterion, stating which.
Optional polish alone does not initiate another pass unless the user explicitly requested it.
If rounds stop converging, identify the disputed premise or recurring defect and change the approach;
do not reset the ledger or declare success because a time or round budget was spent.

## Prepare evidence once for each relevant state

Use the project's existing preview, Storybook, browser checks, fixtures and screenshot commands.
When recurring preparation lacks a supported entry point, consolidate it into a small project-local
helper within the authorized implementation scope; do not have every critic invent a parallel harness.
The primary agent owns preparation and environment lifecycle. Reuse a healthy, compatible test
environment; isolate conflicting data or configuration, and restart only when needed. Do not stop
another task's processes. Await background completion through supported notifications or bounded
waits rather than repeatedly asking the model to poll unchanged output.

Give all required critics one factual evidence index in the existing work record, linking:

- the reviewed source state (commit plus uncommitted-state identity where applicable), build,
  relevant environment/configuration and test-data or fixture identity;
- the agreed criteria and affected scenarios, roles, states, themes and viewports;
- reproducible commands, observed results and labelled screenshots or traces, with known gaps and
  mocked boundaries explicit. A mockup or mocked response does not prove live integration behavior.

Reuse machine results for applicable checks such as overflow, accessible names, target sizes,
contrast and browser errors. They complement visual and interaction judgment, not replace it.
Critics assess evidence independently, can inspect the source and runtime within their permissions,
and request missing or conflicting evidence; a shared packet is not an instruction to accept the
author's verdict. Where a critic is read-only or cannot run tools, the primary agent executes needed
probes and provides the results without relaxing the critic's restrictions.

After an edit, refresh affected evidence and explain why retained results still apply, considering
shared dependencies, runtime configuration and fixtures as well as file paths. Unknown impact calls
for broader checks. Preserve each result's original tested identity and distinguish retained from
new observations; never relabel old screenshots as a fresh run on the final tree. Before closeout,
reconcile the final state against the baseline, fix reviews and evidence, then run any mandatory final
gate. Retain recovery evidence until accepted and apply the owning workflow's cleanup rules afterward.
