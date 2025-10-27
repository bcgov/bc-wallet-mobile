import React from 'react'
import { View } from 'react-native'
import { StackHeaderProps, Header } from '@react-navigation/stack'
import { NotificationsBannerContainer } from './NotificationsBannerContainer'

interface HeaderWithBannerProps extends StackHeaderProps {
  hideNotificationsBanner?: boolean
}

/**
 * A header component that includes a notifications banner below the standard header.
 *
 * @param {HeaderWithBannerProps} props - The properties for the header component.
 * @returns {*} {JSX.Element} The header component with an optional notifications banner.
 */
const HeaderWithBanner = (props: HeaderWithBannerProps): JSX.Element => {
  return (
    <View>
      <Header {...props} />
      {props.hideNotificationsBanner ? null : <NotificationsBannerContainer />}
    </View>
  )
}

export default HeaderWithBanner
