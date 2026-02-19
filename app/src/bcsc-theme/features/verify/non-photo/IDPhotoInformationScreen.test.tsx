import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import IDPhotoInformationScreen from './IDPhotoInformationScreen'

jest.mock('@assets/img/credential-scan.png', () => 1)

describe('IDPhotoInformation', () => {
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
    const tree = render(
      <BasicAppContext>
        <IDPhotoInformationScreen navigation={mockNavigation as never} route={{ params: {} } as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
