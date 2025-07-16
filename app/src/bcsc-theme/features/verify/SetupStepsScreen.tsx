import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@bcsc-theme/types/navigators'
import { Button, ButtonType, testIdWithKey, ThemedText, TOKENS, useServices, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useMemo } from 'react'

import { BCDispatchAction, BCState } from '@/store'
import { useTranslation } from 'react-i18next'
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import useApi from '@/bcsc-theme/api/hooks/useApi'

type SetupStepsScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.SetupSteps>
}

const SetupStepsScreen: React.FC<SetupStepsScreenProps> = ({ navigation }) => {
  const { t } = useTranslation()
  const { ColorPallet, Spacing, TextTheme } = useTheme()
  const [store, dispatch] = useStore<BCState>()
  const { evidence, token } = useApi()
  const [logger] = useServices([TOKENS.UTIL_LOGGER])
  const serialNumber = store.bcsc.serial ?? null
  const emailAddress = store.bcsc.email ?? null
  const registered = useMemo(() => serialNumber && emailAddress, [serialNumber, emailAddress])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
    itemSeparator: {
      width: '100%',
      height: 8,
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
    step: {
      paddingVertical: 24,
      paddingHorizontal: 24,
      backgroundColor: ColorPallet.brand.secondaryBackground,
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

  const handleCheckStatus = async () => {
    const { status } = await evidence.getVerificationRequestStatus(store.bcsc.verificationRequestId!)
    if (status === 'verified') {
      const { refresh_token } = await token.checkDeviceCodeStatus(store.bcsc.deviceCode!, store.bcsc.userCode!)
      if (refresh_token) {
        dispatch({ type: BCDispatchAction.UPDATE_REFRESH_TOKEN, payload: [refresh_token] })
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

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => {
          if (!registered) {
            navigation.navigate(BCSCScreens.IdentitySelection)
          }
        }}
        testID={testIdWithKey('Step1')}
        accessibilityLabel={'Step 1'}
        style={[
          styles.step,
          { backgroundColor: registered ? ColorPallet.brand.secondaryBackground : ColorPallet.brand.primary },
        ]}
      >
        <View style={styles.titleRow}>
          <ThemedText
            variant={'headingFour'}
            style={{ marginRight: 16, color: registered ? TextTheme.headingFour.color : ColorPallet.brand.text }}
          >
            {'Step 1'}
          </ThemedText>
          {registered ? <Icon name={'check-circle'} size={24} color={ColorPallet.semantic.success} /> : null}
        </View>
        <View>
          <ThemedText style={{ color: registered ? TextTheme.normal.color : ColorPallet.brand.text }}>
            {registered ? `ID: BC Services Card (${serialNumber})` : t('Unified.Steps.ScanOrTakePhotos')}
          </ThemedText>
        </View>
      </TouchableOpacity>
      <View style={styles.itemSeparator} />
      <TouchableOpacity testID={testIdWithKey('Step2')} accessibilityLabel={'Step 2'} style={styles.step}>
        <View style={styles.titleRow}>
          <ThemedText variant={'headingFour'} style={{ marginRight: Spacing.md }}>
            {'Step 2'}
          </ThemedText>
          {registered ? <Icon name={'check-circle'} size={24} color={ColorPallet.semantic.success} /> : null}
        </View>
        <View>
          <ThemedText>
            {registered
              ? 'Address: Residential address from your BC Services Card will be used'
              : 'Residential address'}
          </ThemedText>
        </View>
      </TouchableOpacity>
      <View style={styles.itemSeparator} />
      <TouchableOpacity testID={testIdWithKey('Step3')} accessibilityLabel={'Step 3'} style={styles.step}>
        <View style={styles.titleRow}>
          <ThemedText variant={'headingFour'} style={{ marginRight: Spacing.md }}>
            {'Step 3'}
          </ThemedText>
          {registered ? <Icon name={'check-circle'} size={24} color={ColorPallet.semantic.success} /> : null}
        </View>
        <View>
          <ThemedText>{registered ? `Email: ${emailAddress}` : 'Email Address'}</ThemedText>
        </View>
      </TouchableOpacity>
      <View style={styles.itemSeparator} />
      <TouchableOpacity
        onPress={() => {
          if (registered && !store.bcsc.pendingVerification) {
            navigation.navigate(BCSCScreens.VerificationMethodSelection)
          }
        }}
        testID={testIdWithKey('Step4')}
        accessibilityLabel={'Step 4'}
        style={[
          styles.step,
          {
            backgroundColor: registered ? ColorPallet.brand.primary : ColorPallet.brand.secondaryBackground,
          },
        ]}
      >
        <View style={styles.titleRow}>
          <ThemedText
            variant={'headingFour'}
            style={{ marginRight: 16, color: registered ? ColorPallet.brand.text : TextTheme.headingFour.color }}
          >
            {'Step 4'}
          </ThemedText>
        </View>
        <View>
          <ThemedText style={{ color: registered ? ColorPallet.brand.text : TextTheme.headingFour.color }}>
            {registered
              ? `Verify identity by ${store.bcsc.deviceCodeExpiresAt?.toLocaleString('en-CA', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}`
              : 'Verify identity'}
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
                backgroundColor: ColorPallet.brand.primary,
                justifyContent: 'space-between',
                paddingVertical: Spacing.md,
              },
            ]}
            onPress={handleCheckStatus}
          >
            <ThemedText variant={'headingFour'} style={{ color: ColorPallet.brand.text }}>
              Check status
            </ThemedText>
            <Icon name={'chevron-right'} color={ColorPallet.brand.text} size={32} />
          </TouchableOpacity>
          <View style={styles.itemSeparator} />
          <TouchableOpacity
            style={[
              styles.step,
              styles.titleRow,
              {
                backgroundColor: ColorPallet.brand.primary,
                justifyContent: 'space-between',
                paddingVertical: Spacing.md,
              },
            ]}
            onPress={handleCancelVerification}
          >
            <ThemedText variant={'headingFour'} style={{ color: ColorPallet.brand.text }}>
              Choose another way to verify
            </ThemedText>
            <Icon name={'chevron-right'} color={ColorPallet.brand.text} size={32} />
          </TouchableOpacity>
        </>
      ) : null}
      <View style={styles.itemSeparator} />
      <View style={{ padding: Spacing.md }}>
        <Button
          title={'Reset data'}
          onPress={() => {
            dispatch({ type: BCDispatchAction.UPDATE_BIRTHDATE, payload: [undefined] })
            dispatch({ type: BCDispatchAction.UPDATE_EMAIL, payload: [undefined] })
            dispatch({ type: BCDispatchAction.UPDATE_SERIAL, payload: [undefined] })
            dispatch({ type: BCDispatchAction.UPDATE_CARD_TYPE, payload: [undefined] })
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
