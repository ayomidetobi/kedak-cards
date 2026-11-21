import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

const neutral = {
  0: '#ffffff',
  50: '#fafafa',
  100: '#f3f3f4',
  200: '#e2e2e5',
  300: '#ceced2',
  400: '#aaaaaf',
  500: '#85858c',
  600: '#67676e',
  700: '#4c4c52',
  800: '#303034',
  900: '#202023',
  950: '#171719',
}

export const KedakAura = definePreset(Aura, {
  primitive: {
    red: neutral,
  },
  semantic: {
    primary: neutral,
    colorScheme: {
      light: {
        surface: neutral,
        primary: {
          color: '{primary.950}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.800}',
          activeColor: '{primary.700}',
        },
        highlight: {
          background: '{surface.100}',
          focusBackground: '{surface.200}',
          color: '{surface.900}',
          focusColor: '{surface.900}',
        },
        formField: {
          background: '{surface.0}',
          disabledBackground: '{surface.100}',
          borderColor: '{surface.200}',
          hoverBorderColor: '{surface.500}',
          focusBorderColor: '{surface.700}',
          invalidBorderColor: '{surface.700}',
          color: '{surface.900}',
          disabledColor: '{surface.500}',
          placeholderColor: '{surface.500}',
          iconColor: '{surface.600}',
        },
        text: {
          color: '{surface.900}',
          hoverColor: '{surface.950}',
          mutedColor: '{surface.600}',
          hoverMutedColor: '{surface.700}',
        },
        content: {
          background: '{surface.0}',
          hoverBackground: '{surface.50}',
          borderColor: '{surface.200}',
          color: '{surface.900}',
          hoverColor: '{surface.900}',
        },
        overlay: {
          select: {
            background: '{surface.0}',
            borderColor: '{surface.200}',
            color: '{surface.900}',
          },
          popover: {
            background: '{surface.0}',
            borderColor: '{surface.200}',
            color: '{surface.900}',
          },
        },
      },
      dark: {
        surface: {
          0: '#111113',
          50: '#171719',
          100: '#1c1c20',
          200: '#29292e',
          300: '#38383e',
          400: '#55555d',
          500: '#777780',
          600: '#a0a0a8',
          700: '#c1c1c7',
          800: '#dddddf',
          900: '#f0f0f2',
          950: '#fafafa',
        },
        primary: {
          color: '{surface.950}',
          contrastColor: '{surface.0}',
          hoverColor: '{surface.800}',
          activeColor: '{surface.700}',
        },
        highlight: {
          background: '{surface.200}',
          focusBackground: '{surface.300}',
          color: '{surface.950}',
          focusColor: '{surface.950}',
        },
        formField: {
          background: '{surface.100}',
          disabledBackground: '{surface.200}',
          borderColor: '{surface.300}',
          hoverBorderColor: '{surface.700}',
          focusBorderColor: '{surface.700}',
          invalidBorderColor: '{surface.600}',
          color: '{surface.900}',
          disabledColor: '{surface.500}',
          placeholderColor: '{surface.500}',
          iconColor: '{surface.600}',
        },
        text: {
          color: '{surface.900}',
          hoverColor: '{surface.950}',
          mutedColor: '{surface.600}',
          hoverMutedColor: '{surface.700}',
        },
        content: {
          background: '{surface.100}',
          hoverBackground: '{surface.200}',
          borderColor: '{surface.300}',
          color: '{surface.900}',
          hoverColor: '{surface.900}',
        },
        overlay: {
          select: {
            background: '{surface.100}',
            borderColor: '{surface.300}',
            color: '{surface.900}',
          },
          popover: {
            background: '{surface.100}',
            borderColor: '{surface.300}',
            color: '{surface.900}',
          },
        },
      },
    },
  },
})
