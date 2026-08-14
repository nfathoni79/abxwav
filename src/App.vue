<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDatabase } from 'vuefire'
import { ref as dbRef, get, set, push, serverTimestamp } from 'firebase/database'
import DeviceDetector from 'device-detector-js'

import AButton from './components/AButton.vue'
import ARadio from './components/ARadio.vue'
import SoundIcon from './components/SoundIcon.vue'
import Progress from './components/Progress.vue'

import { calculatePValue } from './utils'
import songs from './data/songs'
import qualities from './data/qualities'

const { locale } = useI18n()

// Firebase
const db = useDatabase()
const resultsRef = dbRef(db, 'abxwav/results2')
const statsRef = dbRef(db, 'abxwav/stats2')

// Bind to inputs
const songId = ref(songs[0].id)
const qualityAId = ref('wav_16')
const qualityBid = ref('mp3_320')
const maxTrial = ref(10)
const audio = ref(null)
const choice = ref(null)

// Timestamps of the start and end of test
const startAt = ref(null)
const endAt = ref(null)

const trialNo = ref(0)  // Current trial number
const trials = ref([])  // Answers of each trial
const choices = ref([]) // Choices of each trial

// Audio objects
const audioA = ref(null)
const audioB = ref(null)
const audioCurrentTime = ref(0)
const audioDuration = ref(null)

const audioAReady = ref(false)
const audioBReady = ref(false)
const audioAPlaying = ref(false)
const audioBPlaying = ref(false)

const audioLoading = ref(false)
const startInfo = ref('')
const loadingProgress = ref(0)

const detailShowing = ref(false)

const uuid = ref(null)

const song = computed(() => {
  return songs.find(s => s.id == songId.value)
})

const qualityA = computed(() => {
  return qualities.find(q => q.id == qualityAId.value)
})

const qualityB = computed(() => {
  return qualities.find(q => q.id == qualityBid.value)
})

const totalSize = computed(() => {
  return song.value.files[qualityAId.value].size + song.value.files[qualityBid.value].size
})

