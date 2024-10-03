import { useTheme } from '@hyperledger/aries-bifold-core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, TouchableOpacity } from 'react-native'

const HelpCenterButton = () => {
  const { t } = useTranslation()
  const { ColorPallet, TextTheme } = useTheme()

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

  // TODO: create a function to handle to press to navigate to proper page

  return (
    <TouchableOpacity style={styles.container}>
      <Text style={styles.text}>{t('HelpCenter.Help')}</Text>
    </TouchableOpacity>
  )
}

export default HelpCenterButton
