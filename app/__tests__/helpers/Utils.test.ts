import { expirationOverrideInMinutes } from '../../src/helpers/utils'

import MockDate from 'mockdate'

jest.useFakeTimers({ legacyFakeTimers: true })

describe('Helpers', () => {
  beforeAll(() => {
    // Set the date to a fixed point in time
    MockDate.set('2024-07-09T21:56:44.200Z')
  })

  afterAll(() => {
    // Reset the date to the current date after tests
    MockDate.reset()
  })

  test('computes expiration override correctly', () => {
    const dateInThePast = new Date('2024-07-09T21:23:44.200Z')
    const value = expirationOverrideInMinutes(dateInThePast, 60)

    expect(value).toBe(27)
  })

  test('ignore distant expirations ', () => {
    const dateInThePast = new Date('2024-07-09T19:23:44.200Z')
    const value = expirationOverrideInMinutes(dateInThePast, 60)

    expect(value).toBe(0)
  })
})
