import React from 'react'
import { View } from 'react-native'
import { Header, StackHeaderProps } from '@react-navigation/stack'
import { NotificationBannerContainer } from './NotificationBannerContainer'

/**
 * A header component that includes a notifications banner below the standard header.
 *
 * @param {StackHeaderProps} props - The properties for the header component.
 * @returns {*} {JSX.Element} The header component with an optional notification banner.
 */
const HeaderWithBanner = (props: StackHeaderProps): JSX.Element => {
  return (
    <View>
      <Header {...props} />
      <NotificationBannerContainer />
    </View>
  )
}

export const createHeaderWithBanner = (props: StackHeaderProps) => <HeaderWithBanner {...props} />
export const createHeaderWithoutBanner = (props: StackHeaderProps) => <Header {...props} />

export default HeaderWithBanner
