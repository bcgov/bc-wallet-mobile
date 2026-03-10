import { InputWithValidation } from './InputWithValidation'

interface DateInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  subtext?: string
}
const DateInput = ({ id, label, value, onChange, error, subtext }: DateInputProps) => {
  const maskDate = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 8)
    if (digits.length <= 4) {
      return digits
    }
    if (digits.length <= 6) {
      return `${digits.slice(0, 4)}-${digits.slice(4)}`
    }
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
  }

  return (
    <InputWithValidation
      id={id}
      label={label}
      value={value}
      onChange={(text) => onChange(maskDate(text))}
      error={error}
      subtext={subtext}
      textInputProps={{ placeholder: 'YYYY-MM-DD' }}
      keyboardType={'number-pad'} // use will only be entering numbers
    />
  )
}

export default DateInput
