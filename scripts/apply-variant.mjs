#!/usr/bin/env node

/**
 * apply-variant.mjs
 *
 * Applies a variant configuration to the project working tree.
 * This replaces the old `git am` patching approach with an overlay + templating approach.
 *
 * What it does:
 * 1. Reads variant.env for the named variant
 * 2. If the variant specifies a BASE_VARIANT, applies that first
 * 3. Deletes files listed in delete.txt
 * 4. Copies overlay files on top of the working tree
 * 5. Performs template substitutions in known files using variant.env values
 * 6. Applies any remaining minimal patches from patches/
 *
 * Usage:
 *   node scripts/apply-variant.mjs <variant-name>
 *
 * Examples:
 *   node scripts/apply-variant.mjs bcsc-dev
 *   node scripts/apply-variant.mjs bcsc-prod
 *   node scripts/apply-variant.mjs bcwallet-prod   # no-op (project defaults)
 *
 * Variant names map to directories under variants/:
 *   variants/bcsc-dev/variant.env
 *   variants/bcsc-dev/overlay/...
 *   variants/bcsc-dev/patches/...
 *   variants/bcsc-dev/delete.txt
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync, readdirSync, statSync, copyFileSync, mkdirSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { execSync } from 'child_process'

// ─── Constants ──────────────────────────────────────────────────

const ROOT_DIR = resolve(import.meta.dirname, '..')
const VARIANTS_DIR = join(ROOT_DIR, 'variants')

// Default values from BCWallet (the project defaults)
const DEFAULTS = {
  APP_NAME: 'BC Wallet',
  ANDROID_PACKAGE_NAME: 'ca.bc.gov.BCWallet',
  ANDROID_ICON_REF: 'ic_launcher',
  IOS_BUNDLE_ID: 'ca.bc.gov.BCWallet',
  IOS_PRODUCT_NAME: 'BCWallet',
  IOS_DISPLAY_NAME: 'BC Wallet',
}

// Files that get template substitution
const TEMPLATE_FILES = {
  // Android
  'app/android/app/BUCK': [
    { pattern: /package = "[^"]+"/g, replacement: (env) => `package = "${env.ANDROID_PACKAGE_NAME}"` },
  ],
  'app/android/app/build.gradle': [
    { pattern: /namespace '[^']+'/g, replacement: (env) => `namespace '${env.ANDROID_PACKAGE_NAME}'` },
    { pattern: /applicationId "[^"]+"/g, replacement: (env) => `applicationId "${env.ANDROID_PACKAGE_NAME}"` },
  ],
  'app/android/app/src/main/AndroidManifest.xml': [
    { pattern: /package="[^"]+"/g, replacement: (env) => `package="${env.ANDROID_PACKAGE_NAME}"` },
    {
      pattern: /android:icon="@mipmap\/[^"]+"/g,
      replacement: (env) => `android:icon="@mipmap/${env.ANDROID_ICON_REF}"`,
    },
  ],
  'app/android/app/src/main/java/ca/bc/gov/BCWallet/MainActivity.kt': [
    { pattern: /^package .+$/m, replacement: (env) => `package ${env.ANDROID_PACKAGE_NAME}` },
  ],
  'app/android/app/src/main/java/ca/bc/gov/BCWallet/MainApplication.kt': [
    { pattern: /^package .+$/m, replacement: (env) => `package ${env.ANDROID_PACKAGE_NAME}` },
  ],
  'app/android/app/src/main/res/values/strings.xml': [
    {
      pattern: /<string name="app_name">[^<]+<\/string>/g,
      replacement: (env) => `<string name="app_name">${env.APP_NAME}</string>`,
    },
  ],
  'app/android/app/src/main/res/layout/launch_screen.xml': [
    {
      pattern: /android:src="@mipmap\/[^"]+"/g,
      replacement: (env) => `android:src="@mipmap/${env.ANDROID_ICON_REF}"`,
    },
  ],
  'app/react-native.config.js': [
    {
      pattern: /packageName: '[^']+'/g,
      replacement: (env) => `packageName: '${env.ANDROID_PACKAGE_NAME}'`,
    },
  ],

  // iOS
  'app/ios/AriesBifold.xcodeproj/project.pbxproj': [
    {
      pattern: /PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g,
      replacement: (env) => `PRODUCT_BUNDLE_IDENTIFIER = ${env.IOS_BUNDLE_ID};`,
    },
    {
      pattern: /PRODUCT_NAME = [^;]+;/g,
      replacement: (env) => `PRODUCT_NAME = ${env.IOS_PRODUCT_NAME};`,
    },
  ],
  'app/ios/AriesBifold/Info.plist': [
    {
      // Replace CFBundleDisplayName value
      pattern: /(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]+(<\/string>)/g,
      replacement: (env) => `$1${env.APP_NAME}$2`,
    },
  ],
}

// ─── Helpers ────────────────────────────────────────────────────

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true })
}

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf-8', cwd: ROOT_DIR, ...opts }).trim()
}

/**
 * Parse a variant.env file into a key-value object.
 */
