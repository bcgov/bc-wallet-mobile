import { SHADOW_CASTER_HEIGHT, SHADOW_COLOR, SHADOW_OFFSET_DOWN, SHADOW_OPACITY, SHADOW_RADIUS } from '@/constants'
import { useTheme } from '@bifold/core'
import { BottomTabHeaderProps } from '@react-navigation/bottom-tabs'
import { Header as ElementsHeader, getHeaderTitle } from '@react-navigation/elements'
import { Header, StackHeaderProps } from '@react-navigation/stack'
import React from 'react'
import { View } from 'react-native'
import DropShadow from 'react-native-drop-shadow'

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
