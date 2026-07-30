import { Timeouts } from '../../constants.js'
import { swipeDownBy, swipeUpBy } from '../../helpers/gestures.js'

/**
 * How long to keep re-sampling an element's position before giving up and tapping anyway.
 * Only ever spent while a view is genuinely moving (see {@link BaseScreen.waitForSteadyPosition}).
 */
const STEADY_POSITION_TIMEOUT_MS = 3_000

/** Gap between position samples when waiting for a view to stop moving. */
const STEADY_POSITION_SAMPLE_MS = 120

/**
 * The bit of an element {@link BaseScreen.waitForSteadyPosition} needs — structural so it accepts both a
 * resolved `WebdriverIO.Element` (from `$$`) and the chainable handle `findByTestId` returns.
 */
interface PositionedElement {
  getLocation(): Promise<{ x: number; y: number }>
}

/** Options for text entry. Use for inputs that need special handling (e.g. PIN, secure text). */
export interface EnterTextOptions {
  /**
   * Tap the element before typing to ensure focus. Helps with controlled inputs and keyboard.
   */
  tapFirst?: boolean
  /**
   * Enter text character-by-character via addValue. More reliable for:
   * - Secure text fields (iOS XCUIElementTypeSecureTextField)
   * - Controlled inputs that process onChangeText per character
   */
  characterByCharacter?: boolean
}

/**
 * Low-level selector engine for E2E tests — cross-platform element lookup, tap, wait, scroll.
 *
 * Prefer the action-based screen-object DSL (`defineScreen`) for every screen/journey; it maps semantic
 * roles to testIDs and reuses this class verbatim as its engine (`new BaseScreen()`, no args). The
 * optional constructor `ids` map + typed convenience methods (`tap`/`waitFor`/`type`/`scrollTo`, keyed on
 * `ids`) are a lower-level fallback for the occasional element the DSL doesn't model.
 *
 * @typeParam T - shape of an optional key→testID map for this screen
 */
export class BaseScreen<T extends Record<string, string> = Record<string, string>> {
  /** The TestID map for this screen. Access raw values via `ids.KeyName`. */
  public readonly ids: T

  constructor(ids?: T) {
    this.ids = (ids ?? {}) as T
  }

  // ---------------------------------------------------------------------------
  // Typed convenience methods — keys autocomplete from T
  // ---------------------------------------------------------------------------

  /** Tap an element by its TestID key. */
  async tap(key: keyof T & string) {
    await this.tapByTestId(this.ids[key])
  }

  /** Wait until an element (by TestID key) is visible. */
  async waitFor(key: keyof T & string, timeout?: number) {
    await this.waitForDisplayed(this.ids[key], timeout)
  }

  /** Enter text into an input identified by its TestID key. */
  async type(key: keyof T & string, text: string, options?: EnterTextOptions) {
    await this.enterText(this.ids[key], text, options)
  }

  /** Scroll until an element (by TestID key) is visible. */
  async scrollTo(key: keyof T & string, maxScrolls?: number, directions?: 'down' | 'both') {
    await this.scrollToTestId(this.ids[key], maxScrolls, directions)
  }

  /** Wait until an element (by TestID key) is enabled, then tap it. */
  async tapWhenEnabled(key: keyof T & string, timeout?: number) {
    await this.waitForEnabledAndTap(this.ids[key], timeout)
  }

  /** Get the visible text content of an element by its TestID key. */
  async getText(key: keyof T & string, timeout?: number): Promise<string> {
    return this.getTextByTestId(this.ids[key], timeout)
  }

  /** Get the raw testID string for a given key. */
  id(key: keyof T & string): string {
    return this.ids[key]
  }

  // ---------------------------------------------------------------------------
  // Low-level methods — accept raw testID strings
  // ---------------------------------------------------------------------------

  /**
   * Wait until this screen is visible.
   * Each subclass defines its own "screen loaded" selector.
   * @param timeout - timeout in milliseconds
   * @param testId - test ID of the element to wait for
   * @returns void
   */
  async waitForDisplayed(testId: string, timeout: number = Timeouts.ELEMENT_VISIBLE) {
    const el = await this.findByTestId(testId)
    try {
      await el.waitForDisplayed({ timeout })
    } catch {
      console.warn(`Element "${testId}" not visible after ${timeout}ms; scrolling then retrying`)
      await this.scrollToTestId(testId, 4, 'both')
      await el.waitForDisplayed({ timeout })
    }
  }

