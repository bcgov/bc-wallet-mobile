import { Header, StackHeaderProps } from '@react-navigation/stack'
import React from 'react'
import { View } from 'react-native'
import { BCSCBannerMessage } from './AppBanner'
import { NotificationBannerContainer } from './NotificationBannerContainer'

interface HeaderWithBannerProps extends StackHeaderProps {
  onManageDevices: () => void
  bannerMessages: BCSCBannerMessage[]
}

/**
 * A header component that includes a notifications banner below the standard header.
 *
 * @param {HeaderWithBannerProps} props - The properties for the header component.
 * @returns {*} {React.ReactElement} The header component with an optional notification banner.
 */
const HeaderWithBanner = ({ onManageDevices, bannerMessages, ...headerProps }: HeaderWithBannerProps): React.ReactElement => {
  return (
    <View>
      <Header {...headerProps} />
      <NotificationBannerContainer onManageDevices={onManageDevices} bannerMessages={bannerMessages} />
    </View>
  )
}

/**
 * Creates a header with banner component that includes navigation callback for device management.
 *
 * @param {() => void} onManageDevices - Callback function for managing devices navigation
 * @param {BCSCBannerMessage[]} bannerMessages - Banner messages to display below the header
 * @returns {(props: StackHeaderProps) => React.ReactElement} A header component with banner
 */
export const createHeaderWithBanner = (onManageDevices: () => void, bannerMessages: BCSCBannerMessage[]) => {
  const HeaderWithBannerComponent = (props: StackHeaderProps) => (
    <HeaderWithBanner {...props} onManageDevices={onManageDevices} bannerMessages={bannerMessages} />
  )
  return HeaderWithBannerComponent
}

export const createHeaderWithoutBanner = (props: StackHeaderProps) => <Header {...props} />

export default HeaderWithBanner
