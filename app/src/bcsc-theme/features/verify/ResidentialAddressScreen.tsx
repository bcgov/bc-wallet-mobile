import { ControlContainer } from '@/bcsc-theme/components/ControlContainer'
import { DropdownWithValidation } from '@/bcsc-theme/components/DropdownWithValidation'
import { InputWithValidation } from '@/bcsc-theme/components/InputWithValidation'
import useFocusFirstInvalidField from '@/bcsc-theme/hooks/useFocusFirstInvalidField'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { PROVINCE_OPTIONS } from '@/bcsc-theme/utils/address-utils'
import { TestIds } from '@/test-ids/registry'
import {
  Button,
  ButtonType,
  ScreenWrapper,
  testIdWithKey,
  ThemedText,
  useAnimatedComponents,
  useTheme,
} from '@bifold/core'
import { StackScreenProps } from '@react-navigation/stack'
import { useTranslation } from 'react-i18next'
import useResidentialAddressModel, { ResidentialAddressFormState } from './_models/useResidentialAddressModel'

type ResidentialAddressScreenProps = StackScreenProps<BCSCVerifyStackParams, BCSCScreens.ResidentialAddress>

const FIELD_ORDER: (keyof ResidentialAddressFormState)[] = [
  'streetAddress',
  'streetAddress2',
  'city',
  'province',
  'postalCode',
]

/**
 * Screen for collecting residential address information from the user.
 *
 * @returns {*} {React.ReactElement} The ResidentialAddressScreen component.
 */
export const ResidentialAddressScreen = ({ navigation }: ResidentialAddressScreenProps) => {
  const { t } = useTranslation()
  const { ColorPalette, Spacing } = useTheme()
  const { ButtonLoading } = useAnimatedComponents()
  const { scrollViewRef, inputRefs, onFieldLayout, focusFirstInvalidField } = useFocusFirstInvalidField(FIELD_ORDER)

  const { formState, formErrors, isSubmitting, handleChange, handleSubmit } = useResidentialAddressModel({
    navigation,
    onInvalidSubmit: focusFirstInvalidField,
  })

  const labelProps = { color: ColorPalette.brand.primary }

  const controls = (
    <ControlContainer>
      <Button
        title={t('Global.Continue')}
        accessibilityLabel={t('Global.Continue')}
        testID={testIdWithKey(TestIds.verify.residentialAddress.continue)}
        buttonType={ButtonType.Primary}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting && <ButtonLoading />}
      </Button>
    </ControlContainer>
  )

  return (
    <ScreenWrapper
      keyboardActive
      padded={false}
      controls={controls}
      scrollViewRef={scrollViewRef}
      scrollViewContainerStyle={{
        flexGrow: 1,
        gap: Spacing.sm,
        padding: Spacing.lg,
      }}
    >
      <ThemedText variant={'headingThree'}>{t('BCSC.Address.Heading')}</ThemedText>
      <ThemedText>{t('BCSC.Address.Paragraph')}</ThemedText>

      <InputWithValidation
        ref={inputRefs.streetAddress}
        id={'streetAddress1'}
        label={t('BCSC.Address.StreetAddressLabel')}
        labelProps={labelProps}
        value={formState.streetAddress}
        onChange={(value) => handleChange('streetAddress', value)}
        error={formErrors.streetAddress}
        textInputProps={{ autoCorrect: false, autoComplete: 'address-line1', textContentType: 'streetAddressLine1' }}
        onLayout={onFieldLayout('streetAddress')}
      />

      <InputWithValidation
        ref={inputRefs.streetAddress2}
        id={'streetAddress2'}
        label={t('BCSC.Address.StreetAddress2Label')}
        labelProps={labelProps}
        value={formState.streetAddress2}
        onChange={(value) => handleChange('streetAddress2', value)}
        error={formErrors.streetAddress2}
        textInputProps={{ autoCorrect: false, autoComplete: 'address-line2', textContentType: 'streetAddressLine2' }}
        onLayout={onFieldLayout('streetAddress2')}
      />

      <InputWithValidation
        ref={inputRefs.city}
        id={'city'}
        label={t('BCSC.Address.CityLabel')}
        labelProps={labelProps}
        value={formState.city}
        onChange={(value) => handleChange('city', value)}
        error={formErrors.city}
        textInputProps={{ autoCorrect: false, autoComplete: 'postal-address-locality', textContentType: 'addressCity' }}
        onLayout={onFieldLayout('city')}
      />

      <DropdownWithValidation
        id={'province'}
        label={t('BCSC.Address.ProvinceLabel')}
        labelProps={labelProps}
        value={formState.province}
        options={PROVINCE_OPTIONS}
        onChange={(value) => handleChange('province', value)}
        onModalClose={() => {
          if (!formState.postalCode) {
            // Focus the postal code input after the province dropdown is closed, if postal code is empty
            inputRefs.postalCode.current?.focus()
          }
        }}
        error={formErrors.province}
        placeholder={t('BCSC.Address.ProvincePlaceholder')}
        subtext={t('BCSC.Address.ProvinceSubtext')}
        onLayout={onFieldLayout('province')}
      />

      <InputWithValidation
        ref={inputRefs.postalCode}
        id={'postalCode'}
        label={t('BCSC.Address.PostalCodeLabel')}
        labelProps={labelProps}
        value={formState.postalCode}
        onChange={(value) => handleChange('postalCode', value)}
        error={formErrors.postalCode}
        subtext={t('BCSC.Address.PostalCodeSubtext')}
        textInputProps={{
          autoCorrect: false,
          autoCapitalize: 'characters',
          autoComplete: 'postal-code',
          textContentType: 'postalCode',
        }}
        onLayout={onFieldLayout('postalCode')}
      />
    </ScreenWrapper>
  )
}
