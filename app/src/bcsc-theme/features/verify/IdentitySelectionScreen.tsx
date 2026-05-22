import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import useSecureActions from '@/bcsc-theme/hooks/useSecureActions'
import { useVerificationReset } from '@/bcsc-theme/hooks/useVerificationReset'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { BCState } from '@/store'
import ScanExampleImage from '@assets/img/scan_example.png'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { useFocusEffect } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Image } from 'react-native'
import { BCSCCardProcess } from 'react-native-bcsc-core'

const SCAN_EXAMPLE = Image.resolveAssetSource(ScanExampleImage).uri

type IdentitySelectionScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.IdentitySelection>
}

const IdentitySelectionScreen: React.FC<IdentitySelectionScreenProps> = ({
  navigation,
}: IdentitySelectionScreenProps) => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const [store] = useStore<BCState>()
  const { updateCardProcess } = useSecureActions()
  const verificationReset = useVerificationReset()

  // Reset the card registration process when the user navigates back
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', async (event) => {
      if (
        (event.data.action.type === 'GO_BACK' || event.data.action.type === 'POP') &&
        store.bcscSecure.deviceCode &&
        store.bcscSecure.userCode
      ) {
        // If the user has registered and backs out, reset the card registration process
        await verificationReset()
      }
    })

    return unsubscribe
  }, [verificationReset, navigation, store.bcscSecure?.deviceCode, store.bcscSecure?.userCode])

  /**
   * This fixes an issue where the user has selected Non-BCSC ID,
   * then navigated back to this screen, and the previous selection remains.
   */
  useFocusEffect(
    useCallback(() => {
      updateCardProcess(undefined)
    }, [updateCardProcess])
  )

  const onPressScan = useCallback(() => {
    navigation.navigate(BCSCScreens.ScanSerial)
  }, [navigation])

  const onPressOtherID = useCallback(async () => {
    navigation.navigate(BCSCScreens.DualIdentificationRequired)
    await updateCardProcess(BCSCCardProcess.NonBCSC)
  }, [navigation, updateCardProcess])

  const controls = (
    <ControlContainer>
      <Button
        buttonType={ButtonType.Primary}
        accessibilityLabel={t('BCSC.IdentitySelection.Scan')}
        title={t('BCSC.IdentitySelection.Scan')}
        testID={testIdWithKey('Scan')}
        onPress={onPressScan}
      />
      <Button
        buttonType={ButtonType.Secondary}
        accessibilityLabel={t('BCSC.IdentitySelection.UseOtherID')}
        title={t('BCSC.IdentitySelection.UseOtherID')}
        testID={testIdWithKey('OtherID')}
        onPress={onPressOtherID}
      />
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      controls={controls}
      padded={false}
      scrollViewContainerStyle={{ gap: Spacing.md, padding: Spacing.lg }}
    >
      <ThemedText variant={'headingThree'} style={{ textAlign: 'center' }}>
        {t('BCSC.IdentitySelection.HaveABCSC')}
      </ThemedText>
      <Image
        source={{ uri: SCAN_EXAMPLE }}
        style={{ flexGrow: 1, width: '100%', aspectRatio: 1.6 }}
        resizeMode={'contain'}
      />
      <ThemedText variant={'headingThree'}>{t('BCSC.IdentitySelection.ScanTheBack')}</ThemedText>
      <ThemedText>{t('BCSC.IdentitySelection.LineUpParagraph')}</ThemedText>
    </ScreenWrapper>
  )
}

export default IdentitySelectionScreen
