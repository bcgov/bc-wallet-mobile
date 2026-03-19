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

export abstract class BaseScreen {
  /**
   * Wait until this screen is visible.
   * Each subclass defines its own "screen loaded" selector.
   * @param timeout - timeout in milliseconds
   * @param testId - test ID of the element to wait for
   * @returns void
   */
  async waitForDisplayed(timeout: number, testId: string) {
    const el = await this.findByTestId(testId)
    try {
      await el.waitForDisplayed({ timeout })
    } catch (error) {
      console.error(`Element "${testId}" not visible after ${timeout}ms`)
      await this.scrollToTestId(testId, 4, 'both')
      await el.waitForDisplayed({ timeout })
    }
  }

  /**
   * Find an element by text.
   * @param text - text to find
   * @returns the element
   */
  protected async findByText(text: string) {
    const selector = driver.isIOS
      ? `-ios predicate string:value == "${text}"`
      : `android=new UiSelector().text("${text}")`
    return $(selector)
  }

  /**
   * Find an element by test ID.
   * @param testId - test ID to find
   * @returns the element
   */
  protected async findByTestId(testId: string) {
    const selector = driver.isIOS
      ? `~${testId}` // accessibility id
      : `android=new UiSelector().resourceId("${testId}")`
    return $(selector)
  }

  /**
   * Tap an element by test ID.
   * @param testId - test ID to tap
   */
  protected async tapByTestId(testId: string) {
    const el = await this.findByTestId(testId)
    try {
      await el.waitForDisplayed({ timeout: 1_000 })
    } catch (error) {
      console.error(`Element "${testId}" not visible after 1000ms`)
      await this.scrollToTestId(testId, 4, 'both')
      await el.waitForDisplayed({ timeout: 1_000 })
    }
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
  protected async enterText(testId: string, text: string, options?: EnterTextOptions) {
    const el = await this.findByTestId(testId)
    await el.waitForDisplayed({ timeout: 15_000 })

    if (options?.tapFirst) {
      await el.click()
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
   * Uses native `mobile: scroll` on iOS (avoids performActions/quiescence bugs)
   * and swipe gestures on Android.
   *
   * @param testId - testID of the element to scroll to
   * @param maxScrolls - maximum scroll attempts per direction before throwing (default 4)
   * @param directions - `down` scrolls toward content below; `both` tries down then up
   */
  public async scrollToTestId(testId: string, maxScrolls = 4, directions: 'down' | 'both' = 'down') {
    /**
     * Check if an element is visible.
     * @returns boolean
     */
    const isVisible = async () => {
      const candidate = await this.findByTestId(testId)
      try {
        return await candidate.isDisplayed()
      } catch {
        return false
      }
    }

    /**
     * Scroll down once.
     * @returns void
     */
    const scrollDownOnce = async () => {
      if (driver.isIOS) {
        await driver.execute('mobile: scroll', { direction: 'down' })
      } else {
        const { swipeUp } = await import('../helpers/gestures.js')
        await swipeUp()
      }
    }

    /**
     * Scroll up once.
     * @returns void
     */
    const scrollUpOnce = async () => {
      if (driver.isIOS) {
        await driver.execute('mobile: scroll', { direction: 'up' })
      } else {
        const { swipeDown } = await import('../helpers/gestures.js')
        await swipeDown()
      }
    }

    for (let i = 0; i < maxScrolls; i++) {
      if (await isVisible()) return
      await scrollDownOnce()
    }

    if (directions === 'both') {
      for (let i = 0; i < maxScrolls; i++) {
        if (await isVisible()) return
        await scrollUpOnce()
      }
    }

    throw new Error(
      `Element "${testId}" not visible after ${maxScrolls} scroll attempt(s)` +
        (directions === 'both' ? ' in each direction' : '')
    )
  }
}
