import {
  useTheme,
  Button,
  ButtonType,
  testIdWithKey,
  Stacks as BifoldStacks,
  Screens as BifoldScreens,
} from '@hyperledger/aries-bifold-core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import ContactUs from '../components/ContactUs'
import { RootStackParams, Screens, Stacks } from '../navigators/navigators'

const Plus = () => {
  const { TextTheme } = useTheme()
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<RootStackParams>>()

  const styles = StyleSheet.create({
    container: {
      paddingHorizontal: 16,
    },
    innerContainer: {
      marginVertical: 24,
    },
    textHeaderTitle: {
      ...TextTheme.headingThree,
      color: TextTheme.headingThree.color,
      marginVertical: 8,
    },
    button: {
      paddingBottom: 24,
    },
    section: {
      paddingBottom: 16,
    },
    sectionCopyright: {
      flex: 1,
      ...TextTheme.headingOne,
      marginVertical: 10,
    },
    sectionDescription: {
      ...TextTheme.normal,
      color: TextTheme.normal.color,
      textAlign: 'left',
    },
    sectionCopyrightText: {
      ...TextTheme.caption,
      color: TextTheme.normal.color,
      textAlign: 'left',
    },
  })

  return (
    <SafeAreaView edges={['left', 'right']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.innerContainer}>
          <View style={styles.button}>
            <Button
              buttonType={ButtonType.Secondary}
              testID={testIdWithKey('AppContacts')}
              accessibilityLabel={t('OptionsPlus.ButtonContacts')}
              title={t('OptionsPlus.ButtonContacts')}
              onPress={() => navigation.navigate(BifoldStacks.ContactStack, { screen: BifoldScreens.Contacts })}
            />
          </View>
          <View style={styles.button}>
            <Button
              buttonType={ButtonType.Secondary}
              testID={testIdWithKey('AppParams')}
              accessibilityLabel={t('OptionsPlus.ButtonParamsApp')}
              title={t('OptionsPlus.ButtonParamsApp')}
              onPress={() => navigation.navigate(Stacks.SettingsStack, { screen: Screens.Settings })}
            />
          </View>
          <View style={styles.button}>
            <Button
              buttonType={ButtonType.Secondary}
              testID={testIdWithKey('HelpCenter')}
              accessibilityLabel={t('OptionsPlus.ButtonHelpCenter')}
              title={t('OptionsPlus.ButtonHelpCenter')}
              onPress={() => navigation.navigate(Stacks.HelpCenterStack, { screen: Screens.HelpCenter })}
            />
          </View>
          <View style={styles.button}>
            <Button
              buttonType={ButtonType.Secondary}
              testID={testIdWithKey('About')}
              accessibilityLabel={t('OptionsPlus.ButtonAbout')}
              title={t('OptionsPlus.ButtonAbout')}
              onPress={() => navigation.navigate(Stacks.AboutStack, { screen: Screens.About })}
            />
          </View>
          <View style={styles.section}>
            <Text style={styles.textHeaderTitle} accessibilityRole="header">
              {t('OptionsPlus.TitleSupport')}
            </Text>
            <Text style={styles.sectionDescription}>{t('OptionsPlus.DetailSupport')}</Text>
          </View>
          <ContactUs />
          <View style={[styles.sectionCopyright]}>
            <Text style={styles.sectionCopyrightText}>{t('OptionsPlus.Copyright')}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default Plus
