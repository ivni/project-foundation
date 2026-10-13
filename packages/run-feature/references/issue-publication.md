<!-- Canonical source. Do not edit the generated copies under packages/*/references/. -->
# Issue operations across platforms

Use this reference for issue creation, discovery publication, progress updates, and recovery. The
workflow contract is independent of the forge; choose only the applicable platform path below.

## Resolve the actual forge

Use the explicit destination or the verified project remote, including SSH remotes. Resolve the
real host and complete project namespace, including nested groups. Confirm the forge using project
configuration, an authenticated connector, or server metadata; a hostname substring is not proof.
Support self-managed and enterprise hosts without assuming `gitlab.com` or `github.com`.

Bind issue requests, upload requests, authenticated reads, and local feature state to that same
host/project identity. Use returned canonical repository and issue URLs, not a constructed GitHub
URL pattern. An issue number is meaningful only with its project. Preserve an existing authenticated
tool's host configuration; do not send credentials to another host or print them. Never switch
platforms merely because `gh` or `glab` is available. If a CLI is absent, use another already available
authenticated connector, API, or browser for the selected forge, or report the concrete blocker.

Check installed command help and the target server's API capabilities before using optional flags.
Use structured arguments or a JSON/Markdown body file for multiline content; do not interpolate
discovery or issue text into executable shell code. Do not install or upgrade tooling silently.

## GitLab, including self-managed instances

Use `glab` with the verified host and full project path, or an authenticated GitLab connector/API.
Resolve the numeric project ID or URL-encode the entire namespace for API requests. In the
[Issues API](https://docs.gitlab.com/api/issues/), issue requests use project-scoped `iid`, not the
global issue `id`; issue content is `description`, comments are notes, and the returned link is
`web_url`. Preserve the complete namespace in `--repo` selections.

Typical API operations are `POST projects/:id/issues`, `GET`/`PUT
`projects/:id/issues/:issue_iid`, and `GET`/`POST `projects/:id/issues/:issue_iid/notes`.
When the installed CLI lacks a description-file flag, generate a JSON body with `title` and
`description` and use `glab api --hostname HOST --method POST projects/PROJECT_ID/issues --input BODY_JSON`.
Use the appropriate method/fields for reads and updates; never assume GitHub flag names work in `glab`.

The [Markdown uploads API](https://docs.gitlab.com/api/project_markdown_uploads/) accepts a file at
`POST projects/:id/uploads`. With a `glab` version supporting multipart requests, the operation is:

```sh
glab api --hostname HOST --method POST projects/PROJECT_ID/uploads --form "file=@DISCOVERY_PATH"
```

Replace the placeholders with the verified identity and safely quoted file path. Confirm `--form`
in actual help; [glab API documentation](https://docs.gitlab.com/cli/api/) describes multipart fields.
Otherwise use an available connector or the documented multipart API with existing authentication.

Save the returned upload locator immediately. Keep the response's `markdown` link in the issue
description; its `/uploads/...` link has project context and must not be treated as a root URL on an
arbitrary host. Resolve returned `full_path` using the verified instance URL, or retain the documented
project upload locator for authenticated downloading. Store an absolute `discovery_ref` for later
sessions and preserve the locator in a checkpoint when needed. Verify the saved link in that project.

Use a documented download route supported by the actual server/account to compare the uploaded
bytes with the publication digest. Upload listing and download by numeric upload ID can require
stronger roles than downloading by secret/filename; do not demand broader credentials when a valid
existing download route suffices. Honor [GitLab's upload visibility](https://docs.gitlab.com/security/user_file_uploads/):
a confidential issue in a public project does not make its attachment private.

## GitHub, including enterprise instances

Use `gh` bound to the verified host/repository, or an authenticated GitHub connector/API. Issue
content is `body`, its project-scoped identifier is `number`, and its returned link is `html_url`.
Use actual returned URLs and the configured API base for enterprise hosts. JSON bodies and CLI
`--body-file` preserve literal Markdown without shell interpolation.

[GitHub's attachment documentation](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files)
lists Markdown among browser-uploadable documents. [GitHub CLI attachments](https://docs.github.com/en/github-cli/github-cli/attaching-files-with-github-cli)
are limited to images and videos; `--attach` does not establish Markdown support. Use an available
authenticated browser/connector supporting document upload or the immutable-file alternative below.
This is a GitHub-specific limitation, not a requirement for a GitLab workflow to use a browser.

## Other issue platforms

Use an available authenticated integration on the selected host. Establish its equivalents for
project identity, issue identifiers, descriptions, comments, checklist updates, document uploads,
and authenticated readback. Do not impose GitHub/GitLab-specific URL paths, CLI flags, ID fields, or
API endpoints. If a needed operation is unsupported, preserve useful local work and report that
operation precisely instead of migrating the task to another platform.

## Discovery file and recoverable writes

Publish an actual discovery attachment in the issue or a linked issue comment. Preserve its bytes
and digest. If a supported archive is needed, verify its contained Markdown. Redact a publication
copy when necessary; retain the original. Match the actual attachment visibility to the content.

An already published repository file is an alternative only when its immutable commit permalink
resolves to the matching snapshot. A local path, branch URL, or unpushed commit is insufficient.
Issue publication does not authorize a repository push, separate gist, or unrelated file host.

Search/list the selected project's existing issues, including closed issues and all needed pages,
and match the exact feature marker before creation and on recovery. If search does not index hidden
markers reliably, inspect raw descriptions of candidate issues instead of assuming no match.
Persist every returned upload/issue URL before the next operation, including on a partial failure.
An upload before issue creation cannot be recovered by searching the feature marker alone.

After uncertain writes, inspect the actual resources and repair only missing operations. An
unresolved outcome means checkpoint and stop before another create/upload/comment call. Read back
the issue and progress updates, fetch discovery bytes with the correct host's authentication, and
compare the content digest. Only complete verified publication makes a feature executable.
