/** One-shot animation request for TofuBlock — increment `n` to replay. */
export interface TofuMotion {
  kind: 'sway' | 'bump'
  n: number
}
