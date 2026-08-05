/** PIN used across all e2e specs — must match the value set during onboarding. */
export const TEST_PIN = '222222'

/** Updated PIN after the Change PIN test runs. Subsequent specs that need to
 *  enter a PIN after the settings suite should use this value. */
export const UPDATED_TEST_PIN = '555555'

/** A PIN that is always wrong (never used as TEST_PIN/UPDATED_TEST_PIN) — for error/lockout paths. */
export const WRONG_TEST_PIN = '111111'

/** Fewer than the required 6 digits — trips the PIN forms' "too short" inline validation. */
export const SHORT_TEST_PIN = '2222'

export enum Timeouts {
  /** Default wait for an element to appear on screen */
  ELEMENT_VISIBLE = 5_000,
  /** Wait for a screen transition to complete */
  SCREEN_TRANSITION = 20_000,
  /** Initial app launch — generous for cold starts on real devices */
  APP_LAUNCH = 30_000,
  /** A camera screen becoming interactive. Covers the whole chain a plain screen transition does not:
   *  the OS permission dialog (which can appear seconds after the screen mounts), the re-renders the
   *  app does around that request, camera-device enumeration, and the capture session warming up —
   *  all slower on Sauce real devices than a simulator. */
  CAMERA_READY = 45_000,
  /** First checkpoint of a journey file: the run's FIRST session may also pay simulator/device
   *  boot + WebDriverAgent install + first-ever app launch, all competing for CPU. */
  COLD_START = 60_000,
  /** A timed lockout releasing itself. The first native tier is 1 minute (5 wrong PINs); the extra
   *  headroom covers a slow mount reading the remaining time late. */
  LOCKOUT_AUTO_UNLOCK = 120_000,
  /** Per-test timeout (Mocha) */
  TEST_TIMEOUT = 300_000,
  /** Browser handoff pause (ms) */
  BROWSER_HANDOFF_PAUSE_MS = 1_000,
}

/**
 * Seconds in the background to trip auto-lock's "backgrounded too long" branch — a different path
 * from the inactivity timer, which is cleared on backgrounding and replaced by an elapsed-time
 * check on return. Must exceed the auto-lock timeout the caller sets first (the journeys pick the
 * 1-minute option; the 5-minute default would cost a 5-minute background).
 */
export const BACKGROUND_LOCK_SECONDS = 70

/**
 * A background well inside the auto-lock timeout — the control for the checkpoint above. Coming back
 * still authenticated proves the app was resumed, not relaunched (a relaunch reaches the unlock
 * screen anyway, which would make the lock assertion vacuous).
 */
export const BACKGROUND_NO_LOCK_SECONDS = 5

export const TestUsers = {
  photo: {
    username: 'e2e_shaggy',
    cardSerial: 'C74455103',
    dob: '19690913',
    documentNumber: 'WG12345678',
    cardScanImage: 'images/dl_shaggy.jpg',
    selfieImage: 'images/id_shaggy.jpg',
    firstName: 'Shaggy',
    lastName: 'Rogers',
    flow: 'photo' as const,
  },
  combined: {
    username: 'e2e_velma',
    cardSerial: 'C82643367',
    dob: '19951217',
    documentNumber: 'WG12345678',
    cardScanImage: 'images/dl_velma.jpg',
    selfieImage: 'images/id_velma.jpg',
    firstName: 'Velma',
    lastName: 'Dinkley',
    flow: 'photo' as const,
  },
  nonPhoto: {
    username: 'e2e_daphne',
    cardSerial: 'C26444539',
    dob: '19800922',
    documentNumber: 'WG12345678',
    documentTypeId: '12',
    cardScanImage: 'images/dl_daphne.jpg',
    selfieImage: 'images/id_daphne.jpg',
    firstName: 'Daphne',
    lastName: 'Blake',
    flow: 'non-photo' as const,
  },
  na: {
    username: 'e2e_fred',
    cardSerial: 'N/A',
    dob: '19680918',
    documentNumber: 'WG12345678',
    documentTypeId: '12',
    primaryDocumentNumber: '12345678',
    primaryDocumentTypeId: '18',
    cardScanImage: 'images/dl_fred.jpg',
    selfieImage: 'images/id_fred.jpg',
    firstName: 'Fred',
    lastName: 'Jones',
    flow: 'non-bcsc' as const,
  },
}

export type TestUser = (typeof TestUsers)[keyof typeof TestUsers]

/**
 * Window-relative tap for camera tap-to-focus after Sauce image injection (0–1).
 * Slightly above center matches where the card often sits in the preview; adjust if needed.
 */
export const SCAN_SERIAL_TAP_FOCUS_WINDOW = { x: 0.5, y: 0.4 } as const

/**
 * Padding (px) added around the card image before Sauce Labs camera injection.
 * Sauce scales the injected image linearly to fill the camera frame — adding
 * asymmetric padding repositions the barcode region into the app's scanning
 * target box. Increase bottom/right padding to push the barcode up/left.
 *
 * Tune these values by inspecting screenshot output until the serial number
 * barcode consistently lands inside the yellow scanning rectangle.
 */
export const CARD_SCAN_PADDING = { top: 0, right: 0, bottom: 450, left: 40 } as const

/**
 * Barcode regions of the combo-card evidence template (`images/dl_*.jpg`, 402×271 — the card-back
 * images all share it), normalized 0–1, to white out before EVIDENCE-CAPTURE injection.
 *
 * The template embeds a REAL SIT combo-card PDF-417 — it decodes to serial C26444539 with daphne's
 * name/birthdate — plus a vertical 1D serial barcode on the right edge. On Android, Sauce injection
 * also feeds the frame stream the document camera's code scanner reads, so during non-BCSC evidence
 * capture the app decodes the "scanned card", asks the backend about it on UsePhoto, gets a MATCH,
 * and quietly resets the flow into card setup (resume route: IDPhotoInformation) — killing the
 * journey. Masking makes the injected document undecodable while it still reads as a licence photo.
 * iOS never synthesizes these barcode formats from injected images, which is why only Android hit it.
 *
 * Region placement: full-width bottom band (PDF-417 + the duplicate-number 1D) and a full-height
 * right band (the vertical serial 1D). Generous on purpose — MLKit reads partial barcodes.
 */
export const COMBO_CARD_BARCODE_MASKS = [
  { x: 0, y: 0.66, width: 1, height: 0.34 },
  { x: 0.78, y: 0, width: 0.22, height: 1 },
] as const
