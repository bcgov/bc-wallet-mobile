import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/core'
import { StackNavigationProp } from '@react-navigation/stack'
import React, { useContext, useMemo } from 'react'
import { Image, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { LocalStorageKeys, StoreContext } from 'aries-bifold'
import { DispatchAction } from 'aries-bifold'
import { ColorPallet } from '../theme'
import { AuthenticateStackParams, Screens } from 'aries-bifold'
import { OnboardingState } from 'aries-bifold'

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ColorPallet.brand.primary,
  },
})

const onboardingComplete = (state: OnboardingState): boolean => {
  return state.DidCompleteTutorial && state.DidAgreeToTerms && state.DidCreatePIN
}

const resumeOnboardingAt = (state: OnboardingState): Screens => {
  if (state.DidCompleteTutorial && state.DidAgreeToTerms && !state.DidCreatePIN) {
    return Screens.CreatePin
  }

  if (state.DidCompleteTutorial && !state.DidAgreeToTerms) {
    return Screens.Terms
  }

  return Screens.Onboarding
}
/*
  To customize this splash screen set the background color of the
  iOS and Android launch screen to match the background color of
  of this view.
*/

const Splash: React.FC = () => {
  const [, dispatch] = useContext(StoreContext)
  const navigation = useNavigation<StackNavigationProp<AuthenticateStackParams>>()

  useMemo(() => {
    async function init() {
      try {
        // await AsyncStorage.removeItem(LocalStorageKeys.Onboarding)
        const data = await AsyncStorage.getItem(LocalStorageKeys.Onboarding)

        if (data) {
          const dataAsJSON = JSON.parse(data) as OnboardingState
          dispatch({ type: DispatchAction.SetOnboardingState, payload: [dataAsJSON] })

          if (onboardingComplete(dataAsJSON)) {
            navigation.navigate(Screens.EnterPin)
            return
          }

          // If onboarding was interrupted we need to pickup from where we left off.
          const destination = resumeOnboardingAt(dataAsJSON)
          // @ts-ignore
          navigation.navigate({ name: destination })

          return
        }

        // We have no onboarding state, starting from step zero.
        navigation.navigate(Screens.Onboarding)
      } catch (error) {
        // TODO:(jl)
      }
    }
    init()
  }, [dispatch])

  return (
    <SafeAreaView style={styles.container}>
      <Image source={require('../assets/img/logo-large.png')} />
    </SafeAreaView>
  )
}

export default Splash
