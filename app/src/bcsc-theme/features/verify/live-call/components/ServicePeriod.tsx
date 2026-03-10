import { FormattedServicePeriod } from '@/bcsc-theme/utils/service-hours-formatter'
import { testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { View } from 'react-native'

type ServicePeriodProps = {
  servicePeriod: FormattedServicePeriod
}

const ServicePeriod = ({ servicePeriod }: ServicePeriodProps) => {
  const { Spacing } = useTheme()
  return (
    <View style={{ flex: 1, marginBottom: Spacing.md }}>
      <ThemedText
        style={{ fontWeight: servicePeriod.isUnavailable ? 'bold' : 'normal' }}
        testID={testIdWithKey('ServicePeriodTitle')}
      >
        {servicePeriod.title}
      </ThemedText>
      {servicePeriod.hours && (
        <ThemedText testID={testIdWithKey('ServicePeriodHours')}>{servicePeriod.hours}</ThemedText>
      )}
      {servicePeriod.dateLine && (
        <ThemedText testID={testIdWithKey('ServicePeriodDate')}>{servicePeriod.dateLine}</ThemedText>
      )}
    </View>
  )
}

export default ServicePeriod
