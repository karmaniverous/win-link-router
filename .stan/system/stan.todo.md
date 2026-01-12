# stan.todo.md

## Next up

- Baseline sanity:
  - Run `npm install` and confirm dependency tree is clean.
  - Run `npm run typecheck`, `npm run lint`, `npm run test`, `npm run knip`.
  - Run `npm run package` to confirm Forge packaging still works.
- Implement Windows integration (HKCU; no admin):
  - Add UI-level “Set default” affordances per scheme (likely still opens the generic Default Apps page).
- Implement UI:
  - Add inline validation and clearer save-error UX for extractor/templates.
    (e.g., show regex/template validation errors near fields before autosave).
  - Add preset picker (choose among multiple presets per scheme, when added).
  - Add richer tests around routing failure UX (banner + prefilled test URI)
    once more renderer behavior is in place.

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
- Added pre-save validation and prompt-based preset picking.
- Added tests for core React UI components (SchemeEditor, SettingsPanel,
  TestPanel) and fixed remaining SchemeEditor lint warnings.
