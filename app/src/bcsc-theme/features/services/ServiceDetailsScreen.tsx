import { BCSCRootStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { Link, ThemedText, useTheme } from '@bifold/core'
import { StackScreenProps } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { Linking, StyleSheet, View } from 'react-native'

type ServiceDetailsScreenProps = StackScreenProps<BCSCRootStackParams, BCSCScreens.ServiceDetailsScreen>

/**
 * Renders the service details screen component, which displays information about a specific service.
 *
 * @returns {*} {JSX.Element} The service screen component or null if not implemented.
 */
export const ServiceDetailsScreen: React.FC<ServiceDetailsScreenProps> = (props: ServiceDetailsScreenProps) => {
  const { service } = props.route.params
  const { t } = useTranslation()
  const { Spacing, ColorPalette, TextTheme } = useTheme()

  const styles = StyleSheet.create({
    screenContainer: {
      flex: 1,
      padding: Spacing.lg,
      gap: Spacing.md * 2,
    },
    divider: {
      height: 1,
      backgroundColor: ColorPalette.grayscale.mediumGrey,
    },
    link: {
      color: ColorPalette.brand.primary,
    },
  })

  return (
    <View style={styles.screenContainer}>
      <ThemedText variant={'headingTwo'}>{service.client_name}</ThemedText>
      <ThemedText>{t('Services.ServiceLoginInstructions')}</ThemedText>
      <ThemedText>{t('Services.ServiceLoginProof')}</ThemedText>
      <Link
        linkText={`${t('Services.ServiceGoto')} ${service.client_name}`}
        onPress={() => Linking.openURL(service.client_uri)}
        style={styles.link}
      ></Link>
      <View style={styles.divider} />
      <View>
        <ThemedText variant={'bold'}>{t('Services.ServicePreferComputer')}</ThemedText>
        <ThemedText>{t('Services.ServicePreferComputerHelp')}</ThemedText>
        <Link
          linkText={service.client_uri}
          onPress={() => Linking.openURL(service.client_uri)}
          style={styles.link}
        ></Link>
      </View>
    </View>
  )
}
