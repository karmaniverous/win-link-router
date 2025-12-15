import path from 'node:path';

import { flipFuses, FuseV1Options, FuseVersion } from '@electron/fuses';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { VitePlugin } from '@electron-forge/plugin-vite';
import type { ForgeConfig } from '@electron-forge/shared-types';

const fuseConfig = {
  version: FuseVersion.V1,
  [FuseV1Options.RunAsNode]: false,
  [FuseV1Options.EnableCookieEncryption]: true,
  [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
  [FuseV1Options.EnableNodeCliInspectArguments]: false,
  [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
  [FuseV1Options.OnlyLoadAppFromAsar]: true,
} as const;

function getExtractedElectronBinaryPath(buildPath: string, platform: string) {
  if (platform === 'win32') return path.join(buildPath, 'electron.exe');
  if (platform === 'darwin')
    return path.join(
      buildPath,
      'Electron.app',
      'Contents',
      'MacOS',
      'Electron',
    );
  return path.join(buildPath, 'electron');
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
  },
  rebuildConfig: {},
  hooks: {
    // Fuses must be flipped at package time (before any code signing). Doing this
    // in `packageAfterExtract` lets us patch the extracted Electron binary
    // without depending on `@electron-forge/plugin-fuses` (which currently pins
    // `@electron/fuses` to v1 via peerDependencies).
    packageAfterExtract: async (
      _forgeConfig,
      buildPath,
      _electronVersion,
      platform,
      _arch,
    ) => {
      const electronBinaryPath = getExtractedElectronBinaryPath(
        buildPath,
        platform,
      );
      await flipFuses(electronBinaryPath, fuseConfig);
    },
  },
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
  ],
};

export default config;
