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

## Stack

- **Node.js v22** (see `.nvmrc`). Use `nvm use` before working.
- **TypeScript strict**, everywhere. `tsconfig.base.json` enables: `strict`,
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`,
  `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`. Every workspace's `tsconfig.json`
  extends it. Do not weaken these options in a workspace override.
- **Frontend**: React, built with Vite.
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
title: <no more than 50 chars>
what: <no more than 50 chars>
why: <no more than 50 chars>
```

Enforced locally by the `commit-msg` Husky hook and in CI by `npm run check:commits`
(`scripts/check-commit-msg.ts`).

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

## Getting started

This repository is currently at the **initialization** stage: tooling, config, and this
document exist, but `apps/` and `packages/` source code has not been scaffolded yet. The next
step is to write the first spec under `docs/001-<name>/` (copy `docs/000-template/`), get it
approved, then follow SDD/TDD to scaffold `packages/shared`, `apps/api`, and `apps/web` as part
of implementing that spec.
