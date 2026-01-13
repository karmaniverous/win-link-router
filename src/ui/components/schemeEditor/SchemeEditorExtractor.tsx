/**
 * Requirements addressed:
 * - Scheme editor provides extractor editing.
 * - Extractor pattern input is a textarea (3 rows).
 * - Disabled schemes must block editing except re-enable; registered ⇒ enabled.
 */
import { Alert, Stack, Switch, Textarea, TextInput } from '@mantine/core';

import type { SchemeConfig } from '../../../core/config/appConfig';
import { getExtractorError } from './getExtractorError';

export function SchemeEditorExtractor(props: {
  scheme: SchemeConfig;
  readOnly: boolean;
  editingDisabled: boolean;
  onChangeScheme: (
    next: SchemeConfig,
    opts?: { ensureRegistration?: boolean },
  ) => void;
}) {
  const { scheme, readOnly, editingDisabled, onChangeScheme } = props;
  const extractorError = getExtractorError(scheme.extractor);

  return (
    <Stack gap="sm">
      <Switch
        label="Enabled"
        checked={scheme.enabled}
        disabled={readOnly}
        onChange={(e) => {
          const nextEnabled = e.currentTarget.checked;
          onChangeScheme(
            {
              ...scheme,
              enabled: nextEnabled,
              registered: nextEnabled ? scheme.registered : false,
            },
            { ensureRegistration: true },
          );
        }}
      />

      <Textarea
        label="Extractor pattern"
        rows={3}
        value={scheme.extractor.pattern}
        disabled={editingDisabled}
        onChange={(e) => {
          onChangeScheme({
            ...scheme,
            extractor: { ...scheme.extractor, pattern: e.currentTarget.value },
          });
        }}
      />

      <TextInput
        label="Extractor flags"
        value={scheme.extractor.flags ?? ''}
        disabled={editingDisabled}
        onChange={(e) => {
          onChangeScheme({
            ...scheme,
            extractor: { ...scheme.extractor, flags: e.currentTarget.value },
          });
        }}
      />

      {extractorError ? (
        <Alert color="red" title="Extractor error">
          {extractorError}
        </Alert>
      ) : null}
    </Stack>
  );
}
