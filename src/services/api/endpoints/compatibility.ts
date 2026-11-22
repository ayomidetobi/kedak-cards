import { api } from '../client'
import type { CompatibilityAnswers, CompatibilityResult } from '../../../types/api'

export async function checkCompatibility(
  answers: CompatibilityAnswers,
): Promise<CompatibilityResult> {
  const { data } = await api.post<CompatibilityResult>('/compatibility-checks', answers)
  return data
}
