# AGENTS.md — ThriftLoop working agreement

ThriftLoop is a web platform for listing and bidding on second-hand clothing. This document is
the source of truth for how work gets done in this repository. Everyone and everything (humans
and AI agents) follows it.

## Language

Everything is written in English: code, identifiers, comments, commit messages, specs, plans,
tasks, README, PR descriptions, and error messages. No exceptions.

## Methodology: Spec-Driven Development (SDD)

No code is written without an approved spec. Every feature starts as a folder under `docs/`:

```
docs/NNN-feature-name/
  spec.md    # what and why: problem, goals, non-goals, acceptance criteria
  plan.md    # how: technical approach, architecture, key decisions, risks
  tasks.md   # execution checklist derived from plan.md, one checkbox per task
```

- `NNN` is a zero-padded, incrementing number (`001`, `002`, ...). See `docs/000-template/`.
- `spec.md` is written and approved before `plan.md`. `plan.md` is written and approved before
  `tasks.md` is executed.
- A task in `tasks.md` is not done until its tests pass and coverage/lint/format gates pass.

## Methodology: Test-Driven Development (TDD)

Red → green → refactor. Write a failing test first, make it pass with the minimum code, then
refactor with tests green.

Test files live **next to** the file they test, never in a separate `tests/` tree:

```
src/bid/bid-service.ts
src/bid/bid-service.test.ts
```

Naming: `*.test.ts` / `*.test.tsx` for unit tests co-located with source.

**This is non-negotiable, not a style preference.** Writing the implementation and its test in
the same pass, even when the test passes and coverage looks fine, is not TDD and is not
acceptable — the test must exist first, fail for the right reason, and only then get made to
pass. This applies to every task from here on, without exception. If red-green-refactor was
skipped on a past change, say so explicitly rather than letting it pass as if it had been
followed.

## Stack

