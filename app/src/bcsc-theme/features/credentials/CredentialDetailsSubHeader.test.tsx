import { DIGITAL_SERVICES_CARD_CREDENTIAL_DEFINITION_IDS } from '@/constants'
import { DidCommCredentialExchangeRecord } from '@credo-ts/didcomm'
import { BasicAppContext } from '@mocks/helpers/app'
import { render } from '@testing-library/react-native'
import React from 'react'
import { CredentialDetailsSubHeader } from './CredentialDetailsSubHeader'

describe('CredentialDetailsSubHeader Component', () => {
  it('renders the information card for a Digital Services Card credential', () => {
    const credential = {
      metadata: {
        get: jest.fn().mockReturnValue({ credentialDefinitionId: DIGITAL_SERVICES_CARD_CREDENTIAL_DEFINITION_IDS[0] }),
      },
    } as unknown as DidCommCredentialExchangeRecord

    const tree = render(
      <BasicAppContext>
        <CredentialDetailsSubHeader credential={credential} />
      </BasicAppContext>
    )

    expect(tree.getByText('Credentials.NotAnIDInfoTitle')).toBeTruthy()
    expect(tree.getByText('Credentials.NotAnIDInfoDescription')).toBeTruthy()
    expect(tree).toMatchSnapshot()
  })

  it('renders nothing when the credential definition ID does not match', () => {
    const credential = {
      metadata: {
        get: jest.fn().mockReturnValue({ credentialDefinitionId: 'unrelated-cred-def-id' }),
      },
    } as unknown as DidCommCredentialExchangeRecord

    const tree = render(
      <BasicAppContext>
        <CredentialDetailsSubHeader credential={credential} />
      </BasicAppContext>
    )

    expect(tree.toJSON()).toBeNull()
  })

  it('renders nothing when no credential is provided', () => {
    const tree = render(
      <BasicAppContext>
        <CredentialDetailsSubHeader />
      </BasicAppContext>
    )

    expect(tree.toJSON()).toBeNull()
  })
})
