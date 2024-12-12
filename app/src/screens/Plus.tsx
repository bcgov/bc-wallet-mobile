import { useTheme, Button, ButtonType, testIdWithKey } from '@hyperledger/aries-bifold-core'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import ContactUs from '../components/ContactUs'
import { SettingStackParams, Stacks, Screens } from '../navigators/navigators'

const Plus: React.FC = () => {
  const { ColorPallet, TextTheme } = useTheme()
  const { t } = useTranslation()
  const { navigate } = useNavigation<StackNavigationProp<SettingStackParams>>()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
    innerContainer: {
      flex: 1,
    },
    mainSection: {
      flex: 5,
    },
    textHeaderTitle: {
      ...TextTheme.headingThree,
      flexShrink: 1,
      color: TextTheme.headingThree.color,
      paddingTop: 8,
      paddingBottom: 8,
    },
    textSectionTitle: {
      ...TextTheme.title,
      flexShrink: 1,
      color: TextTheme.bold.color,
      paddingTop: 8,
      paddingBottom: 8,
    },
    button: {
      marginTop: 10,
      marginBottom: 10,
    },
    section: {
      paddingVertical: 12,
    },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingVertical: 24,
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionDoubleRow: {
      paddingTop: 10,
      flexDirection: 'row',
      alignItems: 'flex-start',
      height: 100,
    },
    sectionCopyright: {
      flex: 1,
      justifyContent: 'flex-end',
      ...TextTheme.headingOne,
      margin: 10,
    },
    phoneImage: {
      width: 24,
      height: 24,
    },
    sectionDescription: {
      ...TextTheme.normal,
      color: TextTheme.normal.color,
      textAlign: 'left',
      textDecorationLine: 'none',
      marginLeft: 10,
    },
    sectionCopyrightText: {
      ...TextTheme.caption,
      color: TextTheme.normal.color,
      textAlign: 'left',
      textDecorationLine: 'none',
      marginLeft: 10,
    },
  })

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.innerContainer}>
          <View style={styles.mainSection}>
            <View style={styles.button}>
              <Button
                buttonType={ButtonType.Secondary}
                testID={testIdWithKey('AppParams')}
                accessibilityLabel={t('OptionsPlus.ButtonParamsApp')}
                title={t('OptionsPlus.ButtonParamsApp')}
                onPress={() => navigate(Stacks.SettingsStack as never, { screen: Screens.Settings } as never)}
              />
            </View>
            <View style={styles.button}>
              <Button
                buttonType={ButtonType.Secondary}
                testID={testIdWithKey('HelpCenter')}
                accessibilityLabel={t('OptionsPlus.ButtonHelpCenter')}
                title={t('OptionsPlus.ButtonHelpCenter')}
                onPress={() => navigate(Stacks.HelpCenterStack as never, { screen: Screens.HelpCenter } as never)}
              />
            </View>
            <View style={styles.button}>
              <Button
                buttonType={ButtonType.Secondary}
                testID={testIdWithKey('About')}
                accessibilityLabel={t('OptionsPlus.ButtonAbout')}
                title={t('OptionsPlus.ButtonAbout')}
                onPress={() => navigate(Stacks.AboutStack as never, { screen: Screens.About } as never)}
              />
            </View>
            <View style={styles.section}>
              <Text style={styles.textHeaderTitle}> {t('OptionsPlus.TitleSupport')}</Text>
              <Text style={styles.sectionDescription}> {t('OptionsPlus.DetailSupport')}</Text>
            </View>
            <ContactUs />
          </View>
          <View style={[styles.sectionCopyright]}>
            <Text style={styles.sectionCopyrightText}> {t('OptionsPlus.Copyright')}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default Plus
