import { LoadingScreen } from '@/bcsc-theme/contexts/BCSCLoadingContext'
import { purgeWalletStore } from '@/bcsc-theme/features/agent/services/agent-service'
import { SystemModal } from '@/bcsc-theme/features/modal/components/SystemModal'
import { storage, type OpenResult } from '@/bcsc-theme/storage'
import { runStartupTasks } from '@/bcsc-theme/storage/startup'
import { ledgerResolver } from '@/configs/ledgers/indy/ledgerResolver'
import { BCSC_APPLE_STORE_URL, BCSC_GOOGLE_PLAY_STORE_URL, WALLET_ID } from '@/constants'
import { useErrorAlert } from '@/contexts/ErrorAlertContext'
import { ensureAppError } from '@/errors/errorHandler'
import { AppEventCode } from '@/events/appEventCode'
import { TestIds } from '@/test-ids/registry'
import { openLink } from '@/utils/links'
import { appLogger } from '@/utils/logger'
import { generateReferenceCode } from '@/utils/reference-code'
import { testIdWithKey } from '@bifold/core'
import React, { PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppState, Platform } from 'react-native'
import Config from 'react-native-config'

type BlockedResult = Exclude<OpenResult, { status: 'ok' } | { status: 'locked' } | { status: 'newer-version' }>

const STORE_URL = Platform.OS === 'ios' ? BCSC_APPLE_STORE_URL : BCSC_GOOGLE_PLAY_STORE_URL

const StorageErrorScreen: React.FC<{ result: BlockedResult; onRetry: () => void }> = ({ result, onRetry }) => {
  const { t } = useTranslation()
  // One code per blocked launch, logged with the result so support can find it
  const referenceCode = useMemo(() => generateReferenceCode(), [])

  useEffect(() => {
    appLogger.error('storage blocked startup', { referenceCode, status: result.status })
  }, [referenceCode, result.status])

  return (
    <SystemModal
      iconName="error-outline"
      iconSize={75}
      headerText={t('BCSC.Storage.ErrorTitle')}
      contentText={[t('BCSC.Storage.ErrorDescription'), t('BCSC.Storage.ReferenceCode', { code: referenceCode })]}
      buttonText={t('BCSC.Storage.Retry')}
      onButtonPress={onRetry}
      edges={['top', 'bottom', 'left', 'right']}
      testID={testIdWithKey(TestIds.systemModal.storage.retry)}
    />
  )
}

const UpdateRequiredScreen: React.FC = () => {
  const { t } = useTranslation()
  return (
    <SystemModal
      iconName="system-update"
      iconSize={75}
      headerText={t('BCSC.Storage.UpdateTitle')}
      contentText={[t('BCSC.Storage.UpdateDescription')]}
      buttonText={t('BCSC.Storage.UpdateTitle')}
      onButtonPress={() => openLink(STORE_URL)}
      edges={['top', 'bottom', 'left', 'right']}
      testID={testIdWithKey(TestIds.systemModal.storage.update)}
    />
  )
}

// Nothing below reads storage until open() returns ok. Replaces loadState(dispatch) in RootStack.
// A blocked open is tried again quietly before the error screen: a native read can fail once and then succeed
// (the transient account null that account loading used to retry around, #3372)
const QUIET_RETRIES = 2
const QUIET_RETRY_DELAY_MS = 500

const isBlocked = (result: OpenResult): result is BlockedResult =>
  result.status !== 'ok' && result.status !== 'locked' && result.status !== 'newer-version'

// The wallet is deleted by its file, so no key is needed: the real one is unknown with the store unopened. Without
// this, the next wallet (with the new account's key) would fail to open over the old file, as factoryReset says.
const purgeWallet = () =>
  purgeWalletStore({
    ledgers: ledgerResolver.ledgers,
    walletSecret: { id: WALLET_ID, key: 'unused-for-deletion' },
    mediatorUrl: Config.MEDIATOR_URL ?? '',
    walletLabel: 'BC Wallet',
    enableProxy: false,
    proxyBaseUrl: Config.INDY_VDR_PROXY_URL,
    logger: appLogger,
  })

// What a blocked result says, for the report: statuses, reasons and key names only
const describeBlocked = (result: BlockedResult) => {
  switch (result.status) {
    case 'not-ready':
      return `not-ready: ${result.reason}`
    case 'migration-failed':
      return `migration-failed: ${result.step}`
    case 'unreadable':
      return `unreadable: ${result.keys.join(',')}`
  }
}

export const StorageGate: React.FC<PropsWithChildren> = ({ children }) => {
  const { t } = useTranslation()
  const { emitErrorModal } = useErrorAlert()
  const [result, setResult] = useState<OpenResult>()
  const quietRetries = useRef(0)
  // Set when the user taps Retry: a Retry that fails too offers the factory reset
  const retriedByUser = useRef(false)

  const attempt = useCallback(() => {
    setResult(undefined)
    const settle = (next: OpenResult) => {
      if (isBlocked(next) && quietRetries.current < QUIET_RETRIES) {
        quietRetries.current += 1
        setTimeout(attempt, QUIET_RETRY_DELAY_MS)
        return
      }
      quietRetries.current = 0
      setResult(next)
    }
    storage
      .open()
      .then(async (next) => {
        if (next.status === 'ok') {
          await runStartupTasks(storage.store.getState(), appLogger, Config.MEDIATOR_URL)
        }
        storage.store.getState().session.setStateLoaded(next.status === 'ok')
        settle(next)
      })
      .catch((error: unknown) => {
        // Name and message only: open() errors carry no stored values
        appLogger.error('storage open threw', {
          error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        })
        settle({ status: 'not-ready', reason: 'store-unreadable' })
      })
  }, [])

  useEffect(attempt, [attempt])

  const retry = useCallback(() => {
    retriedByUser.current = true
    attempt()
  }, [attempt])

  // Retry didn't help: the data can't be opened as it is, so offer a report and a reset (Alerts.FactoryReset)
  useEffect(() => {
    if (!result || !isBlocked(result) || !retriedByUser.current) {
      return
    }
    retriedByUser.current = false
    emitErrorModal(
      t('Alerts.FactoryReset.Title'),
      t('Alerts.FactoryReset.Description'),
      ensureAppError(
        new Error(`Storage blocked startup (${describeBlocked(result)})`),
        AppEventCode.FATAL_UNRECOVERABLE_ERROR
      ),
      {
        action: {
          text: t('Alerts.FactoryReset.Action1'),
          style: 'destructive',
          onPress: async () => {
            // The store isn't open, so useFactoryReset can't run: this clears the device (the IAS registration stays)
            try {
              await purgeWallet()
            } catch (error) {
              appLogger.warn('wallet purge from the blocked screen failed (may not exist)', { error: String(error) })
            }
            try {
              await storage.wipe()
            } catch (error) {
              appLogger.error('storage reset from the blocked screen failed', { error: String(error) })
            }
            attempt()
          },
        },
      }
    )
  }, [result, emitErrorModal, attempt, t])

  // Locked: retry when the app next comes to the foreground, which means the device is unlocked
  useEffect(() => {
    if (result?.status !== 'locked') {
      return
    }
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        attempt()
      }
    })
    return () => subscription.remove()
  }, [result, attempt])

  if (!result || result.status === 'locked') {
    return <LoadingScreen message={t('BCSC.Loading.AppStartup')} />
  }
  if (result.status === 'ok') {
    return <>{children}</>
  }
  if (result.status === 'newer-version') {
    return <UpdateRequiredScreen />
  }
  return <StorageErrorScreen result={result} onRetry={retry} />
}
