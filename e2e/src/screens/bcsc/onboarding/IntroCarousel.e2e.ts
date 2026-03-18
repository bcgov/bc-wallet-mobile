import { swipeLeft, swipeRight } from '../../../helpers/gestures.js'
import { BaseScreen } from '../../BaseScreen.js'

const CAROUSEL_STEPS = 3

const IntroCarouselTestIds = {
  CarouselNext: 'com.ariesbifold:id/CarouselNext',
  CarouselBack: 'com.ariesbifold:id/CarouselBack',
  WhereToUseButton: 'com.ariesbifold:id/CardButton-WhereToUse',
}

class IntroCarouselE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, IntroCarouselTestIds.CarouselNext)
  }

  async tapNext() {
    await this.tapByTestId(IntroCarouselTestIds.CarouselNext)
  }

  async tapBack() {
    await this.tapByTestId(IntroCarouselTestIds.CarouselBack)
  }

  async tapThroughAll() {
    for (let i = 0; i < CAROUSEL_STEPS; i++) {
      await this.tapNext()
    }
  }

  async swipeLeft() {
    await swipeLeft()
  }

  async swipeRight() {
    await swipeRight()
  }

  async swipeThroughAll() {
    for (let i = 0; i < CAROUSEL_STEPS; i++) {
      await this.swipeLeft()
    }
  }

  async tapWhereToUseButton() {
    await this.tapByTestId(IntroCarouselTestIds.WhereToUseButton)
  }
}

export default new IntroCarouselE2EScreen()
