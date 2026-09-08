import { testIdWithKey } from '@bifold/core'

import { TESTID_PREFIX } from './registry'

describe('test ID registry', () => {
  // The registry stores bare keys and bifold applies the prefix, so a bifold upgrade that changes
  // `testIdPrefix` would make every e2e selector miss at runtime. Fail here instead.
  it('pins TESTID_PREFIX to bifold testIdPrefix', () => {
    expect(testIdWithKey('AnyKey')).toBe(`${TESTID_PREFIX}AnyKey`)
  })
})
