import { GrayscaleColors, NotificationColors } from '@bcwallet-theme/theme'
import { testIdWithKey } from '@bifold/core'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import NotificationCard, { NotificationCardStatus } from './NotificationCard'

describe('NotificationCard', () => {
  const baseProps = {
    title: 'Notification title',
    description: 'Content of notification goes here',
    onPress: jest.fn(),
  }

  const renderCard = (status: NotificationCardStatus) =>
    render(
      <BasicAppContext>
        <NotificationCard {...baseProps} status={status} />
      </BasicAppContext>
    )

  // Per the designs: blue when unread, white when read, red for warnings and yellow for attention
  it.each([
    [NotificationCardStatus.Unread, NotificationColors.info],
    [NotificationCardStatus.Read, GrayscaleColors.white],
    [NotificationCardStatus.Warning, NotificationColors.error],
    [NotificationCardStatus.Attention, NotificationColors.warn],
  ])('renders the %s status with the correct background color', (status, backgroundColor) => {
    const tree = renderCard(status)

    expect(tree.getByTestId(testIdWithKey('NotificationListItem'))).toHaveStyle({ backgroundColor })
  })

  it('renders the connection logo in place of the icon when one is available', () => {
    const tree = render(
      <BasicAppContext>
        <NotificationCard
          {...baseProps}
          status={NotificationCardStatus.Unread}
          logoUrl="https://example.com/logo.png"
        />
      </BasicAppContext>
    )

    expect(tree.getByTestId(testIdWithKey('NotificationLogo'))).toBeTruthy()
  })

  it('renders correctly', () => {
    const tree = renderCard(NotificationCardStatus.Unread)

    expect(tree).toMatchSnapshot()
  })
})
