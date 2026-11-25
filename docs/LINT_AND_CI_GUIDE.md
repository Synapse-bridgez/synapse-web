# Code Quality and CI Pipeline Guide

Guidelines for running local typecheck, lint, and test suites to prevent CI pipeline regressions.

```bash
npm run lint
npm run test
```

## Git hooks

This repository uses [Husky](https://typicode.github.io/husky/) to run checks automatically at key points in the git workflow. The hooks live in `.husky/`.

### pre-push hook

`.husky/pre-push` runs before every `git push`. It executes:

1. **`npm run typecheck`** — `tsc --noEmit` across the whole project. A type error in any file, whether staged or not, will block the push.
2. **`npm run test:unit`** — the full unit test suite. Browser E2E tests are explicitly excluded (they are CI-only; see `.husky/pre-push` for the scope note).

If either command fails, the push is aborted with a message telling you which check failed and how to reproduce it locally.

**Run the same checks manually** (before pushing, or to debug a failure):

```bash
npm run typecheck   # equivalent to: npx tsc --noEmit
npm run test:unit   # unit tests only, no E2E
```

**Skipping the hook** (not recommended for normal work):

```bash
git push --no-verify
```

Only skip when you have a deliberate reason (e.g. a draft push you intend to fix in a follow-up). CI runs the same checks and will catch regressions regardless.

### pre-commit hook

`.husky/pre-commit` runs lint-staged on changed files before each commit. See `package.json`'s `lint-staged` config for the per-extension rules.
