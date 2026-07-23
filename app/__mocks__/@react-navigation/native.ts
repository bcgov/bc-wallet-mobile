const navigate = jest.fn()
const dispatch = jest.fn()
const replace = jest.fn()
const navigation = {
  __timestamp: process.hrtime(),
  navigate,
  replace,
  setOptions: jest.fn(),
  setParams: jest.fn(),
  getParent: () => {
    return {
      navigate,
      dispatch,
      replace,
    }
  },
  getState: jest.fn(() => ({
    index: jest.fn(),
  })),
  goBack: jest.fn(),
  canGoBack: jest.fn(),
  pop: jest.fn(),
  reset: jest.fn(),
  isFocused: () => true,
  dispatch,
}

const useNavigation = () => {
  return navigation
}

const useIsFocused = () => {
  return true
}

const useRoute = jest.fn().mockReturnValue({ params: {} })

const CommonActions = {
  navigate: jest.fn((route) => ({ type: 'NAVIGATE', payload: route })),
  reset: jest.fn((state) => ({ type: 'RESET', payload: state })),
  goBack: jest.fn(() => ({ type: 'GO_BACK' })),
}

const StackActions = {
  push: jest.fn((name, params) => ({ type: 'PUSH', payload: { name, params } })),
  replace: jest.fn((name, params) => ({ type: 'REPLACE', payload: { name, params } })),
  pop: jest.fn((count) => ({ type: 'POP', payload: { count } })),
}

const useFocusEffect = jest.fn()
const createNavigatorFactory = jest.fn()
const createNavigationContainerRef = jest.fn(() => ({
  isReady: jest.fn(() => false),
  getCurrentRoute: jest.fn(() => undefined),
  navigate: jest.fn(),
  dispatch: jest.fn(),
}))

export {
  CommonActions,
  StackActions,
  createNavigationContainerRef,
  createNavigatorFactory,
  useFocusEffect,
  useIsFocused,
  useNavigation,
  useRoute,
}
