/* eslint-disable import/no-extraneous-dependencies */
import {
  CredentialExchangeRecord,
  CredentialExchangeRecordProps,
  CredentialMetadataKeys,
  CredentialState,
} from '@aries-framework/core'
import { select } from '@storybook/addon-knobs'
import { storiesOf } from '@storybook/react-native'
import {
  components,
  ConfigurationContext,
  ConfigurationProvider,
  StoreContext,
  types,
  contexts,
  ThemeProvider,
} from 'aries-bifold'
import React, { FC, Dispatch, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, ListRenderItem, View } from 'react-native'

import bcwallet from '../../../src'
import bundles from '../../../src/assets/branding/credential-branding'

const { theme } = bcwallet

enum CREDENTIAL_DEFINITION {
  Person = 'XpgeQa93eZvGSZBZef3PHn:2:Person:0.1',
  Student = '63ZiwyeZeazA6AhYRYm2zD:2:student_card:1.0',
  Lawyer = '4xE68b6S5VRFrKMMG1U95M:2:Member Card:1.5.1',
  Generic = 'asdasdasd:2:generic:1.0:Generic',
  UnverifiedPerson = '9wVuYYDEDtpZ6CYMqSiWop:2:unverified_person:0.1.0',
  PilotInvitation = '3Lbd5wSSSBv1xtjwsQ36sj:2:BC VC Pilot Certificate:1.0.1',
}

const {
  misc: { CredentialCard },
} = components

type CredentialProps = {
  state: types.state.State
  credentialRecordId: string
  revoked?: boolean
  credentialDefinitionId: string
  connectionId?: string
}

const CredentialWrapper: FC<CredentialProps> = ({
  state,
  revoked = false,
  credentialRecordId,
  credentialDefinitionId,
  connectionId,
}) => {
  const indyCredential = { credentialRecordType: 'indy', credentialRecordId }
  const props: CredentialExchangeRecordProps = {
    connectionId: connectionId,
    threadId: '',
    state: CredentialState.CredentialIssued,
    protocolVersion: '1.0',
    credentials: [indyCredential],
  }
  const credential: CredentialExchangeRecord = new CredentialExchangeRecord(props)
  credential.metadata.set(CredentialMetadataKeys.IndyCredential, {
    credentialDefinitionId: credentialDefinitionId,
    schemaId: '',
  })
  if (revoked) {
    state.credential.revoked.add(indyCredential.credentialRecordId)
  }
  return <CredentialCard credential={credential} />
}

type ListItem = {
  credentialDefinitionId: string
  credentialRecordId: string
  revoked: boolean
  connectionId?: string
}

type CredentialsProps = { items: ListItem[]; state: types.state.State }

const Credentials: FC<CredentialsProps> = ({ items, state }) => {
  const lang = select('Language', ['en', 'fr', 'pt'], 'en')
  const { i18n } = useTranslation()
  const [isLoaded, setLoaded] = useState(false)
  const renderItem: ListRenderItem<ListItem> = ({ item }): JSX.Element => {
    return (
      <CredentialWrapper
        state={state}
        revoked={item.revoked}
        credentialDefinitionId={item.credentialDefinitionId}
        credentialRecordId={item.credentialRecordId}
        connectionId={item.connectionId}
      />
    )
  }
  const ItemDivider = () => {
    return (
      <View
        style={{
          height: 10,
          width: '100%',
          backgroundColor: 'transparent',
        }}
      />
    )
  }
  useEffect(() => {
    async function changeFlag() {
      await i18n.changeLanguage(lang)
      setLoaded(true)
    }
    changeFlag()
  }, [lang])
  return (
    <>
      {isLoaded && (
        <FlatList data={items} scrollEnabled={true} renderItem={renderItem} ItemSeparatorComponent={ItemDivider} />
      )}
    </>
  )
}

