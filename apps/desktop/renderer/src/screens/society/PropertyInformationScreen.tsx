import { useEffect, useState } from 'react';
import { LandType, type PropertyInformationDto } from '@sams/shared-types';
import {
  AuditIdentityModal,
  FilterDrawer,
  MasterFormToolbar,
  MoneyInput,
  PrintPreviewModal,
} from '../../components';
import { useFormState } from '../../hooks/useFormState';
import { getIpcErrorMessage } from '../../hooks/session';

const emptyProperty = (): PropertyInformationDto => ({
  id: 'singleton',
  municipalHouseNo: null,
  surveySubDivisionNo: null,
  landType: null,
  annualLeaseRent: null,
  totalPlotAreaSqFt: null,
  constructedAreaSqFt: null,
  totalFlats: null,
  landCost: null,
  annualNonAgriAssessment: null,
  buildingParticulars: null,
  completionCertificateDetails: null,
  occupationCertificateDetails: null,
  occupationDate: null,
  municipalAssessmentYear: null,
  totalRateableValue: null,
  dateOfConveyance: null,
  remarks: null,
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

export function PropertyInformationScreen(): React.ReactElement {
  const form = useFormState(emptyProperty());
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  useEffect(() => {
    void window.sams.society.getPropertyInfo().then((response) => {
      if (response.success && response.data) {
        form.commit(response.data);
      } else {
        setError(getIpcErrorMessage(response.error));
      }
    });
  }, []);

  const save = async (): Promise<void> => {
    setError(null);
    const response = await window.sams.society.updatePropertyInfo(form.value);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    form.commit(response.data);
    setEditing(false);
  };

  const disabled = !editing;

  return (
    <section className="form-screen">
      <h2>Property Information</h2>
      <MasterFormToolbar
        disabled={{ save: !editing || !form.dirty, cancel: !editing, edit: editing }}
        onEdit={() => setEditing(true)}
        onSave={() => void save()}
        onCancel={() => {
          form.reset();
          setEditing(false);
        }}
        onFind={() => setFilterOpen(true)}
        onPrint={() => setPrintOpen(true)}
        onUserIdentity={() => setAuditOpen(true)}
      />

      <div className="form-grid">
        <label>
          Municipal House No.
          <input
            disabled={disabled}
            value={form.value.municipalHouseNo ?? ''}
            onChange={(event) =>
              form.setValue({ ...form.value, municipalHouseNo: event.target.value })
            }
          />
        </label>
        <label>
          Survey / Sub-Division No.
          <input
            disabled={disabled}
            value={form.value.surveySubDivisionNo ?? ''}
            onChange={(event) =>
              form.setValue({ ...form.value, surveySubDivisionNo: event.target.value })
            }
          />
        </label>
        <label>
          Land Type
          <select
            disabled={disabled}
            value={form.value.landType ?? ''}
            onChange={(event) =>
              form.setValue({
                ...form.value,
                landType: (event.target.value || null) as LandType | null,
              })
            }
          >
            <option value="">—</option>
            {Object.values(LandType).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <MoneyInput
          label="Total Plot Area (sq. ft.)"
          decimalPlaces={2}
          disabled={disabled}
          value={form.value.totalPlotAreaSqFt ?? 0}
          onChange={(value) => form.setValue({ ...form.value, totalPlotAreaSqFt: value })}
        />
        <MoneyInput
          label="Constructed Area (sq. ft.)"
          decimalPlaces={2}
          disabled={disabled}
          value={form.value.constructedAreaSqFt ?? 0}
          onChange={(value) => form.setValue({ ...form.value, constructedAreaSqFt: value })}
        />
        <label>
          Total Flats
          <input
            type="number"
            disabled={disabled}
            value={form.value.totalFlats ?? ''}
            onChange={(event) =>
              form.setValue({
                ...form.value,
                totalFlats: event.target.value ? Number(event.target.value) : null,
              })
            }
          />
        </label>
        <label>
          Municipal Assessment Year
          <input
            disabled={disabled}
            value={form.value.municipalAssessmentYear ?? ''}
            onChange={(event) =>
              form.setValue({ ...form.value, municipalAssessmentYear: event.target.value })
            }
          />
        </label>
        <label>
          Building Particulars
          <textarea
            disabled={disabled}
            value={form.value.buildingParticulars ?? ''}
            onChange={(event) =>
              form.setValue({ ...form.value, buildingParticulars: event.target.value })
            }
          />
        </label>
        <label>
          Remarks
          <textarea
            disabled={disabled}
            value={form.value.remarks ?? ''}
            onChange={(event) => form.setValue({ ...form.value, remarks: event.target.value })}
          />
        </label>
      </div>

      {error && <p className="form-error">{error}</p>}

      <AuditIdentityModal
        open={auditOpen}
        audit={form.value.createdAt ? form.value : null}
        onClose={() => setAuditOpen(false)}
      />
      <FilterDrawer open={filterOpen} onClose={() => setFilterOpen(false)} onApply={() => setFilterOpen(false)} />
      <PrintPreviewModal
        open={printOpen}
        title="Property Information"
        html="<p>Property information print preview</p>"
        onClose={() => setPrintOpen(false)}
        onPrint={() => setPrintOpen(false)}
      />
    </section>
  );
}
