---
name: plan-feature
description: Turn a completed feature discovery into a staged implementation issue with checklists and a durable discovery attachment.
---

# Plan Feature

Create the implementation issue for a small feature after discovery. A bare `$plan-feature` uses
the completed discovery established in the current task. Stop after publishing the plan; execution
belongs to `run-feature-stage`.

Read [references/feature-workflow.md](references/feature-workflow.md) first. It defines the shared
state, issue authority, recovery rules, and stage completion contract.

## Authority and outcome

A request to run this workflow authorizes repository research, local planning records, creation or
repair of this feature's issue, and publication of its discovery attachment to that issue. Merely
discovering this skill is not authorization to publish. Honor a draft-only or read-only request.
If the user asks only for a local plan without naming this workflow or requesting an issue, keep
the result local; skill selection must not expand that request into remote publication.

Do not implement the feature, run a mutable spike, change canonical product documents, install
dependencies, commit, push, or release. Do not restart the interview or require the user to approve
routine engineering choices. Ask only for a consequential stakeholder decision, ambiguous task
selection, or an unavailable capability that actually blocks publication.

## 1. Resolve the discovery and destination

1. Read repository instructions and use the supplied discovery, then the record established in the
   current task, then the selected feature's state. Without that evidence, use a single eligible
   `ready-for-handoff` discovery in this project. Never choose among several records by recency alone.
2. Confirm the discovery is ready for handoff: agreed outcomes, behavior, scope and exclusions, no
   unresolved stakeholder contradiction, and routed residual unknowns. A technical unknown need not
   block planning. If discovery is incomplete, identify the specific missing decision and stop with
   the useful work already prepared; do not start another interview automatically.
3. Resolve the issue forge, actual host, and complete repository namespace from explicit instructions
   or the project's verified remote, including self-managed servers. Read
   existing feature state and search the destination for this discovery's feature marker before
   creating anything. Continue the same issue on retries. If several destinations remain plausible,
   ask once rather than publishing into an assumed repository.
4. Establish the available authenticated issue and attachment tools without printing credentials.
   Read [references/issue-publication.md](references/issue-publication.md) for publication mechanics.
5. Route a matching feature before building or publishing a plan, using the shared lifecycle rules.
   For an already published feature, read back its existing issue and discovery reference, report
   the current status and links, and stop. Preserve `base_commit`, stage progress, and all execution
   checkpoints, including pending issue updates and review state. A verification failure is a
   reported limitation, not permission to replace its state or republish it.
   For an interrupted publication, resume only its missing operations from the existing draft and
   checkpoint. Reuse its identity, original base, uploaded discovery, and issue; do not restart
   sections 2–4 as a new publication. Explicit replanning follows the separate shared rules.

## 2. Do bounded technical reconnaissance

Sections 2–4 describe first-time planning. An explicit replan uses the current issue as its baseline,
preserves execution state, and publishes only the permitted future-plan delta; it does not run the
new-feature initialization below.

Read the relevant implementation, existing tests, project checks, and applicable contracts. Derive
the smallest approach that delivers the discovery's agreed result. Preserve its settled terms and
important decision IDs; engineering implications are not additional stakeholder decisions.

Resolve factual unknowns through read-only research. A necessary experiment becomes a bounded
early stage: state the question, method, observable exit condition, and which later stages depend
on its answer. Leave those stages blocked until the result exists. Do not pretend an assumption was
validated or add a mandatory architecture document for an ordinary reversible choice.

Find verification methods the agent can actually execute. A check that requires unavailable access
is an explicit dependency, with a source or owner and answer-by point. Do not make "the user checks
everything manually" the acceptance method. Product acceptance by a stakeholder is distinct from
engineering verification and applies only when the discovery or project requires it.

## 3. Build the issue plan

Adapt [assets/feature-issue.md](assets/feature-issue.md); omit irrelevant sections and replace every
placeholder. The issue must be sufficient for an agent with no chat history to continue.

- Record the feature goal, scope, non-goals, and observable acceptance criteria for the whole feature.
- Reference the exact discovery snapshot and the important decisions the plan implements.
- Use ordered stable stage IDs (`S1`, `S2`, ...), not a fixed stage count. One stage is enough when
  it includes implementation, verification, independent review, and commit in one fresh context.
- Give every stage a coherent outcome, scope, prerequisites, implementation checklist, acceptance
  checks with executable methods, and the common completion gates. Prefer usable vertical increments
  when they fit the feature; do not mechanically divide every feature by technical layer.
- Put relevant failure and regression checks beside the behavior they verify. Reuse existing tests;
  add coverage only for concrete gaps. Required project checks remain required.
- Make the last stage check the complete user journey and the feature-wide acceptance criteria.
  This is part of the last stage, not an automatic extra stage or a second full review ritual.
- State the git profile, local commit policy, exact reviewer `run-codex-review-loop`, and the issue
  closure condition. Default to local commits with no push; issue closure awaits the stated merge,
  CI, release, or other required condition and separate authorization for external delivery actions.
- Route remaining unknowns and external dependencies explicitly. Keep rationale and durable contracts;
  avoid copying code structure, test inventories, or a separate full project-foundation document set.

## 4. Publish and establish the active feature

For a new feature only, before the first remote write, persist a unique feature ID, confirmed forge
and repository identity, discovery path and digest, current base commit, publication marker, and
`publishing` status in the local feature record.
Select this record in the active pointer now, so a failed new publication cannot leave execution
pointing at an older feature. Keep the older record intact.
Keep a recoverable local draft only while publication is pending; it is not a second live plan.

1. Publish a safe discovery snapshot as an actual attachment, or reference an already published,
   immutable repository file whose contents match that snapshot. Check for secrets and unnecessary
   personal data, redact a publication copy if necessary, and record the copy's digest without
   rewriting the original discovery. Do not silently substitute a summary or a local-path link.
   Save a returned upload URL and its verification status in `discovery_ref` and the checkpoint
   immediately, before creating or editing the issue. Reuse that upload on recovery. If the upload
   has an uncertain outcome and no recoverable URL, stop before another upload rather than duplicate it.
2. Create the issue with its stable feature marker, or repair the existing matching issue. Use a
   structured tool argument or a body file for multiline Markdown. Do not add unsolicited assignees,
   labels, projects, or messages to other people.
3. Read the issue back. Verify the plan, checklists, and discovery reference were persisted and fetch
   the attachment or permalink to verify its content digest. A successful command alone is insufficient.
4. For initial publication or its recovery, persist verification, set the feature `ready`, clear only
   the completed publication checkpoint, and refresh its active-feature pointer. Retain an older
   feature's record when selecting a new one.

If any remote write has an uncertain or partial outcome, recover under the shared contract instead
of creating duplicates. If attachment publication is unavailable, preserve the prepared plan and
file, report the exact missing capability, and leave the feature `publishing`; do not claim success
or push a repository file as an unapproved workaround.

## 5. Report and stop

Return the issue link, discovery attachment or immutable file link, a concise stage outline, and
`$run-feature-stage` as the next invocation. Report a publication blocker precisely when present.
Do not execute S1, close the issue, or ask the user to recheck work the agent has verified.
