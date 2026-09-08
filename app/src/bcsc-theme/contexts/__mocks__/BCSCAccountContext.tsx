import React from 'react'

export const useAccount = jest.fn(() => ({
  given_name: 'John',
  family_name: 'Doe',
  birthdate: '1990-01-01',
  card_expiry: '2025-12-31',
  email: 'john.doe@example.com',
  picture: null,
  fullname_formatted: 'Doe, John',
  account_expiration_date: new Date('2025-12-31'),
}))

export const BCSCAccountProvider = jest.fn(({ children }: { children: React.ReactNode }) => children)
