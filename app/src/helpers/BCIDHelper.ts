import { DidRepository, CredentialExchangeRecord as CredentialRecord, CredentialMetadataKeys } from '@aries-framework/core'
import {
    BifoldError,
    DispatchAction,
    Agent
} from 'aries-bifold'
import React, { ReducerAction } from 'react'
import { TFunction } from 'react-i18next'
import { Linking, Platform } from 'react-native'
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

export const startFlow = async (agent: Agent | undefined, store: BCState, dispatch: React.Dispatch<ReducerAction<any>>, setWorkflowInFlight: React.Dispatch<React.SetStateAction<boolean>>, t: TFunction<"translation", undefined>, setAgentDetails?: React.Dispatch<React.SetStateAction<WellKnownAgentDetails>>) => {
    try {

        const agentDetails = await recieveBCIDInvite(agent, store, t)

        if (setAgentDetails !== undefined) {
            setAgentDetails(agentDetails)
        }

        if (agentDetails.legacyConnectionDid !== undefined) {
            setTimeout(async () => {
                await authenticateWithServiceCard(store, dispatch, setWorkflowInFlight, agentDetails.legacyConnectionDid as string, t)
            }, connectionDelayInMs)
        }
    } catch (error: unknown) {
        setWorkflowInFlight(false)

        dispatch({
            type: DispatchAction.ERROR_ADDED,
            payload: [{ error }],
        })
    }
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

export const getInvitationCredentialDate = (credentials: CredentialRecord[], canUseLSBCCredential: boolean): Date | undefined => {

    const invitationCredential = credentials.find((c) => {
        const credDef = c.metadata.data[CredentialMetadataKeys.IndyCredential].credentialDefinitionId as string
        if (trustedInvitationIssuerRe.test(credDef) || (trustedLSBCCredentialIssuerRe.test(credDef) && canUseLSBCCredential)) {
            return true
        }
    })
    return invitationCredential?.createdAt
}

export const recieveBCIDInvite = async (agent: Agent | undefined, store: BCState, t: TFunction<"translation", undefined>): Promise<WellKnownAgentDetails> => {
    // connect to the agent, this will re-format the legacy invite
    // until we have OOB working in ACA-py.
    const invite = await agent?.oob.parseInvitation(store.developer.environment.iasAgentInviteUrl)
    if (!invite) {
        throw new BifoldError(
            t('Error.Title2020'),
            t('Error.Description2020'),
            t('Error.NoMessage'),
            ErrorCodes.BadInvitation
        )
    }

    await removeExistingInvitationIfRequired(agent, invite.id)

    const record = await agent?.oob.receiveInvitation(invite)
    if (!record) {
        throw new BifoldError(
            t('Error.Title2021'),
            t('Error.Description2021'),
            t('Error.NoMessage'),
            ErrorCodes.ReceiveInvitationError
        )
    }

    // retrieve the legacy DID. ACA-py does not support `peer:did`
    // yet.
    const didRepository = agent?.injectionContainer.resolve(DidRepository)
    if (!didRepository) {
        throw new BifoldError(
            t('Error.Title2022'),
            t('Error.Description2022'),
            t('Error.NoMessage'),
            ErrorCodes.CannotGetLegacyDID
        )
    }

    const didRecord = await didRepository.getById(record.connectionRecord!.did!)
    const did = didRecord.metadata.get(legacyDidKey)!.unqualifiedDid

    if (typeof did !== 'string' || did.length <= 0) {
        throw new BifoldError(
            t('Error.Title2022'),
            t('Error.Description2022'),
            t('Error.NoMessage'),
            ErrorCodes.CannotGetLegacyDID
        )
    }

    return {
        connectionId: record.connectionRecord!.id,
        invitationId: invite.id,
        legacyConnectionDid: did,
    }
}

export const removeExistingInvitationIfRequired = async (agent: Agent | undefined, invitationId: string): Promise<void> => {
    try {
        // If something fails before we get the credential we need to
        // cleanup the old invitation before it can be used again.
        const oldInvitation = await agent?.oob.findByInvitationId(invitationId)

        if (oldInvitation) {
            await agent?.oob.deleteById(oldInvitation.id)
        }
    } catch (error) {
        // findByInvitationId with throw if unsuccessful but that's not a problem.
        // It just means there is nothing to delete.
    }
}


export const cleanupAfterServiceCardAuthentication = (status: AuthenticationResultType): boolean | undefined => {
    InAppBrowser.closeAuth()

    if (status === AuthenticationResultType.Cancel) {
        return false
    }
}

export const authenticateWithServiceCard = async (store: BCState, dispatch: React.Dispatch<ReducerAction<any>>, setWorkflow: React.Dispatch<React.SetStateAction<boolean>>, did: string, t: TFunction<"translation", undefined>): Promise<void> => {
    try {
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

            if (result.type === AuthenticationResultType.Cancel) {
                // Cancel in the Web view to end the authentication
                // propels the user Home.
                setWorkflow(false)
            }

            if (
                !(result as unknown as RedirectResult).url.includes(did) ||
                !(result as unknown as RedirectResult).url.includes('success')
            ) {
                setWorkflow(false)

                throw new BifoldError(
                    t('Error.Title2025'),
                    t('Error.Description2025'),
                    t('Error.NoMessage'),
                    ErrorCodes.ServiceCardError
                )
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

        dispatch({
            type: DispatchAction.ERROR_ADDED,
            payload: [{ error }],
        })
    }
}