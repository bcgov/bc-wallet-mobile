import { CredentialState, DidRepository, CredentialMetadataKeys } from '@aries-framework/core'
import { useAgent, useCredentialByState } from '@aries-framework/react-hooks'
import { useNavigation } from '@react-navigation/core'
import {
  Button,
  ButtonType,
  testIdWithKey,
  HomeContentView,
  BifoldError,
  Screens,
  DispatchAction,
  useStore,
} from 'aries-bifold'
import React, { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { View, Linking, Modal } from 'react-native'
import { Config } from 'react-native-config'
import { InAppBrowser, RedirectResult } from 'react-native-inappbrowser-reborn'

import Spinner from './Spinner'

const legacyDidKey = '_internal/legacyDid' // TODO:(jl) Waiting for AFJ export of this.
const trustedInvitationIssuerRe =
  /^(Mp2pDQqS2eSjNVA7kXc8ut|4zBepKVWZcGTzug4X49vAN|E2h4RUJxyh48PLJ1CtGJrq):\d:CL:\d{2,}:default$/im
const trustedFoundationCredentialIssuerRe =
  /^(KCxVC8GkKywjhWJnUfCmkW|7xjfawcnyTUcduWVysLww5|RGjWbW1eycP7FrMf4QJvX8):\d:CL:\d{2,}:Person(\s(\(SIT\)|\(QA\)))?$/im
const trustedLSBCCredentialIssuerRe =
  /^(4xE68b6S5VRFrKMMG1U95M|AuJrigKQGRLJajKAebTgWu|UUHA3oknprvKrpa7a6sncK):\d:CL:\d{6,}:default$/im
const redirectUrlTemplate = 'bcwallet://bcsc/v1/dids/<did>'
const notBeforeDateTimeAsString = '2022-11-21T17:00:00.000Z'
const connectionDelayInMs = 3000
// const invitationId = '6cc22b56-fd0c-4b78-a7e4-c60c2e80e034'
const invitationId = '0644a296-8be7-403c-95da-2bfb77ee95f1'

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
  legacyConnectionDid?: string
  invitationId?: string
}

const BCIDView: React.FC = () => {
  const { agent } = useAgent()
  const { t } = useTranslation()
  const [, dispatch] = useStore()
  const [workflowInFlight, setWorkflowInFlight] = useState<boolean>(false)
  const [showGetFoundationCredential, setShowGetFoundationCredential] = useState<boolean>(false)
  const [agentDetails, setAgentDetails] = useState<WellKnownAgentDetails>({})
  const offers = useCredentialByState(CredentialState.OfferReceived)
  const credentials = [
    ...useCredentialByState(CredentialState.CredentialReceived),
    ...useCredentialByState(CredentialState.Done),
  ]
  const navigation = useNavigation()
  const notBeforeDateTime = new Date(notBeforeDateTimeAsString)
  const [canUseLSBCredential, setCanUseLSBCredential] = useState<boolean>(notBeforeDateTime.getTime() <= Date.now())
  const enableLSBCCredentialTimer = useRef<NodeJS.Timeout | null>(null)
  const [spinnerVisible, setSpinnerVisible] = useState<boolean>(false)

  useEffect(() => {
    if (!canUseLSBCredential && !enableLSBCCredentialTimer.current) {
      enableLSBCCredentialTimer.current = setTimeout(() => {
        setCanUseLSBCredential(true)
      }, notBeforeDateTime.getTime() - Date.now())
    }
  })

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
    const credentialDefinitionIDs = credentials.map(
      (c) => c.metadata.data[CredentialMetadataKeys.IndyCredential].credentialDefinitionId as string
    )

    if (credentialDefinitionIDs.some((i) => trustedFoundationCredentialIssuerRe.test(i))) {
      setShowGetFoundationCredential(false)
      return
    }

    if (
      credentialDefinitionIDs.some((i) => trustedInvitationIssuerRe.test(i)) ||
      (credentialDefinitionIDs.some((i) => trustedLSBCCredentialIssuerRe.test(i)) && canUseLSBCredential)
    ) {
      setShowGetFoundationCredential(true)
      return
    }
  }, [credentials, canUseLSBCredential])

  const cleanupAfterServiceCardAuthentication = (status: AuthenticationResultType): void => {
    InAppBrowser.closeAuth()

    if (status === AuthenticationResultType.Cancel) {
      setWorkflowInFlight(false)
    }
  }

  const authenticateWithServiceCard = async (did: string): Promise<void> => {
    try {
      const url = `${Config.IAS_PORTAL_URL}/${did}`

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
          // Cancel in the Web view to end the authentication
          // propels the user Home.
          setWorkflowInFlight(false)
        }

        if (
          !(result as unknown as RedirectResult).url.includes(did) ||
          !(result as unknown as RedirectResult).url.includes('success')
        ) {
          setWorkflowInFlight(false)

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

  const onGetIdTouched = async () => {
    try {
      setWorkflowInFlight(true)

      // If something fails before we get the credential we need to
      // cleanup the old invitation before it can be used again.
      const oldInvitation = await agent?.oob.findByInvitationId(invitationId)

      if (oldInvitation) {
        await agent?.oob.deleteById(oldInvitation.id)
      }

      // connect to the agent, this will re-format the legacy invite
      // until we have OOB working in ACA-py.
      const invite = await agent?.oob.parseInvitation(Config.IAS_AGENT_INVITE_URL)
      if (!invite) {
        throw new BifoldError(
          t('Error.Title2020'),
          t('Error.Description2020'),
          t('Error.NoMessage'),
          ErrorCodes.BadInvitation
        )
      }

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

      setAgentDetails({
        connectionId: record.connectionRecord!.id,
        invitationId: invite.id,
        legacyConnectionDid: did,
      })

      setSpinnerVisible(true)
      setTimeout(async () => {
        setSpinnerVisible(false)
        await authenticateWithServiceCard(did)
      }, connectionDelayInMs)
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
      <Modal visible={spinnerVisible} animationType="none" transparent={true}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Spinner />
        </View>
      </Modal>
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
