import GenericCardImage from '@/bcsc-theme/components/GenericCardImage'
import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import BulletPointWithText from '@/components/BulletPointWithText'
import { Button, ButtonType, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { Linking, StyleSheet, TouchableOpacity, View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type AdditionalIdentificationRequiredScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.AdditionalIdentificationRequired>
}

const AdditionalIdentificationRequiredScreen: React.FC<AdditionalIdentificationRequiredScreenProps> = ({
  navigation,
}: AdditionalIdentificationRequiredScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()
  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: Spacing.lg,
    },
    controlsContainer: {
      margin: Spacing.md,
      marginTop: 'auto',
      position: 'relative',
    },
  })
  return (
    <SafeAreaView style={styles.pageContainer} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <GenericCardImage />
        <View style={{ marginBottom: Spacing.lg }}>
          <ThemedText variant={'headingFour'}>{t('Unified.AdditionalEvidence.PhotoRequired')}</ThemedText>
          <ThemedText>{t('Unified.AdditionalEvidence.PhotoRequiredDescription')}</ThemedText>
        </View>
        <View style={{ marginBottom: Spacing.lg }}>
          <ThemedText variant={'headingFour'}>{t('Unified.AdditionalEvidence.CheckYourID')}</ThemedText>
          <BulletPointWithText
            translationKey={t('Unified.AdditionalEvidence.CheckYourIDBullet1')}
            iconColor={ColorPalette.brand.icon}
          />
          <BulletPointWithText
            translationKey={t('Unified.AdditionalEvidence.CheckYourIDBullet2')}
            iconColor={ColorPalette.brand.icon}
            iconSize={Spacing.sm}
          />
          <BulletPointWithText
            translationKey={t('Unified.AdditionalEvidence.CheckYourIDBullet3')}
            iconColor={ColorPalette.brand.icon}
          />
        </View>
        <View style={{ marginBottom: Spacing.lg }}>
          <View style={{ flexDirection: 'row', alignContent: 'center', alignItems: 'center' }}>
            <ThemedText variant={'headingFour'}>{t('Unified.AdditionalEvidence.LimitedAccess')}</ThemedText>
            <TouchableOpacity onPress={() => Linking.openURL('https://id.gov.bc.ca/account/services')}>
              <Icon color={ColorPalette.brand.primary} size={Spacing.xl} name={'open-in-new'} />
            </TouchableOpacity>
          </View>
          <ThemedText>{t('Unified.AdditionalEvidence.LimitedAccessDescription')}</ThemedText>
        </View>
        <View style={{ marginTop: Spacing.md }}>
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

export default AdditionalIdentificationRequiredScreen
