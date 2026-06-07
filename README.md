# SAMS — Society Accounting & Management System

Offline-first Electron desktop application for co-operative housing society accounting.

## Documentation

- `SRS.md` — Software Requirements Specification
- `SDD.md` — Software Design Document
- `Development_Plan.md` — Phased implementation plan

## Current status: Phase 3 complete

| Phase | Scope |
| ----- | ----- |
| 1 | Monorepo, IPC pipeline, Money type, Prisma core tables, shared UI stubs |
| 2 | Startup selector, new society wizard, login, application shell |
| 3 | Society configuration (SOC-001–004), billing period calendar, shared UX components |

## Setup

```bash
npm install
npm run db:generate
npm run db:migrate
npm test
npm run dev
```

## First run

1. Launch the app (`npm run dev`).
2. Choose **Create New Society** and complete the wizard.
3. Sign in with the administrator account you created.
4. Use **Explorer → Society Setup** for Identity, Parameters, Property, and Report Formats.

Each society/financial year is stored in its own `.sqlite` file.

## Workspace scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start Electron in development mode |
| `npm test` | Run unit tests in all packages |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run build` | Production build |
