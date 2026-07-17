import { InformationCard } from '@/bcsc-theme/components/InformationCard'
import { DIGITAL_SERVICES_CARD_CREDENTIAL_DEFINITION_IDS } from '@/constants'
import { useTheme } from '@bifold/core'
import { DidCommCredentialExchangeRecord } from '@credo-ts/didcomm'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { hasCredentialDefinitionId } from './credential-utils'

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
    infoContainer: {
      padding: Spacing.lg,
    },
  })

  if (hasCredentialDefinitionId(credential, DIGITAL_SERVICES_CARD_CREDENTIAL_DEFINITION_IDS)) {
    // Show an information card for the Digital Services Card credential ie: "This does not replace your physical ID"
    return (
      <View style={styles.infoContainer}>
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
