# stan.requirements.md

Durable project requirements (desired end-state).

## Scope & goals

- The app is a Windows desktop application that routes protocol URIs (e.g. `tel:`) to other protocol handlers/URLs based on user configuration.
- Supported OS: Windows only.
  - The app does not implement or preserve macOS-specific lifecycle behavior (e.g., staying resident after all windows are closed, or `app.activate` window recreation).
- The app must be safe and predictable:
  - No crashes on malformed input.
  - No silent misconfiguration when routing fails.
- The routing logic must be target-agnostic and scheme-agnostic:
  - The app must not hard-code payload extraction rules for specific schemes like TEL.
  - Extraction and transformation are defined in configuration and presets.
- Branding:
  - Define `APP_TITLE` and `APP_TAGLINE` constants and use them consistently across the UI.

## Protocol handling and process model

- The app must register as a protocol handler on Windows and receive URIs passed by the OS as command-line arguments.
- The app must be single-instance:
  - If a second instance is started with a URI, it forwards the URI to the already-running instance and exits.
  - If a second instance is started without a URI (user launches the app while it is already running in the tray), the already-running instance should show/focus the main window.
- Normal launch (no URI argument):
  - Opens the main window.
- Protocol launch (with URI argument):
  - Routes the URI without showing the window by default.
  - If routing fails (see error handling), the app opens the main window and surfaces the error.
- The app must support background operation via tray, “run at login”, and a fast routing-only path:
  - “Run in Background” (RIB) is configurable per user:
    - When RIB is OFF:
      - The app does not create a system tray icon.
      - Closing the main window quits the app.
      - Protocol launches (URI argument) should route and quit afterward on success.
    - When RIB is ON:
      - The app creates a system tray icon.
      - Closing the main window hides to the tray.
      - Protocol launches should route without showing the UI, and remain running in tray afterward on success.
  - “Start on Windows Login” (SWL) is configurable per user:
    - SWL implies RIB (SWL cannot be enabled when RIB is OFF).
    - When started at login (SWL ON), the app should start hidden (tray only), without showing the main window by default.
  - Routing performance requirement:
    - When routing a URI argument successfully, the app should not load the UI (avoid creating the BrowserWindow / renderer).
    - On protocol launch failures, the app must open/focus the main window and show actionable diagnostics (see UI requirements).

## Updates (auto-update + manual update)

- The app must support auto-updates on Windows using `update.electronjs.org` (GitHub Releases) when packaged.
- Update sources:
  - Auto-updates must use public (non-draft, non-prerelease) GitHub releases only.
  - GitHub prereleases are not used for auto-update; this is acceptable and expected.
- Scheduling:
  - When automatic updates are enabled:
    - The app checks for updates at startup.
    - The app checks for updates every hour while running.
  - When automatic updates are disabled:
    - The app must not run scheduled background update checks.
    - Manual update checks must still be available via the About window.
- Install semantics:
  - Default behavior is install-on-quit:
    - If an update has been downloaded, it will be applied the next time the user quits the application.
  - “Update Now” is an escape hatch:
    - If the update is not yet downloaded, “Update Now” must download it first and then install immediately.
    - If the update is already downloaded, “Update Now” installs immediately.

## Registration and default handler rules (Windows)

- The app must support per-user protocol registration (no admin required):
  - Write registration under HKCU so the app appears as a candidate handler in Windows Default Apps for configured protocols.
- The app must not programmatically set itself as the default handler for a protocol (Windows UserChoice hashing prevents reliable/legitimate writes).
- The app must provide a shortcut to open Windows Default Apps settings so the user can assign the app as default for a protocol.
- The app must detect and display default-handler status per protocol:
  - Status must be robust and based on reading Windows registry state.
  - If the default cannot be determined reliably, the app must report “Unknown”, not guess.
  - On newer Windows builds, prefer reading the effective ProgId from:
    - `...UrlAssociations\<scheme>\UserChoiceLatest\ProgId`
      and fall back to `...UserChoice` for compatibility.
- On startup and when the UI is opened, the app must compare:
  - user-configured protocols that are enabled and registered, vs
  - the current Windows default handler for those protocols,
    and prompt/warn the user when Windows is not pointing those protocols at this app.
