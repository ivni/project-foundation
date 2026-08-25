---
name: run-discovery-interview
description: Discovery interview that closes stakeholder decisions before implementation. Use only when invoked by name.
---

# Run Discovery Interview

Reach explicit agreement about why and what to build, how it should behave, and which constraints
shape it before implementation starts. Treat the interview as a sequence of stakeholder decision
closures, not a questionnaire or an architecture review.

## Keep decision ownership explicit

- Default to the **product track**: assume the participant can decide product intent, domain rules,
  UX priorities, business policy, budget, timing, and risk tolerance without being an engineer.
- Enter a **technical track** only when the user explicitly asks to collaborate on architecture or
  implementation decisions. Do not infer technical fluency from repository access or domain terms.
- Ask the participant to decide outcomes, observable behavior, policy, priorities, and constraints.
- Let the agent research repository facts, select reversible implementation defaults, and prepare
  technical recommendations, ADR candidates, or bounded spikes.
- Never make a participant choose a database shape, index, framework, API pattern, migration
  mechanism, or consistency mechanism merely because the choice is consequential to engineering.
- When a technical decision depends on product intent, ask for the product rule or user-visible
  trade-off, then route the mechanism to engineering synthesis.

## Enforce the discovery boundary

- Start only from explicit discovery intent. A vague implementation request is not permission to
  begin an interview.
- Do not write or modify code, tests, configuration, schemas, migrations, generated assets, project
  plans, PRDs, ADRs, architecture documents, tickets, commits, or external resources.
- Create or update exactly one discovery record. It is the only authorized write during the
  interview.
- Read project evidence and perform read-only research when it helps frame or remove a decision. Do
  not build a prototype or spike during the interview.
- Ask exactly one decision question in each turn. Never include the next question until the current
  decision is closed or explicitly deferred with a usable default.
- Use the user's language unless they request another language. Preserve domain terms when
  translation would make them ambiguous, but explain implementation jargon when it is unavoidable.

If the user changes scope and asks for implementation, stop the interview, summarize its current
state, and ask them to confirm the transition. Discovery intent does not authorize implementation.

## Absorb context before asking

1. Read the supplied idea, brief, blind-spot report, and the smallest relevant set of project docs
   and code.
2. Extract confirmed facts, prior decisions, constraints, open unknowns, assumptions, conflicts, and
   evidence gaps.
3. Infer the participant's role and decision authority from the request and evidence. Ask for role
   calibration only when ambiguity would materially change which decisions belong to them.
4. Do not repeat questions already answered by reliable evidence. Record the evidence and ask only
   if a stakeholder decision is still required.
5. If no subject or brief exists, invite one free-form brain dump before the decision sequence. This
   one intake prompt is not a decision question and does not require artificial answer options.
6. If the user supplies a `find-blind-spots` report, verify what can be verified, preserve its
   resolution routes, and reprioritize it. Do not require that skill or rerun its full analysis.

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

Announce the chosen path, participant profile, and track. Set its lifecycle to `active`. Keep it until
the user chooses to retain, promote, or delete it; never delete or promote it automatically. The
record is working memory, not a new canonical product authority.

Do not copy secrets, credentials, tokens, private keys, or unnecessary personal data into the record.
Store a redacted description and tell the user what was omitted.

## Route every unknown before queuing it

Load [references/decision-routing.md](references/decision-routing.md) before the first decision
question. Assign both a decision lane and a resolution route to every unknown before deciding
whether to ask about it. Record a spike as a validation need for later; never run one during the
interview.

Only stakeholder decisions enter the product-track question queue. In an explicit technical track,
implementation decisions may enter the queue only when the participant owns them and no research,
safe default, or later spike can resolve them better.

## Sharpen the language as it lands

The project's words are part of what discovery agrees on. When the participant reaches for a term:

- If it conflicts with a term already settled in this interview or recorded in the project's
  glossary, say so in that turn and ask which reading holds. "Earlier we settled that a
  cancellation ends the whole order; this sounds like cancelling one line — are those the same
  thing?"
- If it carries two meanings, propose one canonical term for each and name the losing reading, so
  it does not drift back next session.
- If it is the project's own established term, use it rather than a plainer synonym. Concision
  bought this way is the point of having the term.

Record the resolved term, its meaning, and the synonyms it replaces in the discovery record's
language section. This is a clarification of the decision already on the table, not a new
question, so it does not break the one-question rule — but do not chase terminology that no
decision depends on.

Terminology never entitles a write outside the record. `docs/glossary.md` is promoted later, by
requirements synthesis or `project-foundation`, and never during the interview.

## Build the stakeholder decision queue through gates

Order product-track decisions through these gates. Reorder within the current or an earlier gate
after every answer, but do not skip forward merely because a downstream technical choice is costly.
Within a gate, ask only **takeable** decisions — those whose prerequisite unknowns are closed.
Derive that set from the `Blocked by` entries in the record rather than keeping a separate queue of
it; a decision resting on an open prerequisite gets answered from a guess, and unwinding it later
costs every decision made on top of it.

1. **Value gate** — primary user, problem and evidence, current alternative, desired outcome and
   value, success signals, guardrails, and non-negotiable product principles.
2. **Behavior gate** — minimum useful outcome, primary journey, necessary capabilities, domain rules
   and lifecycle, scope, and explicit non-goals.
3. **Experience and business gate** — comprehension and trust, failure and recovery, relevant
   accessibility or environment, incentives, policy, ownership, budget, timing, and risk tolerance.
4. **Handoff gate** — product-visible system boundaries, data sensitivity, identity, integrations,
   quality expectations, rollout, and compatibility; route implementation mechanisms to agent
   research, engineering synthesis, or a spike.

