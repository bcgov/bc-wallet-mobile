import { FormattedServicePeriod } from '@/bcsc-theme/utils/serviceHoursFormatter'
import { ThemedText } from '@bifold/core'

type ServicePeriodProps = {
  servicePeriod: FormattedServicePeriod
}

const ServicePeriod = ({ servicePeriod }: ServicePeriodProps) => {
  return (
    <>
      <ThemedText style={{ fontWeight: 'bold' }}>{servicePeriod.title}</ThemedText>
      {servicePeriod.hours ?? <ThemedText>{servicePeriod.hours}</ThemedText>}
      (servicePeriod.dateLine ?? (<ThemedText>{servicePeriod.dateLine}</ThemedText>))
    </>
  )
}

export default ServicePeriod
