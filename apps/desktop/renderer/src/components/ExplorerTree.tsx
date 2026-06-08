import { NavLink, useNavigate } from 'react-router-dom';
import { PermissionAction } from '@sams/shared-types';
import { usePermission } from '../hooks/usePermission';
import { useTabStore } from '../store/tabStore';

type ExplorerItem = {
  id: string;
  label: string;
  route: string;
  permission?: { resource: string; action: PermissionAction | string };
};

type ExplorerGroup = {
  id: string;
  label: string;
  children: ExplorerItem[];
};

const explorerNodes: ExplorerGroup[] = [
  {
    id: 'society',
    label: 'Society Setup',
    children: [
      { id: 'soc-identity', label: 'Identity', route: '/app/setup/identity', permission: { resource: 'society.parameters', action: PermissionAction.READ } },
      { id: 'soc-params', label: 'Parameters', route: '/app/setup/parameters', permission: { resource: 'society.parameters', action: PermissionAction.READ } },
      { id: 'soc-property', label: 'Property', route: '/app/setup/property', permission: { resource: 'society.parameters', action: PermissionAction.READ } },
      { id: 'soc-formats', label: 'Report Formats', route: '/app/setup/report-formats', permission: { resource: 'society.parameters', action: PermissionAction.READ } },
    ],
  },
  {
    id: 'accounting',
    label: 'Accounting',
    children: [
      { id: 'coa', label: 'Chart of Accounts', route: '/app/accounting/chart-of-accounts', permission: { resource: 'accounting.coa', action: PermissionAction.READ } },
    ],
  },
  {
    id: 'property',
    label: 'Property',
    children: [
      { id: 'bld', label: 'Buildings', route: '/app/property/buildings', permission: { resource: 'property', action: PermissionAction.READ } },
      { id: 'wing', label: 'Wings', route: '/app/property/wings', permission: { resource: 'property', action: PermissionAction.READ } },
      { id: 'ref-masters', label: 'Reference Masters', route: '/app/property/reference-masters', permission: { resource: 'property', action: PermissionAction.READ } },
      { id: 'units', label: 'Units', route: '/app/property/units', permission: { resource: 'property', action: PermissionAction.READ } },
      { id: 'park-tariff', label: 'Parking Tariffs', route: '/app/property/parking-tariffs', permission: { resource: 'property', action: PermissionAction.READ } },
      { id: 'park-space', label: 'Parking Spaces', route: '/app/property/parking-spaces', permission: { resource: 'property', action: PermissionAction.READ } },
      { id: 'park-assign', label: 'Parking Assignments', route: '/app/property/parking-assignments', permission: { resource: 'property', action: PermissionAction.READ } },
    ],
  },
  {
    id: 'masters',
    label: 'Masters',
    children: [
      { id: 'mst-bank', label: 'Banks', route: '/app/masters/banks', permission: { resource: 'masters', action: PermissionAction.READ } },
      { id: 'mst-narr', label: 'Narrations', route: '/app/masters/narrations', permission: { resource: 'masters', action: PermissionAction.READ } },
      { id: 'mst-addr', label: 'Address Book', route: '/app/masters/address-book', permission: { resource: 'masters', action: PermissionAction.READ } },
      { id: 'mst-chq', label: 'Cheque Reasons', route: '/app/masters/cheque-reasons', permission: { resource: 'masters', action: PermissionAction.READ } },
      { id: 'mst-cont', label: 'Contractors', route: '/app/masters/contractors', permission: { resource: 'masters', action: PermissionAction.READ } },
    ],
  },
  {
    id: 'members',
    label: 'Members',
    children: [
      { id: 'mem-reg', label: 'Member Register', route: '/app/members/register', permission: { resource: 'members', action: PermissionAction.READ } },
      { id: 'mem-tenant', label: 'Tenants', route: '/app/members/tenants', permission: { resource: 'members', action: PermissionAction.READ } },
    ],
  },
  {
    id: 'transactions',
    label: 'Transactions',
    children: [
      { id: 'vch-entry', label: 'Receipt / Payment / Contra', route: '/app/transactions/voucher', permission: { resource: 'vouchers', action: PermissionAction.READ } },
      { id: 'vch-petty', label: 'Petty Cash', route: '/app/transactions/petty-cash', permission: { resource: 'vouchers', action: PermissionAction.READ } },
      { id: 'vch-adj', label: 'JV / DN / CN', route: '/app/transactions/adjustments', permission: { resource: 'vouchers', action: PermissionAction.READ } },
      { id: 'bnk-rec', label: 'Bank Reconciliation', route: '/app/transactions/bank-reconciliation', permission: { resource: 'vouchers', action: PermissionAction.READ } },
    ],
  },
  {
    id: 'billing',
    label: 'Billing',
    children: [
      { id: 'tar-def', label: 'Tariff Definition', route: '/app/billing/tariffs', permission: { resource: 'billing', action: PermissionAction.READ } },
      { id: 'tar-settle', label: 'Settlement Sequence', route: '/app/billing/settlement-sequence', permission: { resource: 'billing', action: PermissionAction.READ } },
      { id: 'tar-map', label: 'Bill Register Mapping', route: '/app/billing/bill-register-mapping', permission: { resource: 'billing', action: PermissionAction.READ } },
      { id: 'bil-reg', label: 'Regular Bill', route: '/app/billing/regular', permission: { resource: 'billing', action: PermissionAction.READ } },
      { id: 'bil-bulk', label: 'Bulk Regular Bills', route: '/app/billing/regular/bulk', permission: { resource: 'billing', action: PermissionAction.READ } },
      { id: 'bil-supp', label: 'Supplementary Bill', route: '/app/billing/supplementary', permission: { resource: 'billing', action: PermissionAction.READ } },
    ],
  },
  {
    id: 'tds',
    label: 'TDS',
    children: [
      { id: 'tds-rec', label: 'TDS Records', route: '/app/tds/records', permission: { resource: 'tds', action: PermissionAction.READ } },
      { id: 'tds-f16', label: 'Form 16A', route: '/app/tds/form16a', permission: { resource: 'tds', action: PermissionAction.READ } },
    ],
  },
  {
    id: 'statutory',
    label: 'Statutory Registers',
    children: [
      { id: 'reg-fd', label: 'FD Register', route: '/app/statutory/fd', permission: { resource: 'statutory', action: PermissionAction.READ } },
      { id: 'reg-prop', label: 'Property Register', route: '/app/statutory/property', permission: { resource: 'statutory', action: PermissionAction.READ } },
      { id: 'reg-sf', label: 'Sinking Fund', route: '/app/statutory/sinking-fund', permission: { resource: 'statutory', action: PermissionAction.READ } },
      { id: 'reg-iform', label: 'I-Form Register', route: '/app/statutory/iform', permission: { resource: 'statutory', action: PermissionAction.READ } },
    ],
  },
  {
    id: 'correspondence',
    label: 'Correspondence',
    children: [
      { id: 'cor-rem', label: 'Reminder Letters', route: '/app/correspondence/reminders', permission: { resource: 'letters', action: PermissionAction.READ } },
      { id: 'cor-gen', label: 'General Letters', route: '/app/correspondence/letters', permission: { resource: 'letters', action: PermissionAction.READ } },
      { id: 'cor-com', label: 'Committee Members', route: '/app/correspondence/committee', permission: { resource: 'letters', action: PermissionAction.READ } },
      { id: 'cor-min', label: 'Meeting Minutes', route: '/app/correspondence/minutes', permission: { resource: 'letters', action: PermissionAction.READ } },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    children: [
      { id: 'adm-users', label: 'Users', route: '/app/admin/users', permission: { resource: 'admin.users', action: PermissionAction.READ } },
      { id: 'adm-backup', label: 'Backup & Restore', route: '/app/admin/backup', permission: { resource: 'admin.backup', action: PermissionAction.READ } },
      { id: 'adm-ye', label: 'Year-End', route: '/app/admin/year-end', permission: { resource: 'admin.yearEnd', action: PermissionAction.READ } },
      { id: 'adm-audit', label: 'Audit Log', route: '/app/admin/audit-log', permission: { resource: 'admin.audit', action: PermissionAction.READ } },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    children: [
      { id: 'rpt', label: 'Reports Hub', route: '/app/reports', permission: { resource: 'reports', action: PermissionAction.READ } },
      { id: 'rpt-b01', label: 'Bill Register — Regular', route: '/app/reports/RPT-B01', permission: { resource: 'reports', action: PermissionAction.READ } },
      { id: 'rpt-b02', label: 'Bill Register — Supplementary', route: '/app/reports/RPT-B02', permission: { resource: 'reports', action: PermissionAction.READ } },
      { id: 'rpt-b03', label: 'Member Ledger', route: '/app/reports/RPT-B03', permission: { resource: 'reports', action: PermissionAction.READ } },
      { id: 'rpt-b04', label: 'All Bills Summary', route: '/app/reports/RPT-B04', permission: { resource: 'reports', action: PermissionAction.READ } },
      { id: 'rpt-b05', label: 'Contribution Summary', route: '/app/reports/RPT-B05', permission: { resource: 'reports', action: PermissionAction.READ } },
      { id: 'rpt-b06', label: 'Tariffwise Settlement', route: '/app/reports/RPT-B06', permission: { resource: 'reports', action: PermissionAction.READ } },
      { id: 'rpt-b07', label: 'Outstanding Statement', route: '/app/reports/RPT-B07', permission: { resource: 'reports', action: PermissionAction.READ } },
      { id: 'rpt-b08', label: 'Reminder Letters', route: '/app/reports/RPT-B08', permission: { resource: 'reports', action: PermissionAction.READ } },
      { id: 'rpt-m01', label: 'Member Directory', route: '/app/reports/RPT-M01', permission: { resource: 'reports', action: PermissionAction.READ } },
      { id: 'rpt-m02', label: 'Member Profile', route: '/app/reports/RPT-M02', permission: { resource: 'reports', action: PermissionAction.READ } },
      { id: 'rpt-m03', label: 'Occupancy Report', route: '/app/reports/RPT-M03', permission: { resource: 'reports', action: PermissionAction.READ } },
      { id: 'rpt-m04', label: 'Parking Allocation', route: '/app/reports/RPT-M04', permission: { resource: 'reports', action: PermissionAction.READ } },
      { id: 'rpt-m05', label: 'I-Form Register', route: '/app/reports/RPT-M05', permission: { resource: 'reports', action: PermissionAction.READ } },
      { id: 'rpt-m06', label: 'Property Register', route: '/app/reports/RPT-M06', permission: { resource: 'reports', action: PermissionAction.READ } },
      { id: 'rpt-m07', label: 'FD Register', route: '/app/reports/RPT-M07', permission: { resource: 'reports', action: PermissionAction.READ } },
      { id: 'rpt-m08', label: 'Sinking Fund Register', route: '/app/reports/RPT-M08', permission: { resource: 'reports', action: PermissionAction.READ } },
    ],
  },
];

function ExplorerItemButton({ item }: { item: ExplorerItem }): React.ReactElement | null {
  const navigate = useNavigate();
  const openTab = useTabStore((state) => state.openTab);
  const allowed = usePermission(
    item.permission?.resource ?? '',
    item.permission?.action ?? PermissionAction.READ,
  );

  if (item.permission && !allowed) return null;

  return (
    <li>
      <button
        type="button"
        className="explorer-link"
        onClick={() => {
          openTab({ id: item.id, title: item.label, route: item.route });
          navigate(item.route);
        }}
      >
        {item.label}
      </button>
    </li>
  );
}

function ExplorerGroupBlock({ group }: { group: ExplorerGroup }): React.ReactElement | null {
  const childElements = group.children.map((item) => <ExplorerItemButton key={item.id} item={item} />);
  const hasVisible = childElements.some((child) => child !== null);
  if (!hasVisible) return null;

  return (
    <li>
      <span className="explorer-group">{group.label}</span>
      <ul>{childElements}</ul>
    </li>
  );
}

export function ExplorerTree(): React.ReactElement {
  return (
    <nav className="explorer-tree" aria-label="Explorer menu">
      <p className="explorer-title">Explorer</p>
      <ul>
        {explorerNodes.map((group) => (
          <ExplorerGroupBlock key={group.id} group={group} />
        ))}
      </ul>
      <NavLink to="/app/home" className="explorer-home-link">
        Dashboard
      </NavLink>
    </nav>
  );
}
