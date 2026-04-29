import { useEffect, useRef, useState } from 'react'
import { Animated } from 'react-native'
import Svg, { ClipPath, Defs, G, Mask, Path, Rect } from 'react-native-svg'

const ANIMATION_DURATION_MS = 2000
const LIGHT_BLUE_WATER = '#76BAFF'
const DARK_BLUE_MOUNTAINS = '#234075'
const LIGHT_YELLOW_SKY = '#F9C462'
const DARK_BLUE_SKY = '#01264C'

const AnimatedPath = Animated.createAnimatedComponent(Path)
const AnimatedG = Animated.createAnimatedComponent(G)

interface BCAnimatedLoadingIconProps {
  size: number
}

/**
 * Renders the BCAnimatedLoadingIcon component, which displays an animated loading icon.
 *
 * @param {BCAnimatedLoadingIconProps} props - The properties for the BCLoadingAnimationIcon component, including the size of the icon.
 * @returns The BCAnimatedLoadingIcon component.
 */
export const BCAnimatedLoadingIcon = (props: BCAnimatedLoadingIconProps) => {
  const skyAnimation = useRef(new Animated.Value(0)).current
  const waterAnimation = useRef(new Animated.Value(0)).current
  const [waterTranslation, setWaterTranslation] = useState(0)

  const skyColor = skyAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [LIGHT_YELLOW_SKY, DARK_BLUE_SKY],
  })

  useEffect(() => {
    const waterListener = waterAnimation.addListener(({ value }) => {
      setWaterTranslation(value)
    })

    Animated.loop(
      Animated.sequence([
        // Move one wave left and change sky color to dark blue
        Animated.parallel([
          Animated.timing(waterAnimation, {
            toValue: -118,
            duration: ANIMATION_DURATION_MS,
            useNativeDriver: true,
          }),
          Animated.timing(skyAnimation, {
            toValue: 1,
            duration: ANIMATION_DURATION_MS,
            useNativeDriver: true,
          }),
        ]),
        // Move one wave left and change sky color back to light yellow
        Animated.parallel([
          Animated.timing(waterAnimation, {
            toValue: -236,
            duration: ANIMATION_DURATION_MS,
            useNativeDriver: true,
          }),
          Animated.timing(skyAnimation, {
            toValue: 0,
            duration: ANIMATION_DURATION_MS,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start()

    return () => {
      waterAnimation.removeListener(waterListener)
    }
  }, [skyAnimation, waterAnimation])

  return (
    <Svg width={props.size} height={props.size} viewBox="0 0 113 113" fill="none">
      <Defs>
        <ClipPath id="clip0_369_1738">
          <Rect width="113" height="113" fill="white" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#clip0_369_1738)">
        <AnimatedPath
          d="M56.5969 112.989C87.7416 112.989 112.989 87.7416 112.989 56.5969C112.989 25.4523 87.7416 0.20459 56.5969 0.20459C25.4523 0.20459 0.20459 25.4523 0.20459 56.5969C0.20459 87.7416 25.4523 112.989 56.5969 112.989Z"
          fill={skyColor}
        />
        <Path
          d="M112.985 56.5969C112.985 87.7377 87.7378 112.985 56.5969 112.985C25.4561 112.985 0.20459 87.7377 0.20459 56.5969C0.20459 53.1345 0.51563 49.7458 1.11315 46.4594L13.3051 41.0613L17.1317 43.0953L20.2871 44.0693L20.4549 44.0243C20.4549 44.0243 23.7086 42.5305 24.5271 42.0148L29.3155 47.0611C29.3155 47.0611 39.7107 55.2995 40.0136 55.2995C40.3165 55.2995 49.1893 50.151 49.1893 50.151L57.1372 44.6914L64.066 49.7376L69.2636 50.769L74.1052 54.2723C74.1052 54.2723 86.7269 45.8333 88.7732 44.8019L94.8139 47.1552L103.797 40.8525L111.864 45.3503C112.6 48.9846 112.985 52.7457 112.985 56.5969Z"
          fill={DARK_BLUE_MOUNTAINS}
        />
        <Mask id="mask0_369_1738" x="0" y="0" width="113" height="113">
          <Path
            d="M56.5969 112.989C87.7416 112.989 112.989 87.7416 112.989 56.5969C112.989 25.4523 87.7416 0.20459 56.5969 0.20459C25.4523 0.20459 0.20459 25.4523 0.20459 56.5969C0.20459 87.7416 25.4523 112.989 56.5969 112.989Z"
            fill="#D9D9D9"
          />
        </Mask>
        <G mask="url(#mask0_369_1738)">
          <AnimatedG transform={[{ translateX: waterTranslation }]}>
            <Path
              d="M240.917 81.6561C211.364 81.6561 211.364 70.1968 181.815 70.1968C152.262 70.1968 152.262 81.6561 122.713 81.6561C93.1606 81.6561 93.1606 70.1968 63.6077 70.1968C34.0548 70.1968 34.0548 81.6561 4.50195 81.6561V123.278H240.921V81.6561H240.917Z"
              fill={LIGHT_BLUE_WATER}
            />
            {/* Duplicate the wave path to create a continuous wave effect */}
            <Path
              transform="translate(236, 0)"
              d="M240.917 81.6561C211.364 81.6561 211.364 70.1968 181.815 70.1968C152.262 70.1968 152.262 81.6561 122.713 81.6561C93.1606 81.6561 93.1606 70.1968 63.6077 70.1968C34.0548 70.1968 34.0548 81.6561 4.50195 81.6561V123.278H240.921V81.6561H240.917Z"
              fill={LIGHT_BLUE_WATER}
            />
          </AnimatedG>
        </G>
      </G>
    </Svg>
  )
}
