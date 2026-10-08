import { ActionScreenLayout } from '@/bcsc-theme/components/ActionScreenLayout'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { requestBluetoothPermission } from '@/bcsc-theme/utils/bluetooth'
import { ThemedText } from '@bifold/core'
import { StackScreenProps } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'

type BluetoothDisclosureProps = StackScreenProps<BCSCVerifyStackParams>

/**
 * Renders the Bluetooth Disclosure screen, informing users about the need for Bluetooth permissions.
 * @param navigation - The navigation prop for navigating between screens.
 * @returns The BluetoothDisclosureContent component.
 */
export const BluetoothDisclosure = ({ navigation }: BluetoothDisclosureProps) => {
  const { t } = useTranslation()

  const onPressContinue = async () => {
    await requestBluetoothPermission()
    navigation.navigate(BCSCScreens.LiveCall)
  }

  return (
    <ActionScreenLayout primaryActionText={t('Global.Continue')} onPressPrimaryAction={onPressContinue}>
      <ThemedText variant="headingThree">{t('BCSC.BluetoothDisclosure.Title')}</ThemedText>
      <ThemedText>{t('BCSC.BluetoothDisclosure.Description')}</ThemedText>
    </ActionScreenLayout>
  )
}
