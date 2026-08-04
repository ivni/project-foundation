# The teaching workspace

Every artifact here has one job and one canonical home. Keep each one short: this is a set of
instruments for steering the next session, not a record of the course.

## MISSION.md

The reason the user is learning this topic. Instantiate from
[templates/mission.md](../templates/mission.md).

- **One mission per workspace.** Two unrelated topics are two workspaces.
- **Concrete over abstract.** The mission names a real-world outcome, not a subject area. Push back on
  vagueness; interview before writing anything.
- **Its `Out of scope` section is load-bearing.** Adjacent topics the user has ruled out protect the
  zone of proximal development from drifting into whatever is interesting today.
- **Revise when the goal moves**, with the user's confirmation and a learning record for the change. A
  stale mission steers every later session wrong.
- **Keep it under a screen.** Past that it has stopped being a compass and become a plan.

## RESOURCES.md

The curated sources this workspace teaches from, and the communities where the skill meets reality.
Instantiate from [templates/resources.md](../templates/resources.md).

- **High-trust only.** Prefer primary sources, recognized experts, peer-reviewed work, and communities
  with real moderation. Marketing dressed as education stays out.
- **Annotate every entry** with what it covers and when to reach for it. A bare link is useless in
  three months.
- **Separate knowledge from wisdom.** Sources supply knowledge; communities supply wisdom. An entry may
  appear in only one group.
- **Record gaps explicitly.** When the mission needs an area no good source covers, list it under
  `Gaps`. That list drives the next search, and it is the honest alternative to teaching from memory.
- **Prune rather than bury.** A source that turned out shallow, wrong, or off-mission is removed.
  Five sharp sources beat thirty mediocre ones.
- **Record a stated preference about communities** so later sessions stop proposing them.

## GLOSSARY.md

The workspace's canonical language. Instantiate from
[templates/glossary.md](../templates/glossary.md). Lessons, references, and learning records use its
terms rather than synonyms for them.

- **Add a term only once the user can use it correctly.** The glossary records compressed
  understanding; it is not a dictionary the user reads in order to learn. Building it is itself
  evidence of learning.
- **Be opinionated.** Where the field uses several words for one concept, choose one and list the rest
  as synonyms to avoid.
- **Keep definitions tight** — one or two sentences, saying what the term *is*, not how to do it.
- **Use the glossary's own terms inside its definitions.** This is what makes later terms cheap to
  grasp.
- **Flag ambiguity instead of resolving it silently.** When the wider field uses a term loosely,
  record the resolution this workspace adopts: "here, a *set* is always a working set; warm-ups are
  tracked separately."
- **Revise in place.** A definition written in week one may be wrong by week six. Correct it; do not
  leave both.

## learning-records/

The teaching equivalent of architecture decision records: what is now known, and what that changes
about the next session. Files are `learning-records/NNNN-<dash-case>.md`, numbered by scanning for
the highest existing number and incrementing. Instantiate from
[templates/learning-record.md](../templates/learning-record.md).

Write one when any of these is true:

1. **The user demonstrated understanding of something non-trivial** — not exposure, but evidence they
   can use the concept correctly. This raises the floor of what to teach next.
2. **The user disclosed prior knowledge.** Record the claim *and the depth claimed*, so later sessions
   neither re-teach it nor overestimate it.
3. **A misconception was corrected.** These are the highest-value records: they predict where the user
   will stumble on adjacent material.
4. **The mission shifted because of something learned.** Cross-link the record and update
   `MISSION.md` in the same change.

What does not earn a record: material merely covered, a term already defined tersely in
`GLOSSARY.md`, and session-by-session activity. These records are decision-grade inputs, not a
journal.

When a later record contradicts an earlier one, mark the old one superseded rather than deleting it.
How the understanding changed is itself a signal about how the user learns.

## lessons/

One lesson is one self-contained HTML file, `lessons/NNNN-<dash-case>.html`, numbered like the
records. Construction rules live in [lesson-design.md](lesson-design.md).

Lessons are rarely revisited — that is what `reference/` is for. Do not rewrite an old lesson to
correct it; teach the correction in a new one and record it.

## reference/

The compressed essence of what the lessons taught, in a form built for looking things up:
cheat sheets, reference algorithms, syntax tables, sequences, checklists. HTML, and designed to
print cleanly, because these are the documents the user actually returns to.

A reference document is derived, never primary: everything in it was taught in a lesson first. It
carries no exercises and no narration.

## assets/

Components shared across lessons — stylesheet, quiz widget, simulators, diagram helpers: anything a
second lesson could reuse. Reuse is the default. Read `assets/` before authoring a lesson and build
from what is there; when a lesson needs something new and reusable, write it as a component and link
it rather than inlining code the next lesson would duplicate.

The shared stylesheet is the first component every workspace earns. Without it the lessons look like
a pile of one-offs instead of one course.

## NOTES.md

The workspace's language choice, how the user wants to be taught, what has visibly worked or failed,
and your own working notes. Anything here that turns out to be decision-grade about *learning* graduates
to a learning record; `NOTES.md` keeps the rest.
