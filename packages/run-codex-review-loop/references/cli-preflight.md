# Codex CLI reviewer preflight

Use this reference with the selected host adapter whenever the packaged Codex CLI wrapper is the
review path. It does not replace host-specific permission, execution or cancellation rules. A native
Codex reviewer that satisfies the Codex adapter's controls does not need this CLI probe.

On Linux, before sending a context packet to the CLI reviewer, probe the same Codex executable in
the intended execution environment with `codex sandbox --permission-profile :read-only -- /bin/true`.
This probe contains no repository content and does not consume a review pass. A successful probe is
not proof that authentication, model access, or the full review will work. If the CLI does not support
the probe, report that the capability is unverified rather than treating it as a successful check.
Diagnose a failed probe before attempting a review. For example, the nested Linux sandbox can fail
when the outer sandbox masks its daemon socket directory; changing `CODEX_HOME` alone does not fix
that conflict. Do not change socket permissions or weaken isolation to force the probe to pass.
An orchestrator or standalone stage performs this probe before implementation, in the environment
intended for its worker, and records the actual result. A worker may reuse that result only while the
executable and effective environment remain applicable; recheck on relevant changes. If a supported
permission request is necessary, make a content-free probe request before preparing a review packet.

If a supported host permission request is needed, make the exact command reviewable and identify the
original user invocation (including a user-started feature or phase) as the source of authorization
to send in-scope task changes and necessary context to Codex. State which process runs outside the
outer sandbox, what it reads or writes, the reviewer's separate read-only boundary, and the
destination. Do not imply the entire launcher is read-only. Exclude credentials and unrelated private
data from the review packet. The host may still deny the request. Honor that decision; never route
around a rejection, and ask only for the specific missing authorization or decision the host requires
after completing permitted work. Report the actual denial and its stated reason; do not assume every
denial means consent is absent. Preserve existing scoped consent, and do not ask again merely because
in-scope files changed. Retry a denied action only when there is genuinely new authorization or
another material change relevant to the stated reason, through the normal permission mechanism; a
changed run ID alone is not one.

Read-only restricts writes, not reads. Omitting secrets from the packet does not prevent the reviewer
from reading other files exposed by its filesystem sandbox. Describe the actual readable scope and
do not promise secret exclusion unless access is technically restricted or the accessible content
has been verified; honor narrower data-access rules before launch.
