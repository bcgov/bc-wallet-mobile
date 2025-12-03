import { render } from '@testing-library/react-native'
import React from 'react'

import { useNavigation } from '../../__mocks__/custom/@react-navigation/core'
import { BasicAppContext } from '../../__mocks__/helpers/app'
import PendingReviewScreen from '../../src/bcsc-theme/features/verify/send-video/PendingReviewScreen'

jest.mock('../../src/bcsc-theme/hooks/useBCSCApiClient')
jest.mock('../../src/bcsc-theme/api/hooks/useApi')

describe('PendingReview', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const tree = render(
      <BasicAppContext>
        <PendingReviewScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
