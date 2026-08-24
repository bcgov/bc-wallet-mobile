import { Timeouts } from '../../constants.js'
import { swipeDownBy, swipeUpBy } from '../../helpers/gestures.js'
import { describeCurrentScreen } from '../../helpers/screens.js'

/**
 * How long to keep re-sampling an element's position before giving up and tapping anyway.
 * Only ever spent while a view is genuinely moving (see {@link BaseScreen.waitForSteadyPosition}).
 */
const STEADY_POSITION_TIMEOUT_MS = 3_000

/** Gap between position samples when waiting for a view to stop moving. */
const STEADY_POSITION_SAMPLE_MS = 120

/**
 * Keys XCUITest may press to close the iOS keyboard, tried in order — rendered key labels, so case
 * matters. No app input sets `onSubmitEditing`, so pressing one only blurs the field.
 */
const IOS_KEYBOARD_DISMISS_KEYS = ['done', 'Done', 'return', 'Return', 'go', 'Go', 'next', 'Next', 'search', 'Search']

/**
 * Does the on-screen keyboard carry any of {@link IOS_KEYBOARD_DISMISS_KEYS}? Built from that list so the
 * two cannot drift, and it mirrors the test WDA runs inside `mobile: hideKeyboard` — so a hit means that
 * command has something to press. Asking first is what makes number pads cheap: with no dismissal key
 * WDA falls through to a hard-coded 3s re-check before throwing, and this probe is one query.
 */
const IOS_KEYBOARD_DISMISS_KEY_MATCHES = IOS_KEYBOARD_DISMISS_KEYS.map(
  (key) => `name == "${key}" OR label == "${key}"`
).join(' OR ')

const IOS_KEYBOARD_DISMISS_KEY_SELECTOR = `-ios class chain:**/XCUIElementTypeKeyboard/**/*[\`${IOS_KEYBOARD_DISMISS_KEY_MATCHES}\`]`

/** How long to keep asking whether a keyboard we pressed or blurred has actually retracted. */
const KEYBOARD_RETRACT_TIMEOUT_MS = 1_500

/** Pause once a keyboard is down, letting the layout it was covering settle before we tap into it. */
const KEYBOARD_SETTLE_MS = 300

/**
 * Escape a value before it is embedded in a quoted iOS predicate / UiSelector string. Both parsers
 * take the same two escapes, so one helper covers them. Without it a quote or backslash in localized
 * copy produces an invalid selector rather than a miss. (Mirrors `escapeIosSelectorValue` in
 * `helpers/alerts.ts`, which escapes alert-button labels for the same reason.)
 */
function escapeSelectorValue(value: string): string {
  const backslash = String.fromCodePoint(0x5c)
  const doubleQuote = String.fromCodePoint(0x22)
  return value.replaceAll(backslash, `${backslash}${backslash}`).replaceAll(doubleQuote, `${backslash}${doubleQuote}`)
}

/**
 * The bit of an element {@link BaseScreen.waitForSteadyPosition} needs — structural so it accepts both a
 * resolved `WebdriverIO.Element` (from `$$`) and the chainable handle `findByTestId` returns.
 */
interface PositionedElement {
  getLocation(): Promise<{ x: number; y: number }>
}

/** The bit of an element {@link BaseScreen.settleAndClick} needs, on top of {@link PositionedElement}. */
interface ClickableElement extends PositionedElement {
  click(): Promise<void>
}

/**
 * A click that landed on a handle the app had already re-rendered away. WebdriverIO reports this two
 * ways depending on how far the element got — an explicit stale reference, or a re-find that missed.
 */
const STALE_HANDLE_MESSAGE = /stale element|element wasn't found|no such element/i

/**
 * Per-call override for the scroll hunt a missed find falls back to. The default budget reaches
 * about one viewport of content — declare more (via `ScreenSpec.scroll`) on screens whose content is
 * known to run long, and `'down'` where the target only ever sits below the fold, which also skips
 * the pointless reverse pass.
 */
