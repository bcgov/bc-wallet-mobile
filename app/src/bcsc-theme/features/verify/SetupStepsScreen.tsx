import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@bcsc-theme/types/navigators'
import { Button, ButtonType, testIdWithKey, ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useCallback } from 'react'
import useApi from '@/bcsc-theme/api/hooks/useApi'
import { hitSlop } from '@/constants'
import { BCDispatchAction, BCState } from '@/store'
import { useTranslation } from 'react-i18next'
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { BCSCCardType } from '@/bcsc-theme/types/cards'

type SetupStepsScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.SetupSteps>
}

const SetupStepsScreen: React.FC<SetupStepsScreenProps> = ({ navigation }) => {
  const { t } = useTranslation()
  const { Spacing, TextTheme, ColorPalette } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const { evidence, token } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])

  // store + card attributes
  const bcscSerialNumber = store.bcsc.serial || null
  const emailAddress = store.bcsc.email || null
  const emailConfirmed = Boolean(store.bcsc.emailConfirmed)
  const isNonPhotoCard = store.bcsc.cardType === BCSCCardType.NonPhoto
  const isNonBCSCCards = store.bcsc.cardType === BCSCCardType.Other

  // card registration state
  const bcscRegistered = Boolean(bcscSerialNumber && emailAddress)
  const nonBcscRegistered = isNonBCSCCards && store.bcsc.additionalEvidenceData.length === 2
  const registered = bcscRegistered || nonBcscRegistered

  // evidence collection state
  const hasAdditionalPhotoEvidence = store.bcsc.additionalEvidenceData.some((item) => item.evidenceType.has_photo)
  const needsAdditionalEvidence = isNonPhotoCard && !hasAdditionalPhotoEvidence

  // step completion state
  const Step1IdsCompleted = registered && !needsAdditionalEvidence
  const Step2AddressCompleted = Boolean(store.bcsc.deviceCode)
  const Step3EmailCompleted = Boolean(emailAddress && emailConfirmed)

  const Step4VerificationEnabled = !store.bcsc.pendingVerification

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
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    contentEmail: {
      flex: 1,
      flexWrap: 'wrap',
    },
    contentEmailButton: {
      alignSelf: 'flex-end',
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

    if (nonBcscRegistered && store.bcsc.userMetadata?.address && store.bcsc.deviceCode) {
      return 'Address: Residential address saved'
    }

    return 'Residential address'
  }, [bcscRegistered, nonBcscRegistered, store.bcsc.userMetadata?.address, store.bcsc.deviceCode])

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
      // TODO (MD): Handle this unhappy path eventually
      // Give instructions to either reset their form, or resubmit the missing piece
      throw new Error('Invalid setup steps detected, missing device code epiration.')
    }

    if (needsAdditionalEvidence) {
      return 'Complete additional identification first'
    }

    return 'Verify identity'
  }, [Step4VerificationEnabled, needsAdditionalEvidence, store.bcsc.deviceCodeExpiresAt])

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => {
          if (!nonBcscRegistered && store.bcsc.additionalEvidenceData.length === 1) {
            navigation.navigate(BCSCScreens.EvidenceTypeList)
            return
          }

          if (!registered) {
            navigation.navigate(BCSCScreens.IdentitySelection)
            return
          }

          if (needsAdditionalEvidence) {
            navigation.navigate(BCSCScreens.AdditionalIdentificationRequired)
          }
        }}
        testID={testIdWithKey('Step1')}
        accessibilityLabel={'Step 1'}
        disabled={Step1IdsCompleted}
        style={[
          styles.step,
          {
            backgroundColor: Step1IdsCompleted ? ColorPalette.brand.secondaryBackground : ColorPalette.brand.primary,
          },
        ]}
      >
        <View style={styles.titleRow}>
          <ThemedText
            variant={'headingFour'}
            style={{
              marginRight: 16,
              color: Step1IdsCompleted ? TextTheme.headingFour.color : ColorPalette.brand.text,
            }}
            accessibilityLabel={t('Unified.Steps.Step1')}
          >
            {t('Unified.Steps.Step1')}
          </ThemedText>
          {Step1IdsCompleted ? <Icon name={'check-circle'} size={24} color={ColorPalette.semantic.success} /> : null}
        </View>
        <View>
          {getVerificationStep1Subtext().map((text, id) => (
            <ThemedText
              key={`${text}-${id}`}
              style={{
                color: Step1IdsCompleted ? TextTheme.normal.color : ColorPalette.brand.text,
              }}
            >
              {text}
            </ThemedText>
          ))}
          {
            // show additional text if a second card is required
            store.bcsc.cardType === BCSCCardType.Other && store.bcsc.additionalEvidenceData.length === 1 ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 32,
                  marginBottom: 0,
                  justifyContent: 'space-between',
                }}
              >
                <ThemedText
                  style={{
                    fontWeight: 'bold',
                    color: ColorPalette.brand.text,
                  }}
                >
                  {/* TODO (MD): Add this to loalization translations */}
                  Add second ID
                </ThemedText>
                <Icon size={30} color={ColorPalette.brand.text} name={'chevron-right'} />
              </View>
            ) : null
          }
        </View>
      </TouchableOpacity>
      {/* Only show if NonPhoto is selected and no additional photo evidence is available */}
      {registered && needsAdditionalEvidence && (
        <TouchableOpacity
          onPress={() => navigation.navigate(BCSCScreens.AdditionalIdentificationRequired)}
          style={[
            styles.step,
            {
              backgroundColor: ColorPalette.brand.primary,
              borderTopColor: ColorPalette.brand.secondaryBackground,
              borderTopWidth: Spacing.xs,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <ThemedText style={{ color: ColorPalette.brand.text }}>
              <ThemedText style={{ color: ColorPalette.brand.text }} variant={'bold'}>
                {'Add second ID: '}
              </ThemedText>
              {'Additional identification required for non-photo BC Services Card.'}
            </ThemedText>
            <Icon name={'chevron-right'} size={24} color={ColorPalette.brand.text} style={{ alignSelf: 'center' }} />
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.itemSeparator} />

      <TouchableOpacity
        testID={testIdWithKey('Step2')}
        accessibilityLabel={t('Unified.Steps.Step2')}
        style={[
          styles.step,
          {
            backgroundColor:
              Step1IdsCompleted && !Step2AddressCompleted
                ? ColorPalette.brand.primary
                : ColorPalette.brand.secondaryBackground,
          },
        ]}
        disabled={!Step1IdsCompleted}
        onPress={() => {
          navigation.navigate(BCSCScreens.ResidentialAddressScreen)
        }}
      >
        <View style={styles.titleRow}>
          <ThemedText
            variant={'headingFour'}
            style={{
              marginRight: Spacing.md,
              color: Step1IdsCompleted && !Step2AddressCompleted ? ColorPalette.brand.text : TextTheme.normal.color,
            }}
          >
            {t('Unified.Steps.Step2')}
          </ThemedText>
          {Step2AddressCompleted ? (
            <Icon name={'check-circle'} size={24} color={ColorPalette.semantic.success} />
          ) : null}
        </View>
        <View>
          <ThemedText
            style={{
              color: Step1IdsCompleted && !Step2AddressCompleted ? ColorPalette.brand.text : TextTheme.normal.color,
            }}
          >
            {getVerificationStep2Subtext()}
          </ThemedText>
        </View>
      </TouchableOpacity>

      <View style={styles.itemSeparator} />

      <TouchableOpacity
        testID={testIdWithKey('Step3')}
        accessibilityLabel={t('Unified.Steps.Step3')}
        style={[
          styles.step,
          {
            backgroundColor:
              Step2AddressCompleted && !Step3EmailCompleted
                ? ColorPalette.brand.secondaryBackground
                : ColorPalette.brand.primary,
          },
        ]}
        disabled={false}
        onPress={handleEmailStepPress}
      >
        <View style={styles.titleRow}>
          <ThemedText
            variant={'headingFour'}
            style={{
              marginRight: Spacing.md,
              color: Step3EmailCompleted ? TextTheme.normal.color : ColorPalette.brand.text,
            }}
          >
            {t('Unified.Steps.Step3')}
          </ThemedText>
          {Step3EmailCompleted ? <Icon name={'check-circle'} size={24} color={ColorPalette.semantic.success} /> : null}
        </View>

        <View style={styles.contentEmailContainer}>
          <ThemedText style={{ color: Step3EmailCompleted ? TextTheme.normal.color : ColorPalette.brand.text }}>
            {Step3EmailCompleted ? `Email: ${emailAddress}` : 'Email Address'}
          </ThemedText>
          {Step3EmailCompleted ? (
            <TouchableOpacity
              style={styles.contentEmailButton}
              onPress={handleEmailStepPress}
              testID={testIdWithKey('EditEmail')}
              accessibilityLabel={'Edit'}
              hitSlop={hitSlop}
            >
              <ThemedText style={{ color: ColorPalette.brand.link, textDecorationLine: 'underline' }}>Edit</ThemedText>
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>

      <View style={styles.itemSeparator} />

      <TouchableOpacity
        onPress={() => {
          if (Step4VerificationEnabled) {
            navigation.navigate(BCSCScreens.VerificationMethodSelection)
          }
        }}
        testID={testIdWithKey('Step4')}
        accessibilityLabel={t('Unified.Steps.Step4')}
        disabled={!Step4VerificationEnabled}
        style={[
          styles.step,
          {
            backgroundColor: Step4VerificationEnabled
              ? ColorPalette.brand.primary
              : ColorPalette.brand.secondaryBackground,
          },
        ]}
      >
        <View style={styles.titleRow}>
          <ThemedText
            variant={'headingFour'}
            style={{
              marginRight: 16,
              color: Step4VerificationEnabled ? ColorPalette.brand.text : TextTheme.headingFour.color,
            }}
          >
            {t('Unified.Steps.Step4')}
          </ThemedText>
        </View>
        <View>
          <ThemedText
            style={{ color: Step4VerificationEnabled ? ColorPalette.brand.text : TextTheme.headingFour.color }}
          >
            {getVerificationStep4Subtext()}
          </ThemedText>
        </View>
      </TouchableOpacity>
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
