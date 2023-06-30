import { AnonCredsCredentialMetadataKey } from '@aries-framework/anoncreds/build/utils/metadata'
import { DidRepository, CredentialExchangeRecord } from '@aries-framework/core'
import { BifoldError, Agent, EventTypes as BifoldEventTypes } from 'aries-bifold'
import React from 'react'
import { TFunction } from 'react-i18next'
import { Linking, Platform, DeviceEventEmitter } from 'react-native'
import { InAppBrowser, RedirectResult } from 'react-native-inappbrowser-reborn'

import { BCState } from '../store'

const legacyDidKey = '_internal/legacyDid' // TODO:(jl) Waiting for AFJ export of this.
const trustedInvitationIssuerRe =
  /^(Mp2pDQqS2eSjNVA7kXc8ut|4zBepKVWZcGTzug4X49vAN|E2h4RUJxyh48PLJ1CtGJrq):\d:CL:\d+:default$/im
const trustedFoundationCredentialIssuerRe =
  /^(KCxVC8GkKywjhWJnUfCmkW|7xjfawcnyTUcduWVysLww5|RGjWbW1eycP7FrMf4QJvX8):\d:CL:\d+:Person(\s(\(SIT\)|\(QA\)))?$/im
const trustedLSBCCredentialIssuerRe =
  /^(4xE68b6S5VRFrKMMG1U95M|AuJrigKQGRLJajKAebTgWu|UUHA3oknprvKrpa7a6sncK):\d:CL:\d+:default$/im
const redirectUrlTemplate = 'bcwallet://bcsc/v1/dids/<did>'

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

export const showBCIDSelector = (credentialDefinitionIDs: string[], canUseLSBCredential: boolean): boolean => {
  if (credentialDefinitionIDs.some((i) => trustedFoundationCredentialIssuerRe.test(i))) {
    return false
  }

  if (
    credentialDefinitionIDs.some((i) => trustedInvitationIssuerRe.test(i)) ||
    (credentialDefinitionIDs.some((i) => trustedLSBCCredentialIssuerRe.test(i)) && canUseLSBCredential)
  ) {
    return true
  }
  return false
}

export const getInvitationCredentialDate = (
  credentials: CredentialExchangeRecord[],
  canUseLSBCCredential: boolean
): Date | undefined => {
  const invitationCredential = credentials.find((c) => {
    const credDef = c.metadata.data[AnonCredsCredentialMetadataKey].credentialDefinitionId as string
    if (
      trustedInvitationIssuerRe.test(credDef) ||
      (trustedLSBCCredentialIssuerRe.test(credDef) && canUseLSBCCredential)
    ) {
      return true
    }
  })
  return invitationCredential?.createdAt
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

export const recieveBCIDInvite = async (
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
  store: BCState,
  setWorkflowInProgress: React.Dispatch<React.SetStateAction<boolean>>,
  agentDetails: WellKnownAgentDetails,
  t: TFunction<'translation', undefined>,
  callback?: (connectionId?: string) => void
): Promise<void> => {
  try {
    const did = agentDetails.legacyConnectionDid as string
    const url = `${store.developer.environment.iasPortalUrl}/${did}`

    if (await InAppBrowser.isAvailable()) {
      const result = await InAppBrowser.openAuth(url, redirectUrlTemplate.replace('<did>', did), {
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
        setWorkflowInProgress(false)
        return
      }

      if (
        result.type === AuthenticationResultType.Dismiss &&
        typeof (result as unknown as RedirectResult).url === 'undefined'
      ) {
        callback && callback(agentDetails.connectionId)
      }

      // When `result.type` is "Success" and `result.url` contains the
      // word "success" the credential offer workflow has been completed.
      if (
        result.type === AuthenticationResultType.Success &&
        (result as unknown as RedirectResult).url.includes(did) &&
        (result as unknown as RedirectResult).url.includes('success')
      ) {
        callback && callback(agentDetails.connectionId)
      }

      // When `result.type` is "Success" and `result.url` contains the
      // word "cancel" the credential offer workflow has been canceled by
      // the user.
      if (
        result.type === AuthenticationResultType.Success &&
        (result as unknown as RedirectResult).url.includes(did) &&
        (result as unknown as RedirectResult).url.includes('cancel')
      ) {
        setWorkflowInProgress(false)
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

export const startFlow = async (
  agent: Agent,
  store: BCState,
  setWorkflowInProgress: React.Dispatch<React.SetStateAction<boolean>>,
  t: TFunction<'translation', undefined>,
  callback?: (connectionId?: string) => void
) => {
  try {
    const agentDetails = await recieveBCIDInvite(agent, store, t)

    if (agentDetails.legacyConnectionDid !== undefined) {
      setTimeout(async () => {
        await authenticateWithServiceCard(store, setWorkflowInProgress, agentDetails, t, callback)
      }, connectionDelayInMs)
    }
  } catch (error: unknown) {
    setWorkflowInProgress(false)
    DeviceEventEmitter.emit(BifoldEventTypes.ERROR_ADDED, error)
  }
}
