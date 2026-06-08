import { useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import type { SessionDto } from '@sams/shared-types';
import { PermissionAction } from '@sams/shared-types';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ExplorerTree } from '../components/ExplorerTree';
import { PermissionGate } from '../components/PermissionGate';
import { usePermission } from '../hooks/usePermission';
import { useTabStore } from '../store/tabStore';
import { useSession } from '../hooks/SessionContext';

interface MainShellProps {
  session: SessionDto;
}

function HomePane({ session }: { session: SessionDto }): React.ReactElement {
  return (
    <section className="home-pane">
      <h2>Welcome to SAMS</h2>
      <p>
        Signed in as <strong>{session.displayName ?? session.username}</strong> (
        {session.role}) for <strong>{session.societyName}</strong>, financial year{' '}
        <strong>{session.fyLabel}</strong>.
      </p>
      <p className="muted">
        Society setup is under Explorer → Society Setup. Chart of Accounts is under Explorer →
        Accounting. Buildings, wings, units, and parking are under Explorer → Property. Members and
        tenants are under Explorer → Members. Tariff configuration is under Explorer → Billing.
        Banks, narrations, and other supporting masters are under Explorer → Masters.
      </p>
    </section>
  );
}

import { ChartOfAccountsScreen } from './accounting/ChartOfAccountsScreen';
import { BuildingsScreen } from './property/BuildingsScreen';
import { ParkingAssignmentsScreen } from './property/ParkingAssignmentsScreen';
import { ParkingSpacesScreen } from './property/ParkingSpacesScreen';
import { ParkingTariffsScreen } from './property/ParkingTariffsScreen';
import { ReferenceMastersScreen } from './property/ReferenceMastersScreen';
import { UnitsScreen } from './property/UnitsScreen';
import { WingsScreen } from './property/WingsScreen';
import { MembersRegisterScreen } from './members/MembersRegisterScreen';
import { TenantsScreen } from './members/TenantsScreen';
import { MemberImportScreen } from './members/MemberImportScreen';
import { AddressBookScreen } from './masters/AddressBookScreen';
import { BanksScreen } from './masters/BanksScreen';
import { ChequeReasonsScreen } from './masters/ChequeReasonsScreen';
import { ContractorsScreen } from './masters/ContractorsScreen';
import { NarrationsScreen } from './masters/NarrationsScreen';
import { SocietyIdentityScreen } from './society/SocietyIdentityScreen';
import { SocietyParametersScreen } from './society/SocietyParametersScreen';
import { PropertyInformationScreen } from './society/PropertyInformationScreen';
import { ReportFormatsScreen } from './society/ReportFormatsScreen';
import { BillRegisterMappingScreen } from './tariff/BillRegisterMappingScreen';
import { SettlementSequenceScreen } from './tariff/SettlementSequenceScreen';
import { TariffDefinitionScreen } from './tariff/TariffDefinitionScreen';
import { BulkRegularBillsScreen } from './billing/BulkRegularBillsScreen';
import { RegularBillScreen } from './billing/RegularBillScreen';
import { SupplementaryBillScreen } from './billing/SupplementaryBillScreen';
import { VoucherEntryScreen } from './transactions/VoucherEntryScreen';
import { PettyCashScreen } from './transactions/PettyCashScreen';
import { AdjustmentVoucherScreen } from './transactions/AdjustmentVoucherScreen';
import { BankReconciliationScreen } from './transactions/BankReconciliationScreen';
import { FdRegisterScreen } from './statutory/FdRegisterScreen';
import { PropertyRegisterScreen } from './statutory/PropertyRegisterScreen';
import { SinkingFundRegisterScreen } from './statutory/SinkingFundRegisterScreen';
import { IFormRegisterScreen } from './statutory/IFormRegisterScreen';
import { TdsRecordScreen } from './tds/TdsRecordScreen';
import { Form16AScreen } from './tds/Form16AScreen';
import { ReminderLettersScreen } from './correspondence/ReminderLettersScreen';
import { GeneralLettersScreen } from './correspondence/GeneralLettersScreen';
import { CommitteeMembersScreen } from './correspondence/CommitteeMembersScreen';
import { MeetingMinutesScreen } from './correspondence/MeetingMinutesScreen';
import { UsersScreen } from './admin/UsersScreen';
import { BackupRestoreScreen } from './admin/BackupRestoreScreen';
import { YearEndScreen } from './admin/YearEndScreen';
import { AuditLogScreen } from './admin/AuditLogScreen';
import { ReportsHubScreen } from './reports/ReportsHubScreen';
import { ReportViewerScreen } from './reports/ReportViewerScreen';

