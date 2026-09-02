<!-- Canonical source. Do not edit the generated copies under packages/*/references/. -->
# The subphase contract

The unit of daily progress is the subphase. This file defines what one is, how large it may be, and
when it is done. The agent that plans subphases and the agent that executes them work from the same
copy, so neither can hold a private definition of "done".

## What a subphase is

A subphase is one coherent, committable increment — typically one to a few commits — **sized to one
fresh context window**. An agent that starts from `scope.md`, `checklist.md`, `blockers.md`, and the
repository, with no conversational history, must be able to carry it to done.

That sizing rule has two consequences, and both are diagnostic rather than inconvenient:

- Needing to compact or clear context mid-subphase means it was two subphases. Split it by appending
  a suffixed sibling (`N.3` keeps what was finished, `N.3a` carries the rest) rather than renumbering
  what follows, so the traceability table and earlier commit messages stay valid.
- Needing a fact that was only ever said in chat means the slice is not recorded yet. Record it in the
  artifact that owns it — scope, blockers, glossary, ADR — and never keep a session alive as that
  fact's storage.

## When a subphase is done

A subphase is done only when **all** of the following hold:

- Local verification green through the project's single recorded entry point; required CI green before
  merge or release.
- New behavior covered by tests, and the change verified by actually running it — not only by tests
  and typecheck passing.
- Every pattern the change introduces more than once carried in with a recorded tree-wide search, run
  after the last occurrence was written, and a disposition for each hit it returned then. A search run
  before the occurrences exist cannot list them, and a class introduced one occurrence at a time is a
  class nobody swept.
- Every linked requirement has acceptance evidence recorded in the traceability table. Evidence is a
  command and its result; "tested manually", "works as expected", and "verified" are not evidence.
- Docs updated in the same change (same-change rule).
- `checklist.md` ticked; the agent-contract status line updated if the completion is externally
  meaningful.

Commit granularity follows subphases; a commit message names the phase and subphase when one applies.
