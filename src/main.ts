import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { KedakAura } from './theme'
import ToastService from 'primevue/toastservice'
import './style.css'

createApp(App)
  .use(createPinia())
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