- In routing-only mode (protocol launch where no window is shown):
  - Do not show a blocking modal dialog.
  - If mismatches are detected and RIB is ON (tray exists), show a best-effort tray notification (e.g., a balloon) prompting the user to open the UI.
  - Also surface the mismatch in the UI the next time the main window is shown.

## Routing configuration model

### Scheme configuration

- Configuration is organized per protocol scheme:
  - Scheme comparison is case-insensitive; storage is canonicalized (e.g. uppercase, without trailing colon).
- Each scheme configuration contains:
  - Enable/disable flag at the scheme level.
  - Desired Windows registration state at the scheme level.
  - Exactly one regex extractor definition (`pattern` + `flags`).
  - An ordered list of templates (fallback order).
  - Enable/disable flags at least at the template level.
- Scheme enablement and registration are distinct:
  - Enabled controls routing behavior (whether the router will process URIs for that scheme when invoked).
  - Registered controls OS interception (whether Windows is configured to offer or invoke this app as a handler candidate for that scheme).
  - Registration must be reconciled to match configuration (see below).
- Invariant:
  - Registered implies enabled (a scheme must not be registered while disabled).

### Incoming URI normalization

- There is no reliable way to know which application produced a protocol link.
  Many apps generate protocol links by URL-encoding user-visible field content (for example, encoding spaces and `+` signs in a `tel:` number).
- The app must normalize the incoming URI for consistent extraction/routing:
  - Preserve the original raw URI (exact OS argument) as `uri` for logging and diagnostics.
  - Compute a decoded URI as `decodedUri` by:
    - splitting at the first `:`, and
    - decoding only the remainder (payload) using a tolerant decoder.
  - Run the extractor against `decodedUri` (not `uri`).
  - Route results must include both `uri` (raw) and `decodedUri` (decoded) for diagnostics.

### Extractor (single regex per scheme)

- For an incoming URI, the app must apply the configured extractor regex to a normalized, decoded form of the URI (`decodedUri`).
- The extractor must use named capture groups to produce tag values.
- Regex flags are configurable, but the app must reject global matching (`g`) to avoid stateful/non-deterministic behavior; extraction uses the first match.
- Extractor failure:
  - If the extractor does not match, routing is considered failed due to configuration/input mismatch and the app must open the UI with diagnostics (see Error handling & feedback).

### Templates (Handlebars)

- Templates are Handlebars strings rendered using the extracted capture groups.
- Templates are evaluated in configured order; only enabled templates participate in routing attempts.
- Template rendering context must include:
  - Top-level keys for each named capture group (spread to the root context).
  - `uri`: the full original incoming URI string (raw).
  - `decodedUri`: the decoded/normalized incoming URI used for extraction.
  - `match`: a debug object based on extractor execution against `decodedUri`, and includes at least `groups` for advanced templates (e.g. `match.groups.number` is acceptable).
  - The context must NOT include a `groups` convenience object (i.e. `groups.*` is not a supported access path).
- The app must provide a small set of generic Handlebars helpers to support target-agnostic transformations. Minimum helpers:
  - `digits(value)`: strip non-digits; throws if input is missing/empty or output is empty.
  - `trim(value)`: trims; throws if input is missing.
  - `lower(value)` / `upper(value)`: throws if input is missing.
  - `urlEncode(value)`: throws if input is missing.
  - Optional generic `replace(value, pattern, replacement)` if needed.
- Missing data and render failures must be detectable:
  - Handlebars rendering must run in strict mode (or equivalent), so missing variables can be treated as errors.
- Template render failure is a configuration error:
  - If a template fails to render or produces an invalid/empty target, routing fails immediately and the UI must open with diagnostics (no fallback to the next template; see Routing semantics).

## Routing semantics

- Input scheme detection:
  - Determine scheme from the URI argument (before the first `:`) in a case-insensitive manner.
  - Use the scheme to select the scheme configuration.
- Scheme-level enablement:
  - If the scheme exists in configuration but is disabled, routing must fail with an actionable error (and open the UI; see Test UI requirements).
- Routing attempt sequence:
  - Apply extractor once to `decodedUri` to build the template context.
  - Evaluate enabled templates in configured order:
    - Render the template.
    - If render fails: stop routing, open UI with diagnostics.
    - Attempt to open the rendered target via OS (Electron `shell.openExternal`) and:
      - If open throws: try next enabled template (best-effort fallback).
      - If open does not throw: consider routing successful and stop.
