import { useFactoryReset } from '@/bcsc-theme/api/hooks/useFactoryReset'
import { BCSCCardProcess } from '@/bcsc-theme/types/cards'
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
 * The SetupStepsScreen component displays the steps required for setting up identity verification for BCSC
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

  const { steps, stepActions, handleCheckStatus, handleCancelVerification } = useSetupStepsModel(navigation)

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
        subtext={steps.nickname.subtext}
        isComplete={steps.nickname.completed}
        isFocused={steps.nickname.focused}
        onPress={stepActions.nickname}
      />

      <View style={styles.itemSeparator} />

      {/* SETUP STEP 2: Identification submission */}

      <SetupStep
        title={t('BCSC.Steps.Step2')}
        subtext={steps.id.subtext}
        isComplete={steps.id.completed}
        isFocused={steps.id.focused}
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
              {
                // QUESTION (MD): Do we want the same for the non bcsc card verification?
                store.bcsc.cardProcess !== BCSCCardProcess.BCSCPhoto && (
                  <ThemedText>{t('BCSC.Steps.AdditionalIdentificationRequired')}</ThemedText>
                )
              }
            </View>
          ) : null
        }
      </SetupStep>

      <View style={styles.itemSeparator} />

      {/* SETUP STEP 3: Residential Address */}

      <SetupStep
        title={t('BCSC.Steps.Step3')}
        subtext={steps.address.subtext}
        isComplete={steps.address.completed}
        isFocused={steps.address.focused}
        onPress={stepActions.address}
      />

      <View style={styles.itemSeparator} />
      {/* SETUP STEP 4: Email Address */}

      <SetupStep
        title={t('BCSC.Steps.Step4')}
        subtext={steps.email.subtext}
        isComplete={steps.email.completed}
        isFocused={steps.email.focused}
        onPress={stepActions.email}
      >
        {
          <View style={styles.contentEmailContainer}>
            {steps.email.completed ? (
              <>
                <ThemedText style={{ color: TextTheme.normal.color, flex: 1 }}>
                  {t('BCSC.Steps.StoredEmail', { email: store.bcsc.email })}
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

      <View style={styles.itemSeparator} />

      {/* SETUP STEP 5: Identity Verification */}

      <SetupStep
        title={t('BCSC.Steps.Step5')}
        subtext={steps.verify.subtext}
        isComplete={steps.verify.completed}
        isFocused={steps.verify.focused}
        onPress={stepActions.verify}
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
