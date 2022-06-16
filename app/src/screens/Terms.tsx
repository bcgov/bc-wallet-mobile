import { useNavigation } from "@react-navigation/core";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useState, useContext } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button, ButtonType } from "aries-bifold";
import { CheckBoxRow } from "aries-bifold";
import { InfoTextBox } from "aries-bifold";
import { StoreContext } from "aries-bifold";
import { DispatchAction } from "aries-bifold";
import { AuthenticateStackParams, Screens } from "aries-bifold";
import { testIdWithKey } from "aries-bifold";
import { useTheme } from "aries-bifold";

const Terms: React.FC = () => {
  const [, dispatch] = useContext(StoreContext);
  const [checked, setChecked] = useState(false);
  const { t } = useTranslation();
  const navigation =
      useNavigation<StackNavigationProp<AuthenticateStackParams>>();
  navigation.setOptions({ title: "Contrat de licence de l'utilisateur" });
  const { ColorPallet, TextTheme } = useTheme();
  const style = StyleSheet.create({
    container: {
      backgroundColor: ColorPallet.brand.primaryBackground,
      margin: 20,
    },
    bodyText: {
      ...TextTheme.normal,
      flexShrink: 1,
    },
    titleText: {
      ...TextTheme.normal,
      textDecorationLine: "underline",
    },
    controls: {
      marginTop: 15,
    },
    paragraph: {
      flexDirection: "row",
      marginTop: 20,
    },
    enumeration: {
      ...TextTheme.normal,
      marginRight: 25,
    },
  });

  const onSubmitPressed = () => {
    dispatch({
      type: DispatchAction.DID_AGREE_TO_TERMS,
      payload: [{ DidAgreeToTerms: checked }],
    });

    navigation.navigate(Screens.CreatePin);
  };

  const onBackPressed = () => {
    //TODO:(jl) goBack() does not unwind the navigation stack but rather goes
    //back to the splash screen. Needs fixing before the following code will
    //work as expected.

    // if (nav.canGoBack()) {
    //   nav.goBack()
    // }

    navigation.navigate(Screens.Onboarding);
  };

  return (
      <View style={[style.container]}>
        <ScrollView>
          <InfoTextBox>
            Veuillez accepter les termes et conditions ci-dessous avant d'utiliser cette
            application.
          </InfoTextBox>
          <Text style={[style.bodyText, { marginTop: 20 }]}>
            L'application du portefeuille québécois ("application sous licence") vous permet de stocker vos justificatifs vérifiables, qui sont des justificatifs numériques émis par des émetteurs tiers que vous pouvez utiliser pour prouver votre identité.
            numériques émis par des émetteurs tiers que vous pouvez utiliser pour prouver quelque chose
            quelque chose à votre sujet en présentant ces justificatifs à une autre partie qui
            partie qui a besoin de vérifier ces justificatifs. Le présent contrat de licence de l'utilisateur final
            utilisateur final ("CLUF") définit les termes et conditions qui s'appliquent à vous lorsque vous téléchargez et/ou utilisez le BC Walters.
            lorsque vous téléchargez et/ou utilisez l'application BC Wallet. Ce CLUF est un accord légal
            accord légal entre vous, en tant qu'utilisateur final de l'application sous licence
            (" vous " ou " vous ") et Sa Majesté la Reine du chef de la province de la Colombie-Britannique (la " province ").
            de la Colombie-Britannique (la "Province"). Vous pouvez accéder à l'application sous licence
            licence sur un appareil mobile Google ou Apple. Certains des
            termes qui suivent font référence à Google ou à Apple, selon le cas, et ces
            références ne s'appliquent que dans la mesure où vous accédez à l'Application sous
            l'Application sous Licence par le biais de cette plate-forme particulière. En indiquant
            que vous acceptez ce CLUF, et en contrepartie de l'utilisation de l'Application sous
            l'Application sous licence, vous acceptez ce qui suit.
          </Text>
          <View style={style.paragraph}>
            <Text style={[style.enumeration]}>1</Text>
            <Text style={[style.bodyText]}>
              <Text style={[style.titleText]}>Parties.</Text>
              &nbsp;Les parties de l'EULA sont vous et la Province
              (collectivement, les " Parties "). Les parties reconnaissent que : (a)
              le présent EULA est conclu entre les parties seulement, et non avec Apple Inc.
              Inc. (" Apple ") ; et (b) que la Province, et non Apple, est uniquement
              responsable de l'application sous licence et de son contenu.
            </Text>
          </View>

          <View style={style.paragraph}>
            <Text style={[style.enumeration]}>2</Text>
            <Text style={[style.bodyText]}>
              <Text style={[style.titleText]}>Capacité d'acceptation de l'EULA.</Text>
              &nbsp;Pour accepter les termes et conditions du présent EULA et pour
              télécharger et/ou utiliser l'Application sous licence, vous devez être, et vous
              déclarez et garantissez que vous êtes : (a) avoir au moins dix-neuf (19) ans ; ou
              (a) au moins dix-neuf (19) ans ; ou (b) si vous avez moins de 19 ans, vous avez obtenu l'accord de vos
              votre parent ou tuteur d'accepter le présent accord en votre nom, auquel cas votre parent ou tuteur est responsable de l'acceptation du présent accord.
              auquel cas votre parent ou tuteur est responsable de votre utilisation de
              l'Application sous licence. Si vous ne remplissez pas ces conditions,
              vous ne devez pas accéder à l'Application sous licence ni l'utiliser.
            </Text>
          </View>

          <View style={style.paragraph}>
            <Text style={[style.enumeration]}>3</Text>
            <Text style={[style.bodyText]}>
              <Text style={[style.titleText]}>Protection d'appareil.</Text>
              &nbsp;Vous êtes responsable de la sécurité de tout dispositif que vous utilisez en
              en relation avec l'Application sous licence, y compris, sans
              l'utilisation d'un dispositif de protection approprié (par exemple, un mot de passe/code
              complexe ou des informations biométriques) et de préserver la confidentialité de la protection de votre appareil.
              protection de votre appareil, ainsi que pour l'utilisation de protections de sécurité
              protections de sécurité appropriées (par exemple, l'utilisation d'un logiciel antivirus/anti-spyware
              anti-virus/anti-spyware à jour et la dernière version du système d'exploitation, limiter les
              mot de passe et le verrouillage de l'appareil après une courte période d'inactivité) en relation avec votre appareil.
            </Text>
          </View>
          <View style={style.paragraph}>
            <Text style={[style.enumeration]}>4</Text>
            <Text style={[style.bodyText]}>
              <Text style={[style.titleText]}>Accès au dispositif mobile.</Text>
              &nbsp;Vous ne devez pas autoriser un autre individu ou une autre entité à accéder à
              à votre appareil dans le but de permettre à cet individu ou à cette entité
              d'accéder ou d'utiliser l'Application sous licence en votre nom.
            </Text>
          </View>
          <View style={style.paragraph}>
            <Text style={[style.enumeration]}>5</Text>
            <Text style={[style.bodyText]}>
              <Text style={[style.titleText]}>Propriété de l'application.</Text>
              &nbsp;L'Application sous Licence, y compris, sans limitation
              les marques, noms commerciaux, logos, noms de domaine, images, graphiques,
              éléments d'interface utilisateur graphique et les dessins, sous quelque forme ou support que ce soit
              sous quelque forme ou support que ce soit, appartiennent à la Province ou à ses concédants de licence et sont
              licence et sont protégés par des droits d'auteur, des brevets, des marques de commerce et d'autres
              les droits de propriété intellectuelle.
            </Text>
          </View>
          <View style={style.paragraph}>
            <Text style={[style.enumeration]}>6</Text>
            <Text style={[style.bodyText]}>
              <Text style={[style.titleText]}>Propriété du contenu.</Text>
              &nbsp;Les informations et travaux mis à disposition, affichés ou
              transmis par Vous en relation avec l'Application sous Licence,
              y compris vos informations d'identification vérifiables (collectivement, le "Contenu")
              sont votre propriété et sont protégés par les droits d'auteur, les brevets, les marques de commerce
              et autres lois protégeant les droits de propriété intellectuelle.
            </Text>
          </View>
          <View style={style.paragraph}>
            <Text style={[style.enumeration]}>7</Text>
            <Text style={[style.bodyText]}>
              <Text style={[style.titleText]}>Tiers bénéficiaire.</Text>
              &nbsp;Les Parties reconnaissent et acceptent que : (a) Apple, et les filiales d'Apple
              filiales d'Apple, sont des tiers bénéficiaires du présent CLUF ; et (b)
              dès que vous aurez accepté les termes et conditions du présent CLUF, Apple
              Apple aura le droit (et sera réputée avoir accepté le droit)
              de faire appliquer le CLUF à votre encontre en tant que tiers bénéficiaire
              thereof.
            </Text>
          </View>
          <View style={style.paragraph}>
            <Text style={[style.enumeration]}>8</Text>
            <Text style={[style.bodyText]}>
              <Text style={[style.titleText]}>Licence.</Text>
              &nbsp; La Province vous accorde par la présente une licence non exclusive,
              libre de droits, non transférable et, sous réserve de l'article 9 du présent contrat de
              licence perpétuelle pour exécuter, utiliser et afficher l'application sous licence
              application sous licence sur des produits de marque Google ou Apple, à condition que
              que l'utilisation sur des produits de marque Apple doit être des produits que vous
              que vous possédez ou contrôlez, et dans le respect des règles d'utilisation énoncées dans les
              dans les conditions générales d'Apple Media Services situées à l'adresse suivante
              https://www.apple.com/legal/internet-services/itunes/us/terms.html
              (ou toute autre URL désignée par Apple) (les "Conditions de l'App Store"),
              telles qu'elles peuvent être modifiées par Apple de temps à autre (la " Licence ").
              Sauf dans les cas prévus par les Conditions de l'App Store (qui permettent aux
              l'accès, l'acquisition et l'utilisation des Applications sous Licence par d'autres comptes
              d'autres comptes associés à l'acheteur par le biais du partage de la famille ou de
              d'achat en volume), vous n'êtes pas autorisé à distribuer ou à rendre l'application sous licence
              licence sur un réseau où elle pourrait être utilisée par plusieurs appareils en même temps.
              en même temps. Si vous vendez votre produit de marque Apple à un tiers, vous devez
              tiers, vous devez d'abord retirer l'Application sous Licence de ce produit de
              produit de marque Apple. Pour plus de certitude, vous ne pouvez pas : (a)
              transférer, redistribuer ou concéder en sous-licence l'Application sous Licence ; ou
              (b) copier (sauf dans les cas autorisés par la présente Licence et les Règles d'Utilisation),
              faire de l'ingénierie inverse, désassembler, tenter de dériver le code source,
              modifier, ou créer des œuvres dérivées de l'Application sous Licence, de ses
              l'Application sous Licence, de ses mises à jour, de ses mises à niveau ou de toute partie de l'Application sous Licence (à l'exception de ce qui suit
              et uniquement dans la mesure où toute restriction précédente est interdite
              par la loi applicable ou dans la mesure où cela peut être autorisé par les
              conditions de licence régissant l'utilisation de tout composant à source ouverte
              inclus dans l'Application sous Licence).
            </Text>
          </View>
          <View style={style.paragraph}>
            <Text style={[style.enumeration]}>9</Text>
            <Text style={[style.bodyText]}>
              <Text style={[style.titleText]}>Terminaison.</Text>
              &nbsp;La licence sera automatiquement résiliée dans le cas où vous
              ne respectez pas l'un des termes et conditions du présent CLUF ou
              si l'une quelconque de vos déclarations ou garanties est ou devient
              inexactes ou mensongères. La Province se réserve également le droit de
              résilier la présente licence pour quelque raison que ce soit, à sa seule discrétion. À l'adresse
              En cas de résiliation du présent permis, vous devez : (a) cesser immédiatement
              cesser immédiatement d'utiliser l'application sous licence ; et (b) supprimer ou détruire toutes les
              copies de l'Application sous Licence en votre possession ou sous votre contrôle.
              contrôle.
            </Text>
          </View>

          <View style={style.paragraph}>
            <Text style={[style.enumeration]}>10</Text>
            <View
                style={{
                  flexShrink: 1,
                  flexDirection: "column",
                }}
            >
              <Text style={[style.bodyText]}>
                <Text style={[style.titleText]}>Utilisation acceptable.</Text>
                &nbsp;Vous ne devez prendre aucune mesure en relation avec votre utilisation de
                l'Application sous licence qui mettrait en péril la sécurité, l'intégrité
                intégrité et/ou la disponibilité de l'Application sous Licence,
                y compris, sans limitation :
              </Text>

              <Text style={[style.bodyText, { marginTop: 10 }]}>
                (a) l'utilisation de l'Application sous Licence à des fins illégales ou inappropriées.
                ou inapproprié;
              </Text>
              <Text style={[style.bodyText, { marginTop: 10 }]}>
                (b) l'altération de toute partie de l'Application sous licence ;
              </Text>
              <Text style={[style.bodyText, { marginTop: 10 }]}>
                (c) l'utilisation de l'Application sous Licence pour transmettre tout virus ou autre
                code informatique, fichier ou programme nuisible ou destructeur ou pour
                mener des activités de piratage et/ou d'intrusion ;
              </Text>
              <Text style={[style.bodyText, { marginTop: 10 }]}>
                (d) tenter de contourner ou de subvertir toute mesure de sécurité
                associée à l'application sous licence ;
              </Text>
              <Text style={[style.bodyText, { marginTop: 10 }]}>
                (e) prendre toute mesure qui pourrait raisonnablement être interprétée comme susceptible de
                d'affecter négativement les autres utilisateurs de l'Application sous Licence ; ou
              </Text>
              <Text style={[style.bodyText, { marginTop: 10 }]}>
                (f) la suppression ou l'altération de tout symbole ou avis de propriété,
                y compris tout avis de droit d'auteur, marque de commerce ou logo, affiché en
                en relation avec l'Application sous licence.
              </Text>
            </View>
          </View>
          <View style={style.paragraph}>
            <Text style={[style.enumeration]}>11</Text>
            <Text style={[style.bodyText]}>
              <Text style={[style.titleText]}>Maintenance et soutien.</Text>
              &nbsp;Les parties reconnaissent que : (a) le gouvernement provincial peut, a ? son
              à sa seule discrétion, assurer la maintenance et le soutien de l'application
              licence, y compris le dépannage, les mises à jour et les modifications (les " services de soutien ").
              (les " Services de soutien ") ; (b) la Province est seule responsable de la fourniture des
              (b) la Province est seule responsable de la fourniture des Services de support, le cas échéant ; et
              (c) Apple n'a aucune obligation de fournir des services d'entretien et de
              d'entretien et de soutien en ce qui concerne l'application sous licence. Toutes les questions
              concernant les Services d'assistance, et toutes les questions d'ordre général
              générales concernant l'Application sous Licence, doivent être adressées à : Produit
              Propriétaire du produit, BC Wallet, ditrust@gov.bc.ca, 4000 Seymour Place, Victoria,
              BC, V8W 9V1.
            </Text>
          </View>
          <View style={style.paragraph}>
            <Text style={[style.enumeration]}>12</Text>
            <View
                style={{
                  flexShrink: 1,
                  flexDirection: "column",
                }}
            >
              <Text style={[style.bodyText]}>
                <Text style={[style.titleText]}>Pas de garantie.</Text>
                &nbsp;L'Application sous licence vous est fournie " telle quelle ", et la
                Province décline toute représentation, garantie, condition,
                obligations et responsabilités de toute nature, qu'elles soient expresses ou
                expresse ou implicite, en relation avec l'application sous licence, notamment
                sans limitation, les garanties implicites en ce qui concerne
                la qualité marchande, la qualité satisfaisante, l'aptitude à un usage particulier
                particulier et de non-violation. Sans limiter la nature générale
                générale de la phrase précédente, la Province ne déclare ni ne garantit que
                garantie que :
              </Text>
              <Text style={[style.bodyText, { marginTop: 10 }]}>
                (a) l'application sous licence sera disponible ;
              </Text>
              <Text style={[style.bodyText, { marginTop: 10 }]}>
                (b) votre utilisation de l'Application sous licence sera opportune,
                ininterrompue ou sans erreur ;
              </Text>
              <Text style={[style.bodyText, { marginTop: 10 }]}>
                (c) toute erreur dans l'application sous licence sera corrigée ; ou
              </Text>
              <Text style={[style.bodyText, { marginTop: 10 }]}>
                (d) l'Application sous licence répondra à vos attentes et à vos
                exigences.
              </Text>
              <Text style={[style.bodyText, { marginTop: 10 }]}>
                Les Parties reconnaissent qu'Apple n'a aucune obligation de garantie
                en ce qui concerne l'Application sous Licence.
              </Text>
            </View>
          </View>

          <View style={style.paragraph}>
            <Text style={[style.enumeration]}>13</Text>
            <View
                style={{
                  flexShrink: 1,
                  flexDirection: "column",
                }}
            >
              <Text style={[style.bodyText]}>
                <Text style={[style.titleText]}>Limitation de la responsabilité.</Text>
                &nbsp;Dans la mesure maximale permise par la loi applicable, en aucun cas
                en aucun cas, la Province ne sera responsable envers toute personne ou entité
                pour les pertes, réclamations, blessures ou dommages directs, indirects, spéciaux
                d'autres pertes, réclamations, blessures ou dommages, qu'ils soient prévisibles ou
                prévisibles ou imprévisibles (y compris, sans s'y limiter, les demandes de dommages et intérêts pour
                perte de profits ou d'opportunités commerciales, l'utilisation ou la mauvaise
                l'incapacité d'utiliser l'Application sous licence, les interruptions,
                suppression ou corruption de fichiers, perte de programmes ou d'informations,
                d'informations, d'erreurs, de défauts ou de retards) découlant de ou liés de quelque manière que ce soit
                l'utilisation de l'Application sous Licence et qu'elle soit fondée sur un contrat
                contrat, un délit, une responsabilité stricte ou toute autre théorie juridique. La phrase précédente
                La phrase précédente s'appliquera même si la Province a été
                spécifiquement informée de la possibilité de telles pertes, réclamations, blessures ou dommages,
                préjudice ou dommage.
              </Text>
              <Text style={[style.bodyText, { marginTop: 20 }]}>
                Les Parties reconnaissent qu'Apple n'est pas responsable de : (a)
                de traiter toute réclamation de votre part ou de celle d'un tiers de quelque nature que ce soit
                de quelque nature que ce soit, relatives à l'Application sous Licence ; ou (b) votre
                possession et/ou l'utilisation de l'Application sous Licence.
              </Text>
            </View>
          </View>
          <View style={style.paragraph}>
            <Text style={[style.enumeration]}>14</Text>
            <Text style={[style.bodyText]}>
              <Text style={[style.titleText]}>Revendications en matière de propriété intellectuelle.</Text>
              &nbsp;L?application sous licence est la propri?t ? de la province ou est utilis?e par la province sous licence.
              la province sous licence. Les parties reconnaissent que, dans le cas
              tiers qui prétendrait que l'Application sous licence ou votre possession et/ou
              l'Application sous licence ou votre possession et/ou utilisation de l'Application sous
              droits de propriété intellectuelle de ce tiers, la Province, et non pas
              Apple, est seule responsable de l'enquête, de la défense, du règlement et de l'acquittement d'une telle réclamation,
              défense, du règlement et de l'acquittement d'une telle réclamation. Dans le cas d'une telle
              réclamation, la Province se réserve le droit de remplacer toute partie de l'application sous
              l'application sous licence qui violerait les droits de propriété intellectuelle d'un tiers.
              droits de propriété intellectuelle d'un tiers.
            </Text>
          </View>
          <View style={style.paragraph}>
            <Text style={[style.enumeration]}>15</Text>
            <Text style={[style.bodyText]}>
              <Text style={[style.titleText]}>Indemnisation.</Text>
              &nbsp;YVous acceptez d'indemniser, de défendre et de dégager de toute responsabilité la Province
              et tous ses préposés, employés et mandataires respectifs contre
              de toutes les réclamations, demandes, obligations, pertes, responsabilités, coûts ou
              coûts, dettes et dépenses (y compris, mais sans s'y limiter, les frais juridiques
              frais juridiques raisonnables) découlant : (a) de votre utilisation de l'application sous licence ; ou (b) de votre violation de toute disposition du présent accord.
              de votre violation de toute disposition du présent EULA.
            </Text>
          </View>
          <View style={style.paragraph}>
            <Text style={[style.enumeration]}>16</Text>
            <Text style={[style.bodyText]}>
              <Text style={[style.titleText]}>Vie privée.</Text>
              &nbsp;Vous consentez à la collecte par l'Application sous licence d'une
              confirmation par votre appareil qu'il a été déverrouillé en utilisant les
              fonctions de sécurité spécifiques à votre appareil. Cette information, ainsi que votre
              contenu, sont stockées localement sur votre appareil et ne sont pas accessibles à la province par le biais de l'application sous licence.
              la Province par l'intermédiaire de l'Application sous licence. Les consentements fournis
              Les consentements que vous donnez dans le présent article seront maintenus jusqu'à ce que vous les
              que vous ne les révoquiez par écrit aux coordonnées indiquées à l'article 11.
              l'article 11, auquel cas le présent contrat de licence d'utilisateur prendra fin immédiatement
              conformément à l'article 9.
            </Text>
          </View>

          <View style={style.paragraph}>
            <Text style={[style.enumeration]}>17</Text>
            <Text style={[style.bodyText]}>
              <Text style={[style.titleText]}>Sites Web de tiers.</Text>
              &nbsp;Vous reconnaissez que : (a) l'Application sous licence peut inclure
              liens vers des sites web de tiers ; (b) lorsque vous vous connectez à un site web de tiers
              site web d'un tiers, vous pouvez être soumis aux conditions d'utilisation et/ou à la politique de
              conditions d'utilisation et/ou à la politique de confidentialité, le cas échéant, de ce site web tiers ; et (c) la Province
              ne cautionne pas le contenu des sites Web de tiers et n'est pas
              et n'est pas responsable des conditions d'utilisation, des politiques de confidentialité, des
              pratiques ou du contenu du site Web d'un tiers.
            </Text>
          </View>

          <View style={style.paragraph}>
            <Text style={[style.enumeration]}>18</Text>
            <Text style={[style.bodyText]}>
              <Text style={[style.titleText]}>
                Conditions d'accord avec des tiers.
              </Text>
              &nbsp;Vous pouvez avoir besoin de l'utilisation de services tiers pour
              d'utiliser l'Application sous licence (y compris les services de données sans fil), et
              vous acceptez de vous conformer à toutes les conditions de service applicables aux tiers
              tiers qui s'appliquent à vous lorsque vous utilisez l'Application sous licence.
            </Text>
          </View>
          <View style={style.paragraph}>
            <Text style={[style.enumeration]}>19</Text>
            <Text style={[style.bodyText]}>
              <Text style={[style.titleText]}>Conformité légale.</Text>
              &nbsp;Vous déclarez et garantissez que : (a) vous n'êtes pas situé dans une
              région qui fait l'objet d'un embargo du gouvernement américain ou qui a été
              ou qui a été désignée par le gouvernement américain comme une région " soutenant le terrorisme " ; et
              (b) que vous ne figurez pas sur une liste de parties interdites ou restreintes du
              parties interdites ou restreintes.
            </Text>
          </View>
          <View style={style.paragraph}>
            <Text style={[style.enumeration]}>20</Text>
            <Text style={[style.bodyText]}>
              <Text style={[style.titleText]}>
                Modifications de l'application sous licence et/ou des conditions.
              </Text>
              &nbsp;La Province peut à tout moment, à sa seule discrétion et sans préavis direct
              sans préavis direct : (a) interrompre l'application sous licence ; ou
              licence ; ou (b) apporter des modifications à l'application sous licence et/ou au présent CLUF.
              le présent CLUF. En continuant à utiliser l'Application sous Licence, vous serez
              licence, vous serez considéré comme ayant accepté toutes les modifications apportées au EULA.
            </Text>
          </View>
          <View style={style.paragraph}>
            <Text style={[style.enumeration]}>21</Text>
            <Text style={[style.bodyText]}>
              <Text style={[style.titleText]}>Général.</Text>
              &nbsp;Le présent EULA et, le cas échéant, les conditions supplémentaires référencées
              dans les présentes conditions, constituent l'intégralité de l'entente entre vous et la
              Province en ce qui concerne l'objet du présent ALUF. Les titres de
              Les titres des présentes conditions sont insérés à des fins de commodité uniquement
              et ne seront pas utilisés pour interpréter une disposition du présent contrat de
              CLUF. Si une disposition du présent EULA est invalide, illégale ou inapplicable, elle
              illégale ou inapplicable, cette disposition sera supprimée du présent EULA et toutes les autres dispositions resteront pleinement en vigueur.
              et toutes les autres dispositions resteront en vigueur et de plein effet. Le présent EULA
              sera régi et interprété conformément aux lois de la province de la Colombie
              province de la Colombie-Britannique et aux lois applicables du Canada. En
              En utilisant l'Application sous licence, vous consentez à la juridiction
              exclusive des tribunaux de la province de Colombie-Britannique, siégeant à Victoria
              Colombie-Britannique, siégeant à Victoria, pour l'audition de tout différend
              litige découlant de ou lié au présent CLUF et à son objet.
            </Text>
          </View>
          <View style={[style.controls]}>
            <CheckBoxRow
                title={t("Terms.Attestation")}
                accessibilityLabel={t("Terms.IAgree")}
                testID={testIdWithKey("IAgree")}
                checked={checked}
                onPress={() => setChecked(!checked)}
            />
            <View style={[{ paddingTop: 10 }]}>
              <Button
                  title={t("Global.Continue")}
                  accessibilityLabel={t("Global.Continue")}
                  testID={testIdWithKey("Continue")}
                  disabled={!checked}
                  onPress={onSubmitPressed}
                  buttonType={ButtonType.Primary}
              />
            </View>
            <View style={[{ paddingTop: 10 }]}>
              <Button
                  title={t("Global.Back")}
                  accessibilityLabel={t("Global.Back")}
                  testID={testIdWithKey("Back")}
                  onPress={onBackPressed}
                  buttonType={ButtonType.Secondary}
              />
            </View>
          </View>
        </ScrollView>
      </View>
  );
};

export default Terms;
