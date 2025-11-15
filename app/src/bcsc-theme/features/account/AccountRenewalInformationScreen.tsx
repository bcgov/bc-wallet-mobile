import { ActionScreenLayout } from '@/bcsc-theme/components/ActionScreenLayout'
import { BCSCMainStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { Link, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

interface AccountRenewalInformationScreenProps {
  navigation: StackNavigationProp<BCSCMainStackParams, BCSCScreens.AccountRenewalInformation>
}

/**
 * Renders the Account Renewal Information screen, providing users with information about renewing their account.
 *
 * @returns {*} {JSX.Element} The AccountRenewalInformationScreen component.
 */
export const AccountRenewalInformationScreen = ({ navigation }: AccountRenewalInformationScreenProps): JSX.Element => {
  const { t } = useTranslation()
  const { ColorPalette } = useTheme()

  const styles = StyleSheet.create({
    linkContainer: {
      display: 'flex',
      flexDirection: 'row',
    },
    divider: {
      height: 2,
      backgroundColor: ColorPalette.brand.primaryLight,
    },
  })

  return (
    <ActionScreenLayout
      primaryActionText={t('Global.Continue')}
      onPressPrimaryAction={() => {
        navigation.navigate(BCSCScreens.AccountRenewalFirstWarning)
      }}
    >
      <ThemedText variant="headingThree">{t('BCSC.AccountRenewal.InformationHeader')}</ThemedText>
      <ThemedText variant="headingFour">{t('BCSC.AccountRenewal.InformationBCServicesCardSubHeader')}</ThemedText>
      <ThemedText>{t('BCSC.AccountRenewal.InformationBCServicesCardContent')}</ThemedText>
      <View style={styles.linkContainer}>
        <Link
          testID={t('BCSC.AccountRenewal.InformationGetNewCardA')}
          linkText={t('BCSC.AccountRenewal.InformationGetNewCardA')}
          onPress={() => {
            // TODO (MD): Open link to get a new BC Services Card
          }}
        />
        <ThemedText> {t('BCSC.AccountRenewal.InformationGetNewCardB')}</ThemedText>
      </View>
      <View style={styles.divider} />
      <ThemedText variant="headingFour">{t('BCSC.AccountRenewal.InformationPhotoIdSubHeader')}</ThemedText>
      <ThemedText>{t('BCSC.AccountRenewal.InformationPhotoIdContent')}</ThemedText>
      <Link
        testID={t('BCSC.AccountRenewal.InformationTypesOfAcceptedId')}
        linkText={t('BCSC.AccountRenewal.InformationTypesOfAcceptedId')}
        onPress={() => {
          // TODO (MD): Open link to accepted ID types
        }}
      />
    </ActionScreenLayout>
  )
}
