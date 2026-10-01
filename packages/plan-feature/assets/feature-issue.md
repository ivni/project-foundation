<!-- feature:{{feature-id}} -->
# {{Feature outcome}}

## Goal and boundaries

{{User-visible outcome, included behavior, explicit non-goals, and relevant discovery decision IDs.}}

## Discovery and execution context

- Discovery: {{verified attachment or immutable file URL}}
- Snapshot SHA-256: {{digest of the published discovery}}
- Forge: {{verified issue platform}}
- Repository: {{credential-free identity}}
- Base commit: {{SHA before implementation}}
- Git policy: {{existing project profile; local stage commits; no push by default}}
- Required project checks: {{real commands or existing project entry point}}
- Review: `run-codex-review-loop` before every stage commit.
- Issue closure: {{verified merge/CI/delivery condition; report local implementation separately}}

## Feature acceptance

- [ ] {{Observable criterion and agent-executable verification method}}

## Stages

- [ ] S1 — {{Coherent outcome}}

### S1 — {{Coherent outcome}}

Prerequisites: {{none, completed earlier stage, or an explicit dependency}}

Scope: {{What this stage changes and which discovery decisions it implements}}

- [ ] {{Implementation task supporting the outcome}}
- [ ] {{Acceptance criterion and its direct verification method}}
- [ ] Required project checks pass on the final code state.
- [ ] `run-codex-review-loop` permits the stage commit; required findings are resolved or recorded.
- [ ] Stage committed locally; result and evidence published in this issue.

{{Repeat only for necessary stages. The last stage also verifies the full feature journey and all
feature-wide criteria. Use stable IDs and retain them when splitting work.}}

## Dependencies and routed unknowns

{{Only consequential unresolved items: route, owner/source, interim assumption, and answer-by stage.
Remove this section if none remain.}}

## Progress

{{Current stage/status and concise evidence links. Stage results identify commit SHA, commands and
results, tested state, review outcome, and any permitted deferrals. Keep full logs elsewhere.}}
