<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDatabase } from 'vuefire'
import { ref as dbRef, get, set, push, serverTimestamp } from 'firebase/database'
import DeviceDetector from 'device-detector-js'

import AButton from './components/AButton.vue'
import ARadio from './components/ARadio.vue'
import SoundIcon from './components/SoundIcon.vue'

const { locale } = useI18n()

const db = useDatabase()
const resultsRef = dbRef(db, 'abxwav/results')
const statsRef = dbRef(db, 'abxwav/stats')

const songs = ref([
  {
    id: 'mayo',
    name: 'Mayoiuta - MyGO!!!!!',
  },
  {
    id: 'avem',
    name: 'Ave Mujica - Ave Mujica',
  },
])

const audioOptions = ref([
  {
    id: 'wav-24',
    name: 'Hi-Res Lossless 24-bit',
  },
  {
    id: 'wav-16',
    name: 'Lossless 16-bit',
  },
  {
    id: 'mp3-320',
    name: 'Lossy 320kbps',
  },
  {
    id: 'mp3-256',
    name: 'Lossy 256kbps',
  },
  {
    id: 'mp3-128',
    name: 'Lossy 128kbps',
  },
])

const song = ref(0)
const optionA = ref(1)
const optionB = ref(2)

const maxTrial = ref(10)
const trialNo = ref(0)
const trials = ref([])

const audioA = ref(null)
const audioB = ref(null)
const audioAReady = ref(false)
const audioBReady = ref(false)
const audio = ref(null)
const audioAPlaying = ref(false)
const audioBPlaying = ref(false)

const loadingAudio = ref(false)
const startInfo = ref('')
const loadingProgress = ref(0)

const choice = ref(null)
const choices = ref([])

const uuid = ref(null)

const audioAUrl = computed(() => {
  const nameId = songs.value[song.value].id
  const [format, quality] = audioOptions.value[optionA.value].id.split('-')

  return `/${nameId}-${quality}.${format}`
})

const audioBUrl = computed(() => {
  const nameId = songs.value[song.value].id
  const [format, quality] = audioOptions.value[optionB.value].id.split('-')

  return `/${nameId}-${quality}.${format}`
})

const score = computed(() => {
  if (trials.value.length != choices.value.length) return 0

  let current = 0

  for (let i = 0; i < choices.value.length; i++) {
    if (choices.value[i] == trials.value[i]) {
      current++
    }
  }

  return current
})

const minScore = computed(() => {
  switch (maxTrial.value) {
    case 20:
      return 15
    case 10:
      return 9
    case 5:
      return 5
    default:
      return 9
  }
})

const audioPlaying = computed(() => {
  return audioAPlaying.value || audioBPlaying.value
})

watch(optionA, newOption => {
  audioAUrl.value = audioOptions.value[newOption].audioUrl
})

watch(optionB, newOption => {
  audioBUrl.value = audioOptions.value[newOption].audioUrl
})

watch([audioAReady, audioBReady], ([newA, newB]) => {
  if (newA && newB) {
    loadingAudio.value = false
    startInfo.value = ''

    generateTrials()
    choices.value = []
    trialNo.value = 1
  }
})

watch(trialNo, (newNo) => {
  if (newNo > maxTrial.value) {
    pushResult()
  }
})

onMounted(() => {
  audioAUrl.value = audioOptions.value[optionA.value].audioUrl
  audioBUrl.value = audioOptions.value[optionB.value].audioUrl

  loadUuid()
})

