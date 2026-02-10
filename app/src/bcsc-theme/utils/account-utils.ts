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

/**
 * Determines if the V3 account nickname should me migrated.
 *
 * Note: We don't want to migrate if the selected nickname is '' (ie: user removed account).
 *
 * @param store - The current state of the app.
 * @param accountNickname - The nickname of the account to check for migration.
 * @returns A boolean indicating whether the account nickname should be migrated.
 */
export const shouldMigrateV3AccountNickname = (store: BCState, accountNickname?: string): accountNickname is string => {
  return Boolean(
    accountNickname &&
      (store.bcsc.selectedNickname !== '' || store.bcsc.selectedNickname !== null) &&
      !store.bcsc.nicknames.includes(accountNickname)
  )
}
