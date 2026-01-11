# stan.todo.md

## Next up

- Baseline sanity:
  - Run `npm install` and confirm dependency tree is clean.
  - Run `npm run typecheck`, `npm run lint`, `npm run test`, `npm run knip`.
  - Run `npm run package` to confirm Forge packaging still works.
- Implement config persistence:
- Implement Windows integration (HKCU; no admin):
  - Register as a candidate handler per configured scheme (Capabilities +
    URLAssociations + ProgIds).
  - Detect default handler status robustly (UserChoice ProgId compare) and show
    “Default / Not default / Unknown”.
  - Provide “Open Default Apps” shortcut.
  - On app startup and UI open, warn/prompt when configured schemes are not
    currently defaulting to this app.
- Implement UI:
  - Scheme list + editor (extractor + templates CRUD, enable/disable, reorder).
  - Test field with debounce auto-run showing extracted groups and per-template
    rendered output or errors.
  - On routing error, open window, select scheme, and prefill test input with
    the failing URI.
- Implement tray + run-at-login:
  - Tray menu, hide-to-tray behavior, explicit Quit action.
  - Run-at-login setting wired to Electron.

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
