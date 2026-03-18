import { TestIds } from '../../../constants.js'
import { swipeLeft, swipeRight } from '../../../helpers/gestures.js'
import { BaseScreen } from '../../BaseScreen.js'

const CAROUSEL_STEPS = 3

class IntroCarouselE2EScreen extends BaseScreen {
  async waitForDisplayed(timeout = 20_000) {
    await super.waitForDisplayed(timeout, TestIds.Onboarding.IntroCarousel.CarouselNext)
  }

  async tapNext() {
    await this.tapByTestId(TestIds.Onboarding.IntroCarousel.CarouselNext)
  }

  async tapBack() {
    await this.tapByTestId(TestIds.Onboarding.IntroCarousel.CarouselBack)
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
    await this.tapByTestId(TestIds.Onboarding.IntroCarousel.WhereToUseButton)
  }
}

export default new IntroCarouselE2EScreen()
