import { FormattedServicePeriod } from '@/bcsc-theme/utils/service-hours-formatter'
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
    return <ThemedText testID={testIdWithKey('ServiceHours')}>{t('BCSC.VideoCall.DefaultHours')}</ThemedText>
  }
  return (
    <View testID={testIdWithKey('ServicePeriodList')}>
      {items.map((item) => (
        <ServicePeriod servicePeriod={item} key={`${JSON.stringify(item)}`} />
      ))}
    </View>
  )
}

export default ServicePeriodList
