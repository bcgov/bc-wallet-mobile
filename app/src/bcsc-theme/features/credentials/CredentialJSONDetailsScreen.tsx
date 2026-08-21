import { ActionScreenLayout } from '@/bcsc-theme/components/ActionScreenLayout'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { ThemedText, useTheme } from '@bifold/core'
import Clipboard from '@react-native-clipboard/clipboard'
import { RouteProp } from '@react-navigation/native'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

interface CredentialJSONDetailsScreenProps {
  route: RouteProp<BCSCMainStackParams, BCSCScreens.CredentialJSONDetails>
}

/**
 * CredentialJSONDetailsScreen is a React component that displays a JSON blob in a styled container.
 * TODO (MD): Refactor ContactJSONDetailsScreen to use a shared component with this screen.
 * @params route - The route prop containing the JSON blob to display.
 * @returns a React element that renders the CredentialJSONDetailsScreen component.
 */
const CredentialJSONDetailsScreen = ({ route }: CredentialJSONDetailsScreenProps) => {
  const { jsonBlob } = route.params
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()

  const onCopy = useCallback(() => {
    Clipboard.setString(jsonBlob)
  }, [jsonBlob])

  const styles = StyleSheet.create({
    blob: {
      backgroundColor: ColorPalette.grayscale.veryLightGrey,
      padding: Spacing.md,
      borderRadius: Spacing.sm,
      marginBottom: Spacing.md,
    },
    code: {
      fontFamily: 'Courier',
      fontSize: 12,
      color: ColorPalette.grayscale.black,
    },
  })

  return (
    <ActionScreenLayout primaryActionText={t('BCSC.Contacts.JSON.Copy')} onPressPrimaryAction={onCopy}>
      <View style={styles.blob}>
        <ThemedText style={styles.code}>{jsonBlob}</ThemedText>
      </View>
    </ActionScreenLayout>
  )
}

export default CredentialJSONDetailsScreen