  /**
   * Get the visible text content of an element identified by test ID.
   * On iOS, falls back to the `label` attribute when `getText()` returns empty
   * (common for styled ThemedText / accessibility-labelled elements).
   */
  public async getTextByTestId(testId: string, timeout: number = Timeouts.ELEMENT_VISIBLE): Promise<string> {
    const el = await this.findByTestId(testId)
    await el.waitForDisplayed({ timeout })
    const text = await el.getText()
    if (text) return text
    if (driver.isIOS) {
      const label = await el.getAttribute('label')
      if (label) return label
    }
    return ''
  }

  /**
   * Find an element by text.
   *
   * On iOS, RN `Text` nodes usually expose their rendered string via the
   * accessibility `label` attribute, while `value` is reserved for inputs and
   * a few stateful controls. Matching both covers the common cases.
   *
   * @param text - text to find
   * @returns the element
   */
  public async findByText(text: string) {
    const selector = driver.isIOS
      ? `-ios predicate string:label == "${text}" OR value == "${text}"`
      : `android=new UiSelector().text("${text}")`
    return $(selector)
  }

  /**
   * Find an element by test ID.
   * @param testId - test ID to find
   * @returns the element
   */
  public async findByTestId(testId: string) {
    const selector = driver.isIOS
      ? `~${testId}` // accessibility id
      : `android=new UiSelector().resourceId("${testId}")`
    return $(selector)
  }

  /**
   * Block until an element stops moving, so a tap is dispatched against coordinates that are still
   * accurate when it lands.
   *
   * Android only, and it exists because of a deliberate trade-off in the shared config: RN's JS thread
   * never looks idle to the accessibility framework, so UiAutomator2's implicit `waitForIdleTimeout`
   * burned its full budget on EVERY interaction and we zero it out. That also removed the only thing
   * that used to absorb screen-transition animations — `click()` reads an element's bounds and then
   * injects a tap one round-trip later, so mid-animation the tap lands where the view WAS and is
   * silently swallowed (no error: the element was found, the tap just missed). Two matching position
   * samples means the view has settled. Costs one sample interval on a static screen.
   *
   * Best-effort by design: on timeout we tap anyway rather than fail a test on a jittery view.
   */
  public async waitForSteadyPosition(el: PositionedElement): Promise<void> {
    // XCUITest waits for app quiescence itself, so this is Android-only overhead.
    if (!driver.isAndroid) return

    const deadline = Date.now() + STEADY_POSITION_TIMEOUT_MS
    let previous: string | null = null
    while (Date.now() < deadline) {
      const location = await el.getLocation().catch(() => null)
      if (!location) return // element handle went stale — let the caller's click surface the real error
      const current = `${Math.round(location.x)},${Math.round(location.y)}`
      if (previous === current) return
      previous = current
      await driver.pause(STEADY_POSITION_SAMPLE_MS)
    }
    console.warn(`Element never stopped moving after ${STEADY_POSITION_TIMEOUT_MS}ms; tapping anyway`)
  }

  /**
   * Tap an element by test ID.
   *
   * Waits the full `timeout` for the element rather than a token 500ms: screens that swap their whole
   * tree while an async permission/camera request is in flight (ScanSerial, EvidenceCapture) can render
   * a control, replace it with a loading view, and render it again — a short window lands in the gap and
   * mistakes a re-render for a missing element, then wastes ~10s blind-scrolling a screen that does not
   * scroll before failing.
   *
   * @param testId - test ID to tap
   * @param timeout - how long to wait for the element before falling back to a scroll hunt
   */
  public async tapByTestId(testId: string, timeout: number = Timeouts.ELEMENT_VISIBLE) {
    let el = await this.findByTestId(testId)
    try {
      await el.waitForDisplayed({ timeout })
    } catch {
      console.warn(`Element "${testId}" not visible after ${timeout}ms; scrolling then retrying`)
      await this.scrollToTestId(testId, 6, 'both')
      el = await this.findByTestId(testId) // scrolling can invalidate the cached handle — re-query
      await el.waitForDisplayed({ timeout })
    }
    await this.waitForSteadyPosition(el)
    await el.click()
  }

