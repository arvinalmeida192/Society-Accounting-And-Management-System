import { useCallback, useState } from 'react';

export function useFormState<T>(initialValue: T): {
  value: T;
  saved: T;
  dirty: boolean;
  setValue: React.Dispatch<React.SetStateAction<T>>;
  patch: (partial: Partial<T>) => void;
  reset: (next?: T) => void;
  commit: (next?: T) => void;
} {
  const [value, setValue] = useState(initialValue);
  const [saved, setSaved] = useState(initialValue);

  const reset = useCallback(
    (next?: T) => {
      const target = next ?? saved;
      setValue(target);
      setSaved(target);
    },
    [saved],
  );

  const commit = useCallback(
    (next?: T) => {
      const target = next ?? value;
      setValue(target);
      setSaved(target);
    },
    [value],
  );

  const patch = useCallback((partial: Partial<T>) => {
    setValue((current) => ({ ...current, ...partial }));
  }, []);

  return {
    value,
    saved,
    dirty: JSON.stringify(value) !== JSON.stringify(saved),
    setValue,
    patch,
    reset,
    commit,
  };
}
