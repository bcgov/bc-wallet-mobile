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

BCSC loading overlays and video submission use the shared `WaitingScreenContent`
and `BCAnimatedLoadingIcon`. Center the illustration in the safe-area viewport,
with the heading between the optional status row and illustration. Allow scrolling
for larger text and short screens.

Use explicit workflow stages for progress; omit the bar when progress is unknown.
Startup holds at two-thirds until ready. Video submission advances through preparation,
upload, and finalization. Progress does not introduce a delay before leaving the screen.
Keep waiting-screen colors in the theme and follow the
[style guide](https://www.figma.com/design/GhRluKzTmhtGAjTrYZWSE4/BCSC-Style-Guide?node-id=5143-5507).

Hidden loading views must not run animations. Concurrent operations own separate
loading tokens; the overlay stays visible until all tokens are released.
Video submission preserves the existing Cancel behavior (#4585): reveal it after
10 seconds without shifting content, then return to verification-method selection.
Startup has no Cancel control.

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
