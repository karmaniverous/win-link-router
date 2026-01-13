/**
 * Requirements addressed:
 * - Scheme editor provides extractor editing.
 * - Extractor pattern input is a textarea (3 rows).
 */
import type { SchemeConfig } from '../../../core/config/appConfig';
import { getExtractorError } from './getExtractorError';

export function SchemeEditorExtractor(props: {
  scheme: SchemeConfig;
  readOnly: boolean;
  onChangeScheme: (
    next: SchemeConfig,
    opts?: { ensureRegistration?: boolean },
  ) => void;
}) {
  const { scheme, readOnly, onChangeScheme } = props;
  const extractorError = getExtractorError(scheme.extractor);

  return (
    <>
      <label className="field">
        <span>Enabled</span>
        <input
          type="checkbox"
          checked={scheme.enabled}
          disabled={readOnly}
          onChange={(e) => {
            onChangeScheme(
              { ...scheme, enabled: e.target.checked },
              { ensureRegistration: true },
            );
          }}
        />
      </label>

      <h3>Extractor</h3>
      <label className="field">
        <span>Pattern</span>
        <textarea
          rows={3}
          value={scheme.extractor.pattern}
          disabled={readOnly}
          onChange={(e) => {
            onChangeScheme({
              ...scheme,
              extractor: { ...scheme.extractor, pattern: e.target.value },
            });
          }}
        />
      </label>
      <label className="field">
        <span>Flags</span>
        <input
          value={scheme.extractor.flags ?? ''}
          disabled={readOnly}
          onChange={(e) => {
            onChangeScheme({
              ...scheme,
              extractor: { ...scheme.extractor, flags: e.target.value },
            });
          }}
        />
      </label>
      {extractorError ? <p className="error">{extractorError}</p> : null}
    </>
  );
}
