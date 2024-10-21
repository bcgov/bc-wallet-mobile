export enum BCScreens {
  VerificationSteps = 'VerificationSteps',
  ChooseID = 'ChooseID',
}

export type BCVerifiedPersonStackParams = {
  [BCScreens.VerificationSteps]: undefined
  [BCScreens.ChooseID]: undefined
}
