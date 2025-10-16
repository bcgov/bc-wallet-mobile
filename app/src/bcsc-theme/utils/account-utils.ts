import { BCState } from '@/store'

// Helper function to get the current selected nickname
export const getSelectedNickname = (state: BCState): string | undefined => {
  return state.bcsc.nicknames[state.bcsc.selectedAccountIndex]
}