function PlaceholderPane({ title }: { title: string }): React.ReactElement {
  return (
    <section className="placeholder-pane">
      <h2>{title}</h2>
      <p>This screen is scheduled for a later implementation phase.</p>
    </section>
  );
}

export function MainShell({ session }: MainShellProps): React.ReactElement {
  const navigate = useNavigate();
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const explorerVisible = useTabStore((state) => state.explorerVisible);
  const closeTab = useTabStore((state) => state.closeTab);
  const openTab = useTabStore((state) => state.openTab);
  const setActiveTab = useTabStore((state) => state.setActiveTab);
  const toggleExplorer = useTabStore((state) => state.toggleExplorer);
  const { refreshSession } = useSession();
  const canOpenNewYear = usePermission('startup', PermissionAction.CREATE);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  const selectTab = (tab: (typeof tabs)[number]): void => {
    setActiveTab(tab.id);
    navigate(tab.route);
  };

  const logout = async (): Promise<void> => {
    await window.sams.auth.logout();
    await refreshSession();
    navigate('/login');
  };

  useEffect(() => {
    const unsubscribe = window.sams.onNavigate((route) => {
      const title = route.split('/').pop() ?? 'Report';
      openTab({ id: route, title, route });
      navigate(route);
    });
    return unsubscribe;
  }, [navigate, openTab]);

  return (
    <div className="main-shell">
      <header className="main-header">
        <div>
          <h1>{session.societyName}</h1>
          <p>
            FY {session.fyLabel} · {session.displayName ?? session.username} ({session.role})
          </p>
        </div>
        <div className="main-header-actions">
          {canOpenNewYear && (
            <button type="button" onClick={() => navigate('/startup/new-year')}>
              Open New FY
            </button>
          )}
          <button type="button" onClick={toggleExplorer}>
            {explorerVisible ? 'Hide Explorer' : 'Show Explorer'}
          </button>
          <button type="button" onClick={() => void logout()}>
            Sign Out
          </button>
        </div>
      </header>

      {session.isReadOnly && (
        <div className="form-error" role="status" style={{ margin: '0 1rem' }}>
          Financial year is closed (read-only). Posting and edits are disabled until the year is reopened or a new financial year is opened.
        </div>
      )}

      <div className="tab-bar">
        {tabs.map((tab) => (
          <div key={tab.id} className={tab.id === activeTab?.id ? 'tab active' : 'tab'}>
            <button type="button" onClick={() => selectTab(tab)}>
              {tab.title}
            </button>
            {tab.id !== 'home' && (
              <button
                type="button"
                className="tab-close"
                aria-label={`Close ${tab.title}`}
                onClick={() => closeTab(tab.id)}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="main-body">
        {explorerVisible && (
          <aside className="sidebar">
            <ExplorerTree />
          </aside>
        )}

        <main className="main-content">
          <ErrorBoundary>
          <Routes>
            <Route path="home" element={<HomePane session={session} />} />
            <Route path="setup/identity" element={<SocietyIdentityScreen />} />
            <Route path="setup/parameters" element={<SocietyParametersScreen />} />
            <Route path="setup/property" element={<PropertyInformationScreen />} />
            <Route path="setup/report-formats" element={<ReportFormatsScreen />} />
            <Route path="accounting/chart-of-accounts" element={<ChartOfAccountsScreen />} />
            <Route path="property/buildings" element={<BuildingsScreen />} />
            <Route path="property/wings" element={<WingsScreen />} />
            <Route path="property/reference-masters" element={<ReferenceMastersScreen />} />
            <Route path="property/units" element={<UnitsScreen />} />
            <Route path="property/parking-tariffs" element={<ParkingTariffsScreen />} />
            <Route path="property/parking-spaces" element={<ParkingSpacesScreen />} />
            <Route path="property/parking-assignments" element={<ParkingAssignmentsScreen />} />
            <Route path="members/register" element={<MembersRegisterScreen />} />
            <Route path="members/tenants" element={<TenantsScreen />} />
            <Route path="members/import" element={<MemberImportScreen />} />
            <Route path="masters/banks" element={<BanksScreen />} />
            <Route path="masters/narrations" element={<NarrationsScreen />} />
            <Route path="masters/address-book" element={<AddressBookScreen />} />
            <Route path="masters/cheque-reasons" element={<ChequeReasonsScreen />} />
            <Route path="masters/contractors" element={<ContractorsScreen />} />
            <Route path="billing/tariffs" element={<TariffDefinitionScreen />} />
            <Route path="billing/settlement-sequence" element={<SettlementSequenceScreen />} />
            <Route path="billing/bill-register-mapping" element={<BillRegisterMappingScreen />} />
            <Route path="billing/regular/bulk" element={<BulkRegularBillsScreen />} />
            <Route path="billing/regular" element={<RegularBillScreen />} />
            <Route path="billing/supplementary" element={<SupplementaryBillScreen />} />
            <Route path="transactions/voucher" element={<VoucherEntryScreen />} />
            <Route path="transactions/petty-cash" element={<PettyCashScreen />} />
            <Route path="transactions/adjustments" element={<AdjustmentVoucherScreen />} />
            <Route path="transactions/bank-reconciliation" element={<BankReconciliationScreen />} />
            <Route path="statutory/fd" element={<FdRegisterScreen />} />
            <Route path="statutory/property" element={<PropertyRegisterScreen />} />
            <Route path="statutory/sinking-fund" element={<SinkingFundRegisterScreen />} />
            <Route path="statutory/iform" element={<IFormRegisterScreen />} />
            <Route path="tds/records" element={<TdsRecordScreen />} />
            <Route path="tds/form16a" element={<Form16AScreen />} />
            <Route path="correspondence/reminders" element={<ReminderLettersScreen />} />
            <Route path="correspondence/letters" element={<GeneralLettersScreen />} />
            <Route path="correspondence/committee" element={<CommitteeMembersScreen />} />
            <Route path="correspondence/minutes" element={<MeetingMinutesScreen />} />
            <Route path="admin/users" element={<PermissionGate resource="admin.users" action={PermissionAction.READ}><UsersScreen /></PermissionGate>} />
            <Route path="admin/backup" element={<PermissionGate resource="admin.backup" action={PermissionAction.READ}><BackupRestoreScreen /></PermissionGate>} />
            <Route path="admin/year-end" element={<PermissionGate resource="admin.yearEnd" action={PermissionAction.READ}><YearEndScreen /></PermissionGate>} />
            <Route path="admin/audit-log" element={<PermissionGate resource="admin.audit" action={PermissionAction.READ}><AuditLogScreen /></PermissionGate>} />
            <Route path="reports" element={<PermissionGate resource="reports" action={PermissionAction.READ}><ReportsHubScreen /></PermissionGate>} />
            <Route path="reports/:reportId" element={<PermissionGate resource="reports" action={PermissionAction.READ}><ReportViewerScreen /></PermissionGate>} />
            <Route path="*" element={<Navigate to="home" replace />} />
          </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
