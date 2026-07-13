<!-- Template for docs/stages.md. Phases sized in weeks, not months. Update when
     reality changes — a stages file describing an abandoned plan is a bug. -->

# Build stages — {{project}}

## Phase 0 — releasable skeleton

**Goal:** prove the thinnest releasable path for this project's applicable contour;
no product features.

Always includes: repo, local verification, required CI, build, tests, packaging,
release/version path, and documented rollback. Add only applicable capability paths
from `docs/discovery.md`:
deploy + health checks for a service; install + launch for a CLI or client app;
package + consumer example for a library; representative run + safe rerun for a data
job; auth, migrations, backup/restore, and observability when their capabilities apply.

**Done when:** a versioned artifact follows the real release path and is verified in
its target environment; every applicable operational path has been exercised and its
rollback or abort procedure documented.

## Phase 1 — {{name}}

**Goal:** {{one sentence}}.

**Scope sketch:** {{feature areas; detail arrives in the phase requirements slice}}

**Done when:** {{observable criteria}}

## Phase 2 — {{name}}

...

## Sequencing notes

{{Dependencies between phases, deliberate deferrals, links to register entries for
anything pushed out.}}
