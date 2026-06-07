import { useCallback, useEffect, useState } from 'react';
import {
  AccountCategoryType,
  AccountNature,
  type AccountGroupDto,
  type AccountMasterDetailDto,
  type AccountMasterSaveDto,
  type AccountSubgroupDto,
  type CoaTreeNode,
} from '@sams/shared-types';
import {
  AuditIdentityModal,
  ConfirmDialog,
  MasterFormToolbar,
  MoneyInput,
} from '../../components';
import { useFormState } from '../../hooks/useFormState';
import { getIpcErrorMessage } from '../../hooks/session';

type SelectedNode =
  | { nodeType: 'GROUP'; id: string; categoryId: AccountCategoryType }
  | { nodeType: 'SUBGROUP'; id: string; groupId: string; categoryId: AccountCategoryType }
  | { nodeType: 'ACCOUNT'; id: string; subgroupId: string; categoryId: AccountCategoryType };

const emptyGroup = (categoryId: AccountCategoryType): AccountGroupDto => ({
  id: '',
  categoryId,
  groupName: '',
  balanceSheetSr: 10,
  nature: categoryId === AccountCategoryType.ASSET || categoryId === AccountCategoryType.EXPENSE
    ? AccountNature.DEBIT
    : AccountNature.CREDIT,
  substituteGroupName: null,
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

const emptySubgroup = (groupId: string): AccountSubgroupDto => ({
  id: '',
  groupId,
  subgroupName: '',
  subgroupSr: 10,
  substituteSubgroupName: null,
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

const emptyAccount = (subgroupId: string): AccountMasterSaveDto => ({
  subgroupId,
  particulars: '',
  openingBalanceDr: 0,
  openingBalanceCr: 0,
  previousYearAmount: 0,
  estimateAmount: 0,
  shortCode: null,
  serviceTaxApplicable: false,
  rebateApplicable: false,
  interestFree: false,
  pettyCash: false,
  isActive: true,
});

function CoaTreeList({
  nodes,
  selectedId,
  onSelect,
  depth = 0,
}: {
  nodes: CoaTreeNode[];
  selectedId: string | null;
  onSelect: (node: CoaTreeNode) => void;
  depth?: number;
}): React.ReactElement {
  return (
    <ul className="coa-tree-list" style={{ paddingLeft: depth ? '1rem' : 0 }}>
      {nodes.map((node) => (
        <li key={`${node.nodeType}-${node.id}`}>
          {node.nodeType === 'CATEGORY' ? (
            <>
              <span className="coa-tree-category">{node.label}</span>
              {node.children && (
                <CoaTreeList
                  nodes={node.children}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  depth={depth + 1}
                />
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                className={
                  selectedId === node.id ? 'coa-tree-node active' : 'coa-tree-node'
                }
                onClick={() => onSelect(node)}
              >
                {node.label}
                {node.pettyCash && <span className="coa-badge">Petty Cash</span>}
                {node.isActive === false && <span className="coa-badge muted">Inactive</span>}
              </button>
              {node.children && node.children.length > 0 && (
                <CoaTreeList
                  nodes={node.children}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  depth={depth + 1}
                />
              )}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ChartOfAccountsScreen(): React.ReactElement {
  const [tree, setTree] = useState<CoaTreeNode[]>([]);
  const [selected, setSelected] = useState<SelectedNode | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  const groupForm = useFormState(emptyGroup(AccountCategoryType.ASSET));
  const subgroupForm = useFormState(emptySubgroup(''));
  const accountForm = useFormState(emptyAccount(''));
  const [accountDetail, setAccountDetail] = useState<AccountMasterDetailDto | null>(null);

  const loadTree = useCallback(async (): Promise<void> => {
    const response = await window.sams.coa.getTree(true);
    if (response.success && response.data) {
      setTree(response.data);
    } else {
      setError(getIpcErrorMessage(response.error));
    }
  }, []);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  const loadSelection = async (node: SelectedNode): Promise<void> => {
    setError(null);
    setMessage(null);
    setEditing(false);

    if (node.nodeType === 'GROUP') {
      const response = await window.sams.coa.listGroups(node.categoryId);
      const record = response.data?.find((item) => item.id === node.id);
      if (record) {
        groupForm.commit(record);
      }
      return;
    }

    if (node.nodeType === 'SUBGROUP') {
      const response = await window.sams.coa.listSubgroups(node.groupId);
      const record = response.data?.find((item) => item.id === node.id);
      if (record) {
        subgroupForm.commit(record);
      }
      return;
    }

    const response = await window.sams.coa.getAccount(node.id);
    if (response.success && response.data) {
      setAccountDetail(response.data);
      accountForm.commit({
        id: response.data.id,
        subgroupId: response.data.subgroupId,
        particulars: response.data.particulars,
        openingBalanceDr: response.data.openingBalanceDr,
        openingBalanceCr: response.data.openingBalanceCr,
        previousYearAmount: response.data.previousYearAmount,
        estimateAmount: response.data.estimateAmount,
        shortCode: response.data.shortCode,
        serviceTaxApplicable: response.data.serviceTaxApplicable,
        rebateApplicable: response.data.rebateApplicable,
        interestFree: response.data.interestFree,
        pettyCash: response.data.pettyCash,
        isActive: response.data.isActive,
      });
    } else {
      setError(getIpcErrorMessage(response.error));
    }
  };

  const handleSelect = (node: CoaTreeNode): void => {
    if (node.nodeType === 'CATEGORY' || !node.categoryId) {
      return;
    }

    let next: SelectedNode;
    if (node.nodeType === 'GROUP') {
      next = { nodeType: 'GROUP', id: node.id, categoryId: node.categoryId };
    } else if (node.nodeType === 'SUBGROUP' && node.groupId) {
      next = {
        nodeType: 'SUBGROUP',
        id: node.id,
        groupId: node.groupId,
        categoryId: node.categoryId,
      };
    } else if (node.nodeType === 'ACCOUNT' && node.subgroupId) {
      next = {
        nodeType: 'ACCOUNT',
        id: node.id,
        subgroupId: node.subgroupId,
        categoryId: node.categoryId,
      };
    } else {
      return;
    }

    setSelected(next);
    void loadSelection(next);
  };

  const addGroup = (): void => {
    const categoryId = selected?.categoryId ?? AccountCategoryType.ASSET;
    setSelected({ nodeType: 'GROUP', id: '', categoryId });
    groupForm.commit(emptyGroup(categoryId));
    setEditing(true);
  };

  const addSubgroup = (): void => {
    if (!selected || (selected.nodeType !== 'GROUP' && selected.nodeType !== 'SUBGROUP')) {
      setError('Select a group first to add a subgroup.');
      return;
    }
    const groupId = selected.nodeType === 'GROUP' ? selected.id : selected.groupId;
    setSelected({
      nodeType: 'SUBGROUP',
      id: '',
      groupId,
      categoryId: selected.categoryId,
    });
    subgroupForm.commit(emptySubgroup(groupId));
    setEditing(true);
  };

  const addAccount = (): void => {
    if (!selected || (selected.nodeType !== 'SUBGROUP' && selected.nodeType !== 'ACCOUNT')) {
      setError('Select a subgroup first to add a ledger account.');
      return;
    }
    const subgroupId = selected.nodeType === 'SUBGROUP' ? selected.id : selected.subgroupId;
    setSelected({
      nodeType: 'ACCOUNT',
      id: '',
      subgroupId,
      categoryId: selected.categoryId,
    });
    setAccountDetail(null);
    accountForm.commit(emptyAccount(subgroupId));
    setEditing(true);
  };

  const save = async (): Promise<void> => {
    if (!selected) return;
    setError(null);

    if (selected.nodeType === 'GROUP') {
      const response = await window.sams.coa.saveGroup(groupForm.value);
      if (!response.success || !response.data) {
        setError(getIpcErrorMessage(response.error));
        return;
      }
      groupForm.commit(response.data);
      setSelected({ nodeType: 'GROUP', id: response.data.id, categoryId: response.data.categoryId });
    } else if (selected.nodeType === 'SUBGROUP') {
      const response = await window.sams.coa.saveSubgroup(subgroupForm.value);
      if (!response.success || !response.data) {
        setError(getIpcErrorMessage(response.error));
        return;
      }
      subgroupForm.commit(response.data);
      setSelected({
        nodeType: 'SUBGROUP',
        id: response.data.id,
        groupId: response.data.groupId,
        categoryId: selected.categoryId,
      });
    } else {
      const response = await window.sams.coa.saveAccount(accountForm.value);
      if (!response.success || !response.data) {
        setError(getIpcErrorMessage(response.error));
        return;
      }
      setSelected({
        nodeType: 'ACCOUNT',
        id: response.data.id,
        subgroupId: response.data.subgroupId,
        categoryId: selected.categoryId,
      });
      await loadSelection({
        nodeType: 'ACCOUNT',
        id: response.data.id,
        subgroupId: response.data.subgroupId,
        categoryId: selected.categoryId,
      });
    }

    setEditing(false);
    setMessage('Saved successfully.');
    await loadTree();
  };

  const archive = async (): Promise<void> => {
    if (!selected || selected.nodeType !== 'ACCOUNT' || !selected.id) {
      return;
    }
    const response = await window.sams.coa.archiveAccount(selected.id);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    if (!response.data.archived) {
      setError(response.data.blockReason ?? 'Account could not be archived.');
      return;
    }
    setMessage('Account archived.');
    setConfirmArchive(false);
    setSelected(null);
    await loadTree();
  };

  const disabled = !editing;
  const isBalanceSheet =
    selected &&
    (selected.categoryId === AccountCategoryType.ASSET ||
      selected.categoryId === AccountCategoryType.LIABILITY);
  const isIncomeExpense =
    selected &&
    (selected.categoryId === AccountCategoryType.INCOME ||
      selected.categoryId === AccountCategoryType.EXPENSE);

  return (
    <section className="form-screen coa-screen">
      <h2>Chart of Accounts</h2>
      <div className="coa-toolbar">
        <button type="button" onClick={addGroup}>
          Add Group
        </button>
        <button type="button" onClick={addSubgroup}>
          Add Subgroup
        </button>
        <button type="button" onClick={addAccount}>
          Add Ledger
        </button>
      </div>

      <div className="coa-layout">
        <aside className="coa-tree-panel">
          <CoaTreeList
            nodes={tree}
            selectedId={selected?.id ?? null}
            onSelect={handleSelect}
          />
        </aside>

        <div className="coa-detail-panel">
          {!selected && <p className="muted">Select a group, subgroup, or ledger from the tree.</p>}

          {selected?.nodeType === 'GROUP' && (
            <>
              <MasterFormToolbar
                disabled={{ save: !editing || !groupForm.dirty, cancel: !editing, edit: editing }}
                onEdit={() => setEditing(true)}
                onSave={() => void save()}
                onCancel={() => {
                  if (selected.id) {
                    void loadSelection(selected);
                  }
                  setEditing(false);
                }}
                onUserIdentity={() => setAuditOpen(true)}
              />
              <div className="form-grid">
                <label>
                  Category
                  <select
                    disabled={disabled || Boolean(selected.id)}
                    value={groupForm.value.categoryId}
                    onChange={(event) =>
                      groupForm.setValue({
                        ...groupForm.value,
                        categoryId: event.target.value as AccountCategoryType,
                      })
                    }
                  >
                    {Object.values(AccountCategoryType).map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Group Name
                  <input
                    disabled={disabled}
                    value={groupForm.value.groupName}
                    onChange={(event) =>
                      groupForm.setValue({ ...groupForm.value, groupName: event.target.value })
                    }
                  />
                </label>
                <label>
                  Balance Sheet Sr.
                  <input
                    type="number"
                    disabled={disabled}
                    value={groupForm.value.balanceSheetSr}
                    onChange={(event) =>
                      groupForm.setValue({
                        ...groupForm.value,
                        balanceSheetSr: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Nature
                  <select
                    disabled={disabled}
                    value={groupForm.value.nature}
                    onChange={(event) =>
                      groupForm.setValue({
                        ...groupForm.value,
                        nature: event.target.value as AccountNature,
                      })
                    }
                  >
                    {Object.values(AccountNature).map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Substitute Group Name
                  <input
                    disabled={disabled}
                    value={groupForm.value.substituteGroupName ?? ''}
                    onChange={(event) =>
                      groupForm.setValue({
                        ...groupForm.value,
                        substituteGroupName: event.target.value || null,
                      })
                    }
                  />
                </label>
              </div>
            </>
          )}

          {selected?.nodeType === 'SUBGROUP' && (
            <>
              <MasterFormToolbar
                disabled={{
                  save: !editing || !subgroupForm.dirty,
                  cancel: !editing,
                  edit: editing,
                }}
                onEdit={() => setEditing(true)}
                onSave={() => void save()}
                onCancel={() => {
                  if (selected.id) {
                    void loadSelection(selected);
                  }
                  setEditing(false);
                }}
                onUserIdentity={() => setAuditOpen(true)}
              />
              <div className="form-grid">
                <label>
                  Subgroup Name
                  <input
                    disabled={disabled}
                    value={subgroupForm.value.subgroupName}
                    onChange={(event) =>
                      subgroupForm.setValue({
                        ...subgroupForm.value,
                        subgroupName: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Subgroup Sr.
                  <input
                    type="number"
                    disabled={disabled}
                    value={subgroupForm.value.subgroupSr}
                    onChange={(event) =>
                      subgroupForm.setValue({
                        ...subgroupForm.value,
                        subgroupSr: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Substitute Subgroup Name
                  <input
                    disabled={disabled}
                    value={subgroupForm.value.substituteSubgroupName ?? ''}
                    onChange={(event) =>
                      subgroupForm.setValue({
                        ...subgroupForm.value,
                        substituteSubgroupName: event.target.value || null,
                      })
                    }
                  />
                </label>
              </div>
            </>
          )}

          {selected?.nodeType === 'ACCOUNT' && (
            <>
              <MasterFormToolbar
                disabled={{
                  save: !editing || !accountForm.dirty,
                  cancel: !editing,
                  edit: editing || !selected.id,
                  delete: !selected.id,
                }}
                onEdit={() => setEditing(true)}
                onSave={() => void save()}
                onCancel={() => {
                  if (selected.id) {
                    void loadSelection(selected);
                  }
                  setEditing(false);
                }}
                onDelete={() => setConfirmArchive(true)}
                onUserIdentity={() => setAuditOpen(true)}
              />
              {accountDetail && (
                <p className="form-info">
                  {accountDetail.categoryName} → {accountDetail.groupName} →{' '}
                  {accountDetail.subgroupName}
                </p>
              )}
              <div className="form-grid">
                <label>
                  Particulars
                  <input
                    disabled={disabled}
                    value={accountForm.value.particulars}
                    onChange={(event) =>
                      accountForm.setValue({
                        ...accountForm.value,
                        particulars: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Short Code (4 chars)
                  <input
                    disabled={disabled}
                    maxLength={4}
                    value={accountForm.value.shortCode ?? ''}
                    onChange={(event) =>
                      accountForm.setValue({
                        ...accountForm.value,
                        shortCode: event.target.value.toUpperCase() || null,
                      })
                    }
                  />
                </label>
                {isBalanceSheet && (
                  <>
                    <MoneyInput
                      label="Opening Balance Dr"
                      decimalPlaces={2}
                      disabled={disabled}
                      value={accountForm.value.openingBalanceDr}
                      onChange={(value) =>
                        accountForm.setValue({ ...accountForm.value, openingBalanceDr: value })
                      }
                    />
                    <MoneyInput
                      label="Opening Balance Cr"
                      decimalPlaces={2}
                      disabled={disabled}
                      value={accountForm.value.openingBalanceCr}
                      onChange={(value) =>
                        accountForm.setValue({ ...accountForm.value, openingBalanceCr: value })
                      }
                    />
                  </>
                )}
                {isIncomeExpense && (
                  <>
                    <MoneyInput
                      label="Previous Year Amount"
                      decimalPlaces={2}
                      disabled={disabled}
                      value={accountForm.value.previousYearAmount}
                      onChange={(value) =>
                        accountForm.setValue({
                          ...accountForm.value,
                          previousYearAmount: value,
                        })
                      }
                    />
                    <MoneyInput
                      label="Estimate Amount"
                      decimalPlaces={2}
                      disabled={disabled}
                      value={accountForm.value.estimateAmount}
                      onChange={(value) =>
                        accountForm.setValue({ ...accountForm.value, estimateAmount: value })
                      }
                    />
                  </>
                )}
                {accountDetail && (
                  <>
                    <MoneyInput
                      label="Closing Balance Dr"
                      decimalPlaces={2}
                      disabled
                      value={accountDetail.closingBalanceDr}
                      onChange={() => undefined}
                    />
                    <MoneyInput
                      label="Closing Balance Cr"
                      decimalPlaces={2}
                      disabled
                      value={accountDetail.closingBalanceCr}
                      onChange={() => undefined}
                    />
                  </>
                )}
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={accountForm.value.serviceTaxApplicable}
                    onChange={(event) =>
                      accountForm.setValue({
                        ...accountForm.value,
                        serviceTaxApplicable: event.target.checked,
                      })
                    }
                  />
                  Service Tax Applicable
                </label>
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={accountForm.value.rebateApplicable}
                    onChange={(event) =>
                      accountForm.setValue({
                        ...accountForm.value,
                        rebateApplicable: event.target.checked,
                      })
                    }
                  />
                  Rebate Applicable
                </label>
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={accountForm.value.interestFree}
                    onChange={(event) =>
                      accountForm.setValue({
                        ...accountForm.value,
                        interestFree: event.target.checked,
                      })
                    }
                  />
                  Interest Free
                </label>
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={accountForm.value.pettyCash}
                    onChange={(event) =>
                      accountForm.setValue({
                        ...accountForm.value,
                        pettyCash: event.target.checked,
                      })
                    }
                  />
                  Petty Cash
                </label>
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={accountForm.value.isActive}
                    onChange={(event) =>
                      accountForm.setValue({
                        ...accountForm.value,
                        isActive: event.target.checked,
                      })
                    }
                  />
                  Active
                </label>
              </div>
            </>
          )}
        </div>
      </div>

      {message && <p className="form-info">{message}</p>}
      {error && <p className="form-error">{error}</p>}

      <ConfirmDialog
        open={confirmArchive}
        title="Archive Account"
        message="Archive this ledger account? It will be hidden from pickers and marked inactive."
        confirmLabel="Archive"
        onConfirm={() => void archive()}
        onCancel={() => setConfirmArchive(false)}
      />

      <AuditIdentityModal
        open={auditOpen}
        audit={
          selected?.nodeType === 'GROUP'
            ? groupForm.value.createdAt
              ? groupForm.value
              : null
            : selected?.nodeType === 'SUBGROUP'
              ? subgroupForm.value.createdAt
                ? subgroupForm.value
                : null
              : accountDetail
        }
        onClose={() => setAuditOpen(false)}
      />
    </section>
  );
}
