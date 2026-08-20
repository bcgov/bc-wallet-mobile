import assert from 'node:assert/strict'
import {
  createInvitation,
  getIssuerConfig,
  getIssuerStatus,
  revokeCredential,
  sendBasicMessage,
  sendCredentialOffer,
  sendProofRequest,
  toWalletDeepLink,
  waitForConnectionActive,
  waitForCredExState,
  waitForPresentationVerified,
} from '../../../src/api/index.js'
import { Timeouts } from '../../../src/constants.js'
import { skipToHome } from '../../../src/flows/onboarding.js'
import { findByA11yLabel } from '../../../src/helpers/a11y.js'
import { dispatchDeepLink, getCurrentAppId } from '../../../src/helpers/deep-link.js'
import { NOTIFICATION_TITLES, tapNotificationCard } from '../../../src/helpers/notifications.js'
import { describeCurrentScreen } from '../../../src/helpers/screens.js'
import { BaseScreen } from '../../../src/screens/core/index.js'
import {
  CredentialDetailsScreen,
  CredentialOfferAcceptModal,
  CredentialOfferScreen,
  DeclineOfferModal,
  ProofRequestScreen,
  ProofSentModal,
  RemoveCredentialModal,
  WalletCredentialCard,
} from '../../../src/screens/credentials.js'
import {
  ContactChatScreen,
  ContactDetailScreen,
  ContactsScreen,
  EditContactNameScreen,
  HomeScreen,
  RemoveContactScreen,
  SettingsScreen,
  TabBar,
  WalletScreen,
} from '../../../src/screens/main.js'

/** The invitation label — becomes the contact name and the "{{label}} is offering you…" copy. */
const ISSUER_CONTACT_LABEL = 'BC Wallet E2E Issuer'
/** The rename the contacts block applies — every later selector uses this (row labels ARE the name). */
const RENAMED_CONTACT_NAME = 'E2E Renamed Issuer'
/** Engine handle for label/text-level asserts (contact rows and chat bubbles carry no testIDs). */
const engine = new BaseScreen()
/** Attribute names must match the provisioned schema (api/issuer.ts ISSUER_SCHEMA_ATTRIBUTES). */
const CREDENTIAL_ATTRIBUTES = {
  given_name: 'E2E',
  family_name: 'Wallet',
  issued_at: new Date().toISOString().slice(0, 10),
}

/**
 * Wallet journey: the full DIDComm credential lifecycle against the runner-driven issuer
 * (src/api/issuer.ts; agent setup in e2e/issuer/). Connection via OOB deep link (no camera), offer
 * accept, list/details, proof share with an ISSUER-SIDE cryptographic verification assert, second
 * offer declined, revocation notification, delete → empty again.
 *
 * Arrange is the cheap unverified `skipToHome()` — the Wallet tab, the Credo agent, AND the Contacts
 * feature are all reachable unverified (Main settings always wires the Contacts row), so the
 * contacts-populated checkpoints ride THIS journey's connection, appended after the credential
 * lifecycle: list/details → pin toggle → issuer-sent chat message → rename → remove (which destroys
 * the connection, so it runs last).
 *
 * Journey-wide rules:
 *  - NEVER `driver.background()`: incoming DIDComm rides the mediator's live-pickup socket, which
 *    only runs foregrounded (push is not configured for e2e builds).
 *  - Select Home notification cards by TITLE copy only (all four card types share testIDs, and the
 *    unverified verification action card is always present).
 *  - Every issuer-side wait names the record state it last saw; every UI wait for async DIDComm
 *    content uses Timeouts.DIDCOMM_DELIVERY.
 */
