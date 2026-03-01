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
 *
 * Optional environment variables:
 *   TEST_NAME         – Human-readable name shown in SauceLabs dashboard
 *   BUILD_NAME        – Build identifier for SauceLabs dashboard
 */

const SAUCE_REGION = 'us-west-1'
const APPIUM_URL = `https://ondemand.${SAUCE_REGION}.saucelabs.com/wd/hub`
const REST_API_URL = `https://api.${SAUCE_REGION}.saucelabs.com/rest/v1`

// How long to wait for the app to stabilize after launch (ms).
// Real-device boot + app install + first render typically takes 10-20s.
const APP_STABILIZE_DELAY_MS = 20_000

function buildHeaders(auth) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Basic ${auth}`,
  }
}

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

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  const {
    SAUCE_USERNAME,
    SAUCE_ACCESS_KEY,
    PLATFORM_NAME,
    APP_FILENAME,
    TEST_NAME = 'App Launch Test',
    BUILD_NAME = 'unknown',
  } = process.env

  if (!SAUCE_USERNAME || !SAUCE_ACCESS_KEY) {
    console.error('Error: SAUCE_USERNAME and SAUCE_ACCESS_KEY are required')
    process.exit(1)
  }

  if (!PLATFORM_NAME || !APP_FILENAME) {
    console.error('Error: PLATFORM_NAME and APP_FILENAME are required')
    process.exit(1)
  }

  const auth = Buffer.from(`${SAUCE_USERNAME}:${SAUCE_ACCESS_KEY}`).toString(
    'base64'
  )
  const headers = buildHeaders(auth)

  const isIOS = PLATFORM_NAME.toLowerCase() === 'ios'

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
    console.log(
      `Dashboard: https://app.saucelabs.com/tests/${sessionId}`
    )
    console.log('')

    // 2. Wait for the app to fully load and stabilise
    console.log(
      `Waiting ${APP_STABILIZE_DELAY_MS / 1000}s for app to stabilise …`
    )
    await new Promise((resolve) => setTimeout(resolve, APP_STABILIZE_DELAY_MS))

    // 3. Verify session is still alive (app didn't crash during startup)
    console.log('Checking session status …')
    const alive = await isSessionAlive(headers, sessionId)
    if (!alive) {
      throw new Error(
        'Session is no longer active — app may have crashed on launch'
      )
    }
    console.log('Session is active')

    // 4. Verify the app rendered UI by fetching the page source
    console.log('Fetching page source to verify UI …')
    const source = await getPageSource(headers, sessionId)
    if (source) {
      console.log(`Page source: ${source.length} characters`)
      if (source.length < 100) {
        console.warn(
          'Warning: page source is very short — app may not have fully loaded'
        )
      }
    } else {
      console.warn('Warning: could not retrieve page source')
    }

    passed = true
    console.log('')
    console.log('PASS: App launched successfully on real device')
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
