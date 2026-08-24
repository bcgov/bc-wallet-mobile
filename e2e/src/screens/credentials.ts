import { TestIds } from '../test-ids/registry.js'
import { bcsc, defineScreen } from './core/index.js'

/**
 * Credential lifecycle screen objects (wallet journey). All Bifold screens hosted in the BCSC Main
 * stack: the offer/proof screens render INSIDE `ConnectionLoading` (never navigated to directly),
 * the accept/sent "modals" are full-screen overlays, and details/list live under the Wallet tab.
 * Home's credential notification cards are NOT here — their four types share testIDs, so they are
 * driven by title copy via `helpers/notifications.ts`.
 */

const { credential, proof, common } = TestIds

/**
 * `CredentialOffer` — rendered inline once the offer arrives (goal-code path on the connection
 * screen, or a notification-card tap). Accept is gated on NetInfo reachability of the mediator;
 * Decline opens {@link DeclineOfferModal}.
 */
export const CredentialOfferScreen = defineScreen({
  self: bcsc(credential.offer.accept),
  primary: bcsc(credential.offer.accept),
  secondary: bcsc(credential.offer.decline),
  elements: {
    header: bcsc(credential.offer.header),
  },
})

/**
 * `CredentialOfferAccept` overlay — two MUTUALLY EXCLUSIVE phases: pending (`onTheWay` + `backToHome`)
 * swaps to completed (`self`/`added` + Done) the moment the credential is stored. `self` is the
 * COMPLETED phase deliberately: pending is transient and a fast issuance skips it outright, so it is
 * never an arrival marker. Wait for `added` with the DIDComm budget; `primary` (Done) then RESETS to
 * the Wallet tab (adapter-translated from Bifold's credential stack). A stall on `added` is the
 * issuance leg, not the tap. Nothing here scrolls, so a miss fails fast naming the phase on screen.
 */
export const CredentialOfferAcceptModal = defineScreen({
  self: bcsc(credential.offerAccept.added),
  primary: bcsc(credential.offerAccept.done),
  scroll: { maxScrolls: 0 },
  elements: {
    added: bcsc(credential.offerAccept.added),
    onTheWay: bcsc(credential.offerAccept.onTheWay), // pending phase — transient, diagnostics only
    backToHome: bcsc(credential.offerAccept.backToHome), // pending-phase button
  },
})

/**
 * `ProofRequest` — rendered inline by the connection screen for a proof notification. `self` is
 * Share deliberately: it is REPLACED by a `cancel` button when no stored credential satisfies the
 * request, so "Share visible" asserts both arrival AND satisfiability (its absence with `cancel`
 * present = cred-def mismatch between issuer and wallet). Decline opens the shared decline modal.
 */
export const ProofRequestScreen = defineScreen({
  self: bcsc(proof.request.share),
  primary: bcsc(proof.request.share),
  secondary: bcsc(proof.request.decline),
  elements: {
    loading: bcsc(proof.request.loading),
    cancel: bcsc(proof.request.cancel),
  },
})

/**
 * `ProofRequestAccept` overlay — the same two-phase shape as {@link CredentialOfferAcceptModal}:
 * `sending` swaps to `self`/`sent` when the presentation lands, and `self` is the SENT phase for the
 * same reason (sending is transient). `primary` (BackToHome) resets to Home.
 */
export const ProofSentModal = defineScreen({
  self: bcsc(proof.accept.sent),
  primary: bcsc(proof.accept.backToHome),
  scroll: { maxScrolls: 0 },
  elements: {
    sent: bcsc(proof.accept.sent),
    sending: bcsc(proof.accept.sending), // in-flight phase — transient, diagnostics only
  },
})

/**
 * A credential card in the Wallet list. The list itself (`ListCredentials` FlatList) has NO testID
 * and card testIDs are NOT unique per credential — safe here only because the journey holds at most
 * ONE stored credential at a time (the second offer is declined). `revoked` renders on the card only
 * once revocation is known. Tap `self` to open details.
 */
export const WalletCredentialCard = defineScreen({
  self: bcsc(credential.card.card),
  primary: bcsc(credential.card.card),
  elements: {
    name: bcsc(credential.card.name),
    issuer: bcsc(credential.card.issuer),
    revoked: bcsc(credential.card.revoked),
  },
})

/**
 * `CredentialDetails` — behind its own agent gate (`loading` may flash on entry). `issuedDate` is a
 * developer-mode-only row (absent in normal runs); the revocation fields render ONLY when the
 * issuer revoked with a notification (notify: true). `remove` sits at the bottom of the record —
 * scroll to it (`scrollToLink`).
 */
export const CredentialDetailsScreen = defineScreen({
  self: bcsc(credential.details.issuerName),
  back: bcsc(common.back),
  links: {
    remove: bcsc(credential.details.remove),
  },
  elements: {
    loading: bcsc(credential.details.loading),
    issuerName: bcsc(credential.details.issuerName),
    issuedDate: bcsc(credential.details.issuedDate),
    revokedDate: bcsc(credential.details.revokedDate),
    revocationMessage: bcsc(credential.details.revocationMessage),
  },
})

/** `CommonRemoveModal` (remove-credential usage) — confirm deletes and pops back. NB an RN Modal:
 *  confirm with `tapToNavigate` (entrance-animation bounds go stale under UiAutomator and a plain
 *  tap can land below the screen). */
export const RemoveCredentialModal = defineScreen({
  self: bcsc(credential.removeModal.confirm),
  primary: bcsc(credential.removeModal.confirm),
  secondary: bcsc(credential.removeModal.cancel),
})

/** `CommonRemoveModal` (decline-offer usage) — confirm declines (problem report) and resets to
 *  Home. Same RN-Modal tapToNavigate rule as {@link RemoveCredentialModal}. */
export const DeclineOfferModal = defineScreen({
  self: bcsc(credential.declineModal.confirm),
  primary: bcsc(credential.declineModal.confirm),
  secondary: bcsc(credential.declineModal.cancel),
})

/**
 * BCSC ContactChat — where a NO-goal-code connection lands (adapter reset: Tab/Home under it, so
 * `back` returns Home). The wallet journey's invitations carry a goal code precisely to avoid this
 * screen; modeled back-only as the recovery path if a landing ever changes.
 */
export const ContactChatScreen = defineScreen({
  back: bcsc(common.back),
})
