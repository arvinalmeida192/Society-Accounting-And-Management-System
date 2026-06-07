import { useEffect, useState } from 'react';
import { ReportType, type ReportFormatConfigDto, type ReportTemplateDto } from '@sams/shared-types';
import {
  AuditIdentityModal,
  FilterDrawer,
  MasterFormToolbar,
  PrintPreviewModal,
} from '../../components';
import { useFormState } from '../../hooks/useFormState';
import { getIpcErrorMessage } from '../../hooks/session';

const FORMAT_FIELDS: Array<{
  key: keyof ReportFormatConfigDto;
  label: string;
  reportType: ReportType;
}> = [
  { key: 'billFormatId', label: 'Regular Bill Format', reportType: ReportType.BILL_REGULAR },
  {
    key: 'supplementaryBillFormatId',
    label: 'Supplementary Bill Format',
    reportType: ReportType.BILL_SUPPLEMENTARY,
  },
  { key: 'receiptFormatId', label: 'Member Receipt Format', reportType: ReportType.RECEIPT_MEMBER },
  {
    key: 'generalReceiptFormatId',
    label: 'General Receipt Format',
    reportType: ReportType.RECEIPT_GENERAL,
  },
  { key: 'chequePrintFormatId', label: 'Cheque Print Format', reportType: ReportType.CHEQUE },
];

const emptyFormats = (): ReportFormatConfigDto => ({
  id: 'singleton',
  billFormatId: null,
  supplementaryBillFormatId: null,
  receiptFormatId: null,
  generalReceiptFormatId: null,
  chequePrintFormatId: null,
  createdAt: '',
  createdBy: '',
  updatedAt: '',
  updatedBy: '',
});

export function ReportFormatsScreen(): React.ReactElement {
  const form = useFormState(emptyFormats());
  const [templates, setTemplates] = useState<Record<string, ReportTemplateDto[]>>({});
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      const formats = await window.sams.society.getReportFormats();
      if (formats.success && formats.data) {
        form.commit(formats.data);
      } else {
        setError(getIpcErrorMessage(formats.error));
      }

      const loaded: Record<string, ReportTemplateDto[]> = {};
      for (const field of FORMAT_FIELDS) {
        const response = await window.sams.society.listReportTemplates(field.reportType);
        if (response.success && response.data) {
          loaded[field.reportType] = response.data;
        }
      }
      setTemplates(loaded);
    })();
  }, []);

  const save = async (): Promise<void> => {
    setError(null);
    const response = await window.sams.society.updateReportFormats(form.value);
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
      <h2>Report Formats</h2>
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

      <p className="muted">
        Format selection applies globally to all print and preview operations for each report type.
      </p>

      <div className="form-grid">
        {FORMAT_FIELDS.map((field) => (
          <label key={field.key}>
            {field.label}
            <select
              disabled={disabled}
              value={(form.value[field.key] as string | null) ?? ''}
              onChange={(event) =>
                form.setValue({
                  ...form.value,
                  [field.key]: event.target.value || null,
                })
              }
            >
              <option value="">— Select template —</option>
              {(templates[field.reportType] ?? []).map((template) => (
                <option key={template.id} value={template.id}>
                  {template.templateName} ({template.templateCode})
                </option>
              ))}
            </select>
          </label>
        ))}
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
        title="Report Formats"
        html="<p>Report format configuration preview</p>"
        onClose={() => setPrintOpen(false)}
        onPrint={() => setPrintOpen(false)}
      />
    </section>
  );
}
