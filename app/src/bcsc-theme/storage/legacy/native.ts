import type {
  AccountFlags,
  CredentialInfo,
  EvidenceMetadata,
  NativeAccount,
  NativeAuthorizationRequest,
  NativeLegacyRecord,
  NativeSavedService,
} from 'react-native-bcsc-core'

export type LegacyRecord<T> =
  | { status: 'ok'; value: T }
  | { status: 'absent' }
  | { status: 'locked' }
  | { status: 'unreadable'; reason: string }

export interface LegacyTokens {
  access?: string
  refresh?: string
  registration?: string
}

// One normalized shape per record, as bcsc-core's readLegacyRecord gives it (the getters' shapes)
export interface LegacyValues {
  account: NativeAccount
  tokens: LegacyTokens
  credential: CredentialInfo
  authorizationRequest: NativeAuthorizationRequest
  accountFlags: AccountFlags
  evidence: EvidenceMetadata[]
  savedServices: NativeSavedService[]
}
export type LegacyRecordName = keyof LegacyValues
export type LegacySnapshot = { [N in LegacyRecordName]: LegacyRecord<LegacyValues[N]> }

export const LEGACY_RECORD_NAMES: LegacyRecordName[] = [
  'account',
  'tokens',
  'credential',
  'authorizationRequest',
  'accountFlags',
  'evidence',
  'savedServices',
]

export interface LegacyNativeReader {
  readLegacyRecord<N extends LegacyRecordName>(name: N): Promise<LegacyRecord<LegacyValues[N]>>
}

const reasonOf = (error: unknown) => (error instanceof Error ? error.name : 'unknown')

// The app's reader: bcsc-core's readLegacyRecord, which reads each record once and reports its status itself
export const createNativeRecordReader = (
  readLegacyRecord: (name: LegacyRecordName) => Promise<NativeLegacyRecord>
): LegacyNativeReader => ({
  readLegacyRecord: async <N extends LegacyRecordName>(name: N): Promise<LegacyRecord<LegacyValues[N]>> => {
    let record: NativeLegacyRecord
    try {
      record = await readLegacyRecord(name)
    } catch (error) {
      // Native never rejects; this is a missing method or a bridge failure
      return { status: 'unreadable', reason: reasonOf(error) }
    }
    switch (record.status) {
      case 'ok':
        if (record.value === undefined || record.value === null) {
          return { status: 'unreadable', reason: 'ok_without_value' }
        }
        return { status: 'ok', value: record.value as LegacyValues[N] }
      case 'absent':
        return { status: 'absent' }
      case 'locked':
        return { status: 'locked' }
      case 'unreadable':
        return { status: 'unreadable', reason: record.reason ?? 'unknown' }
      default:
        return { status: 'unreadable', reason: 'unknown_status' }
    }
  },
})

export const readLegacySnapshot = async (reader: LegacyNativeReader): Promise<LegacySnapshot> => {
  const records = await Promise.all(LEGACY_RECORD_NAMES.map((name) => reader.readLegacyRecord(name)))
  return Object.fromEntries(LEGACY_RECORD_NAMES.map((name, i) => [name, records[i]])) as LegacySnapshot
}
