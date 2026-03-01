#!/usr/bin/env node

/**
 * patch-to-overlay.mjs
 *
 * Transforms a complete git diff patch file into an overlay+patch structure.
 *
 * What it does:
 * 1. Parses the patch file to identify file operations (add, delete, modify)
 * 2. For binary file additions/modifications: extracts them from git into overlay/
 * 3. For file deletions: writes paths to delete.txt
 * 4. For text modifications: writes minimal patches to patches/
 * 5. Generates a template variant.env
 *
 * Usage:
 *   node scripts/patch-to-overlay.mjs <patch-file> <output-dir> [--apply-ref <git-ref>]
 *
 * Example:
 *   node scripts/patch-to-overlay.mjs patch/0001-chore-android-app-to-bcsc-dev.patch variants/bcsc-dev/
 *
 * Options:
 *   --apply-ref <ref>  Git ref that has the patch already applied, to extract binary files from.
 *                       If not provided, the script will try to apply the patch to a temp branch.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname, basename } from 'path'
import { execSync } from 'child_process'

// ─── Helpers ────────────────────────────────────────────────────

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true })
}

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf-8', ...opts }).trim()
}

// ─── Patch parser ───────────────────────────────────────────────

/**
 * Parses a unified diff / git-am patch file and returns structured info about each file.
 */
function parsePatchFile(patchContent) {
  const files = []
  const lines = patchContent.split('\n')
  let i = 0

  while (i < lines.length) {
    // Look for "diff --git a/... b/..."
    const diffMatch = lines[i].match(/^diff --git a\/(.+) b\/(.+)$/)
    if (!diffMatch) {
      i++
      continue
    }

    const fileA = diffMatch[1]
    const fileB = diffMatch[2]
    const entry = {
      pathA: fileA,
      pathB: fileB,
      isBinary: false,
      isNew: false,
      isDeleted: false,
      isRenamed: false,
      diffLines: [lines[i]],
    }

    i++

    // Consume header lines until next diff or end
    while (i < lines.length && !lines[i].startsWith('diff --git ')) {
      const line = lines[i]
      entry.diffLines.push(line)

      if (line.startsWith('new file mode')) {
        entry.isNew = true
      } else if (line.startsWith('deleted file mode')) {
        entry.isDeleted = true
      } else if (line.startsWith('rename from')) {
        entry.isRenamed = true
      } else if (line.match(/^Binary files/) || line.match(/^GIT binary patch/)) {
        entry.isBinary = true
      }

      i++
    }

    files.push(entry)
  }

  return files
}

