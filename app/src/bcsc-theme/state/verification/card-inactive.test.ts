import { BCSCReason } from '@/bcsc-theme/utils/id-token'
import { CardInactiveFacts, isCardInactive } from './card-inactive'

describe('isCardInactive', () => {
  it.each<[string, CardInactiveFacts, boolean]>([
    ['nothing recorded', { recordDeactivated: false }, false],
    ['the record says cancelled or expired', { recordDeactivated: true }, true],
    [
      'the saved reason is Expired by System',
      { recordDeactivated: false, savedReason: BCSCReason.ExpiredBySystem },
      true,
    ],
    [
      'the record and the saved reason both say expired',
      { recordDeactivated: true, savedReason: BCSCReason.ExpiredBySystem },
      true,
    ],
    [
      'the record says deactivated and the reason is an approval',
      { recordDeactivated: true, savedReason: BCSCReason.ApprovedByAgent },
      true,
    ],
    ['the saved reason is an approval', { recordDeactivated: false, savedReason: BCSCReason.ApprovedByAgent }, false],
    ...[
      BCSCReason.Cancel,
      BCSCReason.CanceledByAgent,
      BCSCReason.CanceledByUser,
      BCSCReason.CanceledByAdditionalCard,
      BCSCReason.CanceledByCardTypeChange,
      BCSCReason.CanceledDueToInactivity,
      BCSCReason.CanceledByCardExpire,
    ].map((reason): [string, CardInactiveFacts, boolean] => [
      `the saved reason is ${reason}, which goes to the device-invalidated screen`,
      { recordDeactivated: false, savedReason: reason },
      false,
    ]),
  ])('is decided correctly when %s', (_name, facts, expected) => {
    expect(isCardInactive(facts)).toBe(expected)
  })
})
