import { formStringLengths } from '@/constants'
import { BCState } from '@/store'

export const getNicknameValidationErrorKey = (_state: BCState, nickname: string): string | null => {
  if (nickname.length < formStringLengths.minimumLength) {
    return 'BCSC.NicknameAccount.EmptyNameTitle'
  }

  if (nickname.length > formStringLengths.maximumLength) {
    return 'BCSC.NicknameAccount.CharCountTitle'
  }

  return null
}
