# Designing lessons

## Fluency is not retention

Two different things get called learning:

- **Fluency strength** — the user can retrieve it right now, while the material is in front of them.
- **Storage strength** — the user can retrieve it weeks later, cold.

Fluency arrives quickly and gives an illusory sense of mastery. Storage strength is the goal, and it
is built by **desirable difficulty**: the user must work to retrieve, not merely to follow.

Three levers, in order of how often they apply:

- **Retrieval practice** — recall from memory rather than recognition from a list. Ask before showing.
- **Spacing** — revisit a concept in a later session rather than drilling it once. When a record says
  something was learned three sessions ago and nothing has touched it since, that is the cue.
- **Interleaving** — mix related-but-distinct material in one practice set. Only for skill practice;
  never while knowledge is still being acquired.

## Difficulty cuts both ways

- **Acquiring knowledge:** difficulty is the enemy. It consumes the working memory the user needs to
  understand. Plain language, one idea at a time, every claim cited.
- **Acquiring skill:** difficulty is the tool. Effortful retrieval is the mechanism that converts
  fluency into storage.

A lesson normally does both, in that order: teach only the knowledge the target skill requires, then
practice the skill.

## The zone of proximal development

Every lesson should feel like *just enough* challenge. When the user has not named a target, derive
it:

1. Read the learning records — they set the floor. Anything already recorded as understood is not the
   target, and anything recorded as a corrected misconception suggests adjacent material to shore up.
2. Read the mission — it sets the direction, and its `Out of scope` section bounds the search.
3. Take the most mission-relevant thing that sits one step above the floor.

If nothing sits one step above the floor, the missing piece is knowledge, not a lesson: go find a
source first.

## What a lesson is

One self-contained HTML file that teaches one tightly-scoped thing tied to the mission.

- **Short and completable quickly.** Working memory is small. One tangible win the user can build on
  beats a comprehensive treatment they abandon.
- **Beautiful.** Clean typography and layout, in the Tufte spirit — the user will come back to these.
- **Cited throughout.** Links to the external sources behind each claim. Citations are what make a
  lesson trustworthy rather than plausible.
- **Pointed at one primary source** — the single highest-quality thing the user should read or watch
  next on this topic.
- **Linked.** HTML anchors to related lessons and to the reference documents it draws on.
- **Interactive where a skill is being practiced**, built on a feedback loop that responds immediately
  and, where possible, automatically.
- **Ending with an invitation to ask.** You are the teacher, not the document; anything unclear should
  come back as a question.

Open the lesson for the user with a CLI command when the environment allows.

## Feedback loops

A skill is practiced against a loop, and the loop's tightness is what makes practice work. Two shapes
cover most topics:

- **In-browser** — quizzes, small tasks, simulators. The lesson grades and explains immediately.
- **In the world** — a sequence of real steps the user performs, with observable criteria for each, and
  a place to report back. Slower, and the right shape when the skill is physical or social.

State the criterion for success before the user attempts the task. A loop whose verdict you supply
afterwards teaches them to read you rather than the material.

## Writing a quiz

- Every answer option is the same number of words, and the same number of characters where that is
  achievable. Length, specificity, and hedging are all tells — a user who can pick the right answer
  from its formatting has practiced nothing.
- Distractors are plausible failures, not jokes. A wrong option should be something the user might
  actually believe.
- Explain the *why* on both outcomes. A correct answer with no explanation may have been a guess.

## Build from components

Read `assets/` before authoring. Reuse is the default; a second copy of the same widget is a defect,
not a shortcut. Anything a future lesson could plausibly need — stylesheet, quiz widget, simulator,
diagram helper — is written as a component under `assets/` and linked, never inlined.

The library grows with the workspace, and the consistency it produces is the point: the lessons
should read as one course.

## Then record

A lesson is finished when the workspace has been updated, not when the file exists. Write the
learning record, promote any term the user can now use, distill anything worth returning to into
`reference/`, and note any preference the session revealed. A lesson delivered and not recorded will
be taught again.
