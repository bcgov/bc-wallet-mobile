import { useStore, Button, ButtonType, Theme, createStyles, GenericFn, testIdWithKey } from 'aries-bifold'
import React from 'react'
import { Text, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SvgProps } from 'react-native-svg'

import CredentialList from '../assets/img/credential-list.svg'
import ScanShare from '../assets/img/scan-share.svg'
import SecureImage from '../assets/img/secure-image.svg'

const EndPage = (onTutorialCompleted: GenericFn, theme: Theme['OnboardingTheme']) => {
  const [store] = useStore()
  const defaultStyle = createStyles(theme)
  const imageDisplayOptions = {
    fill: theme.imageDisplayOptions.fill,
    height: 180,
    width: 180,
  }
  return (
    <>
      <ScrollView style={{ padding: 20 }}>
        <View style={{ alignItems: 'center' }}>
          <SecureImage {...imageDisplayOptions} />
        </View>
        <View style={{ marginBottom: 20 }}>
          <Text style={[defaultStyle.headerText, { fontSize: 18 }]}>Privacy and confidentiality</Text>
          <Text style={[defaultStyle.bodyText, { marginTop: 25 }]}>
            You approve every use of information from your BC Wallet. You also only share what is needed for a
            situation.
            {'\n\n'}
            The Government of British Columbia is not told when you use your digital credentials.
          </Text>
        </View>
      </ScrollView>
      {!(store.onboarding.didCompleteTutorial && store.authentication.didAuthenticate) && (
        <View
          style={{
            marginTop: 'auto',
            margin: 20,
          }}
        >
          <Button
            title={'Get Started'}
            accessibilityLabel={'Get Started'}
            testID={testIdWithKey('GetStarted')}
            onPress={onTutorialCompleted}
            buttonType={ButtonType.Primary}
          />
        </View>
      )}
    </>
  )
}

const StartPages = (theme: Theme) => {
  const defaultStyle = createStyles(theme)
  return (
    <ScrollView style={{ padding: 20, paddingTop: 30 }}>
      <Text style={[defaultStyle.headerText]}>Welcome</Text>
      <Text style={[defaultStyle.bodyText, { marginTop: 25 }]}>
        BC Wallet lets you receive, store and use digital credentials.
      </Text>
      <Text style={[defaultStyle.bodyText, { marginTop: 25 }]}>
        It is highly secure, and helps protect your privacy online.
      </Text>
      <Text style={[defaultStyle.bodyText, { marginTop: 25 }]}>
        BC Wallet is currently in its early stages and the technology is being explored. Most people will not have a use
        for BC Wallet yet, because very few digital credentials are available.
      </Text>
    </ScrollView>
  )
}

const guides: Array<{
  image: React.FC<SvgProps>
  title: string
  body: string
}> = [
  {
    image: CredentialList,
    title: 'Digital credentials, stored securely',
    body: 'BC Wallet holds digital credentials—the digital versions of things like licenses, identities and permits.\n\nThey are stored securely, only on this device.',
  },
  {
    image: ScanShare,
    title: 'Receiving and using credentials',
    body: 'To receive and use credentials you use the “Scan” feature in the app to scan a special QR code.\n\nInformation is sent and received over a private, encrypted connection.',
  },
]

const CreatePageWith = (image: React.FC<SvgProps>, title: string, body: string, theme: Theme['OnboardingTheme']) => {
  const defaultStyle = createStyles(theme)
  const imageDisplayOptions = {
    fill: theme.imageDisplayOptions.fill,
    height: 180,
    width: 180,
  }
  return (
    <ScrollView style={{ padding: 20 }}>
      <View style={{ alignItems: 'center' }}>{image(imageDisplayOptions)}</View>
      <View style={{ marginBottom: 20 }}>
        <Text style={[defaultStyle.headerText, { fontSize: 18 }]}>{title}</Text>
        <Text style={[defaultStyle.bodyText, { marginTop: 25 }]}>{body}</Text>
      </View>
    </ScrollView>
  )
}

export const pages = (onTutorialCompleted: GenericFn, theme: Theme): Array<Element> => {
  return [
    StartPages(theme),
    ...guides.map((g) => CreatePageWith(g.image, g.title, g.body, theme)),
    EndPage(onTutorialCompleted, theme),
  ]
}
