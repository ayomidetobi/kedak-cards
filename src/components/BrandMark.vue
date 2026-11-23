<script setup lang="ts">
/**
 * Kedak mark: the two interlocking strokes from the brand logo, redrawn as one solid shape in
 * `currentColor`, so it follows the theme (the header sets it to the copper accent).
 * Decorative: the brand name next to it carries the accessible text.
 */
withDefaults(defineProps<{ size?: number }>(), { size: 26 })
</script>

<template>
  <svg
    class="brand-mark"
    viewBox="297 225 425 569"
    :height="size"
    :width="Math.round((size * 425) / 569)"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <!-- Upper stroke -->
    <path d="M297 225H722V291L680 334V267H396L570 449L541 479Z" />
    <!-- Lower stroke with the inner hook -->
    <path d="M297 794H722V727L680 686V752H396L680 456V563L657 540L628 570L722 667V351Z" />
  </svg>
</template>
