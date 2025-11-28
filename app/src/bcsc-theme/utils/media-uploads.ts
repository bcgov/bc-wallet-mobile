import { DEFAULT_SELFIE_VIDEO_FILENAME, VIDEO_MP4_MIME_TYPE } from '@/constants'
import { hashBase64 } from 'react-native-bcsc-core'
import { VerificationPrompt, VerificationVideoUploadPayload } from '../api/hooks/useEvidenceApi'

export const getVideoMetadata = async (
  buffer: Buffer,
  videoDuration: number,
  prompts: VerificationPrompt[]
): Promise<VerificationVideoUploadPayload> => {
  const videoSHA = await hashBase64(buffer.toString('base64'))
  const metadataPrompts = prompts.map(({ id }, i) => ({ id, prompted_at: i }))

  return {
    content_type: VIDEO_MP4_MIME_TYPE,
    content_length: buffer.byteLength,
    date: -1,
    sha256: videoSHA,
    duration: videoDuration,
    filename: DEFAULT_SELFIE_VIDEO_FILENAME,
    prompts: metadataPrompts,
  }
}
