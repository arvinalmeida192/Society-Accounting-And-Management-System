import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import type { SessionDto } from '@sams/shared-types';
import { ExplorerTree } from '../components/ExplorerTree';
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
  const setActiveTab = useTabStore((state) => state.setActiveTab);
  const toggleExplorer = useTabStore((state) => state.toggleExplorer);
  const { refreshSession } = useSession();

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
          <button type="button" onClick={toggleExplorer}>
            {explorerVisible ? 'Hide Explorer' : 'Show Explorer'}
          </button>
          <button type="button" onClick={() => void logout()}>
            Sign Out
          </button>
        </div>
      </header>

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
            <Route path="reports" element={<PlaceholderPane title="Reports" />} />
            <Route path="*" element={<Navigate to="home" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
