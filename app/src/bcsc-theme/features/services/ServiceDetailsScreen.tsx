import { BCSCRootStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { ThemedText, useTheme } from '@bifold/core'
import { StackScreenProps } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

type ServiceDetailsScreenProps = StackScreenProps<BCSCRootStackParams, BCSCScreens.ServiceDetailsScreen>

/**
 * Renders the service details screen component, which displays information about a specific service.
 *
 * @returns {*} {JSX.Element} The service screen component or null if not implemented.
 */
export const ServiceDetailsScreen: React.FC<ServiceDetailsScreenProps> = (props: ServiceDetailsScreenProps) => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()

  const styles = StyleSheet.create({
    screenContainer: {
      flex: 1,
      padding: Spacing.lg,
    },
  })

  return (
    <View style={styles.screenContainer}>
      <ThemedText>{props.route.params.service.client_name}</ThemedText>
      <ThemedText>{t('Services.ServiceLoginInstructions')}</ThemedText>
      <ThemedText>{t('Services.ServiceLoginProof')}</ThemedText>
      <ThemedText>{t('Services.ServiceGoto')}</ThemedText>
      <ThemedText>{t('Services.ServicePreferComputer')}</ThemedText>
      <ThemedText>{t('Services.ServicePreferComputerHelp')}</ThemedText>
    </View>
  )
}
