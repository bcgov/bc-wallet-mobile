# Conventions

Design and UI/UX decisions for bc-wallet-mobile. Add an entry here when a pattern is established or an approach is explicitly chosen over an alternative.

---

## UI Feedback: Use Banner Messages, Not Toast Notifications

Use banner messages (inline, persistent contextual alerts) instead of toast notifications for user feedback.

**Why:** Banners are more accessible, remain visible until dismissed, and fit better within screen flows than transient toasts which can be missed or obscure content.

## UI Interaction: Allow users to access screens before async resources are ready

Where possible, users should be able to access screens or tools before async resources
(e.g. wallet initialization) are ready. Rather than blocking navigation, show a banner
message or text on the screen itself informing the user that the feature isn't available yet and to try again shortly.

## Waiting screens

BCSC loading overlays, video submission, video-call waits, and transfer-scan processing use the shared `WaitingScreenContent`
and `BCAnimatedLoadingIcon`. Center the illustration in the safe-area viewport,
with the heading between the optional status row and illustration. Allow scrolling
for larger text and short screens.
Place optional supporting text below the illustration so delayed feedback does not
change the heading/status layout. Use secondary buttons for waiting-screen Cancel
actions; the feature owns cancellation and navigation.

Use explicit workflow stages for progress; omit the bar when progress is unknown.
Startup has no progress bar until it exposes meaningful completed stages. Video submission
advances through preparation, upload, and finalization. Progress does not introduce a delay
before leaving the screen.
Video-call setup advances from 0% during evidence upload to 25% during session
creation and 50% while connecting, then holds at 75% while waiting for an agent.
These positions represent stages, not elapsed time or upload bytes. The waiting
view ends when the call starts. Longer-wait feedback uses an independent timeout
per attempt and does not advance the bar.
Keep waiting-screen colors in the theme and follow the
[style guide](https://www.figma.com/design/GhRluKzTmhtGAjTrYZWSE4/BCSC-Style-Guide?node-id=5143-5507).

Hidden loading views must not run animations. Concurrent operations own separate
loading tokens; the overlay stays visible until all tokens are released.
Video-call setup and video submission use `CancellableWaitingScreen` to reveal Cancel
after 10 seconds without fading or shifting content (#4513). It keeps Cancel hidden
from accessibility until available, then disables it for good once pressed so repeated
taps cannot cancel twice. Video-call setup also shows its longer-wait message at that threshold;
cancelling stops setup and returns to Start Video Call. Video submission preserves its
existing cancellation destination: verification-method selection (#4585).
Startup and post-call verification checks have no Cancel control. Post-call checks
show the existing verification message without a progress bar.

## Submits: one run per request, however many screens mount

A screen that submits on mount (the send-video `UploadingScreen`) keeps its in-flight run in a
module-level single-flight record (like `useVideoPrompts`), keyed by request id. A second instance
of the screen joins the run instead of starting another, so the user sees its outcome once. A
button that hands a flow to such a screen through a `reset` also refuses a second press itself,
because `reset` with key-less routes mounts a fresh instance every time.

**Why:** a double tap on "Use Video" mounted two upload screens and submitted the same verification
request twice; IAS rejected the second as a duplicate (500) after the first had gone through, so the
user saw a server error over "Successfully sent" (#4928). Bifold's `Button` only swallows presses
while the handler is running, which a synchronous handler never is.

## Test IDs: Register the key, then reference it

Never pass a string literal to `testIdWithKey`. Add the key to `app/src/test-ids/registry.ts` under
the screen that renders it, then reference it: `testIdWithKey(TestIds.main.settings.help)`. The same
applies to a `testIDKey` prop. eslint rejects literals in both positions.

Dynamic ids compose from a registry stem rather than an inline prefix —
``testIdWithKey(`${TestIds.main.services.serviceRowPrefix}${title}`)``.

**Why:** the e2e suite imports the same file, so a rename is one edit and a key an e2e descriptor
still uses cannot be deleted without failing `tsc` in PR CI — instead of surfacing minutes into a
Sauce run behind an app build. A jest check also fails on a key added with no call site, or a call
site removed while the key lingers.

**Note:** a few ids are emitted from a translated label (`ActionScreenLayout`,
`BulletedInstructionsScreen`) or from server data, so no key can be passed. Those are listed in the
registry test's `KNOWN_UNREFERENCED` with the reason; don't add to that list to silence a failure
without one.

## Cameras: outputs belong to one camera mount

Create camera outputs (`usePhotoOutput`, `useBarcodeScannerOutput`, …) in the component that renders
the `<Camera>`, or in a wrapper that mounts and unmounts with it, like `EvidenceCamera` in
`EvidenceCaptureScreen`. Never create them in a parent that outlives the camera and hands them to its
next mount.

**Why:** every `<Camera>` mount creates a new capture session, and on iOS a session given an earlier
session's outputs never starts or crashes the app. Keeping one camera mounted and pausing it with
`isActive` instead was tried and rejected: on Android the paused preview failed to restart.

## Cameras: an interrupted or stopped camera is not a broken one

Pass `useCameraInterruption` to every `<Camera>` and render `CameraInterruptedOverlay` while it
reports an interruption. Only allow photo capture while the session has started and isn't
interrupted. A capture that still loses that race (`isCameraNotReadyCaptureError`) gets an inline
"try again" notice, not the camera error modal; a second one in a row gets the modal. Wait out a
single recoverable runtime error with `useRecoverableCameraError` before failing over. Pass the
screen's camera error handler to `useCameraNotReadyTimeout`, so a camera that stays unstarted or
interrupted for 8 seconds still reaches the error modal (camera screens have no help menu, so that
modal is the user's only way to report). To see these states without a failing camera, follow the
"Note: ... to simulate camera errors" comments in `MaskedCamera.tsx` and `useCameraRecovery.ts`,
then switch on the dev-only flags in `app/src/bcsc-theme/hooks/useCameraEventSimulation.ts`.

**Why:** VisionCamera v5 reports a camera held by another app as an interruption that CameraX retries,
not as an error, and iOS restarts the session after a media services reset (our patch). Without
this the preview sits black with no explanation, or the user sees "camera broken" for a camera that
is about to come back.

## Large text: every screen works at the OS's largest font size

The theme caps text at `maxFontSizeMultiplier` (2x, the WCAG 1.4.4 floor); only text that goes through
it is capped. In `bcsc-theme`, render text with `ThemedText` (lint rejects `Text` from React Native), and
give `TextInput` and `Animated.Text` the theme's `maxFontSizeMultiplier` (lint requires the prop). Lay
screens out so text can grow:

- Text beside something else (an icon, a value, a button) gets `flexShrink: 1`, or `flex: 1` when it
  should fill the row; label and value pairs wrap with `flexWrap: 'wrap'` on the row.
- A box around text has a `minHeight`, not a `height`. Fixed boxes that cannot grow (PIN and pairing
  code cells, a 40pt avatar initial, the tab bar badge) cap their text at 1x on purpose, like `PINInput`.
- Screens scroll (`ScreenWrapper` default). Notification banners are part of the scroll content, so a
  tall banner does not pin the page below it off-screen.
- Rows that no longer fit side by side flip to a column from `fontScale >= 1.5` (`AccountDetailsScreen`).

Jest already renders at the cap (`fontScale: 2`); check new screens on a device or simulator at the
largest accessibility size as well (iOS `xcrun simctl ui booted content_size accessibility-extra-extra-extra-large`,
Android `adb shell settings put system font_scale 2.0`).

**Why:** at the largest iOS accessibility size uncapped text is 3.57x and translucent overlays, fixed heights
and non-shrinking row text clipped or hid content across the verification flows (#4401).

## Cameras: text and controls sit beside the preview, not on it

Lay a camera screen out as a column: text bar, preview, controls. The preview takes the remaining height
(`flex: 1`, `overflow: 'hidden'`, VisionCamera's default `cover`), so long text shrinks the preview instead
of covering it. Draw a mask (the selfie oval, the ID-card cutout, the QR reticle) from the preview box
measured with `onLayout`, with the window only as the first-render stand-in; keep the shape's geometry a
pure, tested function. Controls that appear later (the recording controls after the countdown) are laid out
from the start and revealed with opacity and `pointerEvents`, as the waiting screens do with Cancel, so the
preview does not resize. Side-by-side controls get a vertical `hitSlop` only; a horizontal one steals taps
from the neighbour. Scan zones are fractions of the camera's own container, which is the measured preview
box, so they need no change. The photo, video and barcode outputs are independent of the preview box.

**Why:** overlays sized from the window covered the face oval, the card cutout and most of the preview at
large OS font sizes (#4401).

## Recording: an inactive app is not a user who left

During the video countdown, act on an `inactive` app state only if it lasts until the countdown ends.
Act on `background` at once, and on either once a recording has started.

**Why:** iOS reports `inactive` for a system prompt dismissing (the microphone permission is asked on
the recording screen), Control Center, and on iOS 26+ a spare resign/activate pair after either.
Treating it as leaving the app sent every first-time sender back to the instructions the moment the
countdown began.

## Buttons: loading spinner follows the label

The spinner inside a `Button` takes the button's resolved label colour (including the disabled
colour), is 24px, and sits left of the label with `Spacing.sm` between them. It comes from Bifold's
`ButtonLoading` (`animatedComponents.ButtonLoading`) rendered as a `Button` child; don't hand-roll a
spinner inside a button.

**Why:** `ButtonLoading` used a fixed grey, which was unreadable on a blue Primary button. Bifold 3.1.3
lets `Button` hand its label colour to the spinner, so every button type and theme stays legible
without per-screen colour props (#4743).

## Mediator: MEDIATOR_URL wins only when it changes

The build's `MEDIATOR_URL` is the default mediator. On load, a changed URL (a new build) replaces the
previous default and moves installs that were on it; a mediator picked in developer mode stays
selected either way, so switching survives restarts and upgrades. The URL last reconciled with is
recorded in local storage, and an install without a record starts over from the build's URL.
BC Wallet switches through Bifold's Configure mediator screen (sign-out, agent restart); BC Services
Card switches in place from its Developer screen (default mediator and message pickup move on the
live agent, the device token follows, and a failed switch puts the previous mediator back).
Connections made before a switch keep routing through their original mediator, which is no longer
picked up from, the same as after an agent restart.

A switch connects to the mediator directly and sends the wallet's label with the invitation: Credo 0.7
applies no agent-wide label to connections (the `label` given to `Agent` is ignored), and a DID Exchange
request without one fails validation before it leaves the device. A connection found incomplete when a
switch starts is the leftover of an attempt that never finished; it is discarded and made again, so one
failed switch cannot block that mediator for good. Switches run one after another in the service, not
the picker: a switch outlives the picker when the user leaves mid-handshake, and one started on return
waits instead of discarding the connection the first is completing. A mediator that is not in use can
be removed from the picker (`REMOVE_AVAILABLE_MEDIATOR`); the build's mediator stays, as the next launch
would restore it. The picker consumes its scanned-invitation param once handled, or a removal would bring
the mediator back from the route. A `ListButton` row is one accessibility element, so a control nested in
it (the remove button) is also offered as an accessibility action on the row.

**Why:** Always forcing `MEDIATOR_URL` silently disabled developer-mode mediator switching (the
selection reverted on the next launch), while never forcing it kept an upgraded app on a retired
mediator. The first in-place switch (#4876) sent no label, so every switch failed and left a half-made
connection behind that would have stalled the next attempt.

## Settings: rows are decided before the first render

Facts that decide whether a settings row exists, such as the account security method behind
"Change PIN", live in secure state (`store.bcscSecure`): hydrated from the native account record at
launch and updated wherever the user changes them. A screen reads them synchronously; it never reads
them natively on focus and re-renders, and a row whose gate is still unknown stays hidden.

**Why:** the settings sections animate layout changes (`LinearTransition`), so a row that appears or
disappears after mount slides every row below it. "Change PIN" rendered on a default and was dropped
once the native read reported device auth, so the whole list jumped on every open of Settings.

## Touch targets: `hitSlop` never reaches another control

Give a small control a 44dp box for its target, and point `hitSlop` only at empty space: zero every edge
that faces another control. The settings section chevrons, stacked between rows, keep only left and right
(`{ ...hitSlop, top: 0, bottom: 0 }`); the profile card's edit pencil, with the account name on its left and
a chevron below, keeps only top and right (`{ ...hitSlop, left: 0, bottom: 0 }`).

**Why:** on Android a `hitSlop` reaches past the control's parent and takes taps from any control rendered
before it. The settings section chevrons' 44dp slop covered the profile card's edit pencil, so tapping the
pencil collapsed the Features section instead of opening the nickname editor.

## Android: the JS runtime outlives the Activity

To leave the app on Android, use `moveAppToBackground`, not `BackHandler.exitApp`. Hardware back can still
finish the Activity, so anything that reads launch data (`getInitialURL`, `getInitialNotification`) must read
it again on every mount and skip what it already handled. Module-level state survives the remount, so a
"run once" guard around these reads drops the link or notification that started the new Activity.
`getInitialNotification` also needs a resumed Activity, or it silently resolves `null`.

**Why:** `exitApp` finished the Activity for a browser-launched task but left the process alive. The next link
or notification tap created a new Activity, which fires no `onNewIntent`, so logins after the first were lost.

## Verification flow exits: first-time vs deferred verifiers

The onboarding "Verify your account" prompt decides who may leave the verify flow, through the persisted
`bcsc.verificationSkipped` flag: while the account is unverified only the prompt writes it, and finishing
verification sets it to `true` so a later renewal re-enters as a deferred verifier (`useVerificationExitPolicy`):

- **First-time verifier** (Continue at the prompt, or a v3 upgrade mid-verification): the flow is their whole
  app. The help menu has no "Back to home", the back arrow at the beginning of the stack `replace`s onto the
  prompt (which has no arrow and swallows Android back), and the post-submit screen continues to the pending
  review. Skip on the prompt is the one way to Home and makes them deferred.
- **Deferred verifier** (Skip at some point, re-entering from the Home card): keeps every exit, progress
  kept. Developer mode shows "Back to home" to everyone; arrows ignore it.
- **A submitted request is the exception for both**: the pending review's back arrow leaves for Home whoever
  the verifier is, because that wait is on an agent and not on the user (#4968). The screen carries no manual
  check — Home's pending card is where a user asks for a fresh status, and the way back in — and picks the
  decision up itself (focus, foreground, the review push) for a user who stays on it.

Rules that keep this consistent:

- `useLeaveVerification` is the only way out of the flow. Never navigate to Home from a verify screen.
- `createVerifyHeaderBackButton` (`components/VerifyHeaderBackButton.tsx`) is the single owner of Android
  hardware back on a verify screen that shows a header: every route that can be a resumed initial route
  uses it, including arrow-less ones (hidden behind the settings button on method selection), so hardware
  back never falls through to the OS. Hide it with `hidden`; don't register a second `BackHandler` on the
  screen (RN runs the newest handler first, so two owners race). Screens with `headerShown: false` own
  their own.
- Gate help-menu rows in the factory (`createVerifyHelpMenuButton`), never inside a row component:
  `ListButtonGroup` positions every element child, so a row rendering `null` still takes a slot.
- From the prompt, `push` the resume step; never `replace` the prompt away. A screen that `replace`s back onto
  the prompt relies on its `animationTypeForReplace: 'pop'`.
- RootStack never remounts on a factory reset or a lock, so its once-per-session routing state (prompt
  answered, resume evaluated) is reset when `hasAccount` or `didAuthenticate` turns false: removing the
  account and onboarding again offers the prompt like a fresh install, and an unlock resumes a started
  verification like a relaunch does (the lock clears the secure state, in-progress status included).

**Why:** many people install the app only to verify their BC Services Card; an unverified Home is a dead end
for them and was causing abandoned verifications (#4776). The two kinds are told apart by the prompt answer
alone because starting from the Home card must not turn a skipper into a first-time verifier.

## Error reports: record where and when a flow failed

Wrap each step of a multi-step flow with `trackFailureSteps` (`errors/failureContext.ts`), and pass the
resulting error to the alert. For a single failure outside a flow, use `createFailureError`.

- Never call a catch-all alert without an error, or the report can't say what failed.
- Name flows and steps with short, fixed names such as `quick_login` and `sign_jwt`. Never put personal data
  or tokens in them.
- Errors a policy already handled are labeled but never alerted again. Callers still check
  `isHandledAppError`.
- To re-wrap a labeled error for its alert, set it as the `cause` and copy nothing. Reports and analytics
  read `AppError.getChainedContext()` (as does `toJSON()`, for remote logs), which merges context down the cause chain (outer errors win).
- To make a new context field a top-level Loki field, add it to `FLATTENED_APP_ERROR_CONTEXT_KEYS` in
  `report-problem.ts`. Native rejection fields are separate: see below.
- New and changed native rejections use `rejectWithDiagnostics` (bcsc-core, iOS and Android): a fixed
  message (never an error description, which can contain paths), a `site` of `method.stage` named the same
  on both platforms, and status-code `userInfo`. Older methods still call `reject` directly and report only
  a code; migrate a method when you change it. Reports promote the rejection's code and
  `site`, `detail` and `osStatus` from anywhere in the cause chain to `native_*` fields (`nativeErrorFields.ts`);
  other `userInfo` stays in `error_json`. Promote a new `userInfo` key there only when reports filter on it,
  and only scalar status values.

- When something that fails silently could explain a step's failure, pass its health as that step's
  `context`, only on the steps it could explain. Use status codes only, never values: `getPushTokenStatus`
  (placeholder push tokens) and `getAccountReadStatus` from bcsc-core (why `getAccount` resolved null). Call
  `getAccountReadStatus` only after `getAccount` returns null, and never let a diagnostic call replace the
  real failure. `withAccount` already does this: its `AccountNotFoundError` carries the status as `readContext`.

## Derived state: compute it from its inputs, don't store a flag

State that follows from other state is derived on read through a rule, a selector and a hook, never saved as a
flag that something has to remember to set and clear. The three live together in `bcsc-theme/state/<domain>/`;
`state/` holds only derived, UI-free state, not actions or API calls. The card expiry phase
(`bcsc-theme/state/account/`) is the example:

- `getAccountPhase` (`account-phase.ts`) is the only definition of "expired" and "expiring soon".
- `selectAccountPhase` (`selectors.ts`) reads its inputs: `bcscSecure.verified`, the ID token
  `bcscReason`, the stored refresh token's expiry (`isRefreshTokenExpired`), and the account's `account_expiration_date`.
- `useAccountPhase` re-derives it when the store or the account changes. `useCardStatus` (feature locks) and
  `selectHomeNotice` (Home notices, `bcsc-theme/state/home/`) both read it, so they cannot disagree.
- `getHomeNotice` (`home-notice.ts`) is the only definition of which notice Home shows. `useCustomNotifications`
  only maps its result to a component.

The `unknown` phase (verified, but no usable date and no server signal) shows nothing; a notice is never built
from data that did not load. Expiry is not refreshed at midnight or on foreground; it re-derives on the next
store or account change.

**Why:** the saved `showAccountExpiryNotification` / `showCardRenewalNotification` flags were only written at
startup and cleared by hand, so a failed account load or a missed reset left a stale renewal notice (#4866, #4878).

How to apply this to other state: [`docs/guides/derived-state-refactor.md`](docs/guides/derived-state-refactor.md).

## Server keys: build them in memory, never in the keychain

A server public key (the JWKS entry that verifies the ID token, user info and login challenge, and
encrypts the quick-login hint) becomes an in-memory key: `JWK.jwkToSecKey` → `SecKeyCreateWithData` on
iOS, `convertJWKToRSAPublicKey` → `KeyFactory` on Android. Never store it as a keychain or keystore
item. In `decodePayload` and `decodeLoginChallenge`, `verified: false` means exactly "no key supplied" or
"signature mismatch" (which includes a signature of another key size, on both platforms); a JWK that
cannot become a key rejects with `E_INVALID_JWK`, a verifier that cannot run (unsupported `alg`, a
`SecKeyRawVerify` status other than a mismatch) rejects with `E_JWS_VERIFY_ERROR`, and both messages name
kid/alg/kty only, never key material. iOS `JWK(json:)` requires kid/alg/kty/n/e while Android needs
kty/n/e; a JWKS entry has all of them. On the JS side, wrap a decode rejection with `toDecodeAppError`
(`native-error-map.ts`): those two codes keep their own definitions (ERR_111, ERR_113) and every other
rejection takes the caller's, so the FCM, user-info and ID-token paths all surface them.

**Why:** iOS used to write the server key into the keychain under `com.mcsi.op.<kid>` and read it back
before every signature check; any failure of that round trip returned `false`, which the app reported as
error 2509 "signature does not match payload" with nothing to investigate. Verifying a signature needs no
keychain, and the rejection codes let the next problem report explain itself.
