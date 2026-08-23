# HOS API Git Workflow and Release Process

## Purpose

This is the copy-paste runbook for moving HOS API code from development to UAT and then production. One maintainer commits on `hos-development` and promotes with direct merges. Do not create `feature/*` or `release/*` branches for normal work.

Run every command block from the `HOS_API` repository root. Replace placeholders such as `Your commit message` and `v0.1.0` before you run a block.

To install and run the Django backend in a virtualenv, use [backend-runbook.md](backend-runbook.md). To deploy with Docker Compose, use [docker-compose-runbook.md](docker-compose-runbook.md).

```text
hos-development (daily work) → hos-uat → main → production tag
```

## Long-lived branches

| Branch | Environment | Purpose | Deployment target |
| --- | --- | --- | --- |
| `hos-development` | Development | Daily development and integration. | Development server, when available |
| `hos-uat` | UAT / staging | Candidate code for testing and acceptance. | UAT / staging server |
| `main` | Production | Exact source code currently approved for production. | Production server |

`main` is the production source of truth. Do not create a separate `hos-prod` branch. Do not force-push or delete `hos-development`, `hos-uat`, or `main`.

The only short-lived branch is `hotfix/<short-description>`, used for urgent production corrections.

---

## 1. Push code to development

Work only on `hos-development`. Copy, replace the commit message, then paste:

```bash
cd /path/to/HOS_API
git checkout hos-development
git pull origin hos-development
git status
git add -A
git commit -m "Your commit message"
git push origin hos-development
```

Deploy the development server from `hos-development` when that environment exists. Backend first, then frontend:

```bash
cd /path/to/HOS_API/Hospital-Management-API
./scripts/deploy-development.sh

cd /path/to/HOS_API/Hospital-Web-UI/medixpro/medixpro
./scripts/deploy-development.sh
```

---

## 2. Promote development to UAT

When a tested batch on `hos-development` is ready for acceptance testing, copy and paste:

```bash
cd /path/to/HOS_API
git checkout hos-uat
git pull origin hos-uat
git merge hos-development
git push origin hos-uat
```

Deploy UAT from `hos-uat`. Do not promote to production until UAT is approved.

```bash
cd /path/to/HOS_API/Hospital-Management-API
export AWS_REGION=ap-south-1
export ECR_REGISTRY=123456789012.dkr.ecr.ap-south-1.amazonaws.com
export ECR_REPOSITORY=hos-api
export NGINX_SERVER_NAME=uat-api.example.com
./scripts/deploy-uat.sh

cd /path/to/HOS_API/Hospital-Web-UI/medixpro/medixpro
export AWS_REGION=ap-south-1
export ECR_REGISTRY=123456789012.dkr.ecr.ap-south-1.amazonaws.com
export ECR_REPOSITORY=hos-web
./scripts/deploy-uat.sh
```

---

## 3. Promote UAT to production

After UAT approval, merge `hos-uat` into `main`, deploy production from `main` using the **same UAT image SHA**, then tag. Copy, replace `v0.1.0` and `<uat-validated-git-sha>` with the real values, then paste:

```bash
cd /path/to/HOS_API
git checkout main
git pull origin main
git merge hos-uat
git push origin main
git tag -a v0.1.1 -m "Release v0.1.1"
git push origin v0.1.1
```

Deploy production from `main` with the UAT-validated image tag (do not rebuild):

```bash
cd /path/to/HOS_API/Hospital-Management-API
export AWS_REGION=ap-south-1
export ECR_REGISTRY=123456789012.dkr.ecr.ap-south-1.amazonaws.com
export ECR_REPOSITORY=hos-api
export NGINX_SERVER_NAME=api.example.com
export RDS_INSTANCE_ID=hos-prod-postgres
export HOS_IMAGE_TAG=<uat-validated-git-sha>
./scripts/deploy-production.sh

cd /path/to/HOS_API/Hospital-Web-UI/medixpro/medixpro
export AWS_REGION=ap-south-1
export ECR_REGISTRY=123456789012.dkr.ecr.ap-south-1.amazonaws.com
export ECR_REPOSITORY=hos-web
export APPROVED_SHA=<uat-validated-git-sha>
./scripts/deploy-production.sh
```

Tag only code that was deployed to production. Use `vMAJOR.MINOR.PATCH`. Create a GitHub Release with changes, migration actions, and rollback notes.

If a hotfix later made `main` diverge from development, sync `hos-development` after the production tag:

```bash
cd /path/to/HOS_API
git checkout hos-development
git pull origin hos-development
git merge main
git push origin hos-development
```

---

## 4. Hotfix (emergency only)

Use this only for an urgent production correction. Copy, replace `fix-token-expiry` and the commit message, then paste. After you deploy `main`, replace `v0.1.1` with the next patch version:

```bash
cd /path/to/HOS_API
git checkout main
git pull origin main
git checkout -b hotfix/fix-token-expiry
# edit files
git add -A
git commit -m "Your hotfix commit message"
git checkout main
git merge hotfix/fix-token-expiry
git push origin main
git tag -a v0.1.1 -m "Release v0.1.1"
git push origin v0.1.1
git checkout hos-uat
git pull origin hos-uat
git merge main
git push origin hos-uat
git checkout hos-development
git pull origin hos-development
git merge main
git push origin hos-development
git branch -d hotfix/fix-token-expiry
```

---

## Promotion and rollback checklist

Before every promotion, confirm the source and target branches, run relevant tests, review migrations, confirm target environment variables, back up production data before production migrations, and record the deployed tag and time.

If a production release fails, redeploy the last known-good production tag. Do not rewrite `main` history; use the hotfix block above for the permanent correction.

---

## When a second contributor joins

Keep the repository owner as the only Admin until then. Do not enable mandatory branch protections while this is a solo workflow.

When another contributor joins, protect `hos-uat` and `main` first: require pull requests, block force-push/deletion, and require CI checks. Reintroduce `feature/*` branches from `hos-development` for parallel work.
