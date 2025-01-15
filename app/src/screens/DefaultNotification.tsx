import {
  useTheme,
  Button,
  ButtonType,
  testIdWithKey,
  Screens,
  NotificationStackParams,
  useStore,
} from '@hyperledger/aries-bifold-core'
import { StackScreenProps } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import HeaderText from '../components/HeaderText'
import { BCState, IASEnvironmentKeys, iasEnvironments } from '../store'

type DefaultProps = StackScreenProps<NotificationStackParams, Screens.CustomNotification>

const DefaultNotification: React.FC<DefaultProps> = ({ navigation }: DefaultProps) => {
  const { ColorPallet, TextTheme } = useTheme()
  const { t } = useTranslation()
  const [store] = useStore<BCState>()

  const urlGestionDeCompteSag =
    iasEnvironments[Object.keys(store.developer.environment)[0] as IASEnvironmentKeys].iasPortalUrl

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    container: {
      padding: 16,
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
    textHeaderTitle: {
      ...TextTheme.headingThree,
      flexShrink: 1,
      color: TextTheme.headingThree.color,
    },
    textSectionTitle: {
      ...TextTheme.title,
      flexShrink: 1,
      color: TextTheme.bold.color,
    },
    buttonContainer: {
      marginBottom: 30,
    },
    button: {
      margin: 20,
      marginTop: 10,
      marginBottom: 10,
    },
    section: {
      paddingVertical: 12,
    },
    sectionBottom: {
      marginBottom: 12,
    },
    sectionDescription: {
      ...TextTheme.normal,
      color: TextTheme.normal.color,
      textAlign: 'left',
      textDecorationLine: 'none',
      paddingTop: 8,
    },
    sectionDescriptionTitle: {
      ...TextTheme.normal,
      color: TextTheme.normal.color,
      textAlign: 'left',
      textDecorationLine: 'none',
      paddingTop: 32,
    },
  })

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <HeaderText title={t('DefaultNotificationPage.Title')} />
          <Text style={styles.sectionDescriptionTitle}> {t('DefaultNotificationPage.Description')}</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.textSectionTitle}>{t('DefaultNotificationPage.SAGConnexion')}</Text>
          <Text style={styles.sectionDescription}> {t('DefaultNotificationPage.SAGConnexionDescription')}</Text>
        </View>
        <View style={[styles.sectionBottom, styles.section]}>
          <Text style={styles.textSectionTitle}>{t('DefaultNotificationPage.ANIGRequest')}</Text>
          <Text style={styles.sectionDescription}> {t('DefaultNotificationPage.ANIGAcceptDescription')}</Text>
        </View>
        <View style={styles.buttonContainer}>
          <View style={styles.button}>
            <Button
              buttonType={ButtonType.Primary}
              testID={testIdWithKey('StartProcess')}
              accessibilityLabel={t('DefaultNotificationPage.ButtonTitle')}
              title={t('DefaultNotificationPage.ButtonTitle')}
              onPress={async () => await Linking.openURL(urlGestionDeCompteSag)}
            ></Button>
          </View>
          <View style={styles.button}>
            <Button
              buttonType={ButtonType.Secondary}
              testID={testIdWithKey('StartProcess')}
              accessibilityLabel={t('Global.GoBack')}
              title={t('Global.GoBack')}
              onPress={() => navigation.goBack()}
            ></Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default DefaultNotification
