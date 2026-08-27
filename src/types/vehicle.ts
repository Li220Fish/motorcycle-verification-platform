export interface Vehicle {
  id: string

  brand: string
  model: string
  year: number | null
  mileage: number | null

  licensePlate?: string

  currentOwnerId?: string

  createdAt: number
  updatedAt: number
}

export type VehicleDraft = Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>
