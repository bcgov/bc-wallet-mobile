import GenericCardImage from '@/bcsc-theme/components/GenericCardImage'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import BulletPointWithText from '@/components/BulletPointWithText'
import { BCState } from '@/store'
import { Button, ButtonType, ScreenWrapper, testIdWithKey, ThemedText, useStore, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { Linking, TouchableOpacity, View } from 'react-native'
import { BCSCCardProcess } from 'react-native-bcsc-core'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type AdditionalIdentificationRequiredScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyStackParams, BCSCScreens.AdditionalIdentificationRequired>
}

const AdditionalIdentificationRequiredScreen: React.FC<AdditionalIdentificationRequiredScreenProps> = ({
  navigation,
}: AdditionalIdentificationRequiredScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()
  const [store] = useStore<BCState>()

  return (
    <ScreenWrapper>
      <GenericCardImage />
      <View style={{ marginBottom: Spacing.lg }}>
        <ThemedText variant={'headingFour'}>{t('BCSC.AdditionalEvidence.PhotoRequired')}</ThemedText>
        <ThemedText>{t('BCSC.AdditionalEvidence.PhotoRequiredDescription')}</ThemedText>
      </View>
      <View style={{ marginBottom: Spacing.lg }}>
        <ThemedText variant={'headingFour'}>{t('BCSC.AdditionalEvidence.CheckYourID')}</ThemedText>
        <BulletPointWithText
          translationKey={t('BCSC.AdditionalEvidence.CheckYourIDBullet1')}
          iconColor={ColorPalette.brand.icon}
        />
        <BulletPointWithText
          translationKey={t('BCSC.AdditionalEvidence.CheckYourIDBullet2')}
          iconColor={ColorPalette.brand.icon}
          iconSize={Spacing.sm}
        />
        <BulletPointWithText
          translationKey={t('BCSC.AdditionalEvidence.CheckYourIDBullet3')}
          iconColor={ColorPalette.brand.icon}
        />
      </View>
      <View style={{ marginBottom: Spacing.lg }}>
        <View style={{ flexDirection: 'row', alignContent: 'center', alignItems: 'center' }}>
          <ThemedText variant={'headingFour'}>{t('BCSC.AdditionalEvidence.LimitedAccess')}</ThemedText>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://id.gov.bc.ca/account/services')}
            accessibilityLabel={t('Accessibility.OpenAccountServices')}
            accessibilityRole="link"
            testID={testIdWithKey('OpenAccountServices')}
          >
            <Icon color={ColorPalette.brand.primary} size={Spacing.xl} name={'open-in-new'} />
          </TouchableOpacity>
        </View>
        <ThemedText>{t('BCSC.AdditionalEvidence.LimitedAccessDescription')}</ThemedText>
      </View>
      <View style={{ marginTop: Spacing.md }}>
        <Button
          title={t('BCSC.AdditionalEvidence.ChooseID')}
          accessibilityLabel={t('BCSC.AdditionalEvidence.ChooseID')}
          testID={testIdWithKey(t('BCSC.AdditionalEvidence.ChooseID'))}
          onPress={() => {
            navigation.navigate(BCSCScreens.EvidenceTypeList, {
              /**
               * Pass along the card process filter to the EvidenceTypeList screen
               * Note: The cardProcess should have been defined prior to reaching this screen.
               * @see EnterBirthdateViewModel.authorizeDevice()
               */
              cardProcess: store.bcscSecure.cardProcess ?? BCSCCardProcess.None,
            })
          }}
          buttonType={ButtonType.Primary}
        />
      </View>
    </ScreenWrapper>
  )
}

export default AdditionalIdentificationRequiredScreen
