import {
  animatedComponents,
  AnimatedComponentsProvider,
  AuthProvider,
  ContainerProvider,
  ErrorBoundaryWrapper,
  MainContainer,
  NetworkProvider,
  StoreProvider,
  ThemeProvider,
  TourProvider,
} from '@bifold/core'
import React, { PropsWithChildren, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Config from 'react-native-config'
import { container } from 'tsyringe'

import { DeepLinkService, DeepLinkViewModel, DeepLinkViewModelProvider } from '@/bcsc-theme/features/deep-linking'
import { BCThemeNames, surveyMonkeyExitUrl, surveyMonkeyUrl } from '@/constants'
import { NavigationContainerProvider, navigationRef } from '@/contexts/NavigationContainerContext'
import { initialState, Mode, reducer } from '@/store'
import { themes } from '@/theme'
import { appLogger } from '@/utils/logger'
import tours from '@bcwallet-theme/features/tours'
import WebDisplay from '@screens/WebDisplay'
import { AppContainer } from '../container-imp'

type ProviderEntry = [React.ComponentType<any>, Record<string, any>?]

/**
 * Composes an array of providers into a single component, eliminating deep nesting.
 * Each entry is [ProviderComponent, props] - props are optional.
 */
const composeProviders = (providers: ProviderEntry[]): React.FC<PropsWithChildren> => {
  const Composed: React.FC<PropsWithChildren> = ({ children }) => {
    return providers.reduceRight<React.ReactNode>(
      (acc, [Provider, props = {}]) => <Provider {...props}>{acc}</Provider>,
      children
    ) as React.ReactElement
  }
  Composed.displayName = 'ComposedProviders'

  return Composed
}

export const AppProviders: React.FC<PropsWithChildren> = ({ children }) => {
  const { t } = useTranslation()
  const logger = appLogger
  const bifoldContainer = new MainContainer(container.createChildContainer()).init()
  const [surveyVisible, setSurveyVisible] = useState(false)
  const bcwContainer = new AppContainer(bifoldContainer, t, navigationRef.navigate, setSurveyVisible).init()

  const deepLinkViewModel = useMemo(() => {
    const service = new DeepLinkService()
    return new DeepLinkViewModel(service, logger)
  }, [logger])

  useEffect(() => {
    deepLinkViewModel.initialize()
  }, [deepLinkViewModel])

  const defaultTheme = Config.BUILD_TARGET === Mode.BCSC ? BCThemeNames.BCSC : BCThemeNames.BCWallet

  // Define providers as a flat array - much easier to read and modify
  const providers: ProviderEntry[] = useMemo(
    () => [
      [ErrorBoundaryWrapper, { logger }],
      [ContainerProvider, { value: bcwContainer }],
      [StoreProvider, { initialState, reducer }],
      [ThemeProvider, { themes, defaultThemeName: defaultTheme }],
      [NavigationContainerProvider],
      [DeepLinkViewModelProvider, { viewModel: deepLinkViewModel }],
      [AnimatedComponentsProvider, { value: animatedComponents }],
      [AuthProvider],
      [NetworkProvider],
      [TourProvider, { tours, overlayColor: 'black', overlayOpacity: 0.7 }],
    ],
    [bcwContainer, deepLinkViewModel, defaultTheme, logger]
  )

  const ComposedProviders = useMemo(() => composeProviders(providers), [providers])

  return (
    <ComposedProviders>
      <WebDisplay
        destinationUrl={surveyMonkeyUrl}
        exitUrl={surveyMonkeyExitUrl}
        visible={surveyVisible}
        onClose={() => setSurveyVisible(false)}
      />
      {children}
    </ComposedProviders>
  )
}
