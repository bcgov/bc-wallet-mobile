import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import { BCSCCardProcess } from 'react-native-bcsc-core'
import EvidenceTypeListScreen from './EvidenceTypeListScreen'

describe('EvidenceTypeList', () => {
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
        <EvidenceTypeListScreen
          navigation={mockNavigation as never}
          route={{ params: { cardProcess: BCSCCardProcess.None } }}
        />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
