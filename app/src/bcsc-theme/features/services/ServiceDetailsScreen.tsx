import { BCSCRootStackParams, BCSCScreens } from '@/bcsc-theme/types/navigators'
import { ThemedText } from '@bifold/core'
import { StackScreenProps } from '@react-navigation/stack'
import { View } from 'react-native'

type ServiceDetailsScreenProps = StackScreenProps<BCSCRootStackParams, BCSCScreens.ServiceDetailsScreen>

/**
 * Renders the service details screen component, which displays information about a specific service.
 *
 * @returns {*} {JSX.Element} The service screen component or null if not implemented.
 */
export const ServiceDetailsScreen: React.FC<ServiceDetailsScreenProps> = (props: ServiceDetailsScreenProps) => {
  return (
    <View>
      <ThemedText>{props.route.params.service.client_name}</ThemedText>
    </View>
  )
}