export interface ScrollHint {
  readonly maxScrolls?: number
  readonly directions?: 'down' | 'both'
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
   * @param scroll - scroll-hunt budget for a miss (screen-declared; defaults to 4/'both')
   * @returns void
   */
  async waitForDisplayed(testId: string, timeout: number = Timeouts.ELEMENT_VISIBLE, scroll?: ScrollHint) {
    let el = await this.findByTestId(testId)
    try {
      await el.waitForDisplayed({ timeout })
    } catch {
      console.warn(`Element "${testId}" not visible after ${timeout}ms; scrolling then retrying`)
      await this.scrollToTestId(testId, scroll?.maxScrolls ?? 4, scroll?.directions ?? 'both')
      el = await this.findByTestId(testId) // scrolling can invalidate the cached handle — re-query
      await el.waitForDisplayed({ timeout })
    }
  }

  /**
   * Get the visible text content of an element identified by test ID.
   * Falls back to the accessibility label when `getText()` returns empty: styled ThemedText on iOS,
   * and on both platforms an `accessible` container whose text lives in an id-less child (bifold's
   * `Button` puts the testID on the touchable, its title on a nested Text).
   */
  public async getTextByTestId(testId: string, timeout: number = Timeouts.ELEMENT_VISIBLE): Promise<string> {
    const el = await this.findByTestId(testId)
    await el.waitForDisplayed({ timeout })
    const text = await el.getText()
    if (text) return text
    const label = await el.getAttribute(driver.isIOS ? 'label' : 'content-desc')
    if (label) return label
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
    const value = escapeSelectorValue(text)
    const selector = driver.isIOS
      ? `-ios predicate string:label == "${value}" OR value == "${value}"`
      : `android=new UiSelector().text("${value}")`
    return $(selector)
  }

  /** True if an element with the given visible text is displayed; never throws. */
  public async isTextDisplayed(text: string): Promise<boolean> {
    const el = await this.findByText(text)
    try {
      return await el.isDisplayed()
    } catch {
      return false
    }
  }

