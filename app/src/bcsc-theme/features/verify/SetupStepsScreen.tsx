import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCSCCardType } from '@/bcsc-theme/types/cards'
import { hitSlop } from '@/constants'
import { useSetupSteps } from '@/hooks/useSetupSteps'
import { BCDispatchAction, BCState } from '@/store'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@bcsc-theme/types/navigators'
import { Button, ButtonType, testIdWithKey, ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { SetupStep } from './components/SetupStep'

type SetupStepsScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.SetupSteps>
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
  const [store, dispatch] = useStore<BCState>()
  const { evidence, token } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  // tracks the current step state (completed and focused)
  const step = useSetupSteps(store)

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
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
    contentContainer: {
      marginTop: 16,
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    contentText: {
      flex: 1,
      flexWrap: 'wrap',
    },
    contentEmailContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    contentEmail: {
      flex: 1,
      flexWrap: 'wrap',
    },
    contentEmailButton: {
      alignSelf: 'flex-end',
    },
    addSecondIdTextContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 32,
      marginBottom: 0,
      justifyContent: 'space-between',
    },
  })

  const handleEmailStepPress = () => {
    navigation.navigate(BCSCScreens.EnterEmailScreen, { cardType: store.bcsc.cardType })
  }

  const handleCheckStatus = async () => {
    if (!store.bcsc.verificationRequestId) {
      throw new Error('Verification request ID is missing')
    }

    const { status } = await evidence.getVerificationRequestStatus(store.bcsc.verificationRequestId)

    if (status === 'verified') {
      if (!store.bcsc.deviceCode || !store.bcsc.userCode) {
        throw new Error('Device code or user code is missing for verification')
      }

      const { refresh_token, bcsc_devices_count } = await token.checkDeviceCodeStatus(
        store.bcsc.deviceCode,
        store.bcsc.userCode
      )

      if (refresh_token) {
        dispatch({ type: BCDispatchAction.UPDATE_REFRESH_TOKEN, payload: [refresh_token] })
      }

      if (bcsc_devices_count !== undefined) {
        dispatch({
          type: BCDispatchAction.UPDATE_DEVICE_COUNT,
          payload: [bcsc_devices_count],
        })
      }
      navigation.navigate(BCSCScreens.VerificationSuccess)
    } else {
      navigation.navigate(BCSCScreens.PendingReview)
    }
  }

  const handleCancelVerification = async () => {
    Alert.alert(
      'Are you sure?',
      'Your verification request sent to Service BC will be deleted. Then you can choose another way to verify.',
      [
        {
          text: 'Delete Verify Request',
          onPress: async () => {
            try {
              await evidence.cancelVerificationRequest(store.bcsc.verificationRequestId!)
            } catch (error) {
              logger.error(`Error cancelling verification request: ${error}`)
            } finally {
              dispatch({ type: BCDispatchAction.UPDATE_PENDING_VERIFICATION, payload: [false] })
              navigation.navigate(BCSCScreens.VerificationMethodSelection)
            }
          },
        },
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
      ]
    )
  }

  /**
   * Returns the subtext for Step 1 (Identification) of the verification process.
   *
   * @returns {*} {string[]} An array of strings representing the subtext for Step 1.
   */
  const getVerificationStep1Subtext = useCallback((): string[] => {
    const cards: string[] = []

    // if the bcsc card is registered, show the bcsc serial number
    if (step.id.completed && store.bcsc.serial) {
      cards.push(`ID: BC Services Card (${store.bcsc.serial})`)
    }

    // if the user has added additional evidence, add each to the list
    for (const evidence of store.bcsc.additionalEvidenceData) {
      cards.push(`ID: ${evidence.evidenceType.evidence_type_label} (${evidence.documentNumber})`)
    }

    if (cards.length) {
      return cards
    }

    // otherwise, show the default text
    return [t('Unified.Steps.ScanOrTakePhotos')]
  }, [store.bcsc.additionalEvidenceData, store.bcsc.serial, step.id.completed, t])

  /**
   * Returns the subtext for Step 2 (Residential Address) of the verification process.
   *
   * TODO (MD): Localization / translations for these return values
   *
   * @param {boolean} bcscIsRegistered - Indicates if the BC Services Card is registered.
   * @returns {*} {string} The subtext for Step 2.
   */
  const getVerificationStep2Subtext = useCallback(() => {
    if (step.id.completed && store.bcsc.serial) {
      return 'Address: Residential address from your BC Services Card will be used'
    }

    if (store.bcsc.userMetadata?.address && store.bcsc.deviceCode) {
      return 'Address: Residential address saved'
    }

    return 'Residential address'
  }, [step.id.completed, store.bcsc.serial, store.bcsc.userMetadata?.address, store.bcsc.deviceCode])

  /**
   * Returns the subtext for Step 4 (Verify Identity) of the verification process.
   *
   * @returns {*} {string} The subtext for step 4
   */
  const getVerificationStep4Subtext = useCallback(() => {
    if (step.verify.focused && store.bcsc.deviceCodeExpiresAt) {
      const expirationDate = store.bcsc.deviceCodeExpiresAt.toLocaleString('en-CA', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
      return `Verify identity by ${expirationDate}`
    }

    if (step.id.nonPhotoBcscNeedsAdditionalCard) {
      return 'Complete additional identification first'
    }

    return 'Verify identity'
  }, [step.verify.focused, step.id.nonPhotoBcscNeedsAdditionalCard, store.bcsc.deviceCodeExpiresAt])

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView>
        {/* SETUP STEP 2: Identification submission */}

        <SetupStep
          title={'Step 1'}
          subtext={getVerificationStep1Subtext()}
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
                  <ThemedText style={{ fontWeight: 'bold', color: ColorPalette.brand.text }}>Add second ID</ThemedText>
                  <Icon size={30} color={ColorPalette.brand.text} name={'chevron-right'} />
                </View>
                {
                  // QUESTION (MD): Do we want the same for the non bcsc card verification?
                  store.bcsc.cardType === BCSCCardType.NonPhoto ? (
                    <ThemedText>{'Additional identification required for non-photo BC Services Card.'}</ThemedText>
                  ) : null
                }
              </View>
            ) : null
          }
        </SetupStep>

        <View style={styles.itemSeparator} />
        {/* SETUP STEP 2: Residential Address */}

        <SetupStep
          title={'Step 2'}
          subtext={[getVerificationStep2Subtext()]}
          isComplete={step.address.completed}
          isFocused={step.address.focused}
          onPress={() => {
            navigation.navigate(BCSCScreens.ResidentialAddressScreen)
          }}
        />

        <View style={styles.itemSeparator} />
        {/* SETUP STEP 3: Email Address */}

        <SetupStep
          title={'Step 3'}
          subtext={[]}
          isComplete={step.email.completed}
          isFocused={step.email.focused}
          onPress={handleEmailStepPress}
        >
          {
            <View style={styles.contentEmailContainer}>
              {step.email.completed ? (
                <>
                  <ThemedText style={{ color: TextTheme.normal.color }}>{`Email: ${store.bcsc.email}`}</ThemedText>
                  <TouchableOpacity
                    style={styles.contentEmailButton}
                    onPress={handleEmailStepPress}
                    testID={testIdWithKey('EditEmail')}
                    accessibilityLabel={'Edit'}
                    hitSlop={hitSlop}
                  >
                    <ThemedText style={{ color: ColorPalette.brand.link, textDecorationLine: 'underline' }}>
                      Edit
                    </ThemedText>
                  </TouchableOpacity>
                </>
              ) : (
                <ThemedText
                  style={{
                    color: step.email.focused ? ColorPalette.brand.text : TextTheme.normal.color,
                  }}
                >
                  Email Address
                </ThemedText>
              )}
            </View>
          }
        </SetupStep>

        <View style={styles.itemSeparator} />
        {/* SETUP STEP 4: Identity Verification */}

        <SetupStep
          title={'Step 4'}
          subtext={[getVerificationStep4Subtext()]}
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
                Check status
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
                Choose another way to verify
              </ThemedText>
              <Icon name={'chevron-right'} color={ColorPalette.brand.text} size={32} />
            </TouchableOpacity>
          </>
        ) : null}
        <View style={styles.itemSeparator} />
        <View style={{ padding: Spacing.md }}>
          <Button
            title={'Reset data'}
            onPress={() => {
              dispatch({ type: BCDispatchAction.UPDATE_CARD_TYPE, payload: [BCSCCardType.None] })
              dispatch({ type: BCDispatchAction.CLEAR_BCSC, payload: [undefined] })
            }}
            testID={testIdWithKey('ResetData')}
            accessibilityLabel={'Reset data'}
            buttonType={ButtonType.Secondary}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default SetupStepsScreen
