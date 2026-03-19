/**
 * Touch gestures for E2E. Android uses W3C actions; iOS uses Appium `mobile:*` helpers
 * to avoid XCUITest quiescence / performActions issues on recent Xcode/iOS SDKs.
 */

async function swipeAndroid(
  from: { x: number; y: number },
  to: { x: number; y: number },
  durationMs: number
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
  await driver.releaseActions()
}

/**
 * Map a desired gesture duration to an iOS swipe velocity (px/s). Shorter duration → higher velocity.
 */
function iosVelocityForDuration(durationMs: number): number {
  const clamped = Math.min(Math.max(durationMs, 120), 2000)
  return Math.round(200_000 / clamped)
}

async function swipeIosDirection(direction: 'up' | 'down' | 'left' | 'right', durationMs: number): Promise<void> {
  await driver.execute('mobile: swipe', {
    direction,
    velocity: iosVelocityForDuration(durationMs),
  })
}

async function swipeIosFromTo(
  from: { x: number; y: number },
  to: { x: number; y: number },
  durationMs: number
): Promise<void> {
  const { width, height } = await driver.getWindowSize()
  const fromX = Math.round(from.x * width)
  const fromY = Math.round(from.y * height)
  const toX = Math.round(to.x * width)
  const toY = Math.round(to.y * height)
  const dx = toX - fromX
  const dy = toY - fromY
  const distance = Math.hypot(dx, dy)
  const durationSec = Math.max(durationMs / 1000, 0.05)
  const velocity = Math.max(250, Math.round(distance / durationSec))

  await driver.execute('mobile: dragFromToWithVelocity', {
    fromX,
    fromY,
    toX,
    toY,
    pressDuration: 0,
    holdDuration: 0.05,
    velocity,
  })
}

/**
 * Swipe from one point to another.
 * Coordinates are percentages of the screen (0–1).
 */
export async function swipe(
  from: { x: number; y: number },
  to: { x: number; y: number },
  durationMs = 800
): Promise<void> {
  if (driver.isIOS) {
    await swipeIosFromTo(from, to, durationMs)
  } else {
    await swipeAndroid(from, to, durationMs)
  }
}

export async function swipeUp(durationMs = 800): Promise<void> {
  if (driver.isIOS) {
    await swipeIosDirection('up', durationMs)
  } else {
    await swipeAndroid({ x: 0.5, y: 0.7 }, { x: 0.5, y: 0.3 }, durationMs)
  }
}

export async function swipeDown(durationMs = 800): Promise<void> {
  if (driver.isIOS) {
    await swipeIosDirection('down', durationMs)
  } else {
    await swipeAndroid({ x: 0.5, y: 0.3 }, { x: 0.5, y: 0.7 }, durationMs)
  }
}

export async function swipeLeft(durationMs = 800): Promise<void> {
  if (driver.isIOS) {
    await swipeIosDirection('left', durationMs)
  } else {
    await swipeAndroid({ x: 0.8, y: 0.5 }, { x: 0.2, y: 0.5 }, durationMs)
  }
}

export async function swipeRight(durationMs = 800): Promise<void> {
  if (driver.isIOS) {
    await swipeIosDirection('right', durationMs)
  } else {
    await swipeAndroid({ x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }, durationMs)
  }
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
