# Issue Log

## RESOLVED — OpenAI OAuth Token exchange returned HTTP 403

- **Observed:** 2026-10-01
- **Environment:** one local Windows development machine
- **Symptom:** OpenAI authorization completed in the browser, while the subsequent Token exchange returned HTTP 403.
- **Safety impact:** no OAuth credential was written, logged, committed, or returned to browser JavaScript.
- **Resolution:** the project maintainer completed the same Pi AI OpenAI provider flow successfully on another development machine, confirming the application flow and provider integration. The affected machine remains an environment-specific limitation rather than an application data-path failure.
- **Application behavior:** the UI preserves an explicit disconnected/error state and never treats a callback page alone as an authenticated session.

The repository contains no authorization code, access token, refresh token, account email, or credential-store contents.

## RESOLVED — Repeated E2E runs matched a stale task

- **Observed:** 2026-10-01
- **Symptom:** the task lifecycle browser test found two cards with the same fixed title after a previous E2E database had been reused.
- **Cause:** the E2E SQLite file is intentionally persistent during a run, while the test fixture title was static across runs.
- **Resolution:** generate a unique task title for each run and use exact-text assertions. Repeated browser runs no longer depend on prior E2E database contents.
