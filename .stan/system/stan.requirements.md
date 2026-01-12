# stan.requirements.md

Durable project requirements (desired end-state).

## Scope & goals

- The app is a Windows desktop application that routes protocol URIs (e.g.
  `tel:`) to other protocol handlers/URLs based on user configuration.
- The app must be safe and predictable:
  - No crashes on malformed input.
  - No silent misconfiguration when routing fails.
- The routing logic must be target-agnostic and scheme-agnostic:
  - The app must not hard-code payload extraction rules for specific schemes
    like TEL.
  - Extraction and transformation are defined in configuration and presets.

## Protocol handling and process model

- The app must register as a protocol handler on Windows and receive URIs passed
  by the OS as command-line arguments.
- The app must be single-instance:
  - If a second instance is started with a URI, it forwards the URI to the
    already-running instance and exits.
- Normal launch (no URI argument):
  - Opens the main window.
- Protocol launch (with URI argument):
  - Routes the URI without showing the window by default.
  - If routing fails (see error handling), the app opens the main window and
    surfaces the error.
- The app must support background operation via tray and “run at login”:
  - App can run in the tray without a visible window.
  - “Run at login” is configurable per user.

## Registration and default handler rules (Windows)

- The app must support per-user protocol registration (no admin required):
  - Write registration under HKCU so the app appears as a candidate handler in
    Windows Default Apps for configured protocols.
- The app must not programmatically set itself as the default handler for a
  protocol (Windows UserChoice hashing prevents reliable/legitimate writes).
- The app must provide a shortcut to open Windows Default Apps settings so the
  user can assign the app as default for a protocol.
- The app must detect and display default-handler status per protocol:
  - Status must be robust and based on reading Windows registry state.
  - If the default cannot be determined reliably, the app must report
    “Unknown”, not guess.
- On startup and when the UI is opened, the app must compare:
  - user-configured protocols that are enabled, vs
  - the current Windows default handler for those protocols,
  and prompt/warn the user when Windows is not pointing those protocols at this
  app.

## Routing configuration model

### Scheme configuration

- Configuration is organized per protocol scheme:
  - Scheme comparison is case-insensitive; storage is canonicalized (e.g.
    uppercase, without trailing colon).
- Each scheme configuration contains:
  - Exactly one regex extractor definition (`pattern` + `flags`).
  - An ordered list of templates (fallback order).
  - Enable/disable flags at least at the template level.

### Extractor (single regex per scheme)

- For an incoming URI, the app must apply the configured extractor regex to the
  full original URI string.
- The extractor must use named capture groups to produce tag values.
- Regex flags are configurable, but the app must reject global matching (`g`)
  to avoid stateful/non-deterministic behavior; extraction uses the first match.
- Extractor failure:
  - If the extractor does not match, routing is considered failed due to
    configuration/input mismatch and the app must open the UI with diagnostics
    (see Error handling & feedback).

### Templates (Handlebars)

- Templates are Handlebars strings rendered using the extracted capture groups.
- Templates are evaluated in configured order; only enabled templates
  participate in routing attempts.
- Template rendering context must include:
  - Top-level keys for each named capture group (spread to the root context).
  - `uri`: the full original incoming URI string.
  - `match`: a debug object that includes at least `groups` for advanced
    templates (e.g. `match.groups.number` is acceptable).
  - The context must NOT include a `groups` convenience object (i.e. `groups.*`
    is not a supported access path).
- The app must provide a small set of generic Handlebars helpers to support
  target-agnostic transformations. Minimum helpers:
  - `digits(value)`: strip non-digits; throws if input is missing/empty or
    output is empty.
  - `trim(value)`: trims; throws if input is missing.
  - `lower(value)` / `upper(value)`: throws if input is missing.
  - `urlEncode(value)`: throws if input is missing.
  - Optional generic `replace(value, pattern, replacement)` if needed.
- Missing data and render failures must be detectable:
  - Handlebars rendering must run in strict mode (or equivalent), so missing
    variables can be treated as errors.
