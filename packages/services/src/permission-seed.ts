/**
 * RBAC permission seed — SDD §4.2, §30.4
 */
import { PermissionAction, UserRole, type PermissionSeedRow } from '@sams/shared-types';

const RESOURCES = {
  SOCIETY_PARAMETERS: 'society.parameters',
  ACCOUNTING_COA: 'accounting.coa',
  PROPERTY: 'property',
  MEMBERS: 'members',
  MASTERS: 'masters',
  VOUCHERS: 'vouchers',
  BILLING: 'billing',
  ADMIN_YEAR_END: 'admin.yearEnd',
  LETTERS: 'letters',
  STATUTORY: 'statutory',
  TDS: 'tds',
  AUTH: 'auth',
} as const;

type MatrixEntry = {
  resource: string;
  admin: PermissionAction[];
  accountant: PermissionAction[];
  operator: PermissionAction[];
  committee: PermissionAction[];
  auditor: PermissionAction[];
};

const MATRIX: MatrixEntry[] = [
  {
    resource: RESOURCES.SOCIETY_PARAMETERS,
    admin: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE],
    accountant: [PermissionAction.READ],
    operator: [],
    committee: [],
    auditor: [PermissionAction.READ],
  },
  {
    resource: RESOURCES.ACCOUNTING_COA,
    admin: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE],
    accountant: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE],
    operator: [PermissionAction.READ],
    committee: [],
    auditor: [PermissionAction.READ],
  },
  {
    resource: RESOURCES.PROPERTY,
    admin: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE],
    accountant: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE],
    operator: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE],
    committee: [PermissionAction.READ],
    auditor: [PermissionAction.READ],
  },
  {
    resource: RESOURCES.MEMBERS,
    admin: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE],
    accountant: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE],
    operator: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE],
    committee: [PermissionAction.READ],
    auditor: [PermissionAction.READ],
  },
  {
    resource: RESOURCES.MASTERS,
    admin: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE],
    accountant: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE],
    operator: [PermissionAction.READ],
    committee: [],
    auditor: [PermissionAction.READ],
  },
  {
    resource: RESOURCES.VOUCHERS,
    admin: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE],
    accountant: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE],
    operator: [PermissionAction.CREATE, PermissionAction.READ],
    committee: [],
    auditor: [PermissionAction.READ],
  },
  {
    resource: RESOURCES.BILLING,
    admin: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE],
    accountant: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE],
    operator: [],
    committee: [PermissionAction.READ],
    auditor: [PermissionAction.READ],
  },
  {
    resource: RESOURCES.ADMIN_YEAR_END,
    admin: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE],
    accountant: [PermissionAction.READ],
    operator: [],
    committee: [],
    auditor: [PermissionAction.READ],
  },
  {
    resource: RESOURCES.STATUTORY,
    admin: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE],
    accountant: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE],
    operator: [PermissionAction.READ],
    committee: [PermissionAction.READ],
    auditor: [PermissionAction.READ],
  },
  {
    resource: RESOURCES.TDS,
    admin: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE, PermissionAction.PRINT],
    accountant: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE, PermissionAction.PRINT],
    operator: [PermissionAction.READ],
    committee: [],
    auditor: [PermissionAction.READ, PermissionAction.PRINT],
  },
  {
    resource: RESOURCES.LETTERS,
    admin: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE],
    accountant: [PermissionAction.CREATE, PermissionAction.READ, PermissionAction.UPDATE, PermissionAction.DELETE],
    operator: [],
    committee: [
      PermissionAction.CREATE,
      PermissionAction.READ,
      PermissionAction.UPDATE,
      PermissionAction.DELETE,
    ],
    auditor: [PermissionAction.READ],
  },
  {
    resource: RESOURCES.AUTH,
    admin: [PermissionAction.READ],
    accountant: [PermissionAction.READ],
    operator: [PermissionAction.READ],
    committee: [PermissionAction.READ],
    auditor: [PermissionAction.READ],
  },
];

function rowsForRole(
  role: UserRole,
  key: keyof Omit<MatrixEntry, 'resource'>,
): PermissionSeedRow[] {
  return MATRIX.flatMap((entry) =>
    entry[key].map((action) => ({
      role,
      resource: entry.resource,
      action,
    })),
  );
}

export const PERMISSION_SEED_ROWS: PermissionSeedRow[] = [
  ...rowsForRole(UserRole.ADMIN, 'admin'),
  ...rowsForRole(UserRole.ACCOUNTANT, 'accountant'),
  ...rowsForRole(UserRole.OPERATOR, 'operator'),
  ...rowsForRole(UserRole.COMMITTEE, 'committee'),
  ...rowsForRole(UserRole.AUDITOR, 'auditor'),
];

export function resolvePermissionKeys(role: UserRole): string[] {
  const roleKey = {
    [UserRole.ADMIN]: 'admin',
    [UserRole.ACCOUNTANT]: 'accountant',
    [UserRole.OPERATOR]: 'operator',
    [UserRole.COMMITTEE]: 'committee',
    [UserRole.AUDITOR]: 'auditor',
  }[role] as keyof Omit<MatrixEntry, 'resource'>;

  return rowsForRole(role, roleKey).map((r) => `${r.resource}:${r.action}`);
}

export { RESOURCES };
