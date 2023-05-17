import { useStore, Button, ButtonType, ITheme, createStyles, GenericFn, testIdWithKey } from 'aries-bifold'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SvgProps } from 'react-native-svg'

import CredentialList from '../assets/img/credential-list.svg'
import ScanShare from '../assets/img/scan-share.svg'
import SecureImage from '../assets/img/secure-image.svg'

const EndPage = (onTutorialCompleted: GenericFn, theme: ITheme['OnboardingTheme']) => {
  const [store] = useStore()
  const { t } = useTranslation()
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
          <Text style={[defaultStyle.headerText, { fontSize: 18 }]}>{t('Onboarding.PrivacyConfidentiality')}</Text>
          <Text style={[defaultStyle.bodyText, { marginTop: 25 }]}>{t('Onboarding.PrivacyParagraph')}</Text>
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
            title={t('Onboarding.GetStarted')}
            accessibilityLabel={t('Onboarding.GetStarted')}
            testID={testIdWithKey('GetStarted')}
            onPress={onTutorialCompleted}
            buttonType={ButtonType.Primary}
          />
        </View>
      )}
    </>
  )
}

const StartPages = (theme: ITheme) => {
  const { t } = useTranslation()
  const defaultStyle = createStyles(theme)
  return (
    <ScrollView style={{ padding: 20, paddingTop: 30 }}>
      <Text style={[defaultStyle.headerText]}>{t('Onboarding.Welcome')}</Text>
      <Text style={[defaultStyle.bodyText, { marginTop: 25 }]}>{t('Onboarding.WelcomeParagraph1')}</Text>
      <Text style={[defaultStyle.bodyText, { marginTop: 25 }]}>{t('Onboarding.WelcomeParagraph2')}</Text>
      <Text style={[defaultStyle.bodyText, { marginTop: 25 }]}>{t('Onboarding.WelcomeParagraph3')}</Text>
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
    title: 'Onboarding.StoredSecurelyTitle',
    body: 'Onboarding.StoredSecurelyBody',
  },
  {
    image: ScanShare,
    title: 'Onboarding.UsingCredentialsTitle',
    body: 'Onboarding.UsingCredentialsBody',
  },
]

const CreatePageWith = (image: React.FC<SvgProps>, title: string, body: string, theme: ITheme['OnboardingTheme']) => {
  const { t } = useTranslation()
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
        <Text style={[defaultStyle.headerText, { fontSize: 18 }]}>{t(title)}</Text>
        <Text style={[defaultStyle.bodyText, { marginTop: 25 }]}>{t(body)}</Text>
      </View>
    </ScrollView>
  )
}

export const pages = (onTutorialCompleted: GenericFn, theme: ITheme): Array<Element> => {
  return [
    StartPages(theme),
    ...guides.map((g) => CreatePageWith(g.image, g.title, g.body, theme)),
    EndPage(onTutorialCompleted, theme),
  ]
}
