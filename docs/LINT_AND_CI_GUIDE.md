# Lint and CI Guide

This guide covers how linting and continuous integration work in Synapse Core,
and how to reproduce CI locally before opening a pull request.

## Linting

Lint is enforced in CI and can be run locally with the project's lint script.
Run it before committing to catch the same problems CI will.

## GitHub workflows

The workflows under `.github/workflows/` run lint, tests, and other checks on
every push and pull request. A red workflow means the change is not ready to
merge.

## Pre-push hook

The `.husky/pre-push` hook runs a subset of the CI checks before your push
leaves your machine, so obvious failures are caught early. Its shared helpers
live in `.husky/_lib.sh`. See the hook source at
[`.husky/pre-push`](../.husky/pre-push) for the exact commands.

To run the same checks by hand, invoke the commands the hook calls directly
(for example the lint and test scripts) from the repository root. Running them
manually is the recommended way to confirm a push will pass.

### Bypassing the hook

If the hook is genuinely wedged, the sanctioned escape hatch is to set
`SYNAPSE_HOOK_BYPASS` to a non-empty reason:

```
SYNAPSE_HOOK_BYPASS="<why the hook cannot pass right now>" git push
```

An empty value is rejected. The bypass prints a loud reminder and the reason
must be copied into the PR description so the bypass is attributable. Using
`--no-verify` or `HUSKY=0` skips the hook silently and is **not** sanctioned.

Bypassing is discouraged: it defers the failure to CI, where it is more
expensive to diagnose. Fix the underlying problem and push normally whenever
you can.
