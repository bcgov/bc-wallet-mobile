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

  const bcscSerialNumber = store.bcsc.serial || null
  const emailAddress = store.bcsc.email || null
  const emailConfirmed = Boolean(store.bcsc.emailConfirmed)
  const bcscRegistered = Boolean(bcscSerialNumber || emailAddress)
  const dualIdRegistered = store.bcsc.cardType === BCSCCardType.Other && store.bcsc.additionalEvidenceData.length >= 2
  const registered = bcscRegistered || dualIdRegistered
  const isNonPhotoCard = store.bcsc.cardType === BCSCCardType.NonPhoto
  const hasAdditionalPhotoEvidence = store.bcsc.additionalEvidenceData.some((item) => item.evidenceType.has_photo)
  const needsAdditionalEvidence = isNonPhotoCard && !hasAdditionalPhotoEvidence
  const canProceedToVerification = registered && !store.bcsc.pendingVerification && !needsAdditionalEvidence

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

  const getVerificationStep4Text = (): string => {
    if (canProceedToVerification) {
      const expirationDate = store.bcsc.deviceCodeExpiresAt?.toLocaleString('en-CA', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
      return `Verify identity by ${expirationDate}`
    }

    if (needsAdditionalEvidence) {
      return 'Complete additional identification first'
    }

    return 'Verify identity'
  }

  /**
   * Returns the subtext for Step 1 of the verification process.
   *
   * @returns {string[]} An array of strings representing the subtext for Step 1.
   */
  const getVerificationStep1SubText = useCallback((): string[] => {
    // if the card type is Other (multiple non BCSC cards), show each card type label
    if (store.bcsc.cardType === BCSCCardType.Other && store.bcsc.additionalEvidenceData.length > 0) {
      return store.bcsc.additionalEvidenceData.map((evidence) => `ID: ${evidence.evidenceType.evidence_type_label}`)
    }

    // if the bcsc card is registered, show the bcsc serial number
    if (bcscRegistered) {
      return [`ID: BC Services Card (${bcscSerialNumber})`]
    }

    // otherwise, show the default text
    return [t('Unified.Steps.ScanOrTakePhotos')]
  }, [bcscRegistered, bcscSerialNumber, store.bcsc.additionalEvidenceData, store.bcsc.cardType, t])

  /**
   * Returns the subtext for Step 4 of the verification process based on registration status.
   *
   * @param {boolean} bcscIsRegistered - Indicates if the BC Services Card is registered.
   * @param {boolean} dualIdIsRegistered - Indicates if dual ID is registered.
   * @returns {*} {string} The subtext for Step 4.
   */
  const getVerificationStep4SubText = (bcscIsRegistered: boolean, dualIdIsRegistered: boolean): string => {
    if (bcscIsRegistered) {
      return 'Address: Residential address from your BC Services Card will be used'
    }

    // QUESTION (MD): Is this possible? Or do we need workflow screen to input address if dual ID is registered?
    if (dualIdIsRegistered) {
      return 'Address: Residential address from your IDs will be used'
    }

    return 'Residential address'
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => {
          if (
            !dualIdRegistered &&
            store.bcsc.cardType === BCSCCardType.Other &&
            store.bcsc.additionalEvidenceData.length > 0
          ) {
            navigation.navigate(BCSCScreens.EvidenceTypeList)
            return
          }

          if (!registered) {
            dispatch({ type: BCDispatchAction.UPDATE_CARD_TYPE, payload: [BCSCCardType.None] })
            navigation.navigate(BCSCScreens.IdentitySelection)
            return
          }

          if (needsAdditionalEvidence) {
            navigation.navigate(BCSCScreens.AdditionalIdentificationRequired)
            return
          }
        }}
        testID={testIdWithKey('Step1')}
        accessibilityLabel={'Step 1'}
        style={[
          styles.step,
          {
            backgroundColor:
              registered && !needsAdditionalEvidence
                ? ColorPalette.brand.secondaryBackground
                : ColorPalette.brand.primary,
          },
        ]}
      >
        <View style={styles.titleRow}>
          <ThemedText
            variant={'headingFour'}
            style={{
              marginRight: 16,
              color: registered && !needsAdditionalEvidence ? TextTheme.headingFour.color : ColorPalette.brand.text,
            }}
            accessibilityLabel={t('Unified.Steps.Step1')}
          >
            {t('Unified.Steps.Step1')}
          </ThemedText>
          {registered && !needsAdditionalEvidence ? (
            <Icon name={'check-circle'} size={24} color={ColorPalette.semantic.success} />
          ) : null}
        </View>
        <View>
          {getVerificationStep1SubText().map((text, id) => (
            <ThemedText
              key={`${text}-${id}`}
              style={{
                color: registered && !needsAdditionalEvidence ? TextTheme.normal.color : ColorPalette.brand.text,
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
        style={styles.step}
        disabled={!registered}
      >
        <View style={styles.titleRow}>
          <ThemedText variant={'headingFour'} style={{ marginRight: Spacing.md }}>
            {t('Unified.Steps.Step2')}
          </ThemedText>
          {registered ? <Icon name={'check-circle'} size={24} color={ColorPalette.semantic.success} /> : null}
        </View>
        <View>
          <ThemedText>{getVerificationStep4SubText(bcscRegistered, dualIdRegistered)}</ThemedText>
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
              registered && !emailConfirmed ? ColorPalette.brand.primary : ColorPalette.brand.secondaryBackground,
          },
        ]}
        disabled={!registered || emailConfirmed}
        onPress={handleEmailStepPress}
      >
        <View style={styles.titleRow}>
          <ThemedText
            variant={'headingFour'}
            style={{
              marginRight: Spacing.md,
              color: registered && !emailConfirmed ? ColorPalette.brand.text : TextTheme.normal.color,
            }}
          >
            {t('Unified.Steps.Step3')}
          </ThemedText>
          {registered && emailConfirmed ? (
            <Icon name={'check-circle'} size={24} color={ColorPalette.semantic.success} />
          ) : null}
        </View>
        <View style={styles.contentEmailContainer}>
          <ThemedText
            style={{ color: registered && !emailConfirmed ? ColorPalette.brand.text : TextTheme.normal.color }}
          >
            {registered && emailConfirmed ? `Email: ${emailAddress}` : 'Email Address'}
          </ThemedText>
          {registered && emailConfirmed ? (
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
          if (canProceedToVerification) {
            navigation.navigate(BCSCScreens.VerificationMethodSelection)
          }
        }}
        testID={testIdWithKey('Step4')}
        accessibilityLabel={t('Unified.Steps.Step4')}
        disabled={!canProceedToVerification}
        style={[
          styles.step,
          {
            backgroundColor: canProceedToVerification
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
              color: canProceedToVerification ? ColorPalette.brand.text : TextTheme.headingFour.color,
            }}
          >
            {t('Unified.Steps.Step4')}
          </ThemedText>
        </View>
        <View>
          <ThemedText
            style={{ color: canProceedToVerification ? ColorPalette.brand.text : TextTheme.headingFour.color }}
          >
            {getVerificationStep4Text()}
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
