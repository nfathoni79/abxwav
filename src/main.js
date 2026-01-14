import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import { VueFire } from 'vuefire'
import { firebaseApp } from './firebase'
import './style.css'
import App from './App.vue'

const loadLocale = () => {
  const savedLocale = localStorage.getItem('locale')

  if (savedLocale) return savedLocale
  return 'en'
}

const i18n = createI18n({
  locale: loadLocale(),
  fallbackLocale: 'en',
  messages: {
    en: {
      description: 'Test your ears to hear the difference between two audio files',
      help: 'You will receive two reference samples, labeled {a} and {b}, along with a target sample, {x}.{n} Your task is to determine whether sample {x} corresponds to sample {a} or sample {b}.',
      trials: 'Trials',
      trialOf: 'Trial {0} of {1}',
      start: 'Start',
      listen: 'Listen',
      choose: 'Choose',
      xIsX: 'X is {0}',
      next: 'Next',
      finish: 'Finish',
      result: 'Result',
      score: 'You got {score} correct out of {maxTrial}',
      resultText: 'You probably {ability} hear the difference',
      can: 'can',
      cannot: 'cannot',
      restart: 'Restart',
      backHome: 'Back to Home',
    },
    id: {
      description: 'Uji telinga Anda untuk mendengar perbedaan antara dua file audio',
      help: 'Anda akan menerima dua sampel referensi, yang diberi label {a} dan {b}, beserta sampel target, {x}.{n} Tugas Anda adalah menentukan apakah sampel {x} sama dengan sampel {a} atau sampel {b}.',
      trials: 'Percobaan',
      trialOf: 'Percobaan {0} dari {1}',
      start: 'Mulai',
      listen: 'Dengarkan',
      choose: 'Pilih',
      xIsX: 'X adalah {0}',
      next: 'Berikutnya',
      finish: 'Selesai',
      result: 'Hasil',
      score: 'Anda menjawab benar {score} dari {maxTrial}',
      resultText: 'Anda mungkin {ability} mendengar perbedaannya',
      can: 'dapat',
      cannot: 'tidak dapat',
      restart: 'Ulangi',
      backHome: 'Kembali ke Beranda',
    },
  },
})

const app = createApp(App)
app.use(i18n)
app.use(VueFire, {
  firebaseApp,
})
app.mount('#app')