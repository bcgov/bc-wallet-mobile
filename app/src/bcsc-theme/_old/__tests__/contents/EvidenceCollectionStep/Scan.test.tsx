import { render } from '@testing-library/react-native'
import React from 'react'

import ScanContent from '../../../contents/EvidenceCollectionStep/Scan'
import { BasicAppContext } from '../../../../../../__mocks__/helpers/app'

describe('ScanContent Component', () => {
  const goToBirthdate = jest.fn()

  beforeEach(() => {
    jest.resetAllMocks()
  })

  test('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <ScanContent goToBirthdate={goToBirthdate} />
      </BasicAppContext>
    )
    expect(tree).toMatchSnapshot()
  })
})
