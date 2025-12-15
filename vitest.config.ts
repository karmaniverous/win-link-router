import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/**/*.test.{ts,tsx}',
      'src/**/*.spec.{ts,tsx}',
      'src/**/*.test.{js,jsx}',
      'src/**/*.spec.{js,jsx}',
    ],
  },
});
