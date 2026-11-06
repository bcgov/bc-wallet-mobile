import { BCSC_PROD_BUNDLE_ID } from '@/constants'
import { IASEnvironment } from '@/utils/environment'

interface EnvironmentFacts {
  bundleId: string
  selectedEnvironment: IASEnvironment | undefined
  buildEnvironmentName: string | undefined
}

export function getActiveEnvironment(facts: EnvironmentFacts): IASEnvironment {
  if (facts.bundleId === BCSC_PROD_BUNDLE_ID) {
    return IASEnvironment.PROD
  }

  if (facts.selectedEnvironment) {
    return facts.selectedEnvironment
  }

  const buildEnvironment = getEnvironmentByName(facts.buildEnvironmentName)

  if (buildEnvironment) {
    return buildEnvironment
  }

  return IASEnvironment.PROD
}

function getEnvironmentByName(name?: string): IASEnvironment | null {
  if (!name) {
    return null
  }

  const environmentName = name.toUpperCase()

  if (Object.keys(IASEnvironment).includes(environmentName)) {
    return IASEnvironment[environmentName as keyof typeof IASEnvironment]
  }

  return null
}
