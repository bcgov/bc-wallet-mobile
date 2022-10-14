import { ProofState, CredentialState, DidRepository, CredentialMetadataKeys } from '@aries-framework/core'
import { useAgent, useCredentialByState, useProofById, useProofByState } from '@aries-framework/react-hooks'
import { useNavigation } from '@react-navigation/core'
import {
  Button,
  ButtonType,
  testIdWithKey,
  HomeContentView,
  BifoldError,
  Screens,
  StoreContext,
  DispatchAction,
} from 'aries-bifold'
import React, { useEffect, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { View, Linking } from 'react-native'
import { Config } from 'react-native-config'
import { InAppBrowser, RedirectResult } from 'react-native-inappbrowser-reborn'

import { IDIM_AGENT_INVITE_URL, IDIM_AGENT_INVITE_ID } from '../constants'

const legacyDidKey = '_internal/legacyDid' // TODO:(jl) Waiting for AFJ export of this.
const trustedInvitationIssueRe = /^3Lbd5wSSSBv1xtjwsQ36sj:[0-9]{1,1}:CL:[0-9]{5,}:default$/i
const trustedFoundationCredentialIssuerRe = /^7xjfawcnyTUcduWVysLww5:[0-9]{1,1}:CL:[0-9]{5,}:Person\s\(SIT\)$/i
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

interface WellKnownAgentDetails {
  connectionId?: string
  invitationProofId?: string
  legacyConnectionDid?: string
}

const BCIDView: React.FC = () => {
  const { agent } = useAgent()
  const { t } = useTranslation()
  const [, dispatch] = useContext(StoreContext)

  const [workflowInFlight, setWorkflowInFlight] = React.useState<boolean>(false)
  const [showGetFoundationCredential, setShowGetFoundationCredential] = React.useState<boolean>(false)
  const [agentDetails, setAgentDetails] = React.useState<WellKnownAgentDetails>({})
  const offers = useCredentialByState(CredentialState.OfferReceived)
  const credentials = [
    ...useCredentialByState(CredentialState.CredentialReceived),
    ...useCredentialByState(CredentialState.Done),
  ]
  const proofRequests = useProofByState(ProofState.RequestReceived)
  const proof = useProofById(agentDetails.invitationProofId ?? '')
  const navigation = useNavigation()

  useEffect(() => {
    for (const o of offers) {
      if (o.state == CredentialState.OfferReceived && o.connectionId === agentDetails?.connectionId) {
        navigation.getParent()?.navigate('Notifications Stack', {
          screen: Screens.CredentialOffer,
          params: { credentialId: o.id },
        })
      }
    }

    if (offers.length === 0 && workflowInFlight) {
      setWorkflowInFlight(!workflowInFlight)
    }
  }, [offers])

  useEffect(() => {
    for (const p of proofRequests) {
      if (p.state == ProofState.RequestReceived && p.connectionId === agentDetails?.connectionId) {
        setAgentDetails({ ...agentDetails, invitationProofId: p.id })
      }
    }
  }, [proofRequests])

  useEffect(() => {
    if (!proof) {
      return
    }

    if (proof.state == ProofState.RequestReceived) {
      navigation.getParent()?.navigate('Notifications Stack', {
        screen: Screens.ProofRequest,
        params: { proofId: proof.id },
      })
    }

    if (proof.state == ProofState.Done && agentDetails.connectionId && agentDetails.legacyConnectionDid) {
      authenticateWithServiceCard(agentDetails.legacyConnectionDid)
    }
  }, [proof])

  useEffect(() => {
    const credentialDefinitionIDs = credentials.map(
      (c) => c.metadata.data[CredentialMetadataKeys.IndyCredential].credentialDefinitionId as string
    )

    if (credentialDefinitionIDs.some((i) => trustedFoundationCredentialIssuerRe.test(i))) {
      setShowGetFoundationCredential(false)
      // setAgentDetails({});
      return
    }

    if (credentialDefinitionIDs.some((i) => trustedInvitationIssueRe.test(i))) {
      setShowGetFoundationCredential(true)
      return
    }
  }, [credentials])

  const cleanupAfterServiceCardAuthentication = (status: AuthenticationResultType): void => {
    InAppBrowser.closeAuth()

    if (status === AuthenticationResultType.Cancel) {
      setWorkflowInFlight(false)
    }
  }

  const authenticateWithServiceCard = async (did: string): Promise<void> => {
    try {
      const url = `${Config.IDIM_PORTAL_URL}/${did}`

      if (await InAppBrowser.isAvailable()) {
        const result = await InAppBrowser.openAuth(url, redirectUrlTemplate.replace('<did>', did), {
          // iOS
          dismissButtonStyle: 'cancel',
          // Android
          showTitle: false,
          enableUrlBarHiding: true,
          enableDefaultShare: true,
        })

        if (result.type === AuthenticationResultType.Cancel) {
          throw new BifoldError(
            t('Error.Title2024'),
            t('Error.Description2024'),
            t('Error.NoMessage'),
            ErrorCodes.CanceledByUser
          )
        }

        if (
          !(result as unknown as RedirectResult).url.includes(did) ||
          !(result as unknown as RedirectResult).url.includes('success')
        ) {
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

      // console.log(`message = ${(error as Error).message}, code = ${code}`);

      cleanupAfterServiceCardAuthentication(
        code === ErrorCodes.CanceledByUser ? AuthenticationResultType.Cancel : AuthenticationResultType.Fail
      )

      dispatch({
        type: DispatchAction.ERROR_ADDED,
        payload: [{ error }],
      })
    }
  }

  const onGetIdTouched = async () => {
    try {
      setWorkflowInFlight(true)

      // If something fails before we get the credential we need to
      // cleanup the old invitation before it can be used again.
      const oldInvitation = await agent?.oob.findByInvitationId(IDIM_AGENT_INVITE_ID)

      if (oldInvitation) {
        await agent?.oob.deleteById(oldInvitation.id)
      }

      // connect to the agent, this will re-format the legacy invite
      // until we have OOB working in ACA-py.
      const invite = await agent?.oob.parseInvitation(IDIM_AGENT_INVITE_URL)
      if (!invite) {
        throw new BifoldError(
          t('Error.Title2020'),
          t('Error.Description2020'),
          t('Error.NoMessage'),
          ErrorCodes.BadInvitation
        )
      }
      const record = await agent?.oob.receiveInvitation(invite!)
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

      setAgentDetails({
        connectionId: record.connectionRecord!.id,
        legacyConnectionDid: did,
      })
    } catch (error: unknown) {
      setWorkflowInFlight(false)

      dispatch({
        type: DispatchAction.ERROR_ADDED,
        payload: [{ error }],
      })
    }
  }

  return (
    <HomeContentView>
      {showGetFoundationCredential && (
        <View style={{ marginVertical: 40, marginHorizontal: 25 }}>
          <Button
            title={t('BCID.GetDigitalID')}
            accessibilityLabel={t('BCID.GetID')}
            testID={testIdWithKey('GetBCID')}
            onPress={onGetIdTouched}
            buttonType={ButtonType.Secondary}
            disabled={workflowInFlight}
          />
        </View>
      )}
    </HomeContentView>
  )
}

export default BCIDView
