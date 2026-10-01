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

## Device Auth Failures: Only an explicit cancel is silent

Only an explicit user cancel from the device-auth prompt returns quietly. Any other native failure,
including system interruptions, is logged with its native code and surfaced to the user with
cause-specific copy: lockout tells them to unlock the phone with its PIN or passcode, an interruption
tells them to try again, and anything else gets the generic message. Never fall through to a silent
return when the reason is unknown.

**Why:** a silent return leaves the user on the same screen with no explanation, which reads as an
unlock loop (#4749).
