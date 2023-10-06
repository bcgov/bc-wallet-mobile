import { ProofRequestTemplate, ProofRequestType } from 'aries-bifold'
import { useTranslation } from 'react-i18next'

const calculatePreviousYear = (yearOffset: number) => {
  const pastDate = new Date()
  pastDate.setFullYear(pastDate.getFullYear() - yearOffset)
  return parseInt(pastDate.toISOString().split('T')[0].replace(/-/g, ''))
}

export const useProofRequestTemplates = () => {
  const { t } = useTranslation()
  const cqen_demo_anig_1_3 = 'Ep31SvFAetugFPe5CGzJxt:2:demo_anig:1.3'
  const cqen_demo_anig_1_2 = 'Ep31SvFAetugFPe5CGzJxt:2:demo_anig:1.2'

  const mcn_demo_anig_1_3 = 'U3eMJXwfAAhP6NGSMDiV7c:2:demo_anig:1.3'
  const mcn_demo_anig_1_2 = 'U3eMJXwfAAhP6NGSMDiV7c:2:demo_anig:1.2'

  const demo_anig_restrictions = [
    { schema_id: cqen_demo_anig_1_3, issuer_did: 'Ep31SvFAetugFPe5CGzJxt' },
    { schema_id: cqen_demo_anig_1_2, issuer_did: 'Ep31SvFAetugFPe5CGzJxt' },
    { schema_id: mcn_demo_anig_1_3, issuer_did: 'U3eMJXwfAAhP6NGSMDiV7c' },
    { schema_id: mcn_demo_anig_1_2, issuer_did: 'U3eMJXwfAAhP6NGSMDiV7c' },
  ]

  // const mcn_demo_anig_restrictions = [{ schema_id: mcn_demo_anig, issuer_did: 'U3eMJXwfAAhP6NGSMDiV7c' }]

  const proofRequestTemplates: Array<ProofRequestTemplate> = [
    {
      id: 'QC:2:DemoAnigAgeValidation:0.0.1',
      name: t('ProofRequestTemplates.ProofRequestForAgeValidationName'),
      description: t('ProofRequestTemplates.ProofRequestForAgeValidationDescription'),
      version: '0.0.1',
      payload: {
        type: ProofRequestType.AnonCreds,
        data: [
          {
            schema: 'QC:2:DemoAnigAgeValidation:0.0.1',
            requestedPredicates: [
              {
                name: 'birthdate_dateint',
                predicateType: '<=',
                predicateValue: calculatePreviousYear(18),
                restrictions: demo_anig_restrictions,
              },
            ],
          },
        ],
      },
    } as ProofRequestTemplate,
    {
      id: 'QC:2:DemoAnigNameRequest:0.0.1',
      name: t('ProofRequestTemplates.ProofRequestForFullNameName'),
      description: t('ProofRequestTemplates.ProofRequestForFullNameDescription'),
      version: '0.0.1',
      payload: {
        type: ProofRequestType.AnonCreds,
        data: [
          {
            schema: 'QC:2:DemoAnigNameRequest:0.0.1',
            requestedAttributes: [{ names: ['given_names', 'family_name'], restrictions: demo_anig_restrictions }],
          },
        ],
      },
    } as ProofRequestTemplate,
    {
      id: 'QC:2:DemoAnigNameAndAgeValidationRequest:0.0.1',
      name: t('ProofRequestTemplates.ProofRequestForFullNameAndAgeName'),
      description: t('ProofRequestTemplates.ProofRequestForFullNameAndAgeDescription'),
      version: '0.0.1',
      payload: {
        type: ProofRequestType.AnonCreds,
        data: [
          {
            schema: 'QC:2:DemoAnigNameAndAgeValidationRequest:0.0.1',
            requestedAttributes: [{ names: ['given_names', 'family_name'], restrictions: demo_anig_restrictions }],
            requestedPredicates: [
              {
                name: 'birthdate_dateint',
                predicateType: '<=',
                predicateValue: calculatePreviousYear(18),
                restrictions: demo_anig_restrictions,
              },
            ],
          },
        ],
      },
    } as ProofRequestTemplate,
  ]

  return proofRequestTemplates
}
