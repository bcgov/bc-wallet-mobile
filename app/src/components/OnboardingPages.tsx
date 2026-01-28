import {
  Button,
  ButtonType,
  ContentGradient,
  createStyles,
  GenericFn,
  ITheme,
  ScreenWrapper,
  testIdWithKey,
  useStore,
  useTheme,
} from '@bifold/core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import { SvgProps } from 'react-native-svg'

import CredentialList from '../assets/img/credential-list.svg'
import ScanShare from '../assets/img/scan-share.svg'
import SecureImage from '../assets/img/secure-image.svg'

const EndPage = (onTutorialCompleted: GenericFn, theme: ITheme['OnboardingTheme']) => {
  const { Spacing } = useTheme()
  const [store] = useStore()
  const { t } = useTranslation()
  const defaultStyle = createStyles(theme)
  const imageDisplayOptions = {
    fill: theme.imageDisplayOptions.fill,
    height: 180,
    width: 180,
  }

  const styles = StyleSheet.create({
    imageContainer: {
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
  })

  const controls = !(store.onboarding.didCompleteTutorial && store.authentication.didAuthenticate) && (
    <>
      <ContentGradient backgroundColor={theme.container.backgroundColor} height={30} />
      <Button
        title={t('Onboarding.GetStarted')}
        accessibilityLabel={t('Onboarding.GetStarted')}
        testID={testIdWithKey('GetStarted')}
        onPress={onTutorialCompleted}
        buttonType={ButtonType.Primary}
      />
    </>
  )

  return (
    <ScreenWrapper controls={controls} edges={['left', 'right']}>
      <View style={styles.imageContainer}>
        <SecureImage {...imageDisplayOptions} />
      </View>
      <View style={{ marginBottom: Spacing.md }}>
        <Text style={[defaultStyle.headerText, { fontSize: 26 }]}>{t('Onboarding.PrivateConfidentialHeading')}</Text>
        <Text style={[defaultStyle.bodyText, { marginTop: Spacing.md }]}>
          {t('Onboarding.PrivateConfidentialParagraph')}
        </Text>
      </View>
    </ScreenWrapper>
  )
}

const StartPage = (theme: ITheme['OnboardingTheme']) => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()
  const defaultStyle = createStyles(theme)
  const styles = StyleSheet.create({
    imageContainer: {
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
  })

  const imageDisplayOptions = {
    fill: theme.imageDisplayOptions.fill,
    height: 180,
    width: 180,
  }

  return (
    <ScreenWrapper edges={['left', 'right']}>
      <View style={styles.imageContainer}>
        <ScanShare {...imageDisplayOptions} />
      </View>
      <View style={{ marginBottom: Spacing.md }}>
        <Text style={[defaultStyle.headerText, { fontSize: 26 }]}>{t('Onboarding.DifferentWalletHeading')}</Text>
        <Text style={[defaultStyle.bodyText, { marginTop: Spacing.md }]}>
          {t('Onboarding.DifferentWalletParagraph')}
        </Text>
      </View>
    </ScreenWrapper>
  )
}

const guides: Array<{
  image: (props: SvgProps) => React.JSX.Element
  title: string
  body: string
}> = [
  {
    image: (props) => <CredentialList {...props} />,
    title: 'Onboarding.DigitalCredentialsHeading',
    body: 'Onboarding.DigitalCredentialsParagraph',
  },
]

const CreatePageWith = (
  image: (props: SvgProps) => React.JSX.Element,
  title: string,
  body: string,
  theme: ITheme['OnboardingTheme']
) => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()
  const defaultStyle = createStyles(theme)
  const imageDisplayOptions = {
    fill: theme.imageDisplayOptions.fill,
    height: 180,
    width: 180,
  }
  const styles = StyleSheet.create({
    imageContainer: {
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
  })

  return (
    <ScreenWrapper edges={['left', 'right']}>
      <View style={styles.imageContainer}>{image(imageDisplayOptions)}</View>
      <View style={{ marginBottom: Spacing.md }}>
        <Text style={[defaultStyle.headerText, { fontSize: 26 }]}>{t(title)}</Text>
        <Text style={[defaultStyle.bodyText, { marginTop: Spacing.lg }]}>{t(body)}</Text>
      </View>
    </ScreenWrapper>
  )
}

export const pages = (onTutorialCompleted: GenericFn, theme: ITheme['OnboardingTheme']): Array<Element> => {
  return [
    StartPage(theme),
    ...guides.map((g) => CreatePageWith(g.image, g.title, g.body, theme)),
    EndPage(onTutorialCompleted, theme),
  ]
}
