import { useBCSCActivity } from '@/bcsc-theme/contexts/BCSCActivityContext'
import { PAIRING_CODE_LENGTH as CELL_COUNT } from '@/constants'
import { ThemedText, useTheme } from '@bifold/core'
import React, { Fragment, useCallback } from 'react'
import { FocusEvent, StyleSheet, TextInputProps, View } from 'react-native'
import { CodeField, Cursor, useClearByFocusCell } from 'react-native-confirmation-code-field'

const CELL_HEIGHT = 60
const CELL_BORDER_WIDTH = 2
const CELL_LINE_HEIGHT = CELL_HEIGHT - CELL_BORDER_WIDTH * 2

interface CodeInputProps {
  value: string
  onChange: (value: string) => void
  error?: string | null
  onErrorClear?: () => void
  separator?: boolean
  textInputProps?: TextInputProps
}

const CodeInput = ({ value, onChange, error, onErrorClear, separator, textInputProps }: CodeInputProps) => {
  const { ColorPalette, Spacing, Inputs } = useTheme()
  const { reportActivity } = useBCSCActivity() ?? {}

  const onChangeText = useCallback(
    (text: string) => {
      reportActivity?.()
      onErrorClear?.()
      onChange(text)
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
      justifyContent: 'space-between',
    },
    cell: {
      width: 50,
      height: CELL_HEIGHT,
      lineHeight: CELL_LINE_HEIGHT,
      fontSize: 32,
      backgroundColor: ColorPalette.grayscale.white,
      textAlign: 'center',
      textAlignVertical: 'center',
      borderRadius: 8,
      borderWidth: CELL_BORDER_WIDTH,
      borderColor: 'transparent',
      color: ColorPalette.brand.text,
      includeFontPadding: false,
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
