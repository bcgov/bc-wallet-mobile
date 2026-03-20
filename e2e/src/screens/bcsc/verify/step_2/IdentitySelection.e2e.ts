import { BaseScreen } from '../../../BaseScreen.js'

const IdentitySelectionTestIds = {
  CombinedCard: 'com.ariesbifold:id/CombinedCard',
  PhotoCard: 'com.ariesbifold:id/PhotoCard',
  NoPhotoCard: 'com.ariesbifold:id/NoPhotoCard',
  CheckForServicesCard: 'com.ariesbifold:id/CheckForServicesCard',
  OtherID: 'com.ariesbifold:id/OtherID',
}

class IdentitySelectionE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, IdentitySelectionTestIds.CombinedCard)
  }

  async tapCombinedCard() {
    await this.tapByTestId(IdentitySelectionTestIds.CombinedCard)
  }

  async tapPhotoCard() {
    await this.tapByTestId(IdentitySelectionTestIds.PhotoCard)
  }

  async tapNoPhotoCard() {
    await this.tapByTestId(IdentitySelectionTestIds.NoPhotoCard)
  }

  async tapCheckForServicesCard() {
    await this.tapByTestId(IdentitySelectionTestIds.CheckForServicesCard)
  }

  async tapOtherID() {
    await this.tapByTestId(IdentitySelectionTestIds.OtherID)
  }
}

export default new IdentitySelectionE2EScreen()
