import { Adapter } from './Adapter.js'

/**
 * IOS-specific adapter implementation for finding and interacting with elements in the app.
 *
 * @implements Adapter
 */
export class IOSAdapter implements Adapter {
  findByTestId(testId: string): ChainablePromiseElement {
    return $(`~${testId}`)
  }

  findByText(text: string): ChainablePromiseElement {
    return $(`-ios predicate string:value == "${text}"`)
  }

  async tapByTestId(testId: string): Promise<ChainablePromiseElement> {
    const el = this.findByTestId(testId)
    await el.click()
    return el
  }

  async getTextByTestId(testId: string): Promise<string> {
    const el = this.findByTestId(testId)
    const text = await el.getText()

    if (text) {
      return text
    }

    const label = await el.getAttribute('label')

    if (label) {
      return label
    }

    return ''
  }

  async dismissKeyboard(): Promise<void> {
    const { width, height } = await driver.getWindowSize()
    await driver.execute('mobile: tap', { x: Math.round(width / 2), y: Math.round(height / 4) })
  }
}
