// organize-imports-ignore — import order defines test run order
/**
 * Verify Interaction Sweep — runs the non-photo card verification end-to-end,
 * weaving in every reachable secondary interaction (Help WebViews, Settings
 * detour, evidence-flow camera variants, video review variants, video-call
 * detour) before completing via in-person verification.
 *
 * Pre: PIN created, on SetupSteps. Post: VerificationSuccess Ok pressed → Home.
 */
// Verify card-type config — non-photo exercises both serial entry and the
// additional-ID evidence flow, giving the broadest surface for detours.
import './card-type/config-non-photo-card.js'

// SetupSteps anchor detours
import './interaction-sweep/verify-initial-detour.spec.js'

// Step 1 — Nickname (real path)
import './components/nickname.spec.js'

// Step 2 — serial-entry detours, then real serial entry
import './interaction-sweep/verify-help-detour.spec.js'

// Step 3 - enter card CSN
import './components/card-csn.spec.js'

// Step 4 — additional-ID detours, then real passport submission
import './interaction-sweep/verify-evidence-detour.spec.js'

// Step 5 - Select additional ID (passport) and view the information screen.
import './non-photo/additional-id-passport.spec.js'

// Step 6 — verification-method detours, then real in-person completion
import './interaction-sweep/verify-video-detour.spec.js'

// Step 7 — in-person verification flow (real path)
import './components/in-person-verification.spec.js'
