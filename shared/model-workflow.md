# Native model and effort selection

Read this for `run-feature-models` and `run-phase-models`. The main chat remains the orchestrator on
its user-selected model/effort; these skills do not select a separate orchestrator or change that
chat's model. The parent owns verification and closeout and delegates bounded native role jobs.
Stages/subphases remain sequential. Do not nest the old orchestrator or reuse its whole-stage
worker protocol for partial role jobs.

## Capability and approved catalog

Inspect the current application's actual native spawn, explicit model/effort selection, await,
message and stop surfaces. Record the observed schema/version and supported exact model IDs and
reasoning values. A prior profile or a documentation example alone does not prove availability.
Build, fix, investigate, UI and advisor jobs use native subagents only; no external agent CLI,
OpenRouter, background supervisor or user-owned chat. Missing native selection/lifecycle controls
stop implementation. Never silently substitute the parent's model or an unsupported effort.

Review candidates are installed `run-codex-review-loop`, `run-claude-review-loop` or
`run-qwen-review-loop`. Read the installed adapter and preserve its exact model, pinned effort,
fresh context and enforced read-only isolation. Each review candidate has exactly one effort option,
matching that installed loop; the selector cannot lower it. Its native route is allowed only with
all required controls; otherwise the existing isolated CLI route is allowed. Preflight an approved
review route before implementation. Assess the intended increment's review demand first and require
that route to meet it, not merely to be installed. If subsequent diagnosis raises the demand, check
reviewer adequacy again before further product edits. A read-only sentence is not isolation.

Use `${XDG_CONFIG_HOME:-$HOME/.config}/project-foundation/model-profile.json` for the approved catalog.
An explicit run choice takes precedence over an approved project profile, then the personal profile.
Do not alter global application settings or installed skills. Expand paths safely, without changing
HOME/CODEX_HOME. The catalog contains allowed models, their supported effort options, capability
levels and relative resource estimates. There is no outcome rating, score history or telemetry.

At first use show a concise proposed role/model/effort catalog and ask once to approve automatic
selection within it. Existing explicit instructions supplying that catalog are already authorization.
Pin the actual approval source/scope and validated catalog digest in the run checkpoint; a field
claiming approval is not authorization. New model/provider/effort choices, capability/resource
estimate changes or wider role assignments need approval unless already covered by current user
instructions. Never silently adopt an edited personal profile during a run.

For every candidate record a `basis` explaining the capability estimate, grounded in current primary
model documentation, observed application information or the owner's explicit assessment. For each
model+effort pair record a separate `basis` for its relative resource estimates. These are estimates,
not empirical quality ratings or exact token/$ predictions. Do not infer price from a model name,
convert subscription use to API dollars or invent measured latency. If relevant facts cannot be
established, present the uncertainty and obtain a usable catalog estimate before automatic selection.

- `capability` 1..4 is the model's approved maximum task-demand class for its allowed roles. It is
  an admission threshold, not a ranking learned from past jobs. Restrict role membership when a
  model's strengths are inappropriate; do not assume a high effort makes a weak model suitable.
- Every effort has its exact native `name` and a model-specific reasoning `level` 1..4. Typical
  labels are low, medium, high and extra-high, but actual spelling and meaning must be verified for
  this model/host. Names alone are not a cross-provider equivalence guarantee.
- `cost`: 1 low, 2 medium, 3 high relative quota/resource use for the entire model+effort pair.
- `latency`: 1 fast, 2 medium, 3 slow expected response time for that pair. Include reasoning overhead;
  this is not a claim about total build/test time or a live service guarantee.

Costs and latency use the same comparison scale across the approved catalog. Efforts of one model
may have different estimates. Preserve the estimates and their basis for audit, without a score log.

## Assess each job, then select model AND effort

The parent first chooses the actual role: `build`, `fix`, `investigate`, `ui`, `advisor` or `review`.
Do not manufacture jobs to fill roles. Then assess the bounded job's **complexity**, engineering
**uncertainty** and consequences of error (**risk**) separately, each on 1..4:

| Level | Complexity | Uncertainty | Risk |
|---|---|---|---|
| 1 | Mechanical/local change with an explicit procedure | Known cause and established pattern | Low-impact, easily reversible |
| 2 | Several known steps or ordinary feature logic | Some alternatives within known contracts | Bounded functional regression |
| 3 | Interacting components or nontrivial diagnosis | Cause or contract needs investigation | Permissions, concurrency, material compatibility/data consequences |
| 4 | Broad architectural reasoning or many coupled constraints | High unresolved engineering uncertainty | Irreversible migration or critical security/data consequences |

