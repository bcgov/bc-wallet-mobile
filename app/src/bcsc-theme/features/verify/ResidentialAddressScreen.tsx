import { DropdownWithValidation } from '@/bcsc-theme/components/DropdownWithValidation'
import { InputWithValidation } from '@/bcsc-theme/components/InputWithValidation'
import { BCSCScreens, BCSCVerifyStackParams } from '@/bcsc-theme/types/navigators'
import { PROVINCE_OPTIONS } from '@/bcsc-theme/utils/address-utils'
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
import { View } from 'react-native'

import useResidentialAddressModel from './_models/useResidentialAddressModel'

type ResidentialAddressScreenProps = StackScreenProps<BCSCVerifyStackParams, BCSCScreens.ResidentialAddress>

/**
 * Screen for collecting residential address information from the user.
 *
 * @returns {*} {JSX.Element} The ResidentialAddressScreen component.
 */
export const ResidentialAddressScreen = ({ navigation }: ResidentialAddressScreenProps) => {
  const { t } = useTranslation()
  const { Spacing } = useTheme()
  const { ButtonLoading } = useAnimatedComponents()

  const { formState, formErrors, isSubmitting, handleChange, handleSubmit } = useResidentialAddressModel({ navigation })

  return (
    <ScreenWrapper keyboardActive={true} scrollViewContainerStyle={{ gap: Spacing.lg }}>
      <ThemedText variant={'headingThree'}>{t('BCSC.Address.Heading')}</ThemedText>

      <ThemedText>{t('BCSC.Address.Paragraph')}</ThemedText>

      <InputWithValidation
        id={'streetAddress1'}
        label={t('BCSC.Address.StreetAddressLabel')}
        value={formState.streetAddress}
        onChange={(value) => handleChange('streetAddress', value)}
        error={formErrors.streetAddress}
        subtext={t('BCSC.Address.StreetAddressSubtext')}
      />

      <InputWithValidation
        id={'city'}
        label={t('BCSC.Address.CityLabel')}
        value={formState.city}
        onChange={(value) => handleChange('city', value)}
        error={formErrors.city}
        subtext={t('BCSC.Address.CitySubtext')}
      />

      <DropdownWithValidation
        id={'province'}
        label={t('BCSC.Address.ProvinceLabel')}
        value={formState.province}
        options={PROVINCE_OPTIONS}
        onChange={(value) => handleChange('province', value)}
        error={formErrors.province}
        placeholder={t('BCSC.Address.ProvinceSubtext')}
        subtext={t('BCSC.Address.ProvinceSubtext')}
      />

      <InputWithValidation
        id={'postalCode'}
        label={t('BCSC.Address.PostalCodeLabel')}
        value={formState.postalCode}
        onChange={(value) => handleChange('postalCode', value)}
        error={formErrors.postalCode}
        subtext={t('BCSC.Address.PostalCodeSubtext')}
      />

      <View style={{ marginTop: 48, width: '100%' }}>
        <View style={{ marginBottom: 20 }}>
          <Button
            title={t('Global.Continue')}
            accessibilityLabel={t('Global.Continue')}
            testID={testIdWithKey('ResidentialAddressContinue')}
            buttonType={ButtonType.Primary}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting && <ButtonLoading />}
          </Button>
        </View>
      </View>
    </ScreenWrapper>
  )
}
