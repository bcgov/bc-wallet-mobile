import { ActionScreenLayout } from '@/bcsc-theme/components/ActionScreenLayout'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { ThemedText, useTheme } from '@bifold/core'
import Clipboard from '@react-native-clipboard/clipboard'
import { RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Share, StyleSheet, View } from 'react-native'

interface ContactJSONDetailsScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.ContactJSONDetails>
  route: RouteProp<BCSCMainStackParams, BCSCScreens.ContactJSONDetails>
}

const ContactJSONDetailsScreen = ({ route }: ContactJSONDetailsScreenProps) => {
  const { jsonBlob } = route.params
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()

  const onCopy = useCallback(() => {
    Clipboard.setString(jsonBlob)
  }, [jsonBlob])

  const onShare = useCallback(() => {
    Share.share({ message: jsonBlob }).catch(() => {
      // user dismissed share sheet
    })
  }, [jsonBlob])

  const styles = StyleSheet.create({
    blob: {
      backgroundColor: ColorPalette.grayscale.lightGrey,
      padding: Spacing.md,
      borderRadius: Spacing.sm,
      marginBottom: Spacing.md,
    },
    code: {
      fontFamily: 'Courier',
      fontSize: 12,
      color: ColorPalette.brand.text,
    },
  })

  return (
    <ActionScreenLayout
      primaryActionText={t('BCSC.Contacts.JSON.Download')}
      onPressPrimaryAction={onShare}
      secondaryActionText={t('BCSC.Contacts.JSON.Copy')}
      onPressSecondaryAction={onCopy}
    >
      <View style={styles.blob}>
        <ThemedText style={styles.code}>{jsonBlob}</ThemedText>
      </View>
    </ActionScreenLayout>
  )
}

export default ContactJSONDetailsScreen
