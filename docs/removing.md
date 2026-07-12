# Removing

Run:

```bash
bunx @ivni/project-foundation remove
```

Choose a scope and then choose the agent environments that should stop discovering the skill. No
agents are preselected for removal.

## Shared installations

One physical installation may serve several agents. Removing a subset does not blindly delete the
shared payload. The installer computes a new topology and can move native links or copies so every
unselected agent continues to discover Project Foundation.

Example: a Codex target may also serve Pi. If Codex is removed but Pi remains, the installer can move
discovery to Pi's native skill root before removing the Codex target.

Availability is not strict isolation. Some agents intentionally discover another agent's compatible
path. If a path required by a remaining agent is also scanned by an agent selected for removal, the
wizard reports that the removed agent may still discover it.

## Local modifications

When the entire modified installation would be removed, the wizard offers:

- Show diff
- Remove
- Back up and remove
- Keep

## Backups

After creating a backup, the wizard can review retention:

- Keep all
- Keep the latest three per agent and scope
- Remove backups older than 30 days
- Remove all backups

Cleanup always shows a final count and requires confirmation. Backup storage is outside the project,
so cleanup never changes repository files.
