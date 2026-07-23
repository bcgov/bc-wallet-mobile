import { isBackgroundedAppState } from './app-state'

describe('isBackgroundedAppState', () => {
  it('returns true for background', () => {
    expect(isBackgroundedAppState('background')).toBe(true)
  })

  it('returns true for inactive', () => {
    expect(isBackgroundedAppState('inactive')).toBe(true)
  })

  it('returns false for active', () => {
    expect(isBackgroundedAppState('active')).toBe(false)
  })

  it('returns false for unknown (fail-safe default, not a background state)', () => {
    expect(isBackgroundedAppState('unknown')).toBe(false)
  })

  it('returns false for extension', () => {
    expect(isBackgroundedAppState('extension')).toBe(false)
  })
})
