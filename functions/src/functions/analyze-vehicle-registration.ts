import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { GEMINI_API_KEY_SECRET } from '../config'
import { assertOwnsVehicle } from '../services/auth.service'
import { verifyVehicleRegistration } from '../services/vehicle-registration.service'

interface RequestBody {
  vehicleId?: string
  registrationNumberInput?: string
  documentUrl?: string
}

export const verifyVehicleRegistrationDocument = onCall(
  { secrets: [GEMINI_API_KEY_SECRET] },
  async (request) => {
    const data = request.data as RequestBody
    if (!data.vehicleId) {
      throw new HttpsError('invalid-argument', 'vehicleId is required')
    }
    if (!data.registrationNumberInput) {
      throw new HttpsError('invalid-argument', 'registrationNumberInput is required')
    }
    await assertOwnsVehicle(data.vehicleId, request.auth?.uid)
    return verifyVehicleRegistration({
      vehicleId: data.vehicleId,
      apiKey: process.env.GEMINI_API_KEY as string,
      registrationNumberInput: data.registrationNumberInput,
      documentUrl: data.documentUrl,
    })
  },
)
