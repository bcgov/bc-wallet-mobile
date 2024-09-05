/* eslint-disable import/no-extraneous-dependencies */
import { AnonCredsCredentialMetadataKey } from '@credo-ts/anoncreds/build/utils/metadata'
import {
  CredentialExchangeRecord,
  CredentialExchangeRecordProps,
  CredentialPreviewAttribute,
  CredentialRole,
  CredentialState,
  RevocationNotification,
} from '@credo-ts/core'
import {
  components,
  StoreContext,
  contexts,
  ThemeProvider,
  TOKENS,
  MainContainer,
  ContainerProvider,
} from '@hyperledger/aries-bifold-core'
import { BrandingOverlayType, RemoteOCABundleResolver } from '@hyperledger/aries-oca/build/legacy'
import { select } from '@storybook/addon-knobs'
import { storiesOf } from '@storybook/react-native'
import React, { Dispatch, PropsWithChildren, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, ListRenderItem, View } from 'react-native'
import { Config } from 'react-native-config'
import { container } from 'tsyringe'

import qcwallet from '../../../src'

const { theme } = qcwallet
const OCABundleResolver = new RemoteOCABundleResolver(Config.OCA_URL ?? '', {
  brandingOverlayType: BrandingOverlayType.Branding10,
})
const BasicAppContext: React.FC<PropsWithChildren> = ({ children }) => {
  const context = useMemo(() => new MainContainer(container.createChildContainer()).init(), [])
  context.container.registerInstance(TOKENS.UTIL_OCA_RESOLVER, OCABundleResolver)
  return <ContainerProvider value={context}>{children}</ContainerProvider>
}

enum CREDENTIALS {
  LSBC_TEST = 'AuJrigKQGRLJajKAebTgWu:3:CL:209526:default',
  LSBC_PROD = '4xE68b6S5VRFrKMMG1U95M:3:CL:59232:default',
  SHOWCASE_LAWYER_DEV = 'L6ASjmDDbDH7yPL1t2yFj9:2:member_card:1.53',
  SHOWCASE_LAWYER_TEST = 'M6dhuFj5UwbhWkSLmvYSPc:2:member_card:1.53',
  SHOWCASE_LAWYER_PROD = 'QEquAHkM35w4XVT3Ku5yat:2:member_card:1.53',
  SHOWCASE_STUDENT_DEV = 'L6ASjmDDbDH7yPL1t2yFj9:2:student_card:1.2',
  SHOWCASE_STUDENT_TEST = 'M6dhuFj5UwbhWkSLmvYSPc:2:student_card:1.2',
  SHOWCASE_STUDENT_PROD = 'QEquAHkM35w4XVT3Ku5yat:2:student_card:1.2',
  SHOWCASE_LAWYER2_PERSON_DEV = 'L6ASjmDDbDH7yPL1t2yFj9:2:Person:1.2',
  SHOWCASE_LAWYER2_PERSON_TEST = 'M6dhuFj5UwbhWkSLmvYSPc:2:Person:1.2',
  SHOWCASE_LAWYER2_PERSON_PROD = 'QEquAHkM35w4XVT3Ku5yat:2:Person:1.2',
  UNVERIFIED_PERSON_DEV = 'Ui6HA36FvN83cEtmYYHxrn:2:unverified_person:0.1.0',
  UNVERIFIED_PERSON_TEST = 'HTkhhCW1bAXWnxC1u3YVoa:2:unverified_person:0.1.0',
  UNVERIFIED_PERSON_PROD = 'YXCtXE4YhVjULgj5hrk4ML:2:unverified_person:0.1.0',
  PILOT_INVITE_DEV = 'Mp2pDQqS2eSjNVA7kXc8ut:2:BC VC Pilot Certificate:1.0.1',
  PILOT_INVITE_TEST = '4zBepKVWZcGTzug4X49vAN:2:BC VC Pilot Certificate:1.0.1',
  PILOT_INVITE_PROD = 'E2h4RUJxyh48PLJ1CtGJrq:2:BC VC Pilot Certificate:1.0.1',
  BC_DIGITAL_ID_QA = 'KCxVC8GkKywjhWJnUfCmkW:3:CL:20:PersonQA',
  BC_DIGITAL_ID_SIT = '7xjfawcnyTUcduWVysLww5:3:CL:28075:PersonSIT',
  BC_DIGITAL_ID_DEV = 'XpgeQa93eZvGSZBZef3PHn:3:CL:28075:PersonDEV',
  BC_DIGITAL_ID_PROD = 'RGjWbW1eycP7FrMf4QJvX8:3:CL:13:Person',
}

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

const CredentialWrapper = ({
  revoked = false,
  credentialRecordId,
  credentialDefinitionId,
  connectionId,
}: CredentialProps) => {
  const indyCredential = { credentialRecordType: 'indy', credentialRecordId }
  const props: CredentialExchangeRecordProps = {
    role: CredentialRole.Issuer,
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

const Credentials = ({ items }: CredentialsProps) => {
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

storiesOf('Brandings', module)
  .add('All', () => {
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
      <BasicAppContext>
        <StoreContext.Provider value={[state, dispatch]}>
          <ThemeProvider value={theme}>
            <Credentials items={list} />
          </ThemeProvider>
        </StoreContext.Provider>
      </BasicAppContext>
    )
  })
  .add('Person: Default', (): React.ReactNode => {
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
      <>
        <BasicAppContext>
          <StoreContext.Provider value={[state, dispatch]}>
            <ThemeProvider value={theme}>
              <Credentials items={list} />
            </ThemeProvider>
          </StoreContext.Provider>
        </BasicAppContext>
      </>
    )
  })
  .add('Person: Revoked', (): React.ReactNode => {
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
      <BasicAppContext>
        <StoreContext.Provider value={[state, dispatch]}>
          <Credentials items={list} />
        </StoreContext.Provider>
      </BasicAppContext>
    )
  })
