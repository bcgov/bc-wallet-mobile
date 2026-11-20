import type { VerificationPrompt, VerificationStatusResponseData } from '@/bcsc-theme/api/hooks/useEvidenceApi'
import {
  interpretVerificationStatus,
  isDecidedVerificationStatus,
  UNKNOWN_VERIFICATION_STATUS,
} from '@/bcsc-theme/utils/verification-status'
import { VerificationRequestStatus } from '@/constants'
import type { NonBCSCUserMetadata, ResidentialAddressDraft } from '@/store'
import type { PhotoMetadata } from 'react-native-bcsc-core'
import type { BCSCSlice } from './context'

export interface SessionState {
  stateLoaded: boolean // true once open() returns ok; read by providers above StorageGate
  didAuthenticate: boolean
  // Hydrate has run for this unlock
  isHydrated: boolean
  walletKey?: string
  // Name and address for a non-BCSC verification. Rebuilt from the authorization request on unlock; the
  // request keeps a copy, so clearing this one (once setup completes) leaves the record alone
  userMetadata?: NonBCSCUserMetadata
  residentialAddressDraft?: ResidentialAddressDraft
  inVerifyFlow: boolean
  // Set from the credential record when the user unlocks, and by the event-reason system check
  credentialDeactivated: boolean
  verificationRequestSha?: string
  verificationRequestStatus?: VerificationRequestStatus
  verificationRequestStatusMessage?: string
  verificationVideoSubmittedAt?: Date
  // Captured media: cleared on every launch today, so it never left memory in practice
  photoMetadata?: PhotoMetadata
  photoPath?: string
  videoPath?: string
  videoThumbnailPath?: string
  videoDuration?: number
  prompts?: VerificationPrompt[]
}

export const INITIAL_SESSION: SessionState = {
  isHydrated: false,
  stateLoaded: false,
  didAuthenticate: false,
  inVerifyFlow: false,
  credentialDeactivated: false,
}

type StatusReceived = Partial<Pick<VerificationStatusResponseData, 'status' | 'status_message'>>

// The reducer's VERIFICATION_STATUS_RECEIVED rule, unchanged
export const applyVerificationStatusReceived = (
  session: SessionState,
  received: StatusReceived
): Partial<SessionState> | undefined => {
  const verificationRequestStatus = interpretVerificationStatus(received.status)
  // Never store an unrecognised status; the caller asks the token endpoint instead
  if (verificationRequestStatus === UNKNOWN_VERIFICATION_STATUS) {
    return undefined
  }
  // A pending answer fetched before a push landed must not replace the decision. A change of request
  // ID clears the status, so a decision still held here belongs to the current request.
  if (
    verificationRequestStatus === VerificationRequestStatus.PENDING &&
    isDecidedVerificationStatus(session.verificationRequestStatus)
  ) {
    return undefined
  }
  // Only the cancelled banner shows the message
  const verificationRequestStatusMessage =
    verificationRequestStatus === VerificationRequestStatus.CANCELLED ? received.status_message : undefined
  if (
    verificationRequestStatus === session.verificationRequestStatus &&
    verificationRequestStatusMessage === session.verificationRequestStatusMessage
  ) {
    return undefined
  }
  return { verificationRequestStatus, verificationRequestStatusMessage }
}

// Memory only: no persisted keys, so it starts from INITIAL_SESSION on every launch and after a wipe
export interface SessionSlice {
  session: SessionState & {
    update(patch: Partial<SessionState>): void
    setStateLoaded(stateLoaded: boolean): void
    setDidAuthenticate(didAuthenticate: boolean): void
    setWalletKey(walletKey: string | undefined): void
    setUserMetadata(userMetadata: NonBCSCUserMetadata | undefined): void
    // A draft is a pending edit of userMetadata.address, so it's dropped while there's no userMetadata. The
    // address screen writes its draft as it unmounts, which a lock or reset causes after clearing the session.
    setResidentialAddressDraft(draft: ResidentialAddressDraft | undefined): void
    // The two facts used to share one saved status, so each write replaced the other; kept until
    // deactivation is allowed to outlive the verify flow (#5008)
    setInVerifyFlow(inVerifyFlow: boolean): void
    verificationStatusReceived(received: StatusReceived): void
    clearVerificationStatus(): void
    clearMedia(): void
    // Lock and logout: everything that belongs to the signed-in session
    clearSignedIn(): void
  }
}

export const createSessionSlice: BCSCSlice<SessionSlice> = (set, get) => {
  const update = (patch: Partial<SessionState>) => set((s) => ({ session: { ...s.session, ...patch } }))
  return {
    session: {
      ...INITIAL_SESSION,
      update,
      setStateLoaded: (stateLoaded) => update({ stateLoaded }),
      setDidAuthenticate: (didAuthenticate) => update({ didAuthenticate }),
      setWalletKey: (walletKey) => update({ walletKey }),
      setUserMetadata: (userMetadata) => update({ userMetadata }),
      setResidentialAddressDraft: (draft) =>
        update({ residentialAddressDraft: get().session.userMetadata ? draft : undefined }),
      setInVerifyFlow: (inVerifyFlow) => update({ inVerifyFlow }),
      verificationStatusReceived: (received) => {
        const patch = applyVerificationStatusReceived(get().session, received)
        if (patch) {
          update(patch)
        }
      },
      clearVerificationStatus: () =>
        update({ verificationRequestStatus: undefined, verificationRequestStatusMessage: undefined }),
      clearMedia: () =>
        update({
          photoMetadata: undefined,
          photoPath: undefined,
          videoPath: undefined,
          videoThumbnailPath: undefined,
          videoDuration: undefined,
          prompts: undefined,
        }),
      clearSignedIn: () =>
        update({
          isHydrated: false,
          walletKey: undefined,
          userMetadata: undefined,
          residentialAddressDraft: undefined,
          inVerifyFlow: false,
          credentialDeactivated: false,
          verificationRequestSha: undefined,
          verificationRequestStatus: undefined,
          verificationRequestStatusMessage: undefined,
          verificationVideoSubmittedAt: undefined,
        }),
    },
  }
}