- If there are no enabled templates for the scheme, routing fails and the UI must open with an actionable error.

## UI requirements

- The main window must provide:
  - A header toolbar aligned to the wireframe:
    - Display `APP_TITLE` and `APP_TAGLINE` in the upper-left corner.
    - Do not display an “Ensure Registration” button in the header (registration reconciliation remains available via the Schemes panel refresh control).
    - Tabs should be presented full-width under the header toolbar.
    - The header must include a Share button that opens the Share window.
  - Separate tabs: Settings, Log, Test.
  - List of configured schemes.
  - For selected scheme: extractor editor, template list editor.
  - Template list features: add/edit/remove, enable/disable, reorder.
  - Indicators:
    - Whether the scheme is enabled in the router config (distinct from Windows registration).
    - Whether the scheme is registered as a candidate handler for the scheme.
    - Whether the app is the current Windows default handler (“Default”, “Not default”, or “Unknown”).
  - Controls to open Windows Default Apps for the user to set the default.
- The UI must autosave configuration changes without an explicit Save action.
  - Layout must align to the wireframe:
    - Schemes and Scheme Detail panels appear only in the Settings tab and are presented side-by-side.
    - The Scheme Detail panel must be scrollable when its content exceeds the viewport height.
    - In the Scheme Detail panel, scrolling must only affect the template cards list (not the scheme/extractor content above).
  - Scheme detail controls:
    - The Scheme Detail panel must not include a redundant scheme enable/disable button (scheme enable/disable exists in the Schemes list).

- The UI must provide a loading indicator for slow-start content:
  - Show a spinner/“Loading…” while config/presets/statuses are loading.
  - Disable actions that depend on that data until loading completes.

- The renderer UI must not rely on browser blocking dialogs:
  - Do not use `window.alert`, `window.confirm`, or `window.prompt`.
  - Use in-app dialogs/modals instead (Electron may disable these APIs).

- UI component library (renderer):
  - The renderer UI must be implemented using Mantine as the primary component library.
  - Prefer Mantine components for layout and interaction primitives (tabs, scroll regions, buttons, inputs, toggles, dialogs).
  - Avoid introducing a second full component system (e.g., MUI + Mantine together) unless there is a specific gap that Mantine cannot cover.
  - “Mantine UI” (ui.mantine.dev) may be used as a reference for patterns, but the codebase should rely on the Mantine packages directly rather than copying large template blocks.

- Dialogs/confirmations:
  - The renderer UI must not rely on browser blocking dialogs (`window.alert`, `window.confirm`, `window.prompt`).
  - Dialog UI should be built using Mantine’s modal/dialog primitives (or equivalent Mantine-supported approach).

- Renderer testing posture:
  - Renderer component tests should prefer jsdom + Testing Library.
  - Avoid relying on server-render-only markup snapshot tests for Mantine-heavy components, as they tend to be brittle and not representative of runtime behavior.

- Layout and scrolling:
  - Window chrome (header + tabs) should be pinned; the window should not scroll as a whole in typical use.
  - Only dedicated scroll regions should scroll:
    - scheme list
    - scheme detail
    - templates list
    - log view
    - test output (as needed)
  - If the window is too small, it is acceptable for the active tab content to scroll as a fallback so controls remain reachable.

- Scheme list behavior:
  - Schemes must be displayed in canonical name-sorted order (A→Z).
  - Selecting a scheme shows its editor panel; selection is independent of enablement and registration state.
  - Disabled schemes must be visually greyed out and their editing controls disabled (except the ability to re-enable).
  - Scheme list labels should include only the scheme name (status is conveyed via icons/tooltip).
  - Registration/default status icons must support unknown and disabled states:
    - Unknown: show an orange “?” state.
    - Disabled: show a greyed/disabled state.
  - Enable/disable controls:
    - Schemes use a power-button control.
    - Templates use a power-button control (not a checkbox/switch) to enable/disable.

### Test UI (debugging / validation)

- Each scheme UI must include a test input field:
  - User can paste a URI to evaluate.
  - The app auto-runs evaluation on debounce (no explicit Run button).
