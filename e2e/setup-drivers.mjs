#!/usr/bin/env node

/**
 * Registers Appium drivers into e2e/.appium by running appium driver install.
 * Uses a project-local APPIUM_HOME so drivers stay in the workspace (avoids
 * ~/.appium permission issues and keeps the project self-contained).
 */

import { execSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = dirname(__dirname)
const appiumBin = join(projectRoot, 'node_modules', '.bin', 'appium')
const appiumHome = process.env.APPIUM_HOME || join(__dirname, '.appium')

const drivers = ['uiautomator2', 'xcuitest']
const home = process.env.HOME || process.env.USERPROFILE || '/tmp'

let failed = false
for (const driver of drivers) {
  try {
    execSync(`"${appiumBin}" driver install ${driver}`, {
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
