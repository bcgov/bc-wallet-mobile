import { FormattedServicePeriod } from '@/bcsc-theme/utils/serviceHoursFormatter'
import { useTranslation } from 'react-i18next'
import ServicePeriod from './ServicePeriod'

type ServicePeriodListProps = {
  items: FormattedServicePeriod[]
}
const ServicePeriodList = ({ items }: ServicePeriodListProps) => {
  const { t } = useTranslation()
  if (!items.length) {
    return t('BCSC.VideoCall.DefaultHours')
  }
  return (
    <>
      {items.map((item) => (
        <ServicePeriod servicePeriod={item} key={`${item}`} />
      ))}
    </>
  )
}

export default ServicePeriodList
