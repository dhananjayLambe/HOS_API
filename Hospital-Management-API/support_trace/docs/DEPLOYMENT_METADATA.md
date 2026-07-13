# Deployment Metadata (M5.8)

Deployment context is resolved from environment variables at record time.

## Environment variables

| Variable | `runtime_metadata` key |
|----------|------------------------|
| `APPLICATION_VERSION` | `deployment_version` |
| `GIT_COMMIT` | `git_commit` |
| `RELEASE_VERSION` | `release_version` |
| `ENVIRONMENT` | `environment` |
| `SERVICE_NAME` | (internal only) |
| `AWS_AVAILABILITY_ZONE` | `availability_zone` |
| `AWS_ACCOUNT_ID` | `aws_account` |
| `HOSTNAME` / `POD_NAME` | `container_id` / `pod_name` |

## DeploymentMetadata.resolve()

```python
from support_trace.runtime.deployment import DeploymentMetadata

DeploymentMetadata.resolve()
# → dict with deployment_version, environment, hostname, ...
```

## Repository lookup

```python
SupportTraceRepository().get_by_deployment(version)
SupportTraceRepository().get_by_environment(env)
```