- The Test tab must infer the scheme from the URI (no scheme selector required).
- The test output must show:
  - Extracted capture groups (and/or match metadata).
  - For each template in order:
    - rendered target URL (or a render error describing missing data/helper failure).
- If a scheme is disabled, the Test tab should still evaluate and show outputs for debugging, but must also show a clear banner indicating that routing for that scheme is currently disabled.
- When routing fails due to extractor/template/config issues or due to exhausting openExternal attempts:
  - The app must open/focus the main window.
  - It must switch to the Test tab.
  - It must prefill the test input with the failing URI.
  - It must present an error banner with actionable diagnostics.

## Presets

- The app must ship with built-in presets stored in a JSON file bundled with the app (read-only at runtime).
- Preset entries must use the same schema shape as user scheme configurations.
- The app must provide a WhatsApp preset for TEL as an initial preset:
  - Extractor and templates must be target-agnostic and rely on helpers (e.g. `digits`) rather than hard-coded TEL logic.
  - Desktop-first with optional web fallback templates is acceptable.
- The UI must allow:
  - Adding a scheme from a preset.
  - Resetting a scheme to its preset (destructive; requires confirmation).
- User scheme configs should store “derived from preset” metadata so reset is possible (e.g., store a `presetId` reference).

## First-run onboarding (preset selection)

- When configuration is empty (no schemes) and onboarding has not been completed, the app must prompt the user to choose which bundled presets to add.
  - This is a first-run onboarding flow (triggered by empty config + onboarding not completed), not a Windows installer wizard requirement.
- Preset selection rules:
  - Presets must be presented grouped by scheme (link type).
  - The user may select at most one preset per scheme.
  - TEL WhatsApp must be preselected when available.
  - The user may skip onboarding; skipping marks onboarding completed without adding schemes.
- Onboarding completion must be persisted per user so the prompt does not reappear once completed.

## Configuration storage and portability

- Configuration storage is per-user by default.
- Storage format must be JSON.
- Config and presets must record version information derived from the app package version (for traceability), and must also support schema migration.
- The app must validate loaded configuration:
  - On malformed/unreadable config: fall back to a safe default and notify the user.
- Import/export:
  - User can export config to a JSON file.
  - Exported files are portable and must not encode per-user settings (e.g. run-at-login or a machine-specific shared-config path).
  - User can import config from a JSON file (with validation and clear error feedback). Import replaces schemes/templates but preserves the current user’s per-user settings.
- Shared config file mode:
  - User may opt into using a shared JSON config file path instead of the local per-user config file.
  - When enabled, the shared file is the single source of truth.
  - If the shared file is missing/unreadable/unwritable, the UI must clearly report the error and become read-only until fixed (no silent fallback).
  - When the shared config file is not writable:
    - Scheme editing/registration/import controls must be disabled.
    - Scheme viewing (selection/radio) must remain available.
    - Settings remain editable so the user can fix the shared config path.

## Settings: new-scheme defaults and lifecycle

- New scheme defaults (per-user settings):
  - Auto-enable new schemes (default behavior when adding a new scheme).
  - Auto-register new schemes (default behavior when adding a new scheme).
  - Auto-register implies auto-enable (auto-enable must be forced on and the control disabled while auto-register is enabled).
- Lifecycle settings (per-user):
  - Run in Background (RIB).
  - Start on Windows Login (SWL).
  - SWL implies RIB.

## Logging

- The app must maintain a minimal routing log for debugging:
  - Timestamp, raw incoming URI (`uri`), decoded incoming URI (`decodedUri`), scheme, extracted groups (redacted if needed), attempted targets, and result.
  - By default, persisted logs must avoid storing sensitive payloads:
    - Do not persist raw incoming URIs.
    - Do not persist decoded incoming URIs.
    - Do not persist fully rendered target URLs (which may include payloads).
    - Persist only scheme-level information (e.g. `tel:[redacted]`, `whatsapp:[redacted]`) plus template ids/labels and error/result metadata.
  - The app must provide a user setting to enable full (unredacted) logging, which is OFF by default.
  - A full log viewer is optional, but the UI must surface relevant diagnostics on routing failures (via the test panel and error banner).
