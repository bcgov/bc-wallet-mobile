import { useBCSCAgentSafe } from '@/bcsc-theme/features/agent/BCSCAgentProvider'
import { CredentialMetadata, credentialCustomMetadata } from '@bifold/core'
import { useConnections, useCredentialByState } from '@bifold/react-hooks'
import {
  DidCommBasicMessageRecord,
  DidCommBasicMessageRepository,
  DidCommBasicMessageRole,
  DidCommCredentialExchangeRepository,
  DidCommCredentialState,
  DidCommRevocationNotification,
} from '@credo-ts/didcomm'
import React, { useCallback, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  button: {
    backgroundColor: '#1976d2',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
})

/**
 * NotificationTestTriggers is a development utility component that provides buttons to trigger test notifications (BasicMessage and Revocation) within the app.
 * It checks for necessary conditions (like agent initialization and existing connections/credentials) before allowing the triggers, and displays status messages about the actions taken.
 *
 * @return {*}
 */
const NotificationTestTriggers: React.FC = () => {
  const ctx = useBCSCAgentSafe()
  const agent = ctx?.agent
  const { records: connections } = useConnections()
  const credsDone = useCredentialByState(DidCommCredentialState.Done)
  const [status, setStatus] = useState('')

  const triggerBasicMessage = useCallback(async () => {
    if (!agent) {
      Alert.alert('Agent not ready', 'The agent must be initialized to trigger notifications.')
      return
    }

    const connection = connections[0]
    if (!connection) {
      Alert.alert('No connections', 'You need at least one connection to trigger a basic message notification.')
      return
    }

    const record = new DidCommBasicMessageRecord({
      threadId: `test-${Date.now()}`,
      connectionId: connection.id,
      role: DidCommBasicMessageRole.Receiver,
      content: 'Test notification message',
      sentTime: new Date().toISOString(),
    })

    const repo = agent.context.dependencyManager.resolve(DidCommBasicMessageRepository)
    await repo.save(agent.context, record)
    setStatus(`BasicMessage created for connection "${connection.theirLabel ?? connection.id}"`)
  }, [agent, connections])

  const triggerRevocation = useCallback(async () => {
    if (!agent) {
      Alert.alert('Agent not ready', 'The agent must be initialized to trigger notifications.')
      return
    }

    const credential = credsDone.find((c) => {
      const meta = c.metadata.get(CredentialMetadata.customMetadata) as credentialCustomMetadata | undefined
      return !c.revocationNotification && meta?.revoked_seen === undefined
    })
    if (!credential) {
      Alert.alert('No eligible credentials', 'No credentials in Done state available for revocation test.')
      return
    }

    credential.revocationNotification = new DidCommRevocationNotification('Test revocation')
    const repo = agent.context.dependencyManager.resolve(DidCommCredentialExchangeRepository)
    await repo.update(agent.context, credential)
    setStatus(`Revocation set on credential "${credential.id.slice(0, 8)}..."`)
  }, [agent, credsDone])

  if (!agent) {
    return (
      <View style={styles.container}>
        <Text style={styles.statusText}>Agent not initialized — notification triggers unavailable</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.button, connections.length === 0 && styles.buttonDisabled]}
        onPress={triggerBasicMessage}
        disabled={connections.length === 0}
      >
        <Text style={styles.buttonText}>Trigger BasicMessage{connections.length === 0 ? ' (no connections)' : ''}</Text>
      </Pressable>

      <Pressable
        style={[styles.button, credsDone.length === 0 && styles.buttonDisabled]}
        onPress={triggerRevocation}
        disabled={credsDone.length === 0}
      >
        <Text style={styles.buttonText}>Trigger Revocation{credsDone.length === 0 ? ' (no credentials)' : ''}</Text>
      </Pressable>

      {status ? <Text style={styles.statusText}>{status}</Text> : null}
    </View>
  )
}

export default NotificationTestTriggers
