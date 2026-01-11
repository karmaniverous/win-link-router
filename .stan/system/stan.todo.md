# stan.todo.md

## Next up

- Baseline sanity:
  - Run `npm install` and confirm dependency tree is clean.
  - Run `npm run typecheck`, `npm run lint`, `npm run test`, `npm run knip`.
  - Run `npm run package` to confirm Forge packaging still works.
- Define v1 data model + validation (JSON + Zod):
  - Define a single `SchemeConfig` shape used by both presets and user config.
  - Define config-level settings (tray/run-at-login, shared config file mode,
    etc.).
  - Define schema versioning and package-version traceability fields.
- Add presets:
  - Create bundled `presets.json` (read-only) containing at least TEL →
    WhatsApp (desktop-first + optional web fallback).
  - Add preset selection and reset-to-preset behavior (store `presetId` in user
    scheme config).
- Implement routing core (pure services-first):
  - Single-regex extractor per scheme using named capture groups.
  - Handlebars rendering with strict missing-data detection.
  - Generic helpers (`digits`, `trim`, `lower`, `upper`, `urlEncode`, etc.).
  - Routing semantics:
    - Render failures open UI (no fallback).
    - openExternal failures try next template (best-effort).
  - Add unit tests for extractor/rendering/routing decisions.
- Implement config persistence:
  - Per-user JSON config under `userData`.
  - Import/export JSON.
  - Shared-config-file mode (single source of truth; UI read-only on shared file
    errors).
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