function parseVariantEnv(envPath) {
  const content = readFileSync(envPath, 'utf-8')
  const env = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Z_]+)=(.*)$/)
    if (match) {
      let value = match[2].trim()
      // Remove surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      env[match[1]] = value
    }
  }
  return env
}

/**
 * Copy directory recursively.
 */
function copyDirRecursive(src, dest) {
  if (!existsSync(src)) return

  const entries = readdirSync(src)
  for (const entry of entries) {
    const srcPath = join(src, entry)
    const destPath = join(dest, entry)
    const stat = statSync(srcPath)

    if (stat.isDirectory()) {
      ensureDir(destPath)
      copyDirRecursive(srcPath, destPath)
    } else {
      ensureDir(dirname(destPath))
      copyFileSync(srcPath, destPath)
    }
  }
}

/**
 * Apply URL schemes to Info.plist for BCSC variants.
 */
function applyUrlSchemes(env) {
  const schemes = env.IOS_URL_SCHEMES
  if (!schemes) return

  const plistPath = join(ROOT_DIR, 'app/ios/AriesBifold/Info.plist')
  if (!existsSync(plistPath)) return

  let content = readFileSync(plistPath, 'utf-8')

  const schemeList = schemes.split(',').map((s) => s.trim())

  // Build the URL scheme dict XML
  const schemeEntries = schemeList.map((s) => `\t\t\t\t<string>${s}</string>`).join('\n')
  const urlSchemeDict = `\t\t<dict>
\t\t\t<key>CFBundleURLSchemes</key>
\t\t\t<array>
${schemeEntries}
\t\t\t</array>
\t\t</dict>`

  // Check if this URL scheme dict already exists
  if (content.includes(schemeList[0])) {
    console.log('  URL schemes already present in Info.plist, skipping')
    return
  }

  // Insert before the closing </array> of CFBundleURLTypes
  // Find the CFBundleURLTypes array and add our dict before its closing </array>
  const urlTypesPattern = /(<key>CFBundleURLTypes<\/key>\s*<array>)([\s\S]*?)(\s*<\/array>)/
  const match = content.match(urlTypesPattern)
  if (match) {
    content = content.replace(urlTypesPattern, `$1$2\n${urlSchemeDict}$3`)
    writeFileSync(plistPath, content)
    console.log(`  Added ${schemeList.length} URL schemes to Info.plist`)
  } else {
    console.warn('  WARN: Could not find CFBundleURLTypes in Info.plist')
  }
}

/**
 * Apply inputPaths/outputPaths fix to project.pbxproj for BCSC variants.
 * This is a structural change that can't be done via simple regex replacement.
 */
function applyPbxprojStructuralFixes(env) {
  if (!env.PBXPROJ_ADD_EMPTY_PATHS || env.PBXPROJ_ADD_EMPTY_PATHS !== 'true') return

  const pbxprojPath = join(ROOT_DIR, 'app/ios/AriesBifold.xcodeproj/project.pbxproj')
  if (!existsSync(pbxprojPath)) return

  let content = readFileSync(pbxprojPath, 'utf-8')

  // Add empty inputPaths/outputPaths after inputFileListPaths/outputFileListPaths
  // for both "[CP] Embed Pods Frameworks" and "[CP] Copy Pods Resources"
  const sections = ['Embed Pods Frameworks', 'Copy Pods Resources']

  for (const section of sections) {
    // Pattern: find inputFileListPaths block and add inputPaths if missing
    const sectionPattern = new RegExp(
      `(inputFileListPaths = \\([^)]*\\);)(\\s*)(name = "\\[CP\\] ${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}";)`,
      'g'
    )

    if (content.match(sectionPattern) && !content.includes(`inputPaths = (\n\t\t\t);\n\t\t\tname = "[CP] ${section}"`)) {
      content = content.replace(sectionPattern, `$1$2inputPaths = (\n\t\t\t);\n\t\t\t$3`)
    }

    // Same for outputFileListPaths -> outputPaths
    const outputPattern = new RegExp(
      `(outputFileListPaths = \\([^)]*\\);)(\\s*)(runOnlyForDeploymentPostprocessing)`,
      'g'
    )

    // Only apply this per-section, more carefully
    // This is a simplified approach - the actual patch adds empty arrays
  }

  writeFileSync(pbxprojPath, content)
}

