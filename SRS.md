**SOFTWARE REQUIREMENTS SPECIFICATION**

Society Accounting & Management System (SAMS)

_Next-Generation Offline Desktop Application_

| **Document Version** | 1.0                                                 |
| -------------------- | --------------------------------------------------- |
| **Status**           | Draft                                               |
| **Prepared By**      | Arvin                                               |
| **Date**             | 7 June 2026                                         |
| **Platform Target**  | Electron (Windows / macOS / Linux) - Offline-First  |
| **Technology Stack** | Electron · React · TypeScript · SQLite (via Prisma) |

# **Table of Contents**

# **1\. Introduction**

## **1.1 Purpose**

This Software Requirements Specification (SRS) defines all functional and non-functional requirements for the Society Accounting & Management System (SAMS) - a production-grade, fully offline desktop application designed to manage every operational, financial, and administrative aspect of a co-operative housing society.

This document supersedes and significantly expands upon the original eSociety user manual, correcting its limitations, adding modern UX requirements, and introducing new capabilities (digital workflows, audit trails, role-based access, and data portability) that the legacy system lacked entirely.

## **1.2 Scope**

SAMS covers:

- Complete society master data management (identity, property, structure, members, units)
- Full double-entry accounting engine (Chart of Accounts → Vouchers → Trial Balance → Financial Statements)
- Automated and manual billing engine (regular maintenance bills and supplementary bills)
- Cash, bank, cheque, and contra transaction processing with bank reconciliation
- Statutory registers as mandated by the Maharashtra Co-operative Societies Act (FD, Property, Sinking Fund, I-Form)
- TDS deduction tracking and Form 16A generation
- Parking management with tariff-based billing
- Committee management, meeting minutes, correspondence letters
- Comprehensive reporting suite (member ledger, trial balance, balance sheet, income & expenditure, bank reconciliation, bill register, and more)
- Role-based access control, full audit trail, backup & restore

## **1.3 Definitions, Acronyms, and Abbreviations**

| **Term / Acronym** | **Definition**                                                        |
| ------------------ | --------------------------------------------------------------------- |
| SAMS               | Society Accounting & Management System - the software being specified |
| CHS                | Co-operative Housing Society                                          |
| MCS Act            | Maharashtra Co-operative Societies Act, 1960                          |
| FD / FDR           | Fixed Deposit / Fixed Deposit Receipt                                 |
| MICR               | Magnetic Ink Character Recognition - 9-digit bank branch code         |
| FIFO               | First-In, First-Out - default bill settlement order                   |
| JV / DN / CN       | Journal Voucher / Debit Note / Credit Note                            |
| TDS                | Tax Deducted at Source                                                |
| P&L / I&E          | Profit & Loss / Income & Expenditure Account                          |
| SRS                | Software Requirements Specification (this document)                   |
| MUST               | Non-negotiable requirement - system SHALL comply                      |
| SHOULD             | Strongly recommended - high value, implementation-phase dependent     |
| MAY                | Optional enhancement - nice-to-have                                   |

## **1.4 References**

- eSociety User Manual - Perfect eLogics Pvt. Ltd. (source baseline)
- Maharashtra Co-operative Societies Act, 1960
- Income Tax Act, 1961 - TDS provisions (Section 194C, 194I, 194J)
- GST Act, 2017 - Maintenance charges applicability
- ISO/IEC 29148:2018 - Systems and software engineering, requirements engineering

## **1.5 Document Overview**

Section 2 provides product context and constraints. Section 3 defines system-wide functional requirements grouped by module. Section 4 covers non-functional requirements. Section 5 specifies reporting requirements. Section 6 covers data migration and appendices.

# **2\. Overall Description**

## **2.1 Product Perspective**

SAMS is a standalone, offline-first desktop application. All data is stored locally in a SQLite database. No internet connectivity is required for core operations. Optional cloud backup (future phase) may be added without changing core architecture.

The application follows a strict layered architecture: UI (React/TypeScript) → Preload IPC bridge → Electron Main process → Service layer → Prisma ORM → SQLite. The renderer process NEVER touches the database directly.

## **2.2 Product Functions - High-Level Summary**

| **Module Group**           | **Key Functions**                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| Society Configuration      | Society identity, parameters, property info, report format selection, authorized signatories          |
| Building & Unit Management | Buildings, wings, floors, units, parking - full property tree                                         |
| Member Management          | Member profiles, dependents, nominees, shares, vehicles, opening balances                             |
| Chart of Accounts          | 4-tier hierarchy: Group → Subgroup → Account Master (ledger head)                                     |
| Billing Engine             | Regular (maintenance) bills and supplementary bills with tariff engine, interest calculation, rebates |
| Cash & Bank Transactions   | Receipt, Payment, Contra vouchers; post-dated cheque handling; MICR lookup                            |
| Adjustment Vouchers        | Journal Voucher, Debit Note, Credit Note with bill-level settlement                                   |
| Bank Reconciliation        | Clearing entry with pass-book reconciliation statement                                                |
| Statutory Registers        | FD Register, Property Register, Sinking Fund Register, I-Form                                         |
| TDS Management             | TDS deduction recording, challan tracking, Form 16A generation                                        |
| Correspondence             | Reminder letters (incl. MCS Act 101), general notices, committee list, meeting minutes                |
| Reports & MIS              | 20+ reports covering accounting, billing, member, and statutory needs                                 |
| Administration             | Multi-user access control, audit trail, year-end processing, backup & restore                         |

## **2.3 User Classes**

| **Role**                     | **Access Level**    | **Primary Tasks**                                               |
| ---------------------------- | ------------------- | --------------------------------------------------------------- |
| Administrator                | Full                | System setup, user management, year-end, backup/restore         |
| Accountant                   | Full accounting     | Vouchers, billing, receipts, adjustments, all financial reports |
| Data Entry Operator          | Restricted          | Member data entry, receipt entry under supervision              |
| Committee Member / Secretary | Read-only + letters | View reports, generate letters, view meeting minutes            |
| Auditor                      | Read-only           | All reports, trial balance, ledgers - no data modification      |

## **2.4 Operating Environment**

- Platform: Windows 10/11 (primary), macOS 12+, Ubuntu 22.04+ (via Electron)
- Storage: Local SQLite database file; WAL mode enabled for reliability
- Memory: Minimum 4 GB RAM; 8 GB recommended
- Display: Minimum 1280×800; HiDPI / 4K scaling supported
- No internet required for core operations
- Printer: Any system printer supported via Electron print API

## **2.5 Design & Implementation Constraints**

- All DB writes go through typed IPC channels - renderer never calls Prisma directly
- Every financial transaction must maintain ΣDr = ΣCr (double-entry integrity enforced at service layer)
- Bulk operations (bulk billing, bulk receipts) must be wrapped in a single SQLite transaction - all-or-nothing rollback on any error
- Year-end closing must prevent backdated voucher entries for the closed year
- No external runtime dependencies (e.g., no separate database server process)
- Vouchers, receipts, and bill settlements must never be bypassed - all adjustments flow through the accounting engine

## **2.6 Assumptions and Dependencies**

- A single society operates per database file. Multi-society support is handled by opening separate database files.
- Financial year follows the society's configured year (typically April-March in India).
- All monetary amounts are in Indian Rupees (INR). Paisa (2 decimal places) is configurable.
- Tax rules (GST, TDS) are assumed to follow Indian statutory requirements.

# **3\. System Features & Functional Requirements**

**NOTE:** _Requirements marked MUST are non-negotiable. SHOULD = high priority. MAY = enhancement for later phases._

## **3.1 Society Configuration**

### **3.1.1 Society Identity**

The system shall maintain a single society identity record per database. The record is created at initial setup and may only be edited (never added/deleted through the UI directly - creation is part of initial setup or new-year wizard).

Fields required:

- Society Name (required)
- Registration Number and Registration Date
- Full Address (multi-line)
- Telephone, Fax, Email, Website
- Temporary Account Number and Permanent Account Number (PAN)
- TDS Circle / Area
- Created By / Last Modified By audit fields (auto-populated)

### **3.1.2 Society Parameters**

Parameters form the behavioral ruleset for the entire system. All modules derive defaults from this configuration.

