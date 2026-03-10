import { FormattedServicePeriod } from '@/bcsc-theme/utils/service-hours-formatter'
import { ThemedText } from '@bifold/core'
import { useTranslation } from 'react-i18next'
import ServicePeriod from './ServicePeriod'

type ServicePeriodListProps = {
  items: FormattedServicePeriod[]
}
const ServicePeriodList = ({ items }: ServicePeriodListProps) => {
  const { t } = useTranslation()
  if (!items.length) {
    return <ThemedText>{t('BCSC.VideoCall.DefaultHours')}</ThemedText>
  }
  return (
    <>
      {items.map((item) => (
        <ServicePeriod servicePeriod={item} key={`${JSON.stringify(item)}`} />
      ))}
    </>
  )
}

export default ServicePeriodList
