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

// Copy pre-built image assets (PNG, JPEG, etc.) extracted by Metro in
// the prepare job. These live in the drawable-* resource directories
// alongside the pre-built bundle. Without these, require('./image.png')
// resolves to missing files at runtime.
if (assetsDest) {
  fs.mkdirSync(assetsDest, { recursive: true });

  // The pre-built assets are in sibling drawable-* directories under
  // src/main/res, placed there by the "Download pre-built JS assets"
  // workflow step. Copy them to Gradle's expected output res directory.
  const prebuiltResDir = path.resolve(__dirname, '..', 'src', 'main', 'res');
  const drawableDirs = fs.readdirSync(prebuiltResDir).filter(
    (d) => d.startsWith('drawable-') && fs.statSync(path.join(prebuiltResDir, d)).isDirectory()
  );

  let assetCount = 0;
  for (const dir of drawableDirs) {
    const srcDir = path.join(prebuiltResDir, dir);
    const destDir = path.join(assetsDest, dir);
    fs.mkdirSync(destDir, { recursive: true });
    for (const file of fs.readdirSync(srcDir)) {
      const srcFile = path.join(srcDir, file);
      if (fs.statSync(srcFile).isFile()) {
        fs.copyFileSync(srcFile, path.join(destDir, file));
        assetCount++;
      }
    }
  }
  console.log(`copy-bundle.cjs: Copied ${assetCount} asset files from ${drawableDirs.length} drawable dirs to ${assetsDest}`);
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
