import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          // One time zone on every machine. Copenhagen has daylight saving time, so the
          // tests of the daylight saving days (DL-3) check real changes.
          env: { TZ: 'Europe/Copenhagen' },
          include: ['src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'int',
          environment: 'node',
          include: ['tests/int/**/*.int.spec.ts'],
          setupFiles: ['./vitest.setup.ts'],
          // All files share one SQLite file, so they run one at a time.
          fileParallelism: false,
          // Payload connects and builds the schema in the first test of a file.
          hookTimeout: 30_000,
        },
      },
    ],
  },
})
