import { AttestationRestrictions } from './constants'

type AttestationRestrictionsType = typeof AttestationRestrictions
const credDefId = 'RycQpZ9b4NaXuT5ZGjXkUE:3:CL:120:bcwallet'

for (const env in AttestationRestrictions) {
  console.log(env)
  if ((AttestationRestrictions as Record<string, any>)[env].credDefIDs.includes(credDefId)) {
    console.log((AttestationRestrictions as Record<string, any>)[env].invitationUrl)
  }
}

let allID: Array<string> = []

for (const env in AttestationRestrictions) {
  allID = [...allID, ...(AttestationRestrictions as Record<string, any>)[env].credDefIDs]
}

console.log(allID)

// const invitationUrlFromRestrictions = (
//   restrictions: AttestationRestrictionsType,
//   credDefId: string
// ): string | undefined => {
//   for (const env in restrictions) {
//     if ((restrictions as Record<string, any>)[env].credDefIdFromRestrictions.includes(credDefId)) {
//       return (restrictions as Record<string, any>)[env].invitationUrl
//     }
//   }

//   return undefined
// }

// const invitationUrl = invitationUrlFromRestrictions(AttestationRestrictions, credDefId)

// console.log(invitationUrl)
