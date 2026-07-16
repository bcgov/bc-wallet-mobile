import { InformationCard } from '@/bcsc-theme/components/InformationCard'
import { isBCServicesCardCredential } from '@/bcsc-theme/services/digitalServicesCardProvisioner'
import { useTheme } from '@bifold/core'
import { DidCommCredentialExchangeRecord } from '@credo-ts/didcomm'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

interface CredentialDetailsSubHeaderProps {
  credential?: DidCommCredentialExchangeRecord
}

/**
 * CredentialDetailsSubHeader is a component that renders components for specific credentials.
 *
 * Used as a child component of Bifold's CredentialDetails - injected using token `TOKENS.COMPONENT_CRED_SUBHEADER` in the container-imp.
 *
 * @param props - The props for the component, which include a credential of type DidCommCredentialExchangeRecord.
 * @returns A React element representing the CredentialDetailsSubHeader component, or null if the credential does not match the specified criteria.
 */
export const CredentialDetailsSubHeader = ({ credential }: CredentialDetailsSubHeaderProps) => {
  const { Spacing } = useTheme()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    BCSCInfoContainer: {
      padding: Spacing.lg,
    },
  })

  if (isBCServicesCardCredential(credential)) {
    // Show an information card for the Digital Services Card credential ie: "This does not replace your physical ID"
    return (
      <View style={styles.BCSCInfoContainer}>
        <InformationCard
          title={t('Credentials.NotAnIDInfoTitle')}
          subtext={t('Credentials.NotAnIDInfoDescription')}
          startIcon="information-outline"
        />
      </View>
    )
  }

  return null
}
