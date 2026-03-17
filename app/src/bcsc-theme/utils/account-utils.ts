import { formStringLengths } from '@/constants'
import { BCState } from '@/store'

// Helper function to check if a nickname exists
export const hasNickname = (state: BCState, nickname: string): boolean => {
  return state.bcsc.nicknames.includes(nickname)
}

export const getNicknameValidationErrorKey = (state: BCState, nickname: string): string | null => {
  if (nickname.length < formStringLengths.minimumLength) {
    return 'BCSC.NicknameAccount.EmptyNameTitle'
  }

  if (nickname.length > formStringLengths.maximumLength) {
    return 'BCSC.NicknameAccount.CharCountTitle'
  }

  if (hasNickname(state, nickname)) {
    return 'BCSC.NicknameAccount.NameAlreadyExists'
  }

  return null
}
