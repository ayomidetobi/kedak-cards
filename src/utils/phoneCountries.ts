import {
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  type CountryCode,
} from 'libphonenumber-js'

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' })

export const phoneCountryOptions = getCountries()
  .map((code) => {
    const name = countryNames.of(code) ?? code
    const callingCode = getCountryCallingCode(code)

    return {
      code,
      name,
      callingCode,
      label: `${name} (+${callingCode})`,
    }
  })
  .sort((left, right) => left.name.localeCompare(right.name))

const phoneCountryCodes = new Set<string>(getCountries())

export const deliveryCountryOptions = phoneCountryOptions.map(({ name }) => ({
  label: name,
  value: name,
}))

export function isSupportedPhoneCountry(value: string): value is CountryCode {
  return phoneCountryCodes.has(value)
}

export function isValidPhoneNumberForCountry(phoneNumber: string, countryCode: string) {
  if (!isSupportedPhoneCountry(countryCode)) return false
  return isValidPhoneNumber(phoneNumber, countryCode)
}
