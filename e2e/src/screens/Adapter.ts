import { AndroidAdapter } from './AndroidAdapter.js'
import { IOSAdapter } from './IOSAdapter.js'

export interface Adapter {
  findByTestId(testId: string): ChainablePromiseElement
  findByText(text: string): ChainablePromiseElement
  tapByTestId(testId: string): Promise<ChainablePromiseElement>
  getTextByTestId(testId: string): Promise<string>
  dismissKeyboard(): Promise<void>
}

/**
 * Factory function to return the appropriate adapter for the current platform.
 *
 * Note: This could return a `sauceLabsAdapter` if Sauce Lab integration tests are different enough to warrant it.
 *
 * @returns An Adapter instance for the current platform (Android or iOS).
 */
export function getPlatformAdapter(): Adapter {
  if (driver.isAndroid) {
    return new AndroidAdapter()
  }

  return new IOSAdapter()
}
