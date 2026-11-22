import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { createApp } from 'vue'
import App from './App.vue'
import { queryClient } from './queries/query-client'
import { router } from './router'
import { KedakAura } from './theme'
import './style.css'

createApp(App)
  .use(createPinia())
  .use(VueQueryPlugin, { queryClient })
  .use(router)
  .use(PrimeVue, {
    theme: {
      preset: KedakAura,
      options: {
        darkModeSelector: '.kedak-dark',
      },
    },
  })
  .use(ToastService)
  .mount('#app')
