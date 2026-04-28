import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { AccountSetupType, BCDispatchAction, BCState } from '@/store'
import BCSCLogo from '@assets/img/BCSCLogo.svg'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  useDeveloperMode,
  useStore,
  useTheme,
} from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, Vibration, View } from 'react-native'

interface AccountSetupScreenProps {
  navigation: StackNavigationProp<BCSCOnboardingStackParams, BCSCScreens.OnboardingAccountSetup>
}

const AccountSetupScreen = ({ navigation }: AccountSetupScreenProps) => {
  const [, dispatch] = useStore<BCState>()
  const { t } = useTranslation()
  const { Spacing, ColorPalette } = useTheme()
  const { incrementDeveloperMenuCounter } = useDeveloperMode(() => {
    Vibration.vibrate()
    navigation.navigate(BCSCScreens.OnboardingDeveloper)
  })

  const styles = StyleSheet.create({
    contentContainer: {
      flexGrow: 1,
      gap: Spacing.lg,
    },
    image: {
      marginTop: Spacing.xxl,
      alignItems: 'center',
    },
    pressableArea: {
      width: '100%',
    },
  })

  const handleAddAccount = useCallback(() => {
    dispatch({
      type: BCDispatchAction.ACCOUNT_SETUP_TYPE,
      payload: [AccountSetupType.AddAccount],
    })
    navigation.navigate(BCSCScreens.OnboardingPrivacyPolicy)
  }, [navigation, dispatch])

  const handleTransferAccount = useCallback(() => {
    dispatch({
      type: BCDispatchAction.ACCOUNT_SETUP_TYPE,
      payload: [AccountSetupType.TransferAccount],
    })
    navigation.navigate(BCSCScreens.TransferAccountInformation)
  }, [navigation, dispatch])

  const controls = (
    <ControlContainer>
      <Button
        buttonType={ButtonType.Primary}
        title={t('BCSC.AccountSetup.AddAccount')}
        onPress={handleAddAccount}
        accessibilityLabel={t('BCSC.AccountSetup.AddAccount')}
        testID={testIdWithKey('AddAccount')}
      />
      <Button
        buttonType={ButtonType.Secondary}
        title={t('BCSC.AccountSetup.TransferAccount')}
        onPress={handleTransferAccount}
        accessibilityLabel={t('BCSC.AccountSetup.TransferAccount')}
        testID={testIdWithKey('TransferAccount')}
      />
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      padded={false}
      controls={controls}
      scrollViewContainerStyle={{
        flexGrow: 1,
        gap: Spacing.md,
        padding: Spacing.lg,
      }}
    >
      <Pressable
        onPress={incrementDeveloperMenuCounter}
        style={styles.pressableArea}
        accessible={false}
        accessibilityElementsHidden={true}
        importantForAccessibility="no-hide-descendants"
        testID={testIdWithKey('DeveloperCounter')}
      >
        <View style={styles.image}>
          <BCSCLogo width={120} height={120} />
        </View>
      </Pressable>
      <ThemedText variant={'headingFour'} style={{ textAlign: 'center', color: ColorPalette.brand.primary }}>
        {t('BCSC.AccountSetup.Title')}
      </ThemedText>
      <ThemedText style={{ textAlign: 'center' }}>{t('BCSC.AccountSetup.Description')}</ThemedText>
    </ScreenWrapper>
  )
}

export default AccountSetupScreen
