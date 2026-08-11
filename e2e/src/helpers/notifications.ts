import { Timeouts } from '../constants.js'
import { BaseScreen } from '../screens/core/BaseScreen.js'
import { TESTID_PREFIX, TestIds } from '../test-ids/registry.js'
import { swipeUpBy } from './gestures.js'
import { describeCurrentScreen } from './screens.js'

/**
 * Home's credential notification cards (`NotificationCard.tsx`). All four card types (offer, proof,
 * revocation, basic message) share the same testIDs, so cards are selected by their HEADER COPY.
 * Tapping the matched header lands inside `NotificationCardPressable`, so the tap bubbles to the
 * card's onPress — no index-alignment between header and pressable element lists needed.
 *
 * Content arrives ASYNCHRONOUSLY over DIDComm (nothing to scroll-hunt for before it exists), which
 * is why this is a poll helper and not a screen descriptor. NB the card's ✕ is a REAL decline for
 * offers and pending proofs — deliberately not wrapped here; decline via the offer/proof screens.
 */

/** The i18n titles (en) of the three card types the wallet journey drives
 *  (`Notification.*.Title` in `app/src/localization/en`). */
export const NOTIFICATION_TITLES = {
  credentialOffer: 'Credential offer',
  proofRequest: 'Proof request',
  revocation: 'Credential revoked',
} as const

export type NotificationTitle = (typeof NOTIFICATION_TITLES)[keyof typeof NOTIFICATION_TITLES]

const HEADER_TEST_ID = `${TESTID_PREFIX}${TestIds.main.notificationCard.headerText}`
const POLL_INTERVAL_MS = 2_000

const engine = new BaseScreen()

/**
 * The header element of the first on-screen notification card titled `title`, or undefined.
 * (First match is safe for the wallet journey: it never has two same-titled cards up at once.)
 */
export async function findNotificationCard(title: NotificationTitle) {
  const selector = driver.isIOS ? `~${HEADER_TEST_ID}` : `android=new UiSelector().resourceId("${HEADER_TEST_ID}")`
  const headers = await $$(selector)
  for (const header of headers) {
    let text = await header.getText().catch(() => '')
    if (!text && driver.isIOS) {
      text = (await header.getAttribute('label').catch(() => '')) ?? ''
    }
    if (text.trim() === title) return header
  }
  return undefined
}

/**
 * Poll until a card titled `title` is on screen. One scroll pass at half budget (cards can sit
 * below the unverified verification action card); on timeout the error names what WAS on screen.
 */
export async function waitForNotificationCard(
  title: NotificationTitle,
  timeoutMs: number = Timeouts.DIDCOMM_DELIVERY
) {
  const deadline = Date.now() + timeoutMs
  const scrollAfter = Date.now() + timeoutMs / 2
  let scrolled = false

  for (;;) {
    const card = await findNotificationCard(title)
    if (card) return card
    if (!scrolled && Date.now() > scrollAfter) {
      scrolled = true
      await swipeUpBy(0.25)
      continue
    }
    if (Date.now() > deadline) {
      throw new Error(
        `No "${title}" notification card within ${timeoutMs}ms. On screen: ${await describeCurrentScreen()}`
      )
    }
    await driver.pause(POLL_INTERVAL_MS)
  }
}

/** Wait for the card and open it (tap bubbles from the header to the card pressable). */
export async function tapNotificationCard(
  title: NotificationTitle,
  timeoutMs: number = Timeouts.DIDCOMM_DELIVERY
): Promise<void> {
  const card = await waitForNotificationCard(title, timeoutMs)
  await engine.waitForSteadyPosition(card)
  await card.click()
}