| **REQ-ID** | **Module** | **Requirement**                                                                                                                                                                                                                                       | **Priority** |
| ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **SP-001** | Parameters | Bill Frequency must support: Monthly, Bi-Monthly, Quarterly, Quadruple (4-monthly), Half-Yearly, Yearly                                                                                                                                               | **MUST**     |
| **SP-002** | Parameters | System must warn if bill frequency is changed after bills have already been generated in the current year                                                                                                                                             | **MUST**     |
| **SP-003** | Parameters | Suppress Zero Value Tariffs: when enabled, zero-amount charge lines are excluded from bill records                                                                                                                                                    | **MUST**     |
| **SP-004** | Parameters | Merge Parking on Bill: consolidate multiple parking-space charges into a single line per member                                                                                                                                                       | **MUST**     |
| **SP-005** | Parameters | Tariff rounding: configurable decimal places (0 = whole rupees, 2 = paise)                                                                                                                                                                            | **MUST**     |
| **SP-006** | Parameters | Interest engine: None / Simple / Compound - selectable independently for Regular Bills and Supplementary Bills                                                                                                                                        | **MUST**     |
| **SP-007** | Parameters | Simple interest sub-types: Delay Days / Delay Months / Complete Cycle - each with a defined help text accessible inline                                                                                                                               | **MUST**     |
| **SP-008** | Parameters | Interest rounding toggle (round to nearest rupee)                                                                                                                                                                                                     | **MUST**     |
| **SP-009** | Parameters | Allow Manual Interest Override: when enabled, system-calculated interest may be overridden per bill                                                                                                                                                   | **MUST**     |
| **SP-010** | Parameters | Interest Rate: mandatory when any interest pattern is selected; zero disallowed when interest is active                                                                                                                                               | **MUST**     |
| **SP-011** | Parameters | Tariff Structure Basis: multi-select from Building / Wing / Unit No. / Composition / Unit Type / Total Area / Per Unit Area / Per Person / Floor                                                                                                      | **MUST**     |
| **SP-012** | Parameters | Define account linkages for: Share Capital (group + subgroup), Bank Subgroup, Cash Subgroup, Member Subgroup, Tenant Subgroup, I&E Subgroup, Interest Account, Adjustment Account, Non-Occupancy Account, Service Tax Account, Education Cess Account | **MUST**     |
| **SP-013** | Parameters | Rebate: configurable as percentage of bill amount OR fixed rupee amount                                                                                                                                                                               | **MUST**     |
| **SP-014** | Parameters | Service Tax %: configurable; Education Cess on Service Tax: configurable (legacy support; replaceable with GST field in later phase)                                                                                                                  | **SHOULD**   |
| **SP-015** | Parameters | Manual Bill Numbering Pattern: User Input / Auto Serial / Building-wise Auto Serial                                                                                                                                                                   | **MUST**     |
| **SP-016** | Parameters | Starting bill number configurable when generating new bulk bills                                                                                                                                                                                      | **MUST**     |
| **SP-017** | Parameters | Residential/Commercial dual-type unit support: allows same unit to have separate residential and commercial rateable values                                                                                                                           | **MUST**     |
| **SP-018** | Parameters | Cash-Bank Group: defines which account group is used for receipt/payment statements                                                                                                                                                                   | **MUST**     |
| **SP-019** | Parameters | Authorized signatory names (up to 3): printed on reports in user-defined sequence                                                                                                                                                                     | **MUST**     |
| **SP-020** | Parameters | Cheque signatory name(s): printed on cheque print-outs                                                                                                                                                                                                | **SHOULD**   |
| **SP-021** | Parameters | Colour-coded grid rows: configurable on/off                                                                                                                                                                                                           | **MAY**      |

### **3.1.3 Property Information**

A single property information record per society. Fields: Municipal House No., Survey/Sub-Division No., Land Type (Freehold/Leasehold), Annual Lease Rent, Total Plot Area (sq. ft.), Constructed Area, Total No. of Flats, Land Cost, Annual Non-Agriculture Assessment, Building Particulars, Completion/Occupation Certificate details, Occupation Date, Municipal Assessment Year, Total Rateable Value, Date of Conveyance, Remarks.

### **3.1.4 Report Format Configuration**

The system shall allow the administrator to select from predefined report templates for:

- Bill Format (regular maintenance bill) - multiple variants
- Supplementary Bill Format
- Receipt Format (member receipts)
- General Receipt Format (non-member receipts)
- Cheque Printing Format

**NOTE:** _Format selection is a one-time configuration. The selected format applies globally to all print/preview operations for that report type._

## **3.2 Building & Unit Management**

### **3.2.1 Building Identity**

| **REQ-ID** | **Module** | **Requirement**                                                                         | **Priority** |
| ---------- | ---------- | --------------------------------------------------------------------------------------- | ------------ |
| **BU-001** | Building   | System must support multiple buildings per society database                             | **MUST**     |
| **BU-002** | Building   | Each building: Short Name (max 10 chars, unique), Full Name, Total Units, No. of Floors | **MUST**     |
| **BU-003** | Building   | Deleting a building must be blocked if any unit/member/voucher references it            | **MUST**     |

### **3.2.2 Wing Identity**

Wings belong to a building. Short Name (unique within building; '.' permitted for no-wing buildings), Full Name. Wing cannot be deleted if units reference it.

### **3.2.3 Reference Masters**

The following lookup masters are required: Unit Area (sq. ft. values list), Unit Type (Residential / Commercial / Shop / etc.), Unit Composition (1RK, 1BHK, 2BHK, 1 Gala, etc.), Floor Master (Sr. No. + descriptive floor name, e.g., Ground Floor, First Floor).

### **3.2.4 Unit Identity**

| **REQ-ID** | **Module** | **Requirement**                                                                                                                   | **Priority** |
| ---------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **UI-001** | Unit       | Every unit identified by: Building + Wing + Unit No. (unique combination) + Floor + Type + Composition + Area                     | **MUST**     |
| **UI-002** | Unit       | Unit No. format guidance: wing-prefixed zero-padded numbers (e.g., A-001) enforced by convention; system must validate uniqueness | **MUST**     |
| **UI-003** | Unit       | Per-unit areas: Carpet Area, Residential Area, Commercial Area stored separately                                                  | **MUST**     |
| **UI-004** | Unit       | Tariff definition (unitwise bill charges) configurable directly from unit identity form when Simple Tariff method is active       | **MUST**     |
| **UI-005** | Unit       | Opening balance entry accessible from unit identity form for both Regular and Supplementary bill history                          | **MUST**     |
| **UI-006** | Unit       | Unit archival (soft-delete with deletedAt/deletedBy) on member disposal - hard delete blocked                                     | **MUST**     |
| **UI-007** | Unit       | System auto-increments unit serial number used for bill ordering                                                                  | **MUST**     |

### **3.2.5 Parking Management**

| **REQ-ID** | **Module** | **Requirement**                                                                                                             | **Priority** |
| ---------- | ---------- | --------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **PK-001** | Parking    | Parking Tariff Types: user-defined types (4-wheeler, 2-wheeler, etc.) with effective-date-based rates                       | **MUST**     |
| **PK-002** | Parking    | Parking Detail: each parking space has Parking No., Parking Type, linked Account Name for charges, linked Tariff Type       | **MUST**     |
| **PK-003** | Parking    | Member parking assignment: one member may occupy multiple parking spaces; each with Purchase Date and optional Dispose Date | **MUST**     |
| **PK-004** | Parking    | Parking charges are auto-calculated in bill generation based on tariff type rate and assignment period                      | **MUST**     |
| **PK-005** | Parking    | Merge Parking parameter (SP-004) collapses multi-space charges into single bill line                                        | **MUST**     |

## **3.3 Member Management**

### **3.3.1 Member Identification**

| **REQ-ID** | **Module** | **Requirement**                                                                                                               | **Priority** |
| ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **MM-001** | Member     | Member record linked to one unit. Unit must be vacant (no active member) before a new member can be assigned                  | **MUST**     |
| **MM-002** | Member     | Core fields: Member Name (with title), Unit No., Wing, Building, Area (auto from unit), Unit Serial No.                       | **MUST**     |
| **MM-003** | Member     | Tenant Occupancy flag: Yes/No - affects tariff application for Tenant-type charges                                            | **MUST**     |
| **MM-004** | Member     | Parking assignment sub-table (see PK-003)                                                                                     | **MUST**     |
| **MM-005** | Member     | Housing Loan sub-table: Bank Name, Branch Name, NOC Date, Loan Amount, Remark                                                 | **MUST**     |
| **MM-006** | Member     | Bill flags: Regular Bills Generated (Y/N), Supplementary Bills Generated (Y/N), Interest Charged (Y/N) - per member overrides | **MUST**     |
| **MM-007** | Member     | Member disposal: Dispose Date recorded; unit reverts to vacant; archived member not deleted                                   | **MUST**     |