Write a short task-specific rationale citing the affected behavior, unknowns and failure impact.
File count, role name and expected output length alone are not complexity. A tiny permissions fix
can have high risk. A missing stakeholder decision remains a blocker, not a reason to pick level 4.
If a dimension is uncertain, use the higher supported class or investigate first; never understate
it to fit the cheapest model. Estimate separately for each new job, including a fix round.

Required level is `max(complexity, uncertainty, risk)`. Both model capability AND effort level must
meet it. This conservative rule keeps low complexity from cancelling high risk. For a simple known
local job the floor is 1; ordinary feature work typically needs 2; cross-component diagnosis or
permissions work needs at least 3; level-4 work needs a capable model with an approved level-4 effort.

Enumerate every allowed, currently available model+effort pair for that role. Remove exclusions and
pairs below either quality floor. Among the remaining pairs select, in order:

1. Lowest relative resource cost.
2. Lowest expected latency at equal cost.
3. Lowest sufficient effort level if both estimates tie.
4. Approved model order, then approved effort order as deterministic final ties.

Thus the same model can run with low effort for a simple job and high effort for a difficult job;
a stronger model at lower effort can beat a weaker model at higher effort only if both meet the
job's floors. No adequate pair means a precise capability/approval question, never a downgrade.
An explicit user-selected model still needs a suitable approved effort and verified capability;
report a conflict rather than quietly widening authority or lowering task requirements.

The helper deterministically validates/selects, but does not understand code, establish approval,
verify estimates, discover availability or launch models. The parent supplies those checked inputs.
Pass a JSON request file as one argument, not interpolated shell code:

```sh
bun /absolute/skill/scripts/model-routing.ts /absolute/request.json
```

Schema example only; replace descriptive IDs/estimates with the actually approved catalog:

```json
{
  "schema": 2,
  "candidates": [
    {"id":"worker","host":"observed-app","model":"observed-model","route":"native",
     "capability":4,"basis":"Verified capability source or explicit owner assessment",
     "efforts":[
       {"name":"low","level":1,"cost":1,"latency":1,"basis":"Approved relative estimate"},
       {"name":"high","level":3,"cost":2,"latency":2,"basis":"Approved relative estimate"},
       {"name":"xhigh","level":4,"cost":3,"latency":3,"basis":"Approved relative estimate"}]},
    {"id":"reviewer","host":"observed-app","model":"installed-loop-model","route":"review-loop",
     "loop":"run-codex-review-loop","capability":4,"basis":"Verified capability source",
     "efforts":[{"name":"installed-effort","level":4,"cost":3,"latency":3,"basis":"Approved relative estimate"}]}
  ],
  "roles":{"build":["worker"],"fix":["worker"],"investigate":["worker"],"ui":["worker"],"advisor":["worker"],"review":["reviewer"]}
}
```

- `validate`: `{action:"validate", profile}` returns normalized profile and `profile_sha256`.
- `select`: `{action:"select", profile, task, available, excluded:[]}`.
  `task` is `{role, complexity, uncertainty, risk, rationale}`.
  `available` contains `{id, host, model, route, loop?, efforts:["exact-name",...]}` independently
  observed from this application's capabilities or installed review adapter, not copied from the
  catalog. `excluded` contains `{id}` for a whole model or `{id, effort}` for an exact pair.
  Output names the chosen candidate AND effort, assessed task, required floor, relative cost/latency,
  profile digest, number of adequate pairs and selection reason. Save it before dispatch. Pass
  `result.candidate.model` and `result.effort.name` explicitly to the native spawn tool; the parent
  chat keeps its own model/effort unchanged.

No `record` action, ratings file, historical model ranking or exploratory sampling exists. Old
schema-1 profiles require explicit reconfiguration to schema 2; never invent missing estimates.
For an interrupted old run, first reconcile its actual owner/work/commit. Preserve old evidence and
ratings files without reading them for selection or deleting them. Retire pending rating writes as
superseded by this policy and retain a factual note. Then pin the approved new catalog and reassess
remaining jobs before dispatch; do not reset the feature/phase or duplicate completed work.

## One owner, bounded role jobs

Keep the checkout lease throughout an increment, including tests, review, fixes, commits and remote
readback. Inspect all phase/feature checkpoints and actual owners before claiming. One role job runs
at a time, even if it is read-only; no parallel tracks in these variants. Reserve before spawn, bind
the actual handle immediately, and reconcile an uncertain launch before another attempt. Use fresh
context, a minimal pinned packet and explicit approved model/effort. On Codex Desktop that means
`fork_turns: "none"` and supported `model`/`reasoning_effort` overrides. On other hosts use the live
equivalent, not guessed tool names. Never fork the implementation conversation into a reviewer.

