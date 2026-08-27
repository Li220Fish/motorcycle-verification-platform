<script setup lang="ts">
import { onMounted, ref } from 'vue'

import PageHeader from '@/components/common/PageHeader.vue'
import PhotoCapture from '@/components/media/PhotoCapture.vue'
import VideoCapture from '@/components/media/VideoCapture.vue'
import AudioRecorder from '@/components/media/AudioRecorder.vue'
import { storageService } from '@/services/firebase/storage.service'
import { useVehicleStore } from '@/stores/vehicle.store'
import { useVerificationStore } from '@/stores/verification.store'

const props = defineProps<{ id: string }>()

const vehicleStore = useVehicleStore()
const verificationStore = useVerificationStore()

const uploading = ref(false)
const uploadedUrl = ref('')
const uploadError = ref('')

async function handleFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploading.value = true
  uploadError.value = ''
  uploadedUrl.value = ''
  try {
    uploadedUrl.value = await storageService.uploadFile('vehicle-images', file, file.name)
  } catch (error) {
    uploadError.value = error instanceof Error ? error.message : 'Upload failed'
  } finally {
    uploading.value = false
  }
}

onMounted(() => {
  vehicleStore.fetchVehicle(props.id)
  verificationStore.fetchByVehicle(props.id)
})
</script>

<template>
  <section>
    <PageHeader title="Vehicle Detail" />

    <p v-if="vehicleStore.loading">Loading...</p>
    <div v-else-if="vehicleStore.currentVehicle">
      <p><strong>Brand:</strong> {{ vehicleStore.currentVehicle.brand }}</p>
      <p><strong>Model:</strong> {{ vehicleStore.currentVehicle.model }}</p>
      <p><strong>Year:</strong> {{ vehicleStore.currentVehicle.year ?? 'n/a' }}</p>
      <p><strong>Mileage:</strong> {{ vehicleStore.currentVehicle.mileage ?? 'n/a' }}</p>
      <p><strong>License Plate:</strong> {{ vehicleStore.currentVehicle.licensePlate || 'n/a' }}</p>
    </div>
    <p v-else>Vehicle not found.</p>

    <h2>Verifications</h2>
    <ul class="verification-list">
      <li v-for="verification in verificationStore.verifications" :key="verification.id">
        {{ verification.type }} — {{ verification.status }}
      </li>
      <li v-if="verificationStore.verifications.length === 0">No verifications yet.</li>
    </ul>

    <h2>Storage Test</h2>
    <p>Upload a test image to Firebase Storage (vehicle-images/).</p>
    <input type="file" accept="image/*" @change="handleFileChange" />
    <p v-if="uploading">Uploading...</p>
    <p v-if="uploadError" class="error">{{ uploadError }}</p>
    <p v-if="uploadedUrl">
      Uploaded:
      <a :href="uploadedUrl" target="_blank" rel="noopener">{{ uploadedUrl }}</a>
    </p>

    <h2>Media Capture Test</h2>
    <p class="hint">Real device hardware — take a photo, record video, and record audio.</p>
    <PhotoCapture folder="verification-images" />
    <VideoCapture />
    <AudioRecorder />
  </section>
</template>

<style scoped>
.verification-list {
  list-style: none;
  padding: 0;
}

.verification-list li {
  padding: 0.4rem 0;
  border-bottom: 1px solid #e0e0e0;
}

.error {
  color: #b00020;
}

.hint {
  color: #666;
}
</style>
