import { NavLink, useNavigate } from 'react-router-dom';
import { useTabStore } from '../store/tabStore';

const explorerNodes = [
  {
    id: 'society',
    label: 'Society Setup',
    children: [
      { id: 'soc-identity', label: 'Identity', route: '/app/setup/identity' },
      { id: 'soc-params', label: 'Parameters', route: '/app/setup/parameters' },
      { id: 'soc-property', label: 'Property', route: '/app/setup/property' },
      { id: 'soc-formats', label: 'Report Formats', route: '/app/setup/report-formats' },
    ],
  },
  {
    id: 'accounting',
    label: 'Accounting',
    children: [
      { id: 'coa', label: 'Chart of Accounts', route: '/app/accounting/chart-of-accounts' },
    ],
  },
  {
    id: 'property',
    label: 'Property',
    children: [
      { id: 'bld', label: 'Buildings', route: '/app/property/buildings' },
      { id: 'wing', label: 'Wings', route: '/app/property/wings' },
      { id: 'ref-masters', label: 'Reference Masters', route: '/app/property/reference-masters' },
      { id: 'units', label: 'Units', route: '/app/property/units' },
      { id: 'park-tariff', label: 'Parking Tariffs', route: '/app/property/parking-tariffs' },
      { id: 'park-space', label: 'Parking Spaces', route: '/app/property/parking-spaces' },
      { id: 'park-assign', label: 'Parking Assignments', route: '/app/property/parking-assignments' },
    ],
  },
  {
    id: 'masters',
    label: 'Masters',
    children: [
      { id: 'mst-bank', label: 'Banks', route: '/app/masters/banks' },
      { id: 'mst-narr', label: 'Narrations', route: '/app/masters/narrations' },
      { id: 'mst-addr', label: 'Address Book', route: '/app/masters/address-book' },
      { id: 'mst-chq', label: 'Cheque Reasons', route: '/app/masters/cheque-reasons' },
      { id: 'mst-cont', label: 'Contractors', route: '/app/masters/contractors' },
    ],
  },
  {
    id: 'members',
    label: 'Members',
    children: [
      { id: 'mem-reg', label: 'Member Register', route: '/app/members/register' },
      { id: 'mem-tenant', label: 'Tenants', route: '/app/members/tenants' },
    ],
  },
  {
    id: 'transactions',
    label: 'Transactions',
    children: [
      { id: 'vch-entry', label: 'Receipt / Payment / Contra', route: '/app/transactions/voucher' },
      { id: 'vch-petty', label: 'Petty Cash', route: '/app/transactions/petty-cash' },
      { id: 'vch-adj', label: 'JV / DN / CN', route: '/app/transactions/adjustments' },
      { id: 'bnk-rec', label: 'Bank Reconciliation', route: '/app/transactions/bank-reconciliation' },
    ],
  },
  {
    id: 'billing',
    label: 'Billing',
    children: [
      { id: 'tar-def', label: 'Tariff Definition', route: '/app/billing/tariffs' },
      { id: 'tar-settle', label: 'Settlement Sequence', route: '/app/billing/settlement-sequence' },
      { id: 'tar-map', label: 'Bill Register Mapping', route: '/app/billing/bill-register-mapping' },
      { id: 'bil-reg', label: 'Regular Bill', route: '/app/billing/regular' },
      { id: 'bil-bulk', label: 'Bulk Regular Bills', route: '/app/billing/regular/bulk' },
      { id: 'bil-supp', label: 'Supplementary Bill', route: '/app/billing/supplementary' },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    children: [{ id: 'rpt', label: 'Reports Hub', route: '/app/reports' }],
  },
];

export function ExplorerTree(): React.ReactElement {
  const navigate = useNavigate();
  const openTab = useTabStore((state) => state.openTab);

  return (
    <nav className="explorer-tree" aria-label="Explorer menu">
      <p className="explorer-title">Explorer</p>
      <ul>
        {explorerNodes.map((group) => (
          <li key={group.id}>
            <span className="explorer-group">{group.label}</span>
            <ul>
              {group.children.map((item) => (
                <li key={item.id}>
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
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <NavLink to="/app/home" className="explorer-home-link">
        Dashboard
      </NavLink>
    </nav>
  );
}
