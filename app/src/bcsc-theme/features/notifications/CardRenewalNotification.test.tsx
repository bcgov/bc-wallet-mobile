import { BCSCScreens } from '@/bcsc-theme/types/navigators'
import { testIdWithKey } from '@bifold/core'
import { useNavigation } from '@mocks/@react-navigation/native'
import { BasicAppContext } from '@mocks/helpers/app'
import { fireEvent, render } from '@testing-library/react-native'
import moment from 'moment'
import React from 'react'
import CardRenewalNotification from './CardRenewalNotification'

jest.mock('@/bcsc-theme/contexts/ServerStatusContext', () => ({
  useServerStatus: () => ({ isAvailable: true }),
}))

// The shared i18n mock returns bare keys; this one echoes the interpolated date so it can be asserted
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { expiryDate?: string }) => (options?.expiryDate ? `${key}|${options.expiryDate}` : key),
  }),
}))

describe('CardRenewalNotification', () => {
  const renderCard = (expiresAt: Date) =>
    render(
      <BasicAppContext>
        <CardRenewalNotification expiresAt={expiresAt} />
      </BasicAppContext>
    )

  it('shows the expiry date in the same "Month D, YYYY" text the account reported', () => {
    const expiresAt = moment('October 22, 2026', 'MMMM D, YYYY').toDate()

    const { getByText } = renderCard(expiresAt)

    expect(getByText('Notification.AccountRenewal.Description|October 22, 2026')).toBeTruthy()
  })

  it('opens ReverifyAccount as a renewal, not an expiry, when pressed', () => {
    const { getByTestId } = renderCard(new Date('2026-10-22T00:00:00.000Z'))

    fireEvent.press(getByTestId(testIdWithKey('ViewNotification')))

    expect(useNavigation().navigate).toHaveBeenCalledWith(BCSCScreens.ReverifyAccount, { isExpired: false })
  })
})
