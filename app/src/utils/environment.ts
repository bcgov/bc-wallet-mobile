import { ANALYTICS_APP_ID_PREFIX, Mode } from '@/constants'
import Config from 'react-native-config'

export interface IASEnvironment {
  name: string
  iasAgentInviteUrl: string
  iasPortalUrl: string
  appToAppUrl: string
  iasApiBaseUrl: string
  analyticsAppId: string
}

const getAnalyticsAppId = (domain: string): string => {
  return `${ANALYTICS_APP_ID_PREFIX}${domain}`
}

const createIASEnvironment = (config: {
  name: string
  subdomain: string
  agentInviteUrl: string | null
}): IASEnvironment => {
  return {
    name: `${config.name}`,
    iasAgentInviteUrl: config.agentInviteUrl ?? '',
    iasPortalUrl: `https://id${config.subdomain}.gov.bc.ca/issuer/v1/dids`,
    appToAppUrl: `ca.bc.gov.id${config.subdomain}.servicescard.v2://credentials/person/v1`,
    iasApiBaseUrl: `https://id${config.subdomain}.gov.bc.ca`,
    analyticsAppId: getAnalyticsAppId(config.subdomain || 'prod'),
  }
}

// TODO (MD): Add IASAgentInviteUrls for all environments once known
export const IASEnvironment = {
  PROD: createIASEnvironment({
    name: 'Prod',
    subdomain: '', // no subdomain for prod environment
    agentInviteUrl:
      'https://idim-agent.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJkaWQ6c292OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiNWY2NTYzYWItNzEzYi00YjM5LWI5MTUtNjY2YjJjNDc4M2U2IiwgImxhYmVsIjogIlNlcnZpY2UgQkMiLCAicmVjaXBpZW50S2V5cyI6IFsiN2l2WVNuN3NocW8xSkZyYm1FRnVNQThMNDhaVnh2TnpwVkN6cERSTHE4UmoiXSwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL2lkaW0tYWdlbnQuYXBwcy5zaWx2ZXIuZGV2b3BzLmdvdi5iYy5jYSIsICJpbWFnZVVybCI6ICJodHRwczovL2lkLmdvdi5iYy5jYS9zdGF0aWMvR292LTIuMC9pbWFnZXMvZmF2aWNvbi5pY28ifQ==',
  }),
  PREPROD: createIASEnvironment({
    name: 'Preprod',
    subdomain: 'preprod',
    agentInviteUrl: null,
  }),
  QA: createIASEnvironment({
    name: 'QA',
    subdomain: 'qa',
    agentInviteUrl: null,
  }),
  TEST: createIASEnvironment({
    name: 'Test',
    subdomain: 'test',
    agentInviteUrl: null,
  }),
  SIT: createIASEnvironment({
    name: 'Sit',
    subdomain: 'sit',
    agentInviteUrl:
      'https://idim-sit-agent-dev.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJkaWQ6c292OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiZDFkMDk5MDQtN2ZlOC00YzlkLTk4YjUtZmNmYmEwODkzZTAzIiwgImxhYmVsIjogIlNlcnZpY2UgQkMgKFNJVCkiLCAicmVjaXBpZW50S2V5cyI6IFsiNVgzblBoZkVIOU4zb05kcHdqdUdjM0ZhVzNQbmhiY05QemRGbzFzS010dEoiXSwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL2lkaW0tc2l0LWFnZW50LWRldi5hcHBzLnNpbHZlci5kZXZvcHMuZ292LmJjLmNhIiwgImltYWdlVXJsIjogImh0dHBzOi8vaWQuZ292LmJjLmNhL3N0YXRpYy9Hb3YtMi4wL2ltYWdlcy9mYXZpY29uLmljbyJ9',
  }),
  DEV: createIASEnvironment({
    name: 'Dev',
    subdomain: 'dev',
    agentInviteUrl:
      'https://idim-agent-dev.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJkaWQ6c292OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiY2U1NWFiZDctNWRmYy00YjQ5LWExODYtOWUzMzQ1ZjEyZThkIiwgImxhYmVsIjogIlNlcnZpY2UgQkMgKERldikiLCAicmVjaXBpZW50S2V5cyI6IFsiM0I0bnlDMVg4R1E0M0NLczR4clVXOFdnbWE5MUpMem50cVVYdlo0UjQ4TXQiXSwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL2lkaW0tYWdlbnQtZGV2LmFwcHMuc2lsdmVyLmRldm9wcy5nb3YuYmMuY2EiLCAiaW1hZ2VVcmwiOiAiaHR0cHM6Ly9pZC5nb3YuYmMuY2Evc3RhdGljL0dvdi0yLjAvaW1hZ2VzL2Zhdmljb24uaWNvIn0=',
  }),
  DEV2: createIASEnvironment({
    name: 'Dev2',
    subdomain: 'dev2',
    agentInviteUrl: null,
  }),
}

export const getInitialEnvironment = (): IASEnvironment => {
  const envName = Config.DEFAULT_ENVIRONMENT?.toUpperCase()
  if (envName && envName in IASEnvironment) {
    return IASEnvironment[envName as keyof typeof IASEnvironment]
  }

  // Fallback: local dev builds for BCSC use SIT
  if (__DEV__ && Config.BUILD_TARGET === Mode.BCSC) {
    return IASEnvironment.SIT
  }

  return IASEnvironment.PROD
}
