import type { AnyPersistedKey } from '../engine/persisted-key'
import { ACCOUNT_KEYS, type AccountSlice, createAccountSlice } from './account'
import { APP_KEY, type AppSlice, createAppSlice } from './app'
import { CACHES_KEYS, type CachesSlice, createCachesSlice } from './caches'
import { CONTACTS_KEY, type ContactsSlice, createContactsSlice } from './contacts'
import type { BCSCSlice, SliceContext } from './context'
import { createDeveloperSlice, DEVELOPER_KEY, type DeveloperSlice } from './developer'
import { createPreferencesSlice, PREFERENCES_KEY, type PreferencesSlice } from './preferences'
import { createSavedServicesSlice, SAVED_SERVICES_KEY, type SavedServicesSlice } from './saved-services'
import { createSessionSlice, type SessionSlice } from './session'
import { createVerificationSlice, VERIFICATION_KEYS, type VerificationSlice } from './verification'

export type BCSCStore = AppSlice &
  PreferencesSlice &
  DeveloperSlice &
  ContactsSlice &
  CachesSlice &
  AccountSlice &
  VerificationSlice &
  SavedServicesSlice &
  SessionSlice

export type SliceName = keyof BCSCStore

export const createSlices =
  (ctx: SliceContext): BCSCSlice<BCSCStore> =>
  (...a) => ({
    ...createAppSlice(ctx)(...a),
    ...createPreferencesSlice(ctx)(...a),
    ...createDeveloperSlice(ctx)(...a),
    ...createContactsSlice(ctx)(...a),
    ...createCachesSlice(ctx)(...a),
    ...createAccountSlice(ctx)(...a),
    ...createVerificationSlice(ctx)(...a),
    ...createSavedServicesSlice(ctx)(...a),
    ...createSessionSlice(...a),
  })

// Used by open(), wipe(), the key-placement check and the schema guard
export const PERSISTED_KEYS: AnyPersistedKey[] = [
  APP_KEY,
  PREFERENCES_KEY,
  DEVELOPER_KEY,
  CONTACTS_KEY,
  ...Object.values(CACHES_KEYS),
  ...Object.values(ACCOUNT_KEYS),
  ...Object.values(VERIFICATION_KEYS),
  SAVED_SERVICES_KEY,
] as AnyPersistedKey[]

export type { AccountSlice } from './account'
export type { AppSlice } from './app'
export type { CachesSlice } from './caches'
export type { ContactsSlice } from './contacts'
export type { DeveloperSlice } from './developer'
export type { PreferencesSlice } from './preferences'
export type { SavedServicesSlice } from './saved-services'
export type { SessionSlice } from './session'
export type { VerificationSlice } from './verification'
