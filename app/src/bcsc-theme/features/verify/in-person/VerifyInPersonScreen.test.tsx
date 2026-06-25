import { initialBCSCSecureState } from '@/store'
import { useNavigation } from '@mocks/custom/@react-navigation/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import { BCSCCardProcess } from 'react-native-bcsc-core'
import VerifyInPersonScreen from './VerifyInPersonScreen'

describe('VerifyInPerson', () => {
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
        <VerifyInPersonScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('renders BCSC photo card process with serial number and "your BC Services Card" bullet', () => {
    const tree = render(
      <BasicAppContext
        initialStateOverride={{
          bcscSecure: {
            ...initialBCSCSecureState,
            cardProcess: BCSCCardProcess.BCSCPhoto,
            serial: '1234567890',
            userCode: '12345678',
            deviceCode: 'device-code',
          },
        }}
      >
        <VerifyInPersonScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })

  it('renders NonBCSC card process without serial number and with evidence types bullet', () => {
    const tree = render(
      <BasicAppContext
        initialStateOverride={{
          bcscSecure: {
            ...initialBCSCSecureState,
            cardProcess: BCSCCardProcess.NonBCSC,
            // serial is intentionally set; should still be hidden when NonBCSC
            serial: '1234567890',
            userCode: '12345678',
            deviceCode: 'device-code',
            additionalEvidenceData: [
              { evidenceType: { evidence_type: 'Passport' } } as any,
              { evidenceType: { evidence_type: 'Driver\u2019s License' } } as any,
            ],
          },
        }}
      >
        <VerifyInPersonScreen navigation={mockNavigation as never} />
      </BasicAppContext>
    )

    expect(tree).toMatchSnapshot()
  })
})
