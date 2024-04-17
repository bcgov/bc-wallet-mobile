import { DidRepository } from '@credo-ts/core'
import { BifoldError, Agent, EventTypes as BifoldEventTypes } from '@hyperledger/aries-bifold-core'
import { TFunction } from 'react-i18next'
import { Linking, Platform, DeviceEventEmitter } from 'react-native'
import { InAppBrowser, RedirectResult } from 'react-native-inappbrowser-reborn'

import { BCState } from '../store'

const legacyDidKey = '_internal/legacyDid' // TODO:(jl) Waiting for AFJ export of this.
const redirectUrlTemplate = 'bcwallet://bcsc/v1/dids/<did>'
const trustedPersonCredentialIssuerRe =
  /^(KCxVC8GkKywjhWJnUfCmkW|7xjfawcnyTUcduWVysLww5|RGjWbW1eycP7FrMf4QJvX8):\d:CL:\d+:Person(\s(\(SIT\)|\(QA\)))?$/im

enum AuthenticationResultType {
  Success = 'success',
  Fail = 'fail',
  Cancel = 'cancel',
  Dismiss = 'dismiss',
}

enum ErrorCodes {
  BadInvitation = 2020,
  ReceiveInvitationError = 2021,
  CannotGetLegacyDID = 2022,
  CanceledByUser = 2024,
  ServiceCardError = 2025,
}

export const connectionDelayInMs = Platform.OS === 'android' ? 5000 : 3000

export interface WellKnownAgentDetails {
  connectionId?: string
  legacyConnectionDid?: string
  invitationId?: string
}

export const showPersonCredentialSelector = (credentialDefinitionIDs: string[]): boolean => {
  // If we already have a trusted person credential do not show
  return !credentialDefinitionIDs.some((i) => trustedPersonCredentialIssuerRe.test(i))
}

export const removeExistingInvitationIfRequired = async (
  agent: Agent | undefined,
  invitationId: string
): Promise<void> => {
  try {
    // If something fails before we get the credential we need to
    // cleanup the old invitation before it can be used again.
    const oobRecord = await agent?.oob.findByReceivedInvitationId(invitationId)
    if (oobRecord) {
      await agent?.oob.deleteById(oobRecord.id)
    }
  } catch (error) {
    // findByInvitationId with throw if unsuccessful but that's not a problem.
    // It just means there is nothing to delete.
  }
}

export const connectToIASAgent = async (
  agent: Agent,
  store: BCState,
  t: TFunction<'translation', undefined>
): Promise<WellKnownAgentDetails> => {
  // connect to the agent, this will re-format the legacy invite
  // until we have OOB working in ACA-py.
  const invite = await agent.oob.parseInvitation(store.developer.environment.iasAgentInviteUrl)

  if (!invite) {
    throw new BifoldError(t('Error.Title2020'), t('Error.Message2020'), t('Error.NoMessage'), ErrorCodes.BadInvitation)
  }

  await removeExistingInvitationIfRequired(agent, invite.id)

  const record = await agent.oob.receiveInvitation(invite)

  if (!record) {
    throw new BifoldError(
      t('Error.Title2021'),
      t('Error.Message2021'),
      t('Error.NoMessage'),
      ErrorCodes.ReceiveInvitationError
    )
  }

  // retrieve the legacy DID. ACA-py does not support `peer:did`
  // yet.

  const didRepository = agent.dependencyManager.resolve(DidRepository)

  if (!didRepository) {
    throw new BifoldError(
      t('Error.Title2022'),
      t('Error.Message2022'),
      t('Error.NoMessage'),
      ErrorCodes.CannotGetLegacyDID
    )
  }

  const dids = await didRepository.getAll(agent.context)
  const didRecord = dids.filter((d) => d.did === record.connectionRecord?.did).pop()

  if (!didRecord) {
    throw new BifoldError(
      t('Error.Title2022'),
      t('Error.Message2022'),
      t('Error.NoMessage'),
      ErrorCodes.CannotGetLegacyDID
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const legacyConnectionDid = didRecord.metadata.get(legacyDidKey)!.unqualifiedDid

  if (typeof legacyConnectionDid !== 'string' || legacyConnectionDid.length <= 0) {
    throw new BifoldError(
      t('Error.Title2022'),
      t('Error.Message2022'),
      t('Error.NoMessage'),
      ErrorCodes.CannotGetLegacyDID
    )
  }

  return {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    connectionId: record.connectionRecord!.id,
    invitationId: invite.id,
    legacyConnectionDid,
  }
}

export const cleanupAfterServiceCardAuthentication = (status: AuthenticationResultType): boolean | undefined => {
  InAppBrowser.closeAuth()

  if (status === AuthenticationResultType.Cancel) {
    return false
  }
}

export const authenticateWithServiceCard = async (
  legacyConnectionDid: string,
  iasPortalUrl: string,
  callback?: (status: boolean) => void
): Promise<void> => {
  try {
    const url = `${iasPortalUrl}/${legacyConnectionDid}`

    if (await InAppBrowser.isAvailable()) {
      const result = await InAppBrowser.openAuth(url, redirectUrlTemplate.replace('<did>', legacyConnectionDid), {
        // iOS
        dismissButtonStyle: 'cancel',
        // Android
        showTitle: false,
        enableUrlBarHiding: true,
        enableDefaultShare: false,
        forceCloseOnRedirection: false,
        showInRecents: true,
      })

      // When `result.type` is "Cancel" that comes from the alert box or
      // secure browser `result.url` will be undefined.
      if (
        result.type === AuthenticationResultType.Cancel &&
        typeof (result as unknown as RedirectResult).url === 'undefined'
      ) {
        // setWorkflowInProgress(false)
        callback && callback(false)

        return
      }

      if (
        result.type === AuthenticationResultType.Dismiss &&
        typeof (result as unknown as RedirectResult).url === 'undefined'
      ) {
        callback && callback(true)
      }

      // When `result.type` is "Success" and `result.url` contains the
      // word "success" the credential offer workflow has been completed.
      if (
        result.type === AuthenticationResultType.Success &&
        (result as unknown as RedirectResult).url.includes(legacyConnectionDid) &&
        (result as unknown as RedirectResult).url.includes('success')
      ) {
        callback && callback(true)
      }

      // When `result.type` is "Success" and `result.url` contains the
      // word "cancel" the credential offer workflow has been canceled by
      // the user.
      if (
        result.type === AuthenticationResultType.Success &&
        (result as unknown as RedirectResult).url.includes(legacyConnectionDid) &&
        (result as unknown as RedirectResult).url.includes('cancel')
      ) {
        callback && callback(false)
        // setWorkflowInProgress(false)
        return
      }
    } else {
      await Linking.openURL(url)
    }

    cleanupAfterServiceCardAuthentication(AuthenticationResultType.Success)
  } catch (error: unknown) {
    const code = (error as BifoldError).code
    cleanupAfterServiceCardAuthentication(
      code === ErrorCodes.CanceledByUser ? AuthenticationResultType.Cancel : AuthenticationResultType.Fail
    )

    DeviceEventEmitter.emit(BifoldEventTypes.ERROR_ADDED, error)
  }
}
