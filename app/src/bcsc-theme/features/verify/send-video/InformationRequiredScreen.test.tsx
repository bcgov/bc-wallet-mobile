import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import { BCSCCardProcess } from 'react-native-bcsc-core'
import { BCSCLoadingProvider } from '../../../contexts/BCSCLoadingContext'
import InformationRequiredScreen from './InformationRequiredScreen'

describe('InformationRequired', () => {
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
        <BCSCLoadingProvider>
          <InformationRequiredScreen navigation={mockNavigation as never} />
        </BCSCLoadingProvider>
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('renders NonBCSCMessage when cardProcess is NonBCSC', () => {
    const { queryByText } = render(
      <BasicAppContext initialStateOverride={{ bcscSecure: { cardProcess: BCSCCardProcess.NonBCSC } as any }}>
        <BCSCLoadingProvider>
          <InformationRequiredScreen navigation={mockNavigation as never} />
        </BCSCLoadingProvider>
      </BasicAppContext>
    )

    expect(queryByText('BCSC.SendVideo.InformationRequired.NonBCSCMessage')).toBeTruthy()
  })

  it('does not render NonBCSCMessage when cardProcess is not NonBCSC', () => {
    const { queryByText } = render(
      <BasicAppContext initialStateOverride={{ bcscSecure: { cardProcess: BCSCCardProcess.BCSCPhoto } as any }}>
        <BCSCLoadingProvider>
          <InformationRequiredScreen navigation={mockNavigation as never} />
        </BCSCLoadingProvider>
      </BasicAppContext>
    )

    expect(queryByText('BCSC.SendVideo.InformationRequired.NonBCSCMessage')).toBeNull()
  })
})
