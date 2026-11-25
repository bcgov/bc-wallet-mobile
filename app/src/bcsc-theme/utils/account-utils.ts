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

  const firstName = account.firstName?.trim()
  const middleNames = account.middleNames?.trim()
  const lastName = account.lastName?.trim()

  if (lastName) {
    formattedNameParts.push(lastName)
  }

  if (firstName) {
    formattedNameParts.push(firstName)
  }

  if (middleNames) {
    formattedNameParts.push(middleNames)
  }

  if (formattedNameParts.length > 1 && lastName) {
    formattedNameParts[0] += ','
  }

  return formattedNameParts.join(' ')
}

/**
 * Name parts as found on an IdToken (snake_case, unlike the camelCase account
 * shape used by {@link formatAccountName}).
 */
export interface TokenNameParts {
  given_name?: string
  family_name?: string
}

/**
 * Short display name / default nickname rule: given_name, falling back to
 * family_name (mononyms are stored in family_name). Empty string if neither
 * is present.
 *
 * @example
 *  getShortDisplayName({ given_name: 'Combo', family_name: 'RC0000080' }) // 'Combo'
 *  getShortDisplayName({ family_name: 'RC0000080' }) // 'RC0000080' (mononym)
 */
export const getShortDisplayName = (name: TokenNameParts): string =>
  name.given_name?.trim() || name.family_name?.trim() || ''

/**
 * Mononym-safe full name: joins the non-empty parts of given_name and
 * family_name. Avoids the literal "undefined" that `${given_name} ${family_name}`
 * would produce when given_name is absent (mononym accounts).
 *
 * @example
 *  getFullDisplayName({ given_name: 'Jamie', family_name: 'Doe' }) // 'Jamie Doe'
 *  getFullDisplayName({ family_name: 'Doe' }) // 'Doe' (mononym)
 */
export const getFullDisplayName = (name: TokenNameParts): string =>
  [name.given_name?.trim(), name.family_name?.trim()].filter(Boolean).join(' ')
