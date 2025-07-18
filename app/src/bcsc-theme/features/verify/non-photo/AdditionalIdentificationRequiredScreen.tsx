import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView } from 'react-native-gesture-handler'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

type AdditionalIdentificationRequiredScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.AdditionalIdentificationRequired>
}

const AdditionalIdentificationRequiredScreen: React.FC<AdditionalIdentificationRequiredScreenProps> = ({
  navigation,
}: AdditionalIdentificationRequiredScreenProps) => {
  const { ColorPallet, Spacing } = useTheme()
  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPallet.brand.primaryBackground,
    },
    scrollView: {
      flex: 1,
      padding: Spacing.md,
    },
    controlsContainer: {
      margin: Spacing.md,
      marginTop: 'auto',
      position: 'relative',
    },
  })
  return (
    <SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <Image source={{ uri: '' }} />
        <View>
          <ThemedText variant={'headingThree'}>
            {'You must provide additional ID case your BC Services Card does not have a photo on it.'}
          </ThemedText>
          <ThemedText>
            {`It's needed to verify your identity. You'll be asked to provide one or two government-issued IDs`}
          </ThemedText>
        </View>
        <View>
          <ThemedText variant={'headingThree'}>{'Check your ID'}</ThemedText>
          <ThemedText>{'Has the same name as on your BC Services Card'}</ThemedText>
          <ThemedText>{'Has a recent photo'}</ThemedText>
          <ThemedText>{'Is not expired'}</ThemedText>
        </View>
        <View>
          <ThemedText variant={'headingThree'}>{'Limited access to services'}</ThemedText>
          <ThemedText>{`Some services only accept the app when it's set up with a BC Services Card with a photo.`}</ThemedText>
        </View>
        <TouchableOpacity onPress={() => console.log('OPEN SO COOL WEBVIEW')}>
          <Text style={{ color: ColorPallet.brand.primary, marginTop: Spacing.sm }}>{'Which services?'}</Text>
          <Icon name={'help-circle'} />
        </TouchableOpacity>
        <View style={{ marginTop: Spacing.md }}>
          <Button
            title={'Choose ID'}
            accessibilityLabel={'Choose ID'}
            testID={''}
            onPress={() => console.log('Navigate to list of accepted card types')}
            buttonType={ButtonType.Secondary}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default AdditionalIdentificationRequiredScreen
