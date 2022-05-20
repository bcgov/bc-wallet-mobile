import React from "react";
import { Text, View } from "react-native";
import { SvgProps } from "react-native-svg";

import CredentialList from "../assets/img/credential-list.svg";
import ScanShare from "../assets/img/scan-share.svg";
import SecureImage from "../assets/img/secure-image.svg";
import { useTranslation } from "react-i18next";
import { Button, ButtonType, Theme, createStyles } from "aries-bifold";
import { GenericFn } from "aries-bifold";
import { testIdWithKey } from "aries-bifold";

const endPage = (onTutorialCompleted: GenericFn, theme: Theme['OnboardingTheme'], t: React.FC<"translation", undefined>) => {
  
  const defaultStyle = createStyles(theme);
  const imageDisplayOptions = {
    fill: theme.imageDisplayOptions.fill,
    height: 180,
    width: 180,
  };
  return (
    <>
      <View style={{ alignItems: "center" }}>
        <SecureImage {...imageDisplayOptions} />
      </View>
      <View style={{ marginLeft: 20, marginRight: 20, marginTop: 30 }}>
        <Text style={[defaultStyle.headerText, { fontSize: 18 }]}>
        {t("OnboardingPages.FourthPageTitle")}
        </Text>
        <Text style={[defaultStyle.bodyText, { marginTop: 20 }]}>
        {t("OnboardingPages.FourthPageBody")}
        </Text>
      </View>
      <View
        style={{
          marginTop: "auto",
          marginBottom: 45,
          marginLeft: 20,
          marginRight: 20,
        }}
      >
        {/* <View style={[defaultStyle.point, { marginTop: 60 }]}>
          <Icon name={'info'} size={30} color={Colors.text} style={{ marginRight: 5 }} />
          <TouchableOpacity
            accessibilityLabel={'Learn More'}
            accessible
            onPress={() => Linking.openURL('https://example.com/')}
          >
            <Text style={[defaultStyle.bodyText, { color: 'blue', textDecorationLine: 'underline' }]}>
              Learn more about the BC Wallet
            </Text>
          </TouchableOpacity>
          <Icon name={'open-in-new'} size={14} color={Colors.text} style={{ marginLeft: 5 }} />
        </View> */}
        <Button
          title={t("OnboardingPages.ButtonGetStarted")}
          accessibilityLabel={"Get Started"}
          testID={testIdWithKey("GetStarted")}
          onPress={onTutorialCompleted}
          buttonType={ButtonType.Primary}
        />
      </View>
    </>
  );
};

const startPages = (theme: Theme, t: React.FC<"translation", undefined>) => {
  const defaultStyle = createStyles(theme);
  return (
    <>
      <Text
        style={[defaultStyle.headerText, { marginLeft: 20, marginRight: 20 }]}
      >
        {t("OnboardingPages.FirstPageTitle")}
      </Text>
      <Text
        style={[
          defaultStyle.bodyText,
          { marginLeft: 20, marginTop: 35, marginRight: 20 },
        ]}
      >
        {t("OnboardingPages.FirstPageBody1")}
      </Text>
      <Text
        style={[
          defaultStyle.bodyText,
          { marginLeft: 20, marginTop: 25, marginRight: 20 },
        ]}
      >
        {t("OnboardingPages.FirstPageBody2")}
      </Text>
      <Text
        style={[
          defaultStyle.bodyText,
          { marginLeft: 20, marginTop: 25, marginRight: 20 },
        ]}
      >
        {t("OnboardingPages.FirstPageBody3")}
      </Text>
    </>
  );
};

const guides: Array<{
  image: React.FC<SvgProps>;
  title: string;
  body: string;
}> = [
  {
    image: CredentialList,
    title: "SecondPageTitle",
    body: "SecondPageBody",
  },
  {
    image: ScanShare,
    title: "ThirdPageTitle",
    body: "ThirdPageBogy",
  },
];

const createPageWith = (
  image: React.FC<SvgProps>,
  title: string,
  body: string,
  theme: Theme['OnboardingTheme'],
  t: React.FC<"translation", undefined>
) => {
  const defaultStyle = createStyles(theme);
  const imageDisplayOptions = {
    fill: theme.imageDisplayOptions.fill,
    height: 180,
    width: 180,
  };
  return (
    <>
      <View style={{ alignItems: "center" }}>{image(imageDisplayOptions)}</View>
      <View style={{ marginLeft: 20, marginRight: 20, marginTop: 30 }}>
        <Text style={[defaultStyle.headerText, { fontSize: 18 }]}>{t("OnboardingPages." + title)}</Text>
        <Text style={[defaultStyle.bodyText, { marginTop: 20 }]}>{t("OnboardingPages." + body)}</Text>
      </View>
    </>
  );
};

export const pages = (
  onTutorialCompleted: GenericFn,
  theme: Theme
): Array<Element> => {
  const { t } = useTranslation();
  return [
    startPages(theme, t),
    ...guides.map((g) => createPageWith(g.image, g.title, g.body, theme, t)),
    endPage(onTutorialCompleted, theme, t),
  ];
};
