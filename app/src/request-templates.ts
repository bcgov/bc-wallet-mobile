import { ProofRequestTemplate, ProofRequestType } from 'aries-bifold'

const calculatePreviousYear = (yearOffset: number) => {
  const pastDate = new Date()
  pastDate.setFullYear(pastDate.getFullYear() - yearOffset)
  return parseInt(pastDate.toISOString().split('T')[0].replace(/-/g, ''))
}

const personSchema = 'XUxBrVSALWHLeycAUhrNr9:2:Person:1.0'
const personRestrictions = [
  // IDIM Person credential
  { schema_id: 'XpgeQa93eZvGSZBZef3PHn:2:Person:1.0', issuer_did: '7xjfawcnyTUcduWVysLww5' }, // SIT
  { schema_id: 'KCxVC8GkKywjhWJnUfCmkW:2:Person:1.0', issuer_did: 'KCxVC8GkKywjhWJnUfCmkW' }, // QA
  { schema_id: 'RGjWbW1eycP7FrMf4QJvX8:2:Person:1.0', issuer_did: 'RGjWbW1eycP7FrMf4QJvX8' }, // Prod
  // BC Wallet Showcase
  { schema_id: 'XUxBrVSALWHLeycAUhrNr9:2:Person:1.0', issuer_did: 'XUxBrVSALWHLeycAUhrNr9' }, // Prod
  { schema_id: 'L6ASjmDDbDH7yPL1t2yFj9:2:Person:1.1', issuer_did: 'L6ASjmDDbDH7yPL1t2yFj9' }, // Dev & Test
  // openvp candy
  { schema_id: 'Ui6HA36FvN83cEtmYYHxrn:2:unverified_person:0.1.0', issuer_did: 'Ui6HA36FvN83cEtmYYHxrn' },
]

const openvpSchema = '9wVuYYDEDtpZ6CYMqSiWop:2:unverified_person:0.1.0'
const openvpRestrictions = [
  { schema_id: '9wVuYYDEDtpZ6CYMqSiWop:2:unverified_person:0.1.0', issuer_did: '9wVuYYDEDtpZ6CYMqSiWop' },
  { schema_id: 'XZQpyaFa9hBUdJXfKHUvVg:2:unverified_person:0.1.0', issuer_did: 'XZQpyaFa9hBUdJXfKHUvVg' },
  { schema_id: 'Ui6HA36FvN83cEtmYYHxrn:2:unverified_person:0.1.0', issuer_did: 'Ui6HA36FvN83cEtmYYHxrn' },
]

