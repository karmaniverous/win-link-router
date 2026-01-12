/**
 * Requirements addressed:
 * - Provide a clear loading indicator while async content is loading.
 */
export function Spinner(props: { label?: string }) {
  const label = props.label ?? 'Loading…';
  return (
    <div className="spinner" role="status" aria-label={label}>
      <span className="spinnerIcon" aria-hidden="true" />
      <span className="muted">{label}</span>
    </div>
  );
}
