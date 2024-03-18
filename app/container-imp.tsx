import { Container, TOKENS, TokenMapping } from '@hyperledger/aries-bifold-core'
import { DependencyContainer } from 'tsyringe'

import Developer from './src/screens/Developer'
import Preface from './src/screens/Preface'
import Terms, { TermsVersion } from './src/screens/Terms'

export class AppContainer implements Container {
  private container: DependencyContainer
  public constructor(bifoldContainer: Container) {
    this.container = bifoldContainer.getContainer().createChildContainer()
  }
  public init(): Container {
    // eslint-disable-next-line no-console
    console.log(`Initializing BC Wallet App container`)
    // Here you can register any component to override components in core package
    // Example: Replacing button in core with custom button
    this.container.registerInstance(TOKENS.SCREEN_PREFACE, Preface)
    this.container.registerInstance(TOKENS.SCREEN_TERMS, { screen: Terms, version: TermsVersion })
    this.container.registerInstance(TOKENS.SCREEN_DEVELOPER, Developer)
    return this
  }

  public resolve<K extends keyof TokenMapping>(token: K): TokenMapping[K] {
    return this.container.resolve(token) as TokenMapping[K]
  }

  public getContainer(): DependencyContainer {
    return this.container
  }
}
