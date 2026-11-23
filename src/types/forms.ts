import { z } from 'zod'
import { isSupportedPhoneCountry, isValidPhoneNumberForCountry } from '../utils/phoneCountries'

export const compatibilitySchema = z.object({
  country: z.string().min(1, 'Choose the country that issued your card.'),
  network: z.string().min(1, 'Choose your card network.'),
  cardType: z.string().min(1, 'Choose your card type.'),
  hasChip: z.boolean(),
  acknowledged: z.boolean().refine(Boolean, 'Please confirm you understand the conversion risks.'),
})

/** Recipient and delivery fields: shared by checkout and the account's saved address. */
const deliveryFields = {
  fullName: z.string().trim().min(2, 'Enter your full name.'),
  address: z.string().trim().min(3, 'Enter your return address.'),
  city: z.string().trim().min(2, 'Enter your city.'),
  postcode: z.string().trim().min(3, 'Enter a valid postcode.'),
  country: z.string().min(1, 'Choose a country.'),
  phoneCountry: z
    .string()
    .min(1, 'Choose a country calling code.')
    .refine(isSupportedPhoneCountry, 'Choose a valid country calling code.'),
  phone: z.string().trim().min(1, 'Enter your phone number.'),
}

function checkPhone(
  { phone, phoneCountry }: { phone: string; phoneCountry: string },
  context: z.RefinementCtx,
) {
  if (phone && phoneCountry && !isValidPhoneNumberForCountry(phone, phoneCountry)) {
    context.addIssue({ code: 'custom', path: ['phone'], message: 'Enter a valid phone number.' })
  }
}

export const checkoutSchema = z
  .object({
    email: z.email('Enter a valid email address.'),
    ...deliveryFields,
    acknowledgement: z.boolean().refine(Boolean, 'Please acknowledge the conversion terms.'),
  })
  .superRefine(checkPhone)

export const savedAddressSchema = z.object(deliveryFields).superRefine(checkPhone)

export const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

export const passwordRules = [
  { id: 'length', label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { id: 'letter', label: 'At least one letter', test: (value: string) => /[A-Za-z]/.test(value) },
  { id: 'number', label: 'At least one number', test: (value: string) => /\d/.test(value) },
] as const

export const signupSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.'),
  email: z.email('Enter a valid email address.'),
  password: z
    .string()
    .refine(
      (value) => passwordRules.every((rule) => rule.test(value)),
      'Use at least 8 characters, including a letter and a number.',
    ),
  acceptTerms: z.boolean().refine(Boolean, 'Please accept the terms to create an account.'),
})

export type CompatibilityFormValues = z.infer<typeof compatibilitySchema>
export type CheckoutFormValues = z.infer<typeof checkoutSchema>
export type LoginFormValues = z.infer<typeof loginSchema>
export type SignupFormValues = z.infer<typeof signupSchema>
