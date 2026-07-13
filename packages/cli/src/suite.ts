import { withTransaction } from "./transaction.ts";
import type { OperationResult, PreparedOperation } from "./types.ts";

const MUTATING_ACTIONS = new Set([
  "adopt",
  "create",
  "link",
  "migrate",
  "remove",
  "replace",
  "update",
]);

export function combinePreparedOperations(operations: PreparedOperation[]): PreparedOperation {
  const preview = operations.flatMap((operation) => operation.preview);
  const touched = [
    ...new Set(
      preview.filter((entry) => MUTATING_ACTIONS.has(entry.action)).map((entry) => entry.path),
    ),
  ];
  const touchedByOperation = operations.map((operation) => [
    ...new Set(
      operation.preview
        .filter((entry) => MUTATING_ACTIONS.has(entry.action))
        .map((entry) => entry.path),
    ),
  ]);
  let executed = false;

  return {
    preview,
    breaking: operations.some((operation) => operation.breaking),
    execute: async () => {
      if (executed) throw new Error("This prepared skill-suite operation has already executed.");
      executed = true;

      return withTransaction(touched, async (transaction) => {
        const results: OperationResult[] = [];
        for (const [index, operation] of operations.entries()) {
          const result = await operation.execute();
          // The operation has its own preconditions and rollback. Mark it only after success so the
          // outer rollback cannot overwrite a concurrent change in a later, not-yet-started skill.
          for (const path of touchedByOperation[index] ?? []) {
            await transaction.beforeMutation(path);
          }
          results.push(result);
        }

        return {
          changed: [...new Set(results.flatMap((result) => result.changed))],
          skipped: [...new Set(results.flatMap((result) => result.skipped))],
          backups: results.flatMap((result) => result.backups),
          notes: [...new Set(results.flatMap((result) => result.notes))],
        };
      });
    },
  };
}
