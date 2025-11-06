import { PrivacyPolicyContent } from '../onboarding/components/PrivacyPolicyContent'

/**
 * Privacy Policy screen component that informs users about the app's privacy practices,
 * to be shown in the Settings section of the app with no continue button.
 *
 * @returns {*} {JSX.Element} The SettingsPrivacyPolicyScreen component.
 */
export const SettingsPrivacyPolicyScreen: React.FC = (): JSX.Element => {
  return <PrivacyPolicyContent />
}
