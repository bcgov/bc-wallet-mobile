/**
 * Swipe from one point to another.
 * Coordinates are percentages of the screen (0–1).
 */
export async function swipe(
  from: { x: number; y: number },
  to: { x: number; y: number },
  durationMs = 800
): Promise<void> {
  const { width, height } = await driver.getWindowSize()

  await driver.performActions([
    {
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x: Math.round(from.x * width), y: Math.round(from.y * height) },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: 100 },
        { type: 'pointerMove', duration: durationMs, x: Math.round(to.x * width), y: Math.round(to.y * height) },
        { type: 'pointerUp', button: 0 },
      ],
    },
  ])
}

export async function swipeUp(durationMs = 800): Promise<void> {
  await swipe({ x: 0.5, y: 0.7 }, { x: 0.5, y: 0.3 }, durationMs)
}

export async function swipeDown(durationMs = 800): Promise<void> {
  await swipe({ x: 0.5, y: 0.3 }, { x: 0.5, y: 0.7 }, durationMs)
}

export async function swipeLeft(durationMs = 800): Promise<void> {
  await swipe({ x: 0.8, y: 0.5 }, { x: 0.2, y: 0.5 }, durationMs)
}

export async function swipeRight(durationMs = 800): Promise<void> {
  await swipe({ x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }, durationMs)
}

/**
 * Scroll down until an element matching the selector is visible,
 * with a maximum number of attempts to prevent infinite loops.
 */
export async function scrollDownUntilVisible(selector: string, maxScrolls = 5): Promise<void> {
  for (let i = 0; i < maxScrolls; i++) {
    const el = await $(selector)
    if (await el.isDisplayed()) return
    await swipeUp()
  }
  throw new Error(`Element "${selector}" not visible after ${maxScrolls} scroll attempts`)
}
