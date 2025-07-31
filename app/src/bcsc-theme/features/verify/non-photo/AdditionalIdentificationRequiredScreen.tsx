import { BCSCScreens, BCSCVerifyIdentityStackParams } from '@/bcsc-theme/types/navigators'
import { Button, ButtonType, ThemedText, useTheme } from '@bifold/core'
import { StackNavigationProp } from '@react-navigation/stack'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView } from 'react-native-gesture-handler'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import CardDetails from '@assets/img/card-details.svg'
import BulletPointWithText from '@/components/BulletPointWithText'

type AdditionalIdentificationRequiredScreenProps = {
  navigation: StackNavigationProp<BCSCVerifyIdentityStackParams, BCSCScreens.AdditionalIdentificationRequired>
}

const AdditionalIdentificationRequiredScreen: React.FC<AdditionalIdentificationRequiredScreenProps> = ({
  navigation,
}: AdditionalIdentificationRequiredScreenProps) => {
  const { ColorPalette, Spacing } = useTheme()
  const styles = StyleSheet.create({
    pageContainer: {
      flex: 1,
      justifyContent: 'space-between',
      backgroundColor: ColorPalette.brand.primaryBackground,
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
        <CardDetails {...{ height: 180, width: 180 }} />
        <View>
          <ThemedText variant={'headingFour'}>
            {'You must provide additional ID case your BC Services Card does not have a photo on it.'}
          </ThemedText>
          <ThemedText>
            {`It's needed to verify your identity. You'll be asked to provide one or two government-issued IDs`}
          </ThemedText>
        </View>
        <View>
          <ThemedText variant={'headingFour'}>{'Check your ID'}</ThemedText>
          <BulletPointWithText text={'Has the same name as on your BC Services Card'} />
          <BulletPointWithText text={'Has a recent photo'} />
          <BulletPointWithText text={'Is not expired'} />
        </View>
        <View>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            <ThemedText variant={'headingFour'}>{'Limited access to services'}</ThemedText>
            <TouchableOpacity onPress={() => console.log('OPEN SO COOL WEBVIEW')}>
              <Icon name={'open-in-new'} />
            </TouchableOpacity>
          </View>
          <ThemedText>{`Some services only accept the app when it's set up with a BC Services Card with a photo.`}</ThemedText>
        </View>
        <View style={{ marginTop: Spacing.md }}>
          <Button
            title={'Choose ID'}
            accessibilityLabel={'Choose ID'}
            testID={''}
            onPress={() => {
              navigation.navigate(BCSCScreens.EvidenceTypeList)
            }}
            buttonType={ButtonType.Primary}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default AdditionalIdentificationRequiredScreen
