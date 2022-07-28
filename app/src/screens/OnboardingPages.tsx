import React from "react";
import { Text, View } from "react-native";
import { SvgProps } from "react-native-svg";

import CredentialList from "../assets/img/credential-list.svg";
import ScanShare from "../assets/img/scan-share.svg";
import SecureImage from "../assets/img/secure-image.svg";
import { Button, ButtonType, Theme, createStyles } from "aries-bifold";
import { GenericFn } from "aries-bifold";
import { testIdWithKey } from "aries-bifold";

const endPage = (onTutorialCompleted: GenericFn, theme: Theme['OnboardingTheme']) => {
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
          Take control of your information
        </Text>
        <Text style={[defaultStyle.bodyText, { marginTop: 20 }]}>
          You have control of what, when, and how you prove things from your
          credentials, and you approve each use.
          {"\n\n"}The Government of British Columbia is not told when you use
          your credentials.
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
          title={"Get Started"}
          accessibilityLabel={"Get Started"}
          testID={testIdWithKey("GetStarted")}
          onPress={onTutorialCompleted}
          buttonType={ButtonType.Primary}
        />
      </View>
    </>
  );
};

const startPages = (theme: Theme) => {
  const defaultStyle = createStyles(theme);
  return (
    <>
      <Text
        style={[defaultStyle.headerText, { marginLeft: 20, marginRight: 20 }]}
      >
        Welcome
      </Text>
      <Text
        style={[
          defaultStyle.bodyText,
          { marginLeft: 20, marginTop: 35, marginRight: 20 },
        ]}
      >
        BC Wallet is a secure, private and easy way to prove things about yourself online.
      </Text>
      <Text
        style={[
          defaultStyle.bodyText,
          { marginLeft: 20, marginTop: 25, marginRight: 20 },
        ]}
      >
        You add your digital cards and documents and use them to gain access to
        online services, and experience faster service processing.
      </Text>
      <Text
        style={[
          defaultStyle.bodyText,
          { marginLeft: 20, marginTop: 25, marginRight: 20 },
        ]}
      >
        With BC Wallet, you own your data. You retain full control and share
        only what is needed.{" "}
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
    title: "Store and secure credentials",
    body: "Digital credentials are the digital versions of cards and documents you already know, such as membership cards and licenses.\n\nThey are stored securely in this digital wallet app, only on this device.",
  },
  {
    image: ScanShare,
    title: "Share only what is necessary",
    body: "To use—“prove things”— with your credentials, online or in person, you’ll scan a QR code to start things off.\n\nYou only share the parts of a credential necessary for a situation, which is better for privacy.",
  },
];

const createPageWith = (
  image: React.FC<SvgProps>,
  title: string,
  body: string,
  theme: Theme['OnboardingTheme']
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
        <Text style={[defaultStyle.headerText, { fontSize: 18 }]}>{title}</Text>
        <Text style={[defaultStyle.bodyText, { marginTop: 20 }]}>{body}</Text>
      </View>
    </>
  );
};

export const pages = (
  onTutorialCompleted: GenericFn,
  theme: Theme
): Array<Element> => {
  return [
    startPages(theme),
    ...guides.map((g) => createPageWith(g.image, g.title, g.body, theme)),
    endPage(onTutorialCompleted, theme),
  ];
};
