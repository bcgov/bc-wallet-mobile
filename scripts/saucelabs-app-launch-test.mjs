#!/usr/bin/env node
/**
 * SauceLabs App Launch Verification Test
 *
 * Verifies that a mobile app can be installed and launched on a real device
 * via SauceLabs. Uses the W3C WebDriver protocol with Node.js native fetch
 * — no extra npm dependencies required.
 *
 * Required environment variables:
 *   SAUCE_USERNAME    – SauceLabs username
 *   SAUCE_ACCESS_KEY  – SauceLabs access key
 *   PLATFORM_NAME     – 'iOS' or 'Android'
 *   APP_FILENAME      – Filename in SauceLabs storage (e.g. 'MyApp-42.ipa')
 *   VARIANT           – Variant name: 'bcsc-dev', 'bcwallet-prod', etc.
 *
 * Optional environment variables:
 *   TEST_NAME         – Human-readable name shown in SauceLabs dashboard
 *   BUILD_NAME        – Build identifier for SauceLabs dashboard
 *   SAVE_PAGE_SOURCE  – 'true' to save page-source XML to /tmp (default: true)
 *
 * ── Local development ──────────────────────────────────────────────────
 * For manual runs outside CI, create a file at:
 *
 *   scripts/.env.saucelabs
 *
 * with KEY=VALUE lines (# comments and blank lines are ignored).
 * This file is gitignored.  Example contents:
 *
 *   SAUCE_USERNAME=your-username
 *   SAUCE_ACCESS_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 *   PLATFORM_NAME=Android
 *   APP_FILENAME=BCSC-Dev-123.aab
 *   VARIANT=bcsc-dev
 *
 * Then run:
 *   node scripts/saucelabs-app-launch-test.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// ── Load local .env file if present ────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOCAL_ENV_PATH = resolve(__dirname, '.env.saucelabs')

if (existsSync(LOCAL_ENV_PATH)) {
  console.log(`Loading local env from ${LOCAL_ENV_PATH}`)
  const lines = readFileSync(LOCAL_ENV_PATH, 'utf-8').split('\n')
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    // Strip surrounding quotes (single or double)
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = val
    }
  }
  console.log('')
}

// ── Constants ──────────────────────────────────────────────────────────

const SAUCE_REGION = 'us-west-1'
const APPIUM_URL = `https://ondemand.${SAUCE_REGION}.saucelabs.com/wd/hub`
const REST_API_URL = `https://api.${SAUCE_REGION}.saucelabs.com/rest/v1`

// How long to wait for the app to stabilize after launch (ms).
// Real-device boot + app install + first render typically takes 10-30s.
const APP_STABILIZE_DELAY_MS = 25_000

// After tapping an element, wait for the next screen to render.
const POST_TAP_DELAY_MS = 5_000

function buildHeaders(auth) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Basic ${auth}`,
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// ── WebDriver helpers ──────────────────────────────────────────────────

async function createSession(headers, capabilities) {
  const res = await fetch(`${APPIUM_URL}/session`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      capabilities: { alwaysMatch: capabilities },
    }),
  })

  const data = await res.json()

  if (!res.ok || !data.value?.sessionId) {
    throw new Error(
      `Failed to create session (HTTP ${res.status}): ${JSON.stringify(data, null, 2)}`
    )
  }

  return data.value.sessionId
}

async function isSessionAlive(headers, sessionId) {
  const res = await fetch(`${APPIUM_URL}/session/${sessionId}`, {
    method: 'GET',
    headers,
  })
  return res.ok
}

async function getPageSource(headers, sessionId) {
  const res = await fetch(`${APPIUM_URL}/session/${sessionId}/source`, {
    method: 'GET',
    headers,
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.value || null
}

/**
 * Find an element by accessibility id (cross-platform).
 * Returns the element ELEMENT id string, or null if not found.
 */
