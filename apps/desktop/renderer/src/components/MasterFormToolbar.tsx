import { useMemo } from 'react';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

/** SDD §4.1, §29.2 — standard master form toolbar */
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
  shortcutsEnabled?: boolean;
}

export function MasterFormToolbar(props: MasterFormToolbarProps): React.ReactElement {
  const d = props.disabled ?? {};
  const shortcuts = useMemo(
    () => ({
      'ctrl+n': () => props.onAdd?.(),
      'ctrl+e': () => props.onEdit?.(),
      'ctrl+s': () => props.onSave?.(),
      'ctrl+f': () => props.onFind?.(),
      'ctrl+b': () => props.onBrowse?.(),
      'ctrl+p': () => props.onPrint?.(),
      'ctrl+home': () => props.onFirst?.(),
      'ctrl+end': () => props.onLast?.(),
      'ctrl+arrowleft': () => props.onPrevious?.(),
      'ctrl+arrowright': () => props.onNext?.(),
    }),
    [props],
  );

  useKeyboardShortcuts(shortcuts, props.shortcutsEnabled !== false);

  return (
    <div className="master-toolbar" role="toolbar" aria-label="Form actions">
      <button type="button" disabled={d.add} onClick={props.onAdd}>
        Add
      </button>
      <button type="button" disabled={d.edit} onClick={props.onEdit}>
        Edit
      </button>
      <button type="button" disabled={d.save} onClick={props.onSave}>
        Save
      </button>
      <button type="button" disabled={d.cancel} onClick={props.onCancel}>
        Cancel
      </button>
      <button type="button" disabled={d.delete} onClick={props.onDelete}>
        Delete
      </button>
      <button type="button" onClick={props.onFind}>
        Find
      </button>
      <button type="button" onClick={props.onBrowse}>
        Browse
      </button>
      <button type="button" disabled={d.print} onClick={props.onPrint}>
        Print
      </button>
      <span className="toolbar-spacer" />
      <button type="button" onClick={props.onFirst}>
        First
      </button>
      <button type="button" onClick={props.onPrevious}>
        Prev
      </button>
      <button type="button" onClick={props.onNext}>
        Next
      </button>
      <button type="button" onClick={props.onLast}>
        Last
      </button>
      <button type="button" onClick={props.onUserIdentity}>
        User Identity
      </button>
      <button type="button" onClick={props.onExit}>
        Exit
      </button>
    </div>
  );
}
