# Code Quality and CI Pipeline Guide

Guidelines for running local typecheck, lint, and test suites to prevent CI pipeline regressions.

```bash
npm run lint
npm run test
```

## i18n key parity

`npm run i18n:check` (`scripts/check-i18n-keys.mjs`) compares the dotted key paths in `i18n/messages/es.json` against `en.json`. It fails, listing each path, if a key is missing from `es.json` or extra in it. Translations do not need to be complete, only the key sets must match. CI runs it in the `lint-typecheck-build` job.
