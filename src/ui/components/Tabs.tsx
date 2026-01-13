/**
 * Requirements addressed:
 * - Main window provides separate tabs: Settings, Log, Test.
 * - Window chrome should be pinned; tabs are part of pinned chrome.
 */
export function Tabs<
  const TTabs extends readonly { id: string; label: string }[],
>(props: {
  tabs: TTabs;
  value: TTabs[number]['id'];
  onChange: (next: TTabs[number]['id']) => void;
}) {
  const { tabs, value, onChange } = props;

  return (
    <nav className="tabs" role="tablist" aria-label="Main tabs">
      {tabs.map((t) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => {
              onChange(t.id);
            }}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
