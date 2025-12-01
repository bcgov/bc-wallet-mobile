import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { BCSCCardType } from '@/bcsc-theme/types/cards'
import { hitSlop } from '@/constants'
import { BCState } from '@/store'
import { BCSCScreens, BCSCVerifyStackParams } from '@bcsc-theme/types/navigators'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  TOKENS,
  useServices,
  useStore,
  useTheme,
} from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import useSetupStepsModel from './_models/useSetupStepsModel'
import { SetupStep } from './components/SetupStep'

type SetupStepsScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.SetupSteps>
}

/**
 * The SetupStepsScreen component displays the steps required for setting up identity verification for BCSC.
 *
 * Currently this supports several flows:
 *    1. BCSC card with photo
 *    2. BCSC combo card with photo
 *    3. BCSC card without photo (requires second ID)
 *    4. Non-BCSC cards (requires two IDs)
 *
 * @param {SetupStepsScreenProps} props - The props for the component, including navigation.
 * @returns {*} {JSX.Element} The rendered SetupStepsScreen component.
 */
const SetupStepsScreen: React.FC<SetupStepsScreenProps> = ({ navigation }) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette, TextTheme } = useTheme()
  const [store] = useStore<BCState>()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const factoryReset = useFactoryReset()

  const {
    step,
    handleCheckStatus,
    handleCancelVerification,
    getVerificationStep1Subtext,
    getVerificationStep2Subtext,
    getVerificationStep3Subtext,
    getVerificationStep5Subtext,
  } = useSetupStepsModel(navigation)

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

  return (
    <ScreenWrapper padded={false} edges={['bottom', 'left', 'right']}>
      {/* SETUP STEP 1: Nickname Account */}

      <SetupStep
        title={t('BCSC.Steps.Step1')}
        subtext={getVerificationStep1Subtext()}
        isComplete={step.nickname.completed}
        isFocused={step.nickname.focused}
        onPress={() => {
          navigation.navigate(BCSCScreens.NicknameAccount)
        }}
      />

      <View style={styles.itemSeparator} />

      {/* SETUP STEP 2: Identification submission */}

      <SetupStep
        title={t('BCSC.Steps.Step2')}
        subtext={getVerificationStep2Subtext()}
        isComplete={step.id.completed}
        isFocused={step.id.focused}
        onPress={() => {
          if (step.id.nonBcscNeedsAdditionalCard) {
            navigation.navigate(BCSCScreens.EvidenceTypeList)
            return
          }
          if (step.id.nonPhotoBcscNeedsAdditionalCard) {
            navigation.navigate(BCSCScreens.AdditionalIdentificationRequired)
            return
          }
          if (!step.id.completed) {
            navigation.navigate(BCSCScreens.IdentitySelection)
            return
          }
        }}
      >
        {
          // show additional text if a second card is required
          step.id.nonBcscNeedsAdditionalCard || step.id.nonPhotoBcscNeedsAdditionalCard ? (
            <View>
              <View style={styles.addSecondIdTextContainer}>
                <ThemedText style={{ fontWeight: 'bold', color: ColorPalette.brand.text }}>
                  {t('BCSC.Steps.AddSecondIdText')}
                </ThemedText>
                <Icon size={30} color={ColorPalette.brand.text} name={'chevron-right'} />
              </View>
              {
                // QUESTION (MD): Do we want the same for the non bcsc card verification?
                store.bcsc.cardType === BCSCCardType.NonPhoto ? (
                  <ThemedText>{t('BCSC.Steps.AdditionalIdentificationRequired')}</ThemedText>
                ) : null
              }
            </View>
          ) : null
        }
      </SetupStep>

      <View style={styles.itemSeparator} />

      {/* SETUP STEP 3: Residential Address */}

      <SetupStep
        title={t('BCSC.Steps.Step3')}
        subtext={[getVerificationStep3Subtext()]}
        isComplete={step.address.completed}
        isFocused={step.address.focused}
        onPress={() => {
          navigation.navigate(BCSCScreens.ResidentialAddress)
        }}
      />

      <View style={styles.itemSeparator} />
      {/* SETUP STEP 4: Email Address */}

      <SetupStep
        title={t('BCSC.Steps.Step4')}
        subtext={[]}
        isComplete={step.email.completed}
        isFocused={step.email.focused}
        onPress={() => navigation.navigate(BCSCScreens.EnterEmail, { cardType: store.bcsc.cardType })}
      >
        {
          <View style={styles.contentEmailContainer}>
            {step.email.completed ? (
              <>
                <ThemedText style={{ color: TextTheme.normal.color, flex: 1 }}>
                  {t('BCSC.Steps.StoredEmail', { email: store.bcsc.email })}
                </ThemedText>
                <TouchableOpacity
                  onPress={() => navigation.navigate(BCSCScreens.EnterEmail, { cardType: store.bcsc.cardType })}
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
                  color: step.email.focused ? ColorPalette.brand.text : TextTheme.normal.color,
                }}
              >
                {t('BCSC.Steps.EmailAddress')}
              </ThemedText>
            )}
          </View>
        }
      </SetupStep>

      <View style={styles.itemSeparator} />

      {/* SETUP STEP 5: Identity Verification */}

      <SetupStep
        title={t('BCSC.Steps.Step5')}
        subtext={[getVerificationStep5Subtext()]}
        isComplete={step.verify.completed}
        isFocused={step.verify.focused}
        onPress={() => {
          navigation.navigate(BCSCScreens.VerificationMethodSelection)
        }}
      />

      {store.bcsc.pendingVerification ? (
        <>
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
            onPress={handleCheckStatus}
          >
            <ThemedText variant={'headingFour'} style={{ color: ColorPalette.brand.text }}>
              {t('BCSC.Steps.CheckStatus')}
            </ThemedText>
            <Icon name={'chevron-right'} color={ColorPalette.brand.text} size={32} />
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
      <View style={styles.itemSeparator} />
      <View style={{ padding: Spacing.md }}>
        <Button
          title={t('BCSC.Steps.ResetData')}
          onPress={async () => {
            const result = await factoryReset()

            if (!result.success) {
              logger.error('Factory reset failed', result.error)
            }
          }}
          testID={testIdWithKey('ResetData')}
          accessibilityLabel={t('BCSC.Steps.ResetData')}
          buttonType={ButtonType.Secondary}
        />
      </View>
    </ScreenWrapper>
  )
}

export default SetupStepsScreen
