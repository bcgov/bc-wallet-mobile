import { BCSCBanner } from '@/bcsc-theme/components/AppBanner'
import { BCDispatchAction } from '@/store'
import {
  Button,
  ButtonLocation,
  ButtonType,
  IconButton,
  testIdWithKey,
  ThemedText,
  useStore,
  useTheme,
} from '@bifold/core'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

interface ReviewDevicesProps {
  bannerId: BCSCBanner
  maxDevices: number
  handleClose: ({ shouldAnimate }: { shouldAnimate: boolean }) => void
  onManageDevices: () => void
}

/**
 * Renders the content for the Review Devices modal, allowing users to manage their registered devices.
 *
 * @param {ReviewDevicesProps} props - The properties for the ReviewDevices component.
 * @returns {*} {JSX.Element} The ReviewDevices component.
 */
export const ReviewDevices = ({ bannerId, maxDevices, handleClose, onManageDevices }: ReviewDevicesProps) => {
  const [, dispatch] = useStore()
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    scrollContainer: {
      padding: Spacing.md,
      gap: Spacing.lg,
    },
    buttonContainer: {
      padding: Spacing.md,
      gap: Spacing.md,
    },
  })

  const handleManageDevices = useCallback(async () => {
    handleClose({ shouldAnimate: false })
    onManageDevices()
  }, [handleClose, onManageDevices])

  return (
    <SafeAreaView style={styles.container}>
      <IconButton
        buttonLocation={ButtonLocation.Left}
        accessibilityLabel={t('BCSC.SystemChecks.Devices.CloseButton')}
        testID={testIdWithKey('CloseReviewDevices')}
        onPress={() => handleClose({ shouldAnimate: true })}
        icon={'close'}
      />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedText variant={'headingThree'}>{t('BCSC.SystemChecks.Devices.ReviewDevicesTitle')}</ThemedText>

        <ThemedText>{`${t('BCSC.SystemChecks.Devices.ReviewDevicesContentA1')} ${maxDevices} ${t(
          'BCSC.SystemChecks.Devices.ReviewDevicesContentA2'
        )}`}</ThemedText>

        <ThemedText>{t('BCSC.SystemChecks.Devices.ReviewDevicesContentB')}</ThemedText>

        <ThemedText>{t('BCSC.SystemChecks.Devices.ReviewDevicesContentC')}</ThemedText>

        <ThemedText>{t('BCSC.SystemChecks.Devices.ReviewDevicesContentD')}</ThemedText>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          title={t('BCSC.SystemChecks.Devices.ManageDevicesButton')}
          buttonType={ButtonType.Primary}
          onPress={handleManageDevices}
          testID={testIdWithKey('ManageDevices')}
          accessibilityLabel={t('BCSC.SystemChecks.Devices.ManageDevicesButton')}
        />

        <Button
          title={t('BCSC.SystemChecks.Devices.CloseButton')}
          buttonType={ButtonType.Secondary}
          onPress={() => {
            handleClose({ shouldAnimate: true })
            dispatch({ type: BCDispatchAction.REMOVE_BANNER_MESSAGE, payload: [bannerId] })
          }}
          testID={testIdWithKey('Close')}
          accessibilityLabel={t('BCSC.SystemChecks.Devices.CloseButton')}
        />
      </View>
    </SafeAreaView>
  )
}
