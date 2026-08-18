# Contributing to HOS API

This repository uses a three-environment Git workflow:

- `hos-development` — daily development and integration
- `hos-uat` — user acceptance testing (UAT) / staging
- `main` — production

Read the copy-paste runbook before pushing work or promoting a release:

- [Git workflow and release process](docs/git-workflow.md)
- [Backend runbook (dev / UAT / production)](docs/backend-runbook.md)
- [Backend structure review and plan](docs/backend-structure-review.md)

## Quick start

1. Commit and push on `hos-development`. Do not create a `feature/*` branch.
2. Promote tested work by merging `hos-development` into `hos-uat`.
3. After UAT approval, merge `hos-uat` into `main` and deploy production.
4. Create an annotated `vX.Y.Z` tag only after a production deployment.

Copy-paste command blocks for each step are in [docs/git-workflow.md](docs/git-workflow.md).

Do not commit credentials, `.env` files, local databases, generated media, caches, or deployment-specific runtime data.