### **3.3.2 Member Personal & Extended Information**

Optional personal data: Gender, Date of Birth, Age (auto-calculated), Qualification, Religion, Occupation, PAN No., Blood Group, Marital Status, Anniversary Type & Date. Member photograph (file path / embedded image).

Other Information: Unit Purchase Date, Date of Sale (on disposal), Associate Member, Joint Member, Voting Rights Member, Member's Bank Name & Branch (for cheque identification), Total Family Members, Class, Club Membership Deposit.

### **3.3.3 Dependents, Nominees, Vehicles, Shares**

Dependent sub-table: Name, Relation, Occupation, Age, Gender, Date of Birth, ID Card No., Blood Group.

Nominee sub-table: Nomination Date, Nominee Name, Committee Meeting Date, Subject, Revocation Date, Remark.

Vehicle sub-table: Vehicle Name, Vehicle No., Registration No., Registration Date.

Share Details sub-table: Date of Allotment, Certificate No., Folio No., No. of Shares, From Share No., To Share No.

### **3.3.4 Member Address**

Address, Residence Phone, Office Phone, Email (primary + secondary), Fax - for correspondence when member does not reside in the society premises.

### **3.3.5 Member Opening Balance**

Two independent opening balance types per member:

- Regular Bill Opening Balance: Principal OB + Interest OB + Service Tax OB
- Supplementary Bill Opening Balance: Principal OB + Interest OB

**NOTE:** _Opening balance entry is accessible from the Member Identification form after the base record is saved. It must generate the corresponding ledger entries to ensure the trial balance is correct from day one._

## **3.4 Chart of Accounts (CoA)**

### **3.4.1 Four-Tier Account Hierarchy**

| **REQ-ID**  | **Module** | **Requirement**                                                                                                                                                                 | **Priority** |
| ----------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **COA-001** | CoA        | Tier 1 - Category: fixed as Asset / Liability / Income / Expense                                                                                                                | **MUST**     |
| **COA-002** | CoA        | Tier 2 - Account Group: user-defined; Balance Sheet Sr. for ordering; Group Name; Nature; Substitute Group Name (for balance-sheet side flip)                                   | **MUST**     |
| **COA-003** | CoA        | Tier 3 - Account Subgroup: belongs to Group; Subgroup Name; Substitute Subgroup Name; Subgroup Sr. for ordering                                                                 | **MUST**     |
| **COA-004** | CoA        | Tier 4 - Account Master (Ledger): Particulars (name), Subgroup, Opening Balance (Debit/Credit) for Asset/Liability; Previous Year amount and Estimate Amount for Income/Expense | **MUST**     |
| **COA-005** | CoA        | Account Master - Bill Tariff Details: 4-letter short code (unique, mandatory for billing accounts); Service Tax Applicable flag; Rebate Applicable flag; Interest Free flag     | **MUST**     |
| **COA-006** | CoA        | Petty Cash flag: marks an expense account as petty cash, enabling the daily petty cash voucher register                                                                         | **SHOULD**   |
| **COA-007** | CoA        | Closing balance on account master is a computed (read-only) field = Opening Balance ± all posted voucher entries                                                                | **MUST**     |
| **COA-008** | CoA        | Archiving an account must be blocked if any unposted or current-year voucher entries reference it                                                                               | **MUST**     |
| **COA-009** | CoA        | Account type and nature must be consistent with parent subgroup/group; system must validate on save                                                                             | **MUST**     |
| **COA-010** | CoA        | isActive enforcement: inactive accounts must not appear in transaction entry dropdowns                                                                                          | **MUST**     |

## **3.5 Tariff Definition & Billing Configuration**

### **3.5.1 Tariff Definition**

| **REQ-ID** | **Module** | **Requirement**                                                                                                                                                                     | **Priority** |
| ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **TD-001** | Tariff     | Tariff definitions are effective-date-driven. New rates require a new record with a new effective date - existing records are never modified for rate changes                       | **MUST**     |
| **TD-002** | Tariff     | Tariff may be defined at: Building level / Wing level / Unit level / Composition level / Type level / Area level / Per-person level / Floor level - per Society Parameter selection | **MUST**     |
| **TD-003** | Tariff     | Each tariff line: Sr. No. (user-reorderable, duplicate disallowed), Charge Name (from Account Master), Amount, Tariff Type (Both / Tenant)                                          | **MUST**     |
| **TD-004** | Tariff     | Tariff Type = Tenant: charge applies only when member's Tenant Occupancy = Yes                                                                                                      | **MUST**     |
| **TD-005** | Tariff     | Advance Method of Tariff: alternate mathematical/formula-based tariff definition mode (ratable value based); must support area-weighted calculations                                | **SHOULD**   |

### **3.5.2 Tariffwise Settlement Sequence**

Defines the FIFO settlement order - i.e., which charge head is cleared first when a partial receipt is applied. Effective-date-driven. Each line: Sr. No. + Charge Name (from Account Master) + Remark.

### **3.5.3 Tariff Mapping for Bill Register**

Maps charge heads to column positions in the horizontal Bill Register report. Two name formats: Short Code and Full Name. Sr. No. is user-defined to control column order.

## **3.6 Billing Engine**

### **3.6.1 Regular (Maintenance) Bills**

| **REQ-ID** | **Module** | **Requirement**                                                                                                           | **Priority** |
| ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **RB-001** | Billing    | Regular bills generated only for active members with 'Regular Bills = Yes' flag                                           | **MUST**     |
| **RB-002** | Billing    | Bill fields: Bill No. (system + manual), Sr., Bill Date, Due Date, Member, Building, Wing, Unit No., Area                 | **MUST**     |
| **RB-003** | Billing    | Charges auto-populated from active tariff definition effective on bill date; user may add/edit lines in manual entry mode | **MUST**     |
| **RB-004** | Billing    | Interest auto-calculated per Society Parameter rules; manual override available if SP-009 is enabled                      | **MUST**     |
| **RB-005** | Billing    | Interest Detail breakup view accessible from bill entry screen                                                            | **MUST**     |
| **RB-006** | Billing    | Rebate: auto-calculated from parameter; overridable per bill. Adjustment: user-input reduction amount                     | **MUST**     |
| **RB-007** | Billing    | Bill Amount = Charges + Interest + Service Tax − Rebate − Adjustment                                                      | **MUST**     |
| **RB-008** | Billing    | Arrears: split into Principal Arrears and Interest Arrears from all prior unsettled bills                                 | **MUST**     |
| **RB-009** | Billing    | Receipt panel on bill screen shows settlement status: which receipts/JVs cleared which portion of the bill                | **MUST**     |
| **RB-010** | Billing    | Bulk bill generation (all members for a period) in a single transaction; configurable starting bill number                | **MUST**     |
| **RB-011** | Billing    | Bill Remark field: printed on the bill document                                                                           | **MUST**     |
| **RB-012** | Billing    | Bill Reference panel: quick access to Opening Bill, All Bills, Contribution Summary, Member Ledger, Receipts, Adjustments | **MUST**     |

### **3.6.2 Supplementary Bills**

| **REQ-ID** | **Module** | **Requirement**                                                                                                 | **Priority** |
| ---------- | ---------- | --------------------------------------------------------------------------------------------------------------- | ------------ |
| **SB-001** | Billing    | Supplementary bills can be raised to: Member / Tenant / General (no unit assignment required)                   | **MUST**     |
| **SB-002** | Billing    | Separate bill number series from regular bills                                                                  | **MUST**     |
| **SB-003** | Billing    | Same interest, adjustment, and settlement mechanics as regular bills but tracked in a separate ledger partition | **MUST**     |
| **SB-004** | Billing    | Manual bill number (Book Sr.) supported alongside system-generated number                                       | **MUST**     |
| **SB-005** | Billing    | Supplementary bill opening balances are tracked independently from regular bill opening balances                | **MUST**     |

## **3.7 Bank & Cash Transactions**

### **3.7.1 Receipt / Payment / Contra Vouchers**

