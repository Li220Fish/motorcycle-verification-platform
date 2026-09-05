import { SELLER_VERIFICATION_SECTIONS } from './seller-verification'
import { BUYER_VERIFICATION_SECTIONS } from './buyer-verification'
import type {
  VerificationFlowKind,
  VerificationItem,
  VerificationSection,
} from './verification.types'

export * from './verification.types'
export { STANDARD_INSPECTION_OPTIONS } from './inspection-options'
export { SELLER_VERIFICATION_SECTIONS } from './seller-verification'
export { BUYER_VERIFICATION_SECTIONS } from './buyer-verification'

export function getFlowSections(kind: VerificationFlowKind): VerificationSection[] {
  return kind === 'seller' ? SELLER_VERIFICATION_SECTIONS : BUYER_VERIFICATION_SECTIONS
}

export interface FlatVerificationItem {
  item: VerificationItem
  section: VerificationSection
  /** 0-based position across the whole flow. */
  index: number
}

export function getFlatItems(kind: VerificationFlowKind): FlatVerificationItem[] {
  const sections = getFlowSections(kind)
  const flat: FlatVerificationItem[] = []
  for (const section of sections) {
    for (const item of section.items) {
      flat.push({ item, section, index: flat.length })
    }
  }
  return flat
}

export function findItemById(
  kind: VerificationFlowKind,
  itemId: string,
): VerificationItem | undefined {
  return getFlatItems(kind).find((flat) => flat.item.id === itemId)?.item
}