storiesOf('Brandings', module)
  .add('All', () => {
    const configuration: ConfigurationContext = {
      OCABundle: new types.oca.DefaultOCABundleResolver().loadBundles(bundles as unknown as types.oca.Bundles),
    } as unknown as ConfigurationContext

    const state = contexts.store.initialStateFactory()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dispatch: Dispatch<any> = () => {
      return
    }
    const list: ListItem[] = [
      {
        credentialDefinitionId: CREDENTIAL_DEFINITION.Person,
        credentialRecordId: 'PersonCredential_default',
        revoked: false,
      },
      {
        credentialDefinitionId: CREDENTIAL_DEFINITION.Person,
        credentialRecordId: 'PersonCredential_Revoked',
        revoked: true,
      },
      {
        credentialDefinitionId: CREDENTIAL_DEFINITION.Student,
        credentialRecordId: 'StudentCredential_default',
        revoked: false,
      },
      {
        credentialDefinitionId: CREDENTIAL_DEFINITION.Student,
        credentialRecordId: 'StudentCredential_Revoked',
        revoked: true,
      },
      { credentialDefinitionId: CREDENTIAL_DEFINITION.Lawyer, credentialRecordId: 'Lawyer_default', revoked: false },
      { credentialDefinitionId: CREDENTIAL_DEFINITION.Lawyer, credentialRecordId: 'Lawyer_Revoked', revoked: true },
      {
        credentialDefinitionId: CREDENTIAL_DEFINITION.PilotInvitation,
        credentialRecordId: 'Pilot_default',
        revoked: false,
      },
      {
        credentialDefinitionId: CREDENTIAL_DEFINITION.PilotInvitation,
        credentialRecordId: 'Pilot_Revoked',
        revoked: true,
      },
      {
        credentialDefinitionId: CREDENTIAL_DEFINITION.UnverifiedPerson,
        credentialRecordId: 'unverified_person_default',
        revoked: false,
      },
      {
        credentialDefinitionId: CREDENTIAL_DEFINITION.UnverifiedPerson,
        credentialRecordId: 'unverified_person_Revoked',
        revoked: true,
      },
      { credentialDefinitionId: CREDENTIAL_DEFINITION.Generic, credentialRecordId: 'Generic_default', revoked: false },
      {
        credentialDefinitionId: CREDENTIAL_DEFINITION.Generic,
        credentialRecordId: 'Generic_Revoked',
        revoked: true,
        connectionId: 'ACME',
      },
    ]
    return (
      <ConfigurationProvider value={configuration}>
        <StoreContext.Provider value={[state, dispatch]}>
          <ThemeProvider value={theme}>
            <Credentials items={list} state={state} />
          </ThemeProvider>
        </StoreContext.Provider>
      </ConfigurationProvider>
    )
  })
  .add('Person: Default', () => {
    const configuration: ConfigurationContext = {
      OCABundle: new types.oca.DefaultOCABundleResolver().loadBundles(bundles as unknown as types.oca.Bundles),
    } as unknown as ConfigurationContext

    const state = contexts.store.initialStateFactory()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dispatch: Dispatch<any> = () => {
      return
    }
    const list: ListItem[] = [
      {
        credentialDefinitionId: CREDENTIAL_DEFINITION.Person,
        credentialRecordId: 'PersonCredential_default',
        revoked: false,
      },
    ]
    return (
      <ConfigurationProvider value={configuration}>
        <StoreContext.Provider value={[state, dispatch]}>
          <ThemeProvider value={theme}>
            <Credentials items={list} state={state} />
          </ThemeProvider>
        </StoreContext.Provider>
      </ConfigurationProvider>
    )
  })
  .add('Person: Revoked', () => {
    const configuration: ConfigurationContext = {
      OCABundle: new types.oca.DefaultOCABundleResolver().loadBundles(bundles as unknown as types.oca.Bundles),
    } as unknown as ConfigurationContext

    const state = contexts.store.initialStateFactory()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dispatch: Dispatch<any> = () => {
      return
    }
    const list: ListItem[] = [
      {
        credentialDefinitionId: CREDENTIAL_DEFINITION.Person,
        credentialRecordId: 'PersonCredential_Revoked',
        revoked: true,
      },
    ]
    return (
      <ConfigurationProvider value={configuration}>
        <StoreContext.Provider value={[state, dispatch]}>
          <Credentials items={list} state={state} />
        </StoreContext.Provider>
      </ConfigurationProvider>
    )
  })
