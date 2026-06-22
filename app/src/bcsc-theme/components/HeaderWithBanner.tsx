import { SHADOW_CASTER_HEIGHT, SHADOW_COLOR, SHADOW_OFFSET_DOWN, SHADOW_OPACITY, SHADOW_RADIUS } from '@/constants'
import { useTheme } from '@bifold/core'
import { BottomTabHeaderProps } from '@react-navigation/bottom-tabs'
import { Header as ElementsHeader, getHeaderTitle } from '@react-navigation/elements'
import { Header, StackHeaderProps } from '@react-navigation/stack'
import React from 'react'
import { View } from 'react-native'
import DropShadow from 'react-native-drop-shadow'
import { BCSCBannerMessage } from './AppBanner'
import { NotificationBannerContainer } from './NotificationBannerContainer'

interface HeaderWithBannerProps extends StackHeaderProps {
  onManageDevices: () => void
  bannerMessages: BCSCBannerMessage[]
}

export const HeaderDropShadow = () => {
  const { ColorPalette } = useTheme()
  return (
    <DropShadow
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        shadowColor: SHADOW_COLOR,
        shadowOffset: SHADOW_OFFSET_DOWN,
        shadowOpacity: SHADOW_OPACITY,
        shadowRadius: SHADOW_RADIUS,
        zIndex: -1,
      }}
    >
      <View
        style={{
          height: SHADOW_CASTER_HEIGHT,
          backgroundColor: ColorPalette.brand.primaryBackground,
        }}
      />
    </DropShadow>
  )
}

/**
 * A header component that includes a notifications banner below the standard header.
 *
 * @param {HeaderWithBannerProps} props - The properties for the header component.
 * @returns {*} {React.ReactElement} The header component with an optional notification banner.
 */
const HeaderWithBanner = ({
  onManageDevices,
  bannerMessages,
  ...headerProps
}: HeaderWithBannerProps): React.ReactElement => {
  return (
    <View>
      <HeaderDropShadow />
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

export const createHeaderWithoutBanner = (props: StackHeaderProps) => (
  <View>
    <HeaderDropShadow />
    <Header {...props} />
  </View>
)

export const createTabHeaderWithoutBanner = ({ route, options, layout }: BottomTabHeaderProps) => (
  <TabHeaderWithoutBanner route={route} options={options} layout={layout} />
)

const TabHeaderWithoutBanner = ({
  route,
  options,
  layout,
}: Pick<BottomTabHeaderProps, 'route' | 'options' | 'layout'>) => {
  const { ColorPalette } = useTheme()
  return (
    <View>
      <ElementsHeader {...options} layout={layout} title={getHeaderTitle(options, route.name)} />
      <DropShadow
        style={{
          shadowColor: SHADOW_COLOR,
          shadowOffset: SHADOW_OFFSET_DOWN,
          shadowOpacity: SHADOW_OPACITY,
          shadowRadius: SHADOW_RADIUS,
        }}
      >
        <View
          style={{
            height: SHADOW_CASTER_HEIGHT,
            backgroundColor: ColorPalette.brand.primaryBackground,
          }}
        />
      </DropShadow>
    </View>
  )
}

export default HeaderWithBanner
