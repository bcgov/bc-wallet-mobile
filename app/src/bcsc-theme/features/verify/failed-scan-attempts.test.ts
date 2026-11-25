import {
  FAILED_SCAN_ATTEMPTS_BEFORE_ASKING,
  NO_FAILED_SCAN_ATTEMPTS,
  recordFailedScanAttempt,
  shouldAskAboutCard,
} from './failed-scan-attempts'

describe('failed scan attempts', () => {
  it('starts with no attempts and nothing to ask', () => {
    expect(NO_FAILED_SCAN_ATTEMPTS).toEqual({ count: 0, reasons: { damaged: 0, unsupported: 0 } })
    expect(shouldAskAboutCard(NO_FAILED_SCAN_ATTEMPTS)).toBe(false)
  })

  it('counts one attempt however many codes in it failed, and tallies every reason', () => {
    const attempts = recordFailedScanAttempt(NO_FAILED_SCAN_ATTEMPTS, ['damaged', 'damaged', 'unsupported'])

    expect(attempts).toEqual({ count: 1, reasons: { damaged: 2, unsupported: 1 } })
  })

  it('does not change the attempts it is given', () => {
    const before = recordFailedScanAttempt(NO_FAILED_SCAN_ATTEMPTS, ['damaged'])

    recordFailedScanAttempt(before, ['unsupported'])

    expect(before).toEqual({ count: 1, reasons: { damaged: 1, unsupported: 0 } })
    expect(NO_FAILED_SCAN_ATTEMPTS).toEqual({ count: 0, reasons: { damaged: 0, unsupported: 0 } })
  })

  it('never asks after a single failed attempt', () => {
    expect(FAILED_SCAN_ATTEMPTS_BEFORE_ASKING).toBeGreaterThan(1)
    expect(shouldAskAboutCard(recordFailedScanAttempt(NO_FAILED_SCAN_ATTEMPTS, ['damaged']))).toBe(false)
  })

  it('asks once the attempts reach the threshold', () => {
    let attempts = NO_FAILED_SCAN_ATTEMPTS
    for (let i = 1; i < FAILED_SCAN_ATTEMPTS_BEFORE_ASKING; i++) {
      attempts = recordFailedScanAttempt(attempts, ['damaged'])
    }
    expect(shouldAskAboutCard(attempts)).toBe(false)

    expect(shouldAskAboutCard(recordFailedScanAttempt(attempts, ['damaged']))).toBe(true)
  })
})
