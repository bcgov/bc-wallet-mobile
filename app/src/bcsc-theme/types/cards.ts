export enum BCSCCardType {
  Combined = 'BC Services Card Combo', // IAS compatible value
  Photo = 'BC Services Card Photo', // IAS compatible value
  NonPhoto = 'BC Services Card Non-Photo', // IAS compatible value
  Other = 'Non BC Services Card(s)', // Local value for non-BCSC cards (IAS value is undefined)
  None = 'None', // Local value when no card is present
}
