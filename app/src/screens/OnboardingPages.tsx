import React from 'react'
import { Text, View } from 'react-native'
import { SvgProps } from 'react-native-svg'

import CredentialList from '../assets/img/credential-list.svg'
import ScanShare from '../assets/img/scan-share.svg'
import SecureImage from '../assets/img/secure-image.svg'
import { Button, ButtonType, Theme, createStyles } from 'aries-bifold'
import { GenericFn } from 'aries-bifold'
import { testIdWithKey } from 'aries-bifold'

const endPage = (onTutorialCompleted: GenericFn, theme: Theme['OnboardingTheme']) => {
  const defaultStyle = createStyles(theme)
  const imageDisplayOptions = {
    fill: theme.imageDisplayOptions.fill,
    height: 180,
    width: 180,
  }
  return (
    <>
      <View style={{ alignItems: 'center' }}>
        <SecureImage {...imageDisplayOptions} />
      </View>
      <View style={{ marginLeft: 20, marginRight: 20, marginTop: 30 }}>
        <Text style={[defaultStyle.headerText, { fontSize: 18 }]}>Privacy and confidentiality</Text>
        <Text style={[defaultStyle.bodyText, { marginTop: 20 }]}>
          You approve every use of information from your BC Wallet. You also only share what is needed for a situation.
          {'\n\n'}
          The Government of British Columbia is not told when you use your digital credentials.
        </Text>
      </View>
      <View
        style={{
          marginTop: 'auto',
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
          title={'Get Started'}
          accessibilityLabel={'Get Started'}
          testID={testIdWithKey('GetStarted')}
          onPress={onTutorialCompleted}
          buttonType={ButtonType.Primary}
        />
      </View>
    </>
  )
}

const startPages = (theme: Theme) => {
  const defaultStyle = createStyles(theme)
  return (
    <>
      <Text style={[defaultStyle.headerText, { marginLeft: 20, marginRight: 20 }]}>Welcome</Text>
      <Text style={[defaultStyle.bodyText, { marginLeft: 20, marginTop: 35, marginRight: 20 }]}>
        BC Wallet lets you receive, store and use digital credentials.
      </Text>
      <Text style={[defaultStyle.bodyText, { marginLeft: 20, marginTop: 25, marginRight: 20 }]}>
        It is highly secure, and helps protect your privacy online.
      </Text>
      <Text style={[defaultStyle.bodyText, { marginLeft: 20, marginTop: 25, marginRight: 20 }]}>
        BC Wallet is currently in its early stages and the technology is being explored. Most people will not have a use
        for BC Wallet yet, because very few digital credentials are available.
      </Text>
    </>
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

const createPageWith = (image: React.FC<SvgProps>, title: string, body: string, theme: Theme['OnboardingTheme']) => {
  const defaultStyle = createStyles(theme)
  const imageDisplayOptions = {
    fill: theme.imageDisplayOptions.fill,
    height: 180,
    width: 180,
  }
  return (
    <>
      <View style={{ alignItems: 'center' }}>{image(imageDisplayOptions)}</View>
      <View style={{ marginLeft: 20, marginRight: 20, marginTop: 30 }}>
        <Text style={[defaultStyle.headerText, { fontSize: 18 }]}>{title}</Text>
        <Text style={[defaultStyle.bodyText, { marginTop: 20 }]}>{body}</Text>
      </View>
    </>
  )
}

export const pages = (onTutorialCompleted: GenericFn, theme: Theme): Array<Element> => {
  return [
    startPages(theme),
    ...guides.map((g) => createPageWith(g.image, g.title, g.body, theme)),
    endPage(onTutorialCompleted, theme),
  ]
}
