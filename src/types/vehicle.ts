export interface Vehicle {
  id: string

  brand: string
  model: string
  year: number | null
  mileage: number | null

  /** km/L, user-entered — powers the Home "我的車輛" status card's 平均油耗 stat. */
  avgFuelConsumption?: number | null
  /** Count of pending maintenance reminders, user-entered (no scheduling/due-date
   * logic yet — just a number the owner tracks themselves). */
  maintenanceReminderCount?: number | null

  licensePlate?: string

  /** The vehicle's unique physical identity — captured once via the
   * verification flow's PREP-01 "建立基本資料" step and mirrored here so it
   * outlives any single verification. Both must be set before a verification
   * on this vehicle can be completed/archived, so repeat measurements
   * reliably bind to the same physical vehicle instead of a same-named one. */
  engineNumber?: string | null
  chassisNumber?: string | null

  /** Hero photo — hotlinked URL for MOCK/demo vehicles today; a real upload
   * flow would swap this for a Firebase Storage download URL. */
  imageUrl?: string | null

  currentOwnerId?: string

  createdAt: number
  updatedAt: number
}

export type VehicleDraft = Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>
