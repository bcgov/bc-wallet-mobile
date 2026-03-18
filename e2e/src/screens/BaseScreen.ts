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
   */
  async waitForDisplayed(timeout: number, testId: string) {
    const el = await this.findByTestId(testId)
    await el.waitForDisplayed({ timeout: timeout })
  }

  protected async findByTestId(testId: string) {
    const selector = driver.isIOS
      ? `~${testId}` // accessibility id
      : `android=new UiSelector().resourceId("${testId}")`
    return $(selector)
  }

  protected async tapByTestId(testId: string) {
    const el = await this.findByTestId(testId)
    await el.waitForDisplayed({ timeout: 15_000 })
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
}
