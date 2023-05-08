import { LayoutAnimation, LayoutAnimationConfig } from 'react-native'

/**
 * Toggle animation config
 * @param animationDuration
 * @return LayoutAnimationConfig
 */
export const toggleAnimation = (animationDuration = 300): LayoutAnimationConfig => {
  return {
    duration: animationDuration,
    update: {
      duration: animationDuration,
      property: LayoutAnimation.Properties.scaleXY,
      type: LayoutAnimation.Types.easeInEaseOut,
    },
    delete: {
      duration: animationDuration,
      property: LayoutAnimation.Properties.opacity,
      type: LayoutAnimation.Types.easeInEaseOut,
    },
  }
}
