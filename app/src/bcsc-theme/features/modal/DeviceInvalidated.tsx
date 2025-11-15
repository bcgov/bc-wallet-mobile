import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { Button, ButtonType, ThemedText, TOKENS, useServices, useTheme } from '@bifold/core'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'

/**
 * Component displayed when the device has been invalidated.
 *
 * @returns {*} {JSX.Element} The DeviceInvalidated component.
 */
export const DeviceInvalidated = (): JSX.Element => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const navigation = useNavigation()
  const factoryReset = useFactoryReset()

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

  /**
   * Handles the factory reset operation.
   */
  const handleFactoryReset = useCallback(async () => {
    const result = await factoryReset()

    if (!result.success) {
      logger.error('Factory reset failed', result.error)
    }
  }, [factoryReset, logger])

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scollContainer}>
        <Icon name="phonelink-erase" size={200} color={ColorPalette.brand.icon} style={styles.icon} />
        <View style={styles.textContainer}>
          <ThemedText variant="headingThree">{t('BCSC.Modals.DeviceInvalidated.Header')}</ThemedText>
          <ThemedText style={styles.textContent}>{t('BCSC.Modals.DeviceInvalidated.ContentA')}</ThemedText>
          <ThemedText style={styles.textContent}>{t('BCSC.Modals.DeviceInvalidated.ContentB')}</ThemedText>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          title={t('BCSC.Modals.DeviceInvalidated.OKButton')}
          buttonType={ButtonType.Primary}
          onPress={handleFactoryReset}
        />
      </View>
    </SafeAreaView>
  )
}
