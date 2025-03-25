export const autoDisableRemoteLoggingIntervalInMinutes = 60
export const surveyMonkeyUrl = 'https://www.surveymonkey.com/r/7BMHJL8'
export const surveyMonkeyExitUrl = 'https://www.surveymonkey.com/survey-thanks'
export const hitSlop = { top: 44, bottom: 44, left: 44, right: 44 }
interface AttestationRestrictionEnvironment {
  credDefIDs: readonly string[]
  invitationUrl: string
}

export const AttestationRestrictions: { [key: string]: AttestationRestrictionEnvironment } = {
  Development: {
    credDefIDs: ['NXp6XcGeCR2MviWuY51Dva:3:CL:33557:bcwallet', 'NXp6XcGeCR2MviWuY51Dva:3:CL:33557:bcwallet_dev_v2'],
    invitationUrl:
      'https://traction-acapy-dev.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJodHRwczovL2RpZGNvbW0ub3JnL2Nvbm5lY3Rpb25zLzEuMC9pbnZpdGF0aW9uIiwgIkBpZCI6ICI0OGRkNzViNi0wMGI4LTQwZGItOTYxNy01MWIwNDZhZDI0MmEiLCAibGFiZWwiOiAiQkNBdHRlc3RhdGlvblNlcnZpY2VfREVWIiwgInJlY2lwaWVudEtleXMiOiBbIkVjZ0Q5VzRTVGVxa21zU1pOWUpBUEdRV2Y0d25IRFR5U01UUFJDdHpYRUVaIl0sICJzZXJ2aWNlRW5kcG9pbnQiOiAiaHR0cHM6Ly90cmFjdGlvbi1hY2FweS1kZXYuYXBwcy5zaWx2ZXIuZGV2b3BzLmdvdi5iYy5jYSIsICJpbWFnZVVybCI6ICJodHRwOi8vZXhhbXBsZS5jb20vIn0=',
  },
  Test: {
    credDefIDs: ['RycQpZ9b4NaXuT5ZGjXkUE:3:CL:120:bcwallet', 'RycQpZ9b4NaXuT5ZGjXkUE:3:CL:120:bcwallet_test_v2'],
    invitationUrl:
      'https://traction-acapy-test.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJodHRwczovL2RpZGNvbW0ub3JnL2Nvbm5lY3Rpb25zLzEuMC9pbnZpdGF0aW9uIiwgIkBpZCI6ICJkYzc1YTExMy1iZGM5LTRmNGEtYjM1YS04NTIyNzQ1ZjdkOTEiLCAibGFiZWwiOiAiQkNBdHRlc3RhdGlvblNlcnZpY2UiLCAicmVjaXBpZW50S2V5cyI6IFsiOVRmYm45c2drYlZvdGNQaWpSYm1oeEVuZnVteWNvVVl0ZHJ5dWpiN242cHEiXSwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL3RyYWN0aW9uLWFjYXB5LXRlc3QuYXBwcy5zaWx2ZXIuZGV2b3BzLmdvdi5iYy5jYSJ9',
  },
  Production: {
    credDefIDs: ['XqaRXJt4sXE6TRpfGpVbGw:3:CL:655:bcwallet'],
    invitationUrl:
      'https://traction-acapy-prod.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJodHRwczovL2RpZGNvbW0ub3JnL2Nvbm5lY3Rpb25zLzEuMC9pbnZpdGF0aW9uIiwgIkBpZCI6ICI0NjhkODE1ZC04OWY3LTQ4MGYtOGE1Yy1kNDllMjYyMjg4YTkiLCAibGFiZWwiOiAiQkNBdHRlc3RhdGlvblNlcnZpY2UiLCAicmVjaXBpZW50S2V5cyI6IFsiQ2pKbTkzVnRrcURSRTNROTVUeXpGN2lhNVRCdlJrVTU4MWNHZXZYU0FHaWoiXSwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL3RyYWN0aW9uLWFjYXB5LXByb2QuYXBwcy5zaWx2ZXIuZGV2b3BzLmdvdi5iYy5jYSJ9',
  },
} as const

export const appleAppStoreUrl = 'https://apps.apple.com/ca/app/bc-wallet/id1587380443'
export const googlePlayStoreUrl = 'https://play.google.com/store/apps/details?id=ca.bc.gov.BCWallet&hl=en-CA'
