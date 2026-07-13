import { PressableOpacity } from '@/components/PressableOpacity'
import { CONTACT_US_GOVERNMENT_WEBSITE_URL, hitSlop } from '@/constants'
import { reportProblem } from '@/utils/logger'
import { Button, ButtonType, Link, testIdWithKey, ThemedText, useTheme } from '@bifold/core'
import Clipboard from '@react-native-clipboard/clipboard'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import CommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons'
import Icon from 'react-native-vector-icons/MaterialIcons'

const DESCRIPTION_MAX_LENGTH = 500
// A user-initiated report has no underlying error code; 0 marks it as user-originated in the report payload.
const USER_REPORT_ERROR_CODE = 0
const COPY_FEEDBACK_MS = 2000

export interface ReportProblemModalProps {
  visible: boolean
  onClose: () => void
}

/**
 * A fully custom (React Native `Modal`) "Report a problem" flow.
 *
 * The form collects a free-text description and hands it to the shared `reportProblem()` pipeline
 * (see PR #4076), which sends it to remote logging (Loki) and returns a report ID. The modal then
 * swaps to a confirmation view showing that ID so the user can quote it to support.
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
  const [reportId, setReportId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const copyResetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // One-shot submit guard. The Bifold Button has no tap throttle, so without this a double-tap landing
  // before the confirmation view swaps the button out would send two reports. Reset on each (re)open,
  // alongside the confirmation state, so a modal closed by the parent still reopens on the form.
  const submittedRef = useRef(false)
  useEffect(() => {
    if (visible) {
      submittedRef.current = false
      setReportId(null)
      setCopied(false)
    }
  }, [visible])

  useEffect(() => {
    return () => {
      if (copyResetTimeout.current) {
        clearTimeout(copyResetTimeout.current)
      }
    }
  }, [])

  // Don't allow an empty/whitespace-only report — it would just be noise in the incident logs.
  const canSubmit = description.trim().length > 0

  const handleClose = useCallback(() => {
    // Reset so the modal opens fresh next time.
    setDescription('')
    setReportId(null)
    setCopied(false)
    onClose()
  }, [onClose])

  const handleSubmit = useCallback(() => {
    // Guard against double-submit (see submittedRef above) and empty content.
    if (submittedRef.current || description.trim().length === 0) {
      return
    }
    submittedRef.current = true
    // Send the report through the shared pipeline. The description rides on a BifoldError.
    // const reportError = new BifoldError(t('BCSC.ReportProblem.Title'), description.trim(), '', USER_REPORT_ERROR_CODE)
    // // A user-initiated report isn't a thrown error, so the stack `new BifoldError` auto-captures is just
    // // this submit handler's frames — noise in the incident log. Drop it so the report carries only the
    // // user's description (real failures still keep their stack via the ErrorModal "Report" path).
    // reportError.stack = undefined
    // Showing the returned ID is what keeps the modal open on the confirmation view.
    setReportId(reportProblem(t('BCSC.ReportProblem.Title'), description.trim()))
  }, [t, description])

  const handleCopy = useCallback(() => {
    if (!reportId) {
      return
    }
    Clipboard.setString(reportId)
    setCopied(true)
    if (copyResetTimeout.current) {
      clearTimeout(copyResetTimeout.current)
    }
    copyResetTimeout.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS)
  }, [reportId])

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
    successIcon: {
      alignSelf: 'center',
    },
    reportIdBox: {
      borderWidth: 1,
      borderColor: ColorPalette.brand.primary,
      borderRadius: 8,
      paddingVertical: Spacing.md,
      backgroundColor: ColorPalette.grayscale.veryLightGrey,
    },
    reportIdValue: {
      ...TextTheme.headingThree,
      textAlign: 'center',
      color: ColorPalette.brand.primary,
      letterSpacing: 2,
    },
    copyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      gap: Spacing.sm,
      padding: Spacing.sm,
    },
    copyButtonText: {
      color: ColorPalette.brand.primary,
      fontWeight: 'bold',
    },
  })

  const renderForm = () => (
    <>
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
          linkText={t('BCSC.ReportProblem.SupportLink')}
          onPress={() => Linking.openURL(CONTACT_US_GOVERNMENT_WEBSITE_URL)}
        />
      </ThemedText>

      <Button
        title={t('BCSC.ReportProblem.Submit')}
        accessibilityLabel={t('BCSC.ReportProblem.Submit')}
        testID={testIdWithKey('ReportProblemSubmit')}
        buttonType={ButtonType.Primary}
        onPress={handleSubmit}
        disabled={!canSubmit}
      />
    </>
  )

  const renderConfirmation = () => (
    <>
      <ThemedText variant="headingThree" style={styles.title}>
        {t('BCSC.ReportProblem.SuccessTitle')}
      </ThemedText>

      <Icon
        name="check-circle"
        size={48}
        color={ColorPalette.brand.primary}
        style={styles.successIcon}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />

      <View>
        <ThemedText variant="bold" style={styles.fieldLabel}>
          {t('BCSC.ReportProblem.ReportIdLabel')}
        </ThemedText>
        <View style={styles.reportIdBox}>
          <ThemedText
            style={styles.reportIdValue}
            selectable
            accessibilityLabel={`${t('BCSC.ReportProblem.ReportIdLabel')}: ${reportId}`}
            testID={testIdWithKey('ReportProblemReportId')}
          >
            {reportId}
          </ThemedText>
        </View>
        <PressableOpacity
          style={styles.copyButton}
          onPress={handleCopy}
          accessibilityRole="button"
          accessibilityLabel={copied ? t('Error.CodeCopied') : t('Error.CopyCode')}
          testID={testIdWithKey('ReportProblemCopyReportId')}
        >
          <CommunityIcon name={copied ? 'check' : 'content-copy'} size={20} color={ColorPalette.brand.primary} />
          <ThemedText style={styles.copyButtonText}>{copied ? t('Error.CodeCopied') : t('Error.CopyCode')}</ThemedText>
        </PressableOpacity>
      </View>

      <ThemedText>{t('BCSC.ReportProblem.ReportIdHint')}</ThemedText>

      <Button
        title={t('Global.Done')}
        accessibilityLabel={t('Global.Done')}
        testID={testIdWithKey('ReportProblemDone')}
        buttonType={ButtonType.Primary}
        onPress={handleClose}
      />
    </>
  )

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
              {reportId ? renderConfirmation() : renderForm()}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

export default ReportProblemModal
