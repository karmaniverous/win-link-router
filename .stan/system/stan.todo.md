# stan.todo.md

## Next up

- Windows integration polish:
  - Validate Default Apps deep link behavior across Windows builds:
    - Prefer `ms-settings:defaultapps?registeredAppUser=win-link-router` when supported.
    - Fall back to plain `ms-settings:defaultapps` when not supported.
- UI polish:
  - Improve loading UX (spinner placement, disable/enable timing) based on real-world startup behavior.
  - Expand routing-failure banner details (e.g., include which template failed,
    or how many targets were attempted) without bloating App.tsx.

## Completed (recent)

- Added v1 requirements doc and updated the implementation plan.
- Added v1 config/preset schemas and normalization helpers.
- Added bundled TEL→WhatsApp presets (desktop-first + web fallback).
- Added routing core (extractor + Handlebars rendering + fallback) with tests.
- Fixed lint errors in Zod schema validation and Handlebars helpers.
- Fixed routing unit tests to validate fallback behavior (not extractor mismatch).
- Removed hard-coded bundled preset appVersion (provided at load time).
- Added main-process AppConfigStore (local + optional shared file) with Zod validation.
- Added bundled presets loader and IPC endpoints for config/presets/test evaluation.
- Wired main process to route incoming URI args without opening the window by default.
- Fixed typecheck/lint issues in main IPC and config store.
- Fixed IPC handler return typing and trimmed unused exports.
- Cleaned up remaining Knip unused export in routing core.
- Added portable schemes-only import/export (settings preserved locally).
- Added settings persistence that can recover from broken shared config paths.
- Documented import/export semantics in requirements.
- Started Windows integration (HKCU registration + status) and applied run-at-login setting.
- Fixed reg.exe adapter linting and trimmed unused Windows exports.
- Added tray controller, Default Apps opener, and default-handler mismatch prompt.
- Trimmed unused exported type in tray controller.
- Added initial UI shell and routing-failure test prefill plumbing.
- Fixed renderer lint issues and trimmed unused exported types.
- Fixed App.tsx async cancellation and reload wiring.
- Added scheme editor UI, settings panel, and aligned registration to enabled schemes.
- Fixed lint issues in scheme add/reset and template id generation.
- Added pre-save validation and prompt-based preset picking.
- Added tests for core React UI components (SchemeEditor, SettingsPanel,
  TestPanel) and fixed remaining SchemeEditor lint warnings.
- Fixed lint failure by removing an unused `TemplateConfig` import in `SchemeEditor.test.tsx`.
- Reviewed latest script outputs: typecheck/tests/knip/package are passing; lint fix unblocks `npm run lint`.
- Added a minimal per-user routing log (persisted under `userData`) with retention caps.
- Included extractor match groups in route results to improve diagnostics/logging.
- Fixed lint in routing log tests by avoiding number interpolation in template literals.
- Fixed Knip unused exports by removing `__private__` and keeping `RouteLogEntry` internal.
- Added default redaction for persisted routing logs (no raw URIs/targets) and introduced per-entry `seq` ids to keep logs useful.
- Added a small UI routing log viewer (refresh + clear) via IPC/preload API.
- Added a settings-backed log mode toggle (redacted vs full) and wired main/log store to honor it.
- Improved scheme list status labels and added scheme-specific “Set default…” guidance (clipboard + instructions).
- Added inline extractor validation messaging in SchemeEditor and tightened route-log typing end-to-end.
- Fixed SchemeEditor lint by removing an unnecessary `??` on extractor.pattern.
- Added a best-effort Default Apps deep link (registeredAppUser) with safe fallback.
- Extracted routing-failure banner logic into a testable renderer module and used it in App.tsx.
- Replaced window.prompt/confirm with in-app dialogs and added interaction tests to prevent regressions.
- Fixed lint and interaction test selectors after dialog refactor.
- Added loading spinner UX and ensured Add Scheme shows available presets (with a regression test).
