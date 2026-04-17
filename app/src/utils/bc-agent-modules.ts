import {
  AnonCredsDidCommCredentialFormatService,
  AnonCredsDidCommProofFormatService,
  AnonCredsModule,
  DataIntegrityDidCommCredentialFormatService,
  DidCommCredentialV1Protocol,
  DidCommProofV1Protocol,
  LegacyIndyDidCommCredentialFormatService,
  LegacyIndyDidCommProofFormatService,
} from '@credo-ts/anoncreds'
import { AskarModule } from '@credo-ts/askar'
import { Agent, DidsModule } from '@credo-ts/core'
import {
  DidCommAutoAcceptCredential,
  DidCommAutoAcceptProof,
  DidCommConnectionsModule,
  DidCommCredentialV2Protocol,
  DidCommCredentialsModule,
  DidCommDifPresentationExchangeProofFormatService,
  DidCommHttpOutboundTransport,
  DidCommMediationRecipientModule,
  DidCommMediatorPickupStrategy,
  DidCommModule,
  DidCommProofV2Protocol,
  DidCommProofsModule,
  DidCommWsOutboundTransport,
} from '@credo-ts/didcomm'
import { PushNotificationsFcmModule } from '@credo-ts/didcomm-push-notifications'
import { DrpcModule } from '@credo-ts/drpc'
import { IndyVdrAnonCredsRegistry, IndyVdrModule, IndyVdrPoolConfig } from '@credo-ts/indy-vdr'
import { WebVhAnonCredsRegistry, WebVhDidResolver } from '@credo-ts/webvh'
import { anoncreds } from '@hyperledger/anoncreds-react-native'
import { indyVdr } from '@hyperledger/indy-vdr-react-native'
import { askar } from '@openwallet-foundation/askar-react-native'
import { CacheSettings, IndyVdrProxyAnonCredsRegistry, IndyVdrProxyDidResolver } from 'credo-ts-indy-vdr-proxy-client'

export type BCAgent = Agent<ReturnType<typeof getBCAgentModules>>

interface GetBCAgentModulesOptions {
  walletId: string
  walletKey: string
  indyNetworks: IndyVdrPoolConfig[]
  mediatorInvitationUrl?: string
  txnCache?: { capacity: number; expiryOffsetMs: number; path?: string }
  enableProxy?: boolean
  proxyBaseUrl?: string
  proxyCacheSettings?: CacheSettings
}

/**
 * Constructs the modules to be used in the agent setup
 * @param indyNetworks
 * @param mediatorInvitationUrl determine which mediator to use
 * @param txnCache optional local cache config for indyvdr
 * @param enableProxy boolean from the store to determine if proxy should be used
 * @param proxyBaseUrl URL of indy vdr proxy
 * @param proxyCacheSettings settings for above mentioned proxy client caching
 * @returns modules to be used in agent setup
 */
export function getBCAgentModules({
  walletId,
  walletKey,
  indyNetworks,
  mediatorInvitationUrl,
  txnCache,
  enableProxy,
  proxyBaseUrl,
  proxyCacheSettings,
}: GetBCAgentModulesOptions) {
  const indyCredentialFormat = new LegacyIndyDidCommCredentialFormatService()
  const indyProofFormat = new LegacyIndyDidCommProofFormatService()

  if (txnCache) {
    indyVdr.setLedgerTxnCache({
      capacity: txnCache.capacity,
      expiry_offset_ms: txnCache.expiryOffsetMs,
      path: txnCache.path,
    })
  }

  const modules = {
    askar: new AskarModule({
      askar,
      store: {
        id: walletId,
        key: walletKey,
      },
    }),
    anoncreds: new AnonCredsModule({
      anoncreds,
      registries: [new IndyVdrAnonCredsRegistry(), new WebVhAnonCredsRegistry()],
    }),
    indyVdr: new IndyVdrModule({
      indyVdr,
      networks: indyNetworks as [IndyVdrPoolConfig],
    }),
    didcomm: new DidCommModule({
      transports: {
        outbound: [new DidCommWsOutboundTransport(), new DidCommHttpOutboundTransport()],
      },
    }),
    connections: new DidCommConnectionsModule({
      autoAcceptConnections: true,
    }),
    credentials: new DidCommCredentialsModule({
      autoAcceptCredentials: DidCommAutoAcceptCredential.ContentApproved,
      credentialProtocols: [
        new DidCommCredentialV1Protocol({ indyCredentialFormat }),
        new DidCommCredentialV2Protocol({
          credentialFormats: [
            indyCredentialFormat,
            new AnonCredsDidCommCredentialFormatService(),
            new DataIntegrityDidCommCredentialFormatService(),
          ],
        }),
      ],
    }),
    proofs: new DidCommProofsModule({
      autoAcceptProofs: DidCommAutoAcceptProof.ContentApproved,
      proofProtocols: [
        new DidCommProofV1Protocol({ indyProofFormat }),
        new DidCommProofV2Protocol({
          proofFormats: [
            indyProofFormat,
            new AnonCredsDidCommProofFormatService(),
            new DidCommDifPresentationExchangeProofFormatService(),
          ],
        }),
      ],
    }),
    mediationRecipient: new DidCommMediationRecipientModule({
      mediatorInvitationUrl: mediatorInvitationUrl,
      mediatorPickupStrategy: DidCommMediatorPickupStrategy.Implicit,
    }),
    // TODO: (ar) test iOS
    pushNotificationsFcm: new PushNotificationsFcmModule(),
    // pushNotificationsApns: new PushNotificationsApnsModule(),
    dids: new DidsModule({
      resolvers: [new WebVhDidResolver()],
    }),
    drpc: new DrpcModule(),
  }

  if (enableProxy && proxyBaseUrl) {
    modules.anoncreds = new AnonCredsModule({
      anoncreds,
      registries: [
        new IndyVdrProxyAnonCredsRegistry({ proxyBaseUrl, cacheOptions: proxyCacheSettings }),
        new WebVhAnonCredsRegistry(),
      ],
    })
    modules.dids = new DidsModule({
      resolvers: [new IndyVdrProxyDidResolver({ proxyBaseUrl }), new WebVhDidResolver()],
    })
  }

  return modules
}
