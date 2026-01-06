import { Spacing } from '@/bcwallet-theme/theme'
import { useWorkflowNavigation } from '@/contexts/WorkflowNavigationContext'
import TwoPhones from '@assets/img/transfer-account-two-phones.png'
import { Button, ButtonType, ScreenWrapper, ThemedText } from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Image } from 'react-native'

const TWO_PHONES = Image.resolveAssetSource(TwoPhones)

const TransferAccountInformationScreen: React.FC = () => {
  const { t } = useTranslation()
  const { goToNextScreen } = useWorkflowNavigation()

  const controls = (
    <Button
      title={t('BCSC.TransferInformation.TransferAccount')}
      buttonType={ButtonType.Primary}
      onPress={() => {
        goToNextScreen()
      }}
    />
  )
  return (
    <ScreenWrapper controls={controls} padded scrollViewContainerStyle={{ gap: Spacing.lg }}>
      <Image source={TWO_PHONES} style={{ height: 300, width: 'auto' }} resizeMode={'contain'} />
      <ThemedText variant={'headingThree'}>{t('BCSC.TransferInformation.Title')}</ThemedText>
      <ThemedText>{t('BCSC.TransferInformation.Instructions')}</ThemedText>
    </ScreenWrapper>
  )
}

export default TransferAccountInformationScreen
