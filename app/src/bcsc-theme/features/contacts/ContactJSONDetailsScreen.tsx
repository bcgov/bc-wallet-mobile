import { ActionScreenLayout } from '@/bcsc-theme/components/ActionScreenLayout'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { ThemedText, useTheme } from '@bifold/core'
import Clipboard from '@react-native-clipboard/clipboard'
import { RouteProp } from '@react-navigation/native'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Share, StyleSheet, View } from 'react-native'

interface ContactJSONDetailsScreenProps {
  route: RouteProp<BCSCMainStackParams, BCSCScreens.ContactJSONDetails>
}

/**
 * Displays the raw JSON payload of a DIDComm connection record (DIDs,
 * verification keys, endpoints) with copy-to-clipboard and a guarded share
 * action — the data is sensitive enough that we confirm before handing it off
 * to the system share sheet.
 */
const ContactJSONDetailsScreen = ({ route }: ContactJSONDetailsScreenProps) => {
  const { jsonBlob } = route.params
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()

  const onCopy = useCallback(() => {
    Clipboard.setString(jsonBlob)
  }, [jsonBlob])

  const onShare = useCallback(() => {
    // Connection JSON contains DIDs, verification keys, and other identifiers
    // that could be used to impersonate or de-anonymize the user. Confirm before
    // handing it to whichever target app the system share sheet routes to.
    Alert.alert(t('BCSC.Contacts.JSON.ShareWarningTitle'), t('BCSC.Contacts.JSON.ShareWarningBody'), [
      { text: t('Global.Cancel'), style: 'cancel' },
      {
        text: t('BCSC.Contacts.JSON.ShareConfirm'),
        style: 'destructive',
        onPress: () => {
          Share.share({ message: jsonBlob }).catch(() => {
            // user dismissed share sheet
          })
        },
      },
    ])
  }, [jsonBlob, t])

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