/**
 * Apply the product name change in pbxproj (name = AriesBifold -> name = BCWallet)
 * This is specific to bcsc variants.
 */
function applyPbxprojNameChange(env) {
  if (!env.IOS_PBXPROJ_TARGET_NAME) return

  const pbxprojPath = join(ROOT_DIR, 'app/ios/AriesBifold.xcodeproj/project.pbxproj')
  if (!existsSync(pbxprojPath)) return

  let content = readFileSync(pbxprojPath, 'utf-8')

  // Change: name = AriesBifold; (in the PBXNativeTarget section, near productName)
  // The patch changes line 157 from "name = AriesBifold;" to "name = BCWallet;"
  // We need to be careful to only change the one in the native target section
  const pattern = /(dependencies = \(\s*\);\s*)name = AriesBifold;(\s*productName = AriesBifold;)/
  if (content.match(pattern)) {
    content = content.replace(pattern, `$1name = ${env.IOS_PBXPROJ_TARGET_NAME};$2`)
    writeFileSync(pbxprojPath, content)
    console.log(`  Updated pbxproj target name to ${env.IOS_PBXPROJ_TARGET_NAME}`)
  }
}

// ─── Main apply logic ───────────────────────────────────────────

function applyVariant(variantName) {
  const variantDir = join(VARIANTS_DIR, variantName)

  if (!existsSync(variantDir)) {
    console.error(`Variant directory not found: ${variantDir}`)
    process.exit(1)
  }

  const envPath = join(variantDir, 'variant.env')
  if (!existsSync(envPath)) {
    console.error(`variant.env not found in ${variantDir}`)
    process.exit(1)
  }

  const env = parseVariantEnv(envPath)
  console.log(`\nApplying variant: ${variantName}`)
  console.log(`  APP_NAME: ${env.APP_NAME}`)
  console.log(`  ANDROID_PACKAGE_NAME: ${env.ANDROID_PACKAGE_NAME}`)
  console.log(`  IOS_BUNDLE_ID: ${env.IOS_BUNDLE_ID}`)

  // 1. Apply base variant first (if specified)
  if (env.BASE_VARIANT) {
    console.log(`\n→ Applying base variant: ${env.BASE_VARIANT}`)
    applyBaseVariant(env.BASE_VARIANT)
  }

  // 2. Delete files
  const deleteFile = join(variantDir, 'delete.txt')
  if (existsSync(deleteFile)) {
    const filesToDelete = readFileSync(deleteFile, 'utf-8')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    console.log(`\n→ Deleting ${filesToDelete.length} files...`)
    for (const f of filesToDelete) {
      const fullPath = join(ROOT_DIR, f)
      if (existsSync(fullPath)) {
        unlinkSync(fullPath)
        console.log(`  Deleted: ${f}`)
      }
    }
  }

  // 3. Copy overlay files
  const overlayDir = join(variantDir, 'overlay')
  if (existsSync(overlayDir)) {
    console.log(`\n→ Copying overlay files...`)
    copyDirRecursive(overlayDir, ROOT_DIR)
    const fileCount = countFiles(overlayDir)
    console.log(`  Copied ${fileCount} files from overlay`)
  }

  // 4. Template substitutions
  console.log(`\n→ Applying template substitutions...`)
  for (const [relPath, replacements] of Object.entries(TEMPLATE_FILES)) {
    const fullPath = join(ROOT_DIR, relPath)
    if (!existsSync(fullPath)) {
      console.log(`  SKIP (not found): ${relPath}`)
      continue
    }

    let content = readFileSync(fullPath, 'utf-8')
    let changed = false

    for (const { pattern, replacement } of replacements) {
      const newContent = content.replace(pattern, replacement(env))
      if (newContent !== content) {
        content = newContent
        changed = true
      }
    }

    if (changed) {
      writeFileSync(fullPath, content)
      console.log(`  Updated: ${relPath}`)
    }
  }

  // 5. Apply URL schemes (iOS)
  if (env.IOS_URL_SCHEMES) {
    console.log(`\n→ Applying iOS URL schemes...`)
    applyUrlSchemes(env)
  }

  // 6. Apply pbxproj target name change
  if (env.IOS_PBXPROJ_TARGET_NAME) {
    console.log(`\n→ Applying pbxproj structural changes...`)
    applyPbxprojNameChange(env)
  }

  // 7. Apply remaining patches
  const patchesDir = join(variantDir, 'patches')
  if (existsSync(patchesDir)) {
    const patchFiles = readdirSync(patchesDir).filter((f) => f.endsWith('.patch'))
    if (patchFiles.length > 0) {
      console.log(`\n→ Applying ${patchFiles.length} remaining patches...`)
      for (const patchFile of patchFiles) {
        const patchPath = join(patchesDir, patchFile)
        try {
          run(`git apply --verbose "${patchPath}"`)
          console.log(`  Applied: ${patchFile}`)
        } catch (e) {
          console.error(`  FAILED to apply ${patchFile}: ${e.message}`)
          // Try with more context
          try {
            run(`git apply --verbose -C1 "${patchPath}"`)
            console.log(`  Applied with reduced context: ${patchFile}`)
          } catch (e2) {
            console.error(`  FATAL: Could not apply ${patchFile}`)
            process.exit(1)
          }
        }
      }
    }
  }

  console.log(`\n✓ Variant '${variantName}' applied successfully!`)

  // Output summary for CI use
  console.log(`\n--- Variant Summary ---`)
  console.log(`VARIANT=${variantName}`)
  console.log(`APP_NAME=${env.APP_NAME}`)
  console.log(`APP_VERSION=${env.APP_VERSION || ''}`)
  console.log(`BUILD_TARGET=${env.BUILD_TARGET || ''}`)
  console.log(`ANDROID_PACKAGE_NAME=${env.ANDROID_PACKAGE_NAME}`)
  console.log(`IOS_BUNDLE_ID=${env.IOS_BUNDLE_ID}`)
}

