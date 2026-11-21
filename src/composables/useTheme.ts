import { computed, ref } from 'vue'

export type ThemePreference = 'light' | 'dark' | 'system'

const preference = ref<ThemePreference>('system')
const mediaQuery =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null
const systemDark = ref(mediaQuery?.matches ?? false)

mediaQuery?.addEventListener('change', (event) => {
  systemDark.value = event.matches
  applyTheme()
})

function savedPreference(): ThemePreference {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('kedak-theme') : null
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'
}

function applyTheme() {
  if (typeof document === 'undefined') return
  const dark = preference.value === 'dark' || (preference.value === 'system' && systemDark.value)
  document.documentElement.classList.toggle('kedak-dark', dark)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

preference.value = savedPreference()
applyTheme()

export function useTheme() {
  const isDark = computed(
    () => preference.value === 'dark' || (preference.value === 'system' && systemDark.value),
  )

  function setTheme(nextPreference: ThemePreference) {
    preference.value = nextPreference
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('kedak-theme', nextPreference)
    }
    applyTheme()
  }

  function toggleTheme() {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  return { preference, isDark, setTheme, toggleTheme }
}
