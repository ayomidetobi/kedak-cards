/**
 * Authentication service — PREVIEW IMPLEMENTATION.
 *
 * No backend is connected yet, so these functions do not verify passwords or talk to Google.
 * They create a local preview session so the login, sign-up and account screens can be used.
 * Passwords are never stored or sent anywhere.
 *
 * To go live, replace the bodies of these functions with calls to your auth provider
 * (for example your own API plus Google Identity Services, or a hosted provider). The rest of
 * the app only depends on the `AuthUser` shape and these four functions.
 */

export type AuthProvider = 'email' | 'google'

export interface AuthUser {
  id: string
  name: string
  email: string
  provider: AuthProvider
}

export interface EmailCredentials {
  email: string
  password: string
}

export interface SignupDetails extends EmailCredentials {
  fullName: string
}

function previewId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `preview-${Date.now()}`
}

function nameFromEmail(email: string) {
  const localPart = email.split('@')[0] ?? ''
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export async function signInWithEmail(credentials: EmailCredentials): Promise<AuthUser> {
  // TODO(auth): verify credentials with the auth provider.
  const email = credentials.email.trim().toLowerCase()
  return { id: previewId(), name: nameFromEmail(email), email, provider: 'email' }
}

export async function signUpWithEmail(details: SignupDetails): Promise<AuthUser> {
  // TODO(auth): create the account with the auth provider.
  return {
    id: previewId(),
    name: details.fullName.trim(),
    email: details.email.trim().toLowerCase(),
    provider: 'email',
  }
}

export async function signInWithGoogle(): Promise<AuthUser> {
  // TODO(auth): start Google sign-in (Google Identity Services / OAuth) and exchange the
  // credential with your backend. The preview has no Google profile, so name and email are empty.
  return { id: previewId(), name: '', email: '', provider: 'google' }
}

export async function signOut(): Promise<void> {
  // TODO(auth): end the session with the auth provider.
}
