import { InputWithValidation } from '@/bcsc-theme/components/InputWithValidation'
import { useState } from 'react'
import { View } from 'react-native'
// TODO (MD): Use localization and translations for the text in this file

interface UserAttributes {
  firstName: string
  lastName: string
  middleNames: string
  birthDate: string
}

export const UserAttributesForm: React.FC = () => {
  const [firstName, setFirstName] = useState<string>('')
  const [lastName, setLastName] = useState<string>('')
  const [middleNames, setMiddleNames] = useState<string>('')
  const [birthDate, setBirthDate] = useState<string>('')

  return (
    <View>
      <InputWithValidation
        inputLabel={'Last name'}
        value={lastName}
        onChange={(value) => setLastName(value)}
        inputSubtext={'Also known as surname or family name'}
      />

      <InputWithValidation
        inputLabel={'First name'}
        value={firstName}
        onChange={(value) => setFirstName(value)}
        inputSubtext={'Your first given name'}
      />

      <InputWithValidation
        inputLabel={'Middle names'}
        value={middleNames}
        onChange={(value) => setMiddleNames(value)}
        inputSubtext={'Additional given names. Only up to 2 are needed.'}
      />

      <InputWithValidation
        inputLabel={'Birth date'}
        value={middleNames}
        onChange={(value) => setBirthDate(value)}
        inputSubtext={''}
      />
    </View>
  )
}
