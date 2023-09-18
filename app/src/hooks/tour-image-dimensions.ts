import { useWindowDimensions } from 'react-native'

const useTourImageDimensions = () => {
  const { width: windowWidth } = useWindowDimensions() // NOSONAR
  const totalHorizontalImagePadding = 90
  const imageWidth = Math.floor(windowWidth - totalHorizontalImagePadding)
  const imageHeight = Math.floor(imageWidth * 0.66)

  return { imageWidth, imageHeight }
}

export default useTourImageDimensions
