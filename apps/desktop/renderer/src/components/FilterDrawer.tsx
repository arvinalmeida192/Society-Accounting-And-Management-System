/** SDD §4.1, NF-016 — filter drawer stub */
export interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  onApply: (query: string) => void;
  initialQuery?: string;
}

export function FilterDrawer({
  open,
  onClose,
  onApply,
  initialQuery = '',
}: FilterDrawerProps): React.ReactElement | null {
  if (!open) {
    return null;
  }

  return (
    <div className="overlay" role="dialog" aria-label="Find and filter">
      <div className="drawer">
        <h2>Find</h2>
        <input
          type="search"
          defaultValue={initialQuery}
          placeholder="Partial match…"
          id="filter-query"
        />
        <div className="drawer-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('filter-query') as HTMLInputElement | null;
              onApply(el?.value ?? '');
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
