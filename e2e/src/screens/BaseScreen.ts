import { Timeouts } from '../constants.js'
import { Adapter, getPlatformAdapter } from './Adapter.js'

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
  private readonly adapter: Adapter

  constructor(ids?: T) {
    this.ids = (ids ?? {}) as T
    this.adapter = getPlatformAdapter()
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
  async scrollTo(key: keyof T & string) {
    await this.scrollToTestId(this.ids[key])
  }

  /** Wait until an element (by TestID key) is enabled, then tap it. */
  async tapWhenEnabled(key: keyof T & string, timeout?: number) {
    await this.waitForEnabledAndTap(this.ids[key], timeout)
  }

  /** Get the visible text content of an element by its TestID key. */
  async getText(key: keyof T & string): Promise<string> {
    return this.getTextByTestId(this.ids[key])
  }

  /** Check if an element (by TestID key) is displayed. */
  async isDisplayed(key: keyof T & string): Promise<boolean> {
    return this.isTestIdDisplayed(this.ids[key])
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
    const el = this.findByTestId(testId)
    await el.isDisplayed()
  }

  /**
   * Get the visible text content of an element identified by test ID.
   * On iOS, falls back to the `label` attribute when `getText()` returns empty
   * (common for styled ThemedText / accessibility-labelled elements).
   */
  public async getTextByTestId(testId: string): Promise<string> {
    return this.adapter.getTextByTestId(testId)
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
  public findByText(text: string): ChainablePromiseElement {
    return this.adapter.findByText(text)
  }

  /**
   * Find an element by test ID.
   * @param testId - test ID to find
   * @returns the element
   */
  public findByTestId(testId: string): ChainablePromiseElement {
    return this.adapter.findByTestId(testId)
  }

  /**
   * Tap an element by test ID.
   * @param testId - test ID to tap
   * @returns the element
   */
  public async tapByTestId(testId: string): Promise<ChainablePromiseElement> {
    return this.adapter.tapByTestId(testId)
  }

  /**
   * Wait until an element is enabled, then tap it.
   * Useful for buttons that start disabled (e.g. "Accept" gates behind a scroll or timer).
   *
   * @param testId - test ID of the element
   * @param timeout - max time to wait for the element to become enabled (default 20s)
   */
  public async waitForEnabledAndTap(testId: string, timeout: number = Timeouts.screenTransition): Promise<void> {
    const el = this.findByTestId(testId)
    await el.waitForEnabled({ timeout })
    await this.tapByTestId(testId)
  }

  /**
   * Dismiss the soft keyboard using platform-native commands (no test IDs needed).
   * Call before tapping buttons when the keyboard may be covering them.
   */
  async dismissKeyboard(): Promise<void> {
    await this.adapter.dismissKeyboard()
  }

  /**
   * Enter text into an input. Supports options for controlled/secure inputs.
   *
   * @param testId - testID of the input element
   * @param text - text to enter
   * @param options - optional: tapFirst (focus), characterByCharacter (for secure/controlled inputs)
   */
  public async enterText(testId: string, text: string, options?: EnterTextOptions) {
    try {
      const el = this.findByTestId(testId)
      await el.setValue(text)
    } catch {
      await this.tapByTestId(testId)
      await driver.execute('mobile: type', { text, replace: true })
    }
  }

  /**
   * Scroll until an element with the given test ID.
   * @param testId - testID of the element to scroll to
   * @returns void
   */
  public async scrollToTestId(testId: string) {
    await driver.execute('mobile: scroll', { strategy: 'accessibility id', selector: testId })
  }

  /**
   * Check if an test ID is displayed.
   * @param testId - test ID to check
   * @returns true if the element is displayed, false otherwise
   */
  public async isTestIdDisplayed(testId: string): Promise<boolean> {
    const el = this.findByTestId(testId)
    try {
      return await el.isDisplayed()
    } catch {
      return false
    }
  }
}