const start = async () => {
  if (!audioAUrl.value || !audioBUrl.value) {
    startInfo.value = 'Invalid audio'
    return
  }

  loadingAudio.value = true
  startInfo.value = 'Loading audio...'
  let newAudioAUrl = audioAUrl.value
  let newAudioBUrl = audioBUrl.value
  
  if (!audioAUrl.value.startsWith('/')) {
    newAudioAUrl = `https://cobacors.my.id/${audioAUrl.value}`
  }

  if (!audioBUrl.value.startsWith('/')) {
    newAudioBUrl = `https://cobacors.my.id/${audioBUrl.value}`
  }

  const responseA = await fetch(newAudioAUrl)
  .catch(error => {
    startInfo.value = error.message
  })

  if (!responseA) {
    loadingAudio.value = false
    return
  }

  const responseB = await fetch(newAudioBUrl)
  .catch(error => {
    startInfo.value = error.message
  })

  if (!responseB) {
    loadingAudio.value = false
    return
  }

  const contentLengthA = responseA.headers.get('Content-Length')
  const contentLengthB = responseB.headers.get('Content-Length')

  if (!contentLengthA || !contentLengthB) {
    loadingAudio.value = false
    startInfo.value = 'Invalid audio'
    return
  }

  const total = parseInt(contentLengthA) + parseInt(contentLengthB)
  let received = 0
  
  const readerA = responseA.body.getReader()
  const readerB = responseB.body.getReader()
  const chunksA = []
  const chunksB = []

  while (true) {
    const { done, value } = await readerA.read()
    if (done) break

    chunksA.push(value)
    received += value.length

    // Call the progress callback with the percentage
    loadingProgress.value = ((received / total) * 100).toFixed(2)
  }

  while (true) {
    const { done, value } = await readerB.read()
    if (done) break

    chunksB.push(value)
    received += value.length

    loadingProgress.value = ((received / total) * 100).toFixed(2)
  }

  // Concatenate chunks and create a Blob
  const blobA = new Blob(chunksA)
  const blobB = new Blob(chunksB)
  const blobUrlA = URL.createObjectURL(blobA)
  const blobUrlB = URL.createObjectURL(blobB)

  audioA.value = new Audio(blobUrlA)
  audioB.value = new Audio(blobUrlB)

  audioA.value.addEventListener('loadeddata', () => {
    if (audioA.value.readyState == 4) {
      audioAReady.value = true
    }
  })

  audioB.value.addEventListener('loadeddata', () => {
    if (audioB.value.readyState == 4) {
      audioBReady.value = true
    }
  })

  const handleAudioPlayback = (audio, playing) => {
    if (audio == 'a') {
      audioAPlaying.value = playing
    }

    if (audio == 'b') {
      audioBPlaying.value = playing
    }
  }

  audioA.value.addEventListener('play', () => handleAudioPlayback('a', true))
  audioA.value.addEventListener('pause', () => handleAudioPlayback('a', false))
  audioA.value.addEventListener('ended', () => handleAudioPlayback('a', false))
  audioB.value.addEventListener('play', () => handleAudioPlayback('b', true))
  audioB.value.addEventListener('pause', () => handleAudioPlayback('b', false))
  audioB.value.addEventListener('ended', () => handleAudioPlayback('b', false))

  setTimeout(() => {
    if (!audioAReady.value || !audioBReady.value) {
      loadingAudio.value = false
      startInfo.value = 'Invalid audio'
      loadingProgress.value = 0
    }
  }, 3000);
}

const next = () => {
  if (choice.value == null) return

  choices.value.push(choice.value)

  if (audioA.value.currentTime > 0) {
    audioA.value.pause()
    audioA.value.currentTime = 0
  }

  if (audioB.value.currentTime > 0) {
    audioB.value.pause()
    audioB.value.currentTime = 0
  }

  audio.value = null
  choice.value = null
  trialNo.value++
}

const restart = () => {
  generateTrials()
  choices.value = []
  trialNo.value = 1
}

const backToHome = () => {
  trialNo.value = 0
  loadingProgress.value = 0
  audioAReady.value = false
  audioBReady.value = false
}

const generateTrials = () => {
  trials.value = []

  for (let i = 0; i < maxTrial.value; i++) {
    const random = Math.random()

    if (random < 0.5) {
      trials.value.push('a')
    } else {
      trials.value.push('b')
    }
  }
}

const playAudio = audio => {
  // Reset Audio A
  if (audioA.value.currentTime > 0) {
    audioA.value.pause()
    audioA.value.currentTime = 0
  }

  // Reset Audio B
  if (audioB.value.currentTime > 0) {
    audioB.value.pause()
    audioB.value.currentTime = 0
  }

  if (audio == 'a') {
    audioA.value.play()
  }

  if (audio == 'b') {
    audioB.value.play()
  }
}

const saveLocale = () => {
  localStorage.setItem('locale', locale.value)
}

const loadUuid = () => {
  uuid.value = localStorage.getItem('uuid')

  if (!uuid.value) {
    const randomUuid = crypto.randomUUID()
    uuid.value = randomUuid
    localStorage.setItem('uuid', randomUuid)
  }
}

const getDeviceInfo = () => {
  const detector = new DeviceDetector()
  const parsed = detector.parse(navigator.userAgent)

  const client = [parsed.client?.name, parsed.client?.version].filter(Boolean).join(' ')
  const device = [parsed.device?.brand, parsed.device?.model, parsed.device?.type].filter(Boolean).join(' ')
  const os = [parsed.os?.name, parsed.os?.version, parsed.os?.platform].filter(Boolean).join(' ')
  return [client, device, os].filter(Boolean).join(', ')
}

const pushResult = () => {
  const result = {
    song: songs.value[song.value].id,
    audioA: audioOptions.value[optionA.value].id,
    audioB: audioOptions.value[optionB.value].id,
    points: choices.value.map((choice, index) => {
      return choice == trials.value[index] ? 1 : 0
    }).join(''),
    device: getDeviceInfo(),
    uuid: uuid.value,
    createdAt: serverTimestamp(),
  }
  
  push(resultsRef, result)
    .then(() => {
      createStats()
    })
    .catch((error) => {
      console.error('Push error:', error)
    })
}

