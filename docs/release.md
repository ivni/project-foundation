# Release process

Releases follow SemVer and [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Prepare

1. Update `package.json` to the intended version.
2. Move changelog entries from `Unreleased` to the release date.
3. Re-check every source in `docs/compatibility.md` when paths or discovery behavior may be affected.
4. Run `bun install --frozen-lockfile`.
5. Run `bun run check`.
6. Inspect `npm pack --dry-run --json --ignore-scripts` and confirm the bundle, complete registered
   skill payloads, and public package documents are present.

## Publish

Create and push an annotated tag matching the package version. Replace `X.Y.Z` in both commands:

```bash
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin vX.Y.Z
```

The release workflow:

1. Checks that the tag and `package.json` version match.
2. Runs the complete test and package verification suite.
3. Publishes the package to npm with the `latest` dist-tag using trusted publishing (OIDC).
4. Creates a GitHub Release using the changelog entry.

The npm package must configure GitHub Actions as its
[trusted publisher](https://docs.npmjs.com/trusted-publishers):

- Organization or user: `ivni`
- Repository: `project-foundation`
- Workflow filename: `release.yml`
- Environment: `npm`
- Allowed action: `npm publish`

The workflow uses short-lived OIDC credentials and does not require a long-lived npm publish token.
Trusted publishing can only be configured after the package exists in the npm registry, so the very
first release must be published interactively before enabling automated releases.

## Recovery

npm package versions are immutable. If a release is wrong, fix forward with a new patch version.
Deprecate a broken version in npm if necessary. Do not move an existing Git tag or overwrite a
published tarball.
