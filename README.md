# SAMS — Society Accounting & Management System

Offline-first Electron desktop application for co-operative housing society accounting.

## Documentation

- `SRS.md` — Software Requirements Specification
- `SDD.md` — Software Design Document
- `Development_Plan.md` — Phased implementation plan

## Phase 1 (current)

Monorepo foundation with:

- `packages/shared-types` — IPC envelopes and core enums
- `packages/db` — Prisma schema (SystemMeta, User, Permission, AuditLog)
- `packages/services` — Money, Auth hashing, Audit stub, permission seed
- `apps/desktop` — Electron main, preload, React renderer shell

## Setup

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm test
npm run dev
```

## Workspace scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start Electron in development mode |
| `npm test` | Run unit tests in all packages |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed permissions and SystemMeta |
