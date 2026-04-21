import { Adapter } from './Adapter.js'

/**
 * Android-specific adapter implementation for finding elements and performing actions in the Android app.
 *
 * @implements Adapter
 */
export class AndroidAdapter implements Adapter {
  findByTestId(testId: string): ChainablePromiseElement {
    return $(`android=new UiSelector().resourceId("${testId}")`)
  }

  findByText(text: string): ChainablePromiseElement {
    return $(`android=new UiSelector().text("${text}")`)
  }

  async tapByTestId(testId: string): Promise<ChainablePromiseElement> {
    const el = this.findByTestId(testId)
    const isDisplayed = await el.isDisplayed()

    if (!isDisplayed) {
      await driver.execute('mobile: scroll', { strategy: 'accessibility id', selector: testId })
    }

    await el.click()

    return el
  }

  async getTextByTestId(testId: string): Promise<string> {
    const el = this.findByTestId(testId)
    const text = await el.getText()

    if (text) {
      return text
    }

    return ''
  }

  async dismissKeyboard(): Promise<void> {
    driver.hideKeyboard()
  }
}
