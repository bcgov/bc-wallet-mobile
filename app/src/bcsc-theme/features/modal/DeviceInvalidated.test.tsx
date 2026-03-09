import { BCSCMainStackParams, BCSCModals } from '@/bcsc-theme/types/navigators'
import { BCSCReason } from '@/bcsc-theme/utils/id-token'
import { BasicAppContext } from '@mocks/helpers/app'
import { RouteProp } from '@react-navigation/native'
import { render } from '@testing-library/react-native'
import React from 'react'
import { DeviceInvalidated } from './DeviceInvalidated'

const mockFactoryReset = jest.fn().mockResolvedValue({ success: true })
jest.mock('@/bcsc-theme/api/hooks/useFactoryReset', () => ({
  useFactoryReset: () => mockFactoryReset,
}))

const createRoute = (reason: BCSCReason): RouteProp<BCSCMainStackParams, BCSCModals.DeviceInvalidated> => ({
  params: { invalidationReason: reason },
  key: 'test-key',
  name: BCSCModals.DeviceInvalidated as const,
})

describe('DeviceInvalidated', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const reasonsWithText: { reason: BCSCReason; translationKey: string }[] = [
    { reason: BCSCReason.Cancel, translationKey: 'BCSC.Modals.DeviceInvalidated.CancelledByCardCancel' },
    { reason: BCSCReason.CanceledByAgent, translationKey: 'BCSC.Modals.DeviceInvalidated.CancelledByAgent' },
    { reason: BCSCReason.CanceledByUser, translationKey: 'BCSC.Modals.DeviceInvalidated.CancelledByUser' },
    {
      reason: BCSCReason.CanceledByAdditionalCard,
      translationKey: 'BCSC.Modals.DeviceInvalidated.CanceledByAdditionalCard',
    },
    {
      reason: BCSCReason.CanceledByCardTypeChange,
      translationKey: 'BCSC.Modals.DeviceInvalidated.CanceledByCardTypeChange',
    },
    {
      reason: BCSCReason.CanceledDueToInactivity,
      translationKey: 'BCSC.Modals.DeviceInvalidated.CanceledDueToInactivity',
    },
  ]

  it.each(reasonsWithText)('renders correct content text for $reason', ({ reason, translationKey }) => {
    const { getByText } = render(
      <BasicAppContext>
        <DeviceInvalidated route={createRoute(reason)} navigation={jest.fn() as any} />
      </BasicAppContext>
    )

    expect(getByText(translationKey)).toBeTruthy()
  })

  it('renders the header and OK button', () => {
    const { getByText } = render(
      <BasicAppContext>
        <DeviceInvalidated route={createRoute(BCSCReason.Cancel)} navigation={jest.fn() as any} />
      </BasicAppContext>
    )

    expect(getByText('BCSC.Modals.DeviceInvalidated.Header')).toBeTruthy()
    expect(getByText('BCSC.Modals.DeviceInvalidated.OKButton')).toBeTruthy()
    expect(getByText('BCSC.Modals.DeviceInvalidated.ContentA')).toBeTruthy()
  })
})
