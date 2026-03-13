export abstract class BaseScreen {
  /**
   * Wait until this screen is visible.
   * Each subclass defines its own "screen loaded" selector.
   */
  abstract waitForDisplayed(timeout?: number): Promise<void>

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

  async getScreenName(): Promise<string | null> {
    try {
      const marker = await this.findByTestId('ScreenMarker')
      await marker.waitForExist({ timeout: 5_000 })
      const name = driver.isIOS ? await marker.getAttribute('label') : await marker.getAttribute('content-desc')
      return name || null
    } catch {
      return null
    }
  }
}
