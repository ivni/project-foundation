---
name: run-discovery-interview
description: Runs a structured product or feature discovery interview to resolve consequential unknowns before implementation. Use only when the user explicitly asks to start discovery, be interviewed, clarify requirements, or agree on product, UX, or architecture decisions. Asks one decision question at a time, presents 2-4 balanced options with pros and cons and one conditional recommendation, records answers in a single scratch discovery file, and makes no code or canonical-document changes.
---

# Run Discovery Interview

Reach explicit agreement about what to build and the constraints that shape it before implementation
starts. Treat the interview as a sequence of decision closures, not a questionnaire.

## Enforce the discovery boundary

- Start only from explicit discovery intent. A vague implementation request is not permission to
  begin an interview.
- Do not write or modify code, tests, configuration, schemas, migrations, generated assets, project
  plans, PRDs, ADRs, architecture documents, tickets, commits, or external resources.
- Create or update exactly one discovery record. It is the only authorized write during the
  interview.
- Read project evidence and perform read-only research when it helps frame a decision. Do not build a
  prototype or spike during the interview.
- Ask exactly one decision question in each turn. Never include the next question until the current
  decision is closed or explicitly deferred with a usable default.
- Use the user's language unless they request another language. Preserve domain terms when
  translation would make them ambiguous.

If the user changes scope and asks for implementation, stop the interview, summarize its current
state, and ask them to confirm the transition. Discovery intent does not authorize implementation.

## Absorb context before asking

1. Read the supplied idea, brief, blind-spot report, and the smallest relevant set of project docs
   and code.
2. Extract confirmed facts, prior decisions, constraints, open unknowns, assumptions, conflicts, and
   evidence gaps.
3. Do not repeat questions already answered by reliable evidence. Record the evidence and ask only if
   a stakeholder decision is still required.
4. If no subject or brief exists, invite one free-form brain dump before the decision sequence. This
   one intake prompt is not a decision question and does not require artificial answer options.
5. If the user supplies a `find-blind-spots` report, treat it as candidate input, verify what can be
   verified, and reprioritize it. Do not require that skill or rerun its full analysis.

## Establish the single record

After the subject is known and before asking the first decision question:

1. Continue an active discovery record named by the user or clearly established in the current work.
2. Otherwise, if an existing draft `docs/discovery.md` is already the project's bootstrap scratch
   record, continue it rather than creating a competing file.
3. Otherwise create one record from [assets/discovery-record.md](assets/discovery-record.md) at:
   `<project>/.agents/work/discovery/<subject-slug>-<YYYYMMDD-HHmm>.md`.
4. If there is no project root, create the same `.agents/work/discovery/` path under the current
   working directory and state that assumption.
5. Never overwrite a record, create a second record for the same interview, or edit `.gitignore` to
   hide it.

Announce the chosen path. Set its lifecycle to `active`. Keep it until the user chooses to retain,
promote, or delete it; never delete or promote it automatically. The record is working memory, not a
new canonical product authority.

Do not copy secrets, credentials, tokens, private keys, or unnecessary personal data into the record.
Store a redacted description and tell the user what was omitted.

## Build and order the decision queue

Maintain an internal queue and mirror open items in the record. Reorder it after every answer.
Start with the unresolved decision that has the greatest combination of downstream impact, cost of
being wrong, and difficulty of reversal.

Use this dependency order as a default, not a rigid checklist:

1. problem, primary user, desired outcome, and non-negotiable product principles;
2. primary UX journey, trust moments, failure/recovery behavior, and scope boundary;
3. system boundary, ownership, source of truth, and lifecycle;
4. applicable data sensitivity, identity, authorization, abuse, and integration contracts;
5. architecture-critical quality attributes such as availability, consistency, latency, scale,
   offline behavior, cost ceiling, and auditability;
6. rollout, compatibility, migration, support, observability, rollback, and kill switch;
7. local implementation preferences that remain hard to reverse.

Do not begin with framework, database, component, or naming choices unless an existing constraint
makes that choice upstream of product or UX.

