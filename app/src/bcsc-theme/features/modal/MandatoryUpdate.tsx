import { getBCSCAppStoreUrl } from '@/utils/links'
import { Button, ButtonType, ThemedText, TOKENS, useServices, useTheme } from '@bifold/core'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'

/**
 * Component displayed when a mandatory app update is required.
 *
 * @returns {*} {JSX.Element} The MandatoryUpdate component.
 */
export const MandatoryUpdate = (): JSX.Element => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const navigation = useNavigation()

  const platformStore = Platform.OS === 'ios' ? 'App Store' : 'Google Play'

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.modalPrimaryBackground,
    },
    scollContainer: {
      alignItems: 'center',
    },
    icon: {
      paddingVertical: Spacing.lg,
    },
    buttonContainer: {
      padding: Spacing.md,
    },
    textContent: {
      lineHeight: 30,
    },
    textContainer: {
      padding: Spacing.md,
      gap: Spacing.lg,
    },
  })

  /**
   * Prevents the user from navigating back to the previous screen.
   */
  useFocusEffect(
    useCallback(() => {
      const beforeRemove = navigation.addListener('beforeRemove', (event) => {
        event.preventDefault()
      })
      return () => {
        beforeRemove()
      }
    }, [navigation])
  )

  const handleGoToStore = () => {
    try {
      Linking.openURL(getBCSCAppStoreUrl())
    } catch (error) {
      logger.error('MandatoryUpdate: Failed to open app store link.', error as Error)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scollContainer}>
        <Icon name="system-update" size={200} color={ColorPalette.brand.icon} style={styles.icon} />
        <View style={styles.textContainer}>
          <ThemedText variant="headingThree">{t('BCSC.Modals.MandatoryUpdate.Header')}</ThemedText>
          <ThemedText style={styles.textContent}>{t('BCSC.Modals.MandatoryUpdate.ContentA')}</ThemedText>
          <ThemedText style={styles.textContent}>
            {t('BCSC.Modals.MandatoryUpdate.ContentB', { platformStore })}
          </ThemedText>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          title={t('BCSC.Modals.MandatoryUpdate.UpdateButton', { platformStore })}
          buttonType={ButtonType.Primary}
          onPress={handleGoToStore}
        />
      </View>
    </SafeAreaView>
  )
}