- Log UI requirements:
  - The Log tab content must be full-width (no half-width panel behavior).
  - The routing log view must not be enclosed in an additional bordered panel box inside the tab.
  - Do not render a redundant in-panel title (“Routing log”) since the tab label already provides context.
  - Do not hide entries behind an accordion; render the log entries directly in a scrollable region.
  - Log entries must be displayed as pretty JSON with an easy copy action.

## Text inputs

- Extractor pattern input must be a textarea that autosizes:
  - Start at 1 row.
  - Grow when the content wraps/expands (up to a reasonable max height; after
    that, the input may scroll).
- Extractor flags input must:
  - Be labeled “Flags”.
  - Be a short text input positioned to the right of the extractor pattern textarea (wireframe-aligned).
- Template string input must be a textarea that autosizes:
  - Start at 1 row.
  - Grow when the content wraps/expands (up to a reasonable max height; after
    that, the input may scroll).

- Settings panel layout (wireframe-aligned):
  - The inline settings toggles must appear in a row above the shared config file picker.
  - The shared config file picker row must only be visible when “Use shared config” is enabled.

## Icon standardization

- The renderer must use Tabler icons (`@tabler/icons-react`) for icon-only controls.
- Icon-only controls must use tooltips and aria-labels for clarity and accessibility.
- The registration control should use a circle-R (registered) style icon.

## Application menu and Help links (Windows)

- The app must define a custom application menu (Windows) and remove Electron boilerplate items.
- Help menu must include:
  - About…
  - Documentation (opens external URL)
  - Report an Issue (opens external URL)
  - Get Help (opens external URL)

## About window (modal)

- The app must provide an About window accessible via Help → About.
- The About window must be a separate window and modal to the main window.
- When the About window is open and the main window is visible, the main window must be dimmed/disabled.
- The About window must not display an application menu bar.
- About content must include:
  - Title + subtitle using `APP_TITLE` and `APP_TAGLINE`.
  - Current version.
  - Update status:
    - “Your application is up to date!” or “New version available: <version>”.
  - Controls:
    - “Check for updates” button (manual check).
    - “Update Now” button that downloads (if needed) and installs immediately.
    - Checkbox “Enable automatic updates” (enabled by default).
  - About must automatically check for updates when opened (best-effort; debounce/coalesce in main).

## External link handling

- The app must open all external `http:`/`https:` links in the system default browser (not inside an in-app Electron window).

## Test tab layout

- The Test tab content must be full-width (no half-width panel behavior).
- The test view must not be enclosed in an additional bordered panel box inside the tab.
- Do not render a redundant in-panel title (“Test”) since the tab label already provides context.
- Do not use accordions for test diagnostics; render match groups and other diagnostics directly.

## Share window + nag interstitial

- The app must provide a Share page in a separate window (not a main-window tab).
  - Manual entrypoint: a header Share button opens the Share window.
  - The Share window is an interstitial experience; when opened manually, it should prevent drifting into the main window (modal/disabled parent behavior).
- The Share window must not display an application menu bar.
- When the Share window is open and the main window is visible, the main window must be dimmed/disabled.
- Share page content (minimal):
  - Like win-link-router? Tell your friends!
    - X share button
    - LinkedIn share button
  - Give us a star on GitHub!
    - GitHub “Star” button with star count (via `react-github-btn`)
- Share message composition:
  - Message includes:
    - link type from scheme (e.g. TEL)
    - target from template label (e.g. “WhatsApp Desktop”)
    - repo URL
  - For X, the message must mention @karmaniverous.
  - Manual Share uses most recently used (MRU) scheme + template label derived from the last successful route.
    - If MRU is unavailable, fall back to enabled schemes/templates first, then disabled.
  - When share is shown due to nag, the scheme/template label used for the message must come from the link that triggered the nag (the actual routed template label).
- Nagging behavior:
  - Define a `NAG_INTERVAL` constant.
  - After every `NAG_INTERVAL` successful routes (and only successful routes), show the Share window as an interstitial.
  - The nag interstitial must include two buttons:
    - “Later!” (dismisses the interstitial)
    - “Stop Nagging Me!” (disables future nags permanently)
  - Closing the Share window via the window close control is treated as “Later!”.
  - Nag state (disabled flag and route counter/MRU) must be stored in a separate per-user file under userData (not in the main config/import/export).
