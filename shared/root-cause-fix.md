## Fix at the root cause

Fix each validated defect at its cause, not at the symptom the reviewer happened to see. Before
editing:

- state the root cause the finding consolidates, distinct from the reported symptom;
- enumerate what depends on the behavior you are about to change — callers, implementers, serialized
  or persisted forms, tests that encode it, and the records that assert it: decision records,
  requirements, acceptance criteria, docstrings, comments. A fix that corrects the code while a
  document this same run rewrote still asserts the old behavior trades a defect for a contradiction,
  and the contradiction is the next pass's finding. Record that list in the ledger;
- state the invariant the fix establishes, and what holds that invariant mechanically: a test, a type,
  an assertion, or a schema constraint. Record both. State the invariant as the rule the domain
  imposes, then enumerate the distinct ways that rule can be violated; the mechanism covers every
  form, or the ledger records which forms stay open and why. The negation of the reported symptom is
  not an invariant: "the first of several results is taken" is one sighting of "the response must
  identify exactly one subject, consistently", and a check written against the sighting leaves every
  other violation of the same rule for the next pass to find. "Verified by inspection" is not a
  mechanism, and neither is this description of the fix;
- choose the change that removes the cause for every dependent, not the narrowest edit that silences
  the reported symptom.

A mechanism is not trusted for existing. A check already standing at a seam this fix touches earns its
place the same way a new one does: run it against the broken behavior and see it fail. A check that
passes with the behavior removed names that behavior without holding it, and a fix pinned to such a
check is a fix nothing pins. Record the red and the green run of every mechanism this batch relies on,
new or pre-existing, together with the evidence that the environment was held exclusively while they
ran. A run against a database, cache, queue, or fixture another process could reach concurrently is
evidence about neither the defect nor the mechanism, and a red run that shared its environment is not a
red run.

Then sweep the class before the first edit. Express the root cause as a search the repository can
answer — the pattern's grep, the callers of the function, every writer of the field, every branch that
publishes the flag — and run it over the whole tree, not over the diff. Record in the ledger the search
itself, its complete hit list, and a disposition for every hit. A hit is a candidate, not a defect:
repair it only where the failure path — input, state, consequence — can be shown at that location, and
otherwise record it as not an instance, with the reason. Both dispositions carry the same burden;
repairing a hit "just in case" damages correct code exactly the way skipping one leaves the class
open. A hit without a disposition means the fix is not finished. Record the sweep as the pattern it
searches for and the exact search that ran, so the next pass can run the same search over its tree and
refute the hit list against what it returns. When the class genuinely cannot be expressed as a search,
record that, and the pinning mechanism carries the whole weight.

Account for the inputs of every branch the fix touches. Each condition on the edited path is a fork,
and each side of a fork is a scenario: record which inputs or states travel it, what happened to them
before the edit, and what happens after. A scenario whose "after" cannot be stated is an edit that is
not understood — stop rather than commit it. Removing or narrowing a branch demands one of exactly two
proofs: evidence that no reachable state enters it, drawn from the system's actual states rather than
from a likelihood judgment or a label like "ceremony"; or the named path that now serves those inputs,
shown to do the same job. Name the state the system is left in if execution stops between the steps this
edit introduces, because the sequence the code now runs is itself a scenario and an interrupted one is
reachable whenever the process can die. Then run the affected scenarios against the edited tree — a
test, a dry run, or a recorded trace — before the batch closes. A fix is not finished when it answers the finding; it
is finished when it answers the system.

A fix that visits N places and repairs each one, while leaving nothing that fails when the N+1st place
appears, is a symptom fix however wide it is. Twenty-four tests for twenty-four specification keys are
symptoms; one test that turns red when an unclassified key is encountered is the cause. The
fix-regression ratio cannot expose this, because a wide patch regresses nothing — it merely fails to
generalize — so the named mechanism is what stands in for it.

A fix must not add a new file, a new public interface, a new dependency, or a new abstraction, with one
exception: a test or assertion that pins the invariant may always be added, since it is the mechanism
this section already requires and it widens no product surface. If the root-cause fix needs any of the
others, mark the finding `escalated` and ask the user rather than applying a symptom patch. Stop at the
authority boundary and ask when the fix would change public behavior, architecture, data models or
migrations, security policy, dependencies, production state, or the task scope. Preserve unrelated
work.

A validated defect on a path that carries no code is fixed by the record the finding named and by
nothing wider: a decided acceptance criterion, an open question recorded with an owner and an interim
default, a decision record, or an explicit out-of-scope entry. That record is the mechanism this section
requires, since no test pins a decision, and creating the file it belongs in is not the new surface the
paragraph above forbids. A defect answered by expanding prose is not fixed, it is enlarged. When the
decision is the user's to make, record it as an open question with an interim default or ask them; do not
settle a product question yourself to close a finding.

A fix batch is closed, not just finished. Closing starts with proof the edits landed: re-read every
edited region from disk and see each hunk in the diff, because an edit is applied when the file shows
it, not when the editing tool exited cleanly. A shell that writes files reports success without
comparing anything, so a write through a stream editor, a heredoc, or a script is unproven until the
region is read back. Record in the ledger the paths each finding's fix touched and the hunk that shows
it, so the next pass has the diff and not the claim. Then, before the post-batch checks run, walk the recorded
dependents list and confirm each entry against the edited tree, one by one — an enumeration nobody
walks after the edit is bookkeeping, not verification. Then inventory what the batch itself
introduced — each new event, message, interface element, exemption, and document statement — and hold
it to the same contracts the findings were validated against, because the batch is code no reviewer
has seen and its own additions are where fix regressions live. Finally reread the complete batch diff
in one sitting, asking the reviewer's questions rather than recalling the author's intent. The next
pass exists to verify the fixes, not to be the first reader of their side effects.

Write comments for a reader who never saw the review. Explain why the code is the way it is — "the row
is re-read inside the lock because the balance can change between the check and the write" — and never
which pass, round, or finding produced it. That reader cannot see the review, so the reference is noise
to them, and the provenance already lives in the git history, the phase record, and the test name.