async function findElementByAccessibilityId(headers, sessionId, accessibilityId) {
  const res = await fetch(`${APPIUM_URL}/session/${sessionId}/element`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      using: 'accessibility id',
      value: accessibilityId,
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  // W3C response: value.ELEMENT or value['element-6066-...']
  const el = data.value
  if (!el) return null
  return el.ELEMENT || el['element-6066-11e4-a52e-4f735466cecf'] || Object.values(el)[0] || null
}

/**
 * Find an element by resource-id (Android only, uses UiAutomator selector).
 * Falls back to XPath for iOS.
 */
async function findElementByResourceId(headers, sessionId, resourceId, isIOS) {
  if (isIOS) {
    // On iOS there's no resource-id; use accessibility id instead
    return findElementByAccessibilityId(headers, sessionId, resourceId)
  }
  // Android: use id strategy
  const res = await fetch(`${APPIUM_URL}/session/${sessionId}/element`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      using: 'id',
      value: resourceId,
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  const el = data.value
  if (!el) return null
  return el.ELEMENT || el['element-6066-11e4-a52e-4f735466cecf'] || Object.values(el)[0] || null
}

/**
 * Tap / click an element by its ELEMENT id.
 */
async function clickElement(headers, sessionId, elementId) {
  const res = await fetch(`${APPIUM_URL}/session/${sessionId}/element/${elementId}/click`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(`Click failed (HTTP ${res.status}): ${JSON.stringify(data)}`)
  }
}

/**
 * Take a screenshot and return it as a base64 string.
 */
async function takeScreenshot(headers, sessionId) {
  const res = await fetch(`${APPIUM_URL}/session/${sessionId}/screenshot`, {
    method: 'GET',
    headers,
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.value || null
}

async function deleteSession(headers, sessionId) {
  try {
    await fetch(`${APPIUM_URL}/session/${sessionId}`, {
      method: 'DELETE',
      headers,
    })
  } catch (e) {
    console.warn(`Warning: failed to delete session: ${e.message}`)
  }
}

// ── SauceLabs REST API helpers ─────────────────────────────────────────

async function updateJobStatus(auth, username, sessionId, passed) {
  try {
    await fetch(`${REST_API_URL}/${username}/jobs/${sessionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({ passed }),
    })
  } catch (e) {
    console.warn(`Warning: failed to update job status: ${e.message}`)
  }
}

// ── Page source persistence ────────────────────────────────────────────

function savePageSource(source, label) {
  if (!source) return
  const safeName = label.replace(/[^a-zA-Z0-9_-]/g, '_')
  const filePath = `/tmp/page-source-${safeName}.xml`
  try {
    writeFileSync(filePath, source, 'utf-8')
    console.log(`  Saved page source → ${filePath}`)
  } catch (e) {
    console.warn(`  Warning: could not save page source: ${e.message}`)
  }
}

function saveScreenshot(base64Data, label) {
  if (!base64Data) return
  const safeName = label.replace(/[^a-zA-Z0-9_-]/g, '_')
  const filePath = `/tmp/screenshot-${safeName}.png`
  try {
    writeFileSync(filePath, Buffer.from(base64Data, 'base64'))
    console.log(`  Saved screenshot  → ${filePath}`)
  } catch (e) {
    console.warn(`  Warning: could not save screenshot: ${e.message}`)
  }
}

// ── Variant-specific interactions ──────────────────────────────────────

/**
 * BCSC variants (bcsc-dev, bcsc-test, bcsc-qa, bcsc-prod):
 *   First screen has an "Add Account" button.
 *   Tap it to verify navigation works.
 */
async function interactBCSC(headers, sessionId, isIOS) {
  console.log('Running BCSC variant interactions …')

  // Try accessibility id first, then resource-id
  let el = await findElementByAccessibilityId(headers, sessionId, 'AddAccount')
  if (!el) {
    el = await findElementByResourceId(headers, sessionId, 'com.ariesbifold:id/AddAccount', isIOS)
  }

  if (el) {
    console.log('  Found "Add Account" button — tapping …')
    await clickElement(headers, sessionId, el)
    await sleep(POST_TAP_DELAY_MS)
    console.log('  Tapped "Add Account" successfully')
    return true
  }

  console.warn('  Warning: "Add Account" button not found on screen')
  return false
}

/**
 * BCWallet variants (bcwallet-prod):
 *   First screen is "Is this App for you?"
 *   1. Tap the "I have confirmed this app is for me" checkbox
 *   2. Tap the "Continue" button
 */
async function interactBCWallet(headers, sessionId, isIOS) {
  console.log('Running BCWallet variant interactions …')

  // Step 1: Tap the "I agree" checkbox
  let checkbox = await findElementByAccessibilityId(headers, sessionId, 'IAgree')
  if (!checkbox) {
    checkbox = await findElementByResourceId(headers, sessionId, 'com.ariesbifold:id/IAgree', isIOS)
  }

  if (checkbox) {
    console.log('  Found "I Agree" checkbox — tapping …')
    await clickElement(headers, sessionId, checkbox)
    await sleep(2_000)
    console.log('  Tapped "I Agree" checkbox')
  } else {
    console.warn('  Warning: "I Agree" checkbox not found on screen')
    return false
  }

  // Step 2: Tap the "Continue" button
  let continueBtn = await findElementByAccessibilityId(headers, sessionId, 'Continue')
  if (!continueBtn) {
    continueBtn = await findElementByResourceId(headers, sessionId, 'com.ariesbifold:id/Continue', isIOS)
  }

  if (continueBtn) {
    console.log('  Found "Continue" button — tapping …')
    await clickElement(headers, sessionId, continueBtn)
    await sleep(POST_TAP_DELAY_MS)
    console.log('  Tapped "Continue" successfully')
    return true
  }

  console.warn('  Warning: "Continue" button not found on screen')
  return false
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  const {
    SAUCE_USERNAME,
    SAUCE_ACCESS_KEY,
    PLATFORM_NAME,
    APP_FILENAME,
    VARIANT = '',
    TEST_NAME = 'App Launch Test',
    BUILD_NAME = 'unknown',
    SAVE_PAGE_SOURCE = 'true',
  } = process.env

  if (!SAUCE_USERNAME || !SAUCE_ACCESS_KEY) {
    console.error('Error: SAUCE_USERNAME and SAUCE_ACCESS_KEY are required')
    process.exit(1)
  }

  if (!PLATFORM_NAME || !APP_FILENAME) {
    console.error('Error: PLATFORM_NAME and APP_FILENAME are required')
    process.exit(1)
  }

  if (!VARIANT) {
    console.error('Error: VARIANT is required (e.g. bcsc-dev, bcwallet-prod)')
    process.exit(1)
  }

  const shouldSaveSource = SAVE_PAGE_SOURCE !== 'false'
  const auth = Buffer.from(`${SAUCE_USERNAME}:${SAUCE_ACCESS_KEY}`).toString(
    'base64'
  )
  const headers = buildHeaders(auth)

  const isIOS = PLATFORM_NAME.toLowerCase() === 'ios'
  const isBCSC = VARIANT.startsWith('bcsc')
  const label = `${VARIANT}-${PLATFORM_NAME.toLowerCase()}`

  const capabilities = {
    platformName: isIOS ? 'iOS' : 'Android',
    'appium:app': `storage:filename=${APP_FILENAME}`,
    'appium:deviceName': isIOS ? 'iPhone.*' : 'Google.*',
    'appium:automationName': isIOS ? 'XCUITest' : 'UiAutomator2',
    // Generous timeout — we only send a few commands after launch
    'appium:newCommandTimeout': 120,
    'sauce:options': {
      name: TEST_NAME,
      build: BUILD_NAME,
      appiumVersion: 'latest',
    },
  }

  console.log(`Platform : ${PLATFORM_NAME}`)
  console.log(`Variant  : ${VARIANT}`)
  console.log(`App      : ${APP_FILENAME}`)
  console.log(`Test     : ${TEST_NAME}`)
  console.log('')

  let sessionId
  let passed = false

  try {
    // 1. Create Appium session — installs and launches app on a real device
    console.log('Creating SauceLabs Appium session …')
    sessionId = await createSession(headers, capabilities)
    console.log(`Session  : ${sessionId}`)
    console.log(`Dashboard: https://app.saucelabs.com/tests/${sessionId}`)
    console.log('')

    // 2. Wait for the app to fully load and stabilise
    console.log(`Waiting ${APP_STABILIZE_DELAY_MS / 1000}s for app to stabilise …`)
    await sleep(APP_STABILIZE_DELAY_MS)

    // 3. Verify session is still alive (app didn't crash during startup)
    console.log('Checking session status …')
    const alive = await isSessionAlive(headers, sessionId)
    if (!alive) {
      throw new Error('Session is no longer active — app may have crashed on launch')
    }
    console.log('Session is active')
    console.log('')

    // 4. Capture initial page source (screen metadata / XML elements)
    console.log('Capturing initial page source …')
    const initialSource = await getPageSource(headers, sessionId)
    if (initialSource) {
      console.log(`  Page source: ${initialSource.length} characters`)
      if (shouldSaveSource) savePageSource(initialSource, `${label}-initial`)
      if (initialSource.length < 100) {
        console.warn('  Warning: page source is very short — app may not have fully loaded')
      }
    } else {
      console.warn('  Warning: could not retrieve page source')
    }

    // Save initial screenshot
    const initialScreenshot = await takeScreenshot(headers, sessionId)
    if (shouldSaveSource) saveScreenshot(initialScreenshot, `${label}-initial`)
    console.log('')

    // 5. Run variant-specific interactions
    if (isBCSC) {
      await interactBCSC(headers, sessionId, isIOS)
    } else {
      await interactBCWallet(headers, sessionId, isIOS)
    }
    console.log('')

    // 6. Capture post-interaction page source and screenshot
    console.log('Capturing post-interaction state …')
    const postSource = await getPageSource(headers, sessionId)
    if (postSource) {
      console.log(`  Page source: ${postSource.length} characters`)
      if (shouldSaveSource) savePageSource(postSource, `${label}-post-interaction`)
    }
    const postScreenshot = await takeScreenshot(headers, sessionId)
    if (shouldSaveSource) saveScreenshot(postScreenshot, `${label}-post-interaction`)

    // 7. Final session-alive check
    const stillAlive = await isSessionAlive(headers, sessionId)
    if (!stillAlive) {
      throw new Error('Session died after interaction — app may have crashed')
    }

    passed = true
    console.log('')
    console.log('PASS: App launched and interactions completed successfully')
  } catch (error) {
    console.error('')
    console.error(`FAIL: ${error.message}`)
    process.exitCode = 1
  } finally {
    if (sessionId) {
      await updateJobStatus(auth, SAUCE_USERNAME, sessionId, passed)
      await deleteSession(headers, sessionId)
      console.log('Session cleaned up')
    }
  }
}

main()
