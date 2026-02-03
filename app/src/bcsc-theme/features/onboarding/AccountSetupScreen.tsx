import GenericCardImage from '@/bcsc-theme/components/GenericCardImage'
import { BCSCOnboardingStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { AccountSetupType, BCDispatchAction, BCState } from '@/store'
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
  const { Spacing } = useTheme()
  const { incrementDeveloperMenuCounter } = useDeveloperMode(() => {
    Vibration.vibrate()
    navigation.navigate(BCSCScreens.OnboardingDeveloper)
  })

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      padding: Spacing.md,
      justifyContent: 'space-between',
    },
    contentContainer: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    controlsContainer: {
      width: '100%',
      gap: Spacing.md,
    },
    pressableArea: {
      flex: 1,
      width: '100%',
    },
  })

  const handleAddAccount = useCallback(() => {
    dispatch({
      type: BCDispatchAction.ACCOUNT_SETUP_TYPE,
      payload: [AccountSetupType.AddAccount],
    })
    navigation.navigate(BCSCScreens.OnboardingSetupTypes)
  }, [navigation, dispatch])

  const handleTransferAccount = useCallback(() => {
    dispatch({
      type: BCDispatchAction.ACCOUNT_SETUP_TYPE,
      payload: [AccountSetupType.TransferAccount],
    })
    navigation.navigate(BCSCScreens.TransferAccountInformation)
  }, [navigation, dispatch])

  return (
    <ScreenWrapper padded={false} scrollable={false} style={styles.container}>
      <Pressable
        onPress={incrementDeveloperMenuCounter}
        style={styles.pressableArea}
        accessibilityElementsHidden={true}
        importantForAccessibility="no-hide-descendants"
        testID={testIdWithKey('DeveloperCounter')}
      >
        <View style={styles.contentContainer}>
          <GenericCardImage />
          <ThemedText variant={'headingFour'} style={{ textAlign: 'center' }}>
            {t('BCSC.AccountSetup.Title')}
          </ThemedText>
        </View>
      </Pressable>

      <View style={styles.controlsContainer}>
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
      </View>
    </ScreenWrapper>
  )
}

export default AccountSetupScreen
