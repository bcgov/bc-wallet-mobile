import {
  ProofState,
  CredentialState,
  DidRepository,
  CredentialMetadataKeys,
} from "@aries-framework/core";
import {
  useAgent,
  useCredentialByState,
  useProofById,
  useProofByState,
} from "@aries-framework/react-hooks";
import React, { useEffect } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  Button,
  ButtonType,
  testIdWithKey,
  HomeContentView,
  BifoldError,
} from "aries-bifold";
import { IDIM_AGENT_INVITE_URL, IDIM_AGENT_INVITE_ID } from "../constants";
import { useNavigation } from "@react-navigation/core";
import { Screens } from "aries-bifold";
import { Config } from "react-native-config";

const legacyDidKey = "_internal/legacyDid"; // TODO:(jl) Waiting for AFJ export of this.
const trustedInvitationIssueRe =
  /3Lbd5wSSSBv1xtjwsQ36sj:[0-9]{1,1}:CL:[0-9]{5,}:default/i;
const trustedFoundationCredentialIssuerRe =
  /7xjfawcnyTUcduWVysLww5:[0-9]{1,1}:CL:[0-9]{5,}:Person\s\(SIT\)/i;

interface WellKnownAgentDetails {
  connectionId?: string;
  invitationProofId?: string;
  legacyConnectionDid?: string;
}

const BCIDView: React.FC = () => {
  const [showGetFoundationCredential, setShowGetFoundationCredential] =
    React.useState<boolean>(false);
  const credentials = [
    ...useCredentialByState(CredentialState.CredentialReceived),
    ...useCredentialByState(CredentialState.Done),
  ];
  const { agent } = useAgent();
  const { t } = useTranslation();
  const [workflowInFlight, setWorkflowInFlight] =
    React.useState<boolean>(false);
  const [agentDetails, setAgentDetails] = React.useState<WellKnownAgentDetails>(
    {}
  );
  const receivedProofs = useProofByState(ProofState.RequestReceived);
  const receivedOffers = useCredentialByState(CredentialState.OfferReceived);
  const proof = useProofById(agentDetails.invitationProofId ?? "");
  const navigation = useNavigation();

  useEffect(() => {
    for (const p of receivedProofs) {
      if (
        p.state == ProofState.RequestReceived &&
        p.connectionId === agentDetails?.connectionId
      ) {
        setAgentDetails({ ...agentDetails, invitationProofId: p.id });
      }
    }
  }, [receivedProofs]);

  useEffect(() => {
    for (const o of receivedOffers) {
      if (
        o.state == CredentialState.OfferReceived &&
        o.connectionId === agentDetails?.connectionId
      ) {
        navigation.getParent()?.navigate("Notifications Stack", {
          screen: Screens.CredentialOffer,
          params: { credentialId: o.id },
        });
      }
    }
  }, [receivedOffers]);

  useEffect(() => {
    if (!proof) {
      return;
    }

    if (proof.state == ProofState.RequestReceived) {
      navigation.getParent()?.navigate("Notifications Stack", {
        screen: Screens.ProofRequest,
        params: { proofId: proof.id },
      });
    }

    if (
      proof.state == ProofState.Done &&
      agentDetails.connectionId &&
      agentDetails.legacyConnectionDid
    ) {
      const destUrl = `${Config.IDIM_PORTAL_URL}/${agentDetails?.legacyConnectionDid}`;

      console.log("target URL = ", destUrl);

      navigation.navigate(Screens.WebDisplay, { destUrl });

      setWorkflowInFlight(false);
    }
  }, [proof]);

  useEffect(() => {
    const credentialDefinitionIDs = credentials.map(
      (c) =>
        c.metadata.data[CredentialMetadataKeys.IndyCredential]
          .credentialDefinitionId as string
    );

    if (
      credentialDefinitionIDs.some((i) =>
        trustedFoundationCredentialIssuerRe.test(i)
      )
    ) {
      setShowGetFoundationCredential(false);
      return;
    }

    if (credentialDefinitionIDs.some((i) => trustedInvitationIssueRe.test(i))) {
      setShowGetFoundationCredential(true);
      return;
    }
  }, [credentials]);

  const onGetIdTouched = async () => {
    try {
      setWorkflowInFlight(true);

      // If something fails before we get the credential we need to
      // cleanup the old invitation before it can be used again.
      const oldInvitation = await agent?.oob.findByInvitationId(
        IDIM_AGENT_INVITE_ID
      );

      if (oldInvitation) {
        await agent?.oob.deleteById(oldInvitation.id);
      }

      // connect to the agent, this will re-format the legacy invite
      // until we have OOB working in ACA-py.
      const invite = await agent?.oob.parseInvitation(IDIM_AGENT_INVITE_URL);
      if (!invite) {
        throw new BifoldError(
          "Unable to parse invitation",
          "There was a problem parsing the connection invitation.",
          "No Message",
          2020
        );
      }
      const record = await agent?.oob.receiveInvitation(invite!);
      if (!record) {
        throw new BifoldError(
          "Unable to receive invitation",
          "There was a problem receiving the invitation to connect.",
          "No Message",
          2021
        );
      }

      // retrieve the legacy DID. ACA-py does not support `peer:did`
      // yet.
      const didRepository = agent?.injectionContainer.resolve(DidRepository);
      if (!didRepository) {
        throw new BifoldError(
          "Unable to find legacy DID",
          "There was a problem extracting the did repository.",
          "No Message",
          2022
        );
      }

      const didRecord = await didRepository.getById(
        record.connectionRecord!.did!
      );
      const did = didRecord.metadata.get(legacyDidKey)!.unqualifiedDid;

      if (typeof did !== "string" || did.length <= 0) {
        throw new BifoldError(
          "Unable to find legacy DID",
          "There was a problem extracting legacy did.",
          "No Message",
          2023
        );
      }

      setAgentDetails({
        connectionId: record.connectionRecord!.id,
        legacyConnectionDid: did,
      });
    } catch (error: unknown) {
      setWorkflowInFlight(false);

      throw error;
    }
  };

  return (
    <HomeContentView>
      {showGetFoundationCredential && (
        <View style={{ marginVertical: 40, marginHorizontal: 25 }}>
          <Button
            title={t("BCID.GetDigitalID")}
            accessibilityLabel={t("BCID.GetID")}
            testID={testIdWithKey("GetBCID")}
            onPress={onGetIdTouched}
            buttonType={ButtonType.Secondary}
            disabled={workflowInFlight}
          />
        </View>
      )}
    </HomeContentView>
  );
};

export default BCIDView;
