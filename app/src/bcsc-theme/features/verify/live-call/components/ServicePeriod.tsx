import { FormattedServicePeriod } from '@/bcsc-theme/utils/service-hours-formatter'
import { TestIds } from '@/test-ids/registry'
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
        testID={testIdWithKey(TestIds.verify.servicePeriods.titleStem + servicePeriod.title)}
      >
        {servicePeriod.title}
      </ThemedText>
      {servicePeriod.hours && (
        <ThemedText testID={testIdWithKey(TestIds.verify.servicePeriods.hoursStem + servicePeriod.hours)}>
          {servicePeriod.hours}
        </ThemedText>
      )}
      {servicePeriod.dateLine && (
        <ThemedText testID={testIdWithKey(TestIds.verify.servicePeriods.dateStem + servicePeriod.dateLine)}>
          {servicePeriod.dateLine}
        </ThemedText>
      )}
    </View>
  )
}

export default ServicePeriod
