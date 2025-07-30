import { DataLoader } from '@/bcsc-theme/hooks/useDataLoader'
import { Button, ButtonType, ThemedText, useTheme } from '@bifold/core'
import { ActivityIndicator, View } from 'react-native'

type SampleApiDisplayProps<T> = {
  dataLoader: DataLoader<T>
  title: string
}

const SampleApiDisplay = <T,>({ dataLoader, title }: SampleApiDisplayProps<T>) => {
  const { Spacing } = useTheme()
  const { load, isLoading, data, isReady, error } = dataLoader

  const Content = () => {
    if (isLoading) {
      return <ActivityIndicator size={'small'} />
    } else if (error) {
      return (
        <ThemedText variant={'caption'} style={{ color: 'red' }}>
          {`Error loading ${title}: ${error}`}
        </ThemedText>
      )
    } else if (isReady && data) {
      return (
        <>
          {Object.entries(data).map(([key, value]) => (
            <View key={key} style={{ marginBottom: Spacing.sm }}>
              <ThemedText variant={'caption'} style={{ fontWeight: 'bold' }}>
                {key}
              </ThemedText>
              <ThemedText variant={'caption'}>
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </ThemedText>
            </View>
          ))}
        </>
      )
    } else {
      return (
        <Button
          title={`Load ${title}`}
          accessibilityLabel={`Load ${title}`}
          buttonType={ButtonType.Secondary}
          onPress={load}
        />
      )
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ThemedText variant={'headingThree'} style={{ marginVertical: Spacing.md }}>
        {title}
      </ThemedText>
      <Content />
    </View>
  )
}

export default SampleApiDisplay
