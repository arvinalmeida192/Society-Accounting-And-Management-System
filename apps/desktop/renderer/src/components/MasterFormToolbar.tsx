/** SDD §4.1, §29.2 — standard master form toolbar stub */
export interface MasterFormToolbarProps {
  onAdd?: () => void;
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onFind?: () => void;
  onBrowse?: () => void;
  onPrint?: () => void;
  onFirst?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onLast?: () => void;
  onUserIdentity?: () => void;
  onExit?: () => void;
  disabled?: Partial<Record<'add' | 'edit' | 'save' | 'cancel' | 'delete' | 'print', boolean>>;
}

export function MasterFormToolbar(props: MasterFormToolbarProps): React.ReactElement {
  const d = props.disabled ?? {};
  return (
    <div className="master-toolbar" role="toolbar" aria-label="Form actions">
      <button type="button" disabled={d.add} onClick={props.onAdd}>Add</button>
      <button type="button" disabled={d.edit} onClick={props.onEdit}>Edit</button>
      <button type="button" disabled={d.save} onClick={props.onSave}>Save</button>
      <button type="button" disabled={d.cancel} onClick={props.onCancel}>Cancel</button>
      <button type="button" disabled={d.delete} onClick={props.onDelete}>Delete</button>
      <button type="button" onClick={props.onFind}>Find</button>
      <button type="button" onClick={props.onBrowse}>Browse</button>
      <button type="button" disabled={d.print} onClick={props.onPrint}>Print</button>
      <span className="toolbar-spacer" />
      <button type="button" onClick={props.onFirst}>First</button>
      <button type="button" onClick={props.onPrevious}>Prev</button>
      <button type="button" onClick={props.onNext}>Next</button>
      <button type="button" onClick={props.onLast}>Last</button>
      <button type="button" onClick={props.onUserIdentity}>User Identity</button>
      <button type="button" onClick={props.onExit}>Exit</button>
    </div>
  );
}