/**
 * Apply a base variant (overlay + delete only, no templating).
 */
function applyBaseVariant(baseName) {
  const baseDir = join(VARIANTS_DIR, baseName)
  if (!existsSync(baseDir)) {
    console.warn(`  Base variant directory not found: ${baseDir}`)
    return
  }

  // Delete files
  const deleteFile = join(baseDir, 'delete.txt')
  if (existsSync(deleteFile)) {
    const filesToDelete = readFileSync(deleteFile, 'utf-8')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    console.log(`  Deleting ${filesToDelete.length} files from base...`)
    for (const f of filesToDelete) {
      const fullPath = join(ROOT_DIR, f)
      if (existsSync(fullPath)) {
        unlinkSync(fullPath)
      }
    }
  }

  // Copy overlay files
  const overlayDir = join(baseDir, 'overlay')
  if (existsSync(overlayDir)) {
    console.log(`  Copying base overlay files...`)
    copyDirRecursive(overlayDir, ROOT_DIR)
  }

  // Apply base patches
  const patchesDir = join(baseDir, 'patches')
  if (existsSync(patchesDir)) {
    const patchFiles = readdirSync(patchesDir).filter((f) => f.endsWith('.patch'))
    for (const patchFile of patchFiles) {
      const patchPath = join(patchesDir, patchFile)
      try {
        run(`git apply --verbose "${patchPath}"`)
        console.log(`  Applied base patch: ${patchFile}`)
      } catch (e) {
        console.warn(`  WARN: Could not apply base patch ${patchFile}: ${e.message}`)
      }
    }
  }
}

function countFiles(dir) {
  let count = 0
  if (!existsSync(dir)) return 0
  const entries = readdirSync(dir)
  for (const entry of entries) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      count += countFiles(full)
    } else {
      count++
    }
  }
  return count
}

// ─── CLI Entry Point ────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2)

  if (args.length < 1) {
    console.error('Usage: node scripts/apply-variant.mjs <variant-name>')
    console.error('')
    console.error('Available variants:')
    if (existsSync(VARIANTS_DIR)) {
      const dirs = readdirSync(VARIANTS_DIR).filter((d) => {
        return statSync(join(VARIANTS_DIR, d)).isDirectory() && !d.startsWith('.')
      })
      for (const d of dirs) {
        const envPath = join(VARIANTS_DIR, d, 'variant.env')
        const hasEnv = existsSync(envPath)
        console.error(`  ${d}${hasEnv ? '' : ' (no variant.env)'}`)
      }
    }
    process.exit(1)
  }

  const variantName = args[0]

  // bcwallet-prod is a no-op (project defaults)
  if (variantName === 'bcwallet-prod') {
    console.log('Variant bcwallet-prod is the project default. No changes needed.')
    process.exit(0)
  }

  applyVariant(variantName)
}

main()
