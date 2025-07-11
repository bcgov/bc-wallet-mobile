import { Agent, MediatorPickupStrategy } from '@credo-ts/core'

export const batchPickup = async (agent: Agent): Promise<void> => {
  try {
    for (let i = 0; i < 2; i++) {
      agent.config.logger.debug(`Batch pickup attempt ${i + 1}`)
      agent.mediationRecipient.initiateMessagePickup(undefined, MediatorPickupStrategy.Implicit)
      await new Promise((resolve) => setTimeout(resolve, 50)) // wait for .05 seconds before next pickup
    }
  } catch (error) {
    agent.config.logger.error(`Error during batch pickup: ${error}`)
  }
}