const getCategory = (catA, catB) => {
  const [newCatA, newCatB] = [catA, catB].sort((a, b) => {
    const orderA = audioOptions.value.findIndex((item) => item.id == a)
    const orderB = audioOptions.value.findIndex((item) => item.id == b)

    return orderA - orderB
  })

  return `${newCatA}-vs-${newCatB}`
}

const createStats = async () => {
  let nextUpdate = 0
  const now = Date.now()

  // Fetch nextUpdate
  await get(statsRef).then((snapshot) => {
    if (snapshot.exists()) {
      nextUpdate = snapshot.child('nextUpdate').val()
    } else {
      console.log('No stats data.')
    }
  }).catch((error) => {
    console.error(error)
  })

  // Skip if now is less than nextUpdate
  if (now < nextUpdate) return

  let stats = {}

  // Fetch results and create stats
  await get(resultsRef).then((snapshot) => {
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const result = childSnapshot.val()
        const trials = result.points.length
        
        if (trials < 10) return
        
        const category = getCategory(result.audioA, result.audioB)
        const points = result.points.split('1').length - 1

        const isPassed = () => {
          if (trials == 10 && points >= 9) return true
          if (trials == 20 && points >= 15) return true
          return false
        }

        // Initialize stats[category] if undefined
        if (!stats[category]) stats[category] = {
          t10: {
            passed: 0,
            notPassed: 0,
          },
          t20: {
            passed: 0,
            notPassed: 0,
          },
        }

        stats[category][`t${trials}`][isPassed() ? 'passed' : 'notPassed']++
      })
    } else {
      console.log('No results data')
    }
  }).catch((error) => {
    console.error(error)
  })

  nextUpdate = now + (1 * 60 * 60 * 1000)  // Add 1 hour
  
  // Overwrite stats
  await set(statsRef, { stats, nextUpdate })
}
</script>