describe('Wallet journey: DIDComm credential lifecycle', () => {
  let connectionId: string
  /** The accepted credential's exchange id — revoked in the revocation checkpoint. */
  let acceptedCredExId: string
  let declinedCredExId: string
  let presExId: string

  before(async () => {
    // Fail before paying for an Appium session: throws with the setup hint when no issuer is
    // configured, and pings the admin API so an unreachable/misconfigured issuer is a named failure.
    getIssuerConfig()
    const status = await getIssuerStatus()
    console.log(`[wallet-journey] issuer reachable: ${status.label} (ACA-Py ${status.version})`)
  })

  it('onboards and skips verification to Home', async () => {
    await skipToHome()
  })

  it('primes the wallet: agent ready and empty state', async () => {
    // Reaching the empty state behind the Wallet.Loading gates proves the Credo agent AND its
    // mediator socket are live BEFORE the deep link goes out (the app's own pickup restart on
    // deep-link receipt is the safety net, not the plan) — and it is the precondition the final
    // checkpoint returns to.
    await TabBar.link('wallet')
    await WalletScreen.expectVisible(Timeouts.COLD_START)
    await TabBar.link('home')
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('connects to the issuer via an OOB deep link (issuer-verified)', async () => {
    const appId = await getCurrentAppId()
    // aries.vc.issue makes ConnectionLoading WAIT for the offer and render it inline — the next
    // checkpoint's screen. (No goal code would land in ContactChat instead.) Do not press Android
    // back while it waits: the oobRecordId path blocks the hardware back button.
    const invitation = await createInvitation({ label: ISSUER_CONTACT_LABEL, goalCode: 'aries.vc.issue' })
    await dispatchDeepLink(toWalletDeepLink(invitation.invitationUrl), appId)
    // The issuer-side record reaching active IS the connection assert — it proves the wallet
    // received the invitation, exchanged DIDs, and (as a side effect) that a contact now exists,
    // without touching the verification-gated Contacts UI.
    ;({ connectionId } = await waitForConnectionActive({ invitationMsgId: invitation.invitationMsgId }))
  })

  it('receives the credential offer and accepts it', async () => {
    ;({ credExId: acceptedCredExId } = await sendCredentialOffer(connectionId, CREDENTIAL_ATTRIBUTES))
    await CredentialOfferScreen.expectVisible(Timeouts.DIDCOMM_DELIVERY)
    await CredentialOfferScreen.tap('primary') // Accept (gated on NetInfo reaching the mediator)
    // The accept overlay's pending phase is NOT asserted: it is mutually exclusive with the added
    // phase and a fast issuance swaps straight past it. The issuer-side wait is the better tap
    // diagnostic anyway — a swallowed Accept leaves the exchange at offer-sent, which it names. It
    // also unsticks a non-auto-issuing instance (the client issues at request-received).
    await waitForCredExState(acceptedCredExId, 'done')
    await CredentialOfferAcceptModal.waitFor('added', Timeouts.DIDCOMM_DELIVERY)
    // Modal confirms use tapToNavigate: RN Modals slide in from below and UiAutomator can hold the
    // below-screen entrance bounds, silently missing a plain tap — re-tap until the modal is gone.
    await CredentialOfferAcceptModal.tapToNavigate('primary') // Done → resets to the Wallet tab
  })

  it('shows the credential in the wallet list and its details', async () => {
    // Done reset the tabs onto Wallet; the agent gates re-run on the remount, so allow the big budget.
    await WalletCredentialCard.expectVisible(Timeouts.COLD_START)
    const cardIssuer = await WalletCredentialCard.read('issuer')
    assert.ok(cardIssuer.includes(ISSUER_CONTACT_LABEL), `card issuer "${cardIssuer}" should carry the contact label`)
    // No OCA bundle exists for this cred def, so the DISPLAY NAME is derived from the cred-def tag —
    // assert presence, never exact copy.
    const cardName = await WalletCredentialCard.read('name')
    assert.ok(cardName.trim().length > 0, 'credential card should render a derived credential name')

    await WalletCredentialCard.tap('primary')
    await CredentialDetailsScreen.expectVisible(Timeouts.SCREEN_TRANSITION) // its own agent gate may flash
    // IssuedDate (like JSONDetails) is a developer-mode-only row — the issuer line is the
    // normal-mode "details rendered" assert.
    const detailsIssuer = await CredentialDetailsScreen.read('issuerName')
    assert.ok(detailsIssuer.includes(ISSUER_CONTACT_LABEL), `details issuer "${detailsIssuer}" should be the contact`)
    await CredentialDetailsScreen.back.tap() // → wallet list
    await WalletCredentialCard.expectVisible(Timeouts.SCREEN_TRANSITION)
    await TabBar.link('home') // proof + decline checkpoints drive the Home notification cards
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('shares a proof and the issuer verifies it cryptographically', async () => {
    ;({ presExId } = await sendProofRequest(connectionId))
    await tapNotificationCard(NOTIFICATION_TITLES.proofRequest)
    try {
      // self is Share — visible means the request arrived AND the stored credential satisfies it.
      await ProofRequestScreen.expectVisible(Timeouts.DIDCOMM_DELIVERY)
    } catch (error) {
      if (await ProofRequestScreen.isVisible('cancel')) {
        // Bifold swaps Share for Cancel when nothing satisfies the request.
        throw new Error(
          'Proof request rendered without Share: no stored credential satisfies it — cred-def mismatch between issuer and wallet'
        )
      }
      const detail = error instanceof Error ? error.message : String(error)
      throw new Error(`Proof request screen did not render (${detail}). On screen: ${await describeCurrentScreen()}`)
    }
    await ProofRequestScreen.tap('primary') // Share
    // Sending includes building the non-revocation proof (tails fetch) — allow the DIDComm budget.
    await ProofSentModal.waitFor('sent', Timeouts.DIDCOMM_DELIVERY)
    // The core assert of the journey: the ISSUER's agent cryptographically verified what was shared.
    const { verified } = await waitForPresentationVerified(presExId)
    assert.equal(verified, true, 'issuer-side verification of the shared proof failed')
    await ProofSentModal.tapToNavigate('primary') // Back to Home (modal — see the accept checkpoint)
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('declines a second credential offer (issuer-verified)', async () => {
    // Same connection — no new invitation. The FIRST offer's card left the list on acceptance, so
    // title-matching cannot hit a stale card.
    ;({ credExId: declinedCredExId } = await sendCredentialOffer(connectionId, CREDENTIAL_ATTRIBUTES))
    await tapNotificationCard(NOTIFICATION_TITLES.credentialOffer)
    await CredentialOfferScreen.expectVisible(Timeouts.DIDCOMM_DELIVERY)
    // Screen-level decline (not the card ✕ — same end state, but this covers the modal UI too).
    await CredentialOfferScreen.tap('secondary')
    await DeclineOfferModal.expectVisible(Timeouts.SCREEN_TRANSITION)
    await DeclineOfferModal.tapToNavigate('primary') // → declineOffer + problem report, resets to Home
    // The problem report surfaces issuer-side as the exchange abandoning.
    await waitForCredExState(declinedCredExId, 'abandoned')
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('receives the revocation notification and sees the revoked details', async () => {
    // notify: true is what makes the wallet's revoked-details fields render at all.
    await revokeCredential({ credExId: acceptedCredExId, connectionId })
    await tapNotificationCard(NOTIFICATION_TITLES.revocation) // the red Warning card
    await CredentialDetailsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await CredentialDetailsScreen.waitFor('revokedDate', Timeouts.SCREEN_TRANSITION)
    await CredentialDetailsScreen.waitFor('revocationMessage', Timeouts.ELEMENT_VISIBLE)
  })

  it('deletes the credential and returns to the empty wallet', async () => {
    // Still on the revoked credential's details (reached from the notification, so removal pops
    // back to Home).
    await CredentialDetailsScreen.scrollToLink('remove')
    await CredentialDetailsScreen.link('remove')
    await RemoveCredentialModal.expectVisible(Timeouts.SCREEN_TRANSITION)
    await RemoveCredentialModal.tapToNavigate('primary')
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    // Full circle to the second checkpoint's precondition: the empty wallet.
    await TabBar.link('wallet')
    await WalletScreen.expectVisible(Timeouts.COLD_START)
  })

  // ---- Contacts, populated by this journey's connection (deleting the credential kept it) ----

  it('opens the populated Contacts list and the issuer contact', async () => {
    await TabBar.link('home')
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await HomeScreen.tap('menu')
    await SettingsScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await SettingsScreen.link('contacts') // NOT verified-gated — Main settings always wires the row
    // Populated proof: the search field renders ONLY with rows, the empty-state control only without
    // (they are mutually exclusive); the agent gate re-runs on entry, so allow the big budget.
    await ContactsScreen.waitFor('search', Timeouts.COLD_START)
    assert.equal(await ContactsScreen.isVisible('whatAreContacts'), false, 'empty-state control must not render')
    // Rows carry NO testID — the a11y label IS the contact name (the invitation label).
    const row = findByA11yLabel(ISSUER_CONTACT_LABEL)
    await row.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
    await row.click()
    await ContactDetailScreen.expectVisible(Timeouts.COLD_START) // its own agent gate
    assert.equal(await ContactDetailScreen.isVisible('viewJson'), false, 'ViewJSON is developer-mode-only')
  })

  it('pins and unpins the contact from its details', async () => {
    // One button whose id flips with the state — waiting for the other id IS the toggle assert.
    await ContactDetailScreen.link('pin')
    await ContactDetailScreen.waitFor('unpin', Timeouts.SCREEN_TRANSITION)
    await ContactDetailScreen.link('unpin')
    await ContactDetailScreen.waitFor('pin', Timeouts.SCREEN_TRANSITION)
  })

  it('receives an issuer-sent chat message', async () => {
    // Chat SEND is not automatable (the composer has no testID and an empty a11y label) — RECEIVE is:
    // the issuer pushes a basic message over the still-open connection and the bubble is plain text.
    const probe = `e2e chat probe ${Date.now()}`
    await sendBasicMessage(connectionId, probe)
    await ContactDetailScreen.link('message')
    await engine.waitForText(probe, Timeouts.DIDCOMM_DELIVERY)
    await ContactChatScreen.back.tap() // → contact details
    await ContactDetailScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })

  it('renames the contact and the list row carries the new name', async () => {
    await ContactDetailScreen.link('editName')
    await EditContactNameScreen.expectVisible(Timeouts.COLD_START) // agent-gated like the details
    await EditContactNameScreen.fill('name', RENAMED_CONTACT_NAME) // replaces the pre-filled label
    await EditContactNameScreen.tap('primary') // Continue → dispatches the alternate name, pops back
    await ContactDetailScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
    await ContactDetailScreen.back.tap() // → contacts list
    // The persist assert: the row's label (its only handle) now IS the new name.
    const renamedRow = findByA11yLabel(RENAMED_CONTACT_NAME)
    await renamedRow.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
  })

  it('removes the contact and returns to the empty list', async () => {
    // LAST in the block: removal deletes the records AND the connection — nothing DIDComm can follow.
    const row = findByA11yLabel(RENAMED_CONTACT_NAME)
    await row.click()
    await ContactDetailScreen.expectVisible(Timeouts.COLD_START)
    await ContactDetailScreen.link('remove')
    await RemoveContactScreen.expectVisible(Timeouts.COLD_START) // modal, agent-gated; no header back
    await RemoveContactScreen.tap('primary') // ConfirmRemove → pops to the list on success
    // Empty proof mirrors the populated proof: the empty-state control is back. NB success
    // popToTop()s to the tab root BEFORE re-pushing Contacts — this list sits directly over Home,
    // so its back skips Settings.
    await ContactsScreen.expectVisible(Timeouts.COLD_START)
    await ContactsScreen.back.tap() // → Home (not Settings — see above)
    await HomeScreen.expectVisible(Timeouts.SCREEN_TRANSITION)
  })
})