Each packet names run/increment/job, checkout/branch, role, model/effort, profile digest, exact scope,
acceptance/verification seams, existing attributed changes, output path and user constraints. Require
progress evidence, a final changed-file/result summary, checks attempted, remaining work and actual
questions. Build/UI/fix workers must not commit, push, update the issue/checklist or invoke a review
loop. The parent alone owns those transitions. Investigate/advisor jobs do not mutate product files;
use host restrictions where available and inspect the actual diff after every job. Unauthorized edits
are a failed job to reconcile, never evidence of success.

The parent runs or independently verifies checks at the agreed real seams and invokes the selected
installed review loop in its own context. For these two user-started workflows, delegate product
fixes from that loop to a fresh `fix` worker, then resume the same loop and ledger. The parent still
validates every finding, owns tests, derives the permitted verdict and checks final tree identity.
Do not start the next increment while an unresolved finding or required check remains.

Wait in bounded intervals and keep the user informed. Distinguish activity from meaningful progress:
new diagnosis, a corrected cause, passed required check or resolved finding. On repeated unchanged
errors or no progress inspect evidence, send one concrete correction, allow its diagnostic work,
then stop and await the actual owned job/commands before replacement. A timer or native-agent idle
status does not prove child commands stopped. Reconcile edits and retain recovery pointers first.
Use the host's real cancellation lifecycle; if termination cannot be established, keep ownership and
stop dispatch. No background continuation after session closure.

Fallback is for demonstrated unavailability (quota, capacity, missing model), or a diagnosed
quality failure needing a different approved candidate. Record the cause and preserve work/ledger.
For a model-wide quota/capacity failure exclude the entire candidate; for an unavailable effort
exclude only that exact pair. Reassess a demonstrated reasoning shortfall and raise the requirement
when warranted. Select again under the same or stronger quality floor; never lower risk/complexity
merely to make a cheaper or available pair eligible. Try each approved model/effort pair at most once
for the same unchanged failure. Never cycle through them indefinitely. A changed diagnostic approach can retry the same candidate; record what changed. Ordinary code/test
errors are `fix` work, not automatic model switching. A host permission denial, policy restriction,
missing stakeholder decision or scope conflict is never routed around through another model/loop.
Exhausted availability leaves a precise checkpoint and question; do not add a candidate yourself.

## Durable checkpoint

Use `.agents/work/features/<feature-id>.models.json` or
`.agents/work/phases/<phase-id>.models.json`, separate from existing orchestrator/direct records.
Claim the lease with this workflow's exact mode and actual owner before writing. Write atomically
under an exclusive short-lived lock; inspect stale owners instead of aging locks out. Pin:

- run ID, workflow, checkout/branch, feature/issue/base or phase/slice/scope digest;
- original authorization, approved profile snapshot/digest, capability evidence, reviewer preflight;
- current increment/action, parent owner, `active` job reservation/handle, explicit status;
- each job's role, complexity/uncertainty/risk assessment and rationale, required level, chosen
  model/effort, relative cost/latency, profile basis, exclusions, output and outcome;
- baseline/owned changes, checks and tested tree, review loop/runs/findings, continuation diagnosis;
- commit awaiting issue/checklist reconciliation, cleanup-pending state, cancellation/question.

`status` is `active`, `awaiting-input`, `interrupted`, `cancelled` or `completed`. Keep `active` truthy
while any child/command/reviewer is live or its termination is uncertain. Clear it only after real
terminal observation. A parent still testing/reviewing/closing out remains `status: active` even
between jobs. Before releasing the lease set a truthful terminal/pending status and reconcile all
side effects. An interrupted run resumes its owned increment and pinned routing decisions, not a new
selection from a changed pointer. Explicit cancellation requires explicit resume.

Use the base workflow's completion evidence format and semantic checks, including tested/reviewed
tree matching the completion commit, permitted deferrals, requirement/issue readback and cleanup.
Do not call the old orchestrator's `bind`/`settle` on these role jobs; it expects a whole-stage worker.
In these variants the parent performs the closeout checks from the shared contracts itself. A job's
completion is never increment completion. Preserve pending committed results rather than repeating
implementation, commits or uncertain issue writes.

## Finish

Complete feature/phase-wide acceptance and temporary-material/test cleanup under the base contract.
Any substantive cleanup edits return through a scoped worker, checks and independent review. Keep
profile approval, task assessments, actual model/effort choices, failed attempts and recovery facts.
Report completed increments, commits, checks/review, pending delivery gates and a compact table:
job/role, demand level and reason, chosen model, effort, relative cost/latency and any fallback.
Do not ask the user to approve every choice inside the already approved catalog or verify work for
an agent. Keep recovery evidence; there is no post-run model-grading task.
