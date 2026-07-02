import { PressableOpacity } from '@/components/PressableOpacity'
import { BC_LOGIN_PRIVACY_URL, CONTACT_US_GOVERNMENT_WEBSITE_URL, hitSlop } from '@/constants'
import { reportProblem } from '@/utils/logger'
import { BifoldError, Button, ButtonType, CheckBoxRow, Link, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  PixelRatio,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialIcons'

const DESCRIPTION_MAX_LENGTH = 500
// A user-initiated report has no underlying error code; 0 marks it as user-originated in the report payload.
const USER_REPORT_ERROR_CODE = 0

export interface ReportProblemModalProps {
  visible: boolean
  onClose: () => void
}

/**
 * A fully custom (React Native `Modal`) "Report a problem" flow.
 *
 * The form collects a free-text description and, optionally, basic app/device details. On submit it
 * hands the report to the shared `reportProblem()` pipeline (see PR #4076), which sends it to remote
 * logging (Loki), then closes — it is intentionally fire-and-forget (no reference-code receipt).
 *
 * The modal is self-contained and rendered from the floating help menu, so it works in every stack
 * without registering a per-stack screen.
 */
export const ReportProblemModal = ({ visible, onClose }: ReportProblemModalProps) => {
  const { t } = useTranslation()
  const { Spacing, ColorPalette, TextTheme } = useTheme()
  // Inset works inside this RN Modal because the app's root SafeAreaProvider context crosses the
  // modal boundary; applied as scroll padding so the action button clears the home indicator.
  const insets = useSafeAreaInsets()

  const [description, setDescription] = useState('')
  const [includeDeviceDetails, setIncludeDeviceDetails] = useState(false)

  // One-shot submit guard. The Bifold Button has no tap throttle and stays mounted/pressable through the
  // slide-out animation, so without this a fast double-tap would send two reports. Reset on each (re)open.
  const submittedRef = useRef(false)
  useEffect(() => {
    if (visible) {
      submittedRef.current = false
    }
  }, [visible])

  // Don't allow an empty/whitespace-only report — it would just be noise in the incident logs.
  const canSubmit = description.trim().length > 0

  const handleClose = useCallback(() => {
    // Reset so the modal opens fresh next time.
    setDescription('')
    setIncludeDeviceDetails(false)
    onClose()
  }, [onClose])

  const handleSubmit = useCallback(() => {
    // Guard against double-submit (see submittedRef above) and empty content.
    if (submittedRef.current || description.trim().length === 0) {
      return
    }
    submittedRef.current = true
    // Send the report through the shared pipeline. The description rides on a BifoldError; device labels
    // are attached only when the user opted in. The returned reference code is intentionally ignored —
    // this flow is fire-and-forget, so we just close once the report has been handed off.
    const reportError = new BifoldError(t('BCSC.ReportProblem.Title'), description.trim(), '', USER_REPORT_ERROR_CODE)
    // A user-initiated report isn't a thrown error, so the stack `new BifoldError` auto-captures is just
    // this submit handler's frames — noise in the incident log. Drop it so the report carries only the
    // user's description (real failures still keep their stack via the ErrorModal "Report" path).
    reportError.stack = undefined
    reportProblem(reportError, { includeDeviceDetails })
    handleClose()
  }, [t, description, includeDeviceDetails, handleClose])

  // RN scales fontSize with the OS font setting but NOT lineHeight, so a fixed 18px line box clips the
  // fine print at large font sizes. Scale the tightened leading with the font setting to preserve the
  // Figma spacing at the default size while staying legible when the user bumps their font scale up.
  const fineLineHeight = Math.round(18 * PixelRatio.getFontScale())

  const styles = StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: ColorPalette.notification.popupOverlay,
    },
    sheet: {
      backgroundColor: ColorPalette.brand.primaryBackground,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: '90%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.md,
    },
    content: {
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.sm,
      gap: Spacing.md,
    },
    title: {
      textAlign: 'center',
      color: ColorPalette.brand.primary,
    },
    fieldLabel: {
      color: ColorPalette.brand.primary,
      marginBottom: Spacing.sm,
    },
    input: {
      ...TextTheme.normal,
      minHeight: 96,
      borderWidth: 1,
      borderColor: ColorPalette.grayscale.mediumGrey,
      borderRadius: 8,
      padding: Spacing.sm,
      textAlignVertical: 'top',
      backgroundColor: ColorPalette.grayscale.veryLightGrey,
    },
    fineText: {
      ...TextTheme.caption,
      // caption (14px) ships no lineHeight, so it falls back to BCSans' loose natural leading.
      // Set an explicit tighter line height to match the Figma spacing for this fine print.
      lineHeight: fineLineHeight,
      color: ColorPalette.grayscale.darkGrey,
    },
    // Link inside the fine print: match the 14px size/leading but intentionally set NO color, so the
    // Link's own blue link colour shows through (setting a color here would override it to grey).
    fineTextLink: {
      fontSize: TextTheme.caption.fontSize,
      lineHeight: fineLineHeight,
    },
  })

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      testID={testIdWithKey('ReportProblemModal')}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.root}>
          {/* Backdrop tap dismisses the modal. Hidden from the accessibility tree so screen-reader users
              don't land on a full-screen "Close" target ahead of the form; they use the header X instead. */}
          <PressableOpacity
            style={StyleSheet.absoluteFill}
            onPress={handleClose}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          />
          <View style={styles.sheet}>
            <View style={styles.header}>
              <PressableOpacity
                onPress={handleClose}
                hitSlop={hitSlop}
                accessibilityRole="button"
                accessibilityLabel={t('Global.Close')}
                testID={testIdWithKey('ReportProblemClose')}
              >
                <Icon name="close" size={24} color={ColorPalette.brand.headerText} />
              </PressableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={[styles.content, { paddingBottom: Spacing.md + insets.bottom }]}
              keyboardShouldPersistTaps="handled"
            >
              <ThemedText variant="headingThree" style={styles.title}>
                {t('BCSC.ReportProblem.Title')}
              </ThemedText>

              <ThemedText>{t('BCSC.ReportProblem.Intro')}</ThemedText>

              <View>
                <ThemedText variant="bold" style={styles.fieldLabel}>
                  {t('BCSC.ReportProblem.DescriptionLabel')}
                </ThemedText>
                <TextInput
                  style={styles.input}
                  multiline
                  maxLength={DESCRIPTION_MAX_LENGTH}
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t('BCSC.ReportProblem.DescriptionPlaceholder')}
                  placeholderTextColor={ColorPalette.grayscale.mediumGrey}
                  accessibilityLabel={t('BCSC.ReportProblem.DescriptionLabel')}
                  testID={testIdWithKey('ReportProblemDescription')}
                />
              </View>

              {/* Reporting-only disclaimer with an inline link to BC support for users who need a reply. */}
              <ThemedText>
                <ThemedText variant="bold">{t('BCSC.ReportProblem.NotePrefix')}</ThemedText>
                {t('BCSC.ReportProblem.NoteBody')}
                <Link
                  linkText={t('BCSC.ReportProblem.ContactUsLink')}
                  onPress={() => Linking.openURL(CONTACT_US_GOVERNMENT_WEBSITE_URL)}
                />
              </ThemedText>

              {/* Fine-print collection notice with an inline Privacy Policy link. */}
              <ThemedText style={styles.fineText}>
                {t('BCSC.ReportProblem.CollectionNotice')}
                {' ['}
                <Link
                  style={styles.fineTextLink}
                  linkText={t('BCSC.ReportProblem.PrivacyPolicyLink')}
                  onPress={() => Linking.openURL(BC_LOGIN_PRIVACY_URL)}
                />
                {']'}
              </ThemedText>

              <CheckBoxRow
                title={t('BCSC.ReportProblem.IncludeDeviceDetails')}
                accessibilityLabel={t('BCSC.ReportProblem.IncludeDeviceDetails')}
                testID={testIdWithKey('ReportProblemIncludeDeviceDetails')}
                checked={includeDeviceDetails}
                onPress={() => setIncludeDeviceDetails((prev) => !prev)}
              />

              <Button
                title={t('BCSC.ReportProblem.Submit')}
                accessibilityLabel={t('BCSC.ReportProblem.Submit')}
                testID={testIdWithKey('ReportProblemSubmit')}
                buttonType={ButtonType.Primary}
                onPress={handleSubmit}
                disabled={!canSubmit}
              />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

export default ReportProblemModal
