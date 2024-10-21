import { useTheme } from '@hyperledger/aries-bifold-core'
import CheckBox from '@react-native-community/checkbox'

interface CustomCheckBoxProps {
  selected?: boolean
  setSelected?: (selected: boolean) => void
}

const CustomCheckBox = ({ selected, setSelected }: CustomCheckBoxProps) => {
  const { ColorPallet } = useTheme()
  return (
    <CheckBox
      boxType={'square'}
      value={selected}
      onValueChange={() => setSelected}
      onCheckColor={ColorPallet.grayscale.white}
      onFillColor={ColorPallet.brand.primary}
      onTintColor={ColorPallet.brand.primary}
      animationDuration={0}
      style={{ width: 24, height: 24, borderRadius: 0, borderColor: ColorPallet.brand.primary }}
    />
  )
}

export default CustomCheckBox
