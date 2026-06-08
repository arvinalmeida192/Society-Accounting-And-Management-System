import { useEffect, useId, useState } from 'react';

export interface MoneyInputProps {
  label?: string;
  value?: number | null;
  decimalPlaces?: 0 | 2;
  onChange?: (value: number) => void;
  disabled?: boolean;
}

function safeNumber(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function MoneyInput({
  label = '',
  value,
  decimalPlaces = 2,
  onChange,
  disabled = false,
}: MoneyInputProps): React.ReactElement {
  const id = useId();
  const numericValue = safeNumber(value);
  const [text, setText] = useState(numericValue.toFixed(decimalPlaces));

  useEffect(() => {
    setText(numericValue.toFixed(decimalPlaces));
  }, [numericValue, decimalPlaces]);

  const input = (
    <input
      id={id}
      type="number"
      step={decimalPlaces === 0 ? '1' : '0.01'}
      min="0"
      disabled={disabled}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        const parsed = Number.parseFloat(event.target.value);
        onChange?.(Number.isNaN(parsed) ? 0 : parsed);
      }}
      onBlur={() => setText(numericValue.toFixed(decimalPlaces))}
    />
  );

  if (!label) {
    return input;
  }

  return (
    <label htmlFor={id} className="field-label">
      {label}
      {input}
    </label>
  );
}
