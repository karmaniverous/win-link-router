# stan.todo.md

## Next up

- Run `npm install` and confirm dependency tree is clean.
- Run `npm run typecheck` (should resolve `@electron/fuses` types).
- Run `npm run lint` (should use `eslint.config.ts` successfully).
- Run `npm run package` to confirm hooks still run during packaging.

## Completed (recent)

- Upgraded `@electron/fuses` to v2 and flipped fuses via a Forge hook to avoid the `@electron-forge/plugin-fuses` peerDependency constraint.
- Migrated ESLint to `eslint.config.ts` with strict, type-aware TypeScript rules.