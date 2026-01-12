import BulletPoint from '@/bcsc-theme/components/BulletPoint'
import { CONTACT_US_GOVERNMENT_WEBSITE_URL } from '@/constants'
import { Link, ScreenWrapper, ThemedText, useTheme } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { Linking } from 'react-native'

/**
 * Contact us screen
 * Pure content component with no navigation dependencies.
 */
export const ContactUsScreen = (): JSX.Element => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()

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
    <ScreenWrapper>
      <ThemedText variant={'headingThree'} style={{ marginBottom: Spacing.xl }}>
        {t('BCSC.ContactUs.Title')}
      </ThemedText>
      <ThemedText variant={'bold'} style={{ marginBottom: Spacing.md }}>
        {t('BCSC.ContactUs.HoursOfServiceTitle')}
      </ThemedText>
      <ThemedText>{t('BCSC.ContactUs.HoursOfServiceDescription1')}</ThemedText>
      <ThemedText style={{ marginBottom: Spacing.md }}>{t('BCSC.ContactUs.HoursOfServiceDescription2')}</ThemedText>
      <ThemedText>{t('BCSC.ContactUs.TollFreeLabel')}</ThemedText>
      <Link
        style={{ marginBottom: Spacing.md }}
        linkText={t('BCSC.ContactUs.TollFreeNumber')}
        onPress={onPressTollFree}
      />
      <ThemedText>{t('BCSC.ContactUs.LowerMainlandLabel')}</ThemedText>
      <Link
        style={{ marginBottom: Spacing.xl }}
        linkText={t('BCSC.ContactUs.LowerMainlandNumber')}
        onPress={onPressLowerMainland}
      />
      <ThemedText variant={'bold'} style={{ marginBottom: Spacing.md }}>
        {t('BCSC.ContactUs.OtherContactsTitle')}
      </ThemedText>
      <ThemedText style={{ marginBottom: Spacing.md }}>
        {t('BCSC.ContactUs.VisitThe')}{' '}
        <Link linkText={t('BCSC.ContactUs.GovernmentWebsiteText')} onPress={onPressGovernmentWebsite} />{' '}
        {t('BCSC.ContactUs.ToFindWhoToContact')}
      </ThemedText>
      <BulletPoint pointsText={t('BCSC.ContactUs.BulletPoint1')} />
      <BulletPoint pointsText={t('BCSC.ContactUs.BulletPoint2')} />
      <BulletPoint pointsText={t('BCSC.ContactUs.BulletPoint3')} />
      <BulletPoint pointsText={t('BCSC.ContactUs.BulletPoint4')} />
    </ScreenWrapper>
  )
}
