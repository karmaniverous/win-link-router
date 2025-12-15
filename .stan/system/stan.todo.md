# stan.todo.md

## Next up

- Run `npm install` and confirm dependency tree is clean.
- Run `npm run typecheck` (should pass with `strictNullChecks` enabled).
- Run `npm run lint` (should enforce Prettier + import sorting).
- Optionally run `npm run lint -- --fix` to auto-apply import order/format fixes.
- Run `npm run package` to confirm hooks still run during packaging.

## Completed (recent)

- Upgraded `@electron/fuses` to v2 and flipped fuses via a Forge hook to avoid the `@electron-forge/plugin-fuses` peerDependency constraint.
- Migrated ESLint to `eslint.config.ts` with strict, type-aware TypeScript rules.- Integrated Prettier and simple-import-sort into ESLint.