import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/core";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useContext, useMemo } from "react";
import { Image, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LocalStorageKeys, StoreContext } from "aries-bifold";
import { DispatchAction } from "aries-bifold";
import { Assets, ColorPallet } from "../theme";
import { AuthenticateStackParams, Screens } from "aries-bifold";
import { OnboardingState, PreferencesState, PrivacyState } from "aries-bifold";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: ColorPallet.brand.primary,
  },
});

const onboardingComplete = (state: OnboardingState): boolean => {
  return (
    state.didCompleteTutorial &&
    state.didAgreeToTerms &&
    state.didCreatePIN &&
    state.didConsiderBiometry
  );
};

const resumeOnboardingAt = (state: OnboardingState): Screens => {
  if (
    state.didCompleteTutorial &&
    state.didAgreeToTerms &&
    state.didCreatePIN &&
    !state.didConsiderBiometry
  ) {
    return Screens.UseBiometry;
  }

  if (
    state.didCompleteTutorial &&
    state.didAgreeToTerms &&
    !state.didCreatePIN
  ) {
    return Screens.CreatePin;
  }

  if (state.didCompleteTutorial && !state.didAgreeToTerms) {
    return Screens.Terms;
  }

  return Screens.Onboarding;
};
/*
  To customize this splash screen set the background color of the
  iOS and Android launch screen to match the background color of
  of this view.
*/

const Splash: React.FC = () => {
  const [, dispatch] = useContext(StoreContext);
  const navigation =
    useNavigation<StackNavigationProp<AuthenticateStackParams>>();

  useMemo(() => {
    async function init() {
      try {
        const preferencesData = await AsyncStorage.getItem(
          LocalStorageKeys.Preferences
        );

        if (preferencesData) {
          const dataAsJSON = JSON.parse(preferencesData) as PreferencesState;

          dispatch({
            type: DispatchAction.PREFERENCES_UPDATED,
            payload: [dataAsJSON],
          });
        }

        const privacyData = await AsyncStorage.getItem(
          LocalStorageKeys.Privacy
        );
        if (privacyData) {
          const dataAsJSON = JSON.parse(privacyData) as PrivacyState;

          dispatch({
            type: DispatchAction.PRIVACY_UPDATED,
            payload: [dataAsJSON],
          });
        }

        const data = await AsyncStorage.getItem(LocalStorageKeys.Onboarding);
        if (data) {
          const dataAsJSON = JSON.parse(data) as OnboardingState;
          dispatch({
            type: DispatchAction.ONBOARDING_UPDATED,
            payload: [dataAsJSON],
          });

          if (onboardingComplete(dataAsJSON)) {
            navigation.navigate(Screens.EnterPin);
            return;
          }

          // If onboarding was interrupted we need to pickup from where we left off.
          const destination = resumeOnboardingAt(dataAsJSON);
          // @ts-ignore
          navigation.navigate({ name: destination });

          return;
        }

        // We have no onboarding state, starting from step zero.
        navigation.navigate(Screens.Onboarding);
      } catch (error) {
        // TODO:(jl)
      }
    }
    init();
  }, [dispatch]);

  return (
    <SafeAreaView style={styles.container}>
      <Image source={Assets.img.logoPrimary.src} />
    </SafeAreaView>
  );
};

export default Splash;
