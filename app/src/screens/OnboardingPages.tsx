import {
  useStore,
  Button,
  ButtonType,
  ITheme,
  createStyles,
  GenericFn,
  testIdWithKey,
  ContentGradient,
} from '@hyperledger/aries-bifold-core'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
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

  const styles = StyleSheet.create({
    scrollView: {
      flex: 1,
      backgroundColor: theme.container.backgroundColor,
      padding: 20,
    },
    pageContainer: {
      height: '100%',
      justifyContent: 'space-between',
    },
    controlsContainer: {
      marginBottom: 20,
      marginTop: 'auto',
      marginHorizontal: 20,
      position: 'relative',
    },
    imageContainer: {
      alignItems: 'center',
      marginBottom: 10,
    },
  })
  return (
    <View style={styles.pageContainer}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.imageContainer}>
          <SecureImage {...imageDisplayOptions} />
        </View>
        <View style={{ marginBottom: 20 }}>
          <Text style={[defaultStyle.headerText, { fontSize: 18 }]}>{t('Onboarding.PrivateConfidentialHeading')}</Text>
          <Text style={[defaultStyle.bodyText, { marginTop: 20 }]}>{t('Onboarding.PrivateConfidentialParagraph')}</Text>
        </View>
      </ScrollView>
      {!(store.onboarding.didCompleteTutorial && store.authentication.didAuthenticate) && (
        <View style={styles.controlsContainer}>
          <ContentGradient backgroundColor={theme.container.backgroundColor} height={30} />
          <Button
            title={t('Onboarding.GetStarted')}
            accessibilityLabel={t('Onboarding.GetStarted')}
            testID={testIdWithKey('GetStarted')}
            onPress={onTutorialCompleted}
            buttonType={ButtonType.Primary}
          />
        </View>
      )}
    </View>
  )
}

const StartPage = (theme: ITheme['OnboardingTheme']) => {
  const { t } = useTranslation()
  const defaultStyle = createStyles(theme)
  const styles = StyleSheet.create({
    imageContainer: {
      alignItems: 'center',
      marginBottom: 10,
    },
  })

  const imageDisplayOptions = {
    fill: theme.imageDisplayOptions.fill,
    height: 180,
    width: 180,
  }

  return (
    <ScrollView style={{ padding: 20 }}>
      <View style={styles.imageContainer}>
        <ScanShare {...imageDisplayOptions} />
      </View>
      <View style={{ marginBottom: 20 }}>
        <Text style={[defaultStyle.headerText, { fontSize: 18 }]}>{t('Onboarding.InstntHeading')}</Text>
        <Text style={[defaultStyle.bodyText, { marginTop: 20 }]}>{t('Onboarding.InstntFirstParagraph')}</Text>
      </View>
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
    title: 'Onboarding.InstntAccessHeading',
    body: 'Onboarding.InstntAccessParagraph',
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
  const styles = StyleSheet.create({
    imageContainer: {
      alignItems: 'center',
      marginBottom: 10,
    },
  })
  return (
    <ScrollView style={{ padding: 20 }}>
      <View style={styles.imageContainer}>{image(imageDisplayOptions)}</View>
      <View style={{ marginBottom: 20 }}>
        <Text style={[defaultStyle.headerText, { fontSize: 18 }]}>{t(title)}</Text>
        <Text style={[defaultStyle.bodyText, { marginTop: 25 }]}>{t(body)}</Text>
      </View>
    </ScrollView>
  )
}

export const pages = (onTutorialCompleted: GenericFn, theme: ITheme): Array<Element> => {
  return [
    StartPage(theme),
    ...guides.map((g) => CreatePageWith(g.image, g.title, g.body, theme)),
    EndPage(onTutorialCompleted, theme),
  ]
}
