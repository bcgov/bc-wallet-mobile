import { FormattedServicePeriod } from '@/bcsc-theme/utils/service-hours-formatter'
import { TestIds } from '@/test-ids/registry'
import { testIdWithKey, ThemedText } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import ServicePeriod from './ServicePeriod'

type ServicePeriodListProps = {
  items: FormattedServicePeriod[]
}
const ServicePeriodList = ({ items }: ServicePeriodListProps) => {
  const { t } = useTranslation()
  if (!items.length) {
    return (
      <ThemedText testID={testIdWithKey(TestIds.verify.servicePeriods.hours)}>
        {t('BCSC.VideoCall.DefaultHours')}
      </ThemedText>
    )
  }
  return (
    <View testID={testIdWithKey(TestIds.verify.servicePeriods.list)} style={{ alignSelf: 'stretch' }}>
      {items.map((item) => (
        <ServicePeriod servicePeriod={item} key={`${JSON.stringify(item)}`} />
      ))}
    </View>
  )
}

export default ServicePeriodList
