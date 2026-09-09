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

## Startup loading presentation

BCSC initialization gates select `presentation={LoadingPresentation.Startup}` on `LoadingScreen`. The
overlay keeps the navigation tree mounted while showing a safe-area-aware loading
bar, localized status, centered heading, and the shared `BCAnimatedLoadingIcon`.
Startup reuses `app/src/components/ProgressBar.tsx`, also used by BC Wallet's splash.
Its optional color props preserve the startup design without changing existing
callers' defaults. The bar is left-anchored and advances only when its
supplied proportion changes, without looping. Startup advances once to two-thirds
and holds until the overlay closes when loading finishes; this is a chosen visual
stage, not measured progress.
Completion does not add a delay before revealing the app.
Content can grow and scroll with larger text or smaller screens. Startup presentation
belongs to its active loading tokens; other loaders retain their default presentation
when startup finishes. Startup has no cancel action before navigation is ready.
The startup heading uses `headingThree` with a scoped 24px font size and 36px line
height to match the waiting-screen design, retaining theme typography and text scaling.
Device authentication and successful PIN hydration use the same startup presentation
with a localized account-loading status, followed by the Main stack's readiness gates.
The provider retains the hidden startup instance for one animation frame between loaders so the illustration
does not restart during that handoff, then unmounts it if loading remains idle. A subsequent generic loader restores its usual
presentation immediately. This does not delay releasing the overlay. The landscape
animation uses one native timing loop, without interaction handles, so JavaScript work
and interaction scheduling do not control its phase transitions.
The designer clarified that the startup illustration is centered horizontally and
vertically in the safe-area viewport, with the loading bar and status at the top.
The heading is vertically centered in the remaining space between the status and
the top of the illustration, with a minimum 8px gap on either side. On short screens
or with enlarged text, the content grows and scrolls to prevent overlap.
The [BCSC style guide](https://www.figma.com/design/GhRluKzTmhtGAjTrYZWSE4/BCSC-Style-Guide?node-id=5143-5507)
defines the startup light-theme heading (`#013366`), status (`#474543`), loading
track (`#FAF9F8`), and fill (`#F8BA47`). These colors are scoped to this feature;
dark mode retains the existing theme palette. The caption uses 14px BC Sans with
a 21px line height and 6px vertical padding, separated from the 11px bar by 2px.

## Video submission waiting screen

Startup and video submission share `bcsc-theme/components/WaitingScreenContent`,
including its safe-area layout, centered illustration, typography, and progress bar.
Content stays transparent until the viewport and status area have been measured to
avoid a first-paint jump. Callers supply the heading, status, and progress percentage.
Startup retains its fixed two-thirds stage.

Video submission keeps “Uploading your documents securely” above the animation while
the status below the bar describes the current stage. The stepper advances through
preparing the video (0%), preparing additional documents (25%), uploading metadata
and files (50%), and finalizing the request (75%). It reaches 100% only after submission
and local account updates succeed. These are equally weighted workflow stages, not
bytes transferred or estimated time. Uploading waits for all concurrent files, including
supporting documents; absent documents simply make their preparation stage finish quickly.
The success screen opens immediately without waiting for the bar animation.
The designer requested the bar for consistency with startup. Video submission preserves
the Cancel behavior from #4585: the secondary button fades in after 10 seconds and
calls the existing upload cancellation handler, returning to verification-method
selection. Its space is reserved within the scrollable content so revealing it does
not shift the centered illustration. Before the delay, it is disabled and hidden from
accessibility; it is also disabled while cancellation is in progress. Startup supplies
no controls.

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
