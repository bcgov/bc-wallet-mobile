declare module '*.svg' {
  import { SvgProps } from 'react-native-svg/lib/typescript'
  const content: React.FC<SvgProps>
  export default content
}

declare module 'react-native-argon2'