  /**
   * Wait for an element by its visible TEXT — the counterpart of {@link waitForDisplayed} for the
   * inline errors, headings and menu titles that carry no testID, scroll-on-miss included.
   *
   * The hunt matters: a bare `findByText(...).waitForDisplayed()` only asserts what is currently in
   * the viewport, and a keyboard-aware form scrolls to keep the FOCUSED field clear — pushing
   * another field's text above the fold while it is perfectly well rendered.
   */
  public async waitForText(text: string, timeout: number = Timeouts.ELEMENT_VISIBLE): Promise<void> {
    const el = await this.findByText(text)
    try {
      await el.waitForDisplayed({ timeout })
    } catch {
      console.warn(`Text "${text}" not visible after ${timeout}ms; scrolling then retrying`)
      await this.scrollUntilVisible(`Text "${text}"`, () => this.isTextDisplayed(text), 4, 'both')
    }
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
   * iOS counterpart of {@link waitForSteadyPosition} — the other way a "found" tap silently misses.
   * XCUITest reports an element as displayed from its first straddling pixel (and the scroll hunt
   * stops right there), but WDA taps a non-hittable element at its full-frame CENTER — for a control
   * straddling the fold that point is outside the viewport (or in the home-indicator gesture zone)
   * and the click lands on nothing (Sauce iOS: a credential-offer footer straddled the fold, Accept
   * "clicked" fine, app never saw it). Android is immune: UiAutomator clicks the center of the
   * VISIBLE bounds. So on iOS, nudge-scroll until the tap point sits safely inside the viewport.
   * Best-effort like its sibling: a screen that will not scroll stops making progress and we tap anyway.
   *
   * @returns whether a nudge swipe was issued — the caller's element handle may then be stale
   */
  private async nudgeTapPointIntoView(testId: string): Promise<boolean> {
    if (!driver.isIOS) return false

    const safeEdgePt = 24 // band the tap point must land in; fixed bottom controls (tab-bar items center ~40pt up) never trigger it
    const overshootPt = 60 // scroll to comfortably inside the band, not onto its boundary
    const maxNudges = 3

    const { height: windowHeight } = await driver.getWindowSize()
    let nudged = false
    let previousCenter = Number.NaN
    for (let attempt = 0; attempt <= maxNudges; attempt++) {
      const el = await this.findByTestId(testId)
      const [{ y }, { height }] = await Promise.all([el.getLocation(), el.getSize()])
      const center = y + height / 2
      const pastBottom = center - (windowHeight - safeEdgePt)
      const pastTop = safeEdgePt - center
      if (pastBottom <= 0 && pastTop <= 0) return nudged
      if (attempt === maxNudges || Math.abs(center - previousCenter) < 4) break // <4pt moved = not scrolling
      previousCenter = center

      const fraction = Math.min(0.35, (Math.max(pastBottom, pastTop) + overshootPt) / windowHeight)
      if (pastBottom > 0) {
        await swipeUpBy(fraction)
      } else {
        await swipeDownBy(fraction)
      }
      await driver.pause(150)
      nudged = true
    }
    console.warn(`Tap point for "${testId}" is still at the screen edge after nudging; tapping anyway`)
    return nudged
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
   * @param scroll - scroll-hunt budget for a miss (screen-declared; defaults to 6/'both')
   */
  public async tapByTestId(testId: string, timeout: number = Timeouts.ELEMENT_VISIBLE, scroll?: ScrollHint) {
    let el = await this.findByTestId(testId)
    try {
      await el.waitForDisplayed({ timeout })
    } catch {
      console.warn(`Element "${testId}" not visible after ${timeout}ms; scrolling then retrying`)
      await this.scrollToTestId(testId, scroll?.maxScrolls ?? 6, scroll?.directions ?? 'both')
      el = await this.findByTestId(testId) // scrolling can invalidate the cached handle — re-query
      await el.waitForDisplayed({ timeout })
    }
    await this.settleAndClick(el, testId)
  }

  /**
   * Let the view settle, keep the tap point inside the viewport, and click — re-querying once if the
   * handle died on the way.
   *
   * `waitForDisplayed` proving an element is there says nothing about a round-trip later: a re-render
   * on the seam (a DIDComm state advancing, a form revalidating) invalidates the handle, and
   * WebdriverIO surfaces that as a hard "element wasn't found" rather than re-finding it. Re-querying
   * is the whole fix — the element is still on screen, only its handle is gone.
   */
  private async settleAndClick(el: ClickableElement, testId: string): Promise<void> {
    await this.waitForSteadyPosition(el)
    let target = el
    if (await this.nudgeTapPointIntoView(testId)) {
      target = await this.findByTestId(testId) // the nudge scrolled — re-query
    }
    try {
      await target.click()
    } catch (err) {
      if (!STALE_HANDLE_MESSAGE.test(String(err))) throw err
      console.warn(`Element "${testId}" went stale before the tap; re-querying and retrying`)
      const fresh = await this.findByTestId(testId)
      await fresh.waitForDisplayed({ timeout: Timeouts.SCREEN_TRANSITION })
      await this.waitForSteadyPosition(fresh)
      await fresh.click()
    }
  }

  /**
   * Tap a control that must take us OFF the current screen, and confirm it did.
   *
   * The tap is re-issued only while the navigation has not happened — proof the previous tap was
   * swallowed rather than slow — so a navigation that already happened is never double-fired. By
   * default that proof is the tapped control leaving the screen, whatever rendered next (including an
   * OS permission dialog); asserting the destination is then the caller's job.
   *
   * Pass `arrivedAt` when the control's id SURVIVES the push and departure cannot be read — a header
   * Back exists on both the screen you leave and the one you land on, so the default probe would call
   * a swallowed tap a success. It also proves arrival rather than departure, which is strictly
   * stronger: react-navigation renders a pushed screen before it makes it interactive, so a control
   * can be visible, steady, and still discard the tap.
   *
   * Use for pushes off animated screens; do NOT use for non-idempotent actions like a camera shutter.
   *
   * @param testId - test ID of the control to tap
   * @param attempts - how many taps to try before failing
   * @param timeout - how long to wait for the control itself before each tap
   * @param settleMs - how long a tap gets to visibly navigate. Deliberately short: a stack push
   *   that has not even started after this long did not happen, and a generous value would just add
   *   dead time to every swallowed tap. Kept well above a normal transition so a camera mount stalling
   *   the JS thread is not mistaken for a missed tap.
   * @param arrivedAt - cheap, non-throwing "did we get there" probe; defaults to the control leaving
   * @param scroll - scroll-hunt budget for a miss (screen-declared), same as every other find
   */
  public async tapToNavigate(
    testId: string,
    {
      attempts = 3,
      timeout = Timeouts.SCREEN_TRANSITION,
      settleMs = 5_000,
      arrivedAt,
      scroll,
    }: {
      attempts?: number
      timeout?: number
      settleMs?: number
      arrivedAt?: () => Promise<boolean>
      scroll?: ScrollHint
    } = {}
  ): Promise<void> {
    const navigated = arrivedAt ?? (async () => !(await this.isTestIdDisplayed(testId)))
    const unmoved = arrivedAt ? 'the destination never appeared' : `"${testId}" never left the screen`

    for (let attempt = 1; attempt <= attempts; attempt++) {
      await this.tapByTestId(testId, timeout, scroll)

      const deadline = Date.now() + settleMs
      while (Date.now() < deadline) {
        if (await navigated()) return
        await driver.pause(250)
      }
      console.warn(`Tap on "${testId}" did not navigate (attempt ${attempt}/${attempts}); re-tapping`)
    }
    throw new Error(
      `Tapped "${testId}" ${attempts} time(s) but ${unmoved}. On screen: ${await describeCurrentScreen()}`
    )
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
   * @param scroll - scroll-hunt budget for a miss (screen-declared; defaults to 4/'both')
   */
  public async waitForEnabledAndTap(testId: string, timeout: number = Timeouts.SCREEN_TRANSITION, scroll?: ScrollHint) {
    let el = await this.findByTestId(testId)
    try {
      await el.waitForDisplayed({ timeout })
    } catch {
      console.warn(`Element "${testId}" not visible after ${timeout}ms; scrolling then retrying`)
      await this.scrollToTestId(testId, scroll?.maxScrolls ?? 4, scroll?.directions ?? 'both')
      el = await this.findByTestId(testId) // scrolling can invalidate the cached handle — re-query
      await el.waitForDisplayed({ timeout })
    }
    await el.waitForEnabled({ timeout })
    await this.settleAndClick(el, testId)
  }

  /**
   * Dismiss the soft keyboard without ever touching the app's own UI — press one of the keyboard's
   * own dismissal keys.
   *
   * iOS used to blind-tap a quarter down the screen and let the form's scroll view swallow it. That
   * only works while nothing interactive sits there: on iOS 17 it landed on ResidentialAddress's
   * province dropdown, opening the modal and stranding the journey. No coordinate is safe —
   * `InputWithValidation`'s 44px hitSlop makes the gaps between fields live too.
   *
   * On iOS, number pads (birthdate, email code, PIN) carry no key that can close them — detected up
   * front, so the keyboard is left up rather than pay WDA's 3s failure. Usually fine: the forms calling
   * this use `ScreenWrapper keyboardActive`, which lays controls out above the keyboard. Where it is
   * not, pass `tapToDismiss`.
   *
   * @param options.tapToDismiss - testID of an INERT element (a heading, say) to tap when the keyboard
   *   has no dismissal key. `ScreenWrapper` sets `keyboardShouldPersistTaps: 'handled'`, so a tap no
   *   child handles blurs the focused input. Named, never positional — see the coordinate hazard above.
   * @returns whether the keyboard is down by the time this returns
   */
  async dismissKeyboard(options?: { tapToDismiss?: string }): Promise<boolean> {
    // An unreadable probe counts as "shown" — better to attempt a (now harmless) dismissal.
    if (!(await driver.isKeyboardShown().catch(() => true))) return true

    if (driver.isAndroid) return await this.hideAndroidKeyboard()

    const hasDismissKey = await this.hasIosKeyboardDismissKey()
    if (hasDismissKey) {
      try {
        // Presses the first matching key; throws when the keyboard has none — which the probe above has
        // already ruled out in the common case.
        await driver.execute('mobile: hideKeyboard', { keys: IOS_KEYBOARD_DISMISS_KEYS })
        if (await this.waitForKeyboardHidden()) return true
      } catch {
        // Still up — fall through to the caller's tap target, if it gave us one.
      }
    }

    if (options?.tapToDismiss) {
      try {
        const el = await this.findByTestId(options.tapToDismiss)
        await el.click()
        if (await this.waitForKeyboardHidden()) return true
      } catch {
        console.warn(`[keyboard] Could not tap "${options.tapToDismiss}" to dismiss the keyboard`)
      }
    }

    console.warn(
      hasDismissKey
        ? '[keyboard] iOS dismissal key would not close the keyboard; leaving it up'
        : '[keyboard] iOS keyboard carries no dismissal key (number pad); leaving it up'
    )
    return false
  }

  /**
   * Does the current iOS keyboard have a key that closes it? Number pads do not; alphabetic and email
   * keyboards carry a `return`. An unanswerable probe returns true — attempting the command anyway is
   * the older behaviour.
   */
  private async hasIosKeyboardDismissKey(): Promise<boolean> {
    try {
      return await $(IOS_KEYBOARD_DISMISS_KEY_SELECTOR).isExisting()
    } catch {
      return true
    }
  }

  /**
   * Close the Android soft keyboard, verified. `driver.hideKeyboard()` is adb underneath (ESC, then
   * BACK) and throws when neither lands — notably when the IME reports `mIsInputViewShown=false`.
   *
   * The IME's "done" editor action is an independent way in: it blurs through the input connection
   * rather than a system key. Second because Appium implements it by swapping the device IME and back.
   * No app input sets `onSubmitEditing`, so it only blurs. Never throws — a keyboard probe must not
   * fail the caller's real action.
   */
  private async hideAndroidKeyboard(): Promise<boolean> {
    await driver.hideKeyboard().catch(() => undefined)
    if (await this.waitForKeyboardHidden()) return true

    await driver.execute('mobile: performEditorAction', { action: 'done' }).catch(() => undefined)
    if (await this.waitForKeyboardHidden()) return true

    console.warn('[keyboard] Android keyboard would not close; continuing with it up')
    return false
  }

  /**
   * Poll until the keyboard is actually gone, then let the layout settle. Both platforms' dismissal
   * commands already block until it reports hidden, so this costs one probe on the happy path; it earns
   * its keep when one of them reports success over a keyboard that is still up. An unreadable probe
   * counts as "gone" — let the caller's real action be the thing that fails.
   */
  private async waitForKeyboardHidden(timeout: number = KEYBOARD_RETRACT_TIMEOUT_MS): Promise<boolean> {
    try {
      await driver.waitUntil(async () => !(await driver.isKeyboardShown().catch(() => false)), {
        timeout,
        interval: 150,
      })
    } catch {
      return false
    }
    await driver.pause(KEYBOARD_SETTLE_MS)
    return true
  }

  /**
   * Hide the Android soft keyboard if one is open. MUST run before any swipe-scroll: with a keyboard
   * up, a "scroll" swipe lands on the keys — it does not move the content, and Gboard's glide typing
   * reads the drag as gesture input and TYPES into the still-focused field (observed on a Pixel 7 Pro:
   * a scroll hunt for the next input appended " TY TY TY TY" to the just-filled last-name field).
   *
   * Android-only: the glide-typing hazard is a Gboard behaviour with no iOS equivalent, and
   * {@link dismissKeyboard} covers the iOS cases that need it. Never throws — a keyboard probe must
   * not fail the caller's real action.
   */
  public async hideAndroidKeyboardIfShown(): Promise<void> {
    if (!driver.isAndroid) return
    const shown = await driver.isKeyboardShown().catch(() => false)
    if (!shown) return
    await this.hideAndroidKeyboard()
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
    await this.scrollUntilVisible(`Element "${testId}"`, () => this.isTestIdDisplayed(testId), maxScrolls, directions)
  }

  /**
   * Swipe until a target becomes visible — shared by the testID and visible-text hunts. `isVisible`
   * re-queries each pass, so a handle invalidated by the scroll doesn't poison the search.
   *
   * @param description - how the target is named in the failure message
   * @param isVisible - cheap, non-throwing "is it on screen" probe
   */
  private async scrollUntilVisible(
    description: string,
    isVisible: () => Promise<boolean>,
    maxScrolls: number,
    directions: 'down' | 'both'
  ): Promise<void> {
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

    // Name what IS on screen: a scroll hunt fails the same way whether the target is below the fold or
    // the app never got to this screen at all, and only the second is worth debugging.
    throw new Error(
      `${description} not visible after ${maxScrolls} scroll attempt(s)` +
        (directions === 'both' ? ' in each direction' : '') +
        `. On screen: ${await describeCurrentScreen()}`
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
