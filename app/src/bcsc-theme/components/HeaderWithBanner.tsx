import React from 'react'
import { View } from 'react-native'
import { StackHeaderProps, Header } from '@react-navigation/stack'
import { NotificationBannerContainer } from './NotificationBannerContainer'

interface HeaderWithBannerProps extends StackHeaderProps {
  hideNotificationBanner?: boolean
}

/**
 * A header component that includes a notifications banner below the standard header.
 *
 * @param {HeaderWithBannerProps} props - The properties for the header component.
 * @returns {*} {JSX.Element} The header component with an optional notification banner.
 */
const HeaderWithBanner = (props: HeaderWithBannerProps): JSX.Element => {
  return (
    <View>
      <Header {...props} />
      {props.hideNotificationBanner ? null : <NotificationBannerContainer />}
    </View>
  )
}

export default HeaderWithBanner
