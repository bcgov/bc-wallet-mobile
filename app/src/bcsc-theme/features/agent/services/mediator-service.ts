import { BifoldLogger } from '@bifold/core'
import { Agent } from '@credo-ts/core'
import {
  DidCommConnectionRecord,
  DidCommMediationRecord,
  DidCommMediatorPickupStrategy,
  parseInvitationUrl,
} from '@credo-ts/didcomm'

export interface MediatorSwitch {
  /** Invitation URL of the mediator to switch to. */
  mediatorUrl: string
  /**
   * Label the mediator sees for this wallet. Credo applies no agent-wide label to connections, and a
   * DID Exchange request without one fails validation before it leaves the device.
   */
  label: string
}

/** Mediator invitation URL without its invitation payload. */
export const mediatorHost = (mediatorUrl: string): string => mediatorUrl.split('?')[0]

/** The label the mediator put in its invitation, or the host when the URL carries none. */
export const mediatorLabel = (mediatorUrl: string): string => {
  try {
    return parseInvitationUrl(mediatorUrl).label || mediatorHost(mediatorUrl)
  } catch {
    return mediatorHost(mediatorUrl)
  }
}

/**
 * Connection to the mediator behind the invitation, made directly rather than through the current
 * mediator. A switch waits for the connection it makes, so one found incomplete here was left by an
 * attempt that never finished (a request that could not be sent, the app killed mid-handshake) and
 * will not complete on its own: it is discarded and the mediator is connected again.
 */
const connectToMediator = async (
  agent: Agent,
  { mediatorUrl, label }: MediatorSwitch,
  logger: BifoldLogger
): Promise<DidCommConnectionRecord> => {
  const invitation = await agent.didcomm.oob.parseInvitation(mediatorUrl)
  const outOfBandRecord = await agent.didcomm.oob.findByReceivedInvitationId(invitation.id)
  const [connection] = outOfBandRecord ? await agent.didcomm.connections.findAllByOutOfBandId(outOfBandRecord.id) : []

  if (connection?.isReady) {
    return connection
  }

  if (outOfBandRecord) {
    logger.info('Mediator switch: discarding an earlier connection to the mediator that never completed')
    if (connection) {
      await agent.didcomm.connections.deleteById(connection.id)
    }
    await agent.didcomm.oob.deleteById(outOfBandRecord.id)
  }

  logger.info('Mediator switch: connecting to the mediator')
  const routing = await agent.didcomm.mediationRecipient.getRouting({ useDefaultMediator: false })
  const { connectionRecord } = await agent.didcomm.oob.receiveInvitation(invitation, {
    label,
    routing,
    autoAcceptInvitation: true,
    autoAcceptConnection: true,
  })
  if (!connectionRecord) {
    throw new Error('Mediator invitation produced no connection')
  }

  return connectionRecord.isReady
    ? connectionRecord
    : agent.didcomm.connections.returnWhenIsConnected(connectionRecord.id)
}

/** Makes `mediation` the default mediator and moves live message pickup to it. */
const routeThrough = async (agent: Agent, mediation: DidCommMediationRecord, logger: BifoldLogger): Promise<void> => {
  await agent.didcomm.mediationRecipient.setDefaultMediator(mediation)
  try {
    await agent.didcomm.mediationRecipient.stopMessagePickup()
  } catch (error) {
    logger.info(`Mediator switch: no message pickup to stop: ${error}`)
  }
  await agent.didcomm.mediationRecipient.initiateMessagePickup(
    mediation,
    DidCommMediatorPickupStrategy.PickUpV2LiveMode
  )
}

/**
 * Switches the wallet to the mediator in `target` on the running agent. Mediation is requested on
 * first use; a mediator used before is re-selected. A failure after the default moved puts the
 * previous mediator back, so a rejected switch leaves nothing half-switched. The caller persists the
 * choice. Connections made earlier keep routing through their original mediator, which is no longer
 * picked up from, the same as after a restart.
 */
export const switchMediator = async (
  agent: Agent,
  target: MediatorSwitch,
  logger: BifoldLogger
): Promise<DidCommMediationRecord> => {
  const previous = await agent.didcomm.mediationRecipient.findDefaultMediator()
  const connection = await connectToMediator(agent, target, logger)
  // Requests mediation on first use, which also makes it the default; otherwise returns the record as is
  const mediation = await agent.didcomm.mediationRecipient.provision(connection)

  try {
    await routeThrough(agent, mediation, logger)
  } catch (error) {
    if (previous) {
      logger.warn(`Mediator switch failed after the default moved, restoring the previous mediator: ${error}`)
      await routeThrough(agent, previous, logger).catch((restoreError) =>
        logger.error(`Mediator switch: restoring the previous mediator failed: ${restoreError}`)
      )
    }
    throw error
  }

  logger.info('Mediator switch: default mediator and message pickup moved')
  return mediation
}
