<!-- Template for docs/glossary.md — the project's canonical language. Translate headings
     into the artifact language. Delete guidance comments after instantiating.

     This file is a glossary and nothing else: no implementation details, no requirements,
     no scratch notes. One term means one thing. A term is added the moment it is resolved,
     not batched at the end of a phase. -->

# Glossary — {{project}}

The canonical language of this project. Docs, commit messages, identifiers in code, test
names, and conversation with the agent use these terms and no synonyms for them.

Renaming a term is a change to this file **and** to the code and docs that use it, in the
same change. A term here that the code contradicts is a defect in one of the two — decide
which, then fix that one.

## Terms

<!-- One entry per term. `Avoid` is what makes the glossary bite: without the rejected
     synonyms recorded, the next session reintroduces them. -->

### {{Term}}

{{What it means, in domain language. Define it so a person who knows the problem but not
the codebase can read it.}}

- **Avoid:** {{rejected synonyms and near-misses, with the reason when it is not obvious}}
- **Source:** {{DEC-NNN in discovery / ADR-NNNN / user decision and date}}

## Relationships

<!-- The structural facts between terms that no single definition carries. Keep to the
     relationships that change how code is shaped. -->

- A **{{Term}}** has many **{{Term}}**
- A **{{Term}}** belongs to exactly one **{{Term}}** at a time

## Flagged ambiguities

<!-- The record of terms that meant two things, and what was decided. This section is why
     the same argument does not happen twice. Keep resolved rows; the history is the point. -->

| Term | What it ambiguously meant | Resolution | Date |
|---|---|---|---|
| {{term}} | {{the two or more readings that were in use}} | {{the canonical term and what the other reading is now called}} | {{YYYY-MM-DD}} |
