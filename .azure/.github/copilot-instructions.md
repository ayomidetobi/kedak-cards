
# Kedak Card - Development Instructions

## Technology
- Vue 3 Composition API
- TypeScript
- Vite
- PrimeVue 4
- Tailwind CSS 4
- Pinia for shared state
- Vitest for unit tests

## Architecture
- Use Vue Single File Components.
- Use <script setup lang="ts">.
- Keep components small and reusable.
- Keep business logic outside presentation components.
- Use composables for reusable state and behaviour.
- Use strict TypeScript types.
- Avoid unnecessary dependencies.

## UI and Design
- The Figma design is the source of truth.
- Follow the referenced Figma frame closely.
- Target mobile width: 390px.
- Make the layout responsive for larger screens.
- Use Tailwind for layout, spacing, sizing and typography.
- Use PrimeVue 4 for accessible interactive components.
- Do not allow PrimeVue default styling to override the Figma design.
- Use a monochrome black, white and neutral-grey visual system.
- Keep typography modest and controls compact.
- Avoid unnecessary gradients, shadows and decorative elements.
- Prevent horizontal page overflow.

## Card Customisation
- Categories: Anime, Cars and Sport, matching the referenced frame.
- Selecting a category updates the design gallery.
- Selecting a design updates the card preview.
- Users can upload PNG, JPEG and WebP images.
- Validate file type and file size.
- Uploaded artwork replaces the selected preset in the preview.
- Users can replace their uploaded image.
- Cardholder name updates the preview immediately.
- Cardholder name has a maximum length of 22 characters.

## Engineering Requirements
- Do not invent backend endpoints.
- Do not introduce a new checkout or payment flow.
- Keep card customisation data separate from payment logic.
- Preserve selected artwork and cardholder name in a typed customisation model.
- Do not use placeholder images as if they were final production assets.
- Add loading, error and empty states where appropriate.
- Test important interactions and validation rules.

## Theme System

- Support Light, Dark and System appearance preferences.
- Use PrimeVue 4 theme configuration with Aura.
- Use the `.kedak-dark` class as the dark mode selector.
- Use Tailwind CSS 4 for layout and component styling.
- Define reusable Kedak CSS variables for background, surfaces,
  text, muted text, borders and actions.
- Persist explicit user preferences in localStorage.
- Default to System preference.
- React to operating system appearance changes when System is selected.
- Ensure all PrimeVue components work in both themes.
- Ensure inputs, dialogs, upload controls, menus, errors and focus states
  are accessible in both themes.
- Avoid hardcoded light-only colours in components.
- Do not change the card artwork itself when switching themes.
- Preserve the card's physical appearance in the preview;
  only the surrounding application interface changes.