- Template render failure is a configuration error:
  - If a template fails to render or produces an invalid/empty target, routing
    fails immediately and the UI must open with diagnostics (no fallback to the
    next template; see Routing semantics).

## Routing semantics

- Input scheme detection:
  - Determine scheme from the URI argument (before the first `:`) in a
    case-insensitive manner.
  - Use the scheme to select the scheme configuration.
- Routing attempt sequence:
  - Apply extractor once to build the template context.
  - Evaluate enabled templates in configured order:
    - Render the template.
    - If render fails: stop routing, open UI with diagnostics.
    - Attempt to open the rendered target via OS (Electron `shell.openExternal`)
      and:
      - If open throws: try next enabled template (best-effort fallback).
      - If open does not throw: consider routing successful and stop.
- If there are no enabled templates for the scheme, routing fails and the UI
  must open with an actionable error.

## UI requirements

- The main window must provide:
  - List of configured schemes.
  - For selected scheme: extractor editor, template list editor.
  - Template list features: add/edit/remove, enable/disable, reorder.
  - Indicators:
    - Whether the app is registered as a candidate handler for the scheme.
    - Whether the app is the current Windows default handler (“Default”,
      “Not default”, or “Unknown”).
  - Controls to open Windows Default Apps for the user to set the default.
- The UI must autosave configuration changes without an explicit Save action.

### Test UI (debugging / validation)

- Each scheme UI must include a test input field:
  - User can paste a URI to evaluate.
  - The app auto-runs evaluation on debounce (no explicit Run button).
- The test output must show:
  - Extracted capture groups (and/or match metadata).
  - For each template in order:
    - rendered target URL (or a render error describing missing data/helper
      failure).
- When routing fails due to extractor/template/config issues or due to
  exhausting openExternal attempts:
  - The app must open/focus the main window.
  - It must navigate/select the relevant scheme.
  - It must prefill the test input with the failing URI.
  - It must present an error banner with actionable diagnostics.

## Presets

- The app must ship with built-in presets stored in a JSON file bundled with
  the app (read-only at runtime).
- Preset entries must use the same schema shape as user scheme configurations.
- The app must provide a WhatsApp preset for TEL as an initial preset:
  - Extractor and templates must be target-agnostic and rely on helpers (e.g.
    `digits`) rather than hard-coded TEL logic.
  - Desktop-first with optional web fallback templates is acceptable.
- The UI must allow:
  - Adding a scheme from a preset.
  - Resetting a scheme to its preset (destructive; requires confirmation).
- User scheme configs should store “derived from preset” metadata so reset is
  possible (e.g., store a `presetId` reference).

## Configuration storage and portability

- Configuration storage is per-user by default.
- Storage format must be JSON.
- Config and presets must record version information derived from the app
  package version (for traceability), and must also support schema migration.
- The app must validate loaded configuration:
  - On malformed/unreadable config: fall back to a safe default and notify the
    user.
- Import/export:
  - User can export config to a JSON file.
  - Exported files are portable and must not encode per-user settings (e.g.
    run-at-login or a machine-specific shared-config path).
  - User can import config from a JSON file (with validation and clear error
    feedback). Import replaces schemes/templates but preserves the current
    user’s per-user settings.
- Shared config file mode:
  - User may opt into using a shared JSON config file path instead of the local
    per-user config file.
  - When enabled, the shared file is the single source of truth.
  - If the shared file is missing/unreadable/unwritable, the UI must clearly
    report the error and become read-only until fixed (no silent fallback).

## Logging

- The app must maintain a minimal routing log for debugging:
  - Timestamp, incoming URI, scheme, extracted groups (redacted if needed),
    attempted targets, and result.
  - By default, persisted logs must avoid storing sensitive payloads:
    - Do not persist raw incoming URIs.
    - Do not persist fully rendered target URLs (which may include payloads).
    - Persist only scheme-level information (e.g. `tel:[redacted]`,
      `whatsapp:[redacted]`) plus template ids/labels and error/result metadata.
  - A full log viewer is optional, but the UI must surface relevant diagnostics
    on routing failures (via the test panel and error banner).
