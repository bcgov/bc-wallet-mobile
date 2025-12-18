import { render } from '@testing-library/react-native'
import React from 'react'

import { useNavigation } from '../../__mocks__/custom/@react-navigation/core'
import { BasicAppContext } from '../../__mocks__/helpers/app'
import PhotoReviewScreen from '../../src/bcsc-theme/features/verify/PhotoReviewScreen'

describe('PhotoReview', () => {
  let mockNavigation: any

  beforeEach(() => {
    mockNavigation = useNavigation()
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders correctly', () => {
    const route = { params: { photoPath: 'file://test.jpg' } }
    const tree = render(
      <BasicAppContext>
        <PhotoReviewScreen navigation={mockNavigation as never} route={route as never} />
      </BasicAppContext>,
    )

    expect(tree).toMatchSnapshot()
  })
})