| **REQ-ID** | **Module**   | **Requirement**                                                                                                                                                    | **Priority** |
| ---------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| **BC-001** | Transactions | Three voucher types supported in one entry form: Receipt, Payment, Contra                                                                                          | **MUST**     |
| **BC-002** | Transactions | Receipt sub-types: Member Receipt, General Receipt - separate voucher number series                                                                                | **MUST**     |
| **BC-003** | Transactions | Payment sub-types: Cash Payment, Bank Payment - separate voucher number series                                                                                     | **MUST**     |
| **BC-004** | Transactions | Multi-line debit/credit entry per voucher (compound entries supported)                                                                                             | **MUST**     |
| **BC-005** | Transactions | Account selection: F3 = member list, F4 = bank list, standard = general account list                                                                               | **MUST**     |
| **BC-006** | Transactions | Cheque details: Cheque No., Cheque Date, Post-Dated Cheque flag, Bank Slip No., MICR Code auto-lookup, Cheque Type (Crossed/DD/Outstation), Bank Name, Branch Name | **MUST**     |
| **BC-007** | Transactions | Clearing Date: user-input; used for bank reconciliation                                                                                                            | **MUST**     |
| **BC-008** | Transactions | Cheque Cancellation: Cancelled On date + Reason (from master list); system automatically reverses the ledger effect and nullifies related bill settlements         | **MUST**     |
| **BC-009** | Transactions | Reconciliation Audited flag + Record Audited flag per voucher                                                                                                      | **MUST**     |
| **BC-010** | Transactions | Regular Bill Settlement: default FIFO; user may override by selecting specific bills                                                                               | **MUST**     |
| **BC-011** | Transactions | Settlement sequence respects Tariffwise Settlement configuration (Service Tax → Interest → Principal or user-defined order)                                        | **MUST**     |
| **BC-012** | Transactions | Supplementary Bill Settlement: explicit bill selection required (no automatic FIFO for supplementary)                                                              | **MUST**     |
| **BC-013** | Transactions | Narration: free text; short narration selectable from Narration master                                                                                             | **MUST**     |
| **BC-014** | Transactions | Bank Slip No. enables deposit slip grouping for bulk cheque deposits                                                                                               | **MUST**     |

## **3.8 Adjustment Vouchers**

| **REQ-ID** | **Module**  | **Requirement**                                                                                               | **Priority** |
| ---------- | ----------- | ------------------------------------------------------------------------------------------------------------- | ------------ |
| **AJ-001** | Adjustments | Three adjustment types: Journal Voucher (JV), Debit Note (DN), Credit Note (CN) - separate number series each | **MUST**     |
| **AJ-002** | Adjustments | Multi-line debit/credit grid; ΣDr must equal ΣCr before save is permitted                                     | **MUST**     |
| **AJ-003** | Adjustments | Bill linkage: JV/DN/CN can be linked to specific Regular or Supplementary bill lines to settle arrears        | **MUST**     |
| **AJ-004** | Adjustments | Cancelled/reversed vouchers create an equal-and-opposite counter-entry rather than deleting the original      | **MUST**     |
| **AJ-005** | Adjustments | Partial waiver support: proportional reversal journal vouchers for partial waiver of arrears                  | **MUST**     |

## **3.9 Bank Reconciliation - Clearing Entry**

| **REQ-ID** | **Module** | **Requirement**                                                                                                   | **Priority** |
| ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------- | ------------ |
| **BR-001** | Bank Rec.  | Clearing Entry screen: select bank account, date range, status filter (Uncleared/Cleared/All)                     | **MUST**     |
| **BR-002** | Bank Rec.  | Grid shows: Voucher No., Date, Cheque No., Cheque Date, Cleared Date, Deposits, Withdrawals, Remark               | **MUST**     |
| **BR-003** | Bank Rec.  | Bulk clearing date entry: type clearing date once, double-click first grid cell to propagate to all visible rows  | **MUST**     |
| **BR-004** | Bank Rec.  | Save updates Cleared On date on original vouchers                                                                 | **MUST**     |
| **BR-005** | Bank Rec.  | Reconciliation Statement: opening bank balance per books + uncleared items = closing pass-book balance; printable | **MUST**     |
| **BR-006** | Bank Rec.  | Drill-down: select voucher in grid → open full voucher entry window                                               | **MUST**     |

## **3.10 Statutory Registers**

### **3.10.1 Fixed Deposit (FD) Register**

Fields: FD Date, FDR No., Bank Name, Amount, FD Type, Duration (months), Interest Rate, Effective Date, Date of Maturity, Remarks. Register printable in legal format as required by MCS Act.

### **3.10.2 Property Register**

Fields: Sr. No. (auto), Co-Partner Member Name, Date of Possession, Distinguishing No. of Tenement, Flat No., Floor No., Description, Area, Cost, Land Value, Construction Value, Annual Ground Rent, Date of Cessation, Remark.

### **3.10.3 Sinking Fund Register**

| **REQ-ID** | **Module**   | **Requirement**                                                                                                                                                                 | **Priority** |
| ---------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **SF-001** | Sinking Fund | Sinking Fund Register is auto-populated when a member receipt includes a Sinking Fund charge line                                                                               | **MUST**     |
| **SF-002** | Sinking Fund | Fields: Sr. No. (auto), Member Name, Flat No., Value of Flat (excl. land), Required Contribution @ 0.25% p.a. of construction cost, Date of Receipt, Amount Contributed, Remark | **MUST**     |
| **SF-003** | Sinking Fund | Register printable in format compliant with MCS Act statutory requirements                                                                                                      | **MUST**     |

### **3.10.4 I-Form (Membership Register)**

| **REQ-ID** | **Module** | **Requirement**                                                                                                                                                                                                                                     | **Priority** |
| ---------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **IF-001** | I-Form     | Sr. No. (auto), Date of Admission, Date of Payment of Admission Fee, Full Name (from member list), Unit No., Address, Occupation, Age on Admission, Nominee Name (Section 30(1)), Nomination Date, Date of Cessation, Reason for Cessation, Remarks | **MUST**     |
| **IF-002** | I-Form     | Shares sub-table: On Date, Cash Book Folio, Application/Allotment details, Amount Received (I Call, II Call), Total Amount, No. of Shares, Share Certificate Serial No.                                                                             | **MUST**     |
| **IF-003** | I-Form     | Share Transfer / Surrender sub-table: On Date, Cash Book Folio, Unit No., Register No., Serial No., No. of Certificates, No. of Shares Transferred, Balance Shares, Balance Certificate Serial No., Balance Amount                                  | **MUST**     |

## **3.11 TDS Deduction Management**

| **REQ-ID**  | **Module** | **Requirement**                                                                                                                                                                                                              | **Priority** |
| ----------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **TDS-001** | TDS        | TDS record auto-created when a payment voucher includes a 'TDS Payable' account line                                                                                                                                         | **MUST**     |
| **TDS-002** | TDS        | Fields: Payment Date, Nature of Payment, Party Name, Bill No., Bill Date, Bill Amount, Taxable Amount, TDS Rate %, TDS Amount, Surcharge %, Surcharge Amount, Education Cess %, Education Cess Amount, Total %, Total Amount | **MUST**     |
| **TDS-003** | TDS        | Challan details: BSR Code, Bank Name, Branch Name, Challan No., Challan Date, Cheque No., Cheque Date                                                                                                                        | **MUST**     |
| **TDS-004** | TDS        | Form 16A generation: certificate of TDS deducted, per party, for a financial year                                                                                                                                            | **SHOULD**   |
| **TDS-005** | TDS        | TDS register report: party-wise / nature-wise summary for the year                                                                                                                                                           | **MUST**     |

## **3.12 Correspondence & Communication**

### **3.12.1 Reminder Letters**

| **REQ-ID** | **Module**     | **Requirement**                                                                                                | **Priority** |
| ---------- | -------------- | -------------------------------------------------------------------------------------------------------------- | ------------ |
| **CL-001** | Correspondence | Letter Type: General Reminder / MCACT-101 / custom user-defined types                                          | **MUST**     |
| **CL-002** | Correspondence | Letter body supports placeholders: {} for amount due, \[\] for balance-as-on date                              | **MUST**     |
| **CL-003** | Correspondence | MCACT-101 letter: auto-assigns reference no. and date of issue; stored for legal follow-up                     | **MUST**     |
| **CL-004** | Correspondence | Bulk generation: generate reminder letters for all defaulters in one operation; filterable by amount threshold | **SHOULD**   |

### **3.12.2 General Letters & Notices**

Date, Reference No., Type, Subject, Letter Text (rich text / free-form). Printable; storable for future reference.

### **3.12.3 Committee Members**

