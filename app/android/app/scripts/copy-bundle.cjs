#!/usr/bin/env node
/**
 * copy-bundle.cjs — CI-only replacement for Metro bundling.
 *
 * When SKIP_METRO_BUNDLE=1 is set, the react {} DSL in build.gradle
 * points cliFile here instead of react-native's cli.js. This script
 * copies a pre-built JS bundle (produced by the `prepare` job) to the
 * output path expected by the RN Gradle plugin, eliminating the 4+ min
 * Metro bundler invocation.
 *
 * The Hermes bytecode compilation step still runs normally after this.
 *
 * Usage (invoked automatically by the RN Gradle plugin):
 *   node scripts/copy-bundle.cjs bundle \
 *     --platform android --dev false --reset-cache \
 *     --entry-file index.js \
 *     --bundle-output <gradle-output-path> \
 *     --assets-dest <gradle-assets-path> \
 *     --sourcemap-output <gradle-sourcemap-path>
 */
'use strict';

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

function getArg(name) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const bundleOutput = getArg('--bundle-output');
const assetsDest = getArg('--assets-dest');
const sourcemapOutput = getArg('--sourcemap-output');

if (!bundleOutput) {
  console.error('copy-bundle.cjs: --bundle-output argument is required');
  process.exit(1);
}

// The pre-built bundle lives at src/main/assets/index.android.bundle,
// placed there by the "Download pre-built JS bundle" workflow step.
const prebuiltBundle = path.resolve(
  __dirname, '..', 'src', 'main', 'assets', 'index.android.bundle'
);

if (!fs.existsSync(prebuiltBundle)) {
  console.error(
    `copy-bundle.cjs: Pre-built bundle not found at: ${prebuiltBundle}\n` +
    'Ensure the "Download pre-built JS bundle" step ran before the build.'
  );
  process.exit(1);
}

// Copy bundle to Gradle's expected output path
fs.mkdirSync(path.dirname(bundleOutput), { recursive: true });
fs.copyFileSync(prebuiltBundle, bundleOutput);
console.log(`copy-bundle.cjs: Copied pre-built bundle to ${bundleOutput}`);

// Create assets directory (images extracted by Metro are not needed here
// because the prepare job already handled bundling; native drawable
// resources live in app/src/main/res which is always included).
if (assetsDest) {
  fs.mkdirSync(assetsDest, { recursive: true });
  console.log(`copy-bundle.cjs: Created assets directory at ${assetsDest}`);
}

// Write a minimal valid sourcemap so Hermes can produce a combined map.
// Hermes takes this as input and generates the final bytecode sourcemap.
if (sourcemapOutput) {
  fs.mkdirSync(path.dirname(sourcemapOutput), { recursive: true });
  fs.writeFileSync(
    sourcemapOutput,
    JSON.stringify({ version: 3, sources: [], names: [], mappings: '' })
  );
  console.log(`copy-bundle.cjs: Wrote placeholder sourcemap to ${sourcemapOutput}`);
}
