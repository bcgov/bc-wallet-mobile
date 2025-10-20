import { BCState } from '@/store'

// Helper function to check if a nickname exists
export const hasNickname = (state: BCState, nickname: string): boolean => {
  const nicknames = state.bcsc.nicknames

  // Handle Set object (preferred)
  if (nicknames instanceof Set) {
    return nicknames.has(nickname)
  }

  // Handle array (fallback for compatibility)
  if (Array.isArray(nicknames)) {
    return (nicknames as string[]).includes(nickname)
  }

  // Handle object with values (fallback for serialized Set)
  if (nicknames && typeof nicknames === 'object') {
    return Object.values(nicknames).includes(nickname)
  }

  // Default to false if nicknames is not in expected format
  return false
}
