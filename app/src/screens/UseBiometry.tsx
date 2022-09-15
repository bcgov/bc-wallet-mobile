import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View, StatusBar, Platform, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Biometrics from "../assets/img/biometrics.svg";
import { Button, ButtonType } from "aries-bifold";
import { useAuth } from "aries-bifold";
import { DispatchAction } from "aries-bifold";
import { useStore } from "aries-bifold";
import { useTheme } from "aries-bifold";
import { statusBarStyleForColor, StatusBarStyles } from "aries-bifold";
import { testIdWithKey } from "aries-bifold";

const UseBiometry: React.FC = () => {
  const [, dispatch] = useStore();
  const { t } = useTranslation();
  const { convertToUseBiometrics, isBiometricsActive } = useAuth();
  const [biometryAvailable, setBiometryAvailable] = useState(false);
  const [biometryEnabled, setBiometryEnabled] = useState(false)
  const [continueEnabled, setContinueEnabled] = useState(true)
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
    setContinueEnabled(false)

    if (biometryEnabled) {
      await convertToUseBiometrics()
    }

    dispatch({
      type: DispatchAction.USE_BIOMETRY,
      payload: [biometryEnabled],
    })
  }

  const toggleSwitch = () => setBiometryEnabled((previousState) => !previousState)

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
        {biometryAvailable ? (
          <View>
            <Text style={[TextTheme.normal]}>{t('Biometry.EnabledText1')}</Text>
            <Text></Text>
            <Text style={[TextTheme.normal]}>
              {t('Biometry.EnabledText2')}
              <Text style={[TextTheme.normal, { fontWeight: 'bold' }]}> {t('Biometry.Warning')}</Text>
            </Text>
          </View>
        ) : (
          <View>
            <Text style={[TextTheme.normal]}>{t('Biometry.NotEnabledText1')}</Text>
            <Text></Text>
            <Text style={[TextTheme.normal]}>{t('Biometry.NotEnabledText2')}</Text>
          </View>
        )}
        <View
          style={{
            flexDirection: 'row',
            marginVertical: 30,
          }}
        >
          <View style={{ flexShrink: 1 }}>
            <Text style={[TextTheme.normal, { fontWeight: 'bold' }]}>{t('Biometry.UseToUnlock')}</Text>
          </View>
          <View style={{ justifyContent: 'center' }}>
            <Switch
              accessibilityLabel={t('Biometry.Toggle')}
              testID={testIdWithKey('ToggleBiometrics')}
              trackColor={{ false: ColorPallet.grayscale.lightGrey, true: ColorPallet.brand.primaryDisabled }}
              thumbColor={biometryEnabled ? ColorPallet.brand.primary : ColorPallet.grayscale.mediumGrey}
              ios_backgroundColor={ColorPallet.grayscale.lightGrey}
              onValueChange={toggleSwitch}
              value={biometryEnabled}
              disabled={!biometryAvailable}
            />
          </View>
        </View>
        <View style={{ flexGrow: 1, justifyContent: "flex-end" }}>
          <Button
            title={t("Global.Continue")}
            accessibilityLabel={t("Global.Continue")}
            testID={testIdWithKey("Continue")}
            onPress={continueTouched}
            buttonType={ButtonType.Primary}
            disabled={!continueEnabled}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default UseBiometry;
