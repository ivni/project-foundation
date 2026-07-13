# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-07-13

### Added

- Added the read-only `find-blind-spots` skill with evidence-based prioritization and explicit
  resolution routing.
- Added the no-code `run-discovery-interview` skill with one-question decision closure and a single
  scratch-record template.
- Added suite-level rollback tests and coverage for independent skill targets and optional payload
  resources.

### Changed

- Extended the installer to select, install, update, and remove any combination of the three packaged
  skills through one registry-driven architecture.
- Standardized every payload on `packages/<skill-id>`, every managed store on
  `store/skills/<skill-id>`, and every receipt on schema 2 with a required `skillId`.
- Added an outer compensating transaction for multi-skill confirmations and scoped backup retention
  by skill, agent, and installation scope.

### Removed

- Removed schema 1 receipt support and the special `project-foundation` managed-store path. Older
  installations are treated as unmanaged content and require an explicit install conflict decision.

## [1.0.2] - 2026-07-13

### Added

- Automated verification for public Markdown links, structure, changelog state, release notes, and
  npm package documentation.

### Changed

- Migrated the GitHub Actions release workflow to npm trusted publishing with short-lived OIDC
  credentials.
- Refreshed agent compatibility sources and documented managed-link evidence separately from skill
  path support.

### Fixed

- Included the complete `docs/` directory in the npm package.
- Corrected Windows directory-junction guidance and the private security reporting channel.

## [1.0.1] - 2026-07-13

### Added

- Initial public release of the interactive Bun installer for Codex, Claude Code, Pi, OpenCode, and
  Hermes Agent.
- User and project scopes with copy and managed-link strategies.
- Transactional install, update, and remove operations with conflict previews and backups.
- Cross-platform filesystem adapters for Windows, macOS, and Linux.

### Fixed

- Canonical path handling for managed-link migrations on macOS and Windows.

[Unreleased]: https://github.com/ivni/project-foundation/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/ivni/project-foundation/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/ivni/project-foundation/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/ivni/project-foundation/releases/tag/v1.0.1
