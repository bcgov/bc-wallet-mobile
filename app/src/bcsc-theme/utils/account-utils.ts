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

/**
 * Formats an account name and supports mononyms
 *
 * @example
 *  const account = { firstName: 'Steve', middleNames: 'John', lastName: 'Brule' }
 *  const formattedName = formatAccountName(account)
 *  console.log(formattedName) // Output: "Brule, Steve John"
 *
 * @param account - The account object containing firstName, middleNames, and lastName
 * @returns The formatted account name as a string
 */
export const formatAccountName = (account: { firstName?: string; middleNames?: string; lastName?: string }): string => {
  const formattedNameParts: string[] = []

  if (account.lastName) {
    formattedNameParts.push(account.lastName.trim())
  }

  if (account.firstName) {
    formattedNameParts.push(account.firstName.trim())
  }

  if (account.middleNames) {
    formattedNameParts.push(account.middleNames.trim())
  }

  if (formattedNameParts.length > 1 && account.lastName) {
    formattedNameParts[0] = formattedNameParts[0] += ','
  }

  return formattedNameParts.join(' ')
}
