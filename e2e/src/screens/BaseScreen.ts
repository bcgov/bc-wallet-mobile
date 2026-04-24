import { Timeouts } from '../constants.js'
import { swipeDownBy, swipeUpBy } from '../helpers/gestures.js'

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
 * Base screen object for E2E tests.
 *
 * When constructed with a BCSC_TestIDs object (`new BaseScreen(BCSC_TestIDs.AccountSetup)`),
 * the typed convenience methods (`tap`, `waitFor`, `type`, `scrollTo`) provide
 * full autocomplete on the TestID keys. Subclasses can extend for custom behaviour.
 *
 * @typeParam T - shape of the BCSC_TestIDs object for this screen (e.g. `typeof BCSC_TestIDs.AccountSetup`)
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
  async waitForDisplayed(testId: string, timeout: number = Timeouts.elementVisible) {
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
  public async getTextByTestId(testId: string, timeout: number = Timeouts.elementVisible): Promise<string> {
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
   * Tap an element by test ID.
   * @param testId - test ID to tap
   */
  public async tapByTestId(testId: string) {
    const el = await this.findByTestId(testId)
    try {
      await el.waitForDisplayed({ timeout: 500 })
    } catch {
      console.warn(`Element "${testId}" not visible after 500ms; scrolling then retrying`)
      await this.scrollToTestId(testId, 5, 'both')
      await el.waitForDisplayed({ timeout: 500 })
    }
    await el.click()
  }

  /**
   * Wait until an element is enabled, then tap it.
   * Useful for buttons that start disabled (e.g. "Accept" gates behind a scroll or timer).
   *
   * @param testId - test ID of the element
   * @param timeout - max time to wait for the element to become enabled (default 20s)
   */
  public async waitForEnabledAndTap(testId: string, timeout: number = Timeouts.screenTransition) {
    const el = await this.findByTestId(testId)
    await el.waitForDisplayed({ timeout })
    await el.waitForEnabled({ timeout })
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
   * Enter text into an input. Supports options for controlled/secure inputs.
   *
   * @param testId - testID of the input element
   * @param text - text to enter
   * @param options - optional: tapFirst (focus), characterByCharacter (for secure/controlled inputs)
   */
  public async enterText(testId: string, text: string, options?: EnterTextOptions) {
    const el = await this.findByTestId(testId)
    try {
      await el.waitForDisplayed({ timeout: Timeouts.screenTransition })
    } catch {
      console.warn(`Element "${testId}" not visible after ${Timeouts.screenTransition}ms; scrolling then retrying`)
      await this.scrollToTestId(testId, 4, 'both')
      await el.waitForDisplayed({ timeout: Timeouts.screenTransition })
    }

    if (options?.tapFirst) {
      await el.click()
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
    const el = await this.findByTestId(this.ids[key])
    try {
      return await el.isDisplayed()
    } catch {
      return false
    }
  }
}
