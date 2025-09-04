import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@bcsc-theme/types/navigators'
import { Button, ButtonType, testIdWithKey, ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback } from 'react'
import useApi from '@/bcsc-theme/api/hooks/useApi'
import { BCDispatchAction, BCState } from '@/store'
import { useTranslation } from 'react-i18next'
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { BCSCCardType } from '@/bcsc-theme/types/cards'
import { SetupStep } from './components/SetupStep'
import { hitSlop } from '@/constants'

type SetupStepsScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.SetupSteps>
}

const SetupStepsScreen: React.FC<SetupStepsScreenProps> = ({ navigation }) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette, TextTheme } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const { evidence, token } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  // store + card attributes
  const bcscSerialNumber = store.bcsc.serial || null
  const emailAddress = store.bcsc.email || null
  const emailConfirmed = Boolean(store.bcsc.emailConfirmed)
  const isNonPhotoCard = store.bcsc.cardType === BCSCCardType.NonPhoto
  const isNonBCSCCards = store.bcsc.cardType === BCSCCardType.Other

  // additional ID requirements
  const missingPhotoId = !store.bcsc.additionalEvidenceData.some((item) => item.evidenceType.has_photo)
  const nonBcscNeedsAdditionalCard = isNonBCSCCards && store.bcsc.additionalEvidenceData.length === 1
  const nonPhotoBcscNeedsAdditionalCard = isNonPhotoCard && missingPhotoId

  // card registration state
  const bcscRegistered = Boolean(bcscSerialNumber && emailAddress)
  const nonBcscRegistered = isNonBCSCCards && store.bcsc.additionalEvidenceData.length === 2
  const registered = bcscRegistered || nonBcscRegistered

  // step completion state
  const Step1IdsCompleted = registered && !nonBcscNeedsAdditionalCard && !nonPhotoBcscNeedsAdditionalCard
  const Step2AddressCompleted = Boolean(store.bcsc.deviceCode)
  const Step3EmailCompleted = Boolean(emailAddress && emailConfirmed)
  const Step4VerificationCompleted = store.bcsc.verified

  const Step4VerificationEnabled =
    Step1IdsCompleted && Step2AddressCompleted && Step3EmailCompleted && !store.bcsc.pendingVerification

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
    // if the card type is Other (multiple non BCSC cards), show each card type label
    if (isNonBCSCCards && store.bcsc.additionalEvidenceData.length > 0) {
      return store.bcsc.additionalEvidenceData.map((evidence) => `ID: ${evidence.evidenceType.evidence_type_label}`)
    }

    // if the bcsc card is registered, show the bcsc serial number
    if (bcscRegistered) {
      return [`ID: BC Services Card (${bcscSerialNumber})`]
    }

    // otherwise, show the default text
    return [t('Unified.Steps.ScanOrTakePhotos')]
  }, [bcscRegistered, bcscSerialNumber, store.bcsc.additionalEvidenceData, isNonBCSCCards, t])

  /**
   * Returns the subtext for Step 2 (Residential Address) of the verification process.
   *
   * TODO (MD): Localization / translations for these return values
   *
   * @param {boolean} bcscIsRegistered - Indicates if the BC Services Card is registered.
   * @returns {*} {string} The subtext for Step 2.
   */
  const getVerificationStep2Subtext = useCallback(() => {
    if (bcscRegistered) {
      return 'Address: Residential address from your BC Services Card will be used'
    }

    if (store.bcsc.userMetadata?.address && store.bcsc.deviceCode) {
      return 'Address: Residential address saved'
    }

    return 'Residential address'
  }, [bcscRegistered, store.bcsc.userMetadata?.address, store.bcsc.deviceCode])

  /**
   * Returns the subtext for Step 4 (Verify Identity) of the verification process.
   *
   * @returns {*} {string} The subtext for step 4
   */
  const getVerificationStep4Subtext = useCallback(() => {
    if (Step4VerificationEnabled && store.bcsc.deviceCodeExpiresAt) {
      const expirationDate = store.bcsc.deviceCodeExpiresAt.toLocaleString('en-CA', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
      return `Verify identity by ${expirationDate}`
    }

    if (Step4VerificationEnabled && !store.bcsc.deviceCodeExpiresAt) {
      // developer error, should not be possible to reach this state
      throw new Error('Invalid setup steps detected, missing device code expiration.')
    }

    if (missingPhotoId) {
      return 'Complete additional identification first'
    }

    return 'Verify identity'
  }, [Step4VerificationEnabled, missingPhotoId, store.bcsc.deviceCodeExpiresAt])

  return (
    <View style={styles.container}>
      {/* SETUP STEP 2: Identification submission */}

      <SetupStep
        title={'Step 1'}
        subtext={getVerificationStep1Subtext()}
        isComplete={Step1IdsCompleted}
        isFocused={true}
        onPress={() => {
          if (nonBcscNeedsAdditionalCard) {
            navigation.navigate(BCSCScreens.EvidenceTypeList)
            return
          }
          if (!registered) {
            navigation.navigate(BCSCScreens.IdentitySelection)
            return
          }
          if (nonPhotoBcscNeedsAdditionalCard) {
            navigation.navigate(BCSCScreens.AdditionalIdentificationRequired)
          }
        }}
      >
        {
          // show additional text if a second card is required
          nonBcscNeedsAdditionalCard || nonPhotoBcscNeedsAdditionalCard ? (
            <View>
              <View style={styles.addSecondIdTextContainer}>
                <ThemedText style={{ fontWeight: 'bold', color: ColorPalette.brand.text }}>Add second ID</ThemedText>
                <Icon size={30} color={ColorPalette.brand.text} name={'chevron-right'} />
              </View>
              {
                // QUESTION (MD): Do we want the same for the non bcsc card verification?
                isNonPhotoCard ? (
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
        isComplete={Step2AddressCompleted}
        isFocused={Step1IdsCompleted && !Step2AddressCompleted}
        onPress={() => {
          navigation.navigate(BCSCScreens.ResidentialAddressScreen)
        }}
      />

      <View style={styles.itemSeparator} />
      {/* SETUP STEP 3: Email Address */}

      <SetupStep
        title={'Step 3'}
        subtext={[]}
        isComplete={Step3EmailCompleted}
        isFocused={Step2AddressCompleted && !Step3EmailCompleted}
        onPress={handleEmailStepPress}
      >
        {
          <View style={styles.contentEmailContainer}>
            {Step3EmailCompleted ? (
              <>
                <ThemedText style={{ color: TextTheme.normal.color }}>{`Email: ${emailAddress}`}</ThemedText>
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
                  color:
                    Step2AddressCompleted && !Step3EmailCompleted ? ColorPalette.brand.text : TextTheme.normal.color,
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
        isComplete={Step4VerificationCompleted}
        // verification is the final step, ensure all other steps complete before proceeding
        isFocused={Step1IdsCompleted && Step2AddressCompleted && Step3EmailCompleted && Step4VerificationEnabled}
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
            dispatch({ type: BCDispatchAction.CLEAR_ADDITIONAL_EVIDENCE, payload: [undefined] })
          }}
          testID={testIdWithKey('ResetData')}
          accessibilityLabel={'Reset data'}
          buttonType={ButtonType.Secondary}
        />
      </View>
    </View>
  )
}

export default SetupStepsScreen
