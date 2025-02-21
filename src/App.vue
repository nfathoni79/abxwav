<script setup>
import { ref, computed, onMounted } from 'vue'
import AButton from './components/AButton.vue'
import ARadio from './components/ARadio.vue'

const trialNo = ref(0)
const trials = ref([])

const audioA = ref(null)
const audioB = ref(null)
const audioAReady = ref(false)
const audioBReady = ref(false)
const audio = ref(null)

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

onMounted(() => {
  audioA.value = new Audio('/audio-a.wav')
  audioB.value = new Audio('/audio-b.wav')

  audioA.value.addEventListener('canplaythrough', () => {
    audioAReady.value = true
  })

  audioB.value.addEventListener('canplaythrough', () => {
    audioBReady.value = true
  })
})

const start = () => {
  generateTrials()

  choices.value = []
  trialNo.value = 1
}

const playAudio = audio => {
  audioA.value.pause()
  audioA.value.currentTime = 0
  audioB.value.pause()
  audioB.value.currentTime = 0

  if (audio == 'a') {
    audioA.value.play()
  }

  if (audio == 'b') {
    audioB.value.play()
  }
}

const next = () => {
  if (choice.value == null) return

  choices.value.push(choice.value)

  audioA.value.pause()
  audioA.value.currentTime = 0
  audioB.value.pause()
  audioB.value.currentTime = 0

  audio.value = null
  choice.value = null
  trialNo.value++
}

const generateTrials = () => {
  trials.value = []

  for (let i = 0; i < 10; i++) {
    const random = Math.random()

    if (random < 0.5) {
      trials.value.push('a')
    } else {
      trials.value.push('b')
    }
  }
}
</script>

<template>
  <div class="mx-auto max-w-screen-sm min-h-screen bg-white p-4 text-center">
    <div v-if="trialNo < 1">
      <h1 class="text-3xl font-semibold text-gray-900">ABX WAV</h1>

      <p class="mt-4 text-gray-900">
        Test your ears to hear the difference between an original WAV file and the converted one
      </p>

      <AButton :disabled="!audioAReady || !audioBReady"
        @click="start" class="mt-4">
        Start
      </AButton>
    </div>

    <div v-if="trialNo >= 1 && trialNo <= 10">
      <h1 class="text-3xl font-semibold text-gray-900">
        Trial {{ trialNo }} of 10
      </h1>

      <div class="mt-4 mx-auto max-w-96">
        <p>Listen</p>
        <div class="mt-1 flex justify-between items-center gap-2">
          <ARadio id="audio-a" name="audio" value="a" v-model="audio"
            @click="playAudio('a')" class="w-full">
            A
          </ARadio>

          <ARadio id="audio-x" name="audio" value="x" v-model="audio"
            @click="playAudio(trials[trialNo])" class="w-full">
            X
          </ARadio>

          <ARadio id="audio-b" name="audio" value="b" v-model="audio"
            @click="playAudio('b')" class="w-full">
            B
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
        {{ trialNo != 10 ? 'Next' : 'Finish' }}
      </AButton>
    </div>

    <div v-if="trialNo > 10">
      <h1 class="text-3xl font-semibold text-gray-900">
        Result
      </h1>

      <p class="mt-4 text-gray-900">You got {{ score }} correct out of 10</p>

      <AButton @click="start" class="mt-4">
        Restart
      </AButton>
    </div>
  </div>
</template>
