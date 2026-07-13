# Copy vs link

## Link (recommended)

Link keeps one managed payload and creates directory links in the native agent locations: symbolic
directory links on macOS and Linux, and directory junctions on Windows.

Benefits:

- One physical payload for all selected agents
- Updates replace one managed directory
- Cross-agent deduplication is easy to inspect
- Partial removal can re-plan links without duplicating content

Tradeoffs:

- Filesystem permissions or endpoint policy can block directory-link creation
- Moving the managed store manually breaks native links
- Some backup and sync tools treat links differently

Windows junctions do not normally require Developer Mode. If Windows denies link creation, the
installer rolls back the attempt and offers three choices: install copies, show permission help, or
cancel. It never asks for elevation and never launches an elevated process.

Not every agent explicitly documents whether its scanner follows directory links. See
[Compatibility sources](compatibility.md#managed-link-evidence) for the current evidence. Use copy
strategy when link following is restricted or uncertain in the target environment.

## Copy

Copy writes an independent payload into each planned native target.

Benefits:

- Works in environments where links are restricted
- Every native location is self-contained
- Straightforward behavior for backup and sync software

Tradeoffs:

- Multiple physical payloads may exist
- Updates must replace every selected managed copy
- Local edits can diverge between copies

## Receipts

Every managed physical payload includes `.project-foundation.json`. The receipt records:

- package and schema identity
- installed version
- scope and strategy
- intended agent environments
- a SHA-256 digest for each payload file
- a combined payload digest

The receipt lets update and remove distinguish managed content from unrelated user content and detect
local modifications without a network request.
