import { useWindowDimensions } from 'react-native'

const useTourImageDimensions = () => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions() // NOSONAR
  const totalHorizontalImagePadding = 90
  const portraitMode = windowHeight > windowWidth
  const imageWidth = Math.floor(
    portraitMode ? windowWidth - totalHorizontalImagePadding : windowHeight - totalHorizontalImagePadding
  )
  const imageHeight = Math.floor(imageWidth * 0.66)

  return { imageWidth, imageHeight }
}

export default useTourImageDimensions
