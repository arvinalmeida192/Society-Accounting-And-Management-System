import { useState } from 'react';
import { SimpleInterestSubType } from '@sams/shared-types';
import { getIpcErrorMessage } from '../hooks/session';

interface InlineHelpPopoverProps {
  label: string;
  subType: SimpleInterestSubType;
}

export function InlineHelpPopover({ label, subType }: InlineHelpPopoverProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadHelp = async (): Promise<void> => {
    setError(null);
    const response = await window.sams.society.getInterestHelpText(subType);
    if (!response.success || !response.data) {
      setError(getIpcErrorMessage(response.error));
      return;
    }
    setTitle(response.data.title);
    setBody(response.data.body);
    setOpen(true);
  };

  return (
    <span className="inline-help">
      <button type="button" className="inline-help-trigger" onDoubleClick={() => void loadHelp()}>
        {label}
      </button>
      {open && (
        <div className="inline-help-popover" role="dialog">
          <strong>{title}</strong>
          <p>{body}</p>
          {error && <p className="form-error">{error}</p>}
          <button type="button" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      )}
    </span>
  );
}
