import {
  AnonCredsCredentialFormatService,
  AnonCredsModule,
  AnonCredsProofFormatService,
  DataIntegrityCredentialFormatService,
  LegacyIndyCredentialFormatService,
  LegacyIndyProofFormatService,
  V1CredentialProtocol,
  V1ProofProtocol,
} from '@credo-ts/anoncreds'
import { AskarModule } from '@credo-ts/askar'
import {
  Agent,
  AutoAcceptCredential,
  AutoAcceptProof,
  ConnectionsModule,
  CredentialsModule,
  DidsModule,
  DifPresentationExchangeProofFormatService,
  MediationRecipientModule,
  MediatorPickupStrategy,
  ProofsModule,
  V2CredentialProtocol,
  V2ProofProtocol,
} from '@credo-ts/core'
import { DrpcModule } from '@credo-ts/drpc'
import { IndyVdrAnonCredsRegistry, IndyVdrModule, IndyVdrPoolConfig } from '@credo-ts/indy-vdr'
import { PushNotificationsApnsModule, PushNotificationsFcmModule } from '@credo-ts/push-notifications'
import { anoncreds } from '@hyperledger/anoncreds-react-native'
import { ariesAskar } from '@hyperledger/aries-askar-react-native'
import { indyVdr } from '@hyperledger/indy-vdr-react-native'
import { IndyVdrProxyDidResolver, IndyVdrProxyAnonCredsRegistry, CacheSettings } from 'credo-ts-indy-vdr-proxy-client'

export type BCAgent = Agent<ReturnType<typeof getBCAgentModules>>

interface GetBCAgentModulesOptions {
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
  indyNetworks,
  mediatorInvitationUrl,
  txnCache,
  enableProxy,
  proxyBaseUrl,
  proxyCacheSettings,
}: GetBCAgentModulesOptions) {
  const indyCredentialFormat = new LegacyIndyCredentialFormatService()
  const indyProofFormat = new LegacyIndyProofFormatService()

  if (txnCache) {
    indyVdr.setLedgerTxnCache({
      capacity: txnCache.capacity,
      expiry_offset_ms: txnCache.expiryOffsetMs,
      path: txnCache.path,
    })
  }

  const modules = {
    askar: new AskarModule({
      ariesAskar,
    }),
    anoncreds: new AnonCredsModule({
      anoncreds,
      registries: [new IndyVdrAnonCredsRegistry()],
    }),
    indyVdr: new IndyVdrModule({
      indyVdr,
      networks: indyNetworks as [IndyVdrPoolConfig],
    }),
    connections: new ConnectionsModule({
      autoAcceptConnections: true,
    }),
    credentials: new CredentialsModule({
      autoAcceptCredentials: AutoAcceptCredential.ContentApproved,
      credentialProtocols: [
        new V1CredentialProtocol({ indyCredentialFormat }),
        new V2CredentialProtocol({
          credentialFormats: [
            indyCredentialFormat,
            new AnonCredsCredentialFormatService(),
            new DataIntegrityCredentialFormatService(),
          ],
        }),
      ],
    }),
    proofs: new ProofsModule({
      autoAcceptProofs: AutoAcceptProof.ContentApproved,
      proofProtocols: [
        new V1ProofProtocol({ indyProofFormat }),
        new V2ProofProtocol({
          proofFormats: [
            indyProofFormat,
            new AnonCredsProofFormatService(),
            new DifPresentationExchangeProofFormatService(),
          ],
        }),
      ],
    }),
    mediationRecipient: new MediationRecipientModule({
      mediatorInvitationUrl: mediatorInvitationUrl,
      mediatorPickupStrategy: MediatorPickupStrategy.Implicit,
    }),
    pushNotificationsFcm: new PushNotificationsFcmModule(),
    pushNotificationsApns: new PushNotificationsApnsModule(),
    dids: new DidsModule(),
    drpc: new DrpcModule(),
  }

  if (enableProxy && proxyBaseUrl) {
    modules.anoncreds = new AnonCredsModule({
      anoncreds,
      registries: [new IndyVdrProxyAnonCredsRegistry({ proxyBaseUrl, cacheOptions: proxyCacheSettings })],
    })
    modules.dids = new DidsModule({
      resolvers: [new IndyVdrProxyDidResolver({ proxyBaseUrl })],
    })
  }

  return modules
}
