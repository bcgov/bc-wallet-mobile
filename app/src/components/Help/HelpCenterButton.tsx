import { useTheme } from '@hyperledger/aries-bifold-core'
import { getDefaultHeaderHeight } from '@react-navigation/elements'
import { useRoute } from '@react-navigation/native'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { DeviceEventEmitter, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context'

import { BCWalletEventTypes } from '../../events/eventTypes'
const HelpCenterButton = () => {
  const { t } = useTranslation()
  const { ColorPallet, TextTheme } = useTheme()
  const route = useRoute()
  const frame = useSafeAreaFrame()
  const insets = useSafeAreaInsets()
  const headerHeight = getDefaultHeaderHeight(frame, false, insets.top)
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      width: '100%',
    },
    text: {
      ...TextTheme.label,
      color: ColorPallet.brand.headerText,
    },
  })
  const paramData = {
    isActive: true,
    routeName: route.name,
    headerHeight: headerHeight,
  }
  const activateSlider = useCallback(() => {
    DeviceEventEmitter.emit(BCWalletEventTypes.ADD_HELP_PRESSED, paramData)
  }, [])
  return (
    <TouchableOpacity style={styles.container} onPress={activateSlider}>
      <Text style={styles.text}>{t('HelpCenter.Help')}</Text>
    </TouchableOpacity>
  )
}
export default HelpCenterButton
