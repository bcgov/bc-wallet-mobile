const navigate = jest.fn()

const navigation = {
  navigate,
  setOptions: jest.fn(),
  getParent: jest.fn(() => ({
    navigate,
  })),
  getState: jest.fn(() => ({
    index: jest.fn(),
  })),
  goBack: jest.fn(),
  pop: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  dispatch: jest.fn(),
  addListener: jest.fn(),
}

const useNavigation = () => {
  return navigation
}

export { useNavigation }
