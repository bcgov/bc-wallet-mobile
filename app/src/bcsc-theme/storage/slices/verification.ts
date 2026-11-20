import type { BCSCCardProcess, EvidenceMetadata } from 'react-native-bcsc-core'
import { z } from 'zod'
import { persistedKey } from '../engine/persisted-key'
import type { BCSCSlice, SliceContext } from './context'

const AddressSchema = z.object({
  streetAddress: z.string().optional(),
  locality: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
})

// The native authorization request, in its native shape until s2. Loose, so native fields survive a write.
export const RequestSchema = z.looseObject({
  issuer: z.string().optional(),
  clientID: z.string().optional(),
  deviceCode: z.string().optional(),
  userCode: z.string().optional(),
  birthdate: z.number().optional(), // epoch seconds
  csn: z.string().optional(),
  verifiedEmail: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  middleNames: z.string().optional(),
  address: AddressSchema.optional(),
  status: z.number().optional(),
  method: z.number().optional(),
  audience: z.string().optional(),
  scope: z.string().optional(),
  redirectURI: z.string().optional(),
  requestedAt: z.number().optional(),
  expiry: z.number().optional(), // epoch seconds
  authorizationExpiry: z.number().optional(),
  verificationOptions: z.string().optional(),
  verificationURIVideo: z.string().optional(),
  backCheckSubmittedDate: z.number().optional(),
  backCheckVerificationId: z.string().optional(),
  evidenceUploadURI: z.string().optional(),
})
export type VerificationRequest = z.infer<typeof RequestSchema>

export const FlagsSchema = z.object({
  isEmailVerified: z.boolean().optional(),
  userSkippedEmailVerification: z.boolean().optional(),
  emailAddress: z.string().optional(),
  temporaryEmailId: z.string().optional(),
  userSubmittedVerificationVideo: z.boolean().optional(),
})
export type VerificationFlags = z.infer<typeof FlagsSchema>

// EvidenceMetadata from bcsc-core, passed through as native holds it until s2. Only the outline is checked: a
// photo entry that failed a stricter check would make the whole record unreadable and stop the app opening.
export const EvidenceSchema = z.array(
  z.looseObject({
    evidenceType: z.looseObject({ evidence_type: z.string() }).optional(),
    metadata: z.array(z.looseObject({})),
    documentNumber: z.string().optional(),
  })
) as unknown as z.ZodType<EvidenceMetadata[]>
export type VerificationEvidence = EvidenceMetadata[]

// BCSCCardProcess's values, listed so the schema doesn't depend on the native module loading
export const CardProcessSchema = z.enum([
  'IDIM L3 Remote BCSC Photo Identity Verification',
  'IDIM L3 Remote BCSC Non-Photo Identity Verification',
  'IDIM L3 Remote Non-BCSC Identity Verification',
  'N/A',
]) as unknown as z.ZodType<BCSCCardProcess>

export const VERIFICATION_KEYS = {
  request: persistedKey({ key: 'verification/request', schema: RequestSchema, backend: 'encrypted' }),
  flags: persistedKey({ key: 'verification/flags', schema: FlagsSchema, backend: 'encrypted' }),
  evidence: persistedKey({ key: 'verification/evidence', schema: EvidenceSchema, backend: 'encrypted' }),
  cardProcess: persistedKey({ key: 'verification/cardProcess', schema: CardProcessSchema, backend: 'encrypted' }),
}

export interface VerificationSlice {
  verification: {
    request?: VerificationRequest
    flags?: VerificationFlags
    evidence?: VerificationEvidence
    cardProcess?: BCSCCardProcess
    updateRequest(patch: Partial<VerificationRequest>): Promise<void>
    clearRequest(): Promise<void>
    updateFlags(patch: Partial<VerificationFlags>): Promise<void>
    clearFlags(): Promise<void>
    setEvidence(evidence: VerificationEvidence): Promise<void>
    clearEvidence(): Promise<void>
    setCardProcess(cardProcess: BCSCCardProcess | undefined): Promise<void>
  }
}

export const createVerificationSlice =
  ({ persist }: SliceContext): BCSCSlice<VerificationSlice> =>
  () => ({
    verification: {
      updateRequest: (patch) => persist.update(VERIFICATION_KEYS.request, (request) => ({ ...request, ...patch })),
      clearRequest: () => persist.remove(VERIFICATION_KEYS.request),
      updateFlags: (patch) => persist.update(VERIFICATION_KEYS.flags, (flags) => ({ ...flags, ...patch })),
      clearFlags: () => persist.remove(VERIFICATION_KEYS.flags),
      setEvidence: (evidence) => persist.write(VERIFICATION_KEYS.evidence, evidence),
      clearEvidence: () => persist.remove(VERIFICATION_KEYS.evidence),
      setCardProcess: (cardProcess) =>
        cardProcess
          ? persist.write(VERIFICATION_KEYS.cardProcess, cardProcess)
          : persist.remove(VERIFICATION_KEYS.cardProcess),
    },
  })
