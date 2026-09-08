#!/usr/bin/env bash
# Agent contract gate. Keeps one canonical contract small enough to be read every
# session, and keeps harness-specific files as pointers instead of second contracts.
# Copy into the project (scripts/check-agent-contract.sh) and call it from the single
# local verification entry point, so it runs locally and in CI from the same place.
set -euo pipefail

# Paths and limits. Override per project; raising a limit is a deviation that needs an ADR.
# AGENT_CONTRACT_POINTERS lists every harness file that must import the contract, separated by
# spaces. Set it to the empty string to declare that this project has no harness file — leaving a
# pointer out of the list is how one stops being checked without anyone deciding that it should be.
CONTRACT="${AGENT_CONTRACT:-AGENTS.md}"
POINTERS="${AGENT_CONTRACT_POINTERS-CLAUDE.md}"
MAX_LINES="${AGENT_CONTRACT_MAX_LINES:-300}"
MAX_BYTES="${AGENT_CONTRACT_MAX_BYTES:-15360}"

failed=0
fail() {
  printf 'agent-contract: %s\n' "$1" >&2
  failed=1
}

# A limit that is not a positive integer must stop the run. Left unchecked it reaches `[ ... -gt ]`,
# which answers "not an integer" with status 2 — a status an `if` condition swallows, so the budget
# it guards is silently never compared and the gate reports ok.
for setting in "AGENT_CONTRACT_MAX_LINES:$MAX_LINES" "AGENT_CONTRACT_MAX_BYTES:$MAX_BYTES"; do
  name="${setting%%:*}"
  value="${setting#*:}"
  case "$value" in
    '' | *[!0-9]*) fail "$name must be a positive integer, got \"$value\"" ;;
    *) [ "$value" -gt 0 ] || fail "$name must be a positive integer, got \"$value\"" ;;
  esac
done
if [ "$failed" -ne 0 ]; then
  exit 1
fi

if [ ! -f "$CONTRACT" ]; then
  fail "canonical contract $CONTRACT is missing"
  exit 1
fi

lines=$(awk 'END { print NR }' "$CONTRACT")
bytes=$(wc -c <"$CONTRACT" | tr -d '[:space:]')

if [ "$lines" -gt "$MAX_LINES" ]; then
  fail "$CONTRACT is $lines lines, limit $MAX_LINES — move detail into docs/ and link it"
fi
if [ "$bytes" -gt "$MAX_BYTES" ]; then
  fail "$CONTRACT is $bytes bytes, limit $MAX_BYTES — move detail into docs/ and link it"
fi

# A pointer imports the canonical contract and says nothing of its own. Anything else is a
# second contract: the copies drift, and the session reading the stale one builds the wrong thing.
# Compared as an exact document rather than searched for an import, because a rule can be added
# below one, beside one, or inside a comment, and each way of asking "does the import appear?"
# leaves the other ways clean. The contract path is compared as text, never as a pattern.
for pointer in $POINTERS; do
  if [ ! -f "$pointer" ]; then
    fail "$pointer is missing — the harness that reads it would see no contract at all"
    continue
  fi
  content=$(awk 'NF { gsub(/^[[:space:]]+|[[:space:]]+$/, ""); print }' "$pointer")
  if [ "$content" != "@${CONTRACT}" ]; then
    fail "$pointer must contain @${CONTRACT} and nothing else — move its own rules into $CONTRACT"
  fi
done

if [ "$failed" -ne 0 ]; then
  exit 1
fi

printf 'agent-contract: %s ok (%s lines, %s bytes)\n' "$CONTRACT" "$lines" "$bytes"
