import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { TestIds } from '@/test-ids/registry'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useServices,
  useTheme,
} from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { PermissionsAndroid, StyleSheet } from 'react-native'

type BluetoothDisclosureProps = {
  onContinue: (permissionGranted: boolean) => void
}

/**
 * Renders the Bluetooth Disclosure screen, informing users about the need for Bluetooth permissions.
 * @param onContinue - A callback function that is called when the user presses the continue button. It receives a boolean indicating whether Bluetooth permission was granted.
 * @returns The BluetoothDisclosureContent component.
 */
export const BluetoothDisclosure = ({ onContinue }: BluetoothDisclosureProps) => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const styles = StyleSheet.create({
    title: {
      marginBottom: Spacing.lg,
    },
  })

  const onPressContinue = async () => {
    let permissionStatus = PermissionsAndroid.RESULTS.DENIED
    try {
      permissionStatus = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT)
    } catch (error) {
      logger.error('[BluetoothDisclosure] Error requesting Bluetooth permission:', error as Error)
    }

    onContinue(permissionStatus === PermissionsAndroid.RESULTS.GRANTED)
  }

  const controls = (
    <ControlContainer>
      <Button
        title={t('Global.Continue')}
        buttonType={ButtonType.Primary}
        onPress={onPressContinue}
        testID={testIdWithKey(TestIds.verify.bluetoothDisclosure.continue)}
        accessibilityLabel={t('Global.Continue')}
      />
    </ControlContainer>
  )

  return (
    <ScreenWrapper padded={false} controls={controls} scrollViewContainerStyle={{ padding: Spacing.lg }}>
      <ThemedText variant="headingThree" style={styles.title}>
        {t('BCSC.BluetoothDisclosure.Title')}
      </ThemedText>
      <ThemedText>{t('BCSC.BluetoothDisclosure.Description')}</ThemedText>
    </ScreenWrapper>
  )
}