- **Node.js v22** (see `.nvmrc`). Use `nvm use` before working.
- **TypeScript strict**, everywhere. `tsconfig.base.json` enables: `strict`,
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`,
  `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`. Every workspace's `tsconfig.json`
  extends it. Do not weaken these options in a workspace override.
- **Frontend**: React, built with Vite, styled with Tailwind, global state with Zustand.
- **Backend**: Node/TypeScript service(s) under `apps/`.
- **Monorepo**: npm workspaces (`apps/*`, `packages/*`). Shared domain types live in
  `packages/shared`.
- Custom scripts under `scripts/` are TypeScript (`.ts`), executed with `tsx`.

## Code style

- **Minimal comments, written for any developer**, not for a specific person or PR. Do not
  narrate what the code already says. Only comment what the code cannot express on its own: a
  non-obvious constraint, a workaround for a specific external limitation, a genuinely dense
  algorithm. Never leave commented-out or dead code.
- **No magic numbers.** Any literal with meaning becomes a named constant or a config value.
  Enforced by `@typescript-eslint/no-magic-numbers` (0, 1, -1 and array indexes are exempt).
- Formatting is Prettier, enforced as an ESLint error (`prettier/prettier`) — never argue with
  the formatter, run `npm run format`.
- **Cognitive and cyclomatic complexity ≤ 10** per function, enforced by
  `sonarjs/cognitive-complexity` and ESLint's `complexity` rule. If a function needs more,
  split it.
- Line endings are always **LF**. Enforced by `.gitattributes`, `.editorconfig`, ESLint's
  `linebreak-style`, and `npm run check:eol` in CI.
- **Module-level constants and variables go at the top of the file**, before any function or
  class that uses them — they should be the first thing a reader sees, not discovered halfway
  through the file. This is a manual review convention (no automated rule enforces ordering).

## Security

If a security issue is found or introduced at any point — an unhashed/unsalted password, a
committed secret, unvalidated input, SQL/XSS injection risk, an overly permissive CORS policy,
a vulnerable dependency, etc. — **work stops and the human is alerted immediately** with the
specific finding. Security issues are never silently fixed or silently left in place.

The pipeline backs this up automatically:

- `eslint-plugin-security` — common Node.js vulnerability patterns.
- `eslint-plugin-no-secrets` — flags literals that look like credentials/keys.
- `npm audit --audit-level=high` — dependency vulnerabilities.
- CodeQL (`github/codeql-action`) — static analysis for JS/TS.
- Gitleaks — scans commit history for leaked secrets.

## Commit message template

Every commit message has exactly three lines, in this order, each value at most 50 characters:

```
<Type>: <no more than 50 chars>
what: <no more than 50 chars>
why: <no more than 50 chars>
```

`<Type>` is one of these reserved words:

| Type       | Use for                                                 |
| ---------- | ------------------------------------------------------- |
| `Feat`     | New feature or capability                               |
| `Fix`      | Bug fix                                                 |
| `Docs`     | Documentation only                                      |
| `Test`     | Adding or fixing tests, no production code change       |
| `Refactor` | Code change that neither fixes a bug nor adds a feature |
| `Style`    | Formatting, whitespace, no logic change                 |
| `Perf`     | Performance improvement                                 |
| `Chore`    | Tooling, config, dependency, or maintenance work        |
| `Build`    | Build system or packaging changes                       |
| `CI`       | CI/CD pipeline changes                                  |
| `Revert`   | Reverts a previous commit                               |

No Anthropic attribution lines (e.g. `Co-Authored-By: Claude ...`, `Claude-Session: ...` or any
`anthropic.com` / `claude.ai/code` reference) are allowed in commit messages — this is a project
policy applying to any AI-assisted commit, not only Claude's default attribution.

Enforced locally by the `commit-msg` Husky hook and in CI by `npm run check:commits`
(`scripts/check-commit-msg.ts`). CI also re-checks the last 50 commits on every push to `main`
via `npm run check:commits:history`, so no bad commit message can sit unnoticed in recent
history.

## Pipeline gates (CI, `.github/workflows/ci.yml`)

A pull request must pass all of the following before merge:

1. `check:commits` — commit message template
2. `check:eol` — LF line endings
3. `typecheck` — `tsc --noEmit` in every workspace
4. `lint` — `eslint . --max-warnings=0` (complexity, magic numbers, security, secrets, format)
5. `format:check` — Prettier
6. `test:cov` — tests with coverage thresholds **> 85%** (lines, functions, branches, statements)
7. `build`
8. `audit` — `npm audit --audit-level=high`
9. CodeQL analysis + Gitleaks secret scan

### React checks

For `apps/web`, run [react-doctor](https://github.com) locally (via the Claude Code skill)
before opening a PR — it is not yet wired into CI as an npm script. CI enforces the React
subset it can: `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`.

## Architecture

ThriftLoop is a monolith (one API, one frontend). Keep the architecture proportional to that:
layered, not hexagonal/ports-and-adapters — that level of ceremony is not justified yet.

### Backend (`apps/api`)

Three layers, in one direction only: **routes → services → repositories**.

```
apps/api/src/
  routes/
    item.routes.ts            # HTTP endpoints, calls a service, returns the response
  services/
    item.service.ts           # business logic, testable with a fake repository
    item.service.test.ts
  repositories/
    item.repository.ts        # interface: findAll(), findById(), save(), ...
    item.repository.json.ts   # today's implementation, backed by a local JSON file
    item.repository.json.test.ts
  models/
    item.ts                   # domain type/entity
  container.ts                 # wires which repository implementation each service uses
```

Rules that keep storage swappable and business logic isolated:

- `services/` never imports `express`, `fs`, a database driver, or anything from `routes/`. It
  only depends on the repository **interface** declared in `repositories/*.repository.ts`.
- `routes/` stays thin: parse the request, call a service, shape the response. No business logic
  in a route handler.
- The JSON file is an implementation detail behind `ItemRepository`. Moving to MongoDB later
  means adding `item.repository.mongo.ts` that implements the same interface and switching one
  line in `container.ts` — `services/` and `routes/` do not change.
- Service tests use an in-memory fake repository, not the real JSON file — fast, no I/O,
  no shared state between tests.

### Frontend (`apps/web`)

**Atomic Design, simplified to three component layers + pages** (no `templates/` layer — it
rarely earns its keep in an app this size):

```
apps/web/src/
  components/
    atoms/        # smallest building blocks: Button, Input, Badge
      button.tsx
      button.test.tsx
    molecules/     # small groups of atoms with one job: SearchField, PriceTag
    organisms/     # composed sections: ItemCard, BidForm, NavBar
  pages/           # compose organisms, read/write stores, own the route
  stores/          # Zustand stores, one file per domain slice
    item-store.ts
  hooks/           # reusable non-visual logic (custom hooks)
```

- **Styling**: Tailwind utility classes directly in JSX. No separate CSS-in-JS or a parallel
  design-token system unless a real need shows up.
- **State**: [Zustand](https://github.com/pmndrs/zustand) for global/shared state — one small
  store per domain slice (e.g. `item-store.ts`), no single giant store. Local component state
  stays as `useState`/`useReducer`; reach for a Zustand store only when state is shared across
  components that aren't parent/child.
- **Component clarity**: an atom/molecule takes props and renders — no data fetching, no store
  access. Only `organisms/` and `pages/` may read from a store or call an API. This keeps atoms
  and molecules trivially reusable and testable in isolation.

## Getting started

This repository is currently at the **initialization** stage: tooling, config, and this
document exist, but `apps/` and `packages/` source code has not been scaffolded yet. The next
step is to write the first spec under `docs/001-<name>/` (copy `docs/000-template/`), get it
approved, then follow SDD/TDD to scaffold `packages/shared`, `apps/api`, and `apps/web` as part
of implementing that spec.
