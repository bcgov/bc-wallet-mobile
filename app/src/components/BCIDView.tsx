import { ProofState, CredentialState } from "@aries-framework/core";
import {
  useAgent,
  useCredentialByState,
  useProofById,
  useProofByState,
  useConnectionById,
} from "@aries-framework/react-hooks";
import React, { useEffect } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  Button,
  ButtonType,
  testIdWithKey,
  HomeContentView,
} from "aries-bifold";
import { IDIM_AGENT_INVITE_URL } from "../constants";
import { useNavigation } from "@react-navigation/core";
import { Screens } from "aries-bifold";
import { Config } from "react-native-config";

const trustedInvitationIssueRe =
  /3Lbd5wSSSBv1xtjwsQ36sj:[0-9]{1,1}:CL:[0-9]{5,}:default/i;
const trustedFoundationCredentialIssuerRe =
  /XpgeQa93eZvGSZBZef3PHn:[0-9]{1,1}:CL:[0-9]{5,}:BC\sPerson\sCredential.*/i;

const BCIDView: React.FC = () => {
  const [showGetFoundationCredential, setShowGetFoundationCredential] =
    React.useState<boolean>(false);
  const credentials = [
    ...useCredentialByState(CredentialState.CredentialReceived),
    ...useCredentialByState(CredentialState.Done),
  ];
  const { agent } = useAgent();
  const { t } = useTranslation();
  const [iDIMAgentConnectionId, setIDIMAgentConnectionId] =
    React.useState<string>();
  const [invitationProofID, setInvitationProofID] = React.useState<string>();
  const receivedProofs = useProofByState(ProofState.RequestReceived);
  const proof = invitationProofID ? useProofById(invitationProofID) : undefined;
  const connection = proof?.connectionId
    ? useConnectionById(proof?.connectionId)
    : undefined;
  const navigation = useNavigation();

  useEffect(() => {
    for (const p of receivedProofs) {
      if (
        p.state == ProofState.RequestReceived &&
        p.connectionId === iDIMAgentConnectionId
      ) {
        setInvitationProofID(p.id);
      }
    }
  }, [receivedProofs]);

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

    if (proof.state == ProofState.Done && connection) {
      const destUrl = `${Config.IDIM_PORTAL_URL}/${connection?.did}`;
      navigation.navigate(Screens.WebDisplay, { destUrl });
    }
  }, [proof, connection]);

  useEffect(() => {
    for (const cred of credentials) {
      const credentialDefinitionId = cred.metadata.data[
        "_internal/indyCredential"
      ].credentialDefinitionId as string;

      // If we have a foundation credential, hide the button get get said credential.
      if (
        credentialDefinitionId &&
        trustedFoundationCredentialIssuerRe.test(credentialDefinitionId)
      ) {
        setShowGetFoundationCredential(false);

        return;
      }

      // If we have a foundation invite credential, show the button get get said credential.
      if (
        credentialDefinitionId &&
        trustedInvitationIssueRe.test(credentialDefinitionId)
      ) {
        setShowGetFoundationCredential(true);

        return;
      }
    }
  }, [credentials]);

  const onGetIdTouched = async () => {
    try {
      const connectionRecord =
        await agent?.connections.receiveInvitationFromUrl(
          IDIM_AGENT_INVITE_URL,
          {
            autoAcceptConnection: true,
          }
        );

      if (!connectionRecord?.id) {
        throw new Error("Connection does not have an ID");
      }

      setIDIMAgentConnectionId(connectionRecord.id);
    } catch (error) {
      // TODO:(jl) add error handling here
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
          />
        </View>
      )}
    </HomeContentView>
  );
};

export default BCIDView;
