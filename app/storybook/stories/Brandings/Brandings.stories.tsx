/* eslint-disable import/no-extraneous-dependencies */
import { AnonCredsCredentialMetadataKey } from '@aries-framework/anoncreds/build/utils/metadata'
import {
  CredentialExchangeRecord,
  CredentialExchangeRecordProps,
  CredentialPreviewAttribute,
  CredentialState,
  RevocationNotification,
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

import qcwallet from '../../../src'
import bundles, { CREDENTIALS } from '../../../src/assets/branding/credential-branding'

const { theme } = qcwallet

enum CREDENTIAL_DEFINITION {
  Generic = 'asdasdasd:2:generic:1.0:Generic',
}

const {
  misc: { CredentialCard },
} = components

type CredentialProps = {
  credentialRecordId: string
  revoked?: boolean
  credentialDefinitionId: string
  connectionId?: string
}

const CredentialWrapper: FC<CredentialProps> = ({
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
  const credDefIdParts = credentialDefinitionId.split(':')
  if (credDefIdParts[2] === 'CL' && credDefIdParts[4] === 'Person') {
    props.credentialAttributes = [
      new CredentialPreviewAttribute({ name: 'given_names', value: 'John' }),
      new CredentialPreviewAttribute({ name: 'family_name', value: 'Doe' }),
    ]
  }
  const credential: CredentialExchangeRecord = new CredentialExchangeRecord(props)
  credential.metadata.set(AnonCredsCredentialMetadataKey, {
    credentialDefinitionId: credentialDefinitionId,
    schemaId: '',
  })
  if (revoked) {
    credential.revocationNotification = new RevocationNotification()
  }
  return <CredentialCard credential={credential} />
}

type ListItem = {
  credentialDefinitionId: string
  credentialRecordId: string
  revoked: boolean
  connectionId?: string
}

type CredentialsProps = { items: ListItem[] }

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

const Credentials: FC<CredentialsProps> = ({ items }) => {
  const lang = select('Language', ['en', 'fr', 'pt'], 'en')
  const { i18n } = useTranslation()
  const [isLoaded, setLoaded] = useState(false)
  const renderItem: ListRenderItem<ListItem> = ({ item, index }): JSX.Element => {
    return (
      <CredentialWrapper
        revoked={item.revoked}
        credentialDefinitionId={item.credentialDefinitionId}
        credentialRecordId={item.credentialRecordId}
        connectionId={item.connectionId}
        key={index}
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

const OCABundleResolver = new types.oca.OCABundleResolver(bundles as unknown as Record<string, types.oca.Bundle>, {
  cardOverlayType: types.oca.CardOverlayType.CardLayout11,
})

storiesOf('Brandings', module)
  .add('All', () => {
    const configuration: ConfigurationContext = {
      OCABundleResolver: OCABundleResolver,
    } as unknown as ConfigurationContext

    const state = contexts.store.defaultState
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dispatch: Dispatch<any> = () => {
      return
    }
    const list: ListItem[] = [
      {
        credentialDefinitionId: CREDENTIALS.BC_DIGITAL_ID_PROD,
        credentialRecordId: 'PersonCredential_default',
        revoked: false,
      },
      {
        credentialDefinitionId: CREDENTIALS.BC_DIGITAL_ID_PROD,
        credentialRecordId: 'PersonCredential_Revoked',
        revoked: true,
      },
      {
        credentialDefinitionId: CREDENTIALS.SHOWCASE_STUDENT_PROD,
        credentialRecordId: 'StudentCredential_default',
        revoked: false,
      },
      {
        credentialDefinitionId: CREDENTIALS.SHOWCASE_STUDENT_PROD,
        credentialRecordId: 'StudentCredential_Revoked',
        revoked: true,
      },
      { credentialDefinitionId: CREDENTIALS.LSBC_PROD, credentialRecordId: 'Lawyer_default', revoked: false },
      { credentialDefinitionId: CREDENTIALS.LSBC_PROD, credentialRecordId: 'Lawyer_Revoked', revoked: true },
      {
        credentialDefinitionId: CREDENTIALS.PILOT_INVITE_PROD,
        credentialRecordId: 'Pilot_default',
        revoked: false,
      },
      {
        credentialDefinitionId: CREDENTIALS.PILOT_INVITE_PROD,
        credentialRecordId: 'Pilot_Revoked',
        revoked: true,
      },
      {
        credentialDefinitionId: CREDENTIALS.UNVERIFIED_PERSON_PROD,
        credentialRecordId: 'unverified_person_default',
        revoked: false,
      },
      {
        credentialDefinitionId: CREDENTIALS.UNVERIFIED_PERSON_PROD,
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
      {
        credentialDefinitionId: CREDENTIAL_DEFINITION.Generic,
        credentialRecordId: 'Generic_Revoked',
        revoked: true,
        connectionId: 'ab2c9305-282e-42da-82d9-70d3e99ecb02',
      },
      {
        credentialDefinitionId: CREDENTIAL_DEFINITION.Generic,
        credentialRecordId: 'Generic_Revoked',
        revoked: true,
        connectionId: 'ab2c9305-282e-42da-82d9-70d3e99ecb02-70d3e99ecb02',
      },
      {
        credentialDefinitionId: CREDENTIAL_DEFINITION.Generic,
        credentialRecordId: 'Generic_Revoked',
        revoked: true,
        connectionId: 'ab2c9305-282e-42da-82d9-70d3e99ecb02-70d3e99ecb02-282e-42da-82d9-70d3e99ecb02-70d3e99ecb02',
      },
    ]
    return (
      <ConfigurationProvider value={configuration}>
        <StoreContext.Provider value={[state, dispatch]}>
          <ThemeProvider value={theme}>
            <Credentials items={list} />
          </ThemeProvider>
        </StoreContext.Provider>
      </ConfigurationProvider>
    )
  })
  .add('Person: Default', () => {
    const configuration: ConfigurationContext = {
      OCABundleResolver: OCABundleResolver,
    } as unknown as ConfigurationContext

    const state = contexts.store.defaultState
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dispatch: Dispatch<any> = () => {
      return
    }
    const list: ListItem[] = [
      {
        credentialDefinitionId: CREDENTIALS.BC_DIGITAL_ID_PROD,
        credentialRecordId: 'PersonCredential_default',
        revoked: false,
      },
    ]
    return (
      <ConfigurationProvider value={configuration}>
        <StoreContext.Provider value={[state, dispatch]}>
          <ThemeProvider value={theme}>
            <Credentials items={list} />
          </ThemeProvider>
        </StoreContext.Provider>
      </ConfigurationProvider>
    )
  })
  .add('Person: Revoked', () => {
    const configuration: ConfigurationContext = {
      OCABundleResolver: OCABundleResolver,
    } as unknown as ConfigurationContext

    const state = contexts.store.defaultState
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dispatch: Dispatch<any> = () => {
      return
    }
    const list: ListItem[] = [
      {
        credentialDefinitionId: CREDENTIALS.BC_DIGITAL_ID_PROD,
        credentialRecordId: 'PersonCredential_Revoked',
        revoked: true,
      },
    ]
    return (
      <ConfigurationProvider value={configuration}>
        <StoreContext.Provider value={[state, dispatch]}>
          <Credentials items={list} />
        </StoreContext.Provider>
      </ConfigurationProvider>
    )
  })