  /**
   * Tap a control that must take us OFF the current screen, and confirm it did.
   *
   * The tap is re-issued only while the tapped control is still on screen — proof the previous tap was
   * swallowed rather than slow — so a navigation that already happened is never double-fired. Once the
   * control is gone we stop retrying and return, whatever rendered next (including an OS permission
   * dialog); asserting the destination is the caller's job.
   *
   * Use for pushes off animated screens; do NOT use for non-idempotent actions like a camera shutter.
   *
   * @param testId - test ID of the control to tap
   * @param attempts - how many taps to try before failing
   * @param timeout - how long to wait for the control itself before each tap
   * @param settleMs - how long a tap gets to visibly leave the screen. Deliberately short: a stack push
   *   that has not even started after this long did not happen, and a generous value would just add
   *   dead time to every swallowed tap. Kept well above a normal transition so a camera mount stalling
   *   the JS thread is not mistaken for a missed tap.
   */
  public async tapToNavigate(
    testId: string,
    {
      attempts = 3,
      timeout = Timeouts.SCREEN_TRANSITION,
      settleMs = 5_000,
    }: { attempts?: number; timeout?: number; settleMs?: number } = {}
  ): Promise<void> {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      await this.tapByTestId(testId, timeout)

      const deadline = Date.now() + settleMs
      while (Date.now() < deadline) {
        if (!(await this.isTestIdDisplayed(testId))) return
        await driver.pause(250)
      }
      console.warn(`Tap on "${testId}" did not leave the screen (attempt ${attempt}/${attempts}); re-tapping`)
    }
    throw new Error(`Tapped "${testId}" ${attempts} time(s) but "${testId}" never left the screen`)
  }

  /** True if an element (by raw test ID) is currently displayed; never throws. */
  public async isTestIdDisplayed(testId: string): Promise<boolean> {
    const el = await this.findByTestId(testId)
    try {
      return await el.isDisplayed()
    } catch {
      return false
    }
  }

  /**
   * Wait until an element is enabled, then tap it.
   * Useful for buttons that start disabled (e.g. "Accept" gates behind a scroll or timer).
   *
   * @param testId - test ID of the element
   * @param timeout - max time to wait for the element to become enabled (default 20s)
   */
  public async waitForEnabledAndTap(testId: string, timeout: number = Timeouts.SCREEN_TRANSITION) {
    let el = await this.findByTestId(testId)
    try {
      await el.waitForDisplayed({ timeout })
    } catch {
      console.warn(`Element "${testId}" not visible after ${timeout}ms; scrolling then retrying`)
      await this.scrollToTestId(testId, 4, 'both')
      el = await this.findByTestId(testId) // scrolling can invalidate the cached handle — re-query
      await el.waitForDisplayed({ timeout })
    }
    await el.waitForEnabled({ timeout })
    await this.waitForSteadyPosition(el)
    await el.click()
  }

  /**
   * Dismiss the soft keyboard using platform-native commands (no test IDs needed).
   * Call before tapping buttons when the keyboard may be covering them.
   */
  async dismissKeyboard() {
    if (driver.isIOS) {
      const { width, height } = await driver.getWindowSize()
      await driver.execute('mobile: tap', { x: Math.round(width / 2), y: Math.round(height / 4) })
    } else {
      await driver.hideKeyboard()
    }
  }

  /**
   * Hide the Android soft keyboard if one is open. MUST run before any swipe-scroll: with a keyboard
   * up, a "scroll" swipe lands on the keys — it does not move the content, and Gboard's glide typing
   * reads the drag as gesture input and TYPES into the still-focused field (observed on a Pixel 7 Pro:
   * a scroll hunt for the next input appended " TY TY TY TY" to the just-filled last-name field).
   *
   * Android-only by design: iOS has no `hideKeyboard`, its `dismissKeyboard` is a blind tap that could
   * press a real control if fired speculatively, and its forms keep the focused field clear of the
   * keyboard on their own. Never throws — a keyboard probe must not fail the caller's real action.
   */
  public async hideAndroidKeyboardIfShown(): Promise<void> {
    if (!driver.isAndroid) return
    const shown = await driver.isKeyboardShown().catch(() => false)
    if (!shown) return
    await driver.hideKeyboard().catch(() => undefined)
    await driver.pause(300) // let the layout settle as the keyboard collapses
  }

  /**
   * Enter text into an input. Supports options for controlled/secure inputs.
   *
   * @param testId - testID of the input element
   * @param text - text to enter
   * @param options - optional: tapFirst (focus), characterByCharacter (for secure/controlled inputs)
   */
  public async enterText(testId: string, text: string, options?: EnterTextOptions) {
    let el = await this.findByTestId(testId)
    // On a form, the usual reason the NEXT input is "not visible" is the previous field's keyboard
    // sitting over it. Hide it up front instead of burning the full wait and then scroll-hunting —
    // which, with a keyboard open, glide-types into the field we just filled.
    if (!(await el.isDisplayed().catch(() => false))) {
      await this.hideAndroidKeyboardIfShown()
    }
    try {
      await el.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
    } catch {
      console.warn(`Element "${testId}" not visible after ${Timeouts.SCREEN_TRANSITION}ms; scrolling then retrying`)
      await this.scrollToTestId(testId, 4, 'both')
      el = await this.findByTestId(testId) // scrolling can invalidate the cached handle — re-query
      await el.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
    }

    if (options?.tapFirst) {
      await el.click()
      // Focusing a field opens the keyboard, and the keyboard-aware form scrolls the input clear of
      // it. Mid-animation the node can briefly drop out of the accessibility tree, so the NEXT
      // command's stale-element re-find dies with "element wasn't found" (observed on the last form
      // field, which travels the farthest). Re-acquire the handle and let the layout settle before
      // typing into it.
      el = await this.findByTestId(testId)
      try {
        await el.waitForDisplayed({ timeout: Timeouts.ELEMENT_VISIBLE })
      } catch {
        // Some forms do NOT scroll their bottom field clear — the click focuses it and its own
        // keyboard slides over it (observed: ResidentialAddress postal code). The focus took; on
        // Android setValue is an accessibility setText that needs neither the keyboard nor the
        // field on screen — only a findable node. Hide the keyboard so the node is reliably back
        // in the snapshot, then continue.
        console.warn(`Element "${testId}" hidden after focus (keyboard over it?); hiding keyboard and retrying`)
        await this.hideAndroidKeyboardIfShown()
        await el.waitForDisplayed({ timeout: Timeouts.ELEMENT_VISIBLE })
      }
      await this.waitForSteadyPosition(el)
    }

    // iOS/XCUITest clearValue and mobile:clearText both trigger a
    // context menu that interferes with input. Brute-force backspace
    // works reliably. Android's setValue already clears first.
    if (driver.isIOS) {
      for (let i = 0; i < 10; i++) {
        await el.addValue('\uE003')
      }
    }

    if (options?.characterByCharacter) {
      for (const char of text) {
        await el.addValue(char)
      }
    } else {
      await el.setValue(text)
    }
  }

  /**
   * Scroll until an element with the given test ID is visible.
   * Uses small, controlled swipe increments (25% of screen height) to avoid
   * overshooting elements. Pauses briefly after each swipe for the UI to settle.
   *
   * @param testId - testID of the element to scroll to
   * @param maxScrolls - maximum scroll attempts per direction before throwing (default 8)
   * @param directions - `down` scrolls toward content below; `both` tries down then up
   */
  public async scrollToTestId(testId: string, maxScrolls = 8, directions: 'down' | 'both' = 'down') {
    const isVisible = async () => {
      const candidate = await this.findByTestId(testId)
      try {
        return await candidate.isDisplayed()
      } catch {
        return false
      }
    }

    if (await isVisible()) return

    // An open keyboard both hides the lower half of the screen and turns the swipes below into
    // glide-typed garbage in the focused field — clear it before the first swipe. Often the target
    // is visible right after, no scrolling needed.
    await this.hideAndroidKeyboardIfShown()
    if (await isVisible()) return

    const scrollFraction = 0.25
    const settlePauseMs = 150

    for (let i = 0; i < maxScrolls; i++) {
      await swipeUpBy(scrollFraction)
      await driver.pause(settlePauseMs)
      if (await isVisible()) return
    }

    if (directions === 'both') {
      for (let i = 0; i < maxScrolls * 2; i++) {
        await swipeDownBy(scrollFraction)
        await driver.pause(settlePauseMs)
        if (await isVisible()) return
      }
    }

    throw new Error(
      `Element "${testId}" not visible after ${maxScrolls} scroll attempt(s)` +
        (directions === 'both' ? ' in each direction' : '')
    )
  }

  /**
   * Check if an element is displayed.
   * @param key - key of the TestID to check
   * @returns true if the element is displayed, false otherwise
   */
  public async isDisplayed(key: keyof T & string): Promise<boolean> {
    return this.isTestIdDisplayed(this.ids[key])
  }
}
