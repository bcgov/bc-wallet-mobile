import { useBCSCActivity } from '@/bcsc-theme/contexts/BCSCActivityContext'
import { PAIRING_CODE_LENGTH as CELL_COUNT } from '@/constants'
import { ThemedText, useTheme } from '@bifold/core'
import React, { Fragment, useCallback } from 'react'
import { FocusEvent, StyleSheet, TextInputProps, View } from 'react-native'
import { CodeField, Cursor, useClearByFocusCell } from 'react-native-confirmation-code-field'

const CELL_HEIGHT = 56
const CELL_WIDTH = 52
const CELL_BORDER_WIDTH = 2
const CELL_BORDER_RADIUS = 12
const CELL_LINE_HEIGHT = CELL_HEIGHT - CELL_BORDER_WIDTH * 2

type CodeInputVariant = 'outlined' | 'borderless' | 'underline'

interface CodeInputProps {
  value: string
  onChange: (value: string) => void
  error?: string | null
  onErrorClear?: () => void
  separator?: boolean
  variant?: CodeInputVariant
  textInputProps?: TextInputProps
}

const CodeInput = ({
  value,
  onChange,
  error,
  onErrorClear,
  separator,
  variant = 'outlined',
  textInputProps,
}: CodeInputProps) => {
  const { ColorPalette, Spacing, Inputs } = useTheme()
  const { reportActivity } = useBCSCActivity() ?? {}

  const onChangeText = useCallback(
    (text: string) => {
      reportActivity?.()
      onErrorClear?.()
      const sanitized = text.replace(/\s+/g, '')
      if (sanitized.length > CELL_COUNT) {
        onChange(sanitized.slice(0, CELL_COUNT))
        return
      }
      onChange(sanitized)
    },
    [onChange, onErrorClear, reportActivity]
  )

  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value,
    setValue: onChangeText,
  })

  const handleFocus = useCallback(
    (e: FocusEvent) => {
      onErrorClear?.()
      textInputProps?.onFocus?.(e)
    },
    [onErrorClear, textInputProps]
  )

  const styles = StyleSheet.create({
    root: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    cell: {
      width: CELL_WIDTH,
      height: CELL_HEIGHT,
      lineHeight: CELL_LINE_HEIGHT,
      fontSize: 32,
      backgroundColor: ColorPalette.grayscale.white,
      textAlign: 'center',
      textAlignVertical: 'center',
      borderRadius: variant === 'underline' ? 0 : CELL_BORDER_RADIUS,
      borderWidth: variant === 'borderless' ? 0 : CELL_BORDER_WIDTH,
      borderColor: ColorPalette.grayscale.lightGrey,
      color: ColorPalette.grayscale.darkGrey,
      includeFontPadding: false,
      ...(variant === 'underline' && {
        borderTopWidth: 0,
        borderLeftWidth: 0,
        borderRightWidth: 0,
        borderBottomWidth: CELL_BORDER_WIDTH,
      }),
    },
    cellFocused: {
      borderColor: Inputs.inputSelected.borderColor,
    },
    cellError: {
      borderColor: ColorPalette.semantic.error,
    },
    separator: {
      fontSize: 32,
      lineHeight: CELL_HEIGHT,
      textAlign: 'center',
      color: ColorPalette.brand.primary,
    },
    subtext: {
      marginTop: Spacing.sm,
    },
  })

  return (
    <View>
      <CodeField
        {...props}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        cellCount={CELL_COUNT}
        // The library defaults maxLength={cellCount}, which is enforced natively on the RAW string
        // before onChangeText can strip whitespace. iOS Voice Control dictation inserts a smart
        // leading space when appending to existing text (e.g. "A" + "BCDEF" -> "A BCDEF" = 7 chars),
        // so the native cap truncates the last real character ("5 of 6"). We give the field headroom
        // for whitespace artifacts and let onChangeText sanitize + slice to CELL_COUNT instead.
        maxLength={CELL_COUNT * 2}
        rootStyle={styles.root}
        renderCell={({ index, symbol, isFocused }) => (
          <Fragment key={index}>
            {separator && index === CELL_COUNT / 2 && <ThemedText style={styles.separator}>{'\u2013'}</ThemedText>}
            <ThemedText
              style={[styles.cell, isFocused && styles.cellFocused, error && !isFocused && styles.cellError]}
              onLayout={getCellOnLayoutHandler(index)}
            >
              {symbol || (isFocused ? <Cursor /> : null)}
            </ThemedText>
          </Fragment>
        )}
        {...textInputProps}
      />
      {error && (
        <ThemedText style={styles.subtext} variant={'labelSubtitle'} testID={`${textInputProps?.testID}-subtext`}>
          {error}
        </ThemedText>
      )}
    </View>
  )
}

export default CodeInput
