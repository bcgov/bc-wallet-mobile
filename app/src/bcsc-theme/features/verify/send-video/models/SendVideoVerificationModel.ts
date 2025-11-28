import useEvidenceApi, {
  VerificationPhotoUploadPayload,
  VerificationVideoUploadPayload,
} from '@/bcsc-theme/api/hooks/useEvidenceApi'
import { getVideoMetadata } from '@/bcsc-theme/utils/file-info'
import readFileInChunks from '@/utils/read-file'
import { BifoldLogger } from '@bifold/core'
import RNFS from 'react-native-fs'
import { VerificationVideoCache } from '../VideoReviewScreen'

type EvidenceApi = ReturnType<typeof useEvidenceApi>

export class SendVideoVerificationModel {
  private evidenceApi: EvidenceApi
  private logger: BifoldLogger

  constructor(evidenceApi: EvidenceApi, logger: BifoldLogger) {
    this.evidenceApi = evidenceApi
    this.logger = logger
  }

  async getVideoMetadataAndBytes(videoPath: string, videoDuration: number, prompts: any[]) {
    const [videoBytes, videoStats] = await Promise.all([
      VerificationVideoCache.getCachedMedia(videoPath, this.logger),
      RNFS.stat(videoPath),
    ])

    const videoMetadata = await getVideoMetadata(videoBytes, videoDuration, prompts, videoStats.mtime)

    return { videoBytes, videoMetadata }
  }

  async uploadVideoMetadata(videoBytes: Buffer, videoMetadata: VerificationVideoUploadPayload) {
    this.logger.debug(`Selfie video bytes length: ${videoBytes.length}`)

    const videoMetadataResponse = await this.evidenceApi.uploadVideoEvidenceMetadata(videoMetadata)
    const { upload_uri } = await this.evidenceApi.uploadVideoEvidenceBinary(
      videoMetadataResponse.upload_uri,
      videoBytes
    )

    return upload_uri
  }

  async uploadPhotoMetadata(path: string, photoMetadata: VerificationPhotoUploadPayload): Promise<[string, Buffer]> {
    const photoBytes = await readFileInChunks(path, this.logger)
    this.logger.debug(`Selfie photo bytes length: ${photoBytes.length}`)

    const photoMetadataResponse = await this.evidenceApi.uploadPhotoEvidenceMetadata(photoMetadata)
    const { upload_uri } = await this.evidenceApi.uploadPhotoEvidenceBinary(
      photoMetadataResponse.upload_uri,
      photoBytes
    )

    return [upload_uri, photoBytes]
  }
}
