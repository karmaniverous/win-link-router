# stan.project.md

Project-specific assistant guidance for this repo.

- Electron fuses configuration:
  - Prefer using `@electron/fuses` directly via Electron Forge hooks (see `forge.config.ts`) instead of `@electron-forge/plugin-fuses`.
  - Rationale: `@electron-forge/plugin-fuses` currently pins `@electron/fuses` to v1 via peerDependencies; this repo wants `@electron/fuses` v2.
  - Revisit this decision if/when `@electron-forge/plugin-fuses` updates its peerDependencies to support `@electron/fuses@^2`.

- ESLint configuration:
  - Use ESLint v9 flat config in `eslint.config.ts` with strict, type-aware `typescript-eslint` rules.
  - Run lint via `tsx ...eslint.js --config eslint.config.ts` so the TS config file can be loaded.