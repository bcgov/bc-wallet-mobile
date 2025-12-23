import { LoginChallengeResult } from 'react-native-bcsc-core'

/**
 * Represents a decoded and optionally verified BCSC login challenge
 */
export type BcscChallenge = {
  /** The original JWT string */
  jwt: string
  /** Decoded and verified challenge result */
  result: LoginChallengeResult
  /** Timestamp when the challenge was received */
  receivedAt: number
}

/**
 * Navigation event emitted when a challenge should be displayed
 */
export type ChallengeNavigationEvent = {
  screen: string
  params?: {
    challenge: BcscChallenge
  }
}

export type ChallengeNavigationListener = (event: ChallengeNavigationEvent) => void
export type PendingChallengeListener = (hasPending: boolean) => void
