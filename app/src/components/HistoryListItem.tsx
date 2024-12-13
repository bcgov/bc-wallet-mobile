import { useAgent } from '@credo-ts/react-hooks'
import { TOKENS, useServices } from '@hyperledger/aries-bifold-core'
import { CustomRecord, HistoryCardType } from '@hyperledger/aries-bifold-core/App/modules/history/types'
import { formatTime } from '@hyperledger/aries-bifold-core/App/utils/helpers'
import React, { useEffect, useState } from 'react'

import CredentialAddedImg from '../assets/img/CredentialAdded.svg'
import FleurLysImg from '../assets/img/FleurLys.svg'
import ProofRequestImg from '../assets/img/ProofRequest.svg'
import RevocationImg from '../assets/img/Revocation.svg'
import ChangingSettings from '../assets/img/changing-settings.svg'

import CustomCheckBox from './CustomCheckBox'
import EventItem from './EventItem'

interface Props {
  item: CustomRecord
  openSwipeableId: string | null
  onOpenSwipeable: (id: string | null) => void
  selected?: boolean
  setSelected?: ({ id }: { id: string }) => void
  activateSelection?: boolean
  onDelete: (id: string) => void
  onViewDetails: () => void
}

interface HistoryContent {
  message?: string
  correspondenceName?: string
  createdAt?: Date
  id: string
  type: HistoryCardType
}

type DisplayDetails = {
  title: string | undefined
  body: string | undefined
  eventTime: string | undefined
}

const HistoryListItem: React.FC<Props> = ({
  item,
  openSwipeableId,
  onOpenSwipeable,
  selected,
  setSelected,
  activateSelection,
  onDelete,
  onViewDetails,
}) => {
  const [details, setDetails] = useState<DisplayDetails>({
    title: undefined,
    body: undefined,
    eventTime: undefined,
  })
  const { agent } = useAgent()
  const [loadHistory] = useServices([TOKENS.FN_LOAD_HISTORY])
  const content = item.content as HistoryContent

  const renderCardIcon = (type: HistoryCardType) => {
    const dimensions = { width: 24, height: 24 }
    switch (type) {
      case HistoryCardType.CardAccepted:
        return <CredentialAddedImg width={dimensions.width} height={dimensions.height} />
      case HistoryCardType.CardDeclined:
        return <RevocationImg width={dimensions.width} height={dimensions.height} />
      case HistoryCardType.InformationSent:
        return <ProofRequestImg width={dimensions.width} height={dimensions.height} />
      case HistoryCardType.PinChanged:
        return <ChangingSettings width={dimensions.width} height={dimensions.height} />
      default:
        return <FleurLysImg width={dimensions.width} height={dimensions.height} />
    }
  }

  useEffect(() => {
    const formatDetails = () => {
      setDetails({
        title: content.message ?? '',
        body: content.correspondenceName ?? '',
        eventTime: content.createdAt ? formatTime(new Date(content.createdAt), { shortMonth: true, trim: true }) : '',
      })
    }
    formatDetails()
  }, [item])

  const removeHistoryItem = async () => {
    const historyManager = agent ? loadHistory(agent) : undefined
    if (!historyManager) return
    const record = await historyManager.findGenericRecordById(item.content.id || '')
    if (record) {
      await historyManager.removeGenericRecord(record)
      onDelete(item.content.id ?? '')
    }
  }

  return (
    <EventItem
      action={onViewDetails}
      handleDelete={removeHistoryItem}
      event={{
        id: item.content.id ?? '',
        title: details.title,
        body: details.body,
        eventTime: details.eventTime,
        image: activateSelection ? (
          <CustomCheckBox
            selected={selected}
            setSelected={() => setSelected && setSelected({ id: item.content.id ?? '' })}
          />
        ) : (
          renderCardIcon(item.content.type as HistoryCardType)
        ),
      }}
      openSwipeableId={openSwipeableId}
      onOpenSwipeable={onOpenSwipeable}
      setSelected={setSelected}
      activateSelection={activateSelection}
      deleteMessage={'Activities.HistoryDeleted'}
    />
  )
}

export default HistoryListItem
