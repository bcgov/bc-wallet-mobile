import { useNavigation } from '@react-navigation/core'
import { StackNavigationProp } from '@react-navigation/stack'
import {
  Button,
  ButtonType,
  CheckBoxRow,
  InfoTextBox,
  DispatchAction,
  AuthenticateStackParams,
  Screens,
  testIdWithKey,
  useTheme,
  useStore,
} from 'aries-bifold'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, View, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const appleTermsUrl = 'https://www.apple.com/legal/internet-services/itunes/us/terms.html'
const bcWalletHomeUrl = 'https://www2.gov.bc.ca/gov/content/governments/government-id/bc-wallet'
const digitalTrustHomeUrl = 'https://digital.gov.bc.ca/digital-trust/'
const bcWebPrivacyUrl = 'https://www2.gov.bc.ca/gov/content/home/privacy'
const digitalWalletPrivacyUrl = 'https://www2.gov.bc.ca/gov/content/governments/government-id/bc-wallet/privacy'

const Terms: React.FC = () => {
  const [store, dispatch] = useStore()
  const [checked, setChecked] = useState(false)
  const { t } = useTranslation()
  const navigation = useNavigation<StackNavigationProp<AuthenticateStackParams>>()
  navigation.setOptions({ title: 'End User License Agreement' })
  const { ColorPallet, TextTheme } = useTheme()
  const style = StyleSheet.create({
    container: {
      backgroundColor: ColorPallet.brand.primaryBackground,
      padding: 20,
    },
    bodyText: {
      ...TextTheme.normal,
      flexShrink: 1,
    },
    titleText: {
      ...TextTheme.normal,
      textDecorationLine: 'underline',
    },
    controlsContainer: {
      marginTop: 'auto',
      marginBottom: 20,
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

  const onSubmitPressed = () => {
    dispatch({
      type: DispatchAction.DID_AGREE_TO_TERMS,
      payload: [{ DidAgreeToTerms: checked }],
    })

    navigation.navigate(Screens.CreatePin)
  }

  const onBackPressed = () => {
    //TODO:(jl) goBack() does not unwind the navigation stack but rather goes
    //back to the splash screen. Needs fixing before the following code will
    //work as expected.

    // if (nav.canGoBack()) {
    //   nav.goBack()
    // }

    navigation.navigate(Screens.Onboarding)
  }

  const openLink = async (url: string) => {
    // Only `https://` is allowed. Update manifest as needed.
    const supported = await Linking.canOpenURL(url)

    if (supported) {
      // Will open in device browser.
      await Linking.openURL(url)
    }
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']}>
      <ScrollView style={[style.container]}>
        <InfoTextBox>Please agree to the terms and conditions below before using this application.</InfoTextBox>
        <Text style={[style.bodyText, { marginTop: 20 }]}>
          The BC Wallet App (the “Licensed Application”) allows you (“You” or “you”) to store your verifiable
          credentials, which are digital credentials issued by third party issuers that you can use to prove something
          about yourself by presenting those credentials to another party who needs to verify those credentials. This
          End User License Agreement (“EULA”) sets out the terms and conditions that apply to you when you download
          and/or use the BC Wallet App. This EULA is a legal agreement between you, as the end user of the Licensed
          Application (“You” or “you”), and Her Majesty the Queen in Right of the Province of British Columbia (the
          “Province”). You may access the Licensed Application on either a Google or Apple mobile device. Some of the
          terms that follow reference Google or Apple, as applicable, and such references will apply only to the extent
          that you are accessing the Licensed Application through that particular platform. By indicating that you agree
          to this EULA, and in consideration of the use of the Licensed Application, you agree to the following.
        </Text>
        <View style={style.paragraph}>
          <Text style={[style.enumeration]}>1</Text>
          <Text style={[style.bodyText]}>
            <Text style={[style.titleText]}>Parties.</Text>
            &nbsp;The parties to this EULA are you and the Province (collectively, the “Parties”). The Parties
            acknowledge that: (a) this EULA is concluded between the Parties only, and not with Apple Inc. (“Apple”);
            and (b) the Province, not Apple, is solely responsible for the Licensed Application and the content thereof.
          </Text>
        </View>

        <View style={style.paragraph}>
          <Text style={[style.enumeration]}>2</Text>
          <Text style={[style.bodyText]}>
            <Text style={[style.titleText]}>Ability to Accept EULA.</Text>
            &nbsp;To accept the terms and conditions of this EULA and to download and/or use the Licensed Application,
            you must be, and you represent and warrant that you are: (a) at least nineteen (19) years of age; or (b) if
            you are under 19, you have obtained the consent of your parent or guardian to accept this Agreement on your
            behalf, in which case your parent or guardian is responsible for your use of the Licensed Application. If
            you have not met these requirements, you must not access or use the Licensed Application.
          </Text>
        </View>

        <View style={style.paragraph}>
          <Text style={[style.enumeration]}>3</Text>
          <Text style={[style.bodyText]}>
            <Text style={[style.titleText]}>Device Protection.</Text>
            &nbsp;You are responsible for the security of any device you use in connection with the Licensed
            Application, including without limitation for using appropriate device protection (e.g., a complex
            password/passcode or biometric information) and for keeping your device protection confidential, as well as
            for using appropriate security protections (e.g., using up to date anti-virus/anti-spyware software and up
            to date operating system version, limiting password attempts and setting the device to lock after a short
            period of inactivity) in connection with your device.
          </Text>
        </View>
        <View style={style.paragraph}>
          <Text style={[style.enumeration]}>4</Text>
          <Text style={[style.bodyText]}>
            <Text style={[style.titleText]}>Access to Mobile Device.</Text>
            &nbsp;You must not allow any other individual or entity to access your device for the purpose of allowing
            that individual or entity to access or use the Licensed Application on your behalf.
          </Text>
        </View>
        <View style={style.paragraph}>
          <Text style={[style.enumeration]}>5</Text>
          <Text style={[style.bodyText]}>
            <Text style={[style.titleText]}>Application Ownership.</Text>
            &nbsp;The Licensed Application, including without limitation trademarks, trade names, logos, domain names,
            images, graphics, graphical user interface elements and designs, in any form or medium whatsoever, are owned
            by the Province or its licensors and are protected by copyright, patent, trademark and other laws protecting
            intellectual property rights.
          </Text>
        </View>
        <View style={style.paragraph}>
          <Text style={[style.enumeration]}>6</Text>
          <Text style={[style.bodyText]}>
            <Text style={[style.titleText]}>Content Ownership.</Text>
            &nbsp;The information and works made available, displayed or transmitted by You in connection with the
            Licensed Application, including your verifiable credentials (collectively, the “Content”) are owned by You
            and are protected by copyright, patent, trademark and other laws protecting intellectual property rights.
          </Text>
        </View>
        <View style={style.paragraph}>
          <Text style={[style.enumeration]}>7</Text>
          <Text style={[style.bodyText]}>
            <Text style={[style.titleText]}>Third Party Beneficiary.</Text>
            &nbsp;The Parties acknowledge and agree that: (a) Apple, and Apple's subsidiaries, are third party
            beneficiaries of this EULA; and (b) upon your acceptance of the terms and conditions of the EULA, Apple will
            have the right (and will be deemed to have accepted the right) to enforce the EULA against you as a
            third-party beneficiary thereof.
          </Text>
        </View>
        <View style={style.paragraph}>
          <Text style={[style.enumeration]}>8</Text>
          <Text style={[style.bodyText]}>
            <Text style={[style.titleText]}>License.</Text>
            &nbsp;The Province hereby grants to you a non-exclusive, royalty-free, non-transferable and, subject to
            section 9 of this EULA, perpetual license to perform, use and display the Licensed Application on either
            Google or Apple branded products, provided that usage on any Apple branded products must be products that
            you either own or control and as permitted by the Usage Rules set forth in the Apple Media Services Terms
            and Conditions located at{'\n'}
            <Text style={style.link} onPress={() => openLink(appleTermsUrl)}>
              https://www.apple.com/legal/internet-services/itunes/us/terms.html
            </Text>
            {'\n'}
            (or such other URL as Apple may designate) (the “App Store Terms”), as may be modified by Apple from time to
            time (the “License”). Except as provided in the App Store Terms (which does permit Licensed Applications to
            be accessed, acquired, and used by other accounts associated with the purchaser via Family Sharing or volume
            purchasing), you may not distribute or make the Licensed Application available over a network where it could
            be used by multiple devices at the same time. If you sell your Apple branded product to a third party, you
            must first remove the Licensed Application from that Apple branded product. For greater certainty, you may
            not: (a) transfer, redistribute or sublicense the Licensed Application; or (b) copy (except as permitted by
            this License and the Usage Rules), reverse-engineer, disassemble, attempt to derive the source code of,
            modify, or create derivative works of the Licensed Application, any updates, upgrades or any part of the
            Licensed Application (except as and only to the extent that any foregoing restriction is prohibited by
            applicable law or to the extent as may be permitted by the licensing terms governing use of any open-sourced
            components included with the Licensed Application).
          </Text>
        </View>
        <View style={style.paragraph}>
          <Text style={[style.enumeration]}>9</Text>
          <Text style={[style.bodyText]}>
            <Text style={[style.titleText]}>Termination.</Text>
            &nbsp;The License will terminate automatically in the event that you fail to comply with any of the terms
            and conditions of this EULA or if any of your representations or warranties are or become inaccurate or
            untruthful. The Province also reserves the right to terminate this License for any reason, in its sole
            discretion. In the event of termination of this License you must: (a) immediately stop using the Licensed
            Application; and (b) delete or destroy all copies of the Licensed Application in your possession or under
            your control.
          </Text>
        </View>

        <View style={style.paragraph}>
          <Text style={[style.enumeration]}>10</Text>
          <View
            style={{
              flexShrink: 1,
              flexDirection: 'column',
            }}
          >
            <Text style={[style.bodyText]}>
              <Text style={[style.titleText]}>Acceptable Use.</Text>
              &nbsp;You must not take any action in connection with your use of the Licensed Application that would
              jeopardize the security, integrity and/or availability of the Licensed Application, including, without
              limitation:
            </Text>

            <Text style={[style.bodyText, { marginTop: 10 }]}>
              (a) using the Licensed Application for any unlawful or inappropriate purpose;
            </Text>
            <Text style={[style.bodyText, { marginTop: 10 }]}>
              (b) tampering with any portion of the Licensed Application;
            </Text>
            <Text style={[style.bodyText, { marginTop: 10 }]}>
              (c) using the Licensed Application to transmit any virus or other harmful or destructive computer code,
              files or programs or to conduct hacking and/or intrusion activities;
            </Text>
            <Text style={[style.bodyText, { marginTop: 10 }]}>
              (d) attempting to circumvent or subvert any security measure associated with the Licensed Application;
            </Text>
            <Text style={[style.bodyText, { marginTop: 10 }]}>
              (e) taking any action that might reasonably be construed as likely to adversely affect other users of the
              Licensed Application; or
            </Text>
            <Text style={[style.bodyText, { marginTop: 10 }]}>
              (f) removing or altering any proprietary symbol or notice, including any copyright notice, trademark or
              logo, displayed in connection with the Licensed Application.
            </Text>
          </View>
        </View>
        <View style={style.paragraph}>
          <Text style={[style.enumeration]}>11</Text>
          <Text style={[style.bodyText]}>
            <Text style={[style.titleText]}>Maintenance and Support.</Text>
            &nbsp;The Parties acknowledge that: (a) the Province may, in its sole discretion, provide maintenance and
            support of the Licensed Application, including troubleshooting, updates and modifications (the “Support
            Services”); (b) the Province is solely responsible for the provision of Support Services, if any; and (c)
            Apple has no obligation whatsoever to furnish any maintenance and support services with respect to the
            Licensed Application. All questions respecting the Support Services, and all general inquiries respecting
            the Licensed Application, should be directed to: Product Owner, BC Wallet, ditrust@gov.bc.ca, 4000 Seymour
            Place, Victoria, BC, V8W 9V1.
          </Text>
        </View>
        <View style={style.paragraph}>
          <Text style={[style.enumeration]}>12</Text>
          <View
            style={{
              flexShrink: 1,
              flexDirection: 'column',
            }}
          >
            <Text style={[style.bodyText]}>
              <Text style={[style.titleText]}>No Warranty.</Text>
              &nbsp;The Licensed Application is provided to you “as is”, and the Province disclaims all representations,
              warranties, conditions, obligations and liabilities of any kind, whether express or implied, in relation
              to the Licensed Application, including without limitation implied warranties with respect to
              merchantability, satisfactory quality, fitness for a particular purpose and non-infringement. Without
              limiting the general nature of the previous sentence, the Province does not represent or warrant that:
            </Text>
            <Text style={[style.bodyText, { marginTop: 10 }]}>(a) the Licensed Application will be available;</Text>
            <Text style={[style.bodyText, { marginTop: 10 }]}>
              (b) your use of the Licensed Application will be timely, uninterrupted or error free;
            </Text>
            <Text style={[style.bodyText, { marginTop: 10 }]}>
              (c) any errors in the Licensed Application will be corrected; or
            </Text>
            <Text style={[style.bodyText, { marginTop: 10 }]}>
              (d) the Licensed Application will meet your expectations and requirements.
            </Text>
            <Text style={[style.bodyText, { marginTop: 10 }]}>
              The Parties acknowledge that Apple has no warranty obligation whatsoever with respect to the Licensed
              Application.
            </Text>
          </View>
        </View>

        <View style={style.paragraph}>
          <Text style={[style.enumeration]}>13</Text>
          <View
            style={{
              flexShrink: 1,
              flexDirection: 'column',
            }}
          >
            <Text style={[style.bodyText]}>
              <Text style={[style.titleText]}>Limitation of Liability.</Text>
              &nbsp;To the maximum extent permitted by applicable law, under no circumstances will the Province be
              liable to any person or entity for any direct, indirect, special, incidental, consequential or other loss,
              claim, injury or damage, whether foreseeable or unforeseeable (including without limitation claims for
              damages for loss of profits or business opportunities, use or misuse of, or inability to use, the Licensed
              Application, interruptions, deletion or corruption of files, loss of programs or information, errors,
              defects or delays) arising out of or in any way connected with your use of the Licensed Application and
              whether based on contract, tort, strict liability or any other legal theory. The previous sentence will
              apply even if the Province has been specifically advised of the possibility of any such loss, claim,
              injury or damage.
            </Text>
            <Text style={[style.bodyText, { marginTop: 20 }]}>
              The Parties acknowledge that Apple is not responsible for: (a) addressing any claims by you or any third
              party of any nature whatsoever relating to the Licensed Application; or (b) your possession and/or use of
              the Licensed Application.
            </Text>
          </View>
        </View>
        <View style={style.paragraph}>
          <Text style={[style.enumeration]}>14</Text>
          <Text style={[style.bodyText]}>
            <Text style={[style.titleText]}>Intellectual Property Claims.</Text>
            &nbsp;The Licensed Application is owned by the Province or used by the Province under license. The Parties
            acknowledge that, in the event of any third-party claim that the Licensed Application or your possession
            and/or use of the Licensed Application infringes that third party's intellectual property rights, the
            Province, and not Apple, is solely responsible for the investigation, defence, settlement and discharge of
            any such claim. In the event of any such claim, the Province reserves the right to replace any portion of
            the Licensed Application that allegedly infringes a third party's intellectual property rights.
          </Text>
        </View>
        <View style={style.paragraph}>
          <Text style={[style.enumeration]}>15</Text>
          <Text style={[style.bodyText]}>
            <Text style={[style.titleText]}>Indemnification.</Text>
            &nbsp;You agree to indemnify, defend and hold harmless the Province and all of its respective servants,
            employees and agents from and against all claims, demands, obligations, losses, liabilities, costs or debt,
            and expenses (including but not limited to reasonable legal fees) arising from: (a) your use of the Licensed
            Application; or (b) your violation of any provision of this EULA.
          </Text>
        </View>
        <View style={style.paragraph}>
          <Text style={[style.enumeration]}>16</Text>
          <Text style={[style.bodyText]}>
            <Text style={[style.titleText]}>Privacy.</Text>
            &nbsp;If you visit the website for the Licensed Application at{' '}
            <Text style={[style.link]} onPress={() => openLink(bcWalletHomeUrl)}>
              {bcWalletHomeUrl}
            </Text>{' '}
            including to access the 'help' feature for the Licensed Application or related content at{' '}
            <Text style={[style.link]} onPress={() => openLink(digitalTrustHomeUrl)}>
              {digitalTrustHomeUrl}
            </Text>
            , certain information will be collected from you as outlined in the{' '}
            <Text style={[style.link]} onPress={() => openLink(bcWebPrivacyUrl)}>
              Province's Privacy Statement for government websites
            </Text>{' '}
            Certain information is also collected by the Licensed Application as outlined in the{' '}
            <Text style={[style.link]} onPress={() => openLink(digitalWalletPrivacyUrl)}>
              BC Wallet App Privacy Policy
            </Text>{' '}
            (the “Privacy Policy”), which is incorporated by reference into and forms part of this EULA. You consent to
            the collection by the Licensed Application of this information which, along with your Content, is stored
            locally on your device and is not accessible to the Province except in circumstances where you choose to
            provide information to the Province, as outlined in the Privacy Policy. Any information you provide to the
            Province that is “personal information”, as defined in the BC Freedom of Information and Protection of
            Privacy Act (the “Act”), is collected by the Province under section 26(c) of the Act for the purposes set
            out in the Privacy Policy. Any questions about the collection of such information can be directed to the
            contact set out in section 11. The consents provided by you as set out in this section will continue unless
            and until revoked by you in writing to the contact set out in section 11, in which case this EULA will
            terminate immediately pursuant to section 9.
          </Text>
        </View>

        <View style={style.paragraph}>
          <Text style={[style.enumeration]}>17</Text>
          <Text style={[style.bodyText]}>
            <Text style={[style.titleText]}>Third Party Web Sites.</Text>
            &nbsp;You acknowledge that: (a) the Licensed Application may include links to third party web sites; (b)
            when you link to a third party web site, you may be subject to the terms of use and/or the privacy policy,
            if any, of that third party web site; and (c) the Province does not endorse the content of any third party
            web sites and is not responsible for the terms of use, privacy policies, practices or content of any third
            party web site.
          </Text>
        </View>

        <View style={style.paragraph}>
          <Text style={[style.enumeration]}>18</Text>
          <Text style={[style.bodyText]}>
            <Text style={[style.titleText]}>Third Party Terms of Agreement.</Text>
            &nbsp;You may require the use of third party services in order to use the Licensed Application (including
            wireless data services), and you agree to comply with any applicable third party terms of service that apply
            to you when using the Licensed Application.
          </Text>
        </View>
        <View style={style.paragraph}>
          <Text style={[style.enumeration]}>19</Text>
          <Text style={[style.bodyText]}>
            <Text style={[style.titleText]}>Legal Compliance.</Text>
            &nbsp;You represent and warrant that: (a) you are not located in a region that is subject to a U.S.
            government embargo, or that has been designated by the U.S. government as a “terrorist supporting” region;
            and (b) you are not listed on any U.S. government list of prohibited or restricted parties.
          </Text>
        </View>
        <View style={style.paragraph}>
          <Text style={[style.enumeration]}>20</Text>
          <Text style={[style.bodyText]}>
            <Text style={[style.titleText]}>Changes to Licensed Application and/or Terms.</Text>
            &nbsp;The Province may at any time, in its sole discretion and without direct notice to you: (a) discontinue
            the Licensed Application; or (b) make changes to the Licensed Application and/or this EULA, including the
            Privacy Policy. By continuing to use the Licensed Application, you will be conclusively deemed to have
            accepted any such changes.
          </Text>
        </View>
        <View style={style.paragraph}>
          <Text style={[style.enumeration]}>21</Text>
          <Text style={[style.bodyText]}>
            <Text style={[style.titleText]}>General.</Text>
            &nbsp;This EULA and, as applicable, the additional terms referenced in these Terms, are the entire agreement
            between you and the Province with respect to the subject matter of this EULA. The headings in these Terms
            are inserted for convenience only and will not be used in interpreting or construing any provision of this
            EULA. If any provision of this EULA is invalid, illegal or unenforceable, that provision will be severed
            from this EULA and all other provisions will remain in full force and effect. This EULA will be governed by
            and construed in accordance with the laws of the province of British Columbia and the applicable laws of
            Canada. By using the Licensed Application, you consent to the exclusive jurisdiction and venue of the courts
            of the province of British Columbia, sitting in Victoria, for the hearing of any dispute arising from or
            related to this EULA and its subject matter.
          </Text>
        </View>
        <View style={[style.controlsContainer]}>
          {!(store.onboarding.didAgreeToTerms && store.authentication.didAuthenticate) && (
            <>
              <CheckBoxRow
                title={t('Terms.Attestation')}
                accessibilityLabel={t('Terms.IAgree')}
                testID={testIdWithKey('IAgree')}
                checked={checked}
                onPress={() => setChecked(!checked)}
              />
              <View style={[{ paddingTop: 10 }]}>
                <Button
                  title={t('Global.Continue')}
                  accessibilityLabel={t('Global.Continue')}
                  testID={testIdWithKey('Continue')}
                  disabled={!checked}
                  onPress={onSubmitPressed}
                  buttonType={ButtonType.Primary}
                />
              </View>
              <View style={[{ paddingTop: 10, marginBottom: 20 }]}>
                <Button
                  title={t('Global.Back')}
                  accessibilityLabel={t('Global.Back')}
                  testID={testIdWithKey('Back')}
                  onPress={onBackPressed}
                  buttonType={ButtonType.Secondary}
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default Terms