## Ask a decision-quality question

Load [references/question-quality.md](references/question-quality.md) before the first question.
Every decision turn must contain:

1. **Decision and why now** — one sentence naming the downstream choices it unlocks.
2. **Two to four viable options** at the same level of abstraction. For every option show distinct
   advantages and disadvantages in the current context.
3. **Exactly one recommendation** labeled clearly. State:
   - the recommended option;
   - why it best fits the evidence and constraints currently known;
   - the assumptions behind it;
   - what new fact would change the recommendation.
4. **One question only** asking the user to choose, modify, or reject the options. Allow a custom
   answer without using it as a substitute for researched options.

Do not use a selection tool if it cannot display the complete trade-offs and conditional
recommendation. Present the information in the message and use a tool only as an optional input
control.

## Close the current decision before advancing

After the user responds, update the record before asking anything else.

### Clear selection

- Record the answer, rationale, consequences, evidence basis, and affected unknowns.
- Check it against all previous decisions and constraints.
- Mark the decision `decided`, then select the next highest-impact open item.

### Hybrid, conditional, or ambiguous answer

- Stay on the same decision.
- Restate the interpreted rule and boundary in precise language.
- Show any consequence or conflict introduced by the interpretation.
- Ask only for confirmation or the smallest missing distinction. Do not add a new topic.

### “I do not know” or request for advice

- Explain the recommendation in more depth without pretending certainty.
- Offer one of: a safe default, a read-only evidence check, a future bounded spike, or deferral with a
  default and revisit trigger.
- Keep the same decision open until the user accepts one route.

### Conflict with an earlier decision

- Name both incompatible statements and the consequences.
- Ask whether the new answer supersedes the old decision, creates a bounded exception, or should be
  revised.
- Record supersession or exception explicitly. Never silently rewrite history.

### Delegation to the recommendation

If the user says “use your recommendation” or equivalent, record the recommended option as their
decision together with its stated assumptions. Do not ask them to repeat it.

## Apply the closure test

A decision is closed only when the record contains:

- an unambiguous rule or selected option;
- the user need, constraint, or evidence supporting it;
- important consequences and rejected alternatives;
- consistency with prior decisions, or explicit supersession/exception;
- one status: `decided`, `needs-validation`, or `deferred-with-default`.

For `needs-validation`, record an interim default, validation method, evidence source or owner, and
answer-by point. For `deferred-with-default`, record the default and an observable revisit trigger.
“Later”, “TBD”, and “we will see” do not close a consequential decision.

## Maintain the record after every answer

- Preserve a concise verbatim excerpt of the user's answer, redacted when necessary.
- Add or update stable IDs: `UNK-NNN`, `DEC-NNN`, and `ASM-NNN`.
- Mark which open unknowns the decision resolves, creates, or reprioritizes.
- Append a chronological session-log entry; do not erase superseded decisions.
- Update the resume point with the single current decision and why it is next.
- Never wait until the end of the interview to batch-record answers.

## Finish only through an explicit gate

Offer completion only when:

- every critical and high-impact unknown is decided, validated, or deferred with a safe default;
- the primary user, outcome, core journey, scope, and out-of-scope behavior are explicit;
- system ownership and applicable data, identity, integration, and quality constraints are explicit;
- rollout, migration, compatibility, rollback, and operational expectations are addressed where
  applicable;
- no unresolved contradiction remains;
- remaining unknowns are cheap to reverse and have defaults plus revisit triggers.

The final decision turn offers two to four choices such as finish discovery, review the residual
risks, or revisit a named decision. Recommend finishing only when the gate passes.

When the user finishes:

1. Set the record lifecycle to `ready-for-handoff` and update the resume point.
2. Return a concise summary of decisions, assumptions, deferred items, residual risks, and the record
   path.
3. State clearly that no implementation or canonical-document changes were made.
4. Suggest the next workflow, such as requirements/PRD synthesis, architecture planning, an ADR, or a
   bounded validation spike. Do not start it without the user's instruction.
