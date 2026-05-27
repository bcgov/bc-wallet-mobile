import { Header, StackHeaderProps } from '@react-navigation/stack'
import React from 'react'
import { View } from 'react-native'
import { HeaderDropShadow } from './HeaderWithBanner'

const EMPTY_COLOR = '#D8D8D8'
const SEGMENT_COLORS = ['#C1DDFC', '#91C4FA', '#5595D9', '#1E5189', '#01264C'] as const
const SEGMENT_COUNT = SEGMENT_COLORS.length

interface VerifyProgressBarProps {
  /** 1-indexed current step (1..5). */
  step: number
  /** 0-100, how much of the current step is complete. */
  percent: number
}

/**
 * Five-segment progress bar shown in the VerifyStack header. Segments before
 * the current step render fully in their per-segment colour, the current
 * segment fills proportionally to `percent`, and later segments stay empty.
 */
export const VerifyProgressBar = ({ step, percent }: VerifyProgressBarProps) => {
  const clampedStep = Math.max(1, Math.min(SEGMENT_COUNT, Math.round(step)))
  const clampedPercent = Math.max(0, Math.min(100, percent))

  return (
    <View style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}>
      {SEGMENT_COLORS.map((color, i) => {
        const segmentNumber = i + 1
        let fillPercent: number
        if (segmentNumber < clampedStep) {
          fillPercent = 100
        } else if (segmentNumber === clampedStep) {
          fillPercent = clampedPercent
        } else {
          fillPercent = 0
        }

        return (
          <View
            key={segmentNumber}
            style={{
              flex: 1,
              height: 6,
              backgroundColor: EMPTY_COLOR,
              borderRadius: 3,
              overflow: 'hidden',
              marginHorizontal: 3,
            }}
          >
            <View style={{ width: `${fillPercent}%`, height: '100%', backgroundColor: color }} />
          </View>
        )
      })}
    </View>
  )
}

/**
 * Returns a stack header that renders the verify progress bar in place of the
 * screen title. Use as `header: createProgressHeader(step, percent)` on each
 * VerifyStack screen.
 */
export const createProgressHeader = (step: number, percent: number) => {
  const ProgressHeader = (props: StackHeaderProps) => {
    const options: StackHeaderProps['options'] = {
      ...props.options,
      headerTitle: () => <VerifyProgressBar step={step} percent={percent} />,
      // 'left' lets the title share the flex row with headerLeft/headerRight so
      // the bar can stretch to fill the gap between them; 'center' would
      // absolutely-position a narrow column.
      headerTitleAlign: 'left',
      headerTitleContainerStyle: {
        flexGrow: 1,
        maxWidth: undefined,
        paddingHorizontal: 8,
      },
      // @react-navigation/elements always applies `styles.expand`
      // (flexGrow: 1, flexBasis: 0) to the right container regardless of
      // headerTitleAlign, so it competes with the title for leftover space and
      // ends up splitting it ~50/50. Force the right container to shrink to its
      // button width so the progress bar can claim the full remaining row.
      headerRightContainerStyle: {
        flexGrow: 0,
        flexBasis: 'auto',
      },
    }
    return (
      <View>
        <HeaderDropShadow />
        <Header {...props} options={options} />
      </View>
    )
  }
  return ProgressHeader
}
