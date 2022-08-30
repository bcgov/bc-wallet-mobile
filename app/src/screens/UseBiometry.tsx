import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  Text,
  View,
  Switch,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Biometrics from "../assets/img/biometrics.svg";
import { Button, ButtonType } from "aries-bifold";
import { useAuth } from "aries-bifold";
import { DispatchAction } from "aries-bifold";
import { useStore } from "aries-bifold";
import { useTheme } from "aries-bifold";
import { BifoldError } from "aries-bifold";
import { statusBarStyleForColor, StatusBarStyles } from "aries-bifold";
import { testIdWithKey } from "aries-bifold";

const UseBiometry: React.FC = () => {
  const [, dispatch] = useStore();
  const { t } = useTranslation();
  const { convertToUseBiometrics, isBiometricsActive } = useAuth();
  const [biometryAvailable, setBiometryAvailable] = useState(false);
  const { ColorPallet, TextTheme } = useTheme();
  const styles = StyleSheet.create({
    container: {
      flexGrow: 2,
      flexDirection: "column",
      paddingHorizontal: 25,
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
    image: {
      minWidth: 200,
      minHeight: 200,
      marginBottom: 66,
    },
  });

  useEffect(() => {
    isBiometricsActive().then((result) => {
      setBiometryAvailable(result);
    });
  }, []);

  const continueTouched = async () => {
    if (!biometryAvailable) {
      // const error = new BifoldError(
      //   declineType === DeclineType.ProofRequest ? t('Error.Title1028') : t('Error.Title1025'),
      //   declineType === DeclineType.ProofRequest ? t('Error.Message1028') : t('Error.Message1025'),
      //   (err as Error).message,
      //   1025
      // )

      const error = new BifoldError(
        "No Biometrics",
        "You don't have biometrics enabled on this device.",
        "Some cool details about fixing this message",
        9999
      );

      dispatch({
        type: DispatchAction.ERROR_ADDED,
        payload: [{ error }],
      });

      return;
    }

    // await convertToUseBiometrics();

    // dispatch({
    //   type: DispatchAction.USE_BIOMETRY,
    //   payload: [true],
    // });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={
          Platform.OS === "android"
            ? StatusBarStyles.Light
            : statusBarStyleForColor(ColorPallet.brand.primary)
        }
      />
      <View style={{ flexGrow: 1 }}>
        <View style={{ alignItems: "center" }}>
          <Biometrics style={[styles.image]} />
        </View>
        <View>
          <Text style={[TextTheme.normal]}>
            {t("Biometry.EnabledText1")}{" "}
            <Text style={[TextTheme.normal, { fontWeight: "bold" }]}>
              {t("Biometry.EnabledText1Bold")}{" "}
            </Text>
            <Text style={[TextTheme.normal]}>{t("Biometry.EnabledText2")}</Text>
          </Text>
          <Text></Text>
          <Text style={[TextTheme.normal]}>
            {t("Biometry.EnabledText3")}{" "}
            <Text style={[TextTheme.normal, { fontWeight: "bold" }]}>
              {t("Biometry.EnabledText3Bold")}
            </Text>
          </Text>
        </View>
        <View style={{ flexGrow: 1, justifyContent: "flex-end" }}>
          <Button
            title={t("Global.Continue")}
            accessibilityLabel={t("Global.Continue")}
            testID={testIdWithKey("Continue")}
            onPress={continueTouched}
            buttonType={ButtonType.Primary}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default UseBiometry;
