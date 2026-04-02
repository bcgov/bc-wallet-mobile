/**
 * Swipe up (content scrolls down) by a controlled fraction of screen height.
 * Centered vertically so the swipe origin/destination stay in the safe area.
 *
 * @param fraction - portion of screen height to cover (0–1, default 0.25)
 * @param durationMs - swipe duration; slower = more reliable (default 500)
 */
export async function swipeUpBy(fraction = 0.25, durationMs = 500): Promise<void> {
  const half = fraction / 2
  const from = { x: 0.5, y: 0.5 + half }
  const to = { x: 0.5, y: 0.5 - half }
  if (driver.isIOS) {
    await swipeIosFromTo(from, to, durationMs)
  } else {
    await swipeAndroidFromTo(from, to, durationMs)
  }
}

/**
 * Swipe down (content scrolls up) by a controlled fraction of screen height.
 *
 * @param fraction - portion of screen height to cover (0–1, default 0.25)
 * @param durationMs - swipe duration; slower = more reliable (default 500)
 */
export async function swipeDownBy(fraction = 0.25, durationMs = 500): Promise<void> {
  const half = fraction / 2
  const from = { x: 0.5, y: 0.5 - half }
  const to = { x: 0.5, y: 0.5 + half }
  if (driver.isIOS) {
    await swipeIosFromTo(from, to, durationMs)
  } else {
    await swipeAndroidFromTo(from, to, durationMs)
  }
}

/**
 * Tap at window-relative coordinates (0–1 fractions of width/height). Uses the same
 * primitives as dismiss-keyboard taps — good for camera tap-to-focus without a test id.
 */
export async function tapAtWindowPercent(xPercent: number, yPercent: number): Promise<void> {
  const { width, height } = await driver.getWindowSize()
  const x = Math.round(xPercent * width)
  const y = Math.round(yPercent * height)

  if (driver.isIOS) {
    await driver.execute('mobile: tap', { x, y })
  } else {
    await driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x, y },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 80 },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ])
    await driver.releaseActions()
  }
}

/**
 * Touch gestures for E2E. Android uses W3C actions; iOS uses Appium `mobile:*` helpers
 * to avoid XCUITest quiescence / performActions issues on recent Xcode/iOS SDKs.
 */
async function swipeAndroidFromTo(
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
 * Swipe from one point to another.
 * Coordinates are percentages of the screen (0–1).
 */
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
