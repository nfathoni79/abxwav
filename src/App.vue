<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import AButton from './components/AButton.vue'
import ARadio from './components/ARadio.vue'
import SoundIcon from './components/SoundIcon.vue'

const presets = ref([
  {
    name: 'Lossless vs Lossy (Mayoiuta)',
    audioAUrl: 'https://www.dropbox.com/scl/fi/emlmqntz49vwl0ztwqmnd/mayoiuta-f.wav?rlkey=p0jyk8te9i4tajcd93sedzm17&st=0kut2wup&dl=1',
    audioBUrl: 'https://www.dropbox.com/scl/fi/ug82qzohi0yuzlicy8p6q/mayoiuta-f.mp3?rlkey=93ce1aarkip2welh39imm8dbz&st=ap7uit4p&dl=1',
  },
  {
    name: 'Lossy 320 vs Lossy 128 (Mayoiuta)',
    audioAUrl: 'https://www.dropbox.com/scl/fi/emlmqntz49vwl0ztwqmnd/mayoiuta-f.wav?rlkey=p0jyk8te9i4tajcd93sedzm17&st=0kut2wup&dl=1',
    audioBUrl: 'https://www.dropbox.com/scl/fi/80qaxdhoj07ui91s6zzgw/mayoiuta-f-128.mp3?rlkey=run3m6ynqvfyh9ww9rydkqw10&st=iqavozf9&dl=1',
  },
  {
    name: 'Original WAV vs Converted WAV',
    audioAUrl: '/audio-a.wav',
    audioBUrl: '/audio-b.wav',
  },
  {
    name: 'Custom',
  },
])
const preset = ref(0)

const maxTrial = ref(10)
const trialNo = ref(0)
const trials = ref([])

const audioAUrl = ref(null)
const audioBUrl = ref(null)

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

watch(preset, newPreset => {
  if (newPreset == presets.value.length - 1) {
    audioAUrl.value = ''
    audioBUrl.value = ''
  } else {
    audioAUrl.value = presets.value[newPreset].audioAUrl
    audioBUrl.value = presets.value[newPreset].audioBUrl
  }
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

onMounted(() => {
  audioAUrl.value = presets.value[0].audioAUrl
  audioBUrl.value = presets.value[0].audioBUrl
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
</script>

<template>
  <div class="mx-auto max-w-screen-sm min-h-screen bg-white p-4 text-center">
    <div v-if="trialNo < 1">
      <h1 class="text-3xl font-semibold text-gray-900">ABX WAV</h1>

      <p class="mt-4 text-gray-900">
        Test your ears to hear the difference between two audio files
      </p>

      <p class="mt-2 text-sm text-gray-800">
        You will receive two reference samples, labeled A and B, along with a target sample, X.<br>
        Your task is to determine whether sample X corresponds to sample A or sample B.
      </p>

      <form @submit.prevent="start" class="mt-4">
        <label for="preset" class="flex justify-center items-center gap-2">
          <span class="basis-1/4 text-gray-900 text-left">Preset</span>
          
          <select id="preset" name="preset" v-model="preset"
            class="w-full border border-gray-900 rounded-lg
            focus:ring-0 focus:border-2 focus:border-gray-900">
            <option v-for="(item, index) in presets" :key="index"
              :value="index">
              {{ item.name }}
            </option>
          </select>
        </label>

        <label v-if="preset == presets.length - 1" for="audio-a-url"
          class="mt-2 flex justify-center items-center gap-2">
          
          <span class="basis-1/4 text-gray-900 text-left">Audio A URL</span>
          <input id="audio-a-url" type="text" name="audioAUrl" v-model="audioAUrl"
            class="w-full border border-gray-900 rounded-lg
            focus:ring-0 focus:border-2 focus:border-gray-900">
        </label>

        <label v-if="preset == presets.length - 1" for="audio-b-url"
          class="mt-2 flex justify-center items-center gap-2">
          
          <span class="basis-1/4 text-gray-900 text-left">Audio B URL</span>
          <input id="audio-b-url" type="text" name="audioBUrl" v-model="audioBUrl"
            class="w-full border border-gray-900 rounded-lg
            focus:ring-0 focus:border-2 focus:border-gray-900">
        </label>

        <div class="mt-2 flex justify-center items-center gap-2">
          <span class="basis-1/4 text-gray-900 text-left">Trials</span>

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
          Start
        </AButton>
      </form>
    </div>

    <div v-if="trialNo >= 1 && trialNo <= maxTrial">
      <h1 class="text-3xl font-semibold text-gray-900">
        Trial {{ trialNo }} of {{ maxTrial }}
      </h1>

      <p class="mt-2 text-lg text-gray-900">
        {{ presets[preset].name }}
      </p>

      <div class="mt-4 mx-auto max-w-96">
        <p>Listen</p>
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
        <p>Choose</p>
        <div class="mt-1 flex justify-between items-center gap-2">
          <ARadio id="choice-a" name="choice" value="a" v-model="choice" class="w-full">
            X is A
          </ARadio>

          <ARadio id="choice-b" name="choice" value="b" v-model="choice" class="w-full">
            X is B
          </ARadio>
        </div>
      </div>

      <AButton :disabled="choice == null" @click="next" class="mt-4">
        {{ trialNo != maxTrial ? 'Next' : 'Finish' }}
      </AButton>
    </div>

    <div v-if="trialNo > maxTrial">
      <h1 class="text-3xl font-semibold text-gray-900">
        Result
      </h1>

      <p class="mt-2 text-lg text-gray-900">
        {{ presets[preset].name }}
      </p>

      <p class="mt-4 text-gray-900">
        You got {{ score }} correct out of {{ maxTrial }}
        ({{ (score / maxTrial * 100).toFixed() }}%)
      </p>

      <p class="text-gray-900">
        You probably {{ score <= minScore ? 'cannot' : 'can' }} hear the difference
      </p>

      <div class="mt-4 flex justify-center items-center gap-2">
        <AButton @click="restart">
          Restart
        </AButton>
        
        <AButton @click="backToHome">
          Back to Home
        </AButton>
      </div>
    </div>
  </div>
</template>