// ─── Main ───────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.error('Usage: node scripts/patch-to-overlay.mjs <patch-file> <output-dir> [--apply-ref <ref>]')
    process.exit(1)
  }

  const patchFile = args[0]
  const outputDir = args[1]

  let applyRef = null
  const refIdx = args.indexOf('--apply-ref')
  if (refIdx !== -1 && args[refIdx + 1]) {
    applyRef = args[refIdx + 1]
  }

  if (!existsSync(patchFile)) {
    console.error(`Patch file not found: ${patchFile}`)
    process.exit(1)
  }

  const patchContent = readFileSync(patchFile, 'utf-8')
  const files = parsePatchFile(patchContent)

  console.log(`Parsed ${files.length} file entries from patch`)

  const overlayDir = join(outputDir, 'overlay')
  const patchesDir = join(outputDir, 'patches')
  ensureDir(overlayDir)
  ensureDir(patchesDir)

  const deletedFiles = []
  const binaryFiles = []
  const textPatches = { android: [], ios: [] }

  for (const file of files) {
    const path = file.pathB || file.pathA

    if (file.isDeleted) {
      deletedFiles.push(path)
      console.log(`  DELETE: ${path}`)
      continue
    }

    if (file.isBinary) {
      if (!file.isDeleted) {
        binaryFiles.push(path)
        console.log(`  BINARY (overlay): ${path}`)
      }
      continue
    }

    // Text modification or addition
    if (file.isNew && !file.isBinary) {
      // New text file -> overlay
      console.log(`  NEW TEXT (overlay): ${path}`)
      binaryFiles.push(path) // treat as overlay
      continue
    }

    // Text diff -> patch
    const platform = path.includes('/ios/') ? 'ios' : 'android'
    textPatches[platform].push(file)
    console.log(`  TEXT DIFF (patch): ${path} -> ${platform}`)
  }

  // Write delete.txt
  if (deletedFiles.length > 0) {
    writeFileSync(join(outputDir, 'delete.txt'), deletedFiles.join('\n') + '\n')
    console.log(`\nWrote ${deletedFiles.length} entries to delete.txt`)
  }

  // Extract binary/new files into overlay
  if (binaryFiles.length > 0 || applyRef) {
    console.log(`\nExtracting ${binaryFiles.length} files to overlay...`)
    if (applyRef) {
      for (const filePath of binaryFiles) {
        const destPath = join(overlayDir, filePath)
        ensureDir(dirname(destPath))
        try {
          const content = execSync(`git show ${applyRef}:${filePath}`, { encoding: 'buffer' })
          writeFileSync(destPath, content)
          console.log(`  Extracted: ${filePath}`)
        } catch (e) {
          console.warn(`  WARN: Could not extract ${filePath} from ${applyRef}: ${e.message}`)
        }
      }
    } else {
      console.log('  NOTE: No --apply-ref provided. Binary files must be manually populated in overlay/.')
      console.log('  The following files need to be placed in the overlay directory:')
      for (const f of binaryFiles) {
        console.log(`    ${join('overlay', f)}`)
      }
    }
  }

  // Write text patches
  for (const [platform, patches] of Object.entries(textPatches)) {
    if (patches.length === 0) continue

    const patchLines = []
    for (const p of patches) {
      patchLines.push(...p.diffLines)
    }

    const patchPath = join(patchesDir, `${platform}.patch`)
    writeFileSync(patchPath, patchLines.join('\n') + '\n')
    console.log(`Wrote ${platform}.patch with ${patches.length} file diffs`)
  }

  // Generate variant.env template
  const variantEnvPath = join(outputDir, 'variant.env')
  if (!existsSync(variantEnvPath)) {
    const template = `# Variant configuration
# This file defines the variant-specific settings used by apply-variant.mjs

# App metadata
APP_NAME="BC Services Card"
APP_VERSION="4.0.0"
BUILD_TARGET="bcsc"

# Android
ANDROID_PACKAGE_NAME="ca.bc.gov.id.servicescard.dev"
ANDROID_ICON_REF="ic_launcher_mono"

# iOS
IOS_BUNDLE_ID="ca.bc.gov.iddev.servicescard"
IOS_PRODUCT_NAME="$(TARGET_NAME)"

# URL schemes to add to Info.plist (comma-separated)
IOS_URL_SCHEMES="ca.bc.gov.id.servicescard,ca.bc.gov.iddev.servicescard,ca.bc.gov.idqa.servicescard,ca.bc.gov.idtest.servicescard,ca.bc.gov.idsit.servicescard"

# Base variant to inherit from (empty for none)
BASE_VARIANT="_bcsc-base"
`
    writeFileSync(variantEnvPath, template)
    console.log(`\nGenerated template variant.env`)
  }

  console.log('\n✓ Conversion complete!')
  console.log(`  Output: ${outputDir}`)
  console.log(`\nNext steps:`)
  console.log(`  1. Review and adjust variant.env`)
  console.log(`  2. Populate binary files in overlay/ (if --apply-ref was not used)`)
  console.log(`  3. Review text patches in patches/ - many can be replaced by variant.env templating`)
  console.log(`  4. Test: node scripts/apply-variant.mjs <variant-name>`)
}

main()