Treat the gates as sufficiency tests, not checklists. Do not manufacture irrelevant decisions. A gate
is sufficient when its critical rules are explicit and every remaining uncertainty has a correct
route, owner or source, interim default, and answer-by point or revisit trigger.

Do not ask about framework, database, schema, component, API shape, infrastructure, or naming in the
product track. Ask about their observable consequence only when the participant must choose it. For
example, ask whether a missing value means “not applicable,” “not known yet,” or “optional”; let
engineering decide whether that becomes a nullable column, subtype table, or another representation.

## Ask a decision-quality question

Load [references/question-quality.md](references/question-quality.md) before the first question.
Every decision turn must contain:

1. **Decision and why now** — one sentence naming the product, UX, business, or constraint choices it
   unlocks.
2. **Two to four viable options** at the participant's decision level. For every option show distinct
   advantages and disadvantages in the current context.
3. **Exactly one recommendation** labeled clearly. State the recommended option, why it best fits the
   known evidence, its assumptions, and the observable fact that would change it.
4. **One question only** asking the user to choose, modify, reject, or delegate to the recommendation.
   Allow a custom answer without using it as a substitute for researched options.

Do not use a selection tool if it cannot display the complete trade-offs and conditional
recommendation. Present the information in the message and use a tool only as an optional input
control.

## Close the current decision before advancing

After the user responds, update the record before asking anything else.

### Clear selection

- Record the answer, rationale, consequences, evidence basis, affected unknowns, and engineering
  implications without turning those implications into user-approved mechanisms.
- Check it against all previous decisions and constraints.
- Mark the decision `decided`, reroute affected unknowns, then select the next stakeholder decision.

### Hybrid, conditional, or ambiguous answer

- Stay on the same decision.
- Restate the interpreted rule and boundary in precise, observable language.
- Show any consequence or conflict introduced by the interpretation.
- Ask only for confirmation or the smallest missing distinction. Do not add a new topic.

### “I do not know” or request for advice

- Explain the recommendation in plain language without pretending certainty.
- Offer one of: a safe default, a read-only evidence check, user research, a future bounded spike, or
  deferral with a default and revisit trigger.
- Keep the decision open only when the participant truly must own it. Otherwise reroute it and move
  on.

### Exclusion of scope

When the answer places something outside the subject's goal rather than deferring it, record it as
a scope exclusion with the reason and what would put it back in scope — not as a deferred default.
A deferred default stays in scope and returns on its trigger; an exclusion returns only if the goal
is redrawn. Conflating the two either resurrects settled rejections or quietly buries live work.

### Conflict with an earlier decision

- Name both incompatible statements and their consequences.
- Ask whether the new answer supersedes the old decision, creates a bounded exception, or should be
  revised.
- Record supersession or exception explicitly. Never silently rewrite history.

### Delegation to the recommendation

If the user says “use your recommendation” or equivalent, record the recommended option as their
decision together with its stated assumptions. Do not ask them to repeat it.

## Apply the closure test

A stakeholder decision is closed only when the record contains:

- an unambiguous rule, priority, boundary, or selected option in observable language;
- the user need, value, constraint, policy, or evidence supporting it;
- important consequences and rejected alternatives;
- consistency with prior decisions, or explicit supersession or exception;
- one status: `decided`, `needs-validation`, or `deferred-with-default`.

For `needs-validation`, record an interim default, validation method, evidence source or owner, and
answer-by point. For `deferred-with-default`, record the default and an observable revisit trigger.
“Later”, “TBD”, and “we will see” do not close a consequential stakeholder decision.

## Maintain the record after every answer

- Preserve a concise verbatim excerpt of the user's answer, redacted when necessary.
- Add or update stable IDs: `UNK-NNN`, `DEC-NNN`, and `ASM-NNN`.
- Mark the decision lane and resolution route for every unknown.
- Mark which unknowns the decision resolves, creates, reroutes, or reprioritizes, and update the
  `Blocked by` entries the answer has freed.
- Record any term the answer settled, with the synonyms it replaces.
- Record derived engineering implications separately from stakeholder decisions.
- Append a chronological session-log entry; do not erase superseded decisions.
- Update the resume point with the single current stakeholder decision and why it is next.
- Never wait until the end of the interview to batch-record answers.

## Finish through the track-appropriate gate

Offer completion of the product track when:

- the primary user, problem evidence, current alternative, desired value, success signals, and
  guardrails are explicit enough for the subject;
- the minimum useful outcome, core journey, necessary functionality, domain rules, scope, and
  non-goals are explicit;
- applicable trust, failure, recovery, policy, ownership, budget, timing, and risk constraints are
  explicit;
- no unresolved contradiction remains;
- every remaining unknown is correctly routed with an interim default and an owner, source,
  validation method, answer-by point, or revisit trigger.

Do not require database, API, migration, infrastructure, or other implementation mechanisms to be
chosen before the product track can finish. In an explicit technical track, additionally require its
agreed architecture constraints and contested mechanisms to be decided, validated, or deferred with
a safe default.

The final decision turn offers two to four choices such as finish the current track, review residual
product risks, begin a separately confirmed technical track, or revisit a named decision. Recommend
finishing only when the applicable gate passes.

When the user finishes:

1. Set the record lifecycle to `ready-for-handoff` and update the resume point.
2. Return a concise summary of product value, functionality, UX and business decisions, assumptions,
   routed unknowns, engineering implications, deferred items, settled terms with the synonyms they
   replace, anything ruled out of scope, residual risks, and the record path.
3. State clearly that no implementation or canonical-document changes were made.
4. Suggest the next workflow, normally requirements or PRD synthesis followed by agent-led technical
   synthesis in `project-foundation`, an ADR, or a bounded validation spike. Do not start it without
   the user's instruction.
