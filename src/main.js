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
      song: 'Song',
      source: 'Source',
      trial: 'Trial | Trials',
      recommended: 'Recommended',
      lessAccurate: 'Less accurate',
      moreAccurate: 'More accurate',
      willDownload: '{size} MB data will be downloaded',
      trialOf: 'Trial {0} of {1}',
      start: 'Start',
      request: 'Didn\'t see your favorite song? Request {0}.',
      here: 'here',
      listen: 'Listen',
      plusSeconds: '+5 seconds',
      minusSeconds: '-5 seconds',
      choose: 'Choose',
      xIsX: 'X is {0}',
      next: 'Next',
      finish: 'Finish',
      result: 'Result',
      score: 'You got {score} correct out of {maxTrial}',
      resultText: 'You probably {ability} hear the difference',
      can: 'can',
      cannot: 'cannot',
      showDetails: 'Show Details',
      hideDetails: 'Hide Details',
      yourChoice: 'Your Choice',
      pValueDetails: 'To prove that you can hear the difference, the p-value must be ≤ 0.05',
      answer: 'Answer',
      restart: 'Restart',
      backHome: 'Back to Home',
    },
    id: {
      description: 'Uji telinga Anda untuk mendengar perbedaan antara dua file audio',
      help: 'Anda akan menerima dua sampel referensi, berlabel {a} dan {b}, beserta sampel target, {x}.{n} Tugas Anda menentukan apakah sampel {x} sesuai dengan sampel {a} atau sampel {b}.',
      song: 'Lagu',
      source: 'Sumber',
      trial: 'Percobaan',
      recommended: 'Direkomendasikan',
      lessAccurate: 'Kurang akurat',
      moreAccurate: 'Lebih akurat',
      willDownload: 'Data {size} MB akan diunduh',
      trialOf: 'Percobaan {0} dari {1}',
      start: 'Mulai',
      request: 'Tidak menemukan lagu favorit Anda? Ajukan permintaan {0}.',
      here: 'di sini',
      listen: 'Dengarkan',
      plusSeconds: '+5 detik',
      minusSeconds: '-5 detik',
      choose: 'Pilih',
      xIsX: 'X adalah {0}',
      next: 'Berikutnya',
      finish: 'Selesai',
      result: 'Hasil',
      score: 'Anda menjawab benar {score} dari {maxTrial}',
      resultText: 'Anda mungkin {ability} mendengar perbedaannya',
      can: 'dapat',
      cannot: 'tidak dapat',
      showDetails: 'Tampilkan Detail',
      hideDetails: 'Sembunyikan Detail',
      yourChoice: 'Pilihan Anda',
      answer: 'Jawaban',
      pValueDetails: 'Untuk membuktikan Anda dapat mendengar perbedaannya, p-value harus ≤ 0,05',
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