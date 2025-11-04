import BulletPoint from '@/bcsc-theme/components/BulletPoint'
import { CONTACT_US_GOVERNMENT_WEBSITE_URL } from '@/constants'
import { Link, ThemedText, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { Linking, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

/**
 * Shared contact us content component that can be used across different navigation stacks.
 * Pure content component with no navigation dependencies.
 */
export const ContactUsContent = (): JSX.Element => {
  const { ColorPalette, Spacing } = useTheme()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: ColorPalette.brand.primaryBackground,
      padding: Spacing.md,
    },
  })

  const onPressTollFree = () => {
    Linking.openURL('tel:1-888-356-2741')
  }

  const onPressLowerMainland = () => {
    Linking.openURL('tel:604-660-2355')
  }

  const onPressGovernmentWebsite = () => {
    Linking.openURL(CONTACT_US_GOVERNMENT_WEBSITE_URL)
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.xl }}>
          {t('Unified.ContactUs.Title')}
        </ThemedText>
        <ThemedText variant={'bold'} style={{ marginBottom: Spacing.md }}>
          {t('Unified.ContactUs.HoursOfServiceTitle')}
        </ThemedText>
        <ThemedText>{t('Unified.ContactUs.HoursOfServiceDescription1')}</ThemedText>
        <ThemedText style={{ marginBottom: Spacing.md }}>
          {t('Unified.ContactUs.HoursOfServiceDescription2')}
        </ThemedText>
        <ThemedText>{t('Unified.ContactUs.TollFreeLabel')}</ThemedText>
        <Link
          style={{ marginBottom: Spacing.md }}
          linkText={t('Unified.ContactUs.TollFreeNumber')}
          onPress={onPressTollFree}
        />
        <ThemedText>{t('Unified.ContactUs.LowerMainlandLabel')}</ThemedText>
        <Link
          style={{ marginBottom: Spacing.xl }}
          linkText={t('Unified.ContactUs.LowerMainlandNumber')}
          onPress={onPressLowerMainland}
        />
        <ThemedText variant={'bold'} style={{ marginBottom: Spacing.md }}>
          {t('Unified.ContactUs.OtherContactsTitle')}
        </ThemedText>
        <ThemedText style={{ marginBottom: Spacing.md }}>
          {t('Unified.ContactUs.VisitThe')}{' '}
          <Link linkText={t('Unified.ContactUs.GovernmentWebsiteText')} onPress={onPressGovernmentWebsite} />{' '}
          {t('Unified.ContactUs.ToFindWhoToContact')}
        </ThemedText>
        <BulletPoint pointsText={t('Unified.ContactUs.BulletPoint1')} />
        <BulletPoint pointsText={t('Unified.ContactUs.BulletPoint2')} />
        <BulletPoint pointsText={t('Unified.ContactUs.BulletPoint3')} />
        <BulletPoint pointsText={t('Unified.ContactUs.BulletPoint4')} />
      </ScrollView>
    </SafeAreaView>
  )
}
