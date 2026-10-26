import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import { StyleSheet } from 'react-native'
import { EmptyNotification } from './EmptyNotification'

describe('EmptyNotification', () => {
  it('lets the message shrink beside the icon so it wraps instead of overflowing the border', () => {
    const { getByText } = render(
      <BasicAppContext>
        <EmptyNotification />
      </BasicAppContext>
    )

    // The test i18n mock returns the key as the translated string
    const message = getByText('Notification.EmptyNotification.Title')

    expect(StyleSheet.flatten(message.props.style)).toMatchObject({ flexShrink: 1 })
  })
})
