#!/usr/bin/env node

/**
 * Registers Appium drivers into e2e/.appium by running appium driver install.
 * Uses a project-local APPIUM_HOME so drivers stay in the workspace (avoids
 * ~/.appium permission issues and keeps the project self-contained).
 */

import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const e2eRoot = join(__dirname, '..')
const appiumBin = join(e2eRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'appium.cmd' : 'appium')
const appiumHome = process.env.APPIUM_HOME || join(e2eRoot, '.appium')

// Pin to Appium 2–compatible versions (latest driver registry defaults to Appium 2.13.1)
const drivers = ['uiautomator2@3.9.6', 'xcuitest@7.35.0']
const home = process.env.HOME || process.env.USERPROFILE || '/tmp'

let failed = false
for (const driver of drivers) {
  try {
    execFileSync(appiumBin, ['driver', 'install', driver], {
      stdio: 'inherit',
      cwd: home,
      env: { ...process.env, APPIUM_HOME: appiumHome },
    })
  } catch (e) {
    console.error(`Failed to install ${driver}:`, e.message)
    failed = true
  }
}
if (failed) process.exit(1)
