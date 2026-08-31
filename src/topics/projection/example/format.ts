/** Numbers in this section span many magnitudes; keep them all the same width. */
export function formatCell(value: number): string {
  if (Math.abs(value) < 1e-13) return '0'
  if (Math.abs(value) < 1e-3) return value.toExponential(1)
  return value.toFixed(4)
}

export function formatNorm(value: number): string {
  if (value === 0) return '0'
  return value.toExponential(2)
}

export function extent(values: number[]): number {
  return values.reduce((max, value) => Math.max(max, Math.abs(value)), 0)
}
