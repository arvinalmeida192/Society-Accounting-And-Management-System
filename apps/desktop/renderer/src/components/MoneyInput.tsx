import { useId, useState } from 'react';

export interface MoneyInputProps {
  label: string;
  value: number;
  decimalPlaces?: 0 | 2;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function MoneyInput({
  label,
  value,
  decimalPlaces = 2,
  onChange,
  disabled = false,
}: MoneyInputProps): React.ReactElement {
  const id = useId();
  const [text, setText] = useState(value.toFixed(decimalPlaces));

  return (
    <label htmlFor={id} className="field-label">
      {label}
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
          onChange(Number.isNaN(parsed) ? 0 : parsed);
        }}
        onBlur={() => setText(value.toFixed(decimalPlaces))}
      />
    </label>
  );
}
