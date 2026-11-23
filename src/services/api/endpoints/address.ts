import { api } from '../client'

/**
 * The signed-in customer's saved delivery address (/auth/me/address, a documented backend
 * addition). Checkout pre-fills from it; the account page edits it.
 */
export interface SavedAddress {
  fullName: string
  phone: { countryCode: string; number: string }
  address: string
  city: string
  postcode: string
  country: string
  updatedAt?: string | null
}

export async function getSavedAddress(signal?: AbortSignal) {
  const { data } = await api.get<{ address: SavedAddress | null }>('/auth/me/address', { signal })
  return data.address
}

export async function saveSavedAddress(address: SavedAddress) {
  const { data } = await api.put<{ address: SavedAddress }>('/auth/me/address', address)
  return data.address
}

export async function deleteSavedAddress() {
  await api.delete('/auth/me/address')
}

/** One line per part, as on a delivery label. */
export function addressLines(
  address: Pick<SavedAddress, 'address' | 'city' | 'postcode' | 'country'>,
) {
  return [address.address, `${address.city} ${address.postcode}`.trim(), address.country].filter(
    Boolean,
  )
}
