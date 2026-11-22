import { computed, watch } from 'vue'
import { useArtworkCategoriesQuery, useArtworkDesignsQuery } from '../queries/artwork'
import { useCardCustomizationStore } from '../stores/cardCustomization'
import type { CardCategory, CardDesign } from '../types/card'

/** Stand-in while artwork loads; CardPreview renders it without artwork. */
export const PLACEHOLDER_DESIGN: CardDesign = {
  id: '',
  name: '',
  category: 'Sport',
  number: '',
}

/**
 * Connects the customiser's selection (Pinia) to the artwork API (TanStack Query):
 * categories from GET /artwork/categories, the gallery from GET /artwork?category=…, and
 * sensible defaults (first category, first design) once data arrives.
 */
export function useArtworkSelection() {
  const store = useCardCustomizationStore()
  const categoriesQuery = useArtworkCategoriesQuery()
  const categories = computed(() => categoriesQuery.data.value ?? [])
  const categoryNames = computed<CardCategory[]>(() => categories.value.map((item) => item.name))

  watch(
    categoryNames,
    (names) => {
      if (names.length) store.ensureCategory(names[0]!)
    },
    { immediate: true },
  )

  const designsQuery = useArtworkDesignsQuery(() => store.category)
  const gallery = computed(() => designsQuery.data.value ?? [])

  watch(
    [gallery, () => store.selectedDesignId] as const,
    ([designs, selectedId]) => {
      if (designs.length && !designs.some((design) => design.id === selectedId)) {
        store.ensureDesign(designs[0]!.id)
      }
    },
    { immediate: true },
  )

  const selectedDesign = computed(
    () => gallery.value.find((design) => design.id === store.selectedDesignId) ?? PLACEHOLDER_DESIGN,
  )

  const isLoading = computed(
    () => categoriesQuery.isPending.value || (store.category !== null && designsQuery.isPending.value),
  )
  const error = computed(() => categoriesQuery.error.value ?? designsQuery.error.value ?? null)

  return {
    categories,
    categoryNames,
    gallery,
    selectedDesign,
    hasSelectedDesign: computed(() => selectedDesign.value.id !== ''),
    isLoading,
    error,
    retry: () => {
      if (categoriesQuery.isError.value) void categoriesQuery.refetch()
      if (designsQuery.isError.value) void designsQuery.refetch()
    },
  }
}
