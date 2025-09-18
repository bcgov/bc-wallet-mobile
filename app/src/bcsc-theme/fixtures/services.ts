// @deprecated - remove after Services screens fully implemented
export interface ServiceData {
  id: string
  title: string
  description: string
  onPress: () => void
}

// @deprecated - remove after Services screens fully implemented
export const mockServices: ServiceData[] = [
  {
    id: '1',
    title: 'BC Parks Discover Camping',
    description: '',
    onPress: () => null,
  },
  {
    id: '2',
    title: 'Health Gateway',
    description:
      'View your B.C. health records in one place, including lab test results, medications, health visits, immunizations and more.',
    onPress: () => null,
  },
  {
    id: '3',
    title: 'Canada Revenue Agency - CRA Account',
    description: 'View and manage your personal and business tax and benefit information, and represent others online.',
    onPress: () => null,
  },
  {
    id: '4',
    title: 'My Service Canada Account',
    description: 'Access programs and benefits from Employment and Social Development Canada.',
    onPress: () => null,
  },
  {
    id: '5',
    title: 'StudentAid BC',
    description: 'Apply for a student loan or manage your loan.',
    onPress: () => null,
  },
]
