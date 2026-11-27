import { BCSCEvent, BCSCReason } from '@/bcsc-theme/utils/id-token'
import { CardInactiveFacts, isCardInactive } from './card-inactive'

describe('isCardInactive', () => {
  it.each<[string, CardInactiveFacts, boolean]>([
    ['nothing recorded', { recordDeactivated: false, hasRegistration: false }, false],
    ['the record says cancelled or expired', { recordDeactivated: true, hasRegistration: true }, true],
    [
      'the saved reason is Expired by System',
      { recordDeactivated: false, savedReason: BCSCReason.ExpiredBySystem, hasRegistration: true },
      true,
    ],
    [
      'the record and the saved reason both say expired',
      { recordDeactivated: true, savedReason: BCSCReason.ExpiredBySystem, hasRegistration: true },
      true,
    ],
    [
      'the record says deactivated and the reason is an approval',
      { recordDeactivated: true, savedReason: BCSCReason.ApprovedByAgent, hasRegistration: true },
      true,
    ],
    [
      'the saved reason is Expired by System but no record or token remains (a reset registration)',
      { recordDeactivated: false, savedReason: BCSCReason.ExpiredBySystem, hasRegistration: false },
      false,
    ],
    [
      'the record says deactivated even with no token',
      { recordDeactivated: true, savedReason: undefined, hasRegistration: false },
      true,
    ],
    [
      'the saved reason is an approval',
      { recordDeactivated: false, savedReason: BCSCReason.ApprovedByAgent, hasRegistration: true },
      false,
    ],
    ...[BCSCEvent.Expire, BCSCEvent.Cancel].flatMap((event): [string, CardInactiveFacts, boolean][] => [
      [
        `the saved event is ${event}, whatever the reason`,
        { recordDeactivated: false, savedEvent: event, savedReason: BCSCReason.ApprovedByAgent, hasRegistration: true },
        true,
      ],
      [
        `the saved event is ${event} but no record or token remains (a reset registration)`,
        { recordDeactivated: false, savedEvent: event, savedReason: BCSCReason.Cancel, hasRegistration: false },
        false,
      ],
    ]),
    ...[BCSCEvent.Authorization, BCSCEvent.Renewal, BCSCEvent.Replace].map(
      (event): [string, CardInactiveFacts, boolean] => [
        `the saved event is ${event}, even with an expiry reason (the event wins over the reason)`,
        { recordDeactivated: false, savedEvent: event, savedReason: BCSCReason.ExpiredBySystem, hasRegistration: true },
        false,
      ]
    ),
    [
      // A renewal clears recordDeactivated by writing a new record (CREDENTIAL_RECORD_SAVED), so the two
      // only meet until that write lands
      'the record says deactivated and a newer Renewal event is saved',
      { recordDeactivated: true, savedEvent: BCSCEvent.Renewal, savedReason: BCSCReason.Renew, hasRegistration: true },
      true,
    ],
    [
      'the record says deactivated and a newer Authorization event is saved',
      {
        recordDeactivated: true,
        savedEvent: BCSCEvent.Authorization,
        savedReason: BCSCReason.ApprovedByAgent,
        hasRegistration: true,
      },
      true,
    ],
    [
      'details saved before the event was kept say Expired by System',
      {
        recordDeactivated: false,
        savedEvent: undefined,
        savedReason: BCSCReason.ExpiredBySystem,
        hasRegistration: true,
      },
      true,
    ],
    ...[
      BCSCReason.Cancel,
      BCSCReason.CanceledByAgent,
      BCSCReason.CanceledByUser,
      BCSCReason.CanceledByAdditionalCard,
      BCSCReason.CanceledByCardTypeChange,
      BCSCReason.CanceledDueToInactivity,
      BCSCReason.CanceledByCardExpire,
    ].map((reason): [string, CardInactiveFacts, boolean] => [
      `details saved before the event was kept say ${reason}`,
      { recordDeactivated: false, savedReason: reason, hasRegistration: true },
      false,
    ]),
  ])('is decided correctly when %s', (_name, facts, expected) => {
    expect(isCardInactive(facts)).toBe(expected)
  })
})