const audioProgress = computed(() => {
  if (audioDuration.value == null) return 0

  return (audioCurrentTime.value / audioDuration.value) * 100
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

const pValue = computed(() => {
  return calculatePValue(score.value, maxTrial.value)
})

const audioPlaying = computed(() => {
  return audioAPlaying.value || audioBPlaying.value
})

// When switching song, reset qualities selected
watch(song, newSong => {
  qualityAId.value = 'wav_16'
  qualityBid.value = 'mp3_320'
})

// When both audio ready, start test
watch([audioAReady, audioBReady], ([newA, newB]) => {
  if (newA && newB) {
    audioLoading.value = false
    startInfo.value = ''

    generateTrials()
    choices.value = []
    trialNo.value = 1
    startAt.value = Date.now()
  }
})

// When test ended, push result to DB
watch(trialNo, (newNo) => {
  if (newNo > maxTrial.value) {
    endAt.value = Date.now()
    pushResult()
  }
})

onMounted(() => {
  loadUuid()
})

const start = async () => {
  audioLoading.value = true
  startInfo.value = 'Loading audio...'

  const audioAUrl = song.value.files[qualityAId.value].url
  const audioBUrl = song.value.files[qualityBid.value].url

  const responseA = await fetch(audioAUrl)
  .catch(error => {
    startInfo.value = error.message
  })

  if (!responseA) {
    audioLoading.value = false
    return
  }

  const responseB = await fetch(audioBUrl)
  .catch(error => {
    startInfo.value = error.message
  })

  if (!responseB) {
    audioLoading.value = false
    return
  }

  const contentLengthA = responseA.headers.get('Content-Length')
  const contentLengthB = responseB.headers.get('Content-Length')

  if (!contentLengthA || !contentLengthB) {
    audioLoading.value = false
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
    loadingProgress.value = (received / total) * 100
  }

  while (true) {
    const { done, value } = await readerB.read()
    if (done) break

    chunksB.push(value)
    received += value.length

    loadingProgress.value = (received / total) * 100
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
      audioDuration.value = audioA.value.duration
      audioAPlaying.value = playing
    }

    if (audio == 'b') {
      audioDuration.value = audioB.value.duration
      audioBPlaying.value = playing
    }
  }

  audioA.value.addEventListener('play', () => handleAudioPlayback('a', true))
  audioA.value.addEventListener('pause', () => handleAudioPlayback('a', false))
  audioA.value.addEventListener('ended', () => handleAudioPlayback('a', false))
  audioB.value.addEventListener('play', () => handleAudioPlayback('b', true))
  audioB.value.addEventListener('pause', () => handleAudioPlayback('b', false))
  audioB.value.addEventListener('ended', () => handleAudioPlayback('b', false))

  audioA.value.addEventListener('timeupdate', () => {
    audioCurrentTime.value = audioA.value.currentTime
  })

  audioB.value.addEventListener('timeupdate', () => {
    audioCurrentTime.value = audioB.value.currentTime
  })

  setTimeout(() => {
    if (!audioAReady.value || !audioBReady.value) {
      audioLoading.value = false
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
  startAt.value = Date.now()
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

const seekAudio = time => {
  if (audioAPlaying.value) {
    audioA.value.currentTime += time
  } else {
    audioB.value.currentTime += time
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
    song: song.value.id,
    audioA: qualityAId.value,
    audioB: qualityBid.value,
    points: choices.value.map((choice, index) => {
      return choice == trials.value[index] ? 1 : 0
    }).join(''),
    device: getDeviceInfo(),
    uuid: uuid.value,
    startAt: startAt.value,
    endAt: endAt.value,
    time: Math.round((endAt.value - startAt.value) / 1000),
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
    const orderA = qualities.findIndex(q => q.id == a)
    const orderB = qualities.findIndex(q => q.id == b)

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
  <div class="mx-auto max-w-screen-sm min-h-screen bg-white px-4 sm:px-8 py-8 text-center">
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
          
          <span class="basis-1/4 sm:basis-1/5 text-gray-900 text-left">{{ $t('song') }}</span>
          <select id="song" name="song" v-model="songId"
            class="w-full border border-gray-900 rounded-lg
            focus:ring-0 focus:border-2 focus:border-gray-900">
            
            <option v-for="(item, index) in songs" :key="index"
              :value="item.id">
              {{ item.name }}
            </option>
          </select>
        </label>

        <a :href="song.source" target="_blank"
          class="font-semibold text-sm hover:underline decoration-2">
          
          {{ $t('source') }}
        </a>

        <div class="mt-2 flex flex-col sm:flex-row gap-2">
          <label for="optionA"
            class="flex-1 flex flex-row sm:flex-col justify-center items-center
            gap-2 sm:gap-0">
            
            <span class="basis-1/4 text-gray-900 text-left">Audio A</span>
            <select id="qualityA" name="qualityA" v-model="qualityAId"
              class="w-full border border-gray-900 rounded-lg
              focus:ring-0 focus:border-2 focus:border-gray-900">
              <option v-for="(item, index) in qualities" :key="index"
                :value="item.id"
                :disabled="qualityBid == item.id || songs.find(s => s.id == songId).files[item.id] == null">
                {{ item.name }}
              </option>
            </select>
          </label>

          <label for="optionB"
            class="flex-1 flex flex-row sm:flex-col justify-center items-center
            gap-2 sm:gap-0">
            
            <span class="basis-1/4 text-gray-900 text-left">Audio B</span>
            <select id="qualityB" name="qualityB" v-model="qualityBid"
              class="w-full border border-gray-900 rounded-lg
              focus:ring-0 focus:border-2 focus:border-gray-900">
              <option v-for="(item, index) in qualities" :key="index"
                :value="item.id"
                :disabled="qualityAId == item.id || songs.find(s => s.id == songId).files[item.id] == null">
                {{ item.name }}
              </option>
            </select>
          </label>
        </div>

        <div class="mt-2 flex justify-center items-center gap-2">
          <span class="basis-1/4 sm:basis-1/5 text-gray-900 text-left">{{ $t('trial', 2) }}</span>

          <div class="w-full flex justify-center items-center gap-2">
            <ARadio id="trials-5" name="maxTrial" :value="5"
              v-model="maxTrial" class="w-full flex-1">
              <div class="flex flex-col">
                5
                <span class="text-xs">({{ $t('lessAccurate') }})</span>
              </div>
            </ARadio>

            <ARadio id="trials-10" name="maxTrial" :value="10"
              v-model="maxTrial" class="w-full flex-1">
              <div class="flex flex-col">
                10
                <span class="text-xs">({{ $t('recommended') }})</span>
              </div>
            </ARadio>

            <ARadio id="trials-20" name="maxTrial" :value="20"
              v-model="maxTrial" class="w-full flex-1">
              <div class="flex flex-col">
                20
                <span class="text-xs">({{ $t('moreAccurate') }})</span>
              </div>
            </ARadio>
          </div>
        </div>

        <div class="mt-2">
          <p class="text-sm text-gray-900">{{ $t('willDownload', { size: totalSize.toFixed(1) }) }}</p>

          <p v-if="startInfo" class="mt-2 text-gray-900">{{ startInfo }}</p>

          <div v-if="audioLoading" class="mt-2 text-gray-900">
            <p>{{ loadingProgress.toFixed(2) }}%</p>
            <Progress :percentage="loadingProgress" />
          </div>
        </div>

        <AButton :disabled="audioLoading" type="submit" class="mt-4">
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
        {{ song.name }}<br>
        {{ qualityA.name }} <span class="font-semibold">vs</span> {{ qualityB.name }}
      </p>

      <div class="mt-4 mx-auto max-w-96">
        <p>{{ $t('listen') }}</p>
        <div class="mt-1 flex justify-between items-center gap-2">
          <ARadio id="audio-a" name="audio" value="a" v-model="audio"
            @click="playAudio('a')" class="w-full flex-col">
            <div class="flex items-center">
              A <SoundIcon v-if="audio == 'a' && audioPlaying" class="ml-2 h-5" />
            </div>
            <div v-if="audio == 'a' && audioPlaying" class="w-full">
              <Progress :percentage="audioProgress" />
            </div>
          </ARadio>

          <ARadio id="audio-x" name="audio" value="x" v-model="audio"
            @click="playAudio(trials[trialNo - 1])" class="w-full flex-col">
            <div class="flex items-center">
              X <SoundIcon v-if="audio == 'x' && audioPlaying" class="ml-2 h-5" />
            </div>
            <div v-if="audio == 'x' && audioPlaying" class="w-full">
              <Progress :percentage="audioProgress" />
            </div>
          </ARadio>

          <ARadio id="audio-b" name="audio" value="b" v-model="audio"
            @click="playAudio('b')" class="w-full flex-col">
            <div class="flex items-center">
              B <SoundIcon v-if="audio == 'b' && audioPlaying" class="ml-2 h-5" />
            </div>
            <div v-if="audio == 'b' && audioPlaying" class="w-full">
              <Progress :percentage="audioProgress" />
            </div>
          </ARadio>
        </div>

        <div class="mt-1 flex justify-center items-center gap-2">
          <AButton :disabled="!audioPlaying" @click="seekAudio(-5)">
            {{ $t('minusSeconds') }}
          </AButton>
          <AButton :disabled="!audioPlaying" @click="seekAudio(5)">
            {{ $t('plusSeconds') }}
          </AButton>
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
        {{ song.name }}<br>
        {{ qualityA.name }} <span class="font-semibold">vs</span> {{ qualityB.name }}
      </p>

      <p class="mt-4 text-gray-900">
        {{ $t('score', { score: score, maxTrial: maxTrial }) }}
      </p>

      <p class="text-gray-900">
        <i18n-t keypath="resultText">
          <template #ability>
            <span class="font-semibold uppercase">
              {{ pValue <= 0.05 ? $t('can') : $t('cannot') }}
            </span>
          </template>
        </i18n-t>
      </p>

      <!-- Result Details -->
      <div class="mt-4 rounded-lg bg-gray-100 p-2">
        <div>
          <button @click="detailShowing = !detailShowing"
            class="font-semibold text-sm hover:underline decoration-2">
          
            {{ detailShowing ? $t('hideDetails') : $t('showDetails') }}
          </button>
        </div>

        <div v-if="detailShowing" class="mt-2">
          <div class="inline-block rounded-lg border border-gray-900 overflow-hidden">
            <table class="w-auto border-collapse">
              <thead class="border-b border-gray-900 bg-gray-100 text-gray-900 text-sm">
                <tr>
                  <th class="px-4">{{ $t('trial') }}</th>
                  <th class="px-4">{{ $t('yourChoice') }}</th>
                  <th class="px-4">{{ $t('answer') }}</th>
                </tr>
              </thead>
              
              <tbody class="divide-y divide-gray-400 text-gray-900 text-sm uppercase">
                <tr v-for="(trial, index) in trials" :key="index"
                  :class="trials[index] == choices[index] ? 'bg-green-200' : 'bg-red-200'">
                  
                  <td>{{ index + 1 }}</td>
                  <td>{{ choices[index] }}</td>
                  <td>{{ trials[index] }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p class="text-sm">
            <a href="https://en.wikipedia.org/wiki/P-value" target="_blank"
              class="font-semibold italic hover:underline decoration-2">
              p-value
            </a>
            = {{ $n(pValue) }}<br>
            {{ $t('pValueDetails') }}
          </p>
        </div>
      </div>

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
