import { TestUsers } from '../../../../src/constants.js'
import { verifyContext } from './card-context.js'

verifyContext.testUser = TestUsers.nonPhoto
verifyContext.cardTypeButton = 'NoPhotoCard'
verifyContext.cardTypeLabel = 'Non-Photo'
