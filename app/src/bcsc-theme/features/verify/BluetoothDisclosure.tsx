import { ActionScreenLayout } from '@/bcsc-theme/components/ActionScreenLayout'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { requestBluetoothPermission } from '@/bcsc-theme/utils/bluetooth'
import { ThemedText, TOKENS, useServices } from '@bifold/core'
import { StackScreenProps } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'

type BluetoothDisclosureProps = StackScreenProps<BCSCVerifyStackParams, BCSCScreens.BluetoothDisclosure>

/**
 * Renders the Bluetooth Disclosure screen, informing users about the need for Bluetooth permissions.
 * @param navigation - The navigation prop for navigating between screens.
 * @returns The BluetoothDisclosureContent component.
 */
export const BluetoothDisclosure = ({ route }: BluetoothDisclosureProps) => {
  const { t } = useTranslation()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  const onContinue = route.params.onContinue

  const onPressContinue = async () => {
    let bluetoothGranted = false
    try {
      bluetoothGranted = await requestBluetoothPermission()
    } catch (error) {
      logger.error('[BluetoothDisclosure] Error requesting Bluetooth permission:', error as Error)
    }

    onContinue(bluetoothGranted)
  }

  return (
    <ActionScreenLayout primaryActionText={t('Global.Continue')} onPressPrimaryAction={onPressContinue}>
      <ThemedText variant="headingThree">{t('BCSC.BluetoothDisclosure.Title')}</ThemedText>
      <ThemedText>{t('BCSC.BluetoothDisclosure.Description')}</ThemedText>
    </ActionScreenLayout>
  )
}
