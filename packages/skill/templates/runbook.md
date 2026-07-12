<!-- Template for docs/runbooks/<procedure>.md. Exact commands with expected
     output, not prose. Written when the procedure is first performed. -->

# Runbook — {{procedure, e.g. deploy / restore from backup / rotate credentials}}

**When to use:** {{trigger situation}}
**Preconditions:** {{access needed, state that must hold before starting}}
**Expected duration:** {{minutes}}

## Steps

1. {{command}}

   ```bash
   {{exact command}}
   ```

   Expected: {{what success looks like — output, status code, log line}}

2. ...

## Verification

{{How to confirm the procedure worked end-to-end: health endpoints, a probe request,
a log entry to look for.}}

## Rollback / abort

{{How to back out from each point of no return; where the point of no return is.}}

## Known failure modes

- {{symptom}} → {{cause}} → {{fix}}
