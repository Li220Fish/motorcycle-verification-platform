import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { GEMINI_API_KEY_SECRET } from '../config'
import { assertOwnsVehicle } from '../services/auth.service'
import { verifyVehicleRegistration } from '../services/vehicle-registration.service'

interface RequestBody {
  vehicleId?: string
  documentUrl?: string
}

/** GEMINI_API_KEY_SECRET is back (2026-10) — verifyVehicleRegistration now
 *  tries the local OpenCV.js + Tesseract.js pipeline first and only calls
 *  Gemini as a fallback when that one isn't confident enough. memory/
 *  timeoutSeconds bumped above Gen2's defaults for the opencv.js +
 *  tesseract.js WASM init this does on cold start (same reasoning as
 *  analyzeEngineSensorSessionV2Fn's own bump). */
export const verifyVehicleRegistrationDocument = onCall(
  { secrets: [GEMINI_API_KEY_SECRET], memory: '1GiB', timeoutSeconds: 90 },
  async (request) => {
    const data = request.data as RequestBody
    if (!data.vehicleId) {
      throw new HttpsError('invalid-argument', 'vehicleId is required')
    }
    if (!data.documentUrl) {
      throw new HttpsError('invalid-argument', 'documentUrl is required')
    }
    await assertOwnsVehicle(data.vehicleId, request.auth?.uid)
    return verifyVehicleRegistration({
      vehicleId: data.vehicleId,
      documentUrl: data.documentUrl,
      apiKey: process.env.GEMINI_API_KEY as string,
    })
  },
)
