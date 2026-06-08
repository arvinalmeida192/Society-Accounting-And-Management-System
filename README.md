# SAMS — Society Accounting & Management System

Offline-first Electron desktop application for co-operative housing society accounting.

## Documentation

- `SRS.md` — Software Requirements Specification
- `SDD.md` — Software Design Document
- `Development_Plan.md` — Phased implementation plan

## Current status: Phase 15 complete

| Phase | Scope |
| ----- | ----- |
| 1 | Monorepo, IPC pipeline, Money type, Prisma core tables, shared UI stubs |
| 2 | Startup selector, new society wizard, login, application shell |
| 3 | Society configuration (SOC-001–004), billing period calendar, shared UX components |
| 4 | Chart of Accounts (four-tier hierarchy), ledger balance, default CoA seed, SP-012 linkages |
| 5 | Property tree (buildings, wings, units), reference masters, parking tariffs/spaces/assignments |
| 6 | Members, tenants, opening balances with JV posting, member subsidiary ledgers |
| 7 | Miscellaneous masters: banks/MICR, narrations, address book, cheque reasons, contractors |
| 8 | Tariff definitions, settlement sequence, bill register mapping, tariff resolution engine |
| 9 | Regular billing engine: single bill, bulk generation, interest/NOC/rebate/ST, RB number series |
| 10 | Supplementary billing: Member/Tenant/General bill-to, SB number series, supplementary interest/arrears |
| 11 | Vouchers: Receipt/Payment/Contra posting, FIFO settlement, cheque/MICR, general bill reference |
| 12 | Adjustments (JV/DN/CN), petty cash, cheque print preview, cheque cancellation with reversal |
| 13 | Bank reconciliation: clearing entry, bulk clearing dates, reconciliation statement, voucher drill-down |
| 14 | Statutory registers: FD, Property, Sinking Fund (auto from receipts), I-Form with share sub-tables |

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
5. Use **Explorer → Accounting → Chart of Accounts** to review or extend the default ledger structure.
6. Use **Explorer → Property** for buildings, wings, units, reference masters, and parking setup.
7. Use **Explorer → Members** for member register, tenants, and opening balances.
8. Use **Explorer → Masters** for banks, narrations, address book, cheque reasons, and contractors.
9. Use **Explorer → Billing** for tariffs, regular bill entry, bulk bill generation, and supplementary bills.
10. Use **Explorer → Transactions** for vouchers, petty cash, adjustments, bank reconciliation, and cheque printing/cancellation.
11. Use **Explorer → Statutory** for FD register, property register, sinking fund (read-only), and I-Form membership register.

Each society/financial year is stored in its own `.sqlite` file.

## Workspace scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start Electron in development mode |
| `npm test` | Run unit tests in all packages |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run build` | Production build |
