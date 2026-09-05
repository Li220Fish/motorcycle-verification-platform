export interface FuelLog {
  id: string
  vehicleId: string
  refueledAt: number
  mileage: number | null
  liters: number | null
  costTwd: number
  /** Whether this fill-up topped the tank off — required for the full-to-full
   * average calc (see src/utils/fuel-average.ts) to know where a segment
   * ends. Historical rows migrated before this field existed default true. */
  fullTank: boolean
  note: string | null
  /** uid of whoever logged this entry — lets a later owner read but not edit
   * a prior owner's history. */
  recordedBy: string
  createdAt: number
}

export type FuelLogDraft = Omit<FuelLog, 'id' | 'createdAt'>

export type MaintenanceItemType =
  | 'engine_oil'
  | 'gear_oil'
  | 'air_filter'
  | 'spark_plug'
  | 'battery'
  | 'front_tire'
  | 'rear_tire'
  | 'front_brake'
  | 'rear_brake'
  | 'brake_fluid'
  | 'coolant'
  | 'drive_belt'
  | 'roller'
  | 'clutch'
  | 'other'

export interface MaintenanceLogItem {
  type: MaintenanceItemType
  name: string
  costTwd: number
}

export interface MaintenanceLog {
  id: string
  vehicleId: string
  servicedAt: number
  mileage: number | null
  items: MaintenanceLogItem[]
  shopName: string | null
  totalCostTwd: number | null
  note: string | null
  /** No capture UI yet — reserved for when receipt photo upload exists. */
  receiptUrls: string[]
  recordedBy: string
  createdAt: number
}

export type MaintenanceLogDraft = Omit<MaintenanceLog, 'id' | 'createdAt'>
