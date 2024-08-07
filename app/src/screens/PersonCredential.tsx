import { useAgent } from '@credo-ts/react-hooks'
import {
  useStore,
  useTheme,
  Button,
  ButtonType,
  testIdWithKey,
  Link,
  Screens,
  NotificationStackParams,
} from '@hyperledger/aries-bifold-core'
import { StackScreenProps } from '@react-navigation/stack'
import React, { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View, TouchableOpacity, Linking, Platform, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'

import PersonIssuance1 from '../assets/img/PersonIssuance1.svg'
import PersonIssuance2 from '../assets/img/PersonIssuance2.svg'
import { openLink } from '../helpers/utils'
import { BCState } from '../store'

const links = {
  WhatIsPersonCredential: 'https://www2.gov.bc.ca/gov/content/governments/government-id/person-credential',
  WhereToUse: 'https://www2.gov.bc.ca/gov/content/governments/government-id/person-credential/where-person-cred',
  Help: 'https://www2.gov.bc.ca/gov/content/governments/government-id/person-credential#help',
} as const

type PersonProps = StackScreenProps<NotificationStackParams, Screens.CustomNotification>

const PersonCredential: React.FC<PersonProps> = ({ navigation }) => {
  const { agent } = useAgent()
  const [store] = useStore<BCState>()
  const [appInstalled, setAppInstalled] = useState<boolean>(false)
  const { ColorPallet, TextTheme } = useTheme()
  const { t } = useTranslation()

  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
    },
    pageContent: {
      flex: 1,
      flexGrow: 1,
    },
    credentialCardContainer: {
      marginVertical: 20,
      display: 'flex',
      alignItems: 'center',
    },
    button: {
      marginBottom: 15,
    },
    section: {
      backgroundColor: ColorPallet.brand.secondaryBackground,
      paddingVertical: 24,
      paddingHorizontal: 25,
      marginTop: 10,
      flexGrow: 1,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: 10,
      display: 'flex',
    },
    sectionSecondaryAction: {
      display: 'flex',
      alignItems: 'center',
      marginTop: 10,
    },
    sectionSeparator: {
      marginBottom: 10,
    },
    sectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexGrow: 1,
      paddingHorizontal: 25,
    },
    itemSeparator: {
      borderBottomWidth: 1,
      borderBottomColor: ColorPallet.brand.primaryBackground,
      marginHorizontal: 25,
    },
    link: {
      ...TextTheme.normal,
      color: TextTheme.normal.color,
      textAlign: 'left',
      textDecorationLine: 'none',
    },
    line: {
      height: 1,
      backgroundColor: ColorPallet.grayscale.lightGrey,
      marginVertical: 20,
    },
  })

  const isBCServicesCardInstalled = async () => {
    return await Linking.canOpenURL('ca.bc.gov.id.servicescard://')
  }

  useEffect(() => {
    isBCServicesCardInstalled().then((result) => {
      setAppInstalled(result)
    })
  }, [])

  const acceptPersonCredentialOffer = useCallback(() => {
    if (!agent || !store || !t) {
      return
    }

    navigation.replace('PersonCredentialLoading' as never, {} as never)
  }, [])

  const getBCServicesCardApp = useCallback(() => {
    setAppInstalled(true)
    const url =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/us/app/id1234298467'
        : 'https://play.google.com/store/apps/details?id=ca.bc.gov.id.servicescard'
    return Linking.openURL(url)
  }, [])

  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <ScrollView style={styles.pageContent}>
        <View style={styles.credentialCardContainer}>{appInstalled ? <PersonIssuance2 /> : <PersonIssuance1 />}</View>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text
              accessibilityRole={'header'}
              style={[
                TextTheme.headingThree,
                {
                  flexShrink: 1,
                  color: appInstalled ? ColorPallet.brand.primaryDisabled : TextTheme.headingThree.color,
                },
              ]}
            >
              {appInstalled ? t('PersonCredential.ServicesCardInstalled') : t('PersonCredential.InstallServicesCard')}
            </Text>
            {appInstalled && (
              <Icon
                name="check-circle"
                testID={testIdWithKey('AppInstalledIcon')}
                size={35}
                style={{ marginLeft: 10, color: ColorPallet.semantic.success }}
              />
            )}
          </View>
          {appInstalled ? null : (
            <View style={{ marginTop: 10 }}>
              <Button
                buttonType={ButtonType.Primary}
                onPress={getBCServicesCardApp}
                accessibilityLabel={t('PersonCredential.InstallApp')}
                testID={testIdWithKey('InstallApp')}
                title={t('PersonCredential.InstallApp')}
              />
              <TouchableOpacity
                onPress={() => setAppInstalled(true)}
                accessibilityLabel={t('PersonCredential.AppOnOtherDevice')}
                testID={testIdWithKey('AppOnOtherDevice')}
                style={styles.sectionSecondaryAction}
              >
                <Text style={{ ...TextTheme.bold, color: ColorPallet.brand.primary }}>
                  {t('PersonCredential.AppOnOtherDevice')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text
              accessibilityRole={'header'}
              style={[
                TextTheme.headingThree,
                {
                  flexShrink: 1,
                  color: appInstalled ? TextTheme.headingThree.color : ColorPallet.brand.primaryDisabled,
                },
              ]}
            >
              {t('PersonCredential.CreatePersonCred')}
            </Text>
          </View>
          {appInstalled ? (
            <Button
              buttonType={ButtonType.Primary}
              testID={testIdWithKey('StartProcess')}
              accessibilityLabel={t('PersonCredential.StartProcess')}
              title={t('PersonCredential.StartProcess')}
              onPress={acceptPersonCredentialOffer}
            ></Button>
          ) : null}
        </View>
        <View style={[styles.section, { marginBottom: 20 }]}>
          <Link
            style={styles.link}
            linkText={t('PersonCredential.WhatIsPersonCredentialLink')}
            onPress={() => openLink(links.WhatIsPersonCredential)}
            testID={testIdWithKey('WhatIsPersonCredentialLink')}
          />
          <View style={styles.line} />
          <Link
            style={styles.link}
            linkText={t('PersonCredential.WhereToUseLink')}
            onPress={() => openLink(links.WhereToUse)}
            testID={testIdWithKey('WhereToUse')}
          />
          <View style={styles.line} />
          <Link
            style={styles.link}
            linkText={t('PersonCredential.HelpLink')}
            onPress={() => openLink(links.Help)}
            testID={testIdWithKey('Help')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default PersonCredential
