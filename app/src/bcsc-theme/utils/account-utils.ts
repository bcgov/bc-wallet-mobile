import { BCState } from '@/store'

// Helper function to check if a nickname exists
export const hasNickname = (state: BCState, nickname: string): boolean => {
  return state.bcsc.nicknames.includes(nickname)
}
