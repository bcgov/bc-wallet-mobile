import { ProofRequestTemplate, ProofRequestType } from 'aries-bifold'

const calculatePreviousYear = (yearOffset: number) => {
  const pastDate = new Date()
  pastDate.setFullYear(pastDate.getFullYear() - yearOffset)
  return parseInt(pastDate.toISOString().split('T')[0].replace(/-/g, ''))
}

export const proofRequestTemplates: Array<ProofRequestTemplate> = [
  {
    id: 'BC:5:FullName:0.0.1:indy',
    name: 'Full name',
    description: 'Verify the full name of a person',
    version: '0.0.1',
    payload: {
      type: ProofRequestType.AnonCreds,
      data: [
        {
          schema: 'XUxBrVSALWHLeycAUhrNr9:2:Person:1.0',
          requestedAttributes: [
            {
              name: 'given_names',
              restrictions: [
                // IDIM Person credential
                { schema_id: 'XpgeQa93eZvGSZBZef3PHn:2:Person:1.0', issuer_did: '7xjfawcnyTUcduWVysLww5' }, // SIT
                { schema_id: 'KCxVC8GkKywjhWJnUfCmkW:2:Person:1.0', issuer_did: 'KCxVC8GkKywjhWJnUfCmkW' }, // QA
                { schema_id: 'RGjWbW1eycP7FrMf4QJvX8:2:Person:1.0', issuer_did: 'RGjWbW1eycP7FrMf4QJvX8' }, // Prod
                // BC Wallet Showcase
                { schema_id: 'XUxBrVSALWHLeycAUhrNr9:2:Person:1.0', issuer_did: 'XUxBrVSALWHLeycAUhrNr9' }, // Prod
                { schema_id: '2K2h7kf8VGTLtfoxJgWazf:2:Person:1.1', issuer_did: '2K2h7kf8VGTLtfoxJgWazf' }, // Dev & Test
              ],
            },
            {
              name: 'family_name',
              restrictions: [
                // IDIM Person credential
                { schema_id: 'XpgeQa93eZvGSZBZef3PHn:2:Person:1.0', issuer_did: '7xjfawcnyTUcduWVysLww5' }, // SIT
                { schema_id: 'KCxVC8GkKywjhWJnUfCmkW:2:Person:1.0', issuer_did: 'KCxVC8GkKywjhWJnUfCmkW' }, // QA
                { schema_id: 'RGjWbW1eycP7FrMf4QJvX8:2:Person:1.0', issuer_did: 'RGjWbW1eycP7FrMf4QJvX8' }, // Prod
                // BC Wallet Showcase
                { schema_id: 'XUxBrVSALWHLeycAUhrNr9:2:Person:1.0', issuer_did: 'XUxBrVSALWHLeycAUhrNr9' }, // Prod
                { schema_id: '2K2h7kf8VGTLtfoxJgWazf:2:Person:1.1', issuer_did: '2K2h7kf8VGTLtfoxJgWazf' }, // Dev & Test
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'BC:5:19+AndFullName:0.0.1:indy',
    name: '19+ and Full name',
    description: 'Verify if a person is 19 years end up and full name.',
    version: '0.0.1',
    payload: {
      type: ProofRequestType.AnonCreds,
      data: [
        {
          schema: 'XUxBrVSALWHLeycAUhrNr9:2:Person:1.0',
          requestedAttributes: [
            {
              names: ['given_names', 'family_name'],
              restrictions: [
                // IDIM Person credential
                { schema_id: 'XpgeQa93eZvGSZBZef3PHn:2:Person:1.0', issuer_did: '7xjfawcnyTUcduWVysLww5' }, // SIT
                { schema_id: 'KCxVC8GkKywjhWJnUfCmkW:2:Person:1.0', issuer_did: 'KCxVC8GkKywjhWJnUfCmkW' }, // QA
                { schema_id: 'RGjWbW1eycP7FrMf4QJvX8:2:Person:1.0', issuer_did: 'RGjWbW1eycP7FrMf4QJvX8' }, // Prod
                // BC Wallet Showcase
                { schema_id: 'XUxBrVSALWHLeycAUhrNr9:2:Person:1.0', issuer_did: 'XUxBrVSALWHLeycAUhrNr9' }, // Prod
                { schema_id: '2K2h7kf8VGTLtfoxJgWazf:2:Person:1.1', issuer_did: '2K2h7kf8VGTLtfoxJgWazf' }, // Dev & Test
              ],
            },
          ],
          requestedPredicates: [
            {
              name: 'birthdate_dateint',
              predicateType: '>=',
              predicateValue: calculatePreviousYear(19),
              restrictions: [
                // IDIM Person credential
                { schema_id: 'XpgeQa93eZvGSZBZef3PHn:2:Person:1.0', issuer_did: '7xjfawcnyTUcduWVysLww5' }, // SIT
                { schema_id: 'KCxVC8GkKywjhWJnUfCmkW:2:Person:1.0', issuer_did: 'KCxVC8GkKywjhWJnUfCmkW' }, // QA
                { schema_id: 'RGjWbW1eycP7FrMf4QJvX8:2:Person:1.0', issuer_did: 'RGjWbW1eycP7FrMf4QJvX8' }, // Prod
                // BC Wallet Showcase
                { schema_id: 'XUxBrVSALWHLeycAUhrNr9:2:Person:1.0', issuer_did: 'XUxBrVSALWHLeycAUhrNr9' }, // Prod
                { schema_id: '2K2h7kf8VGTLtfoxJgWazf:2:Person:1.1', issuer_did: '2K2h7kf8VGTLtfoxJgWazf' }, // Dev & Test
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'BC:5:Over19YearsOfAge:0.0.1:indy',
    name: 'Over 19 years of age',
    description: 'Verify if a person is 19 years end up.',
    version: '0.0.1',
    payload: {
      type: ProofRequestType.AnonCreds,
      data: [
        {
          schema: 'XUxBrVSALWHLeycAUhrNr9:2:Person:1.0',
          requestedPredicates: [
            {
              name: 'birthdate_dateint',
              predicateType: '>=',
              predicateValue: calculatePreviousYear(19),
              restrictions: [
                // IDIM Person credential
                { schema_id: 'XpgeQa93eZvGSZBZef3PHn:2:Person:1.0', issuer_did: '7xjfawcnyTUcduWVysLww5' }, // SIT
                { schema_id: 'KCxVC8GkKywjhWJnUfCmkW:2:Person:1.0', issuer_did: 'KCxVC8GkKywjhWJnUfCmkW' }, // QA
                { schema_id: 'RGjWbW1eycP7FrMf4QJvX8:2:Person:1.0', issuer_did: 'RGjWbW1eycP7FrMf4QJvX8' }, // Prod
                // BC Wallet Showcase
                { schema_id: 'XUxBrVSALWHLeycAUhrNr9:2:Person:1.0', issuer_did: 'XUxBrVSALWHLeycAUhrNr9' }, // Prod
                { schema_id: '2K2h7kf8VGTLtfoxJgWazf:2:Person:1.1', issuer_did: '2K2h7kf8VGTLtfoxJgWazf' }, // Dev & Test
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'BC:5:PractisingLawyer:0.0.1:indy',
    name: 'Practising lawyer',
    description: 'Verify if a person`is a practicing lawyer.',
    version: '0.0.1',
    payload: {
      type: ProofRequestType.AnonCreds,
      data: [
        {
          schema: 'XUxBrVSALWHLeycAUhrNr9:2:Member Card:1.5.1',
          requestedAttributes: [
            {
              names: ['Given Name', 'Surname', 'PPID', 'Member Status'],
              restrictions: [
                // LSBC Member Card
                { schema_id: '4xE68b6S5VRFrKMMG1U95M:2:Member Card:1.5.1', issuer_did: '4xE68b6S5VRFrKMMG1U95M' }, // Prod
                { schema_id: 'AuJrigKQGRLJajKAebTgWu:2:Member Card:1.5.1', issuer_did: 'AuJrigKQGRLJajKAebTgWu' }, // Test
                // BC Wallet Showcase
                { schema_id: 'XUxBrVSALWHLeycAUhrNr9:2:Member Card:1.5.1', issuer_did: 'XUxBrVSALWHLeycAUhrNr9' }, // Prod
                { schema_id: '2K2h7kf8VGTLtfoxJgWazf:2:Member Card:1.1', issuer_did: '2K2h7kf8VGTLtfoxJgWazf' }, // Dev & Test
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'BC:5:PractisingLawyerAndFullName:0.0.1:indy',
    name: 'Practising lawyer and full name',
    description: 'Verify if a person`is a practicing lawyer using two different credentials for extra assurance',
    version: '0.0.1',
    payload: {
      type: ProofRequestType.AnonCreds,
      data: [
        {
          schema: 'XUxBrVSALWHLeycAUhrNr9:2:Person:1.0',
          requestedAttributes: [
            {
              names: ['given_names', 'family_name'],
              restrictions: [
                // IDIM Person credential
                { schema_id: 'XpgeQa93eZvGSZBZef3PHn:2:Person:1.0', issuer_did: '7xjfawcnyTUcduWVysLww5' }, // SIT
                { schema_id: 'KCxVC8GkKywjhWJnUfCmkW:2:Person:1.0', issuer_did: 'KCxVC8GkKywjhWJnUfCmkW' }, // QA
                { schema_id: 'RGjWbW1eycP7FrMf4QJvX8:2:Person:1.0', issuer_did: 'RGjWbW1eycP7FrMf4QJvX8' }, // Prod
                // BC Wallet Showcase
                { schema_id: 'XUxBrVSALWHLeycAUhrNr9:2:Person:1.0', issuer_did: 'XUxBrVSALWHLeycAUhrNr9' }, // Prod
                { schema_id: '2K2h7kf8VGTLtfoxJgWazf:2:Person:1.1', issuer_did: '2K2h7kf8VGTLtfoxJgWazf' }, // Dev & Test
              ],
            },
          ],
        },
        {
          schema: 'XUxBrVSALWHLeycAUhrNr9:2:Member Card:1.5.1',
          requestedAttributes: [
            {
              names: ['Given Name', 'Surname', 'PPID', 'Member Status'],
              restrictions: [
                // LSBC Member Card
                { schema_id: '4xE68b6S5VRFrKMMG1U95M:2:Member Card:1.5.1', issuer_did: '4xE68b6S5VRFrKMMG1U95M' }, // Prod
                { schema_id: 'AuJrigKQGRLJajKAebTgWu:2:Member Card:1.5.1', issuer_did: 'AuJrigKQGRLJajKAebTgWu' }, // Test
                // BC Wallet Showcase
                { schema_id: 'XUxBrVSALWHLeycAUhrNr9:2:Member Card:1.5.1', issuer_did: 'XUxBrVSALWHLeycAUhrNr9' }, // Prod
                { schema_id: '2K2h7kf8VGTLtfoxJgWazf:2:Member Card:1.1', issuer_did: '2K2h7kf8VGTLtfoxJgWazf' }, // Dev & Test
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: 'BC:5:OverSomeYearsOfAge:0.0.1:indy',
    name: 'Over some years of age',
    description: 'Verify if a person is over some years ends up.',
    version: '0.0.1',
    payload: {
      type: ProofRequestType.AnonCreds,
      data: [
        {
          schema: 'XUxBrVSALWHLeycAUhrNr9:2:Person:1.0',
          requestedPredicates: [
            {
              name: 'birthdate_dateint',
              predicateType: '>=',
              predicateValue: calculatePreviousYear(19),
              parameterizable: true,
              restrictions: [
                // IDIM Person credential
                { schema_id: 'XpgeQa93eZvGSZBZef3PHn:2:Person:1.0', issuer_did: '7xjfawcnyTUcduWVysLww5' }, // SIT
                { schema_id: 'KCxVC8GkKywjhWJnUfCmkW:2:Person:1.0', issuer_did: 'KCxVC8GkKywjhWJnUfCmkW' }, // QA
                { schema_id: 'RGjWbW1eycP7FrMf4QJvX8:2:Person:1.0', issuer_did: 'RGjWbW1eycP7FrMf4QJvX8' }, // Prod
                // BC Wallet Showcase
                { schema_id: 'XUxBrVSALWHLeycAUhrNr9:2:Person:1.0', issuer_did: 'XUxBrVSALWHLeycAUhrNr9' }, // Prod
                { schema_id: '2K2h7kf8VGTLtfoxJgWazf:2:Person:1.1', issuer_did: '2K2h7kf8VGTLtfoxJgWazf' }, // Dev & Test
              ],
            },
          ],
        },
      ],
    },
  },
]
