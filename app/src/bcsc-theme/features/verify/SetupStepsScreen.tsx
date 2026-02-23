import { hitSlop } from '@/constants'
import { AccountSetupType, BCState } from '@/store'
import { BCSCScreens, BCSCVerifyStackParams } from '@bcsc-theme/types/navigators'
import { ScreenWrapper, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native'
import { BCSCCardProcess } from 'react-native-bcsc-core'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import useSetupStepsModel from './_models/useSetupStepsModel'
import { SetupStep, shouldStepBeDisabled } from './components/SetupStep'

type SetupStepsScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.SetupSteps>
}

/**
 * The SetupStepsScreen component displays the steps required for setting up identity verification for BCSC
 *
 * Currently this supports several flows:
 *    1. BCSC card with photo
 *    2. BCSC combo card with photo
 *    3. BCSC card without photo (requires second ID)
 *    4. Non-BCSC cards (requires two IDs)
 *    5. Transfer account flow
 *
 * @param {SetupStepsScreenProps} props - The props for the component, including navigation.
 * @returns {*} {React.ReactElement} The rendered SetupStepsScreen component.
 */
const SetupStepsScreen: React.FC<SetupStepsScreenProps> = ({ navigation }) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette, TextTheme } = useTheme()
  const [store] = useStore<BCState>()

  const { steps, stepActions, isCheckingStatus, handleCheckStatus, handleCancelVerification } =
    useSetupStepsModel(navigation)

  const styles = StyleSheet.create({
    itemSeparator: {
      width: '100%',
      height: 8,
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    step: {
      paddingVertical: 24,
      paddingHorizontal: 24,
      backgroundColor: ColorPalette.brand.secondaryBackground,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    contentEmailContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    addSecondIdTextContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 32,
      marginBottom: 0,
      justifyContent: 'space-between',
    },
  })

  const renderStepSeparator = () => <View style={styles.itemSeparator} />

  // SETUP STEP 1: Nickname Account
  const renderStepNickname = () => (
    <SetupStep
      title={t('BCSC.Steps.Step1')}
      subtext={steps.nickname.subtext}
      isComplete={steps.nickname.completed}
      isFocused={steps.nickname.focused}
      isDisabled={shouldStepBeDisabled(steps.nickname.completed, steps.nickname.focused)}
      onPress={stepActions.nickname}
    />
  )
  // SETUP STEP 2: Identification submission
  const renderStepID = () => (
    <SetupStep
      title={t('BCSC.Steps.Step2')}
      subtext={steps.id.subtext}
      isComplete={steps.id.completed}
      isFocused={steps.id.focused}
      isDisabled={shouldStepBeDisabled(steps.id.completed, steps.id.focused)}
      onPress={stepActions.id}
    >
      {
        // show additional text if a second card is required
        steps.id.nonBcscNeedsAdditionalCard || steps.id.nonPhotoBcscNeedsAdditionalCard ? (
          <View>
            <View style={styles.addSecondIdTextContainer}>
              <ThemedText style={{ fontWeight: 'bold', color: ColorPalette.brand.text }}>
                {t('BCSC.Steps.AddSecondIdText')}
              </ThemedText>
              <Icon size={30} color={ColorPalette.brand.text} name={'chevron-right'} />
            </View>
            {store.bcscSecure.cardProcess !== BCSCCardProcess.BCSCPhoto && (
              <ThemedText style={{ color: ColorPalette.brand.text }}>
                {t('BCSC.Steps.AdditionalIdentificationRequired')}
              </ThemedText>
            )}
          </View>
        ) : null
      }
    </SetupStep>
  )
  // SETUP STEP 3: Residential Address
  const renderStepAddress = () => (
    <SetupStep
      title={t('BCSC.Steps.Step3')}
      subtext={steps.address.subtext}
      isComplete={steps.address.completed}
      isFocused={steps.address.focused}
      isDisabled={shouldStepBeDisabled(steps.address.completed, steps.address.focused)}
      onPress={stepActions.address}
    />
  )
  // SETUP STEP 4: Email Address
  const renderStepEmail = () => (
    <SetupStep
      title={t('BCSC.Steps.Step4')}
      subtext={steps.email.subtext}
      isComplete={steps.email.completed}
      isFocused={steps.email.focused}
      isDisabled={shouldStepBeDisabled(steps.email.completed, steps.email.focused)}
      onPress={stepActions.email}
    >
      {
        <View style={styles.contentEmailContainer}>
          {steps.email.completed ? (
            <>
              <ThemedText style={{ color: TextTheme.normal.color, flex: 1 }}>
                {t('BCSC.Steps.StoredEmail', { email: store.bcscSecure.email })}
              </ThemedText>
              <TouchableOpacity
                onPress={stepActions.email}
                testID={testIdWithKey('EditEmail')}
                accessibilityLabel={t('BCSC.Steps.EditEmail')}
                hitSlop={hitSlop}
              >
                <ThemedText style={{ color: ColorPalette.brand.link, textDecorationLine: 'underline' }}>
                  {t('BCSC.Steps.EditEmail')}
                </ThemedText>
              </TouchableOpacity>
            </>
          ) : (
            <ThemedText
              style={{
                color: steps.email.focused ? ColorPalette.brand.text : TextTheme.normal.color,
              }}
            >
              {t('BCSC.Steps.EmailAddress')}
            </ThemedText>
          )}
        </View>
      }
    </SetupStep>
  )
  // SETUP STEP 5: Identity Verification
  const renderStepVerification = () => (
    <SetupStep
      title={t('BCSC.Steps.Step5')}
      subtext={steps.verify.subtext}
      isComplete={false} // The user won't see this step completed, they'll be veriified or need to re submit
      isFocused={steps.verify.focused}
      isDisabled={!steps.email.completed || Boolean(store.bcscSecure.userSubmittedVerificationVideo)}
      onPress={stepActions.verify}
    />
  )
  // TRANSFER SETUP STEP 2: Transfer Account
  const renderStepTransfer = () => (
    <SetupStep
      title={t('BCSC.Steps.Step2')}
      subtext={steps.transfer.subtext}
      isComplete={steps.transfer.completed}
      isFocused={steps.transfer.focused}
      isDisabled={shouldStepBeDisabled(steps.transfer.completed, steps.transfer.focused)}
      onPress={stepActions.transfer}
    />
  )

  // Renders all of the steps for Add Account flow
  const renderAddAccountSteps = () => (
    <>
      {renderStepNickname()}
      {renderStepSeparator()}
      {renderStepID()}
      {renderStepSeparator()}
      {renderStepAddress()}
      {renderStepSeparator()}
      {renderStepEmail()}
      {renderStepSeparator()}
      {renderStepVerification()}
    </>
  )

  // Renders all of the steps for Transfer Account flow
  const renderTransferAccountSteps = () => (
    <>
      {renderStepNickname()}
      {renderStepSeparator()}
      {renderStepTransfer()}
    </>
  )
  const accountType = store.bcsc?.accountSetupType ?? AccountSetupType.AddAccount
  return (
    <ScreenWrapper padded={false} edges={['bottom', 'left', 'right']}>
      {accountType === AccountSetupType.AddAccount ? renderAddAccountSteps() : renderTransferAccountSteps()}

      {store.bcscSecure.userSubmittedVerificationVideo ? (
        <>
          <View style={styles.itemSeparator} />
          <TouchableOpacity
            disabled={isCheckingStatus}
            style={[
              styles.step,
              styles.titleRow,
              {
                backgroundColor: ColorPalette.brand.primary,
                justifyContent: 'space-between',
                paddingVertical: Spacing.md,
              },
            ]}
            onPress={handleCheckStatus}
          >
            <ThemedText variant={'headingFour'} style={{ color: ColorPalette.brand.text }}>
              {t('BCSC.Steps.CheckStatus')}
            </ThemedText>
            {isCheckingStatus ? (
              <ActivityIndicator color={ColorPalette.brand.text} />
            ) : (
              <Icon name={'chevron-right'} color={ColorPalette.brand.text} size={32} />
            )}
          </TouchableOpacity>

          <View style={styles.itemSeparator} />

          <TouchableOpacity
            style={[
              styles.step,
              styles.titleRow,
              {
                backgroundColor: ColorPalette.brand.primary,
                justifyContent: 'space-between',
                paddingVertical: Spacing.md,
              },
            ]}
            onPress={handleCancelVerification}
          >
            <ThemedText variant={'headingFour'} style={{ color: ColorPalette.brand.text }}>
              {t('BCSC.Steps.ChooseAnotherWayToVerify')}
            </ThemedText>
            <Icon name={'chevron-right'} color={ColorPalette.brand.text} size={32} />
          </TouchableOpacity>
        </>
      ) : null}
    </ScreenWrapper>
  )
}

export default SetupStepsScreen