<template>
  <div class="mx-auto max-w-screen-sm min-h-screen bg-white p-8 text-center">
    <div v-if="trialNo < 1">
      <div class="relative">
        <h1 class="text-3xl font-semibold text-gray-900">ABX WAV</h1>

        <select id="locale" name="locale"
          v-model="$i18n.locale" @change="saveLocale"
          class="absolute top-0 right-0 border border-gray-900 rounded-lg
          focus:ring-0 focus:border-2 focus:border-gray-900 uppercase">
          
          <option v-for="locale in $i18n.availableLocales" :key="`locale-${locale}`"
            :value="locale">
            {{ locale }}
          </option>
        </select>
      </div>

      <p class="mt-4 text-gray-900">
        {{ $t('description') }}
      </p>

      <div class="mt-2 rounded-lg bg-gray-100 p-2">
        <p class="text-sm text-gray-700">
          <i18n-t keypath="help">
            <template #a><span class="font-semibold">A</span></template>
            <template #b><span class="font-semibold">B</span></template>
            <template #x><span class="font-semibold">X</span></template>
            <template #n><br></template>
          </i18n-t>
        </p>
      </div>

      <form @submit.prevent="start" class="mt-4">
        <label for="song"
          class="mt-2 flex justify-center items-center gap-2 sm:gap-0">
          
          <span class="basis-1/4 text-gray-900 text-left">{{ $t('song') }}</span>
          <select id="song" name="song" v-model="song"
            class="w-full border border-gray-900 rounded-lg
            focus:ring-0 focus:border-2 focus:border-gray-900">
            
            <option v-for="(item, index) in songs" :key="index"
              :value="index">
              {{ item.name }}
            </option>
          </select>
        </label>

        <div class="mt-2 flex flex-col sm:flex-row gap-2">
          <label for="optionA"
            class="flex-1 flex flex-row sm:flex-col justify-center items-center
            gap-2 sm:gap-0">
            
            <span class="basis-1/4 text-gray-900 text-left">Audio A</span>
            <select id="optionA" name="optionA" v-model="optionA"
              class="w-full border border-gray-900 rounded-lg
              focus:ring-0 focus:border-2 focus:border-gray-900">
              <option v-for="(item, index) in audioOptions" :key="index"
                :value="index" :disabled="optionB == index">
                {{ item.name }}
              </option>
            </select>
          </label>

          <label for="optionB"
            class="flex-1 flex flex-row sm:flex-col justify-center items-center
            gap-2 sm:gap-0">
            
            <span class="basis-1/4 text-gray-900 text-left">Audio B</span>
            <select id="optionB" name="optionB" v-model="optionB"
              class="w-full border border-gray-900 rounded-lg
              focus:ring-0 focus:border-2 focus:border-gray-900">
              <option v-for="(item, index) in audioOptions" :key="index"
                :value="index" :disabled="optionA == index">
                {{ item.name }}
              </option>
            </select>
          </label>
        </div>

        <div class="mt-2 flex justify-center items-center gap-2">
          <span class="basis-1/4 text-gray-900 text-left">{{ $t('trials') }}</span>

          <div class="w-full flex justify-center items-center gap-2">
            <ARadio id="trials-5" name="maxTrial" :value="5"
              v-model="maxTrial" class="w-full">
              5
            </ARadio>

            <ARadio id="trials-10" name="maxTrial" :value="10"
              v-model="maxTrial" class="w-full">
              10
            </ARadio>

            <ARadio id="trials-20" name="maxTrial" :value="20"
              v-model="maxTrial" class="w-full">
              20
            </ARadio>
          </div>
        </div>

        <p v-if="startInfo" class="mt-2 text-gray-900">{{ startInfo }}</p>

        <p v-if="loadingAudio" class="mt-2 text-gray-900">
          {{ loadingProgress }}%
        </p>

        <AButton :disabled="loadingAudio" type="submit" class="mt-4">
          {{ $t('start') }}
        </AButton>
      </form>

      <div class="mt-4">
        <i18n-t keypath="request" tag="p">
          <a href="https://forms.gle/qFd4JcAoc5kkkJ6a9" target="_blank"
            class="font-semibold hover:underline decoration-2">
            
            {{ $t('here') }}
          </a>
        </i18n-t>
      </div>
    </div>

    <div v-if="trialNo >= 1 && trialNo <= maxTrial">
      <h1 class="text-3xl font-semibold text-gray-900">
        {{ $t('trialOf', [trialNo, maxTrial]) }}
      </h1>

      <p class="mt-2 text-lg text-gray-900">
        {{ songs[song].name }}<br>
        {{ audioOptions[optionA].name }} <span class="font-semibold">vs</span> {{ audioOptions[optionB].name }}
      </p>

      <div class="mt-4 mx-auto max-w-96">
        <p>{{ $t('listen') }}</p>
        <div class="mt-1 flex justify-between items-center gap-2">
          <ARadio id="audio-a" name="audio" value="a" v-model="audio"
            @click="playAudio('a')" class="w-full">
            A <SoundIcon v-if="audio == 'a' && audioPlaying" class="ml-2 h-5" />
          </ARadio>

          <ARadio id="audio-x" name="audio" value="x" v-model="audio"
            @click="playAudio(trials[trialNo - 1])" class="w-full">
            X <SoundIcon v-if="audio == 'x' && audioPlaying" class="ml-2 h-5" />
          </ARadio>

          <ARadio id="audio-b" name="audio" value="b" v-model="audio"
            @click="playAudio('b')" class="w-full">
            B <SoundIcon v-if="audio == 'b' && audioPlaying" class="ml-2 h-5" />
          </ARadio>
        </div>
      </div>

      <div class="mt-4 mx-auto max-w-96">
        <p>{{ $t('choose') }}</p>
        <div class="mt-1 flex justify-between items-center gap-2">
          <ARadio id="choice-a" name="choice" value="a" v-model="choice" class="w-full">
            {{ $t('xIsX', ['A']) }}
          </ARadio>

          <ARadio id="choice-b" name="choice" value="b" v-model="choice" class="w-full">
            {{ $t('xIsX', ['B']) }}
          </ARadio>
        </div>
      </div>

      <AButton :disabled="choice == null" @click="next" class="mt-4">
        {{ trialNo != maxTrial ? $t('next') : $t('finish') }}
      </AButton>
    </div>

    <div v-if="trialNo > maxTrial">
      <h1 class="text-3xl font-semibold text-gray-900">
        {{ $t('result') }}
      </h1>

      <p class="mt-2 text-lg text-gray-900">
        {{ songs[song].name }}<br>
        {{ audioOptions[optionA].name }} <span class="font-semibold">vs</span> {{ audioOptions[optionB].name }}
      </p>

      <p class="mt-4 text-gray-900">
        {{ $t('score', { score: score, maxTrial: maxTrial }) }}
        ({{ (score / maxTrial * 100).toFixed() }}%)
      </p>

      <p class="text-gray-900">
        <i18n-t keypath="resultText">
          <template #ability>
            <span class="font-semibold uppercase">
              {{ score <= minScore ? $t('cannot') : $t('can') }}
            </span>
          </template>
        </i18n-t>
      </p>

      <div class="mt-4 flex justify-center items-center gap-2">
        <AButton @click="restart">
          {{ $t('restart') }}
        </AButton>
        
        <AButton @click="backToHome">
          {{ $t('backHome') }}
        </AButton>
      </div>
    </div>
  </div>
</template>
