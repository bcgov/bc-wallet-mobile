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

## Buttons: loading spinner follows the label

The spinner inside a `Button` takes the button's resolved label colour (including the disabled
colour), is 24px, and sits left of the label with `Spacing.sm` between them. It comes from Bifold's
`ButtonLoading` (`animatedComponents.ButtonLoading`) rendered as a `Button` child; don't hand-roll a
spinner inside a button.

**Why:** `ButtonLoading` used a fixed grey, which was unreadable on a blue Primary button. Bifold 3.1.3
lets `Button` hand its label colour to the spinner, so every button type and theme stays legible
without per-screen colour props (#4743).

## Settings: rows are decided before the first render

Facts that decide whether a settings row exists, such as the account security method behind
"Change PIN", live in secure state (`store.bcscSecure`): hydrated from the native account record at
launch and updated wherever the user changes them. A screen reads them synchronously; it never reads
them natively on focus and re-renders, and a row whose gate is still unknown stays hidden.

**Why:** the settings sections animate layout changes (`LinearTransition`), so a row that appears or
disappears after mount slides every row below it. "Change PIN" rendered on a default and was dropped
once the native read reported device auth, so the whole list jumped on every open of Settings.

## Verification flow exits: first-time vs deferred verifiers

The onboarding "Verify your account" prompt decides who may leave the verify flow, through the persisted
`bcsc.verificationSkipped` flag: while the account is unverified only the prompt writes it, and finishing
verification sets it to `true` so a later renewal re-enters as a deferred verifier (`useVerificationExitPolicy`):

- **First-time verifier** (Continue at the prompt, or a v3 upgrade mid-verification): the flow is their whole
  app. The help menu has no "Back to home", the back arrow at the beginning of the stack `replace`s onto the
  prompt (which has no arrow and swallows Android back), the pending review has no arrow and polls for the
  agent's decision itself (focus, foreground, the review push, "Check status"), and the post-submit screen
  continues to the pending review. Skip on the prompt is the one way to Home and makes them deferred.
- **Deferred verifier** (Skip at some point, re-entering from the Home card): keeps every exit, progress
  kept. Developer mode shows "Back to home" to everyone; arrows ignore it.

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
