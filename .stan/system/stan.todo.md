# stan.todo.md

## Next up

- Run `npm install` to confirm there are no peer dependency conflicts after removing `@electron-forge/plugin-fuses`.
- Run `npm run make` to confirm fuses are flipped during packaging (hook runs during Forge packaging).

## Completed (recent)

- Upgraded `@electron/fuses` to v2 and flipped fuses via a Forge hook to avoid the `@electron-forge/plugin-fuses` peerDependency constraint.
