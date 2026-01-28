import GenericCardImage from '@/bcsc-theme/components/GenericCardImage'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import BulletPointWithText from '@/components/BulletPointWithText'
import { ACCOUNT_SERVICES_URL } from '@/constants'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native'
import { BCSCCardProcess } from 'react-native-bcsc-core'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type DualIdentificationRequiredScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.DualIdentificationRequired>
}

/**
 * Renders an instructions screen, when users are registering non-bcsc cards.
 * It explains, what access the user will have and what types of cards are required during the setup.
 *
 * @returns {*} {React.ReactElement}
 */
const DualIdentificationRequiredScreen: React.FC<DualIdentificationRequiredScreenProps> = ({
  navigation,
}: DualIdentificationRequiredScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    scrollView: {
      flexGrow: 1,
      gap: Spacing.lg,
    },
  })

  return (
    <ScreenWrapper scrollViewContainerStyle={styles.scrollView}>
      <GenericCardImage />
      <ThemedText variant={'headingFour'}>{t('BCSC.DualNonBCSCEvidence.Heading')}</ThemedText>
      <ThemedText>{t('BCSC.DualNonBCSCEvidence.Description')}</ThemedText>

      <View>
        <ThemedText variant={'headingFour'}>{t('BCSC.DualNonBCSCEvidence.CheckYourID')}</ThemedText>
        <BulletPointWithText
          translationKey={t('BCSC.DualNonBCSCEvidence.CheckYourIDBullet1')}
          iconColor={ColorPalette.brand.icon}
        />
        <BulletPointWithText
          translationKey={t('BCSC.DualNonBCSCEvidence.CheckYourIDBullet2')}
          iconColor={ColorPalette.brand.icon}
          iconSize={Spacing.sm}
        />
        <BulletPointWithText
          translationKey={t('BCSC.DualNonBCSCEvidence.CheckYourIDBullet3')}
          iconColor={ColorPalette.brand.icon}
        />
        <BulletPointWithText
          translationKey={t('BCSC.DualNonBCSCEvidence.CheckYourIDBullet4')}
          iconColor={ColorPalette.brand.icon}
        />
      </View>
      <View>
        <View style={{ flexDirection: 'row', alignContent: 'center', alignItems: 'center' }}>
          <ThemedText variant={'headingFour'}>{t('BCSC.AdditionalEvidence.LimitedAccess')}</ThemedText>
          <TouchableOpacity style={{ marginLeft: Spacing.sm }} onPress={() => Linking.openURL(ACCOUNT_SERVICES_URL)}>
            <Icon color={ColorPalette.brand.primary} size={Spacing.xl} name={'open-in-new'} />
          </TouchableOpacity>
        </View>
        <ThemedText>{t('BCSC.AdditionalEvidence.LimitedAccessDescription')}</ThemedText>
      </View>
      <View style={{ marginTop: 'auto' }}>
        <Button
          title={t('BCSC.AdditionalEvidence.ChooseID')}
          accessibilityLabel={t('BCSC.AdditionalEvidence.ChooseID')}
          testID={testIdWithKey(t('BCSC.AdditionalEvidence.ChooseID'))}
          onPress={() => {
            navigation.navigate(BCSCScreens.EvidenceTypeList, { cardProcess: BCSCCardProcess.NonBCSC })
          }}
          buttonType={ButtonType.Primary}
        />
      </View>
    </ScreenWrapper>
  )
}

export default DualIdentificationRequiredScreen
