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
}
