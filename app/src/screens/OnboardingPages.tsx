import { Button, ButtonType, Theme, createStyles, GenericFn, testIdWithKey, useStore } from 'aries-bifold'
import React from 'react'
import { useTranslation, TFunction } from 'react-i18next'
import { Text, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SvgProps } from 'react-native-svg'

import CredentialList from '../assets/img/credential-list.svg'
import ScanShare from '../assets/img/scan-share.svg'
import SecureImage from '../assets/img/secure-image.svg'
import { defaultTheme } from '../theme'

const endPage = (
  onTutorialCompleted: GenericFn,
  theme: Theme['OnboardingTheme'],
  t: TFunction<'translation', undefined>
) => {
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
          <Text style={[defaultStyle.headerText, { fontSize: 18 }]}>{t('OnboardingPages.FourthPageTitle')}</Text>
          <Text style={[defaultStyle.bodyText, { marginTop: 20 }]}>{t('OnboardingPages.FourthPageBody')}</Text>
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
            title={t('OnboardingPages.ButtonGetStarted')}
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

const startPages = (theme: Theme, t: TFunction<'translation', undefined>) => {
  const defaultStyle = createStyles(theme)
  return (
    <ScrollView style={{ padding: 20, paddingTop: 30 }}>
      <Text style={[defaultStyle.headerText]}>{t('OnboardingPages.FirstPageTitle')}</Text>
      <View style={{ height: 4, width: 48, backgroundColor: defaultTheme.ColorPallet.brand.highlight }} />

      <Text style={[defaultStyle.bodyText, { marginTop: 35 }]}>{t('OnboardingPages.FirstPageBody1')}</Text>
      <Text style={[defaultStyle.bodyText, { marginTop: 25 }]}>{t('OnboardingPages.FirstPageBody2')}</Text>
      <Text style={[defaultStyle.bodyText, { marginTop: 25 }]}>{t('OnboardingPages.FirstPageBody3')}</Text>
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
    title: 'SecondPageTitle',
    body: 'SecondPageBody',
  },
  {
    image: ScanShare,
    title: 'ThirdPageTitle',
    body: 'ThirdPageBogy',
  },
]

const createPageWith = (
  image: React.FC<SvgProps>,
  title: string,
  body: string,
  theme: Theme['OnboardingTheme'],
  t: TFunction<'translation', undefined>
) => {
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
        <Text style={[defaultStyle.headerText, { fontSize: 18 }]}>{t('OnboardingPages.' + title)}</Text>
        <Text style={[defaultStyle.bodyText, { marginTop: 20 }]}>{t('OnboardingPages.' + body)}</Text>
      </View>
    </ScrollView>
  )
}

export const pages = (onTutorialCompleted: GenericFn, theme: Theme): Array<Element> => {
  const { t } = useTranslation()
  return [
    startPages(theme, t),
    ...guides.map((g) => createPageWith(g.image, g.title, g.body, theme, t)),
    endPage(onTutorialCompleted, theme, t),
  ]
}
