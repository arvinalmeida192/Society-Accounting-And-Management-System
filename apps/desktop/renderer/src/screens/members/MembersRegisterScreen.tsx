import { useCallback, useEffect, useState } from 'react';
import {
  MemberGender,
  MaritalStatus,
  OpeningBalanceType,
  type BuildingDto,
  type MemberDependentDto,
  type MemberFullDto,
  type MemberHousingLoanDto,
  type MemberListItemDto,
  type MemberNomineeDto,
  type MemberShareDto,
  type MemberVehicleDto,
  type UnitDto,
  type WingDto,
} from '@sams/shared-types';
import {
  AuditIdentityModal,
  ConfirmDialog,
  MasterFormToolbar,
  MoneyInput,
  OpeningBalanceModal,
} from '../../components';
import { getIpcErrorMessage } from '../../hooks/session';

type MemberTab = 'identification' | 'personal' | 'address' | 'subtables' | 'opening' | 'parking';

const emptyDependent = (): MemberDependentDto => ({
  id: '',
  memberId: '',
  name: '',
  relation: null,
  occupation: null,
  age: null,
  gender: null,
  dateOfBirth: null,
  idCardNo: null,
  bloodGroup: null,
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

export function MembersRegisterScreen(): React.ReactElement {
  const [items, setItems] = useState<MemberListItemDto[]>([]);
  const [member, setMember] = useState<MemberFullDto | null>(null);
  const [buildings, setBuildings] = useState<BuildingDto[]>([]);
  const [wings, setWings] = useState<WingDto[]>([]);
  const [units, setUnits] = useState<UnitDto[]>([]);
  const [filter, setFilter] = useState('');
  const [tab, setTab] = useState<MemberTab>('identification');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [confirmDispose, setConfirmDispose] = useState(false);
  const [obModalOpen, setObModalOpen] = useState(false);
  const [dependents, setDependents] = useState<MemberDependentDto[]>([]);
  const [nominees, setNominees] = useState<MemberNomineeDto[]>([]);
  const [vehicles, setVehicles] = useState<MemberVehicleDto[]>([]);
  const [shares, setShares] = useState<MemberShareDto[]>([]);
  const [housingLoans, setHousingLoans] = useState<MemberHousingLoanDto[]>([]);

  const loadList = useCallback(async (): Promise<void> => {
    const response = await window.sams.member.list({ filter: filter || undefined, status: 'all' });
    if (response.success && response.data) {
      setItems(response.data.items);
    }
  }, [filter]);

  const loadMasters = useCallback(async (): Promise<void> => {
    const buildingRes = await window.sams.property.listBuildings();
    if (buildingRes.success && buildingRes.data) {
      setBuildings(buildingRes.data.items);
    }
  }, []);

  const loadMember = async (id: string): Promise<void> => {
    const response = await window.sams.member.get(id);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    const data = response.data;
    setMember(data);
    setDependents(data.dependents);
    setNominees(data.nominees);
    setVehicles(data.vehicles);
    setShares(data.shares);
    setHousingLoans(data.housingLoans);
    setEditing(false);
    setError(null);

    const wingRes = await window.sams.property.listWings(data.buildingId);
    if (wingRes.success && wingRes.data) setWings(wingRes.data);

    const unitRes = await window.sams.property.listUnits(data.buildingId, data.wingId);
    if (unitRes.success && unitRes.data) setUnits(unitRes.data.items);
  };

  useEffect(() => {
    void loadList();
    void loadMasters();
  }, [loadList, loadMasters]);

  const addNew = (): void => {
    setMember({
      id: '',
      unitId: units[0]?.id ?? '',
      title: 'Mr',
      memberName: '',
      tenantOccupancy: false,
      tenantOccupancyEffectiveFrom: null,
      generateRegularBills: true,
      generateSupplementaryBills: true,
      chargeInterest: true,
      disposedAt: null,
      disposeReason: null,
      photographPath: null,
      gender: null,
      dateOfBirth: null,
      qualification: null,
      religion: null,
      occupation: null,
      panNo: null,
      bloodGroup: null,
      maritalStatus: null,
      anniversaryType: null,
      anniversaryDate: null,
      unitPurchaseDate: null,
      dateOfSale: null,
      associateMember: null,
      jointMember: null,
      votingRightsMember: null,
      memberBankName: null,
      memberBankBranch: null,
      totalFamilyMembers: null,
      memberClass: null,
      clubMembershipDeposit: null,
      address: null,
      residencePhone: null,
      officePhone: null,
      emailPrimary: null,
      emailSecondary: null,
      fax: null,
      subsidiaryLedgerAccountId: null,
      buildingId: buildings[0]?.id ?? '',
      wingId: wings[0]?.id ?? '',
      unitNo: '',
      buildingShortName: buildings[0]?.shortName ?? '',
      wingShortName: wings[0]?.shortName ?? '',
      dependents: [],
      nominees: [],
      vehicles: [],
      shares: [],
      housingLoans: [],
      openingBalances: [],
      parkingAssignments: [],
      createdAt: '',
      createdBy: '',
      updatedAt: '',
      updatedBy: '',
    });
    setDependents([]);
    setNominees([]);
    setVehicles([]);
    setShares([]);
    setHousingLoans([]);
    setEditing(true);
    setTab('identification');
  };

  const saveCurrentTab = async (): Promise<void> => {
    if (!member) return;
    setError(null);
    setMessage(null);

    if (tab === 'identification') {
      const response = await window.sams.member.saveIdentification({
        id: member.id || undefined,
        unitId: member.unitId,
        title: member.title,
        memberName: member.memberName,
        tenantOccupancy: member.tenantOccupancy,
        tenantOccupancyEffectiveFrom: member.tenantOccupancyEffectiveFrom,
        generateRegularBills: member.generateRegularBills,
        generateSupplementaryBills: member.generateSupplementaryBills,
        chargeInterest: member.chargeInterest,
        unitPurchaseDate: member.unitPurchaseDate,
      });
      if (!response.success || !response.data) {
        setError(getIpcErrorMessage(response.error));
        return;
      }
      await loadMember(response.data.id);
      setMessage('Identification saved.');
      setEditing(false);
      await loadList();
      return;
    }

    if (!member.id) {
      setError('Save identification first.');
      return;
    }

    if (tab === 'personal') {
      const response = await window.sams.member.savePersonal({
        id: member.id,
        gender: member.gender,
        dateOfBirth: member.dateOfBirth,
        qualification: member.qualification,
        religion: member.religion,
        occupation: member.occupation,
        panNo: member.panNo,
        bloodGroup: member.bloodGroup,
        maritalStatus: member.maritalStatus,
        anniversaryType: member.anniversaryType,
        anniversaryDate: member.anniversaryDate,
        associateMember: member.associateMember,
        jointMember: member.jointMember,
        votingRightsMember: member.votingRightsMember,
        memberBankName: member.memberBankName,
        memberBankBranch: member.memberBankBranch,
        totalFamilyMembers: member.totalFamilyMembers,
        memberClass: member.memberClass,
        clubMembershipDeposit: member.clubMembershipDeposit,
        photographPath: member.photographPath,
      });
      if (!response.success) {
        setError(getIpcErrorMessage(response.error));
        return;
      }
      setMessage('Personal information saved.');
    } else if (tab === 'address') {
      const response = await window.sams.member.saveAddress({
        id: member.id,
        address: member.address,
        residencePhone: member.residencePhone,
        officePhone: member.officePhone,
        emailPrimary: member.emailPrimary,
        emailSecondary: member.emailSecondary,
        fax: member.fax,
      });
      if (!response.success) {
        setError(getIpcErrorMessage(response.error));
        return;
      }
      setMessage('Address saved.');
    } else if (tab === 'subtables') {
      await Promise.all([
        window.sams.member.saveDependents(member.id, dependents),
        window.sams.member.saveNominees(member.id, nominees),
        window.sams.member.saveVehicles(member.id, vehicles),
        window.sams.member.saveShares(member.id, shares),
        window.sams.member.saveHousingLoans(member.id, housingLoans),
      ]);
      setMessage('Sub-tables saved.');
    }

    await loadMember(member.id);
    setEditing(false);
  };

  const dispose = async (): Promise<void> => {
    if (!member?.id) return;
    setConfirmDispose(false);
    const response = await window.sams.member.dispose(
      member.id,
      new Date().toISOString(),
      'Disposed from member register',
    );
    if (!response.success) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setMessage('Member disposed. Unit marked vacant.');
    await loadMember(member.id);
    await loadList();
  };

  const onBuildingChange = async (buildingId: string): Promise<void> => {
    if (!member) return;
    const wingRes = await window.sams.property.listWings(buildingId);
    const nextWings = wingRes.success && wingRes.data ? wingRes.data : [];
    setWings(nextWings);
    const wingId = nextWings[0]?.id ?? '';
    const unitRes = await window.sams.property.listUnits(buildingId, wingId || undefined);
    const nextUnits = unitRes.success && unitRes.data ? unitRes.data.items : [];
    setUnits(nextUnits);
    setMember({
      ...member,
      buildingId,
      wingId,
      unitId: nextUnits[0]?.id ?? '',
      buildingShortName: buildings.find((b) => b.id === buildingId)?.shortName ?? '',
      wingShortName: nextWings[0]?.shortName ?? '',
      unitNo: nextUnits[0]?.unitNo ?? '',
    });
  };

  const disabled = !editing || Boolean(member?.disposedAt);
  const tabs: Array<{ id: MemberTab; label: string }> = [
    { id: 'identification', label: 'Identification' },
    { id: 'personal', label: 'Personal' },
    { id: 'address', label: 'Address' },
    { id: 'subtables', label: 'Dependents & More' },
    { id: 'opening', label: 'Opening Balance' },
    { id: 'parking', label: 'Parking' },
  ];

  return (
    <section className="form-screen master-browse-screen">
      <h2>Member Register</h2>
      <MasterFormToolbar
        disabled={{ save: !editing, cancel: !editing }}
        onAdd={addNew}
        onEdit={() => setEditing(true)}
        onSave={() => void saveCurrentTab()}
        onCancel={() => {
          if (member?.id) void loadMember(member.id);
          setEditing(false);
        }}
        onBrowse={() => void loadList()}
        onDelete={member?.id && !member.disposedAt ? () => setConfirmDispose(true) : undefined}
        onUserIdentity={() => setAuditOpen(true)}
      />

      <div className="master-browse-layout">
        <aside className="master-browse-list">
          <input
            placeholder="Search members…"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={member?.id === item.id ? 'active' : undefined}
                  onClick={() => void loadMember(item.id)}
                >
                  <strong>{item.memberName}</strong>
                  <span>
                    {item.buildingShortName}-{item.wingShortName}-{item.unitNo}
                    {item.disposedAt ? ' (disposed)' : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="master-browse-form">
          {!member ? (
            <p className="muted">Select a member or click Add to create one.</p>
          ) : (
            <>
              <div className="tab-bar inline-tabs">
                {tabs.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={tab === item.id ? 'tab active' : 'tab'}
                    onClick={() => setTab(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {tab === 'identification' && (
                <div className="form-grid">
                  <label>
                    Building
                    <select
                      disabled={disabled}
                      value={member.buildingId}
                      onChange={(event) => void onBuildingChange(event.target.value)}
                    >
                      {buildings.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.shortName} — {b.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Wing
                    <select
                      disabled={disabled}
                      value={member.wingId}
                      onChange={async (event) => {
                        const wingId = event.target.value;
                        const unitRes = await window.sams.property.listUnits(member.buildingId, wingId);
                        const nextUnits = unitRes.success && unitRes.data ? unitRes.data.items : [];
                        setUnits(nextUnits);
                        setMember({
                          ...member,
                          wingId,
                          unitId: nextUnits[0]?.id ?? '',
                          wingShortName: wings.find((w) => w.id === wingId)?.shortName ?? '',
                          unitNo: nextUnits[0]?.unitNo ?? '',
                        });
                      }}
                    >
                      {wings.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.shortName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Unit *
                    <select
                      disabled={disabled}
                      value={member.unitId}
                      onChange={(event) => {
                        const unit = units.find((u) => u.id === event.target.value);
                        setMember({
                          ...member,
                          unitId: event.target.value,
                          unitNo: unit?.unitNo ?? '',
                        });
                      }}
                    >
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.unitNo}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Title
                    <input
                      disabled={disabled}
                      value={member.title ?? ''}
                      onChange={(event) => setMember({ ...member, title: event.target.value })}
                    />
                  </label>
                  <label>
                    Member Name *
                    <input
                      disabled={disabled}
                      value={member.memberName}
                      onChange={(event) => setMember({ ...member, memberName: event.target.value })}
                    />
                  </label>
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={member.tenantOccupancy}
                      onChange={(event) =>
                        setMember({ ...member, tenantOccupancy: event.target.checked })
                      }
                    />
                    Tenant Occupancy (NOC billing)
                  </label>
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={member.generateRegularBills}
                      onChange={(event) =>
                        setMember({ ...member, generateRegularBills: event.target.checked })
                      }
                    />
                    Generate Regular Bills
                  </label>
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={member.generateSupplementaryBills}
                      onChange={(event) =>
                        setMember({ ...member, generateSupplementaryBills: event.target.checked })
                      }
                    />
                    Generate Supplementary Bills
                  </label>
                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={member.chargeInterest}
                      onChange={(event) =>
                        setMember({ ...member, chargeInterest: event.target.checked })
                      }
                    />
                    Charge Interest
                  </label>
                  <label>
                    Member Class
                    <input
                      disabled={disabled}
                      value={member.memberClass ?? ''}
                      onChange={(event) => setMember({ ...member, memberClass: event.target.value })}
                    />
                  </label>
                  {member.disposedAt && (
                    <p className="form-error">Disposed on {member.disposedAt.slice(0, 10)}</p>
                  )}
                </div>
              )}

              {tab === 'personal' && (
                <div className="form-grid">
                  <label>
                    Gender
                    <select
                      disabled={disabled}
                      value={member.gender ?? ''}
                      onChange={(event) =>
                        setMember({
                          ...member,
                          gender: (event.target.value || null) as MemberGender | null,
                        })
                      }
                    >
                      <option value="">—</option>
                      {Object.values(MemberGender).map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Date of Birth
                    <input
                      type="date"
                      disabled={disabled}
                      value={member.dateOfBirth?.slice(0, 10) ?? ''}
                      onChange={(event) =>
                        setMember({
                          ...member,
                          dateOfBirth: event.target.value || null,
                        })
                      }
                    />
                  </label>
                  <label>
                    PAN
                    <input
                      disabled={disabled}
                      value={member.panNo ?? ''}
                      onChange={(event) => setMember({ ...member, panNo: event.target.value })}
                    />
                  </label>
                  <label>
                    Occupation
                    <input
                      disabled={disabled}
                      value={member.occupation ?? ''}
                      onChange={(event) => setMember({ ...member, occupation: event.target.value })}
                    />
                  </label>
                  <MoneyInput
                    label="Club Membership Deposit"
                    disabled={disabled}
                    value={member.clubMembershipDeposit ?? 0}
                    onChange={(value) => setMember({ ...member, clubMembershipDeposit: value })}
                  />
                  <label>
                    Photo
                    <button
                      type="button"
                      disabled={!member.id || disabled}
                      onClick={() => void window.sams.member.uploadPhoto(member.id)}
                    >
                      Upload Photo
                    </button>
                    {member.photographPath && <span className="muted"> {member.photographPath}</span>}
                  </label>
                </div>
              )}

              {tab === 'address' && (
                <div className="form-grid">
                  <label className="full-width">
                    Address
                    <textarea
                      disabled={disabled}
                      rows={3}
                      value={member.address ?? ''}
                      onChange={(event) => setMember({ ...member, address: event.target.value })}
                    />
                  </label>
                  <label>
                    Residence Phone
                    <input
                      disabled={disabled}
                      value={member.residencePhone ?? ''}
                      onChange={(event) =>
                        setMember({ ...member, residencePhone: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Email
                    <input
                      disabled={disabled}
                      value={member.emailPrimary ?? ''}
                      onChange={(event) =>
                        setMember({ ...member, emailPrimary: event.target.value })
                      }
                    />
                  </label>
                </div>
              )}

              {tab === 'subtables' && (
                <div className="form-section">
                  <h3>Dependents</h3>
                  {dependents.map((row, index) => (
                    <div key={row.id || index} className="form-grid inline-row">
                      <input
                        disabled={disabled}
                        placeholder="Name"
                        value={row.name}
                        onChange={(event) => {
                          const next = [...dependents];
                          next[index] = { ...row, name: event.target.value };
                          setDependents(next);
                        }}
                      />
                      <input
                        disabled={disabled}
                        placeholder="Relation"
                        value={row.relation ?? ''}
                        onChange={(event) => {
                          const next = [...dependents];
                          next[index] = { ...row, relation: event.target.value };
                          setDependents(next);
                        }}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setDependents([...dependents, emptyDependent()])}
                  >
                    Add Dependent
                  </button>
                </div>
              )}

              {tab === 'opening' && (
                <div className="form-section">
                  <p className="muted">
                    Regular and supplementary opening balances post balanced journal vouchers on save.
                  </p>
                  <ul>
                    {member.openingBalances.map((ob) => (
                      <li key={ob.id}>
                        {ob.balanceType}: Principal ₹{ob.principalOB.toFixed(2)}, Interest ₹
                        {ob.interestOB.toFixed(2)}
                        {ob.balanceType === OpeningBalanceType.REGULAR &&
                          `, ST ₹${ob.serviceTaxOB.toFixed(2)}`}
                        {ob.ledgerVoucherId ? ' (posted)' : ''}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    disabled={!member.id}
                    onClick={() => setObModalOpen(true)}
                  >
                    Enter Opening Balance…
                  </button>
                </div>
              )}

              {tab === 'parking' && (
                <div className="form-section">
                  <ul>
                    {member.parkingAssignments.map((row) => (
                      <li key={row.id}>
                        {row.parkingNo ?? row.parkingSpaceId} — from{' '}
                        {row.purchaseDate.slice(0, 10)}
                        {row.disposeDate ? ` to ${row.disposeDate.slice(0, 10)}` : ''}
                      </li>
                    ))}
                  </ul>
                  <p className="muted">Assign parking from Parking Assignments or add here in a future pass.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-error">{error}</p>}

      <ConfirmDialog
        open={confirmDispose}
        title="Dispose member?"
        message="This archives the member and marks the unit vacant. Continue?"
        onCancel={() => setConfirmDispose(false)}
        onConfirm={() => void dispose()}
      />

      {member && (
        <OpeningBalanceModal
          open={obModalOpen}
          memberId={member.id}
          memberName={member.memberName}
          existing={member.openingBalances}
          onClose={() => setObModalOpen(false)}
          onSaved={() => void loadMember(member.id)}
        />
      )}

      <AuditIdentityModal
        open={auditOpen}
        audit={
          member
            ? {
                createdAt: member.createdAt,
                createdBy: member.createdBy,
                updatedAt: member.updatedAt,
                updatedBy: member.updatedBy,
              }
            : null
        }
        onClose={() => setAuditOpen(false)}
      />
    </section>
  );
}
