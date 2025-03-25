import {
  Button,
  ButtonType,
  InfoBox,
  InfoBoxType,
  DispatchAction,
  testIdWithKey,
  useTheme,
  useStore,
} from '@hyperledger/aries-bifold-core'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { openLink } from '../helpers/utils'

const appleTermsUrl = 'https://www.apple.com/legal/internet-services/itunes/us/terms.html'
const bcWalletHomeUrl = 'https://www2.gov.bc.ca/gov/content/governments/government-id/bc-wallet'
const digitalTrustHomeUrl = 'https://digital.gov.bc.ca/digital-trust/'
const bcWebPrivacyUrl = 'https://www2.gov.bc.ca/gov/content/home/privacy'
const digitalWalletPrivacyUrl = 'https://www2.gov.bc.ca/gov/content/governments/government-id/bc-wallet/privacy'

export const TermsVersion = '2'

const Terms: React.FC = () => {
  const [store, dispatch] = useStore()
  const { t } = useTranslation()
  const { ColorPallet, TextTheme } = useTheme()
  const agreedToPreviousTerms = store.onboarding.didAgreeToTerms && store.onboarding.didAgreeToTerms !== TermsVersion
  const style = StyleSheet.create({
    safeAreaView: {
      flex: 1,
    },
    scrollViewContentContainer: {
      padding: 20,
      flexGrow: 1,
    },
    footer: {
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    bodyText: {
      ...TextTheme.normal,
      flexShrink: 1,
    },
    titleText: {
      ...TextTheme.normal,
      textDecorationLine: 'underline',
    },
    paragraph: {
      flexDirection: 'row',
      marginTop: 20,
    },
    enumeration: {
      ...TextTheme.normal,
      marginRight: 25,
    },
    link: {
      ...TextTheme.normal,
      color: ColorPallet.brand.link,
      textDecorationLine: 'underline',
      fontWeight: 'bold',
    },
  })

  const onSubmitPressed = useCallback(() => {
    dispatch({
      type: DispatchAction.DID_AGREE_TO_TERMS,
      payload: [{ DidAgreeToTerms: TermsVersion }],
    })
  }, [dispatch])

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={style.safeAreaView}>
      <ScrollView contentContainerStyle={style.scrollViewContentContainer}>
        {agreedToPreviousTerms && (
          <InfoBox
            notificationType={InfoBoxType.Info}
            description={
              'BC Wallet has updated the end user license agreement. To continue using BC Wallet, please review and accept the updated terms.'
            }
            title={'Terms of use update'}
          ></InfoBox>
        )}
        <Text style={[style.bodyText, { marginTop: 20 }]}>
          This End User License Agreement (“EULA”) is a legal agreement between you, as the end user of the BC Wallet
          Application (“You” or “you”), and His Majesty the King in Right of the Province of British Columbia (the
          “Province”). This EULA sets out the terms and conditions that apply to you when you download and/or use the BC
          Wallet App (“BC Wallet”). BC Wallet allows you to both (a) store your digital credentials, which are proof of
          qualification, affiliation, competence, or clearance issued by the Province or third party issuers that you
          can present to another party who needs to verify those credentials; and (b) verify the digital credentials of
          another user of BC Wallet or similar credential storage application. You may access BC Wallet on either the
          Google Play Store or the Apple App Store. Some of the terms that follow reference Google or Apple, as
          applicable, and such references will apply only to the extent that you have accessed and downloaded BC Wallet
          to your mobile device through that particular platform.
        </Text>
        <Text style={[style.bodyText, TextTheme.bold, { marginTop: 20 }]}>EULA Terms</Text>
        <Text style={[style.bodyText, { marginTop: 20 }]}>
          By indicating that you agree to this EULA, and in consideration of the use of BC Wallet, you agree to the
          following.
        </Text>
        <View style={style.paragraph}>
          <Text style={style.enumeration}>1</Text>
          <Text style={style.bodyText}>
            <Text style={style.titleText}>Parties.</Text>
            &nbsp;The parties to this EULA are you and the Province (collectively, the “Parties”). The Parties
            acknowledge that: (a) this EULA is concluded between the Parties only, and not with Apple Inc. (“Apple”);
            and (b) the Province, not Apple, is solely responsible for BC Wallet.
          </Text>
        </View>

        <View style={style.paragraph}>
          <Text style={style.enumeration}>2</Text>
          <Text style={style.bodyText}>
            <Text style={style.titleText}>Ability to Accept EULA.</Text>
            &nbsp;To accept the terms and conditions of this EULA and to download and/or use BC Wallet, you must be, and
            you represent and warrant that you are: (a) at least nineteen (19) years of age; or (b) if you are under 19,
            you have obtained the consent of your parent or guardian to accept this EULA on your behalf, in which case
            your parent or guardian is responsible for your use of BC Wallet. If you have not met these requirements,
            you must not access or use BC Wallet.
          </Text>
        </View>

        <View style={style.paragraph}>
          <Text style={style.enumeration}>3</Text>
          <Text style={style.bodyText}>
            <Text style={style.titleText}>Device Protection.</Text>
            &nbsp;You are responsible for the security of any device you use in connection with BC Wallet, including
            without limitation for using appropriate device protection (e.g., a complex password/passcode or biometric
            information) and for keeping your device protection confidential, as well as for using appropriate security
            protections (e.g., using up to date anti-virus/anti-spyware software and up to date operating system
            version, limiting password attempts and setting the device to lock after a short period of inactivity) in
            connection with your device.
          </Text>
        </View>
        <View style={style.paragraph}>
          <Text style={style.enumeration}>4</Text>
          <Text style={style.bodyText}>
            <Text style={style.titleText}>Access to Application.</Text>
            &nbsp;You must not allow any other individual or entity to access or use BC Wallet on your behalf.
          </Text>
        </View>
        <View style={style.paragraph}>
          <Text style={style.enumeration}>5</Text>
          <Text style={style.bodyText}>
            <Text style={style.titleText}>Application Ownership.</Text>
            &nbsp;BC Wallet, including without limitation trademarks, trade names, logos, domain names, images,
            graphics, graphical user interface elements and designs, in any form or medium whatsoever, are owned by the
            Province or its licensors and are protected by copyright, patent, trademark and other laws protecting
            intellectual property rights.
          </Text>
        </View>
        <View style={style.paragraph}>
          <Text style={style.enumeration}>6</Text>
          <Text style={style.bodyText}>
            <Text style={style.titleText}>Ownership.</Text>
            &nbsp;Digital credentials are owned by the party identified in the agreement between the issuer and the
            holder concerning the credential. Any other information and works stored, made available, displayed or
            transmitted by you in connection with BC Wallet, including any information relating to credentials you have
            verified (collectively, “Content”) are, between the Province and you, owned by you and are protected by
            copyright, patent, trademark and other laws protecting intellectual property rights. Subject to this EULA,
            you grant the Province a limited license to access, use, process, copy, distribute, perform, and display
            your Content (including reformatting and modification for display) solely to the extent necessary to provide
            BC Wallet to you. You are solely responsible for the accuracy, content and legality of your Content and you
            represent and warrant that you have all necessary intellectual property rights to grant the Province this
            limited license to use your Content. The Province has no obligation to monitor your Content.
          </Text>
        </View>
        <View style={style.paragraph}>
          <Text style={style.enumeration}>7</Text>
          <Text style={style.bodyText}>
            <Text style={style.titleText}>Third Party Beneficiary.</Text>
            &nbsp;The Parties acknowledge and agree that: (a) Apple, and Apple’s subsidiaries, are third party
            beneficiaries of this EULA; and (b) upon your acceptance of the terms and conditions of the EULA, Apple will
            have the right (and will be deemed to have accepted the right) to enforce the EULA against you as a
            third-party beneficiary thereof.
          </Text>
        </View>
        <View style={style.paragraph}>
          <Text style={style.enumeration}>8</Text>
          <Text style={style.bodyText}>
            <Text style={style.titleText}>License.</Text>
            &nbsp;The Province hereby grants to you a non-exclusive, royalty-free, non-transferable and, subject to
            section 9 of this EULA, perpetual license to perform, use and display BC Wallet on either Google or Apple
            branded products, provided that usage on any Apple branded products must be products that you either own or
            control and as permitted by the Usage Rules set forth in the Apple Media Services Terms and Conditions
            located at{'\n'}
            <Text style={style.link} onPress={useCallback(() => openLink(appleTermsUrl), [])}>
              https://www.apple.com/legal/internet-services/itunes/us/terms.html
            </Text>
            {'\n'}
            (or such other URL as Apple may designate) (the “App Store Terms”), as may be modified by Apple from time to
            time (the “License”). Except as provided in the App Store Terms (which does permit Licensed Applications to
            be accessed, acquired, and used by other accounts associated with the purchaser via Family Sharing or volume
            purchasing), you may not distribute or make BC Wallet available over a network where it could be used by
            multiple devices at the same time. If you sell your Apple branded product to a third party, you must first
            remove BC Wallet from that Apple branded product. For greater certainty, you may not: (a) transfer,
            redistribute or sublicense BC Wallet; or (b) copy (except as permitted by this License and the Usage Rules),
            reverse-engineer, disassemble, attempt to derive the source code of, modify, or create derivative works of
            BC Wallet, any updates, upgrades or any part of BC Wallet (except as and only to the extent that any
            foregoing restriction is prohibited by applicable law or to the extent as may be permitted by the licensing
            terms governing use of any open-sourced components included with BC Wallet).
          </Text>
        </View>
        <View style={style.paragraph}>
          <Text style={style.enumeration}>9</Text>
          <Text style={style.bodyText}>
            <Text style={style.titleText}>Termination.</Text>
            &nbsp;The License will terminate automatically in the event that you fail to comply with any of the terms
            and conditions of this EULA or if any of your representations or warranties are or become inaccurate or
            untruthful. The Province also reserves the right to terminate this License for any reason, in its sole
            discretion. In the event of termination of this License you must: (a) immediately stop using BC Wallet; and
            (b) delete or destroy all copies of BC Wallet in your possession or under your control.
          </Text>
        </View>

        <View style={style.paragraph}>
          <Text style={style.enumeration}>10</Text>
          <View
            style={{
              flexShrink: 1,
              flexDirection: 'column',
            }}
          >
            <Text style={style.bodyText}>
              <Text style={style.titleText}>Acceptable Use.</Text>
              &nbsp;You must not take any action in connection with your use of BC Wallet that would jeopardize the
              security, integrity and/or availability of BC Wallet, including, without limitation:
            </Text>

            <Text style={[style.bodyText, { marginTop: 10 }]}>
              (a) using the Licensed Application for any unlawful or inappropriate purpose;
            </Text>
            <Text style={[style.bodyText, { marginTop: 10 }]}>(b) tampering with any portion of BC Wallet;</Text>
            <Text style={[style.bodyText, { marginTop: 10 }]}>
              (c) using BC Wallet to transmit any virus or other harmful or destructive computer code, files or programs
              or to conduct hacking and/or intrusion activities;
            </Text>
            <Text style={[style.bodyText, { marginTop: 10 }]}>
              (d) attempting to circumvent or subvert any security measure associated with BC Wallet;
            </Text>
            <Text style={[style.bodyText, { marginTop: 10 }]}>
              (e) taking any action that might reasonably be construed as likely to adversely affect other users of BC
              Wallet; or
            </Text>
            <Text style={[style.bodyText, { marginTop: 10 }]}>
              (f) removing or altering any proprietary symbol or notice, including any copyright notice, trademark or
              logo, displayed in connection with BC Wallet.
            </Text>
          </View>
        </View>
        <View style={style.paragraph}>
          <Text style={style.enumeration}>11</Text>
          <Text style={style.bodyText}>
            <Text style={style.titleText}>Maintenance and Support.</Text>
            &nbsp;The Parties acknowledge that: (a) the Province may, in its sole discretion, provide maintenance and
            support of BC Wallet, including troubleshooting, updates and modifications (the “Support Services”); (b) the
            Province is solely responsible for the provision of Support Services, if any; and (c) Apple has no
            obligation whatsoever to furnish any maintenance and support services with respect to BC Wallet. All
            questions respecting the Support Services, and all general inquiries respecting BC Wallet, should be
            directed to: Product Owner, BC Wallet, ditrust@gov.bc.ca, 4000 Seymour Place, Victoria, BC, V8W 9V1.
          </Text>
        </View>
        <View style={style.paragraph}>
          <Text style={style.enumeration}>12</Text>
          <View
            style={{
              flexShrink: 1,
              flexDirection: 'column',
            }}
          >
            <Text style={style.bodyText}>
              <Text style={style.titleText}>Disclaimer of Warranty.</Text>
              &nbsp;BC Wallet is provided to you “as is” and the Province disclaims all representations, warranties,
              conditions, obligations and liabilities of any kind, whether express or implied, in relation to BC Wallet,
              including without limitation implied warranties with respect to merchantability, satisfactory quality,
              fitness for a particular purpose and non-infringement. Without limiting the general nature of the previous
              sentence, the Province does not represent or warrant that:
            </Text>
            <Text style={[style.bodyText, { marginTop: 10 }]}>(a) BC Wallet will be available;</Text>
            <Text style={[style.bodyText, { marginTop: 10 }]}>(b) the Content will be secure in all scenarios;</Text>
            <Text style={[style.bodyText, { marginTop: 10 }]}>
              (c) your use of BC Wallet will be timely, uninterrupted or error free;
            </Text>
            <Text style={[style.bodyText, { marginTop: 10 }]}>(d) any errors in BC Wallet will be corrected; or</Text>
            <Text style={[style.bodyText, { marginTop: 10 }]}>
              (e) BC Wallet will meet your expectations and requirements.
            </Text>
            <Text style={[style.bodyText, { marginTop: 10 }]}>
              The Parties acknowledge that Apple has no warranty obligation whatsoever with respect to BC Wallet.
            </Text>
          </View>
        </View>

        <View style={style.paragraph}>
          <Text style={style.enumeration}>13</Text>
          <View
            style={{
              flexShrink: 1,
              flexDirection: 'column',
            }}
          >
            <Text style={style.bodyText}>
              <Text style={style.titleText}>Limitation of Liability.</Text>
              &nbsp;To the maximum extent permitted by applicable law, under no circumstances will the Province be
              liable to any person or entity for any direct, indirect, special, incidental, consequential or other loss,
              claim, injury or damage, whether foreseeable or unforeseeable (including without limitation claims for
              damages for loss of profits or business opportunities, use or misuse of, or inability to use, BC Wallet,
              interruptions, deletion or corruption of files, loss of programs or information, errors, defects or
              delays) arising out of or in any way connected with your use of BC Wallet and whether based on contract,
              tort, strict liability or any other legal theory. The previous sentence will apply even if the Province
              has been specifically advised of the possibility of any such loss, claim, injury or damage.
            </Text>
            <Text style={[style.bodyText, { marginTop: 20 }]}>
              The Parties acknowledge that Apple is not responsible for: (a) addressing any claims by you or any third
              party of any nature whatsoever relating to BC Wallet; or (b) your possession and/or use of BC Wallet.
            </Text>
          </View>
        </View>
        <View style={style.paragraph}>
          <Text style={style.enumeration}>14</Text>
          <Text style={style.bodyText}>
            <Text style={style.titleText}>Intellectual Property Claims.</Text>
            &nbsp;BC Wallet is owned by the Province or used by the Province under license. The Parties acknowledge
            that, in the event of any third-party claim that BC Wallet or your possession and/or use of BC Wallet
            infringes that third party’s intellectual property rights, the Province, and not Apple, is solely
            responsible for the investigation, defence, settlement and discharge of any such claim. In the event of any
            such claim, the Province reserves the right to replace any portion of BC Wallet that allegedly infringes a
            third party’s intellectual property rights.
          </Text>
        </View>
        <View style={style.paragraph}>
          <Text style={style.enumeration}>15</Text>
          <Text style={style.bodyText}>
            <Text style={style.titleText}>Indemnification.</Text>
            &nbsp;You agree to indemnify, defend and hold harmless the Province and all of its respective servants,
            employees and agents from and against all claims, demands, obligations, losses, liabilities, costs or debt,
            and expenses (including but not limited to reasonable legal fees) arising from or related to: (a) your use
            of BC Wallet (b) your Content; or (c) your violation of any provision of this EULA.
          </Text>
        </View>
        <View style={style.paragraph}>
          <Text style={style.enumeration}>16</Text>
          <Text style={style.bodyText}>
            <Text style={style.titleText}>Privacy.</Text>
            &nbsp;If you visit the website for BC Wallet at{' '}
            <Text style={style.link} onPress={useCallback(() => openLink(bcWalletHomeUrl), [])}>
              {bcWalletHomeUrl}
            </Text>{' '}
            including to access the ‘help’ feature for BC Wallet or related content at{' '}
            <Text style={style.link} onPress={useCallback(() => openLink(digitalTrustHomeUrl), [])}>
              {digitalTrustHomeUrl}
            </Text>
            , certain information will be collected from you as outlined in the{' '}
            <Text style={style.link} onPress={useCallback(() => openLink(bcWebPrivacyUrl), [])}>
              Province’s Privacy Statement for government websites
            </Text>{' '}
            Certain information is also collected by BC Wallet as outlined in the{' '}
            <Text style={style.link} onPress={useCallback(() => openLink(digitalWalletPrivacyUrl), [])}>
              BC Wallet App Privacy Policy
            </Text>{' '}
            (the “Privacy Policy”), which is incorporated by reference into and forms part of this EULA. You consent to
            the collection by BC Wallet of this information which, along with your Content, is stored locally on your
            device and is not accessible to the Province except in circumstances where you choose to provide information
            to the Province, as outlined in the Privacy Policy. Any information you provide to the Province that is
            “personal information”, as defined in the BC Freedom of Information and Protection of Privacy Act (the
            “Act”), is collected by the Province under section 26(c) of the Act for the purposes set out in the Privacy
            Policy. Any questions about the collection of such information can be directed to the contact set out in
            section 11. The consents provided by you as set out in this section will continue unless and until revoked
            by you in writing to the contact set out in section 11, in which case this EULA will terminate immediately
            pursuant to section 9.
          </Text>
        </View>

        <View style={style.paragraph}>
          <Text style={style.enumeration}>17</Text>
          <Text style={style.bodyText}>
            <Text style={style.titleText}>Third Party Web Sites.</Text>
            &nbsp;You acknowledge that: (a) BC Wallet may include links to third party web sites; (b) when you link to a
            third party web site, you may be subject to the terms of use and/or the privacy policy, if any, of that
            third party web site; and (c) the Province does not endorse the content of any third party web sites and is
            not responsible for the terms of use, privacy policies, practices or content of any third party web site.
          </Text>
        </View>

        <View style={style.paragraph}>
          <Text style={style.enumeration}>18</Text>
          <Text style={style.bodyText}>
            <Text style={style.titleText}>Third Party Terms of Agreement.</Text>
            &nbsp;You may require the use of third party services in order to use BC Wallet (including wireless data
            services), and you agree to comply with any applicable third party terms of service that apply to you when
            using BC Wallet.
          </Text>
        </View>
        <View style={style.paragraph}>
          <Text style={style.enumeration}>19</Text>
          <Text style={style.bodyText}>
            <Text style={style.titleText}>Legal Compliance.</Text>
            &nbsp;You represent and warrant that: (a) you are not located in a region that is subject to a U.S.
            government embargo, or that has been designated by the U.S. government as a “terrorist supporting” region;
            and (b) you are not listed on any U.S. government list of prohibited or restricted parties.
          </Text>
        </View>
        <View style={style.paragraph}>
          <Text style={style.enumeration}>20</Text>
          <Text style={style.bodyText}>
            <Text style={style.titleText}>Changes to Licensed Application and/or Terms.</Text>
            &nbsp;The Province may at any time, in its sole discretion and without direct notice to you: (a) discontinue
            BC Wallet; or (b) make changes to BC Wallet and/or this EULA, including the Privacy Policy. By continuing to
            use BC Wallet, you will be conclusively deemed to have accepted any such changes.
          </Text>
        </View>
        <View style={[style.paragraph, { marginBottom: 30 }]}>
          <Text style={style.enumeration}>21</Text>
          <Text style={style.bodyText}>
            <Text style={style.titleText}>General.</Text>
            &nbsp;This EULA and, as applicable, the additional terms referenced in these Terms, are the entire agreement
            between you and the Province with respect to the subject matter of this EULA. The headings in these Terms
            are inserted for convenience only and will not be used in interpreting or construing any provision of this
            EULA. If any provision of this EULA is invalid, illegal or unenforceable, that provision will be severed
            from this EULA and all other provisions will remain in full force and effect. This EULA will be governed by
            and construed in accordance with the laws of the province of British Columbia and the applicable laws of
            Canada. By using BC Wallet, you consent to the exclusive jurisdiction and venue of the courts of the
            province of British Columbia, sitting in Victoria, for the hearing of any dispute arising from or related to
            this EULA and its subject matter.
          </Text>
        </View>
      </ScrollView>
      {!(store.onboarding.didAgreeToTerms === TermsVersion && store.authentication.didAuthenticate) && (
        <View style={style.footer}>
          <Button
            title={t('Global.Accept')}
            accessibilityLabel={t('Global.Accept')}
            testID={testIdWithKey('Accept')}
            onPress={onSubmitPressed}
            buttonType={ButtonType.Primary}
          />
        </View>
      )}
    </SafeAreaView>
  )
}

export default Terms
