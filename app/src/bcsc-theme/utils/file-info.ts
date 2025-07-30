import { VerificationPhotoUploadPayload } from '../api/hooks/useEvidenceApi'
import { hashBase64 } from 'react-native-bcsc-core'
import RNFS from 'react-native-fs'
import { Buffer } from 'buffer'

export const getFileInfo = async (filePath: string) => {
  const stats = await RNFS.stat(filePath)
  const filename = filePath.split('/').pop() || 'selfie.png'
  return {
    filename,
    timestamp: new Date(stats.mtime).getTime() / 1000, // Convert to Unix timestamp
    size: stats.size,
  }
}

export const getPhotoMetadata = async (filePath: string): Promise<VerificationPhotoUploadPayload> => {
  const fileInfo = await getFileInfo(filePath)
  const jpegBytes = await RNFS.readFile(filePath, 'base64')
  const data = new Uint8Array(Buffer.from(jpegBytes, 'base64'))
  const photoSHA = await hashBase64(jpegBytes)

  const photoMetadata: VerificationPhotoUploadPayload = {
    content_length: data.byteLength,
    content_type: 'image/jpeg',
    date: Math.floor(fileInfo.timestamp),
    label: 'front',
    filename: fileInfo.filename,
    sha256: photoSHA,
  }
  return photoMetadata
}