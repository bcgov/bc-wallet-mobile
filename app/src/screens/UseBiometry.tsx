import {
  Button,
  ButtonType,
  DispatchAction,
  EventTypes,
  OnboardingStackParams,
  Screens,
  TOKENS,
  testIdWithKey,
  useAnimatedComponents,
  useAuth,
  useServices,
  useStore,
  useTheme,
} from '@hyperledger/aries-bifold-core'
import PINEnter, { PINEntryUsage } from '@hyperledger/aries-bifold-core/App/screens/PINEnter'
import { CommonActions, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View, Modal, Switch, ScrollView, Pressable, DeviceEventEmitter } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import HeaderText from '../components/HeaderText'
import Progress from '../components/Progress'

enum UseBiometryUsage {
  InitialSetup,
  ToggleOnOff,
}

const UseBiometry: React.FC = () => {
  const [store, dispatch] = useStore()
  const { t } = useTranslation()
  const [{ enablePushNotifications }] = useServices([TOKENS.CONFIG])
  const { isBiometricsActive, commitPIN, disableBiometrics } = useAuth()
  const [biometryAvailable, setBiometryAvailable] = useState(false)
  const [biometryEnabled, setBiometryEnabled] = useState(store.preferences.useBiometry)
  const [continueEnabled, setContinueEnabled] = useState(true)
  const [canSeeCheckPIN, setCanSeeCheckPIN] = useState<boolean>(false)
  const { ColorPallet, TextTheme } = useTheme()
  const { ButtonLoading } = useAnimatedComponents()
  const navigation = useNavigation<StackNavigationProp<OnboardingStackParams>>()
  const screenUsage = store.onboarding.didCompleteOnboarding
    ? UseBiometryUsage.ToggleOnOff
    : UseBiometryUsage.InitialSetup

  const styles = StyleSheet.create({
    container: {
      height: '100%',
      padding: 20,
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
    image: {
      minWidth: 200,
      minHeight: 200,
      marginBottom: 66,
    },
    useToUnlockContainer: {
      flexShrink: 1,
      marginRight: 10,
      justifyContent: 'center',
    },
  })

  useEffect(() => {
    isBiometricsActive().then((result) => {
      setBiometryAvailable(result)
    })
  }, [])

  useEffect(() => {
    if (screenUsage === UseBiometryUsage.InitialSetup) {
      return
    }

    if (biometryEnabled) {
      commitPIN(biometryEnabled).then(() => {
        dispatch({
          type: DispatchAction.USE_BIOMETRY,
          payload: [biometryEnabled],
        })
      })
    } else {
      disableBiometrics().then(() => {
        dispatch({
          type: DispatchAction.USE_BIOMETRY,
          payload: [biometryEnabled],
        })
      })
    }
  }, [biometryEnabled])

  const continueTouched = async () => {
    setContinueEnabled(false)

    await commitPIN(biometryEnabled)

    dispatch({
      type: DispatchAction.USE_BIOMETRY,
      payload: [biometryEnabled],
    })
    if (enablePushNotifications) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: Screens.UsePushNotifications }],
        })
      )
    } else {
      dispatch({ type: DispatchAction.DID_COMPLETE_ONBOARDING, payload: [true] })
    }
  }

  const toggleSwitch = () => {
    // If the user is toggling biometrics on/off they need
    // to first authenticate before this action is accepted
    if (screenUsage === UseBiometryUsage.ToggleOnOff) {
      setCanSeeCheckPIN(true)
      DeviceEventEmitter.emit(EventTypes.BIOMETRY_UPDATE, true)
      return
    }

    setBiometryEnabled((previousState) => !previousState)
  }

  const onAuthenticationComplete = (status: boolean) => {
    // If successfully authenticated the toggle may proceed.
    if (status) {
      setBiometryEnabled((previousState) => !previousState)
    }
    DeviceEventEmitter.emit(EventTypes.BIOMETRY_UPDATE, false)
    setCanSeeCheckPIN(false)
  }

  const showHeader = store.onboarding.didAgreeToTerms && !store.onboarding.didConsiderBiometry

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']}>
      {showHeader && (
        <View style={{ marginTop: 25 }}>
          <View style={{ marginHorizontal: 50 }}>
            <Progress progressPercent={100} progressText={t('Biometry.ProgressBarText')} progressFill="primary" />
          </View>
        </View>
      )}
      <ScrollView style={styles.container}>
        {showHeader && <HeaderText title={t('Screens.Biometry')} />}
        <View style={{ marginTop: showHeader ? 20 : 0 }}>
          {biometryAvailable ? (
            <>
              <Text style={TextTheme.bold}>{t('Biometry.EnabledText1')}</Text>
              <Text></Text>
              <Text style={TextTheme.normal}>
                {t('Biometry.EnabledText2')}
                <Text style={TextTheme.bold}> {t('Biometry.Warning')}</Text>
              </Text>
            </>
          ) : (
            <>
              <Text style={TextTheme.normal}>{t('Biometry.NotEnabledText1')}</Text>
              <Text></Text>
              <Text style={TextTheme.normal}>{t('Biometry.NotEnabledText2')}</Text>
            </>
          )}
        </View>
        <View
          style={{
            flexDirection: 'row',
            marginVertical: 20,
          }}
        >
          <View style={styles.useToUnlockContainer}>
            <Text style={TextTheme.bold}>{t('Biometry.UseToUnlock')}</Text>
          </View>
          <View style={{ justifyContent: 'center' }}>
            <Pressable
              testID={testIdWithKey('ToggleBiometrics')}
              accessible
              accessibilityLabel={t('Biometry.Toggle')}
              accessibilityRole={'switch'}
            >
              <Switch
                trackColor={{ false: ColorPallet.grayscale.lightGrey, true: ColorPallet.brand.primaryDisabled }}
                thumbColor={biometryEnabled ? ColorPallet.brand.primary : ColorPallet.grayscale.mediumGrey}
                ios_backgroundColor={ColorPallet.grayscale.lightGrey}
                onValueChange={toggleSwitch}
                value={biometryEnabled}
                disabled={!biometryAvailable}
              />
            </Pressable>
          </View>
        </View>
      </ScrollView>
      <View style={{ marginTop: 'auto', margin: 20 }}>
        {store.onboarding.didCompleteOnboarding || (
          <Button
            title={'Continue'}
            accessibilityLabel={'Continue'}
            testID={testIdWithKey('Continue')}
            onPress={continueTouched}
            buttonType={ButtonType.Primary}
            disabled={!continueEnabled}
          >
            {!continueEnabled && <ButtonLoading />}
          </Button>
        )}
      </View>
      <Modal
        style={{ backgroundColor: ColorPallet.brand.primaryBackground }}
        visible={canSeeCheckPIN}
        transparent={false}
        animationType={'slide'}
      >
        <PINEnter usage={PINEntryUsage.PINCheck} setAuthenticated={onAuthenticationComplete} />
      </Modal>
    </SafeAreaView>
  )
}

export default UseBiometry
