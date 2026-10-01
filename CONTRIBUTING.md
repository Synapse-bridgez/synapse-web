# Contributing to This Project

Thanks for your interest in contributing! This guide covers everything you need to go from "I want to help" to a merged pull request. If you are new here, welcome — we are glad you found us.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Local Setup](#local-setup)
- [Coding Conventions](#coding-conventions)
- [Adding a New Tab](#adding-a-new-tab)
- [Testing & Coverage Expectations](#testing--coverage-expectations)
- [Claiming & Working a Drips Wave Issue](#claiming--working-a-drips-wave-issue)
- [Pull Request Process](#pull-request-process)
- [Getting Help](#getting-help)

## Code of Conduct

Be kind, be patient, and assume good intent. Harassment or disrespectful behavior is not tolerated. If you experience or witness a problem, please reach out to a maintainer.

## Ways to Contribute

- Fix a bug or implement a feature from the open issues.
- Improve documentation (including this file).
- Add or improve tests.
- Triage issues and help answer questions.

If you are unsure where to start, look for issues labeled `good first issue` or `help wanted`.

## Local Setup

1. **Fork and clone** the repository:

   ```bash
   git clone https://github.com/<your-username>/<repo>.git
   cd <repo>
   ```

2. **Install dependencies** using the package manager declared in the repository (see `package.json` / lockfile). Do not commit lockfile churn unrelated to your change.

3. **Create a branch** off the default branch with a descriptive name:

   ```bash
   git checkout -b fix/short-description
   ```

4. **Run the app locally** using the scripts defined in `package.json` (for example `dev`, `start`, or `build`). Refer to the [README](./README.md) for the canonical, up-to-date commands — this guide intentionally does not duplicate them so the two stay in sync.

## Coding Conventions

- Match the existing style, structure, and naming in the files you touch. When in doubt, follow the surrounding code.
- Keep changes surgical: solve the issue at hand and avoid unrelated refactors or formatting churn.
- Prefer small, focused commits with clear messages.
- Do not commit secrets, tokens, or credentials. See [`docs/security/threat-model.md`](./docs/security/threat-model.md) for how we handle sensitive material.
- Keep documentation and code in sync. If you change behavior, update the relevant docs.

## Adding a New Tab

This project follows a consistent pattern for adding new tabs. Rather than duplicating that walkthrough here (and risking it drifting out of date), please follow the canonical instructions in the README:

> See the **"Adding a new tab"** section in the [README](./README.md).

When you add a tab, make sure to:

- Follow the exact pattern described in the README.
- Add tests covering the new tab's behavior (see below).
- Update any navigation or configuration the README calls out.

If the README's instructions are unclear or out of date, that is a great documentation contribution — please open a PR to fix it.

## Testing & Coverage Expectations

- Every bug fix should include a regression test.
- Every new feature should include tests for the happy path and the important edge cases.
- Run the test suite locally before opening a PR (see the scripts in `package.json`).
- Keep or improve existing coverage; do not merge changes that reduce coverage without a clear justification in the PR description.
- If a change is genuinely untestable, explain why in the PR.

## Claiming & Working a Drips Wave Issue

This project participates in Drips Waves. To work on a Wave issue:

1. **Find an issue** labeled for the current wave (for example `drips-wave` or `good first issue`).
2. **Claim it** by commenting on the issue that you would like to work on it, and wait for a maintainer to assign you. This avoids two people doing the same work.
3. **Work the issue** on a branch in your fork, following the conventions above.
4. **Open a PR** that references the issue (for example `Closes #123`) and describes what you changed and how you tested it.
5. **Respond to review** promptly. If you get stuck, ask — we would rather help than have you bounce off.

Only one contributor should be assigned to an issue at a time. If you are assigned but can no longer work on it, please comment so it can be released.

## Pull Request Process

1. Ensure your branch is up to date with the default branch.
2. Make sure the test suite passes locally.
3. Open a PR with a clear title and description:
   - What problem does this solve?
   - How did you test it?
   - Any follow-ups or known limitations?
4. Link the issue your PR addresses.
5. Keep the PR focused — one logical change per PR where possible.
6. Address review feedback and keep the conversation constructive.

A maintainer will review your PR. First-time contributors can expect a welcome message from our onboarding bot with pointers to this guide.

## Getting Help

- Comment on the issue or PR you are working on.
- Open a discussion or issue if you have a question that is not tied to existing work.
- Be specific about what you tried and what you expected to happen.

Thank you for contributing!
