# Backend Repository Structure Review and Plan

## Scope

This is the staged production-readiness plan for the Django backend. Implement one phase at a time on `hos-development`, then promote it through `hos-uat` and `main` using [the Git workflow](git-workflow.md).

## Current structure

```text
HOS_API/
├── CONTRIBUTING.md
├── docs/
├── Hospital-Management-API/        # Django backend deployment root
│   ├── manage.py
│   ├── main/                       # Django configuration and root URL routing
│   ├── account/                    # Custom user model and authentication
│   ├── doctor/                     # Doctor domain and API
│   ├── patient/                    # Patient, history, cost, and appointment domain
│   ├── hospitalAdmin/              # Administration domain and API
│   ├── requirements.txt            # Backend dependency definition
│   └── shared_docs/                # Backend-specific documentation
└── Hospital-Web-UI/                # Separate frontend workspace
```

`Hospital-Management-API/` is the backend working directory for local runs, CI, and deployment. The Django project package `main` is unrelated to the Git production branch named `main`.

## Findings and intended outcomes

| Priority | Finding | Outcome |
| --- | --- | --- |
| High | Runtime configuration must not keep secrets, database credentials, or production values in source code. | Separate development, UAT, and production settings backed by environment variables. |
| High | The backend needs repeatable installation, checks, tests, and later deployment. | Maintain one authoritative dependency process, then add CI and deployment workflows. |
| Medium | Django domain apps and migrations are already separated. | Retain the layout; do not move apps during production-readiness work. |
| Medium | Backend and frontend share the repository root. | Keep the backend directory as the explicit deployment root. |
| Medium | Automated tests and operations must be reliable before releases. | Build a focused test suite, health checks, logging, deployment, and rollback runbooks. |

## Target structure: incremental and low-risk

Do not move the Django project immediately. Retaining `Hospital-Management-API/` avoids breaking imports, migrations, and existing tooling.

```text
HOS_API/
├── .github/workflows/              # CI and later deployment workflows
├── docs/                           # Architecture, runbooks, and release documentation
├── Hospital-Management-API/
│   ├── main/settings/              # base, development, UAT, production settings
│   ├── account/ doctor/ patient/ hospitalAdmin/
│   ├── tests/                      # Cross-app integration tests when needed
│   ├── .env.example                # Variable names only; no secrets
│   ├── requirements/               # Optional split requirements later
│   ├── Dockerfile                  # Only after selecting container deployment
│   └── manage.py
└── Hospital-Web-UI/
```

Do not rename `main/` to `config/` until configuration, CI, and deployment are stable. That optional refactor changes imports and WSGI/ASGI references and must be isolated.

## Implementation phases

### Phase 3A — Establish a reliable backend baseline

Work on: `hos-development`

1. Confirm `Hospital-Management-API/` as the backend working directory.
2. Select and document one dependency standard and supported Python/Django versions.
3. Add `.env.example` with variable names only.
4. Confirm secrets, databases, media, virtual environments, and caches are not tracked.
5. Run and record the baseline Django check.

Acceptance: a clean environment installs dependencies and runs `python manage.py check` from the backend directory.

### Phase 3B — Separate runtime configuration by environment

Work on: `hos-development`

1. Create shared base settings plus development, UAT, and production settings modules.
2. Read secrets, database, Redis, CORS, and host values from environment variables.
3. Use `DEBUG=False`, explicit allowed hosts/origins, secure cookies, and proxy SSL configuration in UAT and production.
4. Keep test settings isolated so tests cannot target production databases.
5. Add an environment-variable checklist and validate each settings module with Django checks.

Acceptance: no sensitive setting is committed; each environment starts from explicit configuration.

### Phase 3C — Add automated verification

Work on: `hos-development`

1. Add configuration, authentication, permission, API-domain, and migration smoke tests.
2. Add GitHub Actions to install dependencies, run Django checks, apply migrations to a CI database, and run tests.
3. Run CI on pushes and promotions to `hos-development`, `hos-uat`, and `main`.

Acceptance: every promotion receives repeatable pass/fail verification.

### Phase 3D — Deployment packaging and operations

Work on: `hos-development`

1. Choose the hosting approach before adding platform-specific files.
2. Add packaging/process definitions, static/media handling, migrations, health checks, structured logs, and rollback instructions.
3. Map deployments: `hos-development` → development, `hos-uat` → UAT, `main` → production.
4. Deploy a tagged release to UAT before the first production deployment.

Acceptance: the tested build deploys predictably and a previous production tag can be redeployed.

### Phase 3E — Optional project-package refactor

Work on: `hos-development`

Only after Phases 3A–3D are stable, decide whether to rename Django package `main/` to `config/`. Update all settings references and deployment commands in that isolated change, then verify migrations, tests, UAT, and production release paths.

## Cursor implementation brief

```text
Work only inside Hospital-Management-API unless the task explicitly concerns repository CI files or docs. Follow docs/git-workflow.md. Commit on hos-development; do not create a feature/* branch. Do not rename or move Django apps during baseline or environment-settings work. Do not commit secrets, .env files, databases, media, virtual environments, or generated caches.

Implement only the requested phase. Before editing, report files to change and migration impact. After editing, run Django checks and the applicable test suite. Keep existing API paths stable.
```

## Immediate next task

Start with Phase 3A on `hos-development`. Complete it and push it before beginning Phase 3B.
