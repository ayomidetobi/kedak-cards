import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ command, mode }) => {
  // Production builds must say which API they talk to; never fall back to a guessed host.
  if (command === 'build' && !loadEnv(mode, process.cwd()).VITE_API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is required to build (see .env.example).')
  }
  return {
    plugins: [vue(), tailwindcss()],
    test: {
      environment: 'jsdom',
      include: ['src/**/*.spec.ts'],
      setupFiles: ['src/test/setup.ts'],
    },
  }
})
