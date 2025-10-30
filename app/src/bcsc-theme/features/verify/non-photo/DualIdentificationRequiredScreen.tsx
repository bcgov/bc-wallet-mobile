import GenericCardImage from '@/bcsc-theme/components/GenericCardImage'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import BulletPointWithText from '@/components/BulletPointWithText'
import { ACCOUNT_SERVICES_URL } from '@/constants'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type DualIdentificationRequiredScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.DualIdentificationRequired>
}

/**
 * Renders an instructions screen, when users are registering non-bcsc cards.
 * It explains, what access the user will have and what types of cards are required during the setup.
 *
 * @returns {*} {JSX.Element}
 */
const DualIdentificationRequiredScreen: React.FC<DualIdentificationRequiredScreenProps> = ({
  navigation,
}: DualIdentificationRequiredScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
      padding: Spacing.md,
    },
    scrollView: {
      flexGrow: 1,
      gap: Spacing.lg,
    },
  })

  return (
    <SafeAreaView style={styles.pageContainer} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollView} showsVerticalScrollIndicator={false}>
        <GenericCardImage />
        <ThemedText variant={'headingFour'}>{t('Unified.DualNonBCSCEvidence.Heading')}</ThemedText>
        <ThemedText>{t('Unified.DualNonBCSCEvidence.Description')}</ThemedText>

        <View>
          <ThemedText variant={'headingFour'}>{t('Unified.DualNonBCSCEvidence.CheckYourID')}</ThemedText>
          <BulletPointWithText
            translationKey={t('Unified.DualNonBCSCEvidence.CheckYourIDBullet1')}
            iconColor={ColorPalette.brand.icon}
          />
          <BulletPointWithText
            translationKey={t('Unified.DualNonBCSCEvidence.CheckYourIDBullet2')}
            iconColor={ColorPalette.brand.icon}
            iconSize={Spacing.sm}
          />
          <BulletPointWithText
            translationKey={t('Unified.DualNonBCSCEvidence.CheckYourIDBullet3')}
            iconColor={ColorPalette.brand.icon}
          />
          <BulletPointWithText
            translationKey={t('Unified.DualNonBCSCEvidence.CheckYourIDBullet4')}
            iconColor={ColorPalette.brand.icon}
          />
        </View>
        <View>
          <View style={{ flexDirection: 'row', alignContent: 'center', alignItems: 'center' }}>
            <ThemedText variant={'headingFour'}>{t('Unified.AdditionalEvidence.LimitedAccess')}</ThemedText>
            <TouchableOpacity style={{ marginLeft: Spacing.sm }} onPress={() => Linking.openURL(ACCOUNT_SERVICES_URL)}>
              <Icon color={ColorPalette.brand.primary} size={Spacing.xl} name={'open-in-new'} />
            </TouchableOpacity>
          </View>
          <ThemedText>{t('Unified.AdditionalEvidence.LimitedAccessDescription')}</ThemedText>
        </View>
        <View style={{ marginTop: 'auto' }}>
          <Button
            title={t('Unified.AdditionalEvidence.ChooseID')}
            accessibilityLabel={t('Unified.AdditionalEvidence.ChooseID')}
            testID={testIdWithKey(t('Unified.AdditionalEvidence.ChooseID'))}
            onPress={() => {
              navigation.navigate(BCSCScreens.EvidenceTypeList)
            }}
            buttonType={ButtonType.Primary}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default DualIdentificationRequiredScreen
