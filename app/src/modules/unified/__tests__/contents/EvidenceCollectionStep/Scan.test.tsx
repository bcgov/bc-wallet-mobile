import { render } from '@testing-library/react-native'
import React from 'react'

import ScanContent from '../../../contents/EvidenceCollectionStep/Scan'

describe('ScanContent Component', () => {
  const goToBirthdate = jest.fn()

  beforeEach(() => {
    jest.resetAllMocks()
  })

  test('renders correctly', () => {
    const tree = render(<ScanContent goToBirthdate={goToBirthdate} />)
    expect(tree).toMatchSnapshot()
  })
})
