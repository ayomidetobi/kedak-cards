import { GOOGLE_CLIENT_ID } from '../config/env'

/**
 * Google Identity Services: renders Google's official "Continue with Google" button, which
 * opens Google's sign-in popup for everyone (also people not yet signed in to Google in this
 * browser) and returns an ID token (JWT credential) for POST /auth/google.
 */
interface CredentialResponse {
  credential?: string
}
interface GoogleIdentity {
  accounts: {
    id: {
      initialize(config: {
        client_id: string
        callback: (response: CredentialResponse) => void
        ux_mode?: 'popup' | 'redirect'
        use_fedcm_for_button?: boolean
      }): void
      renderButton(
        parent: HTMLElement,
        options: {
          type?: 'standard' | 'icon'
          theme?: 'outline' | 'filled_blue' | 'filled_black'
          size?: 'large' | 'medium' | 'small'
          text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
          shape?: 'rectangular' | 'pill' | 'circle' | 'square'
          logo_alignment?: 'left' | 'center'
          width?: number
          locale?: string
        },
      ): void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleIdentity
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client'
let scriptPromise: Promise<GoogleIdentity> | null = null

export class GoogleSignInError extends Error {}

export const isGoogleSignInConfigured = () => GOOGLE_CLIENT_ID.length > 0

function loadScript(): Promise<GoogleIdentity> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google)
  scriptPromise ??= new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GSI_SRC
    script.async = true
    script.defer = true
    script.onload = () =>
      window.google?.accounts?.id
        ? resolve(window.google)
        : reject(new GoogleSignInError('Google sign-in didn’t load. Please try again.'))
    script.onerror = () => {
      scriptPromise = null
      reject(new GoogleSignInError('Google sign-in couldn’t load. Check your connection.'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

/**
 * Renders Google's button into `container`. `onCredential` receives the ID token after the
 * customer signs in with Google; rejects if Google sign-in isn't configured or can't load.
 */
export async function renderGoogleButton(
  container: HTMLElement,
  onCredential: (idToken: string) => void,
  text: 'continue_with' | 'signup_with' = 'continue_with',
): Promise<void> {
  if (!isGoogleSignInConfigured()) {
    throw new GoogleSignInError('Google sign-in isn’t available right now. Use your email instead.')
  }
  const google = await loadScript()
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    ux_mode: 'popup',
    callback: (response) => {
      if (response.credential) onCredential(response.credential)
    },
  })
  container.replaceChildren()
  // Measure the available space on the parent: the slot itself may still be hidden (width 0).
  const available = container.parentElement?.clientWidth || container.clientWidth || 320
  google.accounts.id.renderButton(container, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text,
    shape: 'rectangular',
    logo_alignment: 'center',
    width: Math.min(400, Math.max(200, Math.round(available))), // Google's maximum is 400
    locale: 'en-GB', // match the site, not the browser language
  })
}
