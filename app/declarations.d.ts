declare module '@bifold/core/utils/file-cache' {
  export { FileCache, CacheDataFile } from '@bifold/core/lib/typescript/src/utils/fileCache'
}

declare module '*.svg' {
  import { SvgProps } from 'react-native-svg'
  const content: React.FC<SvgProps>
  export default content
}

declare module '*.png'
declare module '*.jpg'
declare module '*.jpeg'
