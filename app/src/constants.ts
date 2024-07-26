import { credDefIdFromRestrictions } from '@hyperledger/aries-bifold-core/lib/typescript/App/utils/helpers'
import { invert } from 'react-native-svg/lib/typescript/elements/Shape'

export const autoDisableRemoteLoggingIntervalInMinutes = 60
export const surveyMonkeyUrl = 'https://www.surveymonkey.com/r/7BMHJL8'
export const surveyMonkeyExitUrl = 'https://www.surveymonkey.com/survey-thanks'
export const hitSlop = { top: 44, bottom: 44, left: 44, right: 44 }
export const AttestationRestrictions = {
  Development: {
    credDefIDs: ['NXp6XcGeCR2MviWuY51Dva:3:CL:33557:bcwallet', 'NXp6XcGeCR2MviWuY51Dva:3:CL:33557:bcwallet_dev_v2'],
    invitationUrl:
      'https://traction-acapy-dev.apps.silver.devops.gov.bc.ca?c_i=eyJAdHlwZSI6ICJodHRwczovL2RpZGNvbW0ub3JnL2Nvbm5lY3Rpb25zLzEuMC9pbnZpdGF0aW9uIiwgIkBpZCI6ICI5NDc5MTk2Yi01NmY5LTRiYmItYTFmOC0xYTQzZGVlNzcyOGIiLCAibGFiZWwiOiAiQkNBdHRlc3RhdGlvblNlcnZpY2UiLCAicmVjaXBpZW50S2V5cyI6IFsiRXNiWkxWUERrSFNMTUtUS3BYZkZLQ3hqcGFvb2ZVa1VHNUIxdTQ5b0JYRlYiXSwgInNlcnZpY2VFbmRwb2ludCI6ICJodHRwczovL3RyYWN0aW9uLWFjYXB5LWRldi5hcHBzLnNpbHZlci5kZXZvcHMuZ292LmJjLmNhIn0=',
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
