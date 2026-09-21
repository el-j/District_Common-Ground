// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  packageManager: 'npm',
  testRunner: 'vitest',
  vitest: {
    configFile: 'vitest.config.ts',
  },
  reporters: ['html', 'clear-text', 'progress'],
  coverageAnalysis: 'perTest',
  // Scoped to the pure game-balance logic the 2026-09-20 audit flagged as
  // needing real assertion-quality confidence, not just line coverage —
  // arithmetic/boundary bugs are exactly what mutation testing catches and
  // this codebase's Vitest suite can't. UI modals and Phaser scene files
  // are deliberately excluded: they're DOM/render-heavy, already covered by
  // the (large, growing) UI test suite, and mutating them would multiply
  // run time for little signal over what's already tested behaviorally.
  mutate: [
    'src/core/simulation/**/*.ts',
    '!src/core/simulation/**/*.test.ts',
    'src/world/regions/RegionData.ts',
  ],
  // TypeScript 7's rewritten native compiler dropped `ts.parseConfigFileTextToJson`,
  // which Stryker's (normally safe, sandboxed) tsconfig-rewriting
  // preprocessor still calls unconditionally whenever `tsconfigFile` is
  // part of the sandbox's copied files — crashing Stryker before a single
  // mutant runs (see node_modules/@stryker-mutator/core/dist/src/sandbox/ts-config-preprocessor.js).
  // Pointing this at a file that doesn't exist makes that preprocessor a
  // no-op instead (its `rewriteTSConfigFile()` guards on `project.files.get(tsconfigFileName)`
  // being truthy) — safe here because nothing else needs it: this project
  // doesn't use the @stryker-mutator/typescript-checker plugin (no
  // `checkers` option below), and neither vite.config.ts nor
  // vitest.config.ts read tsconfig.json for anything (no tsconfig-paths
  // plugin, no path aliases) — Vite's esbuild/rolldown transform strips TS
  // types without it.
  //
  // Do NOT "fix" this by setting `inPlace: true` instead. inPlace skips
  // sandboxing entirely and applies Stryker's own preprocessing — including
  // inserting `// @ts-nocheck` into every src/test file matching
  // `disableTypeChecks` (default: nearly everything under src/), which is
  // normally harmless because it only ever touches a throwaway sandbox
  // copy — directly to the real working tree instead. That's exactly what
  // happened the first time this config was written: a run got interrupted
  // mid-instrumentation and left ~230 real source files modified on disk.
  // inPlace does restore the originals from its temp dir on a clean exit,
  // but there's no reason to accept that risk when the real fix (this
  // `tsconfigFile` redirect) avoids it entirely.
  tsconfigFile: 'stryker-tsconfig-placeholder-does-not-exist.json',
  thresholds: {
    high: 80,
    low: 60,
    break: null,
  },
  tempDirName: 'stryker-tmp',
  cleanTempDir: true,
};