const memberCardSchema = 'XUxBrVSALWHLeycAUhrNr9:2:Member Card:1.5.1'
const memberCardRestrictions = [
  // LSBC Member Card
  { schema_id: '4xE68b6S5VRFrKMMG1U95M:2:Member Card:1.5.1', issuer_did: '4xE68b6S5VRFrKMMG1U95M' }, // Prod
  { schema_id: 'AuJrigKQGRLJajKAebTgWu:2:Member Card:1.5.1', issuer_did: 'AuJrigKQGRLJajKAebTgWu' }, // Test
  // BC Wallet Showcase
  { schema_id: 'XUxBrVSALWHLeycAUhrNr9:2:Member Card:1.5.1', issuer_did: 'XUxBrVSALWHLeycAUhrNr9' }, // Prod
  { schema_id: 'L6ASjmDDbDH7yPL1t2yFj9:2:member_card:1.51', issuer_did: 'L6ASjmDDbDH7yPL1t2yFj9' }, // Dev & Test
]

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
          schema: personSchema,
          requestedAttributes: [
            {
              name: 'given_names',
              restrictions: personRestrictions,
            },
            {
              name: 'family_name',
              restrictions: personRestrictions,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'BC:5:19+AndFullName:0.0.1:indy',
    name: '19+ and Full name',
    description: 'Verify if a person is 19 years and up and full name.',
    version: '0.0.1',
    payload: {
      type: ProofRequestType.AnonCreds,
      data: [
        {
          schema: personSchema,
          requestedAttributes: [
            {
              names: ['given_names', 'family_name'],
              restrictions: personRestrictions,
            },
          ],
          requestedPredicates: [
            {
              name: 'birthdate_dateint',
              predicateType: '<=',
              predicateValue: calculatePreviousYear(19),
              restrictions: personRestrictions,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'BC:5:Over19YearsOfAge:0.0.1:indy',
    name: 'Over 19 years of age',
    description: 'Verify if a person is 19 years and up.',
    version: '0.0.1',
    payload: {
      type: ProofRequestType.AnonCreds,
      data: [
        {
          schema: personSchema,
          requestedPredicates: [
            {
              name: 'birthdate_dateint',
              predicateType: '<=',
              predicateValue: calculatePreviousYear(19),
              restrictions: personRestrictions,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'BC:5:PractisingLawyer:0.0.1:indy',
    name: 'Practising lawyer',
    description: 'Verify if a person is a practicing lawyer.',
    version: '0.0.1',
    payload: {
      type: ProofRequestType.AnonCreds,
      data: [
        {
          schema: memberCardSchema,
          requestedAttributes: [
            {
              names: ['Given Name', 'Surname', 'PPID', 'Member Status'],
              restrictions: memberCardRestrictions,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'BC:5:PractisingLawyerAndFullName:0.0.1:indy',
    name: 'Practising lawyer and full name',
    description: 'Verify if a person is a practicing lawyer using two different credentials for extra assurance',
    version: '0.0.1',
    payload: {
      type: ProofRequestType.AnonCreds,
      data: [
        {
          schema: personSchema,
          requestedAttributes: [
            {
              names: ['given_names', 'family_name'],
              restrictions: personRestrictions,
            },
          ],
        },
        {
          schema: memberCardSchema,
          requestedAttributes: [
            {
              names: ['Given Name', 'Surname', 'PPID', 'Member Status'],
              restrictions: memberCardRestrictions,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'BC:5:OverSomeYearsOfAge:0.0.1:indy',
    name: 'Over some years of age',
    description: 'Verify if a person is over some years and up.',
    version: '0.0.1',
    payload: {
      type: ProofRequestType.AnonCreds,
      data: [
        {
          schema: personSchema,
          requestedPredicates: [
            {
              name: 'birthdate_dateint',
              predicateType: '<=',
              predicateValue: calculatePreviousYear(19),
              parameterizable: true,
              restrictions: personRestrictions,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'BC:5:FullNameAndPicture:0.0.1:indy',
    name: 'Person Full Name and Picture',
    description: 'Verify the full name of a person and see their picture',
    devOnly: true,
    version: '0.0.1',
    payload: {
      type: ProofRequestType.AnonCreds,
      data: [
        {
          schema: personSchema,
          requestedAttributes: [
            {
              name: 'given_names',
              restrictions: personRestrictions,
            },
            {
              name: 'family_name',
              restrictions: personRestrictions,
            },
            {
              name: 'picture',
              restrictions: personRestrictions,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'BC:5:OpenvpFullName:0.0.1:indy',
    name: 'Unverified Person Full name',
    description: 'Verify the full name of a person',
    devOnly: true,
    version: '0.0.1',
    payload: {
      type: ProofRequestType.AnonCreds,
      data: [
        {
          schema: openvpSchema,
          requestedAttributes: [
            {
              name: 'given_names',
              restrictions: openvpRestrictions,
            },
            {
              name: 'family_name',
              restrictions: openvpRestrictions,
            },
          ],
        },
      ],
    },
  },
  {
    id: 'BC:5:Openvp19+:0.0.1:indy',
    name: 'Unverified Person Full name and Birth Date',
    description: 'Verify the full name and birth date of a person',
    devOnly: true,
    version: '0.0.1',
    payload: {
      type: ProofRequestType.AnonCreds,
      data: [
        {
          schema: openvpSchema,
          requestedAttributes: [
            {
              name: 'given_names',
              restrictions: openvpRestrictions,
            },
            {
              name: 'family_name',
              restrictions: openvpRestrictions,
            },
            {
              name: 'birthdate',
              restrictions: openvpRestrictions,
            },
          ],
        },
      ],
    },
  },
]
