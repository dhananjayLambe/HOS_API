# Docs Folder Structure

Use this folder to store all planning and documentation files in a consistent way.

## Structure

- `backend/Hospital-Management-API`  
  Backend planning and API-specific documents for `Hospital-Management-API`.

- `backend/test`  
  Backend test plans, test strategy docs, test reports, and validation notes.

- `frontend/Hospital-Web-UI`  
  Frontend planning and UI-specific documents for `Hospital-Web-UI`.

- `frontend/test`  
  Frontend test plans, UI testing notes, E2E checklists, and test reports.

- `integration`  
  Documents that involve both frontend and backend integration.

- `other`  
  Supporting files that do not clearly belong to the categories above.

## File Placement Guidance

- Put API contracts, backend implementation plans, and backend technical notes in `backend/Hospital-Management-API`.
- Put frontend design/implementation plans in `frontend/Hospital-Web-UI`.
- Put cross-service workflows and FE-BE connection plans in `integration`.
- Put test-focused docs in `backend/test` or `frontend/test` based on scope.
- Put general summaries, backups, or miscellaneous files in `other`.

## Naming Suggestion

Use uppercase with underscores for plan docs, for example:

- `FEATURE_X_IMPLEMENTATION_PLAN.md`
- `FEATURE_X_INTEGRATION_CHECKLIST.md`
- `FEATURE_X_TEST_REPORT.md`
