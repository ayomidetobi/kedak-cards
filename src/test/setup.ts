import { afterEach, beforeEach } from 'vitest'
import { queryClient } from '../queries/query-client'
import { clearOrderAccess } from '../services/api/orderAccess'

// Every test starts with an empty server-state cache, no guest tokens and no session hint.
beforeEach(() => {
  try {
    localStorage.clear()
  } catch {
    // jsdom without storage
  }
})

afterEach(() => {
  queryClient.clear()
  clearOrderAccess()
})