Committee member list with: Effective Date, Terms Ends On, Building/Wing/Unit identification, Member Name (from member list), Designation (Member Type), Status (Active/Inactive). New committee formation = new set of records; history preserved.

### **3.12.4 Minutes of Meeting**

Meeting No. (auto), Date, Time, Nature of Meeting. Attendee sub-grid: Member Name (from active list), Designation, Attended (Y/N), Comments. Resolution Details and Comments/Notings (free text fields). Printable in formal meeting minute format.

## **3.13 Miscellaneous Masters**

### **3.13.1 Bank Name Master (Payee Banks)**

Stores member/vendor banks (NOT the society's own bank accounts). Fields: Bank Name, Branch Name, Address, Telephone, Fax, Email, URL, Contact Person.

MICR Code sub-table: stores RBI-assigned 9-digit MICR codes for branches. MICR input in transactions auto-fills bank and branch name.

**NOTE:** _This master is for identifying payer/payee banks on receipts and payments. Society's own bank accounts are managed in Account Master._

### **3.13.2 Narration Master**

Frequently-used narration templates stored per table type. Selected via shortcode in voucher entry forms.

### **3.13.3 Address Book**

Stores office/other addresses for parties (vendors, society's bank with account no., etc.). Links to Account Master for party name. Fields: Party Name (from Account Master), Party Type, Office Address, Other Address, Bank Branch Name, Bank Account No.

### **3.13.4 Cheque Cancellation Reason Master**

Categorized list of cheque dishonour reasons (e.g., Insufficient Funds, Signature Mismatch, Account Closed). Linked to cheque cancellation entries. Below the master: list of all dishonoured cheques using that reason, with drill-down to original voucher.

### **3.13.5 Contractors Details**

Fields: Contractor Name, Type of Contract, Date of Contract, Building Name, Contractor Address, Contact Telephone.

# **4\. Non-Functional Requirements**

## **4.1 Performance**

| **REQ-ID** | **Module**  | **Requirement**                                                                                                      | **Priority** |
| ---------- | ----------- | -------------------------------------------------------------------------------------------------------------------- | ------------ |
| **NF-001** | Performance | Bill generation for up to 500 units must complete in under 5 seconds                                                 | **MUST**     |
| **NF-002** | Performance | Any report must render/preview in under 3 seconds for up to 10 years of data                                         | **MUST**     |
| **NF-003** | Performance | Application startup time must be under 4 seconds on minimum-spec hardware                                            | **MUST**     |
| **NF-004** | Performance | Bulk operations (bulk bill + bulk receipt) must use a single DB transaction with rollback; no partial-success states | **MUST**     |

## **4.2 Reliability & Data Integrity**

| **REQ-ID** | **Module**  | **Requirement**                                                                                                  | **Priority** |
| ---------- | ----------- | ---------------------------------------------------------------------------------------------------------------- | ------------ |
| **NF-005** | Reliability | All financial transactions enforce ΣDr = ΣCr; any imbalance must prevent saving with a descriptive error         | **MUST**     |
| **NF-006** | Reliability | SQLite WAL mode must be enabled; WAL checkpoint flushed before any backup file copy                              | **MUST**     |
| **NF-007** | Reliability | Backup must produce a verified, restorable SQLite file; integrity check (PRAGMA integrity_check) run post-backup | **MUST**     |
| **NF-008** | Reliability | Cancelled vouchers produce a reversal entry - originals are never deleted from the database                      | **MUST**     |
| **NF-009** | Reliability | Year-end close must be reversible only by the Administrator, with a confirmation gate                            | **MUST**     |

## **4.3 Security & Access Control**

| **REQ-ID** | **Module** | **Requirement**                                                                                                        | **Priority** |
| ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------- | ------------ |
| **NF-010** | Security   | Role-based access control: each user assigned a role (Administrator / Accountant / Operator / Committee / Auditor)     | **MUST**     |
| **NF-011** | Security   | All data mutations carry CreatedBy / UpdatedBy / CreatedAt / UpdatedAt audit columns, non-nullable                     | **MUST**     |
| **NF-012** | Security   | Passwords stored as salted bcrypt hashes; no plaintext storage                                                         | **MUST**     |
| **NF-013** | Security   | Session-based authentication within the Electron process; session invalidated on app close                             | **MUST**     |
| **NF-014** | Security   | Audit log table: records every CREATE / UPDATE / DELETE action with user, timestamp, table, and old/new value snapshot | **SHOULD**   |

## **4.4 Usability**

| **REQ-ID** | **Module** | **Requirement**                                                                                                                                 | **Priority** |
| ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **NF-015** | Usability  | All CRUD forms follow a consistent toolbar: Add, Edit, Save, Cancel, Delete, Find, Print, Browse, First/Next/Previous/Last, User Identity, Exit | **MUST**     |
| **NF-016** | Usability  | Find/Filter available on all master list and transaction screens; supports partial match on name/number                                         | **MUST**     |
| **NF-017** | Usability  | Keyboard shortcuts for common actions: F3 (member list), F4 (bank list), Shift+Down (add row in grid), F9 (defined per screen context)          | **MUST**     |
| **NF-018** | Usability  | Explorer Menu (left-panel tree view) available as optional alternative navigation                                                               | **SHOULD**   |
| **NF-019** | Usability  | Inline help text accessible by double-clicking label text on complex fields (e.g., Interest Type definition)                                    | **SHOULD**   |
| **NF-020** | Usability  | All print/report screens offer print preview before committing to printer                                                                       | **MUST**     |
| **NF-021** | Usability  | Confirmation dialog before any destructive action (delete, year-close, bulk generation)                                                         | **MUST**     |

## **4.5 Maintainability & Architecture**

| **REQ-ID** | **Module**   | **Requirement**                                                                                                     | **Priority** |
| ---------- | ------------ | ------------------------------------------------------------------------------------------------------------------- | ------------ |
| **NF-022** | Architecture | Strict layered IPC architecture: Renderer → Preload → typed IPC channel → Main process → Service → Prisma → SQLite  | **MUST**     |
| **NF-023** | Architecture | All IPC channel names and payload types defined in a shared preload/types.ts; no ad-hoc any types on IPC boundaries | **MUST**     |
| **NF-024** | Architecture | Service layer unit-testable in isolation (no Electron APIs in service functions)                                    | **SHOULD**   |
| **NF-025** | Architecture | Database migrations managed via Prisma Migrate; schema changes versioned in migration files                         | **MUST**     |
| **NF-026** | Architecture | No code generation scripts for production files; all source edits are direct                                        | **MUST**     |

## **4.6 Compatibility & Data Portability**

| **REQ-ID** | **Module**  | **Requirement**                                                                                        | **Priority** |
| ---------- | ----------- | ------------------------------------------------------------------------------------------------------ | ------------ |
| **NF-027** | Portability | Export any tabular report to CSV and PDF without third-party cloud service                             | **MUST**     |
| **NF-028** | Portability | Import member data via CSV template (defined columns, validation on import, row-level error reporting) | **SHOULD**   |
| **NF-029** | Portability | Backup file is a portable SQLite database file, openable by any SQLite browser                         | **MUST**     |
| **NF-030** | Portability | Year-end archive creates a read-only snapshot of the closed year's database                            | **SHOULD**   |

# **5\. Reporting Requirements**

All reports must support: on-screen preview, printer output, and export to PDF/CSV. Reports are grouped by category.

## **5.1 Society & Billing Reports**

| **Report Name**               | **Description**                                                              | **Filters / Parameters**                         |
| ----------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------ |
| Bill Register - Regular       | Horizontal layout: one member per row, charge heads as columns + arrears     | Period, Building, Wing, All/Single Member        |
| Bill Register - Supplementary | Same as regular bill register for supplementary bills                        | Period, Bill-To type (Member/Tenant/General)     |
| Member Ledger                 | Full transaction history for a member: bills, receipts, adjustments, balance | Member, Date Range                               |
| All Bills Summary             | All bills for a member on a single sheet with running balance                | Member, Year                                     |
| Contribution Summary          | Monthly contribution summary irrespective of individual member               | Year / Period                                    |
| Tariffwise Settlement Report  | Status of each charge recovered vs. outstanding per member                   | Effective Date, Member/All                       |
| Outstanding Statement         | Members with dues; principal and interest split                              | As-on Date, Building/Wing/All                    |
| Reminder Letter Print         | Generates printable reminder/MCACT-101 letters for defaulters                | Letter Type, Members (all defaulters / selected) |

## **5.2 Accounting Reports**

| **Report Name**               | **Description**                                                              | **Filters / Parameters** |
| ----------------------------- | ---------------------------------------------------------------------------- | ------------------------ |
| Voucher Register              | Chronological list of all vouchers by type (Receipt/Payment/Contra/JV/DN/CN) | Type, Date Range         |
| Cash Book                     | Daily cash receipts and payments with running balance                        | Date Range               |
| Bank Book                     | Bank account transactions with balance, cheque details                       | Bank Account, Date Range |
| General Ledger                | Account-level transaction detail for any ledger head                         | Account Name, Date Range |
| Trial Balance                 | All account heads with debit/credit totals                                   | As-on Date               |
| Balance Sheet                 | Assets vs. Liabilities per hierarchy; substitute names for flipped items     | As-on Date               |
| Income & Expenditure          | Revenue vs. Expenses for the year; net surplus/deficit                       | Year / Date Range        |
| Receipt & Payment Statement   | Summary of cash & bank inflows and outflows                                  | Year / Date Range        |
| Bank Reconciliation Statement | Uncleared items + pass-book vs. book balance                                 | Bank Account, As-on Date |
| Bank Slip / Deposit Slip      | Cheques grouped by Bank Slip No. for bank deposit presentation               | Bank Slip No.            |
| Day Book                      | All vouchers for a selected date                                             | Date                     |
| Petty Cash Register           | Daily petty cash entries for petty cash expense accounts                     | Date Range               |

## **5.3 Member & Property Reports**

| **Report Name**           | **Description**                                              | **Filters / Parameters**      |
| ------------------------- | ------------------------------------------------------------ | ----------------------------- |
| Member Directory          | Full list of members with contact details                    | Building, Wing, Status        |
| Member Profile            | Single-member detailed printout (all tabs)                   | Member                        |
| Occupancy Report          | Unit-wise occupancy status (Owner/Tenant/Vacant)             | Building, Wing                |
| Parking Allocation Report | Members and their parking assignments with tariff type       | Building, Type                |
| I-Form Register           | Statutory membership register per MCS Act                    | Year / All                    |
| Property Register         | Statutory property register                                  | All                           |
| FD Register               | Fixed deposit summary with maturity dates and interest rates | Bank, Status (Active/Matured) |
| Sinking Fund Register     | Statutory sinking fund contributions per flat                | Year                          |

## **5.4 TDS & Statutory Tax Reports**

| **Report Name**      | **Description**                              | **Filters / Parameters** |
| -------------------- | -------------------------------------------- | ------------------------ |
| TDS Register         | Deductions by party, nature of payment, rate | Year, Party, Nature      |
| TDS Challan Register | Challan-wise deposit details                 | Year, Quarter            |
| Form 16A             | TDS certificate printout per deductee        | Party, Financial Year    |

## **5.5 View Menu (Drill-Down Reports)**

A secondary report menu provides a curated set of high-utility reports with drill-down capability - clicking any line item opens the underlying voucher or bill entry. Reports in this group include: Member Outstanding, Voucher Register, General Ledger, and Bill Register. Zoom-to-voucher must be supported.

# **6\. Data Migration & Initial Setup**

## **6.1 New Society / New Financial Year Wizard**

A guided wizard handles: new society creation (not available from normal Add button in Society Identity), new financial year opening from an existing year (carry-forward of opening balances, member data, tariff definitions). The wizard is the only entry point for these operations.

## **6.2 Opening Balance Entry**

Account-level opening balances entered through Account Master. Member-level opening balances (Regular + Supplementary bills) entered through Member Identification. The system must validate that total member opening balances reconcile with the corresponding ledger account opening balance.

## **6.3 Multi-Year Data**

Each financial year may be stored in the same database file or a separate file (configurable). Year-end close: marks the year as read-only; opening balances for the new year are auto-carried forward. Reopening a closed year requires Administrator role.

## **6.4 CSV Import**

System shall provide a CSV import template for initial member data load. The import process must: validate each row, report errors by row number with field-level messages, and commit only if all rows pass validation (all-or-nothing).

# **7\. Appendix A - CRUD Operation Standard**

All master and transaction forms must implement the following standard toolbar operations consistently:

| **Button / Action** | **Keyboard**    | **Behaviour**                                                         |
| ------------------- | --------------- | --------------------------------------------------------------------- |
| Add                 | Ctrl+N          | Clears form; enables input; record not saved until Save is clicked    |
| Edit                | Ctrl+E          | Loads selected record into editable state                             |
| Save                | Ctrl+S          | Validates and persists the record; shows validation errors inline     |
| Cancel              | Esc             | Discards unsaved changes; reverts to last saved state                 |
| Delete              | Del (guarded)   | Soft-deletes record after confirmation; blocked if referenced         |
| Find                | Ctrl+F          | Opens search/filter panel; supports partial match                     |
| Browse              | Ctrl+B          | Opens a list/grid of all records for the current master               |
| Print               | Ctrl+P          | Opens print preview for the current record or report                  |
| Move First/Last     | Ctrl+Home/End   | Navigates to first or last record                                     |
| Move Next/Prev      | Ctrl+Right/Left | Navigates to adjacent record                                          |
| User Identity       | -               | Shows created-by / modified-by / timestamp audit trail for the record |
| Exit                | Ctrl+W / Alt+F4 | Closes the active form; prompts save if unsaved changes exist         |

# **8\. Appendix B - Improvements Over Legacy eSociety**

The following capabilities are new additions not present in the original eSociety system:

| **REQ-ID**  | **Module**    | **Requirement**                                                                                                                | **Priority** |
| ----------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| **IMP-001** | Architecture  | Electron-based cross-platform desktop app (Windows/macOS/Linux) vs. legacy Windows-only VB6 application                        | **MUST**     |
| **IMP-002** | Architecture  | Strict typed IPC architecture - no direct DB access from renderer; eliminates entire class of concurrency and injection bugs   | **MUST**     |
| **IMP-003** | Security      | Role-based access control with hashed passwords; legacy had minimal user security                                              | **MUST**     |
| **IMP-004** | Audit         | Full audit trail (CreatedBy, UpdatedBy, audit log table) on all mutations; legacy had only User Identity field                 | **MUST**     |
| **IMP-005** | Data          | Prisma ORM with versioned migrations; legacy used ad-hoc DDL with no migration history                                         | **MUST**     |
| **IMP-006** | Billing       | Bulk bill + receipt in a single atomic transaction with full rollback; legacy had no rollback guarantee                        | **MUST**     |
| **IMP-007** | UX            | Sidebar + horizontal tab bar navigation replacing legacy MDI window menus                                                      | **SHOULD**   |
| **IMP-008** | UX            | Inline validation with field-level error messages; legacy used modal popup dialogs                                             | **SHOULD**   |
| **IMP-009** | Reports       | PDF + CSV export on all reports; legacy relied on Crystal Reports with no portable export                                      | **MUST**     |
| **IMP-010** | Data          | CSV member import with row-level error reporting; legacy had no import capability                                              | **SHOULD**   |
| **IMP-011** | Tax           | GST field in Society Parameters (replacing legacy Service Tax) with rate configurability for compliance with post-2017 tax law | **SHOULD**   |
| **IMP-012** | Notifications | In-app notification for upcoming FD maturities and cheque due dates                                                            | **MAY**      |
| **IMP-013** | Backup        | Automated scheduled backup with integrity verification (PRAGMA integrity_check); legacy had manual-only backup                 | **SHOULD**   |
| **IMP-014** | Compliance    | MCACT-101 letter with stored reference number and date for legal documentation trail                                           | **MUST**     |

# **9\. Supplementary Requirements - Gap Fill**

This section documents requirements identified during audit of the original eSociety user manual that were absent or underspecified in Sections 3-8. All items are numbered in the GAP series and must be treated with the same authority as earlier sections.

## **9.1 Regular Bill - "Bill For" Period Selector**

The regular bill entry form includes a mandatory "Bill For" dropdown that identifies the billing period for which the bill is being raised (e.g., "April 2025", "Q1 2025-26"). This field:

- Is populated automatically based on the configured Bill Frequency and the last generated bill period
- Prevents duplicate bills for the same member in the same period (system must enforce uniqueness on Member + Bill For period)
- Is used as the period label printed on the bill document and in the Bill Register report
- In bulk bill generation, this field is set once and applied to all members in that run

| **REQ-ID**  | **Module** | **Requirement**                                                                                                                                                  | **Priority** |
| ----------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **GAP-001** | Billing    | Regular Bill form must include a 'Bill For' period selector populated from the billing frequency calendar; duplicate member+period combinations must be rejected | **MUST**     |
| **GAP-002** | Billing    | The Bill For period must be printed on the bill document and used as the column grouping header in the Bill Register report                                      | **MUST**     |
| **GAP-003** | Billing    | Bulk bill generation screen must display the Bill For period prominently before the user confirms the run                                                        | **MUST**     |

## **9.2 General Reference on Receipt / Payment Vouchers**

When a receipt or payment is made against a general supplementary bill (Bill To = General, with no member/unit association), the voucher entry must support a General Reference linkage to that bill's reference number. This is separate from both Regular Bill Settlement and Supplementary Bill Settlement panels.

| **REQ-ID**  | **Module**   | **Requirement**                                                                                                                                                              | **Priority** |
| ----------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **GAP-004** | Transactions | Receipt/Payment voucher form must include a General Reference panel; user can select a general-type supplementary bill reference number from a help list to link the payment | **MUST**     |
| **GAP-005** | Transactions | Linking a general reference must update the settlement status of the referenced general supplementary bill exactly as member-receipt linkage does for member bills           | **MUST**     |
| **GAP-006** | Transactions | General receipts (Type = General Receipt) must have a separate auto-incremented voucher number series from member receipts                                                   | **MUST**     |

## **9.3 Non-Occupancy Charges - Billing Behavior**

Under the Maharashtra Co-operative Societies Act, a member who has let out their unit to a tenant is liable to pay a Non-Occupancy Charge (NOC) - typically 10% of the service charges - in addition to the standard maintenance charges. The system must automate this.

| **REQ-ID**  | **Module** | **Requirement**                                                                                                                                                                                                   | **Priority** |
| ----------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **GAP-007** | Billing    | When a member's Tenant Occupancy flag = Yes, the billing engine must automatically append a Non-Occupancy Charge line to the bill, calculated as a configurable percentage of the applicable service charge lines | **MUST**     |
| **GAP-008** | Billing    | The Non-Occupancy Charge percentage must be configurable in Society Parameters (default 10% per MCS Act norms); the account head used is the Non-Occupancy Account defined in SP-012                              | **MUST**     |
| **GAP-009** | Billing    | Non-Occupancy Charge lines must appear as a distinct line on the printed bill with the label derived from the configured account name                                                                             | **MUST**     |
| **GAP-010** | Billing    | If Tenant Occupancy flag is changed mid-year (member takes back possession), the NOC line must be suppressed on all bills generated from the change date onward; retroactive bills are not altered                | **MUST**     |
| **GAP-011** | Billing    | Society Parameters must include a Non-Occupancy Charge % field (separate from the account linkage already in SP-012)                                                                                              | **MUST**     |

## **9.4 Petty Cash Voucher Entry & Register**

When an Account Master expense record is flagged as Petty Cash (COA-006), the system must provide a dedicated daily petty cash entry workflow separate from the main cash/bank transaction screen.

| **REQ-ID**  | **Module**   | **Requirement**                                                                                                                                                   | **Priority** |
| ----------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **GAP-012** | Transactions | A Petty Cash Voucher entry form must exist, accessible from the Transactions menu, for recording small daily expenses against accounts flagged as Petty Cash      | **MUST**     |
| **GAP-013** | Transactions | Petty Cash entries must post to the general ledger identically to cash payment vouchers; the only distinction is the entry point and the register they appear in  | **MUST**     |
| **GAP-014** | Transactions | A Petty Cash Register report must be available: date-wise listing of all petty cash entries with running balance, filterable by date range and petty cash account | **MUST**     |
| **GAP-015** | Transactions | The system must support two separate cash heads simultaneously - Main Cash and Petty Cash - both appearing correctly in the Cash Book and Trial Balance           | **MUST**     |

## **9.5 Cheque Printing Workflow**

The system supports printing cheques directly from payment voucher entries. The Cheque Printing Format is selected in Society Reports Format (Section 3.1.4). The Particulars field on a payment voucher is the payee name printed on the cheque.

| **REQ-ID**  | **Module**   | **Requirement**                                                                                                                                                                                                                                               | **Priority** |
| ----------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **GAP-016** | Transactions | Any Bank Payment voucher must expose a 'Print Cheque' action that opens a print preview populated with: Payee Name (from Particulars field), Amount (in figures and words), Cheque Date, Bank Name/Branch, and Cheque Signatory names from Society Parameters | **MUST**     |
| **GAP-017** | Transactions | Cheque print must use the format template selected in Society Reports Format → Cheque Printing Format                                                                                                                                                         | **MUST**     |
| **GAP-018** | Transactions | The system must support cheque number pre-printing: the cheque number on the voucher is filled into the Cheque No. field and printed on the cheque if the template includes it                                                                                | **SHOULD**   |
| **GAP-019** | Transactions | Amount in words must be auto-generated from the numeric amount in INR (Rupees and Paise); the words field must not be manually editable to prevent tampering                                                                                                  | **MUST**     |

## **9.6 Form 16A - Address Book Dependency**

Form 16A (TDS certificate) requires the deductee's full address. The system derives this from the Address Book master (Section 3.13.3), not the member record, because deductees are often vendors/contractors, not society members.

| **REQ-ID**  | **Module** | **Requirement**                                                                                                                                                                                                                  | **Priority** |
| ----------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **GAP-020** | TDS        | Form 16A generation must source the deductee's address from the Address Book master linked to the party's Account Master record; if no address is defined, the system must warn the user and block Form 16A print for that party | **MUST**     |
| **GAP-021** | TDS        | Address Book must support storage of the society's own bank details (branch name + account no.) as a distinct party type, used for TDS challan deposit bank reference in Form 16A                                                | **MUST**     |
| **GAP-022** | TDS        | Form 16A must be printable per party per financial year, covering all TDS deductions made during that year, grouped by Nature of Payment and challan                                                                             | **MUST**     |

## **9.7 Tenant Identity & Registration**

The original system allows supplementary bills to be raised to a "Tenant" as a distinct bill-to type. A Tenant is not a full member (no shares, no voting rights) but occupies a unit under a leave-and-license arrangement. The system needs a lightweight tenant record to support this.

| **REQ-ID**  | **Module**  | **Requirement**                                                                                                                                                                                             | **Priority** |
| ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **GAP-023** | Member Mgmt | The system must support a Tenant record type: linked to a Unit No., with fields: Tenant Name, Contact Details (phone, email), License Agreement Date, License Expiry Date, and Monthly Rent (informational) | **MUST**     |
| **GAP-024** | Member Mgmt | A unit may have one active member (owner) and one active tenant simultaneously; both are independently addressable in supplementary billing                                                                 | **MUST**     |
| **GAP-025** | Member Mgmt | Tenant records must be soft-archived on license expiry; historical tenant history per unit must be viewable                                                                                                 | **MUST**     |
| **GAP-026** | Billing     | Supplementary bill Bill To = Tenant must show only active tenants in the help list; the selected tenant's Unit No./Wing/Building must auto-populate                                                         | **MUST**     |
| **GAP-027** | Member Mgmt | The Member Identification form's Tenant Occupancy = Yes flag must require that a Tenant record exists for that unit; if none exists, the system must prompt the user to create one or warn                  | **SHOULD**   |

## **9.8 Interest Calculation Detail Breakup**

Both the Regular Bill and Supplementary Bill screens expose an \[Interest Detail\] button/panel. This must show a transparent breakdown of how the interest figure was derived, so the user can verify or override it confidently.

| **REQ-ID**  | **Module** | **Requirement**                                                                                                                                                                                                                                                                           | **Priority** |
| ----------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **GAP-028** | Billing    | The Interest Detail panel must display: method used (Delay Days / Delay Months / Complete Cycle / Compound), the base amount on which interest is calculated, the rate %, the period (from Due Date to Bill Date or system date), and the resulting interest amount per prior-unpaid bill | **MUST**     |
| **GAP-029** | Billing    | Delay Days: interest = (Outstanding Principal × Rate% / 365) × number of days overdue past due date                                                                                                                                                                                       | **MUST**     |
| **GAP-030** | Billing    | Delay Months: interest = (Outstanding Principal × Rate% / 12) × number of full months overdue                                                                                                                                                                                             | **MUST**     |
| **GAP-031** | Billing    | Complete Cycle: interest is charged at the full period rate (e.g., full month/quarter) once any delay occurs within that cycle, regardless of exact days                                                                                                                                  | **MUST**     |
| **GAP-032** | Billing    | Compound Interest: interest is calculated on (Principal + accumulated prior interest) at each billing cycle                                                                                                                                                                               | **MUST**     |
| **GAP-033** | Billing    | The Interest Detail panel must be read-only when Allow Manual Calculation = No; it becomes editable (override field) when Allow Manual Calculation = Yes                                                                                                                                  | **MUST**     |

## **9.9 Startup Wizard & Financial Year Management**

The original system presents a setup/selection screen at application launch. This is the only entry point for creating a new society database or opening a new financial year for an existing society. It must not be accessible from within the running application's normal menu.

| **REQ-ID**  | **Module** | **Requirement**                                                                                                                                                                                                                                                         | **Priority** |
| ----------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **GAP-034** | Admin      | On every application launch, before the main UI loads, a startup selector must appear offering: (a) Open Existing Society/Year, (b) Create New Society, (c) Open New Financial Year for Existing Society                                                                | **MUST**     |
| **GAP-035** | Admin      | Create New Society: wizard collects Society Identity fields, creates a fresh SQLite DB file at a user-chosen path, initialises all system tables, and then opens the main application against that DB                                                                   | **MUST**     |
| **GAP-036** | Admin      | Open New Financial Year: wizard reads the current year's DB, carries forward all master data (Chart of Accounts, Members, Tariff Definitions, Parameters) and closing balances as opening balances into a new DB file; original year's DB becomes read-only             | **MUST**     |
| **GAP-037** | Admin      | Open Existing Society/Year: user selects a DB file from disk; application validates it is a valid SAMS database and opens it; recently-opened DB files are listed for quick access                                                                                      | **MUST**     |
| **GAP-038** | Admin      | Year-end carry-forward must: (1) convert all Closing Balances to Opening Balances in the new year, (2) carry unpaid bill arrears as member opening balances, (3) reset income/expense accounts to zero (they do not carry forward), (4) preserve all master data intact | **MUST**     |
| **GAP-039** | Admin      | The main application menu must not expose a 'New Society' or 'New Year' action - these are startup-only operations to prevent accidental year creation mid-session                                                                                                      | **MUST**     |

## **9.10 Member Fields - Class & Club Membership Deposit**

Two fields in Member Others Information were present in the manual but unspecified in the SRS.

| **REQ-ID**  | **Module**  | **Requirement**                                                                                                                                                                                                                                                   | **Priority** |
| ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **GAP-040** | Member Mgmt | Class field on Member: a user-defined classification (e.g., A-Class, B-Class, or society-specific categories); stored as free text or selectable from a configurable lookup list; used for filtering member lists and reports                                     | **SHOULD**   |
| **GAP-041** | Member Mgmt | Club Membership Deposit: if the society operates a club/amenity, a deposit amount taken from the member at the time of membership is stored here; informational only - it does not auto-generate a billing entry but should appear on the member profile printout | **SHOULD**   |
| **GAP-042** | Member Mgmt | Both Class and Club Membership Deposit must be included as filterable/displayable columns in the Member Directory report                                                                                                                                          | **SHOULD**   |

## **9.11 Bank Deposit Slip - Functional Specification**

The Bank Slip No. field on receipt vouchers groups multiple cheques into a single bank deposit. The Bank Deposit Slip report presents this grouping in a format suitable for presenting to the bank.

| **REQ-ID**  | **Module**   | **Requirement**                                                                                                                                                                                | **Priority** |
| ----------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **GAP-043** | Transactions | Bank Slip No. is a user-input alphanumeric field on receipt vouchers; multiple receipt vouchers sharing the same Bank Slip No. are treated as one deposit batch                                | **MUST**     |
| **GAP-044** | Reports      | Bank Deposit Slip report: filter by Bank Slip No.; output lists each cheque in the batch with: Cheque No., Cheque Date, Bank Name, Branch, Drawer Name (member/party), Amount; total at bottom | **MUST**     |
| **GAP-045** | Reports      | The Bank Deposit Slip must be printable in a format accepted by banks (single-page per slip, bank account details of society at top from Address Book)                                         | **SHOULD**   |

## **9.12 Voucher Number Series - Complete Specification**

The manual implies several distinct auto-increment voucher series. This section consolidates the complete set to avoid ambiguity during implementation.

| **Voucher Type**   | **Series**                     | **Resets**          |
| ------------------ | ------------------------------ | ------------------- |
| Member Receipt     | MR-YYYY-NNNN                   | Each financial year |
| General Receipt    | GR-YYYY-NNNN                   | Each financial year |
| Cash Payment       | CP-YYYY-NNNN                   | Each financial year |
| Bank Payment       | BP-YYYY-NNNN                   | Each financial year |
| Contra             | CO-YYYY-NNNN                   | Each financial year |
| Journal Voucher    | JV-YYYY-NNNN                   | Each financial year |
| Debit Note         | DN-YYYY-NNNN                   | Each financial year |
| Credit Note        | CN-YYYY-NNNN                   | Each financial year |
| Regular Bill       | RB-YYYY-NNNN (or user pattern) | Each financial year |
| Supplementary Bill | SB-YYYY-NNNN (or user pattern) | Each financial year |

| **REQ-ID**  | **Module**   | **Requirement**                                                                                                                                                                                                  | **Priority** |
| ----------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **GAP-046** | Transactions | Each voucher type listed above must maintain a completely independent auto-increment series; there must be no shared counter between any two types                                                               | **MUST**     |
| **GAP-047** | Transactions | All series must reset at financial year start; vouchers from prior years retain their original numbers and are accessible in read-only mode                                                                      | **MUST**     |
| **GAP-048** | Transactions | Manual No. (user-input) is an additional parallel field on all voucher types and does not affect the system-generated series; Manual No. need not be unique but duplicates should trigger a non-blocking warning | **MUST**     |

## **9.13 Interest Type Definitions - Inline Help Content**

The Society Parameters screen requires inline help text for the three Simple Interest sub-types, accessible by double-clicking the Interest Type label. The content for each:

### **Delay Days**

Interest is charged only on amounts that remain unpaid beyond the due date. The interest accrues daily from the day after the due date. Formula: Interest = (Outstanding Amount × Annual Rate%) ÷ 365 × Number of Days Overdue. Each unpaid bill's overdue days are calculated independently.

### **Delay Months**

Interest is charged only on amounts that remain unpaid beyond the due date. The interest accrues per complete calendar month of delay. Formula: Interest = (Outstanding Amount × Annual Rate%) ÷ 12 × Number of Complete Months Overdue. Partial months are not counted.

### **Complete Cycle**

If any amount remains unpaid at the end of a billing cycle (regardless of how many days into the cycle the due date fell), interest is charged for the full cycle. Formula: Interest = Outstanding Amount × Rate% per cycle. This penalises any delay - even one day overdue triggers a full cycle's interest.

| **REQ-ID**  | **Module** | **Requirement**                                                                                                                                                                                       | **Priority** |
| ----------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **GAP-049** | Parameters | Each of the three Simple Interest sub-type definitions above must be accessible as inline help text (double-click on label) within the Society Parameters form                                        | **MUST**     |
| **GAP-050** | Parameters | The interest calculation engine must implement all three sub-types exactly as defined above; the selected method in Society Parameters governs which formula is applied across all bills in that year | **MUST**     |

## **9.14 Contribution Summary - Report Specification**

The Contribution Summary is accessible as a reference shortcut from within the Regular Bill entry screen (Reference Data panel, item 3). It is a cross-member, cross-period view of billing contributions.

| **REQ-ID**  | **Module** | **Requirement**                                                                                                                                                                                     | **Priority** |
| ----------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| **GAP-051** | Reports    | Contribution Summary report: shows total charges billed per period (month/quarter/etc.) across all members - not per individual member; used to verify that bulk billing ran correctly for a period | **MUST**     |
| **GAP-052** | Reports    | Columns: Period (Bill For), No. of Bills Generated, Total Principal Charged, Total Interest Charged, Total Service Tax Charged, Grand Total; one row per billing period                             | **MUST**     |
| **GAP-053** | Reports    | The report must be accessible both from the Bill Reference Data panel (contextual) and from the main Reports menu (standalone)                                                                      | **MUST**     |
