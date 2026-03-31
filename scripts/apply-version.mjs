#!/usr/bin/env node

/**
 * apply-version.mjs
 *
 * Sets the app version and build number for local iOS and Android builds.
 *
 * What it updates:
 *   iOS:     MARKETING_VERSION and CURRENT_PROJECT_VERSION in project.pbxproj
 *   Android: versionName and versionCode defaults in build.gradle
 *
 * Usage:
 *   node scripts/apply-version.mjs <version> <build>
 *
 * Examples:
 *   node scripts/apply-version.mjs 4.0.0 2801
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'

const ROOT_DIR = resolve(import.meta.dirname, '..')

const PBXPROJ_PATH = join(ROOT_DIR, 'app/ios/BCWallet.xcodeproj/project.pbxproj')
const GRADLE_PATH = join(ROOT_DIR, 'app/android/app/build.gradle')

function updatePbxproj(version, build) {
  if (!existsSync(PBXPROJ_PATH)) {
    console.warn('  SKIP: project.pbxproj not found')
    return
  }

  let content = readFileSync(PBXPROJ_PATH, 'utf-8')
  let changed = false

  const newContent = content
    .replace(/MARKETING_VERSION = [^;]+;/g, () => {
      changed = true
      return `MARKETING_VERSION = ${version};`
    })
    .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, () => {
      changed = true
      return `CURRENT_PROJECT_VERSION = ${build};`
    })

  if (changed) {
    writeFileSync(PBXPROJ_PATH, newContent)
    console.log(`  Updated project.pbxproj: version=${version} build=${build}`)
  } else {
    console.warn('  WARN: No version fields found in project.pbxproj')
  }
}

function updateGradle(version, build) {
  if (!existsSync(GRADLE_PATH)) {
    console.warn('  SKIP: build.gradle not found')
    return
  }

  let content = readFileSync(GRADLE_PATH, 'utf-8')
  let changed = false

  const newContent = content
    .replace(
      /(versionCode\s+System\.getenv\("VERSION_CODE"\)\s*\?\s*System\.getenv\("VERSION_CODE"\)\.toInteger\(\)\s*:\s*)\d+/,
      (_, prefix) => {
        changed = true
        return `${prefix}${build}`
      }
    )
    .replace(
      /(versionName\s+System\.getenv\("VERSION_NAME"\)\s*\?\s*System\.getenv\("VERSION_NAME"\)\.toString\(\)\s*:\s*)"[^"]+"/,
      (_, prefix) => {
        changed = true
        return `${prefix}"${version}"`
      }
    )

  if (changed) {
    writeFileSync(GRADLE_PATH, newContent)
    console.log(`  Updated build.gradle: version=${version} build=${build}`)
  } else {
    console.warn('  WARN: No version fields found in build.gradle')
  }
}

function main() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.error('Usage: node scripts/apply-version.mjs <version> <build>')
    console.error('')
    console.error('Examples:')
    console.error('  node scripts/apply-version.mjs 4.0.0 2801')
    process.exit(1)
  }

  const [version, build] = args

  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    console.error(`Invalid version format: ${version} (expected X.Y.Z)`)
    process.exit(1)
  }

  if (!/^\d+$/.test(build)) {
    console.error(`Invalid build number: ${build} (expected integer)`)
    process.exit(1)
  }

  console.log(`\nApplying version ${version} (build ${build})...`)

  updatePbxproj(version, build)
  updateGradle(version, build)

  console.log(`\n✓ Version applied successfully!`)
}

main()
