import assert from 'node:assert'

import { Timeouts } from '../constants.js'

/**
 * Assert that an element has a non-empty accessibility label.
 * Optionally assert the label matches an expected string.
 *
 * @param testId - The raw testID string of the element to check
 * @param expectedLabel - An optional label to assert against. If not provided, only checks that a label exists
 */
export async function assertA11yLabel(testId: string, expectedLabel?: string) {
  const selector = driver.isIOS ? `~${testId}` : `android=new UiSelector().resourceId("${testId}")`
  const el = await $(selector)
  await el.waitForDisplayed({ timeout: Timeouts.elementVisible })
  const label = driver.isIOS ? await el.getAttribute('label') : await el.getAttribute('content-desc')
  assert.ok(label && label.trim().length > 0, `[a11y] "${testId}" has no accessibility label`)
  if (expectedLabel !== undefined) {
    assert.strictEqual(label.trim(), expectedLabel, `[a11y] "${testId}" has wrong accessibility label`)
  }
}

/**
 * Assert that a decorative element is hidden from assistive technology.
 * On iOS checks the 'accessible' attribute; on Android checks content-desc is empty.
 *
 * @param testId - The raw testID string of the element to check
 */
export async function assertHiddenFromA11y(testId: string) {
  const selector = driver.isIOS ? `~${testId}` : `android=new UiSelector().resourceId("${testId}")`
  const el = await $(selector)
  if (driver.isIOS) {
    const accessible = await el.getAttribute('accessible')
    assert.strictEqual(accessible, 'false', `[a11y] "${testId}" should be hidden from assistive technology`)
  } else {
    const desc = await el.getAttribute('content-desc')
    assert.ok(!desc || desc.trim().length === 0, `[a11y] "${testId}" should have no content-desc (decorative)`)
  }
}
